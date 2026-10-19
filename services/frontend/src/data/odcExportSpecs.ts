/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ODCParameterSpec {
  name: string;
  dataType: string;
  isMandatory: boolean;
  defaultValue?: string;
  description: string;
}

export interface ODCEventSpec {
  name: string;
  description: string;
  parameters: { name: string; dataType: string; description: string }[];
}

export interface ODCActionSpec {
  name: string;
  trigger: string;
  flowSteps: string[];
  jsSnippet?: string;
}

export interface ODCComponentSpec {
  id: string;
  name: string;
  odcBlockName: string;
  category: 'Input' | 'Navigation' | 'Display' | 'Feedback' | 'Structure';
  description: string;
  summary: string;
  inputs: ODCParameterSpec[];
  outputs: ODCEventSpec[];
  localVariables: ODCParameterSpec[];
  widgetTree: string;
  css: string;
  clientActions: ODCActionSpec[];
  reactSourceSnippet: string;
}

export const ODC_COMPONENTS_SPECS: Record<string, ODCComponentSpec> = {
  'ODCDateRangePicker': {
    id: 'ODCDateRangePicker',
    name: 'Selector de Fechas con Seguridad',
    odcBlockName: 'Flyway_DateRangePicker_Safe',
    category: 'Input',
    description: 'Bloque de selector de rango de fechas para OutSystems ODC. Implementa seguridad de negocio: la fecha de ida no puede ser en el pasado y la fecha de vuelta nunca puede ser anterior a la ida seleccionada.',
    summary: 'Rango de fechas con calendario visual y validaciones cruzadas nativas en tiempo real.',
    inputs: [
      { name: 'StartDate', dataType: 'Date', isMandatory: true, defaultValue: 'CurrDate()', description: 'Fecha de inicio (Ida). Mínimo permitido: hoy.' },
      { name: 'EndDate', dataType: 'Date', isMandatory: true, defaultValue: 'AddDays(CurrDate(), 1)', description: 'Fecha de fin (Vuelta). No puede ser menor a StartDate.' },
      { name: 'MinDate', dataType: 'Date', isMandatory: false, defaultValue: 'CurrDate()', description: 'Fecha mínima absoluta permitida para la Ida.' },
      { name: 'LabelStart', dataType: 'Text', isMandatory: false, defaultValue: '"Ida"', description: 'Etiqueta para el campo de Ida.' },
      { name: 'LabelEnd', dataType: 'Text', isMandatory: false, defaultValue: '"Vuelta"', description: 'Etiqueta para el campo de Vuelta.' },
      { name: 'ErrorMessage', dataType: 'Text', isMandatory: false, defaultValue: '""', description: 'Mensaje de error de validación de OutSystems UI.' },
    ],
    outputs: [
      {
        name: 'OnRangeChanged',
        description: 'Se dispara cuando el usuario confirma o modifica una fecha válida.',
        parameters: [
          { name: 'NewStartDate', dataType: 'Date', description: 'Nueva fecha de ida' },
          { name: 'NewEndDate', dataType: 'Date', description: 'Nueva fecha de vuelta' },
          { name: 'FormattedRange', dataType: 'Text', description: 'Texto formateado "15 Ene 2026 - 16 Ene 2026"' },
        ],
      },
    ],
    localVariables: [
      { name: 'IsCalendarOpen', dataType: 'Boolean', isMandatory: false, defaultValue: 'False', description: 'Controla la visibilidad del popup/calendario flotante.' },
      { name: 'ActivePickingTab', dataType: 'Text', isMandatory: false, defaultValue: '"start"', description: '"start" o "end" según la fecha activa a elegir.' },
      { name: 'SecurityNoticeText', dataType: 'Text', isMandatory: false, defaultValue: '""', description: 'Mensaje explicativo cuando se aplica ajuste automático.' },
    ],
    widgetTree: `[Block: Flyway_DateRangePicker_Safe]
└── Container (Class: "w-full relative")
    ├── Container (Class: "fw-row-2")
    │   ├── Container (Class: "form-group")
    │   │   ├── Label (Target: Input_StartDate, Text: LabelStart)
    │   │   └── Container (Class: "relative flex items-center")
    │   │       ├── Input (Name: Input_StartDate, Variable: StartDate, InputType: Date, Min: MinDate)
    │   │       │   └── Event: OnChange -> Action: StartDate_OnChange
    │   │       └── Link / Icon (Icon: Calendar, OnClick: OpenCalendarStart)
    │   └── Container (Class: "form-group")
    │       ├── Label (Target: Input_EndDate, Text: LabelEnd)
    │       └── Container (Class: "relative flex items-center")
    │           ├── Input (Name: Input_EndDate, Variable: EndDate, InputType: Date, Min: StartDate)
    │           │   └── Event: OnChange -> Action: EndDate_OnChange
    │           └── Link / Icon (Icon: Calendar, OnClick: OpenCalendarEnd)
    ├── If (Condition: SecurityNoticeText <> "")
    │   └── True: Container (Class: "fw-security-banner")
    │       ├── Icon (Name: AlertCircle)
    │       └── Expression (Value: SecurityNoticeText)
    └── If (Condition: IsCalendarOpen)
        └── True: Container (Class: "fw-calendar-popup")
            ├── Container (Class: "fw-calendar-tabs")
            ├── Container (Class: "fw-calendar-grid")
            └── Button (Text: "Confirmar Fechas", OnClick: CloseCalendar)`,
    css: `/* === OutSystems ODC Block: Flyway_DateRangePicker_Safe === */
.fw-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 480px) {
  .fw-row-2 {
    grid-template-columns: 1fr;
  }
}

.fw-security-banner {
  margin-top: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  background-color: #FAF0DC;
  border: 1px solid rgba(139, 111, 62, 0.3);
  color: #8B6F3E;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.fw-calendar-popup {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 50;
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(30, 31, 25, 0.12);
  border: 1px solid #E5DED0;
  padding: 16px;
  margin-top: 8px;
}

.fw-calendar-day {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.fw-calendar-day.is-selected {
  background-color: #4A7C59;
  color: #FFFFFF;
  font-weight: bold;
}

.fw-calendar-day.is-in-range {
  background-color: #E1F2E2;
  color: #366447;
}

.fw-calendar-day:disabled,
.fw-calendar-day.is-disabled {
  opacity: 0.35;
  text-decoration: line-through;
  cursor: not-allowed;
}`,
    clientActions: [
      {
        name: 'StartDate_OnChange',
        trigger: 'Disparada cuando el usuario modifica la fecha de Ida',
        flowSteps: [
          '1. Verificar si NewStart < MinDate -> Asignar NewStart = MinDate',
          '2. Si NewStart > EndDate:',
          '   - Asignar EndDate = AddDays(NewStart, 1)',
          '   - Asignar SecurityNoticeText = "Fecha de vuelta ajustada al día siguiente"',
          '3. Trigger Event: OnRangeChanged(StartDate, EndDate)',
        ],
        jsSnippet: `// OutSystems Client Action JS Node
if ($parameters.NewStart < $parameters.MinDate) {
  $parameters.ValidStart = $parameters.MinDate;
} else {
  $parameters.ValidStart = $parameters.NewStart;
}

if ($parameters.ValidStart > $parameters.CurrentEnd) {
  // Ajuste automático por seguridad
  $parameters.AdjustedEnd = new Date(new Date($parameters.ValidStart).getTime() + 86400000).toISOString().split('T')[0];
  $parameters.Notice = "Seguridad aplicada: La vuelta se ajustó para ser posterior a la ida.";
} else {
  $parameters.AdjustedEnd = $parameters.CurrentEnd;
  $parameters.Notice = "";
}`,
      },
      {
        name: 'EndDate_OnChange',
        trigger: 'Disparada cuando el usuario modifica la fecha de Vuelta',
        flowSteps: [
          '1. Si NewEnd < StartDate:',
          '   - Impedir asignación anterior y forzar NewEnd = StartDate',
          '   - Mostrar FeedbackMessage (Warning): "La vuelta no puede ser anterior a la ida"',
          '2. Trigger Event: OnRangeChanged(StartDate, EndDate)',
        ],
      },
    ],
    reactSourceSnippet: `<ODCDateRangePicker
  id="explore-date-picker"
  startDate={startDate}
  endDate={endDate}
  minDate={getTodayISO()}
  onChange={({ startDate: s, endDate: e }) => {
    setStartDate(s);
    setEndDate(e);
  }}
/>`,
  },

  'ODCButton': {
    id: 'ODCButton',
    name: 'Botón Estilizado Flyway',
    odcBlockName: 'Flyway_Button',
    category: 'Input',
    description: 'Bloque de botón configurable con variantes de estilo OutSystems UI (Primario, Esquema, Fantasma, Peligro) con estados de carga e icono.',
    summary: 'Botón con tokens de diseño Flyway y variantes visuales.',
    inputs: [
      { name: 'Label', dataType: 'Text', isMandatory: true, defaultValue: '"Continuar"', description: 'Texto del botón.' },
      { name: 'Variant', dataType: 'Text', isMandatory: false, defaultValue: '"primary"', description: '"primary" | "outline" | "ghost" | "danger"' },
      { name: 'IsDisabled', dataType: 'Boolean', isMandatory: false, defaultValue: 'False', description: 'Deshabilita el botón.' },
      { name: 'IsLoading', dataType: 'Boolean', isMandatory: false, defaultValue: 'False', description: 'Muestra indicador de progreso.' },
      { name: 'IconClass', dataType: 'Text', isMandatory: false, defaultValue: '""', description: 'Clase de icono de OutSystems UI (ej. "icon-arrow-right").' },
    ],
    outputs: [
      {
        name: 'OnClick',
        description: 'Disparado al hacer clic en el botón.',
        parameters: [],
      },
    ],
    localVariables: [],
    widgetTree: `[Block: Flyway_Button]
└── Button (Class: "btn " + GetVariantClass(Variant), Enabled: not IsDisabled and not IsLoading)
    ├── Event: OnClick -> Trigger Event OnClick
    ├── If (Condition: IsLoading)
    │   └── True: Icon (Class: "icon-spinner animate-spin")
    ├── If (Condition: IconClass <> "" and not IsLoading)
    │   └── True: Icon (Class: IconClass)
    └── Expression (Value: Label)`,
    css: `/* === OutSystems ODC Block: Flyway_Button === */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 15px;
  padding: 12px 24px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  border: 1px solid transparent;
}

.btn-primary {
  background-color: #4A7C59;
  color: #FFFFFF;
}
.btn-primary:hover {
  background-color: #366447;
}

.fw-btn-outline {
  background-color: transparent;
  border-color: #4A7C59;
  color: #4A7C59;
}
.fw-btn-outline:hover {
  background-color: #E1F2E2;
}

.fw-btn-ghost {
  background-color: transparent;
  color: #6B6A63;
}
.fw-btn-ghost:hover {
  background-color: #F1ECE2;
  color: #1E1F19;
}

.fw-btn-danger {
  background-color: #B3413A;
  color: #FFFFFF;
}
.fw-btn-danger:hover {
  background-color: #8C2F29;
}`,
    clientActions: [
      {
        name: 'Button_OnClick',
        trigger: 'Click del usuario',
        flowSteps: ['Verificar not IsLoading', 'Disparar Evento OnClick'],
      },
    ],
    reactSourceSnippet: `<ODCButton variant="primary" onClick={handleAction}>
  Continuar
</ODCButton>`,
  },

  'ODCInput': {
    id: 'ODCInput',
    name: 'Campo de Texto con Validación',
    odcBlockName: 'Flyway_Input',
    category: 'Input',
    description: 'Control de entrada de formulario con soporte de validación OutSystems (.not-valid) y visualización de mensaje de error integrado (.fw-field-error).',
    summary: 'Input estilizado con bordes redondeados y soporte de mensajes de error.',
    inputs: [
      { name: 'Label', dataType: 'Text', isMandatory: false, defaultValue: '""', description: 'Etiqueta sobre el campo.' },
      { name: 'Value', dataType: 'Text', isMandatory: true, defaultValue: '""', description: 'Valor del campo.' },
      { name: 'Placeholder', dataType: 'Text', isMandatory: false, defaultValue: '""', description: 'Texto de ayuda.' },
      { name: 'ErrorMessage', dataType: 'Text', isMandatory: false, defaultValue: '""', description: 'Mensaje de error si la validación falla.' },
    ],
    outputs: [
      {
        name: 'OnChange',
        description: 'Disparado al escribir.',
        parameters: [{ name: 'NewValue', dataType: 'Text', description: 'Texto ingresado' }],
      },
    ],
    localVariables: [],
    widgetTree: `[Block: Flyway_Input]
└── Container (Class: "form-group")
    ├── If (Condition: Label <> "")
    │   └── True: Label (Text: Label)
    ├── Input (Variable: Value, Class: "form-control " + If(ErrorMessage <> "", "not-valid", ""))
    │   └── Event: OnChange -> Trigger Event OnChange(Value)
    └── If (Condition: ErrorMessage <> "")
        └── True: Container (Class: "fw-field-error")
            └── Expression (Value: ErrorMessage)`,
    css: `/* === OutSystems ODC Block: Flyway_Input === */
.form-control {
  background: #FFFFFA;
  border: 1px solid #E5DED0;
  border-radius: 16px;
  min-height: 48px;
  padding: 0 16px;
  font-size: 15px;
  color: #1E1F19;
  width: 100%;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.form-control:focus {
  outline: none;
  border-color: #4A7C59;
  box-shadow: 0 0 0 3px #E1F2E2;
}

.form-control.not-valid {
  border-color: #B3413A;
}

.fw-field-error {
  color: #B3413A;
  font-size: 12px;
  margin-top: 4px;
}`,
    clientActions: [],
    reactSourceSnippet: `<ODCInput
  label="Destino"
  value={destination}
  onChange={(e) => setDestination(e.target.value)}
  error={destError}
/>`,
  },

  'ODCSegmentedControl': {
    id: 'ODCSegmentedControl',
    name: 'Presupuesto Segmentado',
    odcBlockName: 'Flyway_SegmentedControl',
    category: 'Input',
    description: 'Control tipo ButtonGroup para seleccionar niveles de presupuesto (Económico, Estándar, Premium) con deslizador suave de fondo.',
    summary: 'Selector segmentado accesible con indicador activo.',
    inputs: [
      { name: 'SelectedValue', dataType: 'Text', isMandatory: true, defaultValue: '"standard"', description: 'Identificador del valor seleccionado.' },
      { name: 'OptionsList', dataType: 'List of OptionRecord', isMandatory: true, defaultValue: '[]', description: 'Lista con Id y Label.' },
    ],
    outputs: [
      {
        name: 'OnSelect',
        description: 'Disparado cuando el usuario hace clic en una opción.',
        parameters: [{ name: 'SelectedId', dataType: 'Text', description: 'Id de la opción' }],
      },
    ],
    localVariables: [],
    widgetTree: `[Block: Flyway_SegmentedControl]
└── Container (Class: "fw-segmented")
    └── List (SourceRecordList: OptionsList)
        └── Button / Link (Class: "fw-segmented__item " + If(Option.Id = SelectedValue, "is-active", ""))
            └── Expression (Value: Option.Label)`,
    css: `/* === OutSystems ODC Block: Flyway_SegmentedControl === */
.fw-segmented {
  display: flex;
  background: #F1ECE2;
  padding: 4px;
  border-radius: 999px;
  gap: 4px;
}

.fw-segmented__item {
  flex: 1;
  text-align: center;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 999px;
  color: #6B6A63;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
  background: transparent;
}

.fw-segmented__item.is-active {
  background: #FFFFFF;
  color: #1E1F19;
  box-shadow: 0 2px 8px rgba(30, 31, 25, 0.08);
}`,
    clientActions: [],
    reactSourceSnippet: `<ODCSegmentedControl
  options={budgetOptions}
  value={budget}
  onChange={(val) => setBudget(val)}
/>`,
  },

  'ODCChipGroup': {
    id: 'ODCChipGroup',
    name: 'Chips de Intereses Multiselección',
    odcBlockName: 'Flyway_ChipGroup',
    category: 'Input',
    description: 'Lista de etiquetas clicables para seleccionar múltiples categorías de intereses con estilo redondeado y color activo Flyway (--fw-chip-active: #80AB8D).',
    summary: 'Chips con icono y texto para filtrado o preferencias.',
    inputs: [
      { name: 'ChipsList', dataType: 'List of ChipRecord', isMandatory: true, defaultValue: '[]', description: 'Id, Label, Icon.' },
      { name: 'SelectedIds', dataType: 'Text (Comma separated or List)', isMandatory: true, defaultValue: '""', description: 'Ids actualmente activos.' },
    ],
    outputs: [
      {
        name: 'OnToggleChip',
        description: 'Disparado al pulsar un chip.',
        parameters: [{ name: 'ChipId', dataType: 'Text', description: 'Id del chip pulsado' }],
      },
    ],
    localVariables: [],
    widgetTree: `[Block: Flyway_ChipGroup]
└── Container (Class: "flex flex-wrap gap-2")
    └── List (SourceRecordList: ChipsList)
        └── Button / Container (Class: "fw-chip " + If(IsSelected, "is-active", ""))
            ├── Expression (Value: Chip.Icon)
            └── Expression (Value: Chip.Label)`,
    css: `/* === OutSystems ODC Block: Flyway_ChipGroup === */
.fw-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 999px;
  background: #F1ECE2;
  color: #1E1F19;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.fw-chip:hover {
  background: #E5DED0;
}

.fw-chip.is-active {
  background: #80AB8D;
  color: #FFFFFF;
  font-weight: 600;
}`,
    clientActions: [],
    reactSourceSnippet: `<ODCChipGroup
  chips={DEFAULT_INTERESTS}
  selectedIds={selectedInterests}
  onToggle={(id) => handleToggle(id)}
/>`,
  },

  'ODCActivityCard': {
    id: 'ODCActivityCard',
    name: 'Tarjeta de Actividad (Itinerario)',
    odcBlockName: 'Flyway_ActivityCard',
    category: 'Display',
    description: 'Tarjeta de la línea de tiempo del itinerario con punto indicador vertical, badge de horario, foto descriptiva, precio y menú de opciones.',
    summary: 'Tarjeta de actividad con línea de tiempo y menú kebab.',
    inputs: [
      { name: 'ActivityRecord', dataType: 'ActivityRecord', isMandatory: true, defaultValue: '', description: 'Estructura con Titulo, Horario, Precio, Imagen, etc.' },
      { name: 'IsFirst', dataType: 'Boolean', isMandatory: false, defaultValue: 'False', description: 'Para renderizar el conector vertical.' },
    ],
    outputs: [
      { name: 'OnCardClick', description: 'Abre el detalle de la actividad', parameters: [{ name: 'ActivityId', dataType: 'Text', description: 'Id' }] },
      { name: 'OnMenuClick', description: 'Abre el menú de opciones (cambiar/eliminar)', parameters: [{ name: 'ActivityId', dataType: 'Text', description: 'Id' }] },
    ],
    localVariables: [],
    widgetTree: `[Block: Flyway_ActivityCard]
└── Container (Class: "fw-activity-wrapper")
    ├── Container (Class: "fw-timeline__dot")
    └── Container (Class: "fw-activity-card")
        ├── Image (Source: ActivityRecord.ImageUrl)
        ├── Container (Class: "fw-activity-body")
        │   ├── Container (Class: "flex justify-between items-start")
        │   │   ├── Expression (Value: ActivityRecord.TimeRange, Class: "fw-badge")
        │   │   └── Link / Icon (Icon: MoreVertical, OnClick: Trigger OnMenuClick)
        │   ├── Expression (Value: ActivityRecord.Title, Class: "font-bold text-sm")
        │   └── Expression (Value: ActivityRecord.CostText, Class: "fw-cost")`,
    css: `/* === OutSystems ODC Block: Flyway_ActivityCard === */
.fw-activity-card {
  display: flex;
  background: #FFFFFF;
  border-radius: 16px;
  border: 1px solid #E5DED0;
  box-shadow: 0 4px 12px rgba(30, 31, 25, 0.04);
  overflow: hidden;
  margin-bottom: 12px;
}

.fw-timeline__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4A7C59;
  margin-top: 14px;
}`,
    clientActions: [],
    reactSourceSnippet: `<ODCActivityCard
  activity={act}
  onOpenDetail={() => setSelectedActivity(act)}
  onOpenMenu={() => setMenuActivity(act)}
/>`,
  },

  'ODCTripCard': {
    id: 'ODCTripCard',
    name: 'Tarjeta de Ruta Guardada',
    odcBlockName: 'Flyway_TripCard',
    category: 'Display',
    description: 'Tarjeta para mostrar rutas guardadas en la biblioteca con badge de temporada, botón favorito toggleable y botón Ver Itinerario.',
    summary: 'Tarjeta de viaje con imagen de portada, presupuesto y favorito.',
    inputs: [
      { name: 'TripRecord', dataType: 'TripRecord', isMandatory: true, defaultValue: '', description: 'Datos del viaje.' },
    ],
    outputs: [
      { name: 'OnViewTrip', description: 'Carga el itinerario', parameters: [{ name: 'TripId', dataType: 'Text', description: 'Id' }] },
      { name: 'OnToggleFavorite', description: 'Cambia estado de favorito', parameters: [{ name: 'TripId', dataType: 'Text', description: 'Id' }] },
    ],
    localVariables: [],
    widgetTree: `[Block: Flyway_TripCard]
└── Container (Class: "fw-card p-0 overflow-hidden")
    ├── Container (Class: "relative h-44")
    │   ├── Image (Source: TripRecord.CoverImage)
    │   ├── Container (Class: "fw-season", Text: TripRecord.Season)
    │   └── Button (Class: "fw-fav-btn", OnClick: OnToggleFavorite)
    └── Container (Class: "p-4")
        ├── Expression (Value: TripRecord.Destination, Class: "text-lg font-bold")
        ├── Expression (Value: TripRecord.DatesText)
        └── Button (Text: "Ver Itinerario", OnClick: OnViewTrip)`,
    css: `/* === OutSystems ODC Block: Flyway_TripCard === */
.fw-season {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(30, 31, 25, 0.7);
  color: #FFFFFF;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
}`,
    clientActions: [],
    reactSourceSnippet: `<ODCTripCard
  trip={t}
  onViewTrip={() => handleView(t)}
  onToggleFavorite={() => handleFav(t.id)}
/>`,
  },

  'ODCBottomSheet': {
    id: 'ODCBottomSheet',
    name: 'Hoja Inferior Desplegable',
    odcBlockName: 'Flyway_BottomSheet',
    category: 'Feedback',
    description: 'Patrón Popup de OutSystems UI configurado con clase fw-sheet para deslizarse desde la parte inferior de la pantalla en móvil y tablet.',
    summary: 'Popup modal tipo bottom sheet con tirador y backdrop.',
    inputs: [
      { name: 'IsOpen', dataType: 'Boolean', isMandatory: true, defaultValue: 'False', description: 'Visibilidad del sheet.' },
      { name: 'Title', dataType: 'Text', isMandatory: false, defaultValue: '""', description: 'Título del encabezado.' },
    ],
    outputs: [
      { name: 'OnClose', description: 'Disparado al hacer clic en el backdrop o cruz', parameters: [] },
    ],
    localVariables: [],
    widgetTree: `[Block: Flyway_BottomSheet]
└── If (Condition: IsOpen)
    └── True: Container (Class: "fw-backdrop", OnClick: Trigger OnClose)
        └── Container (Class: "fw-sheet")
            ├── Container (Class: "fw-sheet__handle")
            ├── Container (Class: "flex justify-between items-center")
            │   ├── Expression (Value: Title, Class: "font-bold text-lg")
            │   └── Link / Icon (Icon: Close, OnClick: Trigger OnClose)
            └── Placeholder: SheetContent`,
    css: `/* === OutSystems ODC Block: Flyway_BottomSheet === */
.fw-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(30, 31, 25, 0.45);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.fw-sheet {
  background: #FFFFFF;
  width: 100%;
  max-width: 600px;
  border-radius: 24px 24px 0 0;
  padding: 20px;
  max-height: 85vh;
  overflow-y: auto;
  animation: slideUp 0.25s ease-out;
}

.fw-sheet__handle {
  width: 40px;
  height: 4px;
  background: #E5DED0;
  border-radius: 999px;
  margin: 0 auto 16px;
}`,
    clientActions: [],
    reactSourceSnippet: `<ODCBottomSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Detalle de Actividad"
>
  <div>Contenido...</div>
</ODCBottomSheet>`,
  },

  'ODCLoadingOverlay': {
    id: 'ODCLoadingOverlay',
    name: 'Overlay de Carga con Spinner',
    odcBlockName: 'Flyway_LoadingOverlay',
    category: 'Feedback',
    description: 'Bloque de pantalla completa o contenedor para mostrar progreso durante acciones asíncronas como la generación del itinerario.',
    summary: 'Overlay con animación y mensajes descriptivos.',
    inputs: [
      { name: 'IsLoading', dataType: 'Boolean', isMandatory: true, defaultValue: 'False', description: 'Visibilidad' },
      { name: 'Title', dataType: 'Text', isMandatory: false, defaultValue: '"Creando tu ruta"', description: 'Título principal' },
      { name: 'Subtitle', dataType: 'Text', isMandatory: false, defaultValue: '"Ajustando a tu presupuesto…"', description: 'Subtítulo explicativo' },
    ],
    outputs: [],
    localVariables: [],
    widgetTree: `[Block: Flyway_LoadingOverlay]
└── If (Condition: IsLoading)
    └── True: Container (Class: "fw-loading-overlay")
        ├── Container (Class: "fw-spinner")
        ├── Expression (Value: Title, Class: "fw-title text-xl")
        └── Expression (Value: Subtitle, Class: "fw-muted text-sm")`,
    css: `/* === OutSystems ODC Block: Flyway_LoadingOverlay === */
.fw-loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(247, 244, 237, 0.92);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.fw-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #E1F2E2;
  border-top-color: #4A7C59;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}`,
    clientActions: [],
    reactSourceSnippet: `<ODCLoadingOverlay
  isLoading={isLoading}
  title="Creando tu ruta"
  subtitle="Ajustando a tu presupuesto…"
/>`,
  },

  'ODCBottomNav': {
    id: 'ODCBottomNav',
    name: 'Navegación Inferior Móvil',
    odcBlockName: 'Flyway_BottomNav',
    category: 'Navigation',
    description: 'Barra de navegación inferior fija para OutSystems Mobile / Reactive apps con 3 destinos (Explorar, Itinerario, Guardados) e indicador de badge.',
    summary: 'Barra fija inferior con indicador de pestaña activa y contador.',
    inputs: [
      { name: 'ActiveTab', dataType: 'Text', isMandatory: true, defaultValue: '"explore"', description: '"explore" | "itinerary" | "saved"' },
      { name: 'SavedCount', dataType: 'Integer', isMandatory: false, defaultValue: '0', description: 'Número de rutas guardadas' },
    ],
    outputs: [
      { name: 'OnTabChange', description: 'Disparado al pulsar una pestaña', parameters: [{ name: 'NewTab', dataType: 'Text', description: 'Pestaña seleccionada' }] },
    ],
    localVariables: [],
    widgetTree: `[Block: Flyway_BottomNav]
└── Container (Class: "fw-bottom-nav")
    ├── Link (Class: If(ActiveTab = "explore", "is-active", ""), OnClick: TabClick("explore"))
    ├── Link (Class: If(ActiveTab = "itinerary", "is-active", ""), OnClick: TabClick("itinerary"))
    └── Link (Class: If(ActiveTab = "saved", "is-active", ""), OnClick: TabClick("saved"))
        └── If (Condition: SavedCount > 0)
            └── True: Container (Class: "fw-badge-pill", Text: SavedCount)`,
    css: `/* === OutSystems ODC Block: Flyway_BottomNav === */
.fw-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 72px;
  background: #FFFFFF;
  border-top: 1px solid #E5DED0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 40;
}

.fw-bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 11px;
  color: #6B6A63;
  cursor: pointer;
}

.fw-bottom-nav__item.is-active {
  color: #4A7C59;
  font-weight: 700;
}`,
    clientActions: [],
    reactSourceSnippet: `<ODCBottomNav
  activeTab={activeScreen}
  onTabChange={(tab) => setActiveScreen(tab)}
  savedCount={savedTrips.length}
/>`,
  },
};

