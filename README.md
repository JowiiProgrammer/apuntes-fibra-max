# Apuntes de Recepción · Fibra Max

Web interna con los apuntes de recepción de Fibra Max: cuotas y tarifas, altas y bajas,
caja, pedidos de suplementación, tareas por turno y situaciones extraordinarias.

- **Buscador** (`Ctrl+K` o `/`): resalta todas las coincidencias, ignora tildes y mayúsculas,
  y salta entre resultados con `Enter` / `Shift+Enter`.
- **Modo edición**: editar títulos, textos, pasos, checklists, tablas de precios y capturas
  con anotaciones (círculo, recuadro, flecha, número), añadir/mover/borrar apartados.
- **Imprimir / PDF** desde el icono de impresora.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # comprueba tipos y genera dist/
```

## Dónde vive el contenido

Todo el contenido está en [`src/content/apuntes.json`](src/content/apuntes.json).

Los cambios hechos en *Modo edición* se guardan **solo en el navegador** donde se hacen.
Para publicarlos: *Modo edición → Exportar* y sustituir `src/content/apuntes.json` por el
archivo descargado (o pedírselo a Claude). Las capturas definitivas van en `public/capturas/`
y se referencian como `/capturas/nombre.png`.

`scripts/seed-estructura.mjs` regenera la estructura inicial del índice (sobrescribe el JSON).
