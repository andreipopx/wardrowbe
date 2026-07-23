# Auditoría Miaurmario — flujo actual de outfits

## 1. Flujo actual (resumen ejecutivo, 5 líneas)

Ya existe un "Studio" de outfits (no drag-and-drop): `/dashboard/outfits/new` deja elegir prendas de un `ItemPicker`, las ordena automáticamente por un orden canónico de roles (top, bottom, calzado…) y las pinta en una grilla de tarjetas (`CanvasPanel`), sin posiciones libres ni capas visuales. El backend persiste solo una lista ordenada de `OutfitItem` (`outfit_id`, `item_id`, `position` entero secuencial, `layer_type` semántico opcional tipo "outer_layer"), nunca coordenadas x/y ni z-index. Hay un conjunto de endpoints REST maduro bajo `/outfits` (`/outfits/studio`, `PATCH /outfits/{id}`, `/wore-instead`, `/clone-to-lookbook`, `/wear-today`) con reglas de negocio (inmutabilidad de outfits "worn", ownership de items, aprendizaje de pares). No hay Alembic migration que cree columnas de layout; `add_studio_schema.py` solo añadió `name`, `replaces_outfit_id`, `cloned_from_outfit_id`, índices y el status `skipped`. Un builder drag-and-drop con canvas libre y capas requerirá añadir columnas de posición espacial y rediseñar el componente `CanvasPanel`, pero puede reutilizar casi toda la capa de servicios/API existente.

## 2. Frontend

### 2.1 Rutas y páginas
- `/dashboard/outfits` — `frontend/app/dashboard/outfits/page.tsx:129-527`. Lista/grid de outfits con filtros por chips (all, my-looks, worn, pairings, replacements, ai), vista lista y vista calendario (`OutfitCalendar`), búsqueda en lookbook, paginación "load more". Usa `useOutfits`/`useCalendarOutfits` (`frontend/lib/hooks/use-outfits.ts`) y renderiza `OutfitCard` (`frontend/components/outfits/outfit-card.tsx`).
- `/dashboard/outfits/new` — `frontend/app/dashboard/outfits/new/page.tsx:44-476`. Es el "Studio Editor" actual (título interno `studioTitle`/`editTitle`). Soporta modo creación y modo edición vía query param `?edit=<id>` (`editId`, línea 48). Maneja: borrador local en `localStorage` (draft-storage), carga de outfit existente para editar (bloqueado si `worn_at` está seteado → `editPhase === 'wornImmutable'`, líneas 300-325), reducer `studioReducer` para estado de items/nombre/ocasión, botones "Wear today" (crea y marca usado) y "Save to lookbook" (crea plantilla), diálogo de conflicto cuando se edita un outfit ya usado (ofrece clonar a lookbook en vez de mutar). Composición visual: `CanvasPanel` (items seleccionados) + `DetailsPanel` (nombre, ocasión, warnings de composición, botón "AI Assist") + `ItemPicker` (selector de prendas del armario) — ver líneas 399-439.
- `/dashboard/outfits/[id]` — `frontend/app/dashboard/outfits/[id]/page.tsx:31-278`. Vista detalle: título, badges (ocasión, fuente), reasoning/highlights IA, `LineageCard` (linaje de plantilla→uso), grid de items (enlaza a wardrobe), acciones: "Wear today" (si es plantilla/template, `outfit.scheduled_for === null`), "Save to lookbook" (si es instancia), "Edit" (deshabilitado si worn), "Delete", lista de instancias "worn" derivadas de la plantilla (`cloned_from_outfit_id`).