/**
 * Genera un prompt especializado para alimentar a la IA integrada de OutSystems (ODC AI Assistant / OutSystems Project Neo)
 * o a cualquier LLM para generar un bloque específico en Service Studio.
 */
export function generateSingleComponentAIPrompt(spec: ODCComponentSpec): string {
  return `### OUTSYSTEMS ODC GENERATIVE AI PROMPT: UI BLOCK CREATION

**ROLE & CONTEXT:**
Act as a Principal OutSystems ODC (One Developer Cloud) Solution Architect and OutSystems UI Expert.
Generate the specifications, widget structure, logic flows, and CSS for creating the following reusable UI Block in Service Studio for the "Flyway Itinerary Planner" design system.

---

### 1. BLOCK IDENTIFICATION
- **Block Name:** \`${spec.odcBlockName}\`
- **Component ID:** \`${spec.id}\`
- **Category:** ${spec.category}
- **Description:** ${spec.description}

---

### 2. PARAMETERS & STATE SPECIFICATION (Service Studio Data Tab)

#### A. Input Parameters:
${spec.inputs.map(i => `- **${i.name}** (Type: \`${i.dataType}\`, Mandatory: \`${i.isMandatory ? 'Yes' : 'No'}\`, Default: \`${i.defaultValue || 'N/A'}\`): ${i.description}`).join('\n')}

