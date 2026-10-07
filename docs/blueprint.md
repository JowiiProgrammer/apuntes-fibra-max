# Blueprint — Apuntes de Recepción Fibra Max

## PRD
**Qué es:** sustituto web del documento de apuntes de recepción (antes en Google Docs).

**Para quién:** personal de recepción de Fibra Max (consulta rápida durante el turno) y Joel (mantenimiento).

**Funcionalidades**
1. Índice navegable: capítulos agrupados (Comercial, Abonados, Operativa, Caja, Turnos, Incidencias) con numeración automática.
2. Buscador en página: resalta coincidencias, sin tildes/mayúsculas, lista de resultados por apartado, navegación anterior/siguiente.
3. Bloques de contenido: texto, aviso (info/consejo/atención/importante), guion de speech, pasos numerados, checklist, tabla de precios, captura anotada, pendiente.
4. Tablas de precios editables y reutilizables (cuotas, tarifas de pago anticipado, entradas, bonos, otros importes).
5. Capturas con anotaciones dibujadas encima (círculo, recuadro, flecha, número + texto), ampliables.
6. Modo edición completo con guardado local y exportar/importar JSON.
7. Responsive (móvil/tablet de recepción) e impresión a PDF.

**Fuera de alcance (v1):** login, guardado compartido entre dispositivos, historial de versiones.

## Decisiones técnicas
- **Web y no Google Docs:** buscador con resaltado propio, precios como datos (un cambio se refleja en todas partes), capturas anotadas no destructivas y diseño de marca.
- **Vite + React + TS, sin backend:** contenido en un JSON versionado en git. Barato, rápido y sin datos personales.
- **CSS Custom Highlight API** para el resaltado: no muta el DOM que controla React.
- **react-markdown** para textos: no ejecuta HTML, seguro con contenido editado.
- Referencias de patrón: Starlight (asides, steps, sidebar+búsqueda), VitePress (búsqueda local), Docusaurus (admonitions).

## Plan
1. ✅ Estructura del índice + diseño de marca + buscador + modo edición + capturas anotadas.
2. Rellenar contenido apartado por apartado (Joel dicta → Claude redacta en el JSON).
3. Subir capturas reales a `public/capturas/` y anotarlas.
4. Desplegar (Vercel) con URL privada para recepción.
5. Opcional: guardado compartido (Supabase) para editar desde cualquier PC sin exportar.