### 2.2 Componentes reutilizables
- `frontend/components/outfits/outfit-card.tsx:90-171` — tarjeta de outfit para listas/grids: grid 2x2 de hasta 4 thumbnails + badge de fuente (Replacement/Worn/Studio/Pairing/AI).
- `frontend/components/studio/canvas-panel.tsx:21-73` — "canvas" actual del Studio: **no es un canvas real**, es un `flex flex-wrap` de tarjetas cuadradas de 96px con botón de eliminar; el orden viene dado por `canonicalItemOrder` (rol de prenda), no por posición libre del usuario.
- `frontend/components/studio/details-panel.tsx:71-183` — panel de metadatos: nombre, chips de ocasión, warnings heurísticos (`computeWarnings`, líneas 30-58: falta de top/bottom, múltiples bottoms, falta de calzado), botón "AI Assist" que llama a `/outfits/suggest` con `include_items` y fusiona resultado (`mergeAiAssist`).
- `frontend/components/shared/item-picker.tsx` — selector de prendas del armario (usado en Studio); no leído línea a línea pero referenciado en `new/page.tsx:23,432`.
- `frontend/components/shared/clone-to-lookbook-dialog.tsx` — diálogo para clonar una instancia usada a plantilla de lookbook (usado en `new/page.tsx` y `[id]/page.tsx`).
- `frontend/components/shared/lineage-card.tsx` — usado en detalle para mostrar relación plantilla/instancia/reemplazo.
- Lógica de dominio en `frontend/lib/studio/`:
  - `editor-state.ts:1-102` — reducer (`ADD_ITEM`, `REMOVE_ITEM`, `TOGGLE_ITEM`, `SET_NAME`, `SET_OCCASION`, `REPLACE_CANVAS`, `LOAD`, `RESET`) y tipo `StudioItem` (id, type, name, thumbnail_url, image_url, primary_color) — **sin campos de posición x/y/rotación**.
  - `canonical-order.ts:1-67` — mapa `ITEM_ROLE` (tipo de prenda → rol semántico: base_top, bottom, full_body, mid_layer, outer_layer, footwear, socks, neckwear, accessory) y `canonicalItemOrder` que ordena items por rol fijo, no por posición libre.
  - `draft-storage.ts:1-48` — autosave de borrador en `localStorage` (`studio_draft_v1`, TTL 24h).
  - `edit-load.ts`, `errors.ts`, `ai-assist-merge.ts` — utilidades de fases de carga en modo edición, detección de error "worn immutable", y fusión de sugerencias de IA con el canvas actual.

### 2.3 Cliente HTTP / hooks
- Cliente HTTP centralizado en `frontend/lib/api.ts` (`ApiError`, `NetworkError`, `fetchApi`, base path `/api/v1`, bearer token vía `setAccessToken`/`getAccessToken`).
- `frontend/lib/hooks/use-outfits.ts` — hooks React Query: `useOutfits(filters, page, pageSize)` → `GET /outfits`; `useOutfit(id)` → `GET /outfits/{id}`; `useAcceptOutfit`/`useRejectOutfit` → `POST /outfits/{id}/accept|reject`; `useSubmitFeedback` → `POST /outfits/{id}/feedback`; `useDeleteOutfit` → `DELETE /outfits/{id}`; `useCalendarOutfits`, `usePendingOutfits`; hooks de family rating. Tipos TS: `Outfit`, `OutfitItem` (con `position: number`, `layer_type: string | null`), `OutfitFilters`, `FeedbackData/Response`.
- `frontend/lib/hooks/use-studio.ts` — `useCreateStudioOutfit` → `POST /outfits/studio`; `useCreateWoreInstead` → `POST /outfits/{id}/wore-instead`; `useCloneToLookbook` → `POST /outfits/{id}/clone-to-lookbook`; `useWearToday` → `POST /outfits/{id}/wear-today`; `usePatchOutfit` → `PATCH /outfits/{id}` (payload `{name?, items?: string[]}` — solo lista de IDs, sin layout).
- Estado global: no hay Zustand/Redux; se usa **React Query** (TanStack Query) para server-state y `useReducer` local (`studioReducer`) para el estado del editor. Sesión/token vía `next-auth` (`useSession`).
- i18n: `next-intl` v3, catálogos completos en `frontend/messages/{en,es}.json`; sección `outfits` (línea 1080), `detailsPanel` (línea 1382), `outfitDetail` (línea 1446), `outfitNew` (línea 1505 — usada por el Studio actual). Locale por cookie `wardrowbe_locale`, default `es`.
- Auth de la ruta: **protección solo client-side**. `frontend/app/dashboard/layout.tsx:15-71` usa `useAuth()` (hook, `frontend/lib/hooks/use-auth.ts`) y redirige a `/login` en `useEffect` si `!isAuthenticated` tras cargar; no hay `middleware.ts` en `frontend/` a nivel raíz para bloqueo SSR — el contenido del layout se monta antes de redirigir (aunque retorna `null` mientras `!isAuthenticated`). El backend además protege cada endpoint con `Depends(get_current_user)` (`backend/app/utils/auth.py`, referenciado en todos los endpoints de `outfits.py`).

