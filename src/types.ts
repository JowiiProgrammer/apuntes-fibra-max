// Modelo de contenido de los apuntes. Todo es JSON serializable para poder
// editarlo desde la app, exportarlo y, más adelante, guardarlo en una base de datos.

export type CalloutVariant = 'info' | 'tip' | 'warning' | 'danger'

/** Anotación dibujada sobre una captura. Coordenadas en % para que escale con la imagen. */
export type Annotation =
  | { kind: 'circle'; x: number; y: number; w: number; h: number; label?: string }
  | { kind: 'box'; x: number; y: number; w: number; h: number; label?: string }
  | { kind: 'arrow'; x1: number; y1: number; x2: number; y2: number; label?: string }
  | { kind: 'marker'; x: number; y: number; n: number }

export type Block =
  | { id: string; type: 'text'; md: string }
  | { id: string; type: 'callout'; variant: CalloutVariant; title?: string; md: string }
  | { id: string; type: 'speech'; title?: string; md: string }
  | { id: string; type: 'steps'; items: { title: string; md: string }[] }
  | { id: string; type: 'checklist'; title?: string; items: string[] }
  | { id: string; type: 'prices'; tableId: string }
  | { id: string; type: 'screenshot'; src: string; alt: string; caption?: string; annotations: Annotation[] }
  | { id: string; type: 'pending'; note?: string }

export type BlockType = Block['type']

export interface Section {
  id: string
  title: string
  /** Texto corto bajo el título (ej. "Empezar speech preguntando horario de entrenamiento"). */
  lead?: string
  blocks: Block[]
  children: Section[]
  /** Solo en capítulos (nivel 1): agrupa capítulos en la barra lateral. */
  group?: string
  updatedAt?: string
}

export interface PriceColumn {
  key: string
  label: string
  /** Meses que cubre el pago (3, 6, 12…). Si es >1 se muestra el equivalente €/mes. */
  months?: number
}

export interface PriceRow {
  id: string
  label: string
  note?: string
  /** Centros donde se vende (ej. "Todos", "Cabrera"). */
  centros?: string
  /** Lleva matrícula al darse de alta. */
  matricula?: boolean
  /** Precio marcado como "Pendiente revisar" en el catálogo. */
  review?: boolean
  /** null = precio pendiente de rellenar · clave ausente = no existe esa modalidad ("—"). */
  values: Record<string, number | null>
}

export interface PriceTable {
  id: string
  title: string
  columns: PriceColumn[]
  rows: PriceRow[]
  footnote?: string
  updatedAt?: string
}

export interface Apuntes {
  version: number
  title: string
  sections: Section[]
  priceTables: PriceTable[]
}
