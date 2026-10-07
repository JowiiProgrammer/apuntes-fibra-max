// Genera src/content/apuntes.json con la estructura inicial del índice.
// Solo se usa una vez (o para resetear la estructura); después el JSON se edita
// desde la app (Modo edición → Exportar) o a mano.
import { writeFileSync } from 'node:fs'

const pending = (id) => [{ id: `${id}-pendiente`, type: 'pending' }]
const leaf = (id, title, extra = {}) => ({ id, title, blocks: extra.blocks ?? pending(id), children: [], ...extra })
const chapter = (group, id, title, children = [], extra = {}) => ({
  id, title, group, blocks: extra.blocks ?? (children.length ? [] : pending(id)), children, ...extra,
})
const prices = (tableId) => ({ id: `precios-${tableId}`, type: 'prices', tableId })

const horarios = [
  ['h-6-17', 'Horario 6–17h, fines de semana (9–21h) y festivos'],
  ['h-6-23', 'Horario 6–23h, fines de semana (9–21h) y festivos'],
  ['h-finde', 'Fines de semana (9–21h) y festivos'],
]

const data = {
  version: 1,
  title: 'Apuntes de Recepción',
  sections: [
    chapter('Comercial', 'cuotas', 'Cuotas Fibra Max', [
      ...horarios.map(([id, t]) => leaf(`cuota-${id}`, t)),
      leaf('entradas-puntuales', 'Entradas puntuales', { blocks: [prices('entradas'), ...pending('entradas-puntuales')] }),
      leaf('bonos', 'Bonos', { blocks: [prices('bonos'), ...pending('bonos')] }),
      leaf('convenios-granollers', 'Convenios empresas – Granollers'),
    ], {
      lead: 'Empieza siempre el speech preguntando el horario de entrenamiento.',
      blocks: [
        { id: 'cuotas-speech', type: 'speech', title: 'Cómo arrancar', md: '«¿En qué horario sueles entrenar?» — con la respuesta eliges la cuota que encaja y presentas solo esa.' },
        prices('cuotas'),
      ],
    }),
    chapter('Comercial', 'tarifas', 'Tarifas', [], {
      lead: 'Formas de pago anticipado de cada cuota.',
      blocks: [prices('tarifas'), ...pending('tarifas')],
    }),
    chapter('Abonados', 'altas', 'Altas', [leaf('altas-normales', 'Altas normales'), leaf('altas-web', 'Altas web')]),
    chapter('Abonados', 'bajas', 'Bajas', [
      leaf('bajas-anunciadas', 'Bajas anunciadas'),
      leaf('bajas-directas', 'Bajas directas (recibos devueltos)'),
      leaf('baja-medica', 'Baja médica (pausar)'),
    ]),
    chapter('Abonados', 'cambio-cuota', 'Cambio de cuota'),
    chapter('Abonados', 'cuota-mantenimiento', 'Cuota de mantenimiento', [], {
      blocks: [prices('otros'), ...pending('cuota-mantenimiento')],
    }),
    chapter('Operativa', 'aforo', 'Aforo'),
    chapter('Operativa', 'stock', 'Stock'),
    chapter('Operativa', 'pedido-suplementacion', 'Hacer pedido de suplementación', [leaf('pedido-big', 'BIG'), leaf('pedido-life-pro', 'Life Pro')]),
    chapter('Caja', 'entrada-cambio', 'Traen / entrada de cambio o dinero'),
    chapter('Caja', 'salida-dinero', 'Salida de dinero'),
    chapter('Caja', 'facturacion', 'Facturación', [leaf('apertura', 'Apertura'), leaf('arqueo', 'Arqueo'), leaf('cierre', 'Cierre')]),
    chapter('Turnos', 'tareas', 'Tareas según turno o calendario', [
      leaf('calendario', 'Calendario', { blocks: [
        { id: 'cal-1-15', type: 'checklist', title: 'Del 1 al 15', items: [] },
        { id: 'cal-15-25', type: 'checklist', title: 'Del 15 al 25', items: [] },
        { id: 'cal-25-fin', type: 'checklist', title: 'Del 25 a final de mes', items: [] },
        ...pending('calendario'),
      ] }),
      leaf('turno-mananas', 'Mañanas', { blocks: [{ id: 'mananas-check', type: 'checklist', title: 'Turno de mañana', items: [] }, ...pending('turno-mananas')] }),
      leaf('turno-tardes', 'Tardes', { blocks: [{ id: 'tardes-check', type: 'checklist', title: 'Turno de tarde', items: [] }, ...pending('turno-tardes')] }),
    ]),
    chapter('Incidencias', 'extraordinarias', 'Situaciones extraordinarias', [
      leaf('problema-pedido', 'Problema con pedido de suplementación'),
      leaf('pago-pendientes', 'Abonado viene a pagar pendientes (recibos devueltos)'),
      leaf('excel-cambios', 'Excel de cambios'),
    ]),
  ],
  priceTables: [
    {
      id: 'cuotas', title: 'Cuotas mensuales',
      columns: [{ key: 'mensual', label: 'Mensual' }],
      rows: horarios.map(([id, t]) => ({ id, label: t, values: { mensual: null } })),
      footnote: 'Precios por mes, IVA incluido.',
    },
    {
      id: 'tarifas', title: 'Pago anticipado',
      columns: [{ key: 'trimestral', label: 'Trimestral' }, { key: 'semestral', label: 'Semestral' }, { key: 'anual', label: 'Anual' }],
      rows: horarios.map(([id, t]) => ({ id, label: t, values: { trimestral: null, semestral: null, anual: null } })),
      footnote: 'Importe total a cobrar por el periodo.',
    },
    {
      id: 'entradas', title: 'Entradas puntuales',
      columns: [{ key: 'precio', label: 'Precio' }],
      rows: [{ id: 'entrada-dia', label: 'Entrada de un día', values: { precio: null } }],
    },
    {
      id: 'bonos', title: 'Bonos',
      columns: [{ key: 'precio', label: 'Precio' }],
      rows: [{ id: 'bono-1', label: 'Bono (nombre pendiente)', values: { precio: null } }],
    },
    {
      id: 'otros', title: 'Otros importes',
      columns: [{ key: 'precio', label: 'Precio' }],
      rows: [
        { id: 'matricula', label: 'Matrícula', values: { precio: 50 } },
        { id: 'mantenimiento', label: 'Cuota de mantenimiento', values: { precio: null } },
      ],
    },
  ],
}

writeFileSync(new URL('../src/content/apuntes.json', import.meta.url), JSON.stringify(data, null, 2) + '\n')
console.log('apuntes.json generado')
