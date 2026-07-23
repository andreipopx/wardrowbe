import type { StudioItem } from '@/lib/studio/editor-state';

// v2 introduces canvas layout persistence. Old v1 drafts (items: string[]) are
// migrated on read — we keep the layout empty and let the reducer re-hydrate
// defaults when the user resumes.
const DRAFT_KEY = 'studio_draft_v2';
const LEGACY_KEY = 'studio_draft_v1';
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export interface StudioDraftItem {
  id: string;
  pos_x?: number | null;
  pos_y?: number | null;
  scale?: number;
  rotation?: number;
  z_index?: number;
}

export interface StudioDraft {
  items: StudioDraftItem[];
  name: string;
  occasion: string | null;
  timestamp: number;
}

interface LegacyDraft {
  items: string[];
  name: string;
  occasion: string | null;
  timestamp: number;
}

export function saveDraft(draft: Omit<StudioDraft, 'timestamp'>): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: StudioDraft = { ...draft, timestamp: Date.now() };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // localStorage full or disabled
  }
}

export function draftItemsFrom(items: StudioItem[]): StudioDraftItem[] {
  return items.map((i) => ({
    id: i.id,
    pos_x: i.pos_x ?? null,
    pos_y: i.pos_y ?? null,
    scale: i.scale,
    rotation: i.rotation,
    z_index: i.z_index,
  }));
}

export function loadDraft(): StudioDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const draft = JSON.parse(raw) as StudioDraft;
      if (!draft || typeof draft.timestamp !== 'number') return null;
      if (Date.now() - draft.timestamp > DRAFT_TTL_MS) {
        window.localStorage.removeItem(DRAFT_KEY);
        return null;
      }
      return draft;
    }
    // Fall back to any v1 draft still lying around from before the canvas landed.
    const legacyRaw = window.localStorage.getItem(LEGACY_KEY);
    if (!legacyRaw) return null;
    const legacy = JSON.parse(legacyRaw) as LegacyDraft;
    if (!legacy || typeof legacy.timestamp !== 'number') return null;
    if (Date.now() - legacy.timestamp > DRAFT_TTL_MS) {
      window.localStorage.removeItem(LEGACY_KEY);
      return null;
    }
    return {
      items: legacy.items.map((id) => ({ id })),
      name: legacy.name,
      occasion: legacy.occasion,
      timestamp: legacy.timestamp,
    };
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // noop
  }
}
