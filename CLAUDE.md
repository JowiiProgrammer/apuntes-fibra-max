# Apuntes Fibra Max — guía para Claude

Web de apuntes internos para recepción de Fibra Max (proyecto personal de Joel).
Vite + React 19 + TypeScript, sin backend. Ver `docs/blueprint.md` para PRD y plan.

## Reglas
- El contenido vive en `src/content/apuntes.json` (modelo en `src/types.ts`). Para añadir
  contenido que Joel dicta, edita ese JSON: reemplaza el bloque `pending` del apartado por
  bloques reales (`text`, `steps`, `callout`, `speech`, `checklist`, `prices`, `screenshot`).
- Sube `version` en el JSON cuando publiques contenido nuevo: así quien tenga cambios locales
  ve el aviso de que hay versión nueva.
- Precios: nunca inventar. Lo que no se sabe va como `null` (se muestra "Pendiente").
- Las tablas de precios están en `priceTables` y se referencian por `tableId`; una tabla puede
  aparecer en varios apartados. En `values`: `null` = pendiente, clave ausente = esa forma de
  pago no existe ("—"). Columnas con `months` muestran el equivalente €/mes. Filas con
  `centros`, `matricula` y `review` (pendiente revisar).
- Fuente de las tarifas: catálogo de tarifas del Cuadro de mando (capturas de Joel).
- Capturas en `public/capturas/`, anotaciones en % (x, y, w, h) sobre la imagen. Antes de subir
  una captura, borra datos personales (nombres de clientes, IBAN…): la web es pública.
- Los bloques `steps` tienen `start` para continuar la numeración tras una captura.
- Logo: `public/logo-fibra.png` (oficial, blanco sobre transparente), favicon en `public/`.
- Marca: tokens en `:root` de `src/styles.css` (negro `--side`, rojo `--red`, crema `--bg`,
  Montserrat). Mismo lenguaje visual que el Cuadro de mando de Fibra Max.
- Texto de UI y contenido en español de España, tuteando.
- Antes de commitear: `npm run build` sin errores.

Última actualización: 2026-10-08
