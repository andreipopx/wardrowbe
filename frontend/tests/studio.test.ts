import { describe, it, expect, vi, beforeEach } from 'vitest';

import { canonicalItemOrder, ITEM_ROLE } from '@/lib/studio/canonical-order';
import {
  studioReducer,
  INITIAL_STUDIO_STATE,
  type StudioItem,
  type StudioEditorState,
} from '@/lib/studio/editor-state';
import { mergeAiAssist } from '@/lib/studio/ai-assist-merge';
import { saveDraft, loadDraft, clearDraft } from '@/lib/studio/draft-storage';
import { computeEditLoadPhase } from '@/lib/studio/edit-load';

function makeItem(id: string, type: string): StudioItem {
  return { id, type, name: `${type} item`, thumbnail_url: null, image_url: null, primary_color: null };
}

describe('canonicalItemOrder', () => {
  it('sorts items by role hierarchy', () => {
    const items = [
      makeItem('1', 'sneakers'),
      makeItem('2', 'jeans'),
      makeItem('3', 't-shirt'),
    ];
    const sorted = canonicalItemOrder(items);
    expect(sorted.map((i) => i.type)).toEqual(['t-shirt', 'jeans', 'sneakers']);
  });

  it('puts full_body before base_top', () => {
    const items = [makeItem('1', 'shirt'), makeItem('2', 'dress')];
    const sorted = canonicalItemOrder(items);
    expect(sorted[0].type).toBe('dress');
  });

  it('preserves original order within the same role', () => {
    const items = [makeItem('a', 'hat'), makeItem('b', 'scarf'), makeItem('c', 'belt')];
    const sorted = canonicalItemOrder(items);
    expect(sorted.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('handles empty list', () => {
    expect(canonicalItemOrder([])).toEqual([]);
  });

  it('puts unknown types at the end', () => {
    const items = [makeItem('1', 'unknown-thing'), makeItem('2', 'shirt')];
    const sorted = canonicalItemOrder(items);
    expect(sorted[0].type).toBe('shirt');
    expect(sorted[1].type).toBe('unknown-thing');
  });

  it('ITEM_ROLE covers core wardrobe types', () => {
    const coreTypes = ['shirt', 't-shirt', 'pants', 'jeans', 'dress', 'shoes', 'sneakers', 'jacket'];
    for (const t of coreTypes) {
      expect(ITEM_ROLE[t]).toBeDefined();
    }
  });
});

describe('studioReducer', () => {
  it('adds an item', () => {
    const item = makeItem('1', 'shirt');
    const state = studioReducer(INITIAL_STUDIO_STATE, { type: 'ADD_ITEM', item });
    expect(state.items).toHaveLength(1);
    expect(state.isDirty).toBe(true);
  });

  it('does not add duplicate item', () => {
    const item = makeItem('1', 'shirt');
    let state = studioReducer(INITIAL_STUDIO_STATE, { type: 'ADD_ITEM', item });
    state = studioReducer(state, { type: 'ADD_ITEM', item });
    expect(state.items).toHaveLength(1);
  });

  it('removes an item', () => {
    const item = makeItem('1', 'shirt');
    let state = studioReducer(INITIAL_STUDIO_STATE, { type: 'ADD_ITEM', item });
    state = studioReducer(state, { type: 'REMOVE_ITEM', itemId: '1' });
    expect(state.items).toHaveLength(0);
  });

  it('toggling adds then removes', () => {
    const item = makeItem('1', 'shirt');
    let state = studioReducer(INITIAL_STUDIO_STATE, { type: 'TOGGLE_ITEM', item });
    expect(state.items).toHaveLength(1);
    state = studioReducer(state, { type: 'TOGGLE_ITEM', item });
    expect(state.items).toHaveLength(0);
  });

  it('sets name', () => {
    const state = studioReducer(INITIAL_STUDIO_STATE, { type: 'SET_NAME', name: 'My look' });
    expect(state.name).toBe('My look');
    expect(state.isDirty).toBe(true);
  });

  it('sets occasion', () => {
    const state = studioReducer(INITIAL_STUDIO_STATE, { type: 'SET_OCCASION', occasion: 'casual' });
    expect(state.occasion).toBe('casual');
  });

  it('replaces canvas', () => {
    const items = [makeItem('1', 'shirt'), makeItem('2', 'jeans')];
    const state = studioReducer(INITIAL_STUDIO_STATE, { type: 'REPLACE_CANVAS', items });
    expect(state.items).toHaveLength(2);
  });

  it('loads state without marking dirty', () => {
    const state = studioReducer(INITIAL_STUDIO_STATE, {
      type: 'LOAD',
      state: { name: 'Loaded', occasion: 'formal' },
    });
    expect(state.name).toBe('Loaded');
    expect(state.occasion).toBe('formal');
    expect(state.isDirty).toBe(false);
  });

  it('resets to initial state', () => {
    let state = studioReducer(INITIAL_STUDIO_STATE, { type: 'SET_NAME', name: 'test' });
    state = studioReducer(state, { type: 'RESET' });
    expect(state.name).toBe('');
    expect(state.items).toHaveLength(0);
    expect(state.isDirty).toBe(false);
  });

  it('no-ops on SET_NAME with same value', () => {
    const state: StudioEditorState = { ...INITIAL_STUDIO_STATE, name: 'same' };
    const next = studioReducer(state, { type: 'SET_NAME', name: 'same' });
    expect(next).toBe(state);
  });

  it('no-ops on REMOVE_ITEM with non-existent id', () => {
    const state = studioReducer(INITIAL_STUDIO_STATE, { type: 'REMOVE_ITEM', itemId: 'nope' });
    expect(state).toBe(INITIAL_STUDIO_STATE);
  });
});

describe('mergeAiAssist', () => {
  it('adds AI items that fill empty roles', () => {
    const canvas = [makeItem('1', 'shirt')];
    const aiItems = [makeItem('2', 'jeans'), makeItem('3', 'sneakers')];
    const { merged, skipped } = mergeAiAssist(canvas, aiItems);
    expect(merged).toHaveLength(3);
    expect(skipped).toHaveLength(0);
  });

  it('skips AI items that conflict with existing roles', () => {
    const canvas = [makeItem('1', 'shirt')];
    const aiItems = [makeItem('2', 't-shirt'), makeItem('3', 'jeans')];
    const { merged, skipped } = mergeAiAssist(canvas, aiItems);
    expect(merged).toHaveLength(2);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].item.id).toBe('2');
    expect(skipped[0].reason).toContain('base top');
  });

  it('skips items already on canvas', () => {
    const canvas = [makeItem('1', 'shirt')];
    const aiItems = [makeItem('1', 'shirt')];
    const { merged } = mergeAiAssist(canvas, aiItems);
    expect(merged).toHaveLength(1);
  });

  it('allows multiple accessories', () => {
    const canvas = [makeItem('1', 'hat')];
    const aiItems = [makeItem('2', 'scarf'), makeItem('3', 'belt')];
    const { merged, skipped } = mergeAiAssist(canvas, aiItems);
    expect(merged).toHaveLength(3);
    expect(skipped).toHaveLength(0);
  });

  it('returns canonical order', () => {
    const canvas = [makeItem('1', 'sneakers')];
    const aiItems = [makeItem('2', 'shirt'), makeItem('3', 'jeans')];
    const { merged } = mergeAiAssist(canvas, aiItems);
    expect(merged[0].type).toBe('shirt');
    expect(merged[1].type).toBe('jeans');
    expect(merged[2].type).toBe('sneakers');
  });
});

describe('draft-storage', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    const mockStorage = {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
    };
    Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true });
  });

  it('saves and loads a draft with canvas layout', () => {
    saveDraft({
      items: [
        { id: 'a', pos_x: 0.3, pos_y: 0.4, scale: 1, rotation: 0, z_index: 1 },
        { id: 'b', pos_x: 0.7, pos_y: 0.6, scale: 1, rotation: 0, z_index: 2 },
      ],
      name: 'My draft',
      occasion: 'casual',
    });
    const loaded = loadDraft();
    expect(loaded).not.toBeNull();
    expect(loaded!.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(loaded!.items[0].pos_x).toBe(0.3);
    expect(loaded!.name).toBe('My draft');
    expect(loaded!.occasion).toBe('casual');
  });

  it('returns null when no draft saved', () => {
    expect(loadDraft()).toBeNull();
  });

  it('clears draft', () => {
    saveDraft({ items: [{ id: 'a' }], name: '', occasion: null });
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it('expired v2 drafts return null', () => {
    saveDraft({ items: [{ id: 'a' }], name: '', occasion: null });
    const raw = JSON.parse(store['studio_draft_v2']);
    raw.timestamp = Date.now() - 25 * 60 * 60 * 1000;
    store['studio_draft_v2'] = JSON.stringify(raw);
    expect(loadDraft()).toBeNull();
  });

  it('migrates a legacy v1 draft (items as string[]) on read', () => {
    store['studio_draft_v1'] = JSON.stringify({
      items: ['x', 'y'],
      name: 'legacy',
      occasion: 'work',
      timestamp: Date.now(),
    });
    const loaded = loadDraft();
    expect(loaded).not.toBeNull();
    expect(loaded!.items.map((i) => i.id)).toEqual(['x', 'y']);
    // Layout is intentionally empty on legacy migration — the reducer's
    // ensureLayout step re-hydrates default positions when the user resumes.
    expect(loaded!.items[0].pos_x).toBeUndefined();
    expect(loaded!.name).toBe('legacy');
  });

  it('clearDraft wipes both v1 and v2 keys', () => {
    store['studio_draft_v1'] = JSON.stringify({
      items: ['x'],
      name: '',
      occasion: null,
      timestamp: Date.now(),
    });
    saveDraft({ items: [{ id: 'y' }], name: '', occasion: null });
    clearDraft();
    expect(store['studio_draft_v1']).toBeUndefined();
    expect(store['studio_draft_v2']).toBeUndefined();
  });
});

describe('studioReducer canvas layout', () => {
  it('ADD_ITEM assigns a default canvas position', () => {
    const item = makeItem('1', 'shirt');
    const state = studioReducer(INITIAL_STUDIO_STATE, { type: 'ADD_ITEM', item });
    const added = state.items[0];
    expect(added.pos_x).toBeGreaterThan(0);
    expect(added.pos_x).toBeLessThan(1);
    expect(added.pos_y).toBeGreaterThan(0);
    expect(added.pos_y).toBeLessThan(1);
    expect(added.z_index).toBeGreaterThan(0);
  });

  it('items in different roles land at different default Y positions', () => {
    let state = studioReducer(INITIAL_STUDIO_STATE, {
      type: 'ADD_ITEM',
      item: makeItem('top', 'shirt'),
    });
    state = studioReducer(state, {
      type: 'ADD_ITEM',
      item: makeItem('bot', 'jeans'),
    });
    const top = state.items.find((i) => i.id === 'top');
    const bot = state.items.find((i) => i.id === 'bot');
    expect(top!.pos_y).toBeLessThan(bot!.pos_y!);
  });

  it('MOVE_ITEM updates coordinates without touching other items', () => {
    let state = studioReducer(INITIAL_STUDIO_STATE, {
      type: 'ADD_ITEM',
      item: makeItem('1', 'shirt'),
    });
    state = studioReducer(state, {
      type: 'ADD_ITEM',
      item: makeItem('2', 'jeans'),
    });
    const otherBefore = state.items.find((i) => i.id === '2');
    state = studioReducer(state, {
      type: 'MOVE_ITEM',
      itemId: '1',
      pos_x: 0.25,
      pos_y: 0.75,
    });
    const moved = state.items.find((i) => i.id === '1');
    const otherAfter = state.items.find((i) => i.id === '2');
    expect(moved!.pos_x).toBe(0.25);
    expect(moved!.pos_y).toBe(0.75);
    expect(otherAfter!.pos_x).toBe(otherBefore!.pos_x);
    expect(otherAfter!.pos_y).toBe(otherBefore!.pos_y);
  });

  it('BRING_TO_FRONT raises z_index above every other item', () => {
    let state = studioReducer(INITIAL_STUDIO_STATE, {
      type: 'ADD_ITEM',
      item: makeItem('1', 'shirt'),
    });
    state = studioReducer(state, {
      type: 'ADD_ITEM',
      item: makeItem('2', 'jacket'),
    });
    state = studioReducer(state, {
      type: 'ADD_ITEM',
      item: makeItem('3', 'sneakers'),
    });
    state = studioReducer(state, { type: 'BRING_TO_FRONT', itemId: '1' });
    const brought = state.items.find((i) => i.id === '1');
    const others = state.items.filter((i) => i.id !== '1');
    for (const o of others) {
      expect(brought!.z_index!).toBeGreaterThan(o.z_index ?? 0);
    }
  });

  it('SEND_TO_BACK drops z_index below every other item', () => {
    let state = studioReducer(INITIAL_STUDIO_STATE, {
      type: 'ADD_ITEM',
      item: makeItem('1', 'shirt'),
    });
    state = studioReducer(state, {
      type: 'ADD_ITEM',
      item: makeItem('2', 'jacket'),
    });
    state = studioReducer(state, { type: 'SEND_TO_BACK', itemId: '2' });
    const sent = state.items.find((i) => i.id === '2');
    const others = state.items.filter((i) => i.id !== '2');
    for (const o of others) {
      expect(sent!.z_index!).toBeLessThan(o.z_index ?? 0);
    }
  });

  it('LOAD rehydrates default layout for legacy items without coordinates', () => {
    const state = studioReducer(INITIAL_STUDIO_STATE, {
      type: 'LOAD',
      state: {
        items: [makeItem('1', 'shirt'), makeItem('2', 'jeans')],
      },
    });
    for (const it of state.items) {
      expect(it.pos_x).toBeGreaterThan(0);
      expect(it.pos_y).toBeGreaterThan(0);
    }
  });

  it('LOAD preserves layout for items that already have coordinates', () => {
    const item: StudioItem = {
      id: '1',
      type: 'shirt',
      name: null,
      thumbnail_url: null,
      image_url: null,
      primary_color: null,
      pos_x: 0.11,
      pos_y: 0.99,
      scale: 1.5,
      rotation: 15,
      z_index: 5,
    };
    const state = studioReducer(INITIAL_STUDIO_STATE, {
      type: 'LOAD',
      state: { items: [item] },
    });
    expect(state.items[0].pos_x).toBe(0.11);
    expect(state.items[0].pos_y).toBe(0.99);
    expect(state.items[0].scale).toBe(1.5);
    expect(state.items[0].rotation).toBe(15);
    expect(state.items[0].z_index).toBe(5);
  });
});

describe('computeEditLoadPhase', () => {
  it('returns ready when editLoaded is true', () => {
    expect(
      computeEditLoadPhase({
        isLoading: false,
        isError: false,
        errorStatus: null,
        hasData: true,
        isWorn: false,
        editLoaded: true,
      })
    ).toBe('ready');
  });

  it('returns missing on 404 error', () => {
    expect(
      computeEditLoadPhase({
        isLoading: false,
        isError: true,
        errorStatus: 404,
        hasData: false,
        isWorn: false,
        editLoaded: false,
      })
    ).toBe('missing');
  });

  it('returns error on non-404 error', () => {
    expect(
      computeEditLoadPhase({
        isLoading: false,
        isError: true,
        errorStatus: 500,
        hasData: false,
        isWorn: false,
        editLoaded: false,
      })
    ).toBe('error');
  });

  it('returns loading while fetching', () => {
    expect(
      computeEditLoadPhase({
        isLoading: true,
        isError: false,
        errorStatus: null,
        hasData: false,
        isWorn: false,
        editLoaded: false,
      })
    ).toBe('loading');
  });

  it('returns wornImmutable when data is worn', () => {
    expect(
      computeEditLoadPhase({
        isLoading: false,
        isError: false,
        errorStatus: null,
        hasData: true,
        isWorn: true,
        editLoaded: false,
      })
    ).toBe('wornImmutable');
  });
});
