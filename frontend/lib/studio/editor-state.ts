import {
  ITEM_ROLE,
  canonicalItemOrder,
} from '@/lib/studio/canonical-order';

export interface StudioItem {
  id: string;
  type: string;
  name: string | null;
  thumbnail_url?: string | null;
  image_url?: string | null;
  primary_color?: string | null;
  // Free-form canvas layout — null pos_x/pos_y means the item lives in the
  // grid fallback (no user-chosen position). Coordinates are normalized [0..1]
  // relative to the canvas, so they survive resizes and different viewports.
  pos_x?: number | null;
  pos_y?: number | null;
  scale?: number;
  rotation?: number;
  z_index?: number;
}

export interface StudioEditorState {
  items: StudioItem[];
  name: string;
  occasion: string | null;
  isDirty: boolean;
  lastModified: number;
}

export const INITIAL_STUDIO_STATE: StudioEditorState = {
  items: [],
  name: '',
  occasion: null,
  isDirty: false,
  lastModified: 0,
};

export type StudioAction =
  | { type: 'ADD_ITEM'; item: StudioItem }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'TOGGLE_ITEM'; item: StudioItem }
  | { type: 'MOVE_ITEM'; itemId: string; pos_x: number; pos_y: number }
  | {
      type: 'SET_ITEM_LAYOUT';
      itemId: string;
      layout: Partial<
        Pick<StudioItem, 'pos_x' | 'pos_y' | 'scale' | 'rotation' | 'z_index'>
      >;
    }
  | { type: 'BRING_TO_FRONT'; itemId: string }
  | { type: 'SEND_TO_BACK'; itemId: string }
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_OCCASION'; occasion: string }
  | { type: 'REPLACE_CANVAS'; items: StudioItem[] }
  | { type: 'LOAD'; state: Partial<StudioEditorState> }
  | { type: 'RESET' };

/**
 * Default vertical position on the canvas per canonical clothing role.
 * Values are 0..1 top→bottom, chosen to read as a portrait lookbook page:
 * accessories crown the head area, tops mid-upper, bottoms below waist,
 * footwear near the floor.
 */
const DEFAULT_Y_BY_ROLE: Record<string, number> = {
  accessory: 0.14,
  neckwear: 0.22,
  base_top: 0.32,
  mid_layer: 0.36,
  outer_layer: 0.38,
  full_body: 0.45,
  bottom: 0.62,
  socks: 0.85,
  footwear: 0.9,
};

function nextZIndex(items: StudioItem[]): number {
  return items.reduce((max, i) => Math.max(max, i.z_index ?? 0), 0) + 1;
}

/**
 * Assign a plausible initial position for a newly added item so the canvas
 * never shows all items stacked on top of each other. Same-role items get
 * horizontally offset in a deterministic zig-zag to stay readable.
 */
function initialLayoutFor(
  item: StudioItem,
  existing: StudioItem[]
): Required<Pick<StudioItem, 'pos_x' | 'pos_y' | 'scale' | 'rotation' | 'z_index'>> {
  const role = ITEM_ROLE[item.type] ?? 'accessory';
  const y = DEFAULT_Y_BY_ROLE[role] ?? 0.5;
  const sameRoleIndex = existing.filter(
    (i) => (ITEM_ROLE[i.type] ?? 'accessory') === role
  ).length;
  // Zig-zag: 0.5, 0.34, 0.66, 0.22, 0.78, ...
  const offsets = [0, -0.16, 0.16, -0.28, 0.28, -0.4, 0.4];
  const dx = offsets[sameRoleIndex % offsets.length] ?? 0;
  const x = Math.max(0.14, Math.min(0.86, 0.5 + dx));
  return {
    pos_x: x,
    pos_y: y,
    scale: 1,
    rotation: 0,
    z_index: nextZIndex(existing),
  };
}

