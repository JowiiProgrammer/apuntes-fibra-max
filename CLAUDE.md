# Apuntes Fibra Max — guía para Claude

Web de apuntes internos para recepción de Fibra Max (proyecto personal de Joel).
Vite + React 19 + TypeScript, desplegada en Vercel (rama `claude/jolly-johnson-eslxx7`).
Ver `docs/blueprint.md` para PRD y plan.

## Guardado compartido (Supabase)
- Proyecto Supabase **apuntes-fibramax** (ref `ouovnmtgwhcpbqpmzing`, org de atencioncliente@fibra-max.com).
- Tabla `apuntes_versiones` (una fila por guardado = historial). RLS activo sin políticas:
  solo accede la Edge Function `apuntes` (`supabase/functions/apuntes`, verify_jwt = false).
- `GET` de la función → última versión (pública). `POST {password[, data]}` → comprueba/guarda.
  La contraseña es el secreto `EDIT_PASSWORD` de la función: **solo la sabe Joel**, nunca en el repo.
- La web muestra la versión con `version` más alta entre `src/content/apuntes.json` y Supabase.
  En Modo edición (pide contraseña) cada cambio se guarda solo a los 1,5 s (`src/store.tsx`).
- **Antes de editar el JSON por código: `npm run pull`** (trae la última versión de Supabase) y
  después sube `version`. Si no, se pisarían los cambios hechos desde la web.

## Reglas
- El contenido vive en `src/content/apuntes.json` (modelo en `src/types.ts`). Para añadir
  contenido que Joel dicta, edita ese JSON: reemplaza el bloque `pending` del apartado por
  bloques reales (`text`, `steps`, `callout`, `speech`, `checklist`, `prices`, `screenshot`).
- Sube `version` en el JSON cuando publiques contenido nuevo: la web muestra la versión más alta.
- Precios: nunca inventar. Lo que no se sabe va como `null` (se muestra "Pendiente").
- Las tablas de precios están en `priceTables` y se referencian por `tableId`; una tabla puede
  aparecer en varios apartados. En `values`: `null` = pendiente, clave ausente = esa forma de
  pago no existe ("—"). Columnas con `months` muestran el equivalente €/mes. Filas con
  `centros`, `matricula` y `review` (pendiente revisar).
- Fuente de las tarifas: catálogo de tarifas del Cuadro de mando (capturas de Joel).
- Capturas en `public/capturas/`, anotaciones en % (x, y, w, h) sobre la imagen. Antes de subir
  una captura, borra datos personales (nombres de clientes, IBAN…): la web es pública.
- Los bloques `steps` tienen `start` para continuar la numeración tras una captura.
- Los bloques `message` son textos para copiar (WhatsApp, email) con botón «Copiar»; los
  `[huecos]` entre corchetes se resaltan para rellenarlos antes de enviar.
- Los bloques `download` (title, href, note) muestran un botón «Descargar»; los documentos van en
  `public/documentos/` (solo plantillas en blanco, nunca documentos con datos personales).
- Novedades: array `novedades` del JSON ({id, date AAAA-MM-DD, title, md}). Salen en el botón
  flotante «Novedades» (abajo a la derecha) con contador de no leídas (localStorage
  `fm-novedades-vistas`). Cada aviso nuevo de Joel → nueva entrada con `id` único.
- Logo: `public/logo-fibra.png` (oficial, blanco sobre transparente), favicon en `public/`.
- Marca: tokens en `:root` de `src/styles.css` (negro `--side`, rojo `--red`, crema `--bg`,
  Montserrat). Mismo lenguaje visual que el Cuadro de mando de Fibra Max.
- Texto de UI y contenido en español de España, tuteando.
- Antes de commitear: `npm run build` sin errores.

Última actualización: 2026-11-26