## 3. Backend

### 3.1 Modelo Outfit
- `backend/app/models/outfit.py`.
  - `Outfit` (`outfits`, líneas 44-128): `id` (UUID PK), `user_id` (FK users, cascade delete), `weather_data` (JSONB), `occasion` (str, requerido), `scheduled_for` (Date, nullable — `NULL` = plantilla de lookbook, no-`NULL` = instancia "usada" en fecha), `reasoning`/`style_notes` (Text), `ai_raw_response` (JSONB), `status` (enum `OutfitStatus`: pending/sent/viewed/accepted/rejected/skipped/expired), `source` (enum `OutfitSource`: scheduled/on_demand/manual/pairing), `source_item_id` (FK clothing_items, para pairings), `name` (str opcional), `replaces_outfit_id`/`cloned_from_outfit_id` (self-FK para linaje), timestamps.
  - `OutfitItem` (`outfit_items`, líneas 131-145): PK compuesta (`outfit_id`, `item_id`), `position: int` (orden secuencial, no coordenada), `layer_type: str | None` (etiqueta semántica de capa, ej. "outer_layer", asignada solo por `recommendation_service.py:609-619`; en creación manual/Studio **no se setea**, queda `NULL`).
  - `UserFeedback` (`user_feedback`, líneas 148-178): rating/comment/worn_at/actually_worn/wore_instead_items (JSONB de IDs).
  - `FamilyOutfitRating` (`family_outfit_ratings`, líneas 181-202).
  - **No existen columnas de posición espacial (x, y, rotation, scale, z_index) en ningún modelo.**

### 3.2 Schemas Pydantic
No hay `backend/app/schemas/outfit.py` — los schemas de outfit viven inline en `backend/app/api/outfits.py` (no en `app/schemas/`):
  - `OutfitItemResponse` (líneas 132-156): incluye `position: int`, `layer_type: str | None`, `image_url`/`thumbnail_url` computados (URLs firmadas).
  - `OutfitResponse` (líneas 203-224): incluye `items: list[OutfitItemResponse]`, `feedback`, `family_ratings`, `music_inspiration`, `highlights`, etc.
  - Requests de creación/edición: `SuggestRequest` (líneas 93-129, para IA), `StudioCreateRequest` (líneas 993-1011: `items: list[UUID]` min 1 max 20, `occasion`, `name?`, `scheduled_for?`, `mark_worn`, `source_item_id?` — **solo lista de IDs, sin posiciones**), `PatchOutfitRequest` (líneas 1035-1039: `name?`, `items?: list[UUID]` — reemplaza la lista completa de items, reordena canónicamente en backend), `WoreInsteadRequest`, `CloneToLookbookRequest`, `WearTodayRequest`, `FeedbackRequest`.