#### B. Output Events:
${spec.outputs.length > 0 ? spec.outputs.map(o => `- **${o.name}**: ${o.description}\n${o.parameters.map(p => `  * Parameter: **${p.name}** (Type: \`${p.dataType}\`): ${p.description}`).join('\n')}`).join('\n') : '- None'}

#### C. Local Variables:
${spec.localVariables.length > 0 ? spec.localVariables.map(v => `- **${v.name}** (Type: \`${v.dataType}\`, Default: \`${v.defaultValue || 'N/A'}\`): ${v.description}`).join('\n') : '- None'}

---

### 3. WIDGET TREE HIERARCHY (Service Studio Widget Tree Canvas)
Recreate the following widget hierarchy strictly using OutSystems UI pattern conventions:
\`\`\`
${spec.widgetTree}
\`\`\`

---

### 4. CLIENT ACTIONS & LOGIC FLOW (Service Studio Logic Tab)
${spec.clientActions.length > 0 ? spec.clientActions.map(a => `#### Action: \`${a.name}\`
- **Trigger:** ${a.trigger}
- **Logic Flow Steps:**
${a.flowSteps.map(s => `  ${s}`).join('\n')}
${a.jsSnippet ? `- **JavaScript Node Code:**\n\`\`\`javascript\n${a.jsSnippet}\n\`\`\`` : ''}`).join('\n\n') : '- Standard assignment logic: assign input values or trigger parent screen event on user interaction.'}

---

### 5. STYLE SHEET (Service Studio Block Style Sheet)
Add the following CSS rules into the Block's Style Sheet tab:
\`\`\`css
${spec.css}
\`\`\`

---

### 6. OUTSYSTEMS BEST PRACTICES INSTRUCTIONS:
1. Ensure all inputs have appropriate descriptions for Service Studio autocomplete.
2. If handling dates, use native built-in functions: \`CurrDate()\`, \`AddDays()\`, and \`FormatDateTime()\`.
3. Adhere to OutSystems UI WCAG AA accessibility contrast ratios.
4. If a field fails validation, set the widget property \`Valid = False\` and \`ValidationMessage = "Mensaje de error"\`.
5. Trigger the corresponding event using the \`TriggerEvent\` tool node in the Client Action.`;
}

