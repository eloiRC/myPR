# Biblioteca de ejercicios con imágenes para MyPR

Fecha: 2026-10-23. Investigación y diseño; no se ha tocado código de la app. Los repos se clonaron (`--depth 1`) en el scratchpad `...\scratchpad\exlib\` y los números salen de los datos reales, no de los README.

## 1. Recomendación

**Usar `yuhonas/free-exercise-db` como catálogo base** (Unlicense = dominio público, sin atribución, sin restricciones comerciales ni de redistribución, datos Y imágenes), copiarlo a nuestro D1 + R2 y **traducirlo al español una sola vez con un LLM barato** (coste estimado 1-2 USD). Es el único candidato con licencia limpia tanto para datos como para media, y es suficientemente grande (876 ejercicios) para que el coach IA elija ejercicios reales.

Alternativa a vigilar: **RepDB (sergei-argutin/exercise-dataset)**, que trae español nativo y WebP, pero con una licencia propia que añade riesgo (ver tabla). Solo valdría la pena si la traducción automática de free-exercise-db no convence.

Descartados para uso comercial: hasaneyldrm (media de terceros), ExerciseDB (código AGPL, datos/GIF de pago o vía RapidAPI) y wger (CC-BY-SA con copyleft por ejercicio, pocas imágenes).

## 2. Comparativa de candidatos

| | free-exercise-db | RepDB free | hasaneyldrm | ExerciseDB | wger |
|---|---|---|---|---|---|
| Licencia datos | Unlicense (dominio público) | Propia "RepDB Free Tier v1.0": uso comercial dentro de apps, **atribución visible obligatoria**, **prohibido redistribuir como dataset/API**, prohibido usar las imágenes con IA generativa | MIT | Código AGPL-3.0; datos bajo sus Terms of Use (no están en el repo) | Código AGPL-3+; datos CC por ejercicio |
| Licencia media | Unlicense | La misma. Imágenes generadas con IA por RepDB. Animaciones premium de muestra: solo evaluación | **© Gym visual**, solo 180x180, atribución obligatoria; el repo dice que clonarlo no concede licencia y remite a los T&C de Gym visual | De pago / RapidAPI | Mezcla por imagen: 295 CC-BY-SA 4 y 88 CC-BY-SA 3 (de 383); 46 marcadas como generadas por IA |
| Uso comercial | Sí, libre | Sí, con atribución y sin re-publicar | Datos sí; media dudosa, requiere licencia propia | Solo con plan de pago | Sí, pero CC-BY-SA obliga a atribuir y compartir igual derivados |
| Nº ejercicios | 876 (`dist/exercises.json`) | 650 (`count: 650` en el JSON; no ~250) | 1.324 | "11.000+" (v2, de pago); v1 ~1.300-1.500 | 932 en la API, solo 279 con imagen |
| Español | **No** (solo inglés) | **Sí**: `name_es`, `description_es`, `instructions_es`, `tips_es` (también de/en) | Instrucciones en 10 idiomas incl. es; el nombre solo en inglés | Solo inglés (v1) | Parcial: 645 de 932 con traducción `es` (idioma id 4), calidad comunitaria |
| Imagen | 2 JPG por ejercicio (inicio/final), ~38 KB cada una, ~102 MB en total | WebP 512x512; 497 ejercicios con 2 frames (`start`/`peak`), 153 con 1 (`main`); ~22 MB | JPG 180x180 (12 MB) + GIF animado (127 MB) | GIF 180p-1080p | PNG/JPG/WebP heterogéneos |
| Campos | name, force, level, mechanic, equipment, primaryMuscles, secondaryMuscles, instructions[], category, images[], id | id, name_*, description_*, category, force_type, mechanic, difficulty, body_part, primary/secondary_muscles (28 músculos finos), goals, tags, equipment, instructions_*, tips_*, met, images | id, name, category, body_part, equipment, instructions{10 idiomas}, muscle_group, secondary_muscles, target, image, gif_url, attribution | name, bodyParts, targetMuscles, equipments, instructions, gif | category, muscles, equipment, translations[], images[], license por ejercicio |
| Mantenimiento | Último push 2026-09-27; ~2.000 estrellas | Commit 2026-10-18 (activo, pero es un producto comercial con tier de pago) | Push 2026-07-16 | Último commit del repo API 2025-11-25 | Muy activo (cambio global 2026-10-14) |

Observaciones:

- **free-exercise-db**: JSON de ~871 KB sin comprimir. Equipamiento: body only 111, machine 67, other 122, foam roll 11, kettlebells 56, dumbbell 123, cable 81, barbell 170, bands 20, medicine ball 17, exercise ball 12, e-z curl bar 9 y 77 sin definir. Nivel: beginner 525 / intermediate 294 / expert 57. Categorías: strength 584, stretching 123, plyometrics 61, strongman 21, powerlifting 38, olympic weightlifting 35, cardio 14. Cardio y estiramientos sobran para un logger de fuerza: filtrarlos. No hay animación real: las 2 fotos se alternan en el cliente.
- **RepDB**: su cláusula 3 (no republicar dataset "ni derivado" como dataset, repositorio o API) choca con meter los datos en D1 y servirlos por nuestra API. La cláusula 5 prohíbe usar las imágenes con IA generativa y exige atribución visible (se quita con el plan de pago). 153 ejercicios solo tienen 1 imagen, así que no sirven para alternar frames.
- **hasaneyldrm**: la media es de Gym visual y limitada a 180x180. Descartado salvo licencia propia.
- **ExerciseDB**: los repos [exercisedb-api](https://github.com/exercisedb/exercisedb-api) y el fork [JakobDrist](https://github.com/JakobDrist/exercisedb-api) solo contienen `LICENSE` (AGPL-3.0) y `README`; no hay datos ni GIF. El acceso real es la API v2 (RapidAPI/plan a medida) y un pack v1 de pago en Gumroad (listado de ~300 USD, dato de terceros). No pude leer sus Terms of Use oficiales; hay indicios (de un competidor, no verificados) de que prohíben cachear/almacenar, lo que impediría tener catálogo propio. No recomendable.
- **wger**: CC-BY-SA exige atribución por imagen y compartir igual; solo 279 ejercicios con imagen. La API es abierta, útil como fuente para cotejar nombres en español, no como catálogo.
- **Otros**: [workoutlabs](https://workoutlabs.com/exercise-illustrations-licensing/) vende licencias de ilustraciones (opción de pago a futuro si se quiere animación profesional).

Fuentes: [free-exercise-db](https://github.com/yuhonas/free-exercise-db), [RepDB](https://github.com/sergei-argutin/exercise-dataset) (`LICENSE-DATA.md`), [hasaneyldrm](https://github.com/hasaneyldrm/exercises-dataset) (`NOTICE.md`), [exercisedb.dev](https://exercisedb.dev/), [wger API](https://wger.de/api/v2/exerciseinfo/), [licencias wger](https://wger.de/api/v2/license/), [wger README](https://cdn.jsdelivr.net/gh/wger-project/wger@master/README.md). La página de documentación de wger estaba tras Anubis (anti-bot), por lo que los datos de wger salen de su API pública.

## 3. Diseño para free-exercise-db

### 3.1 Mapeo de músculos a GrupMuscular

Vocabulario `primaryMuscles` (nº de ejercicios): abdominals 93, hamstrings 79, adductors 13, quadriceps 148, biceps 53, shoulders 129, chest 84, middle back 34, calves 28, glutes 22, lower back 27, lats 38, triceps 73, traps 15, forearms 25, neck 8, abductors 8.

| free-exercise-db | GrupMuscularId | Nombre propuesto | Nota |
|---|---|---|---|
| chest | 1 | Pectoral | |
| shoulders | 2 | Hombros | |
| biceps | 3 | Bíceps | |
| triceps | 4 | Tríceps | |
| lats | 5 | Dorsales | |
| middle back | 5 | Dorsales | No hay "espalda media"; se funde con dorsales (o crear un grupo nuevo) |
| traps | 6 | Trapecio | |
| abdominals | 7 | Core | |
| glutes | 8 | Glúteos | |
| quadriceps | 9 | Cuádriceps | |
| lower back | 10 | Lumbares | |
| hamstrings | 11 | Femorales | Hoy "Femoral" |
| calves | 12 | Gemelos | Hoy "Bessons" |
| abductors | 13 | Abductores | |
| adductors | 15 (nuevo) | Aductores | Sin equivalente |
| forearms | 16 (nuevo) | Antebrazos | Sin equivalente |
| neck | 17 (nuevo, opcional) | Cuello | Solo 8 ejercicios; se puede dejar sin grupo |
| (Deltoides) | 14 | obsoleto | Ver abajo |

Nombres corregidos para los 14 existentes: 1 Pectoral, 2 Hombros, 3 Bíceps, 4 Tríceps, 5 Dorsales, 6 Trapecio, 7 Core, 8 Glúteos, 9 Cuádriceps, 10 Lumbares, 11 Femorales, 12 Gemelos, 13 Abductores, 14 Deltoides -> fusionar con Hombros.

**Solapamiento Hombros/Deltoides (ids 2 y 14)**: para el usuario son lo mismo y free-exercise-db solo tiene "shoulders". Propuesta: migrar `Exercici.GrupMuscularN = 14` a 2 (deduplicando dentro de la fila) y retirar el 14. Si se quiere precisión, que sean subgrupos del catálogo, no grupos de primer nivel. Es una migración sobre datos de producción: confirmar antes de ejecutarla.

`Exercici` admite 5 grupos: rellenar primarios primero y secundarios después (máx. 5).

### 3.2 Esquema D1

```sql
CREATE TABLE IF NOT EXISTS ExerciciCatalog (
  CatalogId        INTEGER PRIMARY KEY AUTOINCREMENT,
  Source           TEXT NOT NULL DEFAULT 'free-exercise-db',
  SourceId         TEXT NOT NULL,              -- p.ej. '3_4_Sit-Up'
  NomOriginal      TEXT NOT NULL,              -- inglés
  NomEs            TEXT NOT NULL,              -- traducido
  NomEsRevisat     INTEGER NOT NULL DEFAULT 0, -- 1 = revisado a mano
  Categoria        TEXT,                       -- strength, stretching...
  Nivell           TEXT,                       -- beginner/intermediate/expert
  Equipament       TEXT,                       -- barbell, dumbbell, machine...
  Mecanica         TEXT,                       -- compound/isolation
  Forca            TEXT,                       -- push/pull/static
  InstruccionsEs   TEXT,                       -- JSON array
  InstruccionsEn   TEXT,                       -- JSON array (original, para re-traducir)
  Imatge0          TEXT,                       -- ruta en R2, p.ej. 'fed/3_4_Sit-Up/0.webp'
  Imatge1          TEXT,
  Actiu            INTEGER NOT NULL DEFAULT 1,
  UNIQUE (Source, SourceId)
);
CREATE INDEX IF NOT EXISTS idx_catalog_equip ON ExerciciCatalog(Equipament);
CREATE INDEX IF NOT EXISTS idx_catalog_nomes ON ExerciciCatalog(NomEs COLLATE NOCASE);