function ensureLayout(items: StudioItem[]): StudioItem[] {
  // Guarantee every item has a canvas position — items loaded from a legacy
  // outfit (no pos_x/pos_y) get a role-based default so the canvas can render.
  let running: StudioItem[] = [];
  for (const it of items) {
    if (it.pos_x != null && it.pos_y != null) {
      running.push({
        scale: it.scale ?? 1,
        rotation: it.rotation ?? 0,
        z_index: it.z_index ?? running.length,
        ...it,
      });
    } else {
      const layout = initialLayoutFor(it, running);
      running.push({ ...it, ...layout });
    }
  }
  return running;
}

function touch(state: StudioEditorState): StudioEditorState {
  return {
    ...state,
    isDirty: true,
    lastModified: Date.now(),
  };
}

export function studioReducer(
  state: StudioEditorState,
  action: StudioAction
): StudioEditorState {
  switch (action.type) {
    case 'ADD_ITEM': {
      if (state.items.some((i) => i.id === action.item.id)) return state;
      const layout = initialLayoutFor(action.item, state.items);
      return touch({
        ...state,
        items: [...state.items, { ...action.item, ...layout }],
      });
    }
    case 'REMOVE_ITEM': {
      const next = state.items.filter((i) => i.id !== action.itemId);
      if (next.length === state.items.length) return state;
      return touch({ ...state, items: next });
    }
    case 'TOGGLE_ITEM': {
      if (state.items.some((i) => i.id === action.item.id)) {
        return touch({
          ...state,
          items: state.items.filter((i) => i.id !== action.item.id),
        });
      }
      const layout = initialLayoutFor(action.item, state.items);
      return touch({
        ...state,
        items: [...state.items, { ...action.item, ...layout }],
      });
    }
    case 'MOVE_ITEM': {
      const next = state.items.map((i) =>
        i.id === action.itemId
          ? { ...i, pos_x: action.pos_x, pos_y: action.pos_y }
          : i
      );
      return touch({ ...state, items: next });
    }
    case 'SET_ITEM_LAYOUT': {
      const next = state.items.map((i) =>
        i.id === action.itemId ? { ...i, ...action.layout } : i
      );
      return touch({ ...state, items: next });
    }
    case 'BRING_TO_FRONT': {
      const target = state.items.find((i) => i.id === action.itemId);
      if (!target) return state;
      const topZ = nextZIndex(state.items);
      const next = state.items.map((i) =>
        i.id === action.itemId ? { ...i, z_index: topZ } : i
      );
      return touch({ ...state, items: next });
    }
    case 'SEND_TO_BACK': {
      const target = state.items.find((i) => i.id === action.itemId);
      if (!target) return state;
      const minZ =
        state.items.reduce((min, i) => Math.min(min, i.z_index ?? 0), 0) - 1;
      const next = state.items.map((i) =>
        i.id === action.itemId ? { ...i, z_index: minZ } : i
      );
      return touch({ ...state, items: next });
    }
    case 'SET_NAME': {
      if (state.name === action.name) return state;
      return touch({ ...state, name: action.name });
    }
    case 'SET_OCCASION': {
      if (state.occasion === action.occasion) return state;
      return touch({ ...state, occasion: action.occasion });
    }
    case 'REPLACE_CANVAS': {
      // AI-Assist bulk replace: canonical-order the items so the auto-suggested
      // outfit still reads well before the user starts arranging.
      const canonical = canonicalItemOrder(action.items);
      return touch({ ...state, items: ensureLayout(canonical) });
    }
    case 'LOAD': {
      const rawItems = action.state?.items;
      return {
        ...state,
        ...action.state,
        items: rawItems ? ensureLayout(rawItems) : state.items,
        isDirty: false,
      };
    }
    case 'RESET':
      return { ...INITIAL_STUDIO_STATE };
    default:
      return state;
  }
}

/**
 * True when the user has arranged at least one item on the canvas (as opposed
 * to a legacy outfit whose items live in the grid fallback). Used to decide
 * whether the [id] detail page shows the free-form canvas or the classic grid.
 */
export function hasCanvasLayout(
  items: Array<Pick<StudioItem, 'pos_x' | 'pos_y'>>
): boolean {
  return items.some((i) => i.pos_x != null && i.pos_y != null);
}