/**
 * Genera el MASTER PROMPT para la IA integrada de OutSystems para construir la LIBRERÍA COMPLETA
 * de componentes y el tema del sistema de diseño Flyway en ODC.
 */
export function generateAllComponentsAIPrompt(specs: Record<string, ODCComponentSpec>): string {
  const componentList = Object.values(specs);

  return `### OUTSYSTEMS ODC ARCHITECT MASTER PROMPT: COMPLETE DESIGN SYSTEM & UI BLOCKS GENERATION

**ROLE & DIRECTIVE:**
You are the Lead OutSystems ODC Architect. Your goal is to scaffold the entire custom UI Foundation Module for the "Flyway Itinerary Planner" in OutSystems One Developer Cloud (ODC).
You will construct all 9 essential UI Blocks, declare their public contracts (Inputs, Outputs, Local Variables), implement Client Actions, and apply the cohesive Theme Style Sheet.

---

### 1. GLOBAL DESIGN SYSTEM TOKENS (ODC Theme Style Sheet)
Include these CSS Variables in the root Theme (\`FlywayTheme.css\`):
\`\`\`css
:root {
  --color-primary: #4A7C59;        /* Pine Green principal */
  --color-primary-hover: #366447;  /* Hover profundo */
  --color-primary-light: #E1F2E2;  /* Soft green pill/chip background */
  --color-sage: #80AB8D;           /* Sage green badge/accent */
  --color-canvas: #F4EBD9;         /* Alabaster warm background */
  --color-surface: #FFFFFF;        /* Tarjetas y modales */
  --color-border: #E5DED0;         /* Bordes cálidos suaves */
  --color-text-main: #1E2522;      /* Texto principal */
  --color-text-muted: #6B6A63;     /* Texto secundario */
  --color-danger: #D9534F;         /* Errores y validación */
  --font-family-body: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --radius-button: 9999px;         /* Pill rounded */
  --radius-card: 16px;             /* Tarjetas suaves */
}
\`\`\`

---

### 2. SUMMARY OF THE 9 UI BLOCKS TO CREATE:
${componentList.map((c, index) => `${index + 1}. **${c.odcBlockName}** (\`${c.id}\` - ${c.category}): ${c.summary}`).join('\n')}

