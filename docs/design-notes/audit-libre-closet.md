# Auditoría Libre Closet — patrones para outfit builder

## 0. Stack real

- **Backend:** NestJS 11 sobre **Fastify** (no Express) — `@nestjs/platform-fastify` (`package.json:60`). Confirmado NestJS por `nest-cli.json:1-15`.
- **Frontend:** **NO es React ni SPA**. 100% **server-side rendered con Handlebars** (`hbs`/`handlebars`, `package.json:66-67`), servido vía `@fastify/view`. Interactividad con **htmx** + **hyperscript** (`_="on click ..."`), sin build de JS de aplicación.
- **ORM:** MikroORM (`@mikro-orm/core`, `@mikro-orm/nestjs`).
- **DB:** **dual SQLite/Postgres** — dos configs CLI (`mikro-orm.sqlite.cli-config.ts`, `mikro-orm.postgres.cli-config.ts`), variable `DATABASE_TYPE` (`README.md:153`). SQLite por defecto.
- **Estilos:** Tailwind v4 + **DaisyUI** tema oscuro.
- **PWA:** service worker Workbox + `pulltorefreshjs`.

## 1. Librería drag-and-drop

- **`sortablejs` `^1.15.7`** (`package.json:83`).
- **Única instancia de uso:** `views/outfits/form.hbs:42` sobre `#outfit-rows-list`, con `handle: '.drag-handle'`.
- **CRÍTICO:** Sortable.js aquí SOLO reordena **filas de categoría** verticalmente. NO es DnD de prendas sobre canvas. No hay posicionamiento X/Y libre en ningún lado del proyecto.
- Para el objetivo de Miaurmario (canvas con posiciones libres + capas), Sortable.js **no es el modelo adecuado** — está pensado para listas. Alternativas: `@dnd-kit/core`, `react-moveable`, `konva`, `fabric.js`.

## 2. Estructura del canvas

- **No existe canvas visual.** El "builder" (`views/outfits/form.hbs`) es un formulario de filas por categoría.
- Cada row muestra: drag-handle + label de categoría + carrusel prev/next de prendas (server-rendered vía htmx) + thumbnail + botón eliminar. Con swipe táctil horizontal como alternativa a los `‹›` (hyperscript directo sobre `touchstart/move/end`, `outfit_row.hbs:6-34`).
- **Categorías semi-fijas** con enum base (`GarmentCategory`: accessories, bags, outerwear, dresses, tops, bottoms, footwear, other) + posibilidad de categorías custom.
- **NO hay overlap ni z-index en ningún lado** del modelo ni de la UI.
- **Prendas:** thumbnails raster con **fondo removido** (`/file/nobg/{fileName}`), generadas client-side con `@imgly/background-removal` (ONNX + WASM en Web Worker) con fallback server.

## 3. Panel de prendas

- **No hay panel lateral de prendas arrastrable.** La selección por categoría es el carrusel prev/next dentro de cada row.
- El panel de wardrobe real vive en `views/wardrobe/index.hbs`, separado del builder:
  - Grid responsive, filtros fijos abajo, modal de filtros por categoría/color/talla/archivado
  - Búsqueda server-side por `keyword` con `$like` sobre `name/notes/brand`
  - Selector de color custom con swatches (componente `color-multiselect`)

## 4. Mobile UX

- **Breakpoints:** defaults de Tailwind. Diseño mobile-first, `max-w-lg` centrado en desktop.
- **Drag en touch:** inmediato desde el `handle` con Sortable.js (sin long-press).
- **Swipe custom hyperscript** para navegar prendas en carrusel (`outfit_row.hbs:6-34`): umbral 30px, `preventDefault` en scroll horizontal, sin inercia ni feedback intermedio.
- **Dock inferior** estilo app nativa (Wardrobe/Outfits/Calendar).
- PWA offline + pull-to-refresh.

## 5. Persistencia

- **Modelo `Outfit`** (`src/dal/entity/outfit.entity.ts:19-43`):
  - `id`, `name?`, `notes?`
  - `slots?: OutfitSlot[]` — columna **JSON**, donde `OutfitSlot = { category: string; garmentId: number | null }`
  - `garments: Collection<Garment>` — `@ManyToMany`, `owner: true`
  - `owner?: Ref<User>` con cascade
- **NO guarda X/Y ni z-index.** Solo orden de categorías (orden del array) y qué prenda en cada slot.
- **NO snapshot de imagen** — se re-renderiza desde datos.
- **Endpoints** (`src/wardrobe/outfit.controller.ts`): form-POST + fragmentos HTML htmx, no hay JSON API.

## 6. Estética

- Look minimalista, tema oscuro DaisyUI, tipografía system-ui.
- Cards `rounded-box`, badges, `<dialog>` nativo, `bg-base-200` neutro.
- Fotos aisladas tipo catálogo (prenda con bg removido flotando).
- **No hay composición editorial** — es lista/grid de prendas individuales.

## 7. Componentes de referencia

1. `src/wardrobe/outfit.service.ts:149-225` — lógica "outfit como slots por categoría".
2. `views/outfits/form.hbs` + `views/partials/outfit_row.hbs` — outfit builder actual.
3. `src/dal/entity/outfit.entity.ts` + `src/dal/entity/garment.entity.ts` — schema base.
4. `public/js/background-removal.js` + `public/js/mask-editor.js` — pipeline bg removal client-side. **Reutilizable directo.**
5. `views/wardrobe/index.hbs` + `src/wardrobe/garment.service.ts` — filtros/búsqueda wardrobe.

## 8. Lo que hace bien

- SSR + htmx + hyperscript logra Lighthouse 99 con poco JS.
- Background removal client-side con fallback server, elegante y robusto.
- Modelo dual SQLite/Postgres bien pensado para self-hosting.
- Wardrobe sharing con `view`/`manage`.
- Swipe táctil sin dependencias extra (ligero, aunque frágil).

## 9. Lo que hace regular

- **El "outfit builder" NO es un builder visual.** No hay canvas, ni posición libre, ni capas. Si Miaurmario promete canvas real, Libre Closet no aporta patrón de implementación para eso.
- Modelo "un solo garmentId por categoría" es rígido.
- Toda la interactividad depende de roundtrips al servidor — insostenible para drag continuo.
- Gestos táctiles hardcodeados sin librería, sin feedback intermedio.
- Sin snapshot de imagen compartible del outfit compuesto.

## 10. Portabilidad al stack Miaurmario

**Traducible directo:**
- Modelo base `Garment` (nombre, categoría, color enum, marca, talla, foto, owner).
- Enfoque filtros/búsqueda del wardrobe (categoría + color + talla + keyword + badges).
- Pipeline `@imgly/background-removal` (JS puro, agnóstico de framework) con fallback FastAPI.
- Concepto de "slots por categoría" como modo simple/rápido alternativo al canvas.

**Reinventar (Libre Closet no lo resuelve):**
- **Todo el canvas de composición visual** — no hay código a portar. Miaurmario debe diseñarlo desde cero con `@dnd-kit/core` (o `react-moveable`/`konva` si necesita transform libre).
- Modelo `OutfitItem { garmentId, x, y, zIndex, scale?, rotation? }` en Postgres.
- Estado del canvas en el cliente (React state) persistido solo al soltar/guardar — patrón opuesto al de htmx roundtrip.
- SSR con Handlebars vs Next.js App Router — no hay code-sharing real.
- NestJS/MikroORM vs FastAPI/SQLAlchemy — la capa de servicio se reescribe.
- Snapshot de imagen compartible — implementar aparte (Satori / html-to-image / canvas.toBlob).