### 3.3 Endpoints REST
Todos bajo `router = APIRouter(prefix="/outfits", ...)` en `backend/app/api/outfits.py`, todos protegidos con `Depends(get_current_user)` y algunos con rate-limit por usuario (`rate_limit_by_user`):
  - `POST /outfits/suggest` (línea 417) — generación IA (`RecommendationService`).
  - `GET /outfits` (línea 490) — listado paginado con filtros ricos: `status`, `occasion`, `date_from/to`, `family_member_id`, `source`, `is_lookbook`, `is_replacement`, `has_source_item`, `item_type`, `search`, `cloned_from_outfit_id`. Paginación `page`/`page_size` con `has_more`.
  - `GET /outfits/{outfit_id}` (línea 551) — detalle.
  - `POST /outfits/{outfit_id}/accept|reject|skip` (líneas 581, 616, 653).
  - `DELETE /outfits/{outfit_id}` (línea 667).
  - `POST /outfits/{outfit_id}/feedback`, `GET /outfits/{outfit_id}/feedback` (líneas 688, 807).
  - `POST /outfits/{outfit_id}/family-rating`, `GET .../family-ratings`, `DELETE .../family-rating` (líneas 852, 938, 1257).
  - **Grupo "Studio" (el builder manual actual)**, todos con `_check_studio_kill_switch()` (feature flag `studio_disabled`, línea 982):
    - `POST /outfits/studio` (línea 1049) — crear outfit manual desde cero (`StudioService.create_from_scratch`).
    - `POST /outfits/{outfit_id}/wore-instead` (línea 1088).
    - `POST /outfits/{outfit_id}/clone-to-lookbook` (línea 1132).
    - `POST /outfits/{outfit_id}/wear-today` (línea 1164).
    - `PATCH /outfits/{outfit_id}` (línea 1203) — edita `name`/`items`; bloquea si el outfit ya fue "worn" (`OutfitWornImmutableError` → 409).

Lógica de negocio en `backend/app/services/studio_service.py` (`StudioService`, 413 líneas): valida ownership de items (`_validate_item_ownership`), ordena canónicamente (`_order_items_canonically` usa `app/utils/clothing.canonical_item_order`, el equivalente backend de `canonical-order.ts`), gestiona tracking de uso/lavado, inmutabilidad de outfits ya usados, e integra con `LearningService` (pares de items aceptados/rechazados).

## 4. Persistencia del layout

**Solo se guarda una lista ordenada de IDs de item, no posiciones libres.** Evidencia:
- `backend/app/models/outfit.py:140` — `OutfitItem.position: Mapped[int]` es un entero secuencial (0, 1, 2…), no coordenadas.
- `backend/app/services/studio_service.py:161-162` y `:400-401` — al crear/parchear, se itera `enumerate(ordered)` y se asigna `position=pos` según el orden canónico calculado por rol de prenda, no por acción del usuario.
- `frontend/lib/studio/canonical-order.ts:50-67` — el frontend reordena `StudioItem[]` por `CANONICAL_ROLE_ORDER` (full_body → base_top → mid_layer → outer_layer → bottom → footwear → socks → neckwear → accessory), ignorando cualquier orden de selección del usuario.
- `frontend/components/studio/canvas-panel.tsx` — renderiza los items en `flex flex-wrap`, sin absolute positioning, sin drag handlers, sin z-index.
- `layer_type` (string libre de 20 chars) solo es poblado por `recommendation_service.py:609-619` (IA) con valores semánticos tipo "outer_layer"/"base_top"; en el flujo manual/Studio se preserva tal cual venga (clone/wear-today) pero **nunca se asigna en creación manual** (`create_from_scratch` no lo setea, queda `NULL`).
- No hay migración que añada columnas `x`, `y`, `rotation`, `scale`, `z_index` ni tabla de "canvas layout" — revisado `backend/migrations/versions/001_initial_schema.py` (creación de `outfit_items`) y `add_studio_schema.py` (única migración específica de Studio, solo añade `name`/`replaces_outfit_id`/`cloned_from_outfit_id`/índices/status `skipped`).

## 5. Gaps para outfit builder drag-and-drop