---

### 3. DETAILED SPECIFICATIONS FOR EACH UI BLOCK:

${componentList.map((c, index) => `#### BLOCK ${index + 1}: \`${c.odcBlockName}\`
- **Purpose:** ${c.description}
- **Inputs:**
${c.inputs.map(i => `  * \`${i.name}\` (${i.dataType}${i.isMandatory ? ', Mandatory' : ', Optional'}, Default: \`${i.defaultValue || 'None'}\`): ${i.description}`).join('\n')}
- **Outputs / Events:**
${c.outputs.length > 0 ? c.outputs.map(o => `  * \`${o.name}\`: ${o.description} [${o.parameters.map(p => `${p.name}: ${p.dataType}`).join(', ')}]`).join('\n') : '  * None'}
- **Local Variables:**
${c.localVariables.length > 0 ? c.localVariables.map(v => `  * \`${v.name}\` (${v.dataType}, Default: \`${v.defaultValue || 'None'}\`): ${v.description}`).join('\n') : '  * None'}
- **Widget Tree Hierarchy:**
\`\`\`
${c.widgetTree}
\`\`\`
- **Client Actions:**
${c.clientActions.length > 0 ? c.clientActions.map(a => `  * Action \`${a.name}\` (${a.trigger}): ${a.flowSteps.join(' -> ')}`).join('\n') : '  * Standard data binding and event dispatch.'}
- **Style Sheet:**
\`\`\`css
${c.css}
\`\`\`
`).join('\n---\n\n')}

