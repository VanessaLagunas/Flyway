import React, { useState } from 'react';
import { Download, Code2, Layers, Check, Bot, Sparkles, Copy, FolderArchive } from 'lucide-react';
import { ODCButton } from '../odc-components/ODCButton';
import { ODCInput } from '../odc-components/ODCInput';
import { ODCSegmentedControl } from '../odc-components/ODCSegmentedControl';
import { ODCChipGroup } from '../odc-components/ODCChipGroup';
import { ODCActivityCard } from '../odc-components/ODCActivityCard';
import { ODCTripCard } from '../odc-components/ODCTripCard';
import { ODCBottomSheet } from '../odc-components/ODCBottomSheet';
import { ODCLoadingOverlay } from '../odc-components/ODCLoadingOverlay';
import { ODCDateRangePicker, getTodayISO, addDaysISO } from '../odc-components/ODCDateRangePicker';
import { ODCExportModal, ExportScope, TabType } from '../odc-components/ODCExportModal';
import { ODC_COMPONENTS_SPECS, generateAllComponentsAIPrompt } from '../data/odcExportSpecs';
import { DEFAULT_INTERESTS, INITIAL_VALPARAISO_TRIP } from '../data/mockTrips';

/**
 * Catálogo interactivo de Componentes Reutilizables para OutSystems ODC
 * Proporciona documentación, visualización y exportación técnica de cada Bloque UI para Service Studio
 */
