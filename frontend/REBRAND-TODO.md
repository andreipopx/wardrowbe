# Rebrand TODO

The editorial rebrand (`3e0e156`) covers the design tokens and every page you land on from the primary nav. A handful of internal surfaces still inherit token defaults but retain their pre-rebrand structure. This is the punch list for a second pass.

## Screens that need internal work

### `components/item-detail-dialog.tsx` (988 lines)
The dialog frame is editorial (cream card, hairline border, dark overlay via the `Dialog` primitive) but the internal grid is still card/badge default.

Target:
- Photo 60-70% of the modal width on desktop, right column with info.
- Name in Playfair 700, type in `label-editorial`, AI description in `font-editorial italic`.
- Tags as `<Badge variant="outline">` (hairline chip that fills on hover — already in the badge variants).
- Footer buttons: "Añadir a outfit" (default/burgundy), "Editar" (secondary/animated-underline), "Compartir" (ghost).

### `app/dashboard/suggest/page.tsx` — occasion chips + weather override
The masthead is editorial. Still to redo:
- `OccasionChips`: replace the coloured `OCCASION_CONFIG` (rounded-full with hover:bg-blue-50 etc.) with hairline pills that fill burgundy on active. Lose the Lucide icon on each chip.
- `WeatherOverrideSection`: the collapsible pill row still uses `bg-muted/50` and `rounded-lg`. Replace with hairline card + `label-editorial` copy.
- `OutfitResult`: the header uses `bg-gradient-to-r from-primary/10`. Drop the gradient; use a gold hairline over the block instead. Migrate `outfit.reasoning` copy into `font-editorial italic` — this is where the new AI prompt shines.

### `components/bulk-action-toolbar.tsx`
Visible at the bottom of `wardrobe` list once you enter selection mode. Currently shadcn default. Rework to match the header CTA row: burgundy actions, hairline separators between action groups, uppercase labels.

### `components/add-item-dialog.tsx` (587 lines)
Frame inherits new dialog styling, upload flow is still default.

Target:
- Dropzone: dashed hairline border, `font-editorial italic` placeholder copy.
- Preview step: cream card, hairline border, Playfair headings for AI results.

## Screens that fully inherit but don't have editorial layout

Text and forms will look right (fonts + colours + inputs are token-driven) but section headers and empty states are still generic. Cheap next pass: apply the "adopting the style" recipe from `DESIGN-SYSTEM.md`.

- `app/dashboard/analytics/page.tsx`
- `app/dashboard/history/page.tsx`
- `app/dashboard/outfits/page.tsx`
- `app/dashboard/pairings/page.tsx`
- `app/dashboard/learning/page.tsx`
- `app/dashboard/family/page.tsx` (list + feed subroutes)
- `app/dashboard/notifications/page.tsx`

## Cross-cutting

- `components/family-ratings.tsx`, `components/feedback-dialog.tsx`, `components/generate-pairings-dialog.tsx`, `components/image-lightbox.tsx`, `components/outfit-*.tsx`, `components/pairing-card.tsx`, `components/outfits/*`, `components/studio/*` — untouched. Same story: tokens flow through, layouts don't.
- `components/color-eyedropper.tsx` — probably fine as-is (interactive tool, editorial not required).
- `settings/page.tsx` internals — header is editorial, the tab bodies still use the shadcn card pattern. Full pass would replace each `<Card>` group with editorial rows (label left, control right, hairline separator).

## Backend

- Prompt at `backend/app/prompts/recommendation.txt` is now Spanish editor voice. It's **not** validated end-to-end because the test user has no items in the wardrobe yet. First real outfit generation will reveal:
  - Whether OpenAI stays inside the 2-sentence highlights budget.
  - Whether the Spanish stays consistent (no English leaks in `headline` / `styling_tip`).
  - Whether GPT-4o-mini follows the "no rolling sleeves every time" varying-advice rule.

  If any of those breaks, iterate on `recommendation.txt` and recreate the backend (`docker compose up -d --force-recreate wardrobe_backend wardrobe_worker`).

## Accessibility follow-up

- WCAG contrast wasn't machine-verified. `#0A0A0A` on `#F5EFE6` is fine (17:1). `#7B1E1E` on `#F5EFE6` for primary buttons is ~9.5:1 (AAA). `#6B5D4F` on `#F5EFE6` for muted text is ~5.3:1 (AA). Gold `#B8860B` on cream ≈ 4.7:1 (AA large-text only — currently only used for labels 11px, which is below AA large but the label always sits next to darker copy). Consider deepening to `#8F6800` if you want AA at 11px too.
- Focus rings: reduced from 2px to 1px + `ring-offset-2`. Should still meet visible-focus criteria; test with keyboard nav.

## When you iterate

The pattern to bring a page in:
1. Read `DESIGN-SYSTEM.md`.
2. Replace the page wrapper padding.
3. Rewrite the header block (label + Playfair display title + Cormorant tagline).
4. Drop `<Card>` in favour of hairline-bordered blocks with generous padding.
5. Replace one-off action bars with the button variants.
6. Compare against the screenshots in `/tmp/wardrowbe-rebrand/after/` for the pages that are already done (login, dashboard, wardrobe, suggest header, settings header).