---

### 4. ARCHITECTURAL INSTRUCTIONS FOR OUTSYSTEMS SERVICE STUDIO:
1. **Module Separation:** Create a Front-End Library module (e.g. \`Flyway_UI_CW\` or \`Flyway_Theme_CW\`) marked with Public Blocks for reuse across Screens.
2. **Safety & Validation:** Ensure \`Flyway_DateRangePicker_Safe\` strictly enforces that \`EndDate >= StartDate\` and \`StartDate >= CurrDate()\`.
3. **OutSystems UI Integration:** Use OutSystems UI patterns (Input, Button, Popup, Icon) as primitives wrapped inside these custom styled blocks.
4. **Events Binding:** In consuming screens, bind all Block events to Screen Client Actions to update screen variables.`;
}

/**
 * Genera la hoja de estilos maestra unificada para todo el sistema de diseño Flyway en OutSystems ODC
 */
export function generateUnifiedThemeCSS(specs: Record<string, ODCComponentSpec>): string {
  const componentList = Object.values(specs);

  return `/* ==========================================================================
   FLYWAY DESIGN SYSTEM - OUTSYSTEMS ODC UNIFIED THEME STYLE SHEET
   Aplicación: Flyway Itinerary Planner
   Plataforma: OutSystems One Developer Cloud (ODC) / OutSystems UI
   ========================================================================== */

/* 1. DESIGN TOKENS & CSS VARIABLES */
:root {
  --color-primary: #4A7C59;
  --color-primary-hover: #366447;
  --color-primary-light: #E1F2E2;
  --color-sage: #80AB8D;
  --color-canvas: #F4EBD9;
  --color-surface: #FFFFFF;
  --color-border: #E5DED0;
  --color-text-main: #1E2522;
  --color-text-muted: #6B6A63;
  --color-danger: #D9534F;
  --color-accent: #E8A87C;
  --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.06);
  --shadow-hover: 0 8px 24px rgba(0, 0, 0, 0.1);
  --radius-button: 9999px;
  --radius-card: 16px;
  --font-family-body: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 2. BASE RESET & OUTSYSTEMS UI OVERRIDES */
body, .main-content {
  background-color: var(--color-canvas);
  color: var(--color-text-main);
  font-family: var(--font-family-body);
}

.fw-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 20px;
  box-shadow: var(--shadow-card);
}

/* 3. INDIVIDUAL COMPONENT STYLE SHEETS */
${componentList.map(c => `
/* --------------------------------------------------------------------------
   UI Block: ${c.odcBlockName} (${c.name})
   -------------------------------------------------------------------------- */
${c.css}
`).join('\n')}
`;
}