-- Músculos ya mapeados a nuestros GrupMuscular (permite filtrar por JOIN)
CREATE TABLE IF NOT EXISTS ExerciciCatalogMuscul (
  CatalogId       INTEGER NOT NULL REFERENCES ExerciciCatalog(CatalogId) ON DELETE CASCADE,
  GrupMuscularId  INTEGER NOT NULL REFERENCES GrupMuscular(GrupMuscularId),
  Primari         INTEGER NOT NULL DEFAULT 1, -- 1 primario, 0 secundario
  PRIMARY KEY (CatalogId, GrupMuscularId)
);
CREATE INDEX IF NOT EXISTS idx_catmus_grup ON ExerciciCatalogMuscul(GrupMuscularId);

-- Vínculo opcional de un ejercicio de usuario con el catálogo
ALTER TABLE Exercici ADD COLUMN CatalogId INTEGER REFERENCES ExerciciCatalog(CatalogId);
CREATE INDEX IF NOT EXISTS idx_exercici_catalog ON Exercici(CatalogId);

-- Corrección de nombres y nuevos grupos
UPDATE GrupMuscular SET Nom='Bíceps'     WHERE GrupMuscularId=3;
UPDATE GrupMuscular SET Nom='Tríceps'    WHERE GrupMuscularId=4;
UPDATE GrupMuscular SET Nom='Dorsales'   WHERE GrupMuscularId=5;
UPDATE GrupMuscular SET Nom='Trapecio'   WHERE GrupMuscularId=6;
UPDATE GrupMuscular SET Nom='Glúteos'    WHERE GrupMuscularId=8;
UPDATE GrupMuscular SET Nom='Cuádriceps' WHERE GrupMuscularId=9;
UPDATE GrupMuscular SET Nom='Lumbares'   WHERE GrupMuscularId=10;
UPDATE GrupMuscular SET Nom='Femorales'  WHERE GrupMuscularId=11;
UPDATE GrupMuscular SET Nom='Gemelos'    WHERE GrupMuscularId=12;
UPDATE GrupMuscular SET Nom='Abductores' WHERE GrupMuscularId=13;
INSERT INTO GrupMuscular (GrupMuscularId, Nom) VALUES (15,'Aductores'),(16,'Antebrazos');
-- Fusión Deltoides -> Hombros (solo tras revisar datos; repetir para GrupMuscular2..5 y deduplicar)
-- UPDATE Exercici SET GrupMuscular1=2 WHERE GrupMuscular1=14;
```

Notas: `ADD COLUMN` con FK en SQLite exige default NULL, que es nuestro caso. `CatalogId` es opcional: se siguen pudiendo crear ejercicios libres. Al vincular se copian nombre y grupos a `Exercici` (sigue siendo editable); `CatalogId` solo aporta imagen e instrucciones. Comprobar en `database.sql` si hay restricciones únicas en `GrupMuscular.Nom` antes de los INSERT. Endpoints nuevos en `src/index.ts`: `GET /catalog?q=&grupo=&equip=&limit=&offset=` y `GET /catalog/:id`; devolver `CatalogId` e imágenes en las respuestas de ejercicios. Carga con un script que lea `dist/exercises.json`, filtre categorías, mapee músculos y genere SQL en lotes de ~100 filas para `wrangler d1 execute --file`.

### 3.3 Plan de traducción

1. Extraer `name` + `instructions` de los ~800 ejercicios de fuerza (excluir stretching/cardio si se decide).
2. Traducir en lotes de ~25 ejercicios a **Claude Haiku**, con salida JSON estructurada y glosario fijo en el prompt (deadlift = peso muerto, row = remo, pulldown = jalón, lunge = zancada, calf raise = elevación de talones, e-z curl bar = barra Z, kettlebell = pesa rusa/kettlebell...). Equipamiento y músculos se traducen con tablas, no con el LLM.
3. Guardar en `NomEs` e `InstruccionsEs` con `NomEsRevisat = 0`.
4. **Revisión manual de los ~100 más comunes** (press banca, sentadilla, peso muerto, dominadas, remos, curls, extensiones...) y marcar `NomEsRevisat = 1`. Unas 2-3 horas.
5. Se conserva el inglés original, así que se puede repetir con mejor glosario.

Coste estimado: el JSON completo son ~871 KB, unos 220k tokens; limitado a fuerza ~150k de entrada, más ~45k de prompt/glosario repetido (~30 lotes). Salida en español: ~200-250k tokens. Con tarifas de Haiku del orden de 1 USD/MTok de entrada y 5 USD/MTok de salida, el total es **~1,5 USD** (la mitad con la API de batches). Las tarifas no se han verificado: confirmarlas antes de lanzar.

### 3.4 Ideas de UX

1. **"Buscar en catálogo" al crear ejercicio** (`Ejercicios.vue`): botón principal que abre una hoja inferior con buscador (español e inglés), chips de grupo muscular y equipamiento, y lista con miniatura. Al elegir se rellenan nombre y grupos (editables) y se guarda `CatalogId`. Mantener "Crear sin catálogo".
2. **Detalle** (`DetalleEjercicio.vue`): cabecera con la imagen, alternando los 2 frames con fundido cada ~1 s (dos `<img>` apiladas con `@keyframes`; con `prefers-reduced-motion`, solo el frame 0). Debajo, "Cómo se hace" con las instrucciones y los músculos primarios/secundarios.
3. **Formulario de añadir serie**: miniatura de 48-64 px con el mismo efecto junto al nombre; al tocarla se amplía. Sin coste extra: la URL ya está en caché.
4. **Ejercicios existentes sin vínculo**: sugerir "¿Es este ejercicio...?" por coincidencia difusa de nombre y vincular con un toque, sin tocar historial ni PR.
5. **Coach IA**: herramienta `buscar_catalogo(query, grupo, equipo)` que devuelva `CatalogId` + nombre + grupos; al crear un ejercicio exige un `CatalogId` o lo marca como personalizado.
6. Filtros por grupo (vía `ExerciciCatalogMuscul`), equipamiento y nivel; ocultar estiramientos/cardio por defecto.
7. Créditos "free-exercise-db" en Ajustes (opcional, por cortesía).

### 3.5 Hosting de imágenes y caché PWA

- **Recomendado: autoalojar en Cloudflare R2** (o Pages) con dominio propio (p. ej. `img.<dominio>/fed/<id>/0.webp`) y la caché de Cloudflare delante: control de disponibilidad, cabeceras inmutables, sin depender de un repo ajeno, sin coste de salida en R2. Los ~102 MB originales caben de sobra en el plan gratuito.
- **Optimización**: convertir a WebP ~480 px antes de subir. Estimación mía, sin medir: de ~38 KB a 10-20 KB por imagen (conjunto de 20-40 MB).
- **Arranque rápido**: jsDelivr sobre GitHub (`https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/3_4_Sit-Up/0.jpg`). Verificado: HTTP 200, `access-control-allow-origin: *`, `cache-control: public, max-age=604800`. Sirve para prototipar, pero depende de un tercero; fijar un commit en vez de `@main`.
- **Workbox**: NO precachear imágenes. `globPatterns` de `vite-plugin-pwa` limitado a js/css/html/iconos propios. Usar `runtimeCaching`:

```ts
{
  urlPattern: ({ url }) => url.hostname === 'img.TU-DOMINIO',
  handler: 'CacheFirst',
  options: {
    cacheName: 'catalogo-img',
    expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 90, purgeOnQuotaError: true },
    cacheableResponse: { statuses: [0, 200] },
  },
}
```

  Solo se guardan las imágenes que el usuario ve (decenas, no 1.700), con tope de entradas y purga si falta cuota. El listado JSON del catálogo va por API con `StaleWhileRevalidate`, no en el precache. Servir con CORS desde nuestro dominio evita respuestas opacas (estado 0), que en algunos navegadores consumen mucha cuota. Offline: placeholder si la imagen no está en caché. Miniaturas con `loading="lazy"` y `width/height` explícitos.

## 4. Siguientes pasos

1. Confirmar la renombración de `GrupMuscular` y la fusión Deltoides -> Hombros (afecta a producción).
2. Script de importación: filtrar, mapear músculos, traducir con Haiku, convertir imágenes, subir a R2.
3. Migración D1 (tablas + `CatalogId`) y endpoints `/catalog`.
4. UI: picker, imagen animada en detalle y en añadir serie, regla de runtime caching.
5. Herramienta de catálogo para el coach IA.
