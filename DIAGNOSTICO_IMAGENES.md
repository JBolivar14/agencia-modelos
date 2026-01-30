# 🔍 Diagnóstico: imágenes cargan lento,

Guía práctica para diagnosticar por qué las imágenes de la galería y del lightbox tardan en cargar.

---

## 1. De dónde vienen las imágenes

En este proyecto las fotos salen de **Supabase Storage** (bucket `modelos`). Se sirven por **URL pública** (`getPublicUrl`) sin redimensionado ni transformación:

- **Home**: cada tarjeta de modelo usa `background-image` con la URL completa.
- **ModeloDetalle**: hero, miniaturas y lightbox usan las mismas URLs completas.
- No hay `loading="lazy"` en las tarjetas del home.
- No se usan parámetros de transformación de Supabase (tamaño, formato, calidad).

---

## 2. Cómo diagnosticar en el navegador

### A) Pestaña Network (red)

1. Abrí la app en Chrome y **F12** → pestaña **Network**.
2. Marcá **"Img"** (o "Imágenes") en los filtros para ver solo imágenes.
3. Recargá la página (**Ctrl+R** o **F5**).
4. Revisá:
   - **Tamaño**: tamaño de cada imagen (KB/MB). Si pasan de ~200–300 KB en thumbnail, es mucho.
   - **Tiempo**: columna "Time". >1–2 s por imagen suele indicar red lenta o archivos pesados.
   - **Dominio**: si todas salen de `*.supabase.co`, la lentitud puede ser distancia al servidor o sin CDN cerca.

### B) Waterfall (cascada)

1. En Network, hacé clic en una imagen lenta.
2. En el panel inferior mirá **Waterfall**: cuánto es conexión (DNS, SSL) y cuánto descarga.
   - Mucho tiempo antes de "Content Download" → problema de red/latencia o servidor lejano.
   - Mucho "Content Download" → archivo grande o conexión lenta.

### C) Lighthouse (rendimiento)

1. **F12** → pestaña **Lighthouse**.
2. Dejá solo **Performance**.
3. Elegí "Desktop" o "Mobile" según lo que quieras medir.
4. **Analyze page load**.
5. Revisá:
   - **LCP / Largest Contentful Paint**: si es alto, suele ser por imágenes grandes o cargadas tarde.
   - **"Properly size images"**: indica que se sirven imágenes más grandes que el tamaño con el que se muestran.
   - **"Defer offscreen images"**: sugiere lazy loading para lo que no se ve al inicio.

### D) Vercel / Real User Monitoring (RUM)

Si usás Vercel y tenés datos de **Web Vitals** (p. ej. INP, LCP):

- **INP alto** al abrir/cambiar fotos en el lightbox → mucho trabajo en el hilo principal al cargar o al cambiar de imagen.
- **LCP alto** en la home → la “imagen más grande” (ej. primera modelo o hero) tarda por tamaño o por orden de carga.

---

## 3. Causas habituales en este proyecto

| Causa | Dónde se nota | Cómo comprobarlo |
|-------|----------------|-------------------|
| **Imágenes muy pesadas** | Home, detalle, lightbox | Network → columna Size; Lighthouse “Properly size images” |
| **Sin lazy loading** | Home (todas las tarjetas cargan al inicio) | Network: muchas solicitudes de imagen enseguida; Lighthouse “Defer offscreen images” |
| **Misma URL para todo** | Misma foto en thumbnail y en grande | Una sola URL para distintos tamaños de visualización |
| **Supabase en otra región** | Cualquier página con fotos | Network: dominio `*.supabase.co`; Time alto en Waterfall |
| **Muchas imágenes a la vez** | Home con muchos modelos | Network: muchas peticiones en paralelo; el navegador limita concurrencia por dominio |
| **Lightbox sin precarga / lógica pesada** | INP alto al abrir o al cambiar de foto | RUM/Performance; ya hay precarga en `ModeloDetalle` pero se puede afinar |

---

## 4. Checklist rápido de diagnóstico

Hacé esto en orden y anotá resultados:

1. **Network → Img**  
   - ¿Cuántas imágenes se piden al cargar la home?  
   - ¿Tamaño total (aprox.) y tamaño de la más grande?