export const ODCComponentCatalog: React.FC = () => {
  const [segValue, setSegValue] = useState<'budget' | 'standard' | 'premium'>('standard');
  const [selectedChips, setSelectedChips] = useState<string[]>(['gastronomy', 'culture']);
  const [demoStartDate, setDemoStartDate] = useState(getTodayISO());
  const [demoEndDate, setDemoEndDate] = useState(addDaysISO(getTodayISO(), 2));
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  // Modal de exportación ODC
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportTargetComponent, setExportTargetComponent] = useState<string>('ODCDateRangePicker');
  const [exportScope, setExportScope] = useState<ExportScope>('single');
  const [exportTab, setExportTab] = useState<TabType>('ai-prompt');
  const [copiedPromptAll, setCopiedPromptAll] = useState(false);
  const [bundleDownloaded, setBundleDownloaded] = useState(false);

  const handleOpenExport = (
    componentId: string, 
    scope: ExportScope = 'single', 
    tab: TabType = 'ai-prompt'
  ) => {
    setExportTargetComponent(componentId);
    setExportScope(scope);
    setExportTab(tab);
    setExportModalOpen(true);
  };

  const handleCopyAllAIPrompt = () => {
    const prompt = generateAllComponentsAIPrompt(ODC_COMPONENTS_SPECS);
    navigator.clipboard.writeText(prompt);
    setCopiedPromptAll(true);
    setTimeout(() => setCopiedPromptAll(false), 2500);
  };

  const handleDownloadAllBundle = () => {
    const bundleData = {
      project: 'Flyway Itinerary Planner',
      targetPlatform: 'OutSystems ODC (One Developer Cloud)',
      exportedAt: new Date().toISOString(),
      componentsCount: Object.keys(ODC_COMPONENTS_SPECS).length,
      components: ODC_COMPONENTS_SPECS,
    };

    const blob = new Blob([JSON.stringify(bundleData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Flyway_ODC_All_Components_Bundle.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setBundleDownloaded(true);
    setTimeout(() => setBundleDownloaded(false), 3000);
  };

  const sampleActivity = INITIAL_VALPARAISO_TRIP.days[0].items[0].type === 'activity'
    ? INITIAL_VALPARAISO_TRIP.days[0].items[0].data
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="fw-logo">Flyway</div>
        <h1 className="text-3xl font-bold mt-1 mb-2">Arquitectura de Componentes OutSystems ODC</h1>
        <p className="fw-muted text-base leading-relaxed">
          Diseño modular estructurado en <strong>Blocks reutilizables</strong>, <strong>Tokens de Diseño (Theme CSS)</strong> y <strong>Estructuras de Datos</strong> para una migración directa a OutSystems ODC (One Developer Cloud).
        </p>

        {/* Centro de Exportación & Prompts IA */}
        <div className="mt-5 p-5 rounded-2xl bg-gradient-to-r from-[#FAF8F5] via-[#F3F9F4] to-[#FAF8F5] border border-[#C6E4C8] shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#4A7C59] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base text-[#1E1F19]">Centro de Exportación & Prompts IA para OutSystems ODC</span>
                  <span className="text-[11px] font-semibold bg-[#E1F2E2] text-[#264D33] px-2 py-0.5 rounded-full border border-[#C6E4C8] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#E8A87C]" />
                    IA Integrada & Service Studio
                  </span>
                </div>
                <div className="text-xs text-[#526359] mt-0.5 max-w-xl leading-relaxed">
                  Exporta componentes individualmente o copia el <strong>Master Prompt de IA</strong> para pasárselo directamente a la IA integrada de OutSystems (ODC AI Assistant / Project Neo) o a Claude/ChatGPT para generar todos los UI Blocks.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyAllAIPrompt}
                className="btn btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
                title="Copia al portapapeles el Prompt completo con todos los bloques para pasárselo a la IA de OutSystems"
              >
                {copiedPromptAll ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    ¡Master Prompt Copiado!
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4" />
                    Copiar Master Prompt IA (Todos)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleOpenExport('ODCDateRangePicker', 'all', 'ai-prompt')}
                className="btn fw-btn-outline text-xs py-2 px-3.5 flex items-center gap-1.5 bg-white shadow-xs"
                title="Abre el modal en modo Todos los Componentes para ver o descargar especificaciones y CSS"
              >
                <FolderArchive className="w-4 h-4 text-[#4A7C59]" />
                Exportar Todos (Bundle ODC)
              </button>

              <button
                type="button"
                onClick={() => handleOpenExport('ODCDateRangePicker', 'single', 'spec')}
                className="btn fw-btn-ghost text-xs py-2 px-3 flex items-center gap-1.5"
                title="Ver por componente individual"
              >
                <Layers className="w-3.5 h-3.5 text-[#6B6A63]" />
                Por Componente
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Guía de equivalencias ODC */}
      <div className="fw-card mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">📋 Matriz de Migración a OutSystems ODC</h2>
          <span className="text-xs text-[#6B6A63] bg-[#FAF8F5] px-2.5 py-1 rounded-md border border-[var(--fw-border)]">
            Haz clic en <strong>Exportar</strong> en cualquier fila
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[var(--fw-border)] text-[var(--fw-text-muted)]">
                <th className="py-2">Componente React</th>
                <th className="py-2">Concepto en OutSystems ODC</th>
                <th className="py-2">Inputs / Events ODC</th>
                <th className="py-2">Style Classes</th>
                <th className="py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--fw-border)]">
              <tr>
                <td className="py-2 font-mono font-bold text-xs">ODCButton</td>
                <td className="py-2">Button / Link (OutSystems UI)</td>
                <td className="py-2">Variant, IsDisabled, OnClick</td>
                <td className="py-2"><code>btn-primary, fw-btn-outline, fw-btn-ghost, fw-btn-danger</code></td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleOpenExport('ODCButton')}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#E1F2E2] text-[#366447] hover:bg-[#4A7C59] hover:text-white transition-colors"
                  >
                    Exportar
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-2 font-mono font-bold text-xs">ODCInput</td>
                <td className="py-2">Input + Label + ValidationMessage</td>
                <td className="py-2">Label, Value, ErrorMessage, OnChange</td>
                <td className="py-2"><code>form-control, not-valid, fw-field-error</code></td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleOpenExport('ODCInput')}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#E1F2E2] text-[#366447] hover:bg-[#4A7C59] hover:text-white transition-colors"
                  >
                    Exportar
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-2 font-mono font-bold text-xs">ODCDateRangePicker</td>
                <td className="py-2">DatePicker Range / Custom Calendar Block</td>
                <td className="py-2">StartDate, EndDate, MinDate, OnChange</td>
                <td className="py-2"><code>form-control, fw-calendar, is-safe-range</code></td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleOpenExport('ODCDateRangePicker')}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#E1F2E2] text-[#366447] hover:bg-[#4A7C59] hover:text-white transition-colors"
                  >
                    Exportar
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-2 font-mono font-bold text-xs">ODCSegmentedControl</td>
                <td className="py-2">ButtonGroup / Custom Block</td>
                <td className="py-2">OptionsList, SelectedOption, OnSelect</td>
                <td className="py-2"><code>fw-segmented, fw-segmented__item, is-active</code></td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleOpenExport('ODCSegmentedControl')}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#E1F2E2] text-[#366447] hover:bg-[#4A7C59] hover:text-white transition-colors"
                  >
                    Exportar
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-2 font-mono font-bold text-xs">ODCChipGroup</td>
                <td className="py-2">Tag List / Multi-select Chips</td>
                <td className="py-2">InterestsList, SelectedIds, OnToggle</td>
                <td className="py-2"><code>fw-chip, is-active</code></td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleOpenExport('ODCChipGroup')}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#E1F2E2] text-[#366447] hover:bg-[#4A7C59] hover:text-white transition-colors"
                  >
                    Exportar
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-2 font-mono font-bold text-xs">ODCBottomSheet</td>
                <td className="py-2">Popup (OutSystems UI)</td>
                <td className="py-2">IsOpen, OnClose, Content Placeholder</td>
                <td className="py-2"><code>popup-dialog fw-sheet, fw-backdrop</code></td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleOpenExport('ODCBottomSheet')}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#E1F2E2] text-[#366447] hover:bg-[#4A7C59] hover:text-white transition-colors"
                  >
                    Exportar
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-2 font-mono font-bold text-xs">ODCActivityCard</td>
                <td className="py-2">ActivityCard Block</td>
                <td className="py-2">ActivityRecord, OnOpenDetail, OnOpenMenu</td>
                <td className="py-2"><code>fw-activity, fw-timeline__dot, fw-kebab</code></td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleOpenExport('ODCActivityCard')}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#E1F2E2] text-[#366447] hover:bg-[#4A7C59] hover:text-white transition-colors"
                  >
                    Exportar
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-2 font-mono font-bold text-xs">ODCTripCard</td>
                <td className="py-2">TripCard Block</td>
                <td className="py-2">TripRecord, OnViewTrip, OnToggleFavorite</td>
                <td className="py-2"><code>fw-trip-card, fw-season, fw-fav</code></td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleOpenExport('ODCTripCard')}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#E1F2E2] text-[#366447] hover:bg-[#4A7C59] hover:text-white transition-colors"
                  >
                    Exportar
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-2 font-mono font-bold text-xs">ODCBottomNav</td>
                <td className="py-2">BottomBar (OutSystems UI Mobile Layout)</td>
                <td className="py-2">ActiveScreen, OnSelectTab</td>
                <td className="py-2"><code>fw-bottom-nav, fw-bottom-nav__item</code></td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleOpenExport('ODCBottomNav')}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#E1F2E2] text-[#366447] hover:bg-[#4A7C59] hover:text-white transition-colors"
                  >
                    Exportar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-8">
        {/* 1. Botones */}
        <section className="fw-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">1. Botones (ODCButton)</h3>
            <button
              type="button"
              onClick={() => handleOpenExport('ODCButton')}
              className="btn fw-btn-outline text-xs py-1 px-3 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#4A7C59]" />
              Exportar para ODC
            </button>
          </div>
          <p className="text-sm fw-muted mb-4">
            Variantes mapeadas a los botones del tema de Flyway y OutSystems UI.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <ODCButton variant="primary">Primary</ODCButton>
            <ODCButton variant="outline">Outline</ODCButton>
            <ODCButton variant="ghost">Ghost Button</ODCButton>
            <ODCButton variant="danger">Danger Action</ODCButton>
          </div>
        </section>

        {/* 2. Inputs & Validación */}
        <section className="fw-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">2. Inputs y Validación (ODCInput)</h3>
            <button
              type="button"
              onClick={() => handleOpenExport('ODCInput')}
              className="btn fw-btn-outline text-xs py-1 px-3 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#4A7C59]" />
              Exportar para ODC
            </button>
          </div>
          <p className="text-sm fw-muted mb-4">
            Mapeo directo a widgets de formulario con soporte para estado <code>.not-valid</code> y mensajes <code>.fw-field-error</code>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ODCInput
              label="Destino (Válido)"
              defaultValue="Valparaíso, Chile"
              placeholder="¿A dónde quieres ir?"
            />
            <ODCInput
              label="Destino (Con error)"
              defaultValue=""
              placeholder="¿A dónde quieres ir?"
              error="Cuéntanos a dónde quieres ir."
            />
          </div>
        </section>

        {/* 3. Selector de Fechas con Seguridad de Calendario */}
        <section className="fw-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">3. Selector de Fechas con Seguridad (ODCDateRangePicker)</h3>
            <button
              type="button"
              onClick={() => handleOpenExport('ODCDateRangePicker')}
              className="btn btn-primary text-xs py-1 px-3 flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              Exportar para ODC
            </button>
          </div>
          <p className="text-sm fw-muted mb-4">
            Control de fechas conectado con reglas de validación en tiempo real:
            la fecha de ida no puede ser anterior a hoy, y la fecha de vuelta <strong>no puede ser anterior al día de ida seleccionado</strong>.
          </p>
          <div className="max-w-md bg-[#FAF8F5] p-4 rounded-xl border border-[var(--fw-border)]">
            <ODCDateRangePicker
              id="catalog-date-picker"
              startDate={demoStartDate}
              endDate={demoEndDate}
              onChange={({ startDate, endDate }) => {
                setDemoStartDate(startDate);
                setDemoEndDate(endDate);
              }}
            />
          </div>
        </section>

        {/* 4. Segmented Control */}
        <section className="fw-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">4. Presupuesto Segmentado (ODCSegmentedControl)</h3>
            <button
              type="button"
              onClick={() => handleOpenExport('ODCSegmentedControl')}
              className="btn fw-btn-outline text-xs py-1 px-3 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#4A7C59]" />
              Exportar para ODC
            </button>
          </div>
          <p className="text-sm fw-muted mb-4">
            Control de selección única para niveles de presupuesto (Económico, Estándar, Premium).
          </p>
          <ODCSegmentedControl
            options={[
              { id: 'budget', label: 'Económico' },
              { id: 'standard', label: 'Estándar' },
              { id: 'premium', label: 'Premium' },
            ]}
            value={segValue}
            onChange={setSegValue}
            idPrefix="catalog-budget"
          />
        </section>

        {/* 5. Chips de Intereses */}
        <section className="fw-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">5. Chips de Intereses (ODCChipGroup)</h3>
            <button
              type="button"
              onClick={() => handleOpenExport('ODCChipGroup')}
              className="btn fw-btn-outline text-xs py-1 px-3 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#4A7C59]" />
              Exportar para ODC
            </button>
          </div>
          <p className="text-sm fw-muted mb-4">
            Selección múltiple con iconos emoji y estado activo <code>--fw-chip-active: #80AB8D</code>.
          </p>
          <ODCChipGroup
            options={DEFAULT_INTERESTS}
            selectedIds={selectedChips}
            onToggle={(id) => {
              setSelectedChips((prev) =>
                prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
              );
            }}
          />
        </section>

        {/* 6. Tarjeta de Actividad */}
        {sampleActivity && (
          <section className="fw-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">6. Tarjeta de Actividad (ODCActivityCard)</h3>
              <button
                type="button"
                onClick={() => handleOpenExport('ODCActivityCard')}
                className="btn fw-btn-outline text-xs py-1 px-3 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#4A7C59]" />
                Exportar para ODC
              </button>
            </div>
            <p className="text-sm fw-muted mb-4">
              Componente para la línea de tiempo del itinerario con foto, categoría, horario y menú kebab.
            </p>
            <div className="fw-timeline max-w-md">
              <ODCActivityCard
                activity={sampleActivity}
                onOpenDetails={() => setIsSheetOpen(true)}
                onOpenMenu={() => setIsSheetOpen(true)}
              />
            </div>
          </section>
        )}

        {/* 7. Tarjeta de Viaje Guardado */}
        <section className="fw-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">7. Tarjeta de Ruta Guardada (ODCTripCard)</h3>
            <button
              type="button"
              onClick={() => handleOpenExport('ODCTripCard')}
              className="btn fw-btn-outline text-xs py-1 px-3 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#4A7C59]" />
              Exportar para ODC
            </button>
          </div>
          <p className="text-sm fw-muted mb-4">
            Tarjeta con badge de temporada, botón favorito toggleable y llamada a la acción.
          </p>
          <div className="max-w-md">
            <ODCTripCard
              trip={INITIAL_VALPARAISO_TRIP}
              onView={() => {}}
              onToggleFavorite={() => {}}
            />
          </div>
        </section>

        {/* 8. Hojas Inferiores y Overlay */}
        <section className="fw-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">8. Modales y Estado de Carga (ODCBottomSheet / ODCLoadingOverlay)</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenExport('ODCBottomSheet')}
                className="btn fw-btn-outline text-xs py-1 px-2.5 flex items-center gap-1"
              >
                <Download className="w-3 h-3 text-[#4A7C59]" />
                Exportar Sheet
              </button>
              <button
                type="button"
                onClick={() => handleOpenExport('ODCLoadingOverlay')}
                className="btn fw-btn-outline text-xs py-1 px-2.5 flex items-center gap-1"
              >
                <Download className="w-3 h-3 text-[#4A7C59]" />
                Exportar Loading
              </button>
            </div>
          </div>
          <p className="text-sm fw-muted mb-4">
            Popup de OutSystems UI configurado con clase <code>fw-sheet</code> y pantalla de carga con animación fluida.
          </p>
          <div className="flex gap-4">
            <ODCButton variant="outline" onClick={() => setIsSheetOpen(true)}>
              Probar Bottom Sheet
            </ODCButton>
            <ODCButton
              variant="outline"
              onClick={() => {
                setShowLoading(true);
                setTimeout(() => setShowLoading(false), 2000);
              }}
            >
              Probar Loading Overlay (2s)
            </ODCButton>
          </div>
        </section>
      </div>

      {/* Modal interactivo del catálogo */}
      <ODCBottomSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)}>
        <h2 className="text-2xl font-bold mb-2">Bloque ODCBottomSheet</h2>
        <p className="fw-muted text-sm mb-4">
          Este bloque se traduce directamente en un Popup de OutSystems UI asignando el Style Class <code>fw-sheet</code>.
        </p>
        <div className="fw-info-block">
          <h3>Propiedades del Bloque</h3>
          <div className="fw-muted text-sm">
            Admite cualquier contenido dinámico en su Placeholder, tiene apertura animada tipo resorte y cierre con backdrop o tecla Escape.
          </div>
        </div>
        <ODCButton variant="primary" fullWidth className="mt-5" onClick={() => setIsSheetOpen(false)}>
          Entendido
        </ODCButton>
      </ODCBottomSheet>

      {/* Loading overlay */}
      <ODCLoadingOverlay
        isLoading={showLoading}
        title="Creando tu ruta"
        subtitle="Ajustando a tu presupuesto…"
      />

      {/* Modal de Exportación para OutSystems ODC */}
      <ODCExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        initialComponentId={exportTargetComponent}
        initialScope={exportScope}
        initialTab={exportTab}
      />
    </div>
  );
};