/**
 * Genera la documentación técnica completa en Markdown para todos los componentes
 */
export function generateAllComponentsMarkdown(specs: Record<string, ODCComponentSpec>): string {
  const componentList = Object.values(specs);

  return `# Catálogo Técnico de Componentes OutSystems ODC
## Sistema de Diseño Flyway Itinerary Planner
**Total de Bloques:** ${componentList.length} componentes UI listos para Service Studio.

---

${componentList.map((c, i) => `### ${i + 1}. ${c.name} (\`${c.odcBlockName}\`)
- **Categoría:** ${c.category}
- **Resumen:** ${c.summary}
- **Descripción:** ${c.description}

#### Input Parameters:
${c.inputs.map(inp => `| \`${inp.name}\` | \`${inp.dataType}\` | ${inp.isMandatory ? 'Sí' : 'No'} | \`${inp.defaultValue || '-'}\` | ${inp.description} |`).join('\n')}

#### Output Events:
${c.outputs.length > 0 ? c.outputs.map(o => `* **\`${o.name}\`**: ${o.description}`).join('\n') : '* Ninguno'}

#### Árbol de Widgets:
\`\`\`
${c.widgetTree}
\`\`\`

#### CSS del Bloque:
\`\`\`css
${c.css}
\`\`\`

---
`).join('\n')}
`;
}

/**
 * Genera el JSON consolidado con todos los blueprints
 */
export function generateAllComponentsJSON(specs: Record<string, ODCComponentSpec>): string {
  return JSON.stringify({
    system: 'Flyway Itinerary Planner',
    targetPlatform: 'OutSystems One Developer Cloud (ODC)',
    version: '1.0.0',
    generatedDate: new Date().toISOString(),
    totalComponents: Object.keys(specs).length,
    components: specs,
  }, null, 2);
}