2. **Tamaño de archivo**  
   - ¿Alguna imagen > 500 KB para un thumbnail o tarjeta? (sí → optimizar tamaño).

3. **Lighthouse**  
   - ¿Sale “Properly size images”? (sí → servir tamaños acorde al uso).  
   - ¿Sale “Defer offscreen images”? (sí → activar lazy loading).

4. **Waterfall de 1–2 imágenes lentas**  
   - ¿La mayor parte del tiempo es “Content Download” o “Connection / Waiting”?  
   - Si es download → reducir peso. Si es connection/waiting → red o ubicación del Storage.

5. **Lightbox**  
   - ¿El INP empeora al abrir o al cambiar de foto?  
   - Si es al cambiar → priorizar precarga y evitar trabajo pesado en el handler del clic.

---

## 5. Acciones recomendadas (según diagnóstico)

### Si las imágenes son muy grandes

- **Supabase Image Transformation** (si tenés plan que lo incluya): usar URLs con parámetros, por ejemplo:
  - Thumbnails/tarjetas: `width=400` (o el ancho real del diseño).
  - Lightbox: `width=1200` o similar y `quality=80`.
- Alternativa: generar y guardar en Storage **dos versiones** por foto (thumbnail + grande) y usar la que corresponda en cada vista.

### Si cargan demasiadas a la vez (home)

- Usar **lazy loading**: en las tarjetas de `Home.jsx`, usar `<img>` con `loading="lazy"` o un componente que solo cargue la imagen cuando entre en viewport (Intersection Observer).
- Si seguís con `background-image`, hacer un pequeño componente que renderice un `<img loading="lazy">` y, al cargar, aplique esa imagen como background o reemplace un placeholder.

### Si el cuello es la red / Supabase

- Revisar **región del proyecto Supabase** y que sea coherente con la mayoría de usuarios.
- Comprobar si Supabase está usando CDN para Storage en tu plan; si hay opción de cacheo o CDN, activarla.

### Si el lightbox es lento (INP)

- Mantener **precarga** de la anterior/siguiente (ya implementada).
- Asegurar que el **cambio de índice** no haga trabajo pesado en el handler del clic (mantener handlers ligeros, actualizar estado y dejar que React pinte).
- Considerar **placeholder** (blur o color) mientras carga la imagen del lightbox, para que la respuesta se perciba antes.

---

## 6. Registro de una sesión de diagnóstico

Podés usar una tabla como esta y rellenarla en una sesión:

| Paso | Qué mediste | Resultado (ejemplo) |
|------|-------------|----------------------|
| Imágenes en load home | Cantidad / tamaño total | 15 imágenes, ~4 MB |
| Imagen más grande | Tamaño en KB | 800 KB |
| Lighthouse "Properly size images" | Sí/No | Sí |
| Lighthouse "Defer offscreen images" | Sí/No | Sí |
| Waterfall imagen lenta | Mayor tiempo en… | Content Download |
| INP al abrir lightbox | ms (si tenés dato) | 2500 ms |

Con eso podés decidir si el foco va en **tamaño de archivos**, **lazy loading**, **tamaños por contexto** o **lightbox/precarga**.

---

## 7. Referencia rápida: dónde se usan las imágenes en el código

| Lugar | Archivo | Cómo se usa |
|-------|---------|-------------|
| Galería home (tarjetas) | `src/pages/Home.jsx` | `background-image` con URL de `modelo.fotos[0].url` o `modelo.foto` |
| Detalle (hero + grid) | `src/pages/ModeloDetalle.jsx` | `background-image` y `<img>` en lightbox |
| Subida de fotos | `api/index.js` | `getPublicUrl()` de Supabase Storage (sin transformación) |

Las URLs que llegan al frontend son las que devuelve Supabase (directas al objeto en Storage). Para optimizar sin tocar Backend, habría que:

- O bien construir en frontend URLs con query params de transformación (si Supabase y tu plan lo permiten),  
- O bien en backend/API generar y devolver **dos URLs por foto** (thumbnail y grande) y que el frontend elija según el contexto.

---

*Guía de diagnóstico de imágenes para el proyecto Agencia Modelos Argentinas.*
