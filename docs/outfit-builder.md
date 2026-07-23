# Outfit Builder — free-form editorial canvas

The Studio (`/dashboard/outfits/new`) exposes a drag-and-drop canvas where
the user arranges wardrobe pieces into a lookbook page. This doc is the
entry point for anyone touching that flow — what shipped, what the schema
looks like, and why the boring alternative wasn't the answer.

> **See also**  
> `docs/design-notes/audit-libre-closet.md` — patterns audited from the
> Libre Closet open-source project (spoiler: no canvas to copy from, but
> useful for the wardrobe filter/bg-removal ideas).  
> `docs/design-notes/audit-miaurmario-studio.md` — the pre-canvas state of
> the Studio, kept for context on the "why in-place vs new route" decision.

## Feature at a glance

- Portrait 3:4 editorial canvas (`bg-card`, double burgundy border).
- Drag items to place; long-press on iPhone so scroll still works over the
  canvas.
- Tap a piece to select → floating toolbar (bring to front, send to back,
  remove).
- Layout persists per outfit; legacy outfits without positions fall back
  to the classic grid view on the detail page.
- Draft autosave (v2) includes canvas layout; old v1 drafts (IDs only)
  migrate transparently on read.

## Architecture

```
frontend/                                       backend/
──────────                                      ────────
 components/studio/canvas-panel.tsx              app/api/outfits.py
   ├─ CanvasPanel  (editor, DndContext)           ├─ StudioItemLayout (Pydantic)
   └─ CanvasPreview (read-only, [id] page)        ├─ StudioCreateRequest + items_layout
                                                  └─ PatchOutfitRequest  + items_layout
 lib/studio/editor-state.ts
   ├─ StudioItem  (+ pos_x/pos_y/scale/rotation/z_index)
   ├─ studioReducer:                             app/services/studio_service.py
   │    ADD_ITEM (assigns default position)       ├─ ItemLayoutInput (dataclass)
   │    MOVE_ITEM / SET_ITEM_LAYOUT               ├─ create_from_scratch(layouts=...)
   │    BRING_TO_FRONT / SEND_TO_BACK             └─ patch_outfit(layouts=...)
   │    LOAD  (ensureLayout: fills defaults for
   │           legacy items without coordinates)
   └─ hasCanvasLayout(items) → bool               app/models/outfit.py
                                                  └─ OutfitItem
 lib/studio/draft-storage.ts                          + pos_x, pos_y   (nullable Float)
   └─ v2 (StudioDraftItem[]),                         + scale, rotation (Float, default 1.0/0.0)
     v1 migration on read                             + z_index         (Integer, default 0)

 lib/hooks/use-studio.ts                        migrations/versions/add_outfit_item_layout.py
   StudioCreatePayload / PatchOutfitPayload      revision b7f2a1c9d3e5
     + items_layout                              (down_revision c1a2b3d4e5f6)
```

## Wire contract

`items_layout` is optional on both create and patch. Rule:

- **Absent** → backend applies canonical role ordering (previous
  behavior). Legacy clients keep working.
- **Present with all `pos_x` null** → same fallback; the item order in
  the array is ignored.
- **Present with at least one non-null `pos_x`** → all positions saved
  verbatim, item order follows the layout array (visual authoring order).

Both `items` and `items_layout` may be sent together; the backend rejects
requests where the two lists reference different sets
(`OUTFIT_ITEMS_MISMATCH`, 400).

Response payload (`OutfitItemResponse`) always includes the layout fields
— null coordinates + defaults for legacy rows, real values for
canvas-arranged outfits.

## DnD library choice: `@dnd-kit`

Evaluated:

- **`@dnd-kit/core` (chosen)** — React-native, `TouchSensor` with
  `activationConstraint: { delay: 200, tolerance: 5 }` gives iPhone
  long-press without fighting scroll, ~10 kB gzip, accessibility
  built-in.
- Sortable.js — great for lists (Libre Closet uses it exactly for
  that), wrong shape for free-form 2-axis placement.
- `react-dnd` — HTML5 DnD backend is broken on touch, non-starter for
  mobile-first.
- Konva / Fabric — real canvas, ~100 kB+, overkill: our items are just
  bg-removed PNGs stacked with CSS `transform` + `z-index`.

## Fallback behavior for legacy outfits

Every outfit created before migration `b7f2a1c9d3e5` has `pos_x = pos_y =
NULL`. The detail page checks `hasCanvasLayout(items)`:

- **True** (any item has coordinates) → render `<CanvasPreview>`.
- **False** → render the classic grid (unchanged from before).

Same rule inside the editor: `ensureLayout` in the reducer assigns
role-based defaults when an outfit is loaded without coordinates, so a
legacy outfit opened in the editor becomes editable on the canvas
without a special migration step.

## Test seeds for local dev

`scripts/seed_test_items.py` + `scripts/download_test_items.sh` populate
the dev user's wardrobe with 19 curated transparent-PNG pieces from
pngimg.com (free license). Idempotent: re-running wipes prior `miaur-`
items before reinserting. See the shell script header for one-shot
usage.

## Tests

- `frontend/tests/studio.test.ts` — 40 cases: reducer canvas actions,
  role-based default positions, layout LOAD/ADD/MOVE/BRING/SEND, draft
  v1→v2 migration.
- `backend/tests/test_studio_service.py` — 19 cases: layout persistence,
  empty-layout fallback, layout-only patch, legacy-null defaults.