- **Falta persistencia espacial**: añadir a `OutfitItem` columnas tipo `pos_x: float`, `pos_y: float`, `scale: float` (default 1.0), `rotation: float` (default 0), `z_index: int` (orden de apilado libre, distinto del `position` actual que es semántico/orden de lista). Requiere nueva Alembic migration (revisar cadena de `down_revision` actual, última es `add_family_outfit_ratings.py` → confirmar head con `alembic heads` antes de escribir la migration).
- **Redefinir el significado de `position`**: hoy se usa para orden canónico de visualización en listas (`OutfitItemResponse.position`, `outfit_to_response` línea 326 ordena `sorted(outfit.items, key=lambda x: x.position)`). Si se introduce layout libre, hay que decidir si `position` sigue siendo "orden de capas para fallback/list view" y el canvas usa columnas nuevas, o si se sustituye por `z_index`.
- **Schema Pydantic nuevo**: `OutfitItemResponse` necesitaría campos opcionales `pos_x`/`pos_y`/`scale`/`rotation`/`z_index` (nullable para no romper outfits antiguos sin layout). `StudioCreateRequest`/`PatchOutfitRequest` necesitarían aceptar `items: list[{item_id, pos_x, pos_y, scale, rotation, z_index}]` en vez de `items: list[UUID]` plano — esto es un cambio de contrato, hay que versionarlo con cuidado (los clientes actuales — `usePatchOutfit`, `useCreateStudioOutfit` — mandan `string[]`; se necesitaría aceptar ambos formatos o bump de versión).
- **`StudioService`**: `create_from_scratch` y `patch_outfit` asumen `item_ids: list[UUID]` y reordenan canónicamente ellos mismos (`_order_items_canonically`); habría que añadir un modo que respete/persista posiciones explícitas del payload en vez de recalcular con `canonical_item_order`.
- **Frontend**: `CanvasPanel` es hoy un simple flex-wrap sin drag-and-drop; `editor-state.ts`/`StudioItem` no tiene campos de posición; habría que:
  - añadir librería DnD (p.ej. `@dnd-kit` o `react-dnd`, no presente actualmente en el repo — verificar `package.json`),
  - extender `StudioItem` con `pos_x/pos_y/scale/rotation/zIndex`,
  - extender el reducer (`MOVE_ITEM`, `RESIZE_ITEM`, `BRING_TO_FRONT`) en `editor-state.ts`,
  - decidir si `canonicalItemOrder` deja de aplicarse automáticamente al añadir items (o solo se usa como posición inicial sugerida, editable después).
- **Draft storage** (`draft-storage.ts`) solo guarda `items: string[]` — habría que extender el borrador para persistir el layout también, o aceptar perder el layout al reanudar un draft antiguo.
- **Kill switch existente** (`studio_disabled`, `_check_studio_kill_switch` en `outfits.py:982`) es reutilizable para apagar el nuevo builder si hace falta.
- **Sin gap de auth/ownership**: `ItemOwnershipError` y el patrón `_validate_item_ownership` ya cubren la validación de que los items pertenecen al usuario; el nuevo builder puede reusar esta lógica sin cambios.

## 6. Integración con lo existente

- El "Studio" actual en `/dashboard/outfits/new` **ya cumple el rol de "outfit builder"** (crear/editar manualmente), solo que sin canvas libre. No es un flujo aparte que compita con uno nuevo — es exactamente lo que se va a evolucionar.
- Recomendación: **evolucionar `new/page.tsx` in-place** (mismo `StudioService`/endpoints backend, mismo reducer extendido con campos de layout) en lugar de crear una ruta paralela `/dashboard/outfits/builder`. Motivos: 
  - ya maneja modo edición (`?edit=<id>`), inmutabilidad de outfits worn, clone-to-lookbook, drafts, AI-assist — duplicar esa lógica en una ruta nueva sería alto riesgo de divergencia.
  - el contrato backend (`StudioCreateRequest`/`PatchOutfitRequest`) puede extenderse de forma retrocompatible (campos de layout opcionales) sin romper `OutfitCard`/`[id]/page.tsx`, que solo leen `items[].position`/`layer_type` para mostrar grids, no dependen de layout libre.
  - Sugerido: introducir el nuevo `CanvasPanel` con drag-and-drop **detrás de las mismas props** (`items`, `onRemove`) añadiendo `onMove`/`onResize`, y hacer un rollout progresivo: (1) añadir columnas nullable + defaults, (2) el canvas nuevo escribe posiciones si el usuario arrastra, pero si no arrastra nada se comporta como hoy (fallback a `canonicalItemOrder`), (3) mostrar el layout guardado en `[id]/page.tsx` solo si existen coordenadas, si no, seguir usando el grid actual — así no se rompe ningún outfit histórico (todos con `pos_x/pos_y = NULL`).
