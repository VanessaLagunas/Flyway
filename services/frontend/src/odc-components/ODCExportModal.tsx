/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  FileCode, 
  Code2, 
  Palette, 
  Layers, 
  FileJson,
  Info,
  Sparkles,
  Bot,
  Terminal,
  FolderArchive,
  BookOpen
} from 'lucide-react';
import { 
  ODCComponentSpec, 
  ODC_COMPONENTS_SPECS,
  generateSingleComponentAIPrompt,
  generateAllComponentsAIPrompt,
  generateUnifiedThemeCSS,
  generateAllComponentsMarkdown,
  generateAllComponentsJSON
} from '../data/odcExportSpecs';

export type ExportScope = 'single' | 'all';
export type TabType = 'ai-prompt' | 'spec' | 'tree' | 'css' | 'js' | 'json';

export interface ODCExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialComponentId?: string;
  initialScope?: ExportScope;
  initialTab?: TabType;
}

export const ODCExportModal: React.FC<ODCExportModalProps> = ({
  isOpen,
  onClose,
  initialComponentId = 'ODCDateRangePicker',
  initialScope = 'single',
  initialTab = 'ai-prompt',
}) => {
  const [exportScope, setExportScope] = useState<ExportScope>(initialScope);
  const [selectedId, setSelectedId] = useState<string>(initialComponentId);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [copiedState, setCopiedState] = useState<string | null>(null);

  // Sync if props change
  useEffect(() => {
    if (initialComponentId && ODC_COMPONENTS_SPECS[initialComponentId]) {
      setSelectedId(initialComponentId);
    }
  }, [initialComponentId]);

  useEffect(() => {
    if (initialScope) setExportScope(initialScope);
  }, [initialScope]);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  if (!isOpen) return null;

  const spec: ODCComponentSpec = ODC_COMPONENTS_SPECS[selectedId] || ODC_COMPONENTS_SPECS['ODCDateRangePicker'];
  const allSpecs = ODC_COMPONENTS_SPECS;
  const totalCount = Object.keys(allSpecs).length;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedState(label);
    setTimeout(() => setCopiedState(null), 2500);
  };

  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Content generators based on scope
  const getCurrentAIPrompt = (): string => {
    return exportScope === 'single'
      ? generateSingleComponentAIPrompt(spec)
      : generateAllComponentsAIPrompt(allSpecs);
  };

  const getCurrentSpecText = (): string => {
    return exportScope === 'single'
      ? `# OutSystems ODC Block: ${spec.odcBlockName} (${spec.name})
Categoría: ${spec.category}
Descripción: ${spec.description}

## 1. Input Parameters
${spec.inputs.map(i => `- ${i.name} (${i.dataType}${i.isMandatory ? ', Obligatorio' : ', Opcional'}, Default: ${i.defaultValue || 'N/A'}): ${i.description}`).join('\n')}

## 2. Output Events
${spec.outputs.length > 0 ? spec.outputs.map(o => `- ${o.name}: ${o.description}\n${o.parameters.map(p => `  * ${p.name} (${p.dataType}): ${p.description}`).join('\n')}`).join('\n') : 'Ninguno'}

## 3. Local Variables
${spec.localVariables.length > 0 ? spec.localVariables.map(v => `- ${v.name} (${v.dataType}, Default: ${v.defaultValue || 'N/A'}): ${v.description}`).join('\n') : 'Ninguna'}

## 4. Client Actions
${spec.clientActions.length > 0 ? spec.clientActions.map(a => `### ${a.name} (${a.trigger})
${a.flowSteps.join(' -> ')}
${a.jsSnippet ? `\`\`\`javascript\n${a.jsSnippet}\n\`\`\`` : ''}`).join('\n\n') : 'Asignación visual estándar.'}`
      : generateAllComponentsMarkdown(allSpecs);
  };

  const getCurrentTreeText = (): string => {
    if (exportScope === 'single') {
      return spec.widgetTree;
    }
    return Object.values(allSpecs)
      .map(s => `/* ==========================================================================\n   WIDGET TREE: ${s.odcBlockName} (${s.name})\n   ========================================================================== */\n${s.widgetTree}`)
      .join('\n\n');
  };

  const getCurrentCSSText = (): string => {
    return exportScope === 'single'
      ? `/* Style Sheet para el Bloque: ${spec.odcBlockName} */\n${spec.css}`
      : generateUnifiedThemeCSS(allSpecs);
  };

  const getCurrentCodeText = (): string => {
    if (exportScope === 'single') {
      return `// === Implementación React de Referencia para ${spec.name} ===
${spec.reactSourceSnippet}

${spec.clientActions.length > 0 ? `// === Lógica para Client Action de OutSystems (${spec.clientActions[0].name}) ===
${spec.clientActions[0].jsSnippet || '// Lógica nativa de OutSystems: ' + spec.clientActions[0].flowSteps.join(' -> ')}` : ''}`;
    }
    return Object.values(allSpecs)
      .map(s => `// --------------------------------------------------------------------------
// Componente: ${s.name} (${s.odcBlockName})
// --------------------------------------------------------------------------
${s.reactSourceSnippet}`)
      .join('\n\n');
  };

  const getCurrentJSONText = (): string => {
    return exportScope === 'single'
      ? JSON.stringify(spec, null, 2)
      : generateAllComponentsJSON(allSpecs);
  };

  // Get active text content
  const getActiveContent = (): string => {
    switch (activeTab) {
      case 'ai-prompt': return getCurrentAIPrompt();
      case 'spec': return getCurrentSpecText();
      case 'tree': return getCurrentTreeText();
      case 'css': return getCurrentCSSText();
      case 'js': return getCurrentCodeText();
      case 'json': return getCurrentJSONText();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white text-[#1E1F19] rounded-2xl shadow-2xl border border-[var(--fw-border)] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* HEADER DEL MODAL */}
        <div className="px-5 py-3.5 bg-[#FAF8F5] border-b border-[var(--fw-border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E1F2E2] text-[#4A7C59] flex items-center justify-center font-bold text-base shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[#1E1F19] m-0">
                  Exportar para OutSystems ODC
                </h3>
                <span className="text-[11px] font-semibold bg-[#4A7C59] text-white px-2 py-0.5 rounded-full">
                  One Developer Cloud
                </span>
                <span className="hidden sm:inline-flex text-[11px] font-semibold bg-[#F4EBD9] text-[#7A5826] px-2 py-0.5 rounded-full border border-[#E5DED0] items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#E8A87C]" />
                  AI Ready
                </span>
              </div>
              <p className="text-xs text-[var(--fw-text-muted)] m-0">
                Prompts para la IA integrada de OutSystems, blueprints de UI Blocks, árboles de widgets y tema CSS
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--fw-text-muted)] hover:bg-[#E5DED0] hover:text-[#1E1F19] transition-colors"
            title="Cerrar modal"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BARRA DE SELECCIÓN: ÁMBITO (INDIVIDUAL VS TODOS) Y COMPONENTE */}
        <div className="px-5 py-3 bg-[#F4EFE6] border-b border-[var(--fw-border)] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Toggle de Ámbito */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#6B6A63]">Modo de exportación:</span>
            <div className="inline-flex rounded-lg bg-[#EAE3D4] p-0.5 border border-[#D5CDBC]">
              <button
                type="button"
                onClick={() => setExportScope('single')}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-all ${
                  exportScope === 'single'
                    ? 'bg-white text-[#1E1F19] shadow-xs'
                    : 'text-[#6B6A63] hover:text-[#1E1F19]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-[#4A7C59]" />
                Componente Individual
              </button>

              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-all ${
                  exportScope === 'all'
                    ? 'bg-[#4A7C59] text-white shadow-xs'
                    : 'text-[#6B6A63] hover:text-[#1E1F19]'
                }`}
              >
                <FolderArchive className="w-3.5 h-3.5" />
                Todos los Componentes ({totalCount})
              </button>
            </div>
          </div>

          {/* Selector de componente cuando está en modo individual */}
          {exportScope === 'single' ? (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#6B6A63]">Seleccionar Bloque:</span>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="bg-white border border-[#D5CDBC] text-[#1E1F19] rounded-lg px-2.5 py-1.5 font-semibold text-xs focus:outline-none focus:border-[#4A7C59] shadow-xs cursor-pointer max-w-[280px]"
              >
                {Object.values(ODC_COMPONENTS_SPECS).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.odcBlockName} ({c.name})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[#4A7C59] bg-[#E1F2E2] px-3 py-1.5 rounded-lg font-semibold text-xs border border-[#C6E4C8]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bundle completo: 9 Bloques ODC + Design Tokens unificados</span>
            </div>
          )}

          {/* Accesos rápidos de descarga directa */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const promptText = getCurrentAIPrompt();
                const filename = exportScope === 'single' 
                  ? `Prompt_IA_OutSystems_${spec.odcBlockName}.txt` 
                  : `Master_Prompt_IA_OutSystems_Flyway_All.txt`;
                downloadFile(filename, promptText, 'text/plain');
              }}
              className="px-2.5 py-1.5 rounded-md bg-white border border-[#D5CDBC] hover:bg-[#FAF8F5] text-[#1E1F19] font-medium flex items-center gap-1 transition-colors shadow-xs"
              title="Descargar Prompt para IA de OutSystems en archivo de texto plano"
            >
              <Terminal className="w-3.5 h-3.5 text-[#4A7C59]" />
              Descargar Prompt (.txt)
            </button>

            <button
              type="button"
              onClick={() => {
                const cssText = getCurrentCSSText();
                const filename = exportScope === 'single'
                  ? `${spec.odcBlockName}.css`
                  : `Flyway_ODC_Unified_Theme.css`;
                downloadFile(filename, cssText, 'text/css');
              }}
              className="px-2.5 py-1.5 rounded-md bg-white border border-[#D5CDBC] hover:bg-[#FAF8F5] text-[#1E1F19] font-medium flex items-center gap-1 transition-colors shadow-xs"
              title="Descargar hoja de estilos CSS"
            >
              <Palette className="w-3.5 h-3.5 text-[#8B6F3E]" />
              Descargar CSS
            </button>

            <button
              type="button"
              onClick={() => {
                const jsonText = getCurrentJSONText();
                const filename = exportScope === 'single'
                  ? `${spec.odcBlockName}_ODC_Spec.json`
                  : `Flyway_ODC_All_Components_Bundle.json`;
                downloadFile(filename, jsonText, 'application/json');
              }}
              className="px-2.5 py-1.5 rounded-md bg-white border border-[#D5CDBC] hover:bg-[#FAF8F5] text-[#1E1F19] font-medium flex items-center gap-1 transition-colors shadow-xs"
              title="Descargar especificación completa en JSON"
            >
              <FileJson className="w-3.5 h-3.5 text-[#4A7C59]" />
              Descargar JSON
            </button>
          </div>
        </div>

        {/* PESTAÑAS DE FORMATOS / VISTAS */}
        <div className="flex border-b border-[var(--fw-border)] bg-[#FFFFFA] px-5 pt-2 gap-2 overflow-x-auto text-xs scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('ai-prompt')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ai-prompt'
                ? 'border-[#4A7C59] text-[#4A7C59]'
                : 'border-transparent text-[#6B6A63] hover:text-[#1E1F19]'
            }`}
          >
            <Bot className="w-4 h-4 text-[#4A7C59]" />
            <span>1. Prompt para IA de OutSystems</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#E1F2E2] text-[#366447]">
              Recomendado
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('spec')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'spec'
                ? 'border-[#4A7C59] text-[#4A7C59]'
                : 'border-transparent text-[#6B6A63] hover:text-[#1E1F19]'
            }`}
          >
            <Layers className="w-4 h-4" />
            2. Especificación Técnica
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tree')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'tree'
                ? 'border-[#4A7C59] text-[#4A7C59]'
                : 'border-transparent text-[#6B6A63] hover:text-[#1E1F19]'
            }`}
          >
            <FileCode className="w-4 h-4" />
            3. Árbol de Widgets (Service Studio)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('css')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'css'
                ? 'border-[#4A7C59] text-[#4A7C59]'
                : 'border-transparent text-[#6B6A63] hover:text-[#1E1F19]'
            }`}
          >
            <Palette className="w-4 h-4" />
            4. Estilos CSS {exportScope === 'all' ? 'Unificados' : 'del Bloque'}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('js')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'js'
                ? 'border-[#4A7C59] text-[#4A7C59]'
                : 'border-transparent text-[#6B6A63] hover:text-[#1E1F19]'
            }`}
          >
            <Code2 className="w-4 h-4" />
            5. React & Lógica JS
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'json'
                ? 'border-[#4A7C59] text-[#4A7C59]'
                : 'border-transparent text-[#6B6A63] hover:text-[#1E1F19]'
            }`}
          >
            <FileJson className="w-4 h-4" />
            6. Blueprint JSON
          </button>
        </div>

        {/* CUERPO DEL MODAL */}
        <div className="flex-1 overflow-y-auto p-5 text-sm">
          {/* TAB 1: PROMPT PARA IA DE OUTSYSTEMS */}
          {activeTab === 'ai-prompt' && (
            <div className="space-y-4">
              {/* Tarjeta explicativa de la IA de OutSystems */}
              <div className="p-4 rounded-xl bg-[#F0F7F2] border border-[#C8E4D0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#4A7C59]" />
                    <span className="font-bold text-sm text-[#264D33]">
                      {exportScope === 'single'
                        ? `Prompt de Generación IA para Bloque: ${spec.odcBlockName}`
                        : `Master Prompt IA para los 9 Componentes del Sistema de Diseño`}
                    </span>
                  </div>
                  <p className="text-xs text-[#366447] m-0 max-w-2xl">
                    Copia este prompt y pégalo directamente en el <strong>asistente de IA de OutSystems (ODC AI Assistant / Project Neo / AI Mentor)</strong>, 
                    o en <strong>ChatGPT / Claude</strong> para que genere automáticamente la arquitectura de los bloques, widgets, variables y estilos en Service Studio.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const filename = exportScope === 'single'
                        ? `Prompt_IA_OutSystems_${spec.odcBlockName}.txt`
                        : `Master_Prompt_IA_OutSystems_All.txt`;
                      downloadFile(filename, getCurrentAIPrompt(), 'text/plain');
                    }}
                    className="btn fw-btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar .txt
                  </button>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(getCurrentAIPrompt(), 'ai-prompt')}
                    className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
                  >
                    {copiedState === 'ai-prompt' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        ¡Prompt Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar Prompt para IA
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Visor de texto del Prompt */}
              <div className="relative">
                <pre className="p-4 rounded-xl bg-[#1E2522] text-[#E1F2E2] font-mono text-xs overflow-x-auto leading-relaxed border border-[#2E3B35] max-h-[460px] whitespace-pre-wrap selection:bg-[#4A7C59] selection:text-white">
                  {getCurrentAIPrompt()}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: ESPECIFICACIÓN TÉCNICA */}
          {activeTab === 'spec' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#F7F4ED] border border-[var(--fw-border)]">
                <div>
                  <h4 className="font-bold text-sm text-[#1E1F19] m-0">
                    {exportScope === 'single' 
                      ? `Especificación de Contrato: ${spec.odcBlockName}`
                      : `Catálogo Completo de Contratos (${totalCount} Bloques)`}
                  </h4>
                  <p className="text-xs text-[var(--fw-text-muted)] m-0">
                    Parámetros de entrada, eventos de salida, variables de estado y reglas de validación en OutSystems.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const filename = exportScope === 'single'
                        ? `${spec.odcBlockName}_Specification.md`
                        : `Flyway_All_Components_Specs.md`;
                      downloadFile(filename, getCurrentSpecText(), 'text/markdown');
                    }}
                    className="btn fw-btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar .md
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(getCurrentSpecText(), 'spec')}
                    className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    {copiedState === 'spec' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar Especificación
                      </>
                    )}
                  </button>
                </div>
              </div>

              {exportScope === 'single' ? (
                <div className="space-y-4">
                  {/* Inputs */}
                  <div className="border border-[var(--fw-border)] rounded-xl overflow-hidden">
                    <div className="bg-[#FAF8F5] px-4 py-2 font-bold text-xs border-b border-[var(--fw-border)] flex items-center justify-between">
                      <span>Input Parameters (Parámetros de Entrada)</span>
                      <span className="text-[var(--fw-text-muted)]">{spec.inputs.length} parámetros</span>
                    </div>
                    <div className="divide-y divide-[var(--fw-border)] text-xs">
                      {spec.inputs.map((inp) => (
                        <div key={inp.name} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#FAF8F5]">
                          <div>
                            <span className="font-mono font-bold text-[#4A7C59]">{inp.name}</span>
                            <span className="ml-2 font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#EAE3D4] text-[#49454F]">{inp.dataType}</span>
                            {inp.isMandatory && (
                              <span className="ml-1.5 font-sans font-bold text-[10px] px-1.5 py-0.2 rounded bg-[#F8D7DA] text-[#721C24]">Obligatorio</span>
                            )}
                            <p className="text-[var(--fw-text-muted)] mt-1 m-0">{inp.description}</p>
                          </div>
                          {inp.defaultValue && (
                            <div className="text-right shrink-0">
                              <span className="text-[11px] text-[#6B6A63]">Default: </span>
                              <code className="text-[11px] bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#E5DED0]">{inp.defaultValue}</code>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Outputs */}
                  <div className="border border-[var(--fw-border)] rounded-xl overflow-hidden">
                    <div className="bg-[#FAF8F5] px-4 py-2 font-bold text-xs border-b border-[var(--fw-border)] flex items-center justify-between">
                      <span>Output Events (Eventos de Salida)</span>
                      <span className="text-[var(--fw-text-muted)]">{spec.outputs.length} eventos</span>
                    </div>
                    <div className="divide-y divide-[var(--fw-border)] text-xs">
                      {spec.outputs.length > 0 ? (
                        spec.outputs.map((out) => (
                          <div key={out.name} className="p-3 hover:bg-[#FAF8F5]">
                            <span className="font-mono font-bold text-[#8B6F3E]">{out.name}</span>
                            <p className="text-[var(--fw-text-muted)] mt-1 m-0">{out.description}</p>
                            {out.parameters.length > 0 && (
                              <div className="mt-2 pl-3 border-l-2 border-[#D5CDBC] space-y-1">
                                {out.parameters.map((p) => (
                                  <div key={p.name} className="text-[11px]">
                                    <code className="font-bold text-[#1E1F19]">{p.name}</code> ({p.dataType}): {p.description}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-[var(--fw-text-muted)]">No define eventos de salida directos.</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <pre className="p-4 rounded-xl bg-[#FAF8F5] text-[#1E1F19] font-mono text-xs overflow-x-auto leading-relaxed border border-[var(--fw-border)] max-h-[460px] whitespace-pre-wrap">
                  {getCurrentSpecText()}
                </pre>
              )}
            </div>
          )}

          {/* TAB 3: ÁRBOL DE WIDGETS */}
          {activeTab === 'tree' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#F7F4ED] border border-[var(--fw-border)]">
                <div>
                  <h4 className="font-bold text-sm text-[#1E1F19] m-0">
                    {exportScope === 'single'
                      ? `Árbol de Widgets de Service Studio: ${spec.odcBlockName}`
                      : `Jerarquía de Widgets para todos los Bloques (${totalCount})`}
                  </h4>
                  <p className="text-xs text-[var(--fw-text-muted)] m-0">
                    Estructura visual exacta con Containers, Inputs, Labels, Expresiones e Ifs para replicar en el lienzo de OutSystems.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(getCurrentTreeText(), 'tree')}
                    className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    {copiedState === 'tree' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        ¡Árbol Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar Árbol de Widgets
                      </>
                    )}
                  </button>
                </div>
              </div>

              <pre className="p-4 rounded-xl bg-[#1E1F19] text-[#A6E22E] font-mono text-xs overflow-x-auto leading-relaxed border border-black max-h-[460px]">
                {getCurrentTreeText()}
              </pre>
            </div>
          )}

          {/* TAB 4: ESTILOS CSS */}
          {activeTab === 'css' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#F7F4ED] border border-[var(--fw-border)]">
                <div>
                  <h4 className="font-bold text-sm text-[#1E1F19] m-0">
                    {exportScope === 'single'
                      ? `Estilos CSS: ${spec.odcBlockName}`
                      : `Hoja de Estilos Unificada del Tema (FlywayTheme.css)`}
                  </h4>
                  <p className="text-xs text-[var(--fw-text-muted)] m-0">
                    {exportScope === 'single'
                      ? 'Pega este código en la pestaña Style Sheet del UI Block en Service Studio.'
                      : 'Pega este código en la hoja de estilos raíz del Módulo o Tema de tu aplicación ODC.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const filename = exportScope === 'single' ? `${spec.odcBlockName}.css` : 'Flyway_ODC_Theme.css';
                      downloadFile(filename, getCurrentCSSText(), 'text/css');
                    }}
                    className="btn fw-btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar .css
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(getCurrentCSSText(), 'css')}
                    className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    {copiedState === 'css' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        ¡CSS Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar CSS
                      </>
                    )}
                  </button>
                </div>
              </div>

              <pre className="p-4 rounded-xl bg-[#1E1F19] text-[#FD971F] font-mono text-xs overflow-x-auto leading-relaxed border border-black max-h-[460px]">
                {getCurrentCSSText()}
              </pre>
            </div>
          )}

          {/* TAB 5: REACT & LÓGICA JS */}
          {activeTab === 'js' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#F7F4ED] border border-[var(--fw-border)]">
                <div>
                  <h4 className="font-bold text-sm text-[#1E1F19] m-0">
                    {exportScope === 'single'
                      ? `Código React y Nodos JavaScript para ${spec.name}`
                      : `Referencia de Código React (${totalCount} Componentes)`}
                  </h4>
                  <p className="text-xs text-[var(--fw-text-muted)] m-0">
                    Código funcional de referencia para nodos JavaScript dentro de Client Actions o consumo en React.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(getCurrentCodeText(), 'js')}
                    className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    {copiedState === 'js' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        ¡Código Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar Código
                      </>
                    )}
                  </button>
                </div>
              </div>

              <pre className="p-4 rounded-xl bg-[#1E1F19] text-[#66D9EF] font-mono text-xs overflow-x-auto leading-relaxed border border-black max-h-[460px]">
                {getCurrentCodeText()}
              </pre>
            </div>
          )}

          {/* TAB 6: BLUEPRINT JSON */}
          {activeTab === 'json' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#F7F4ED] border border-[var(--fw-border)]">
                <div>
                  <h4 className="font-bold text-sm text-[#1E1F19] m-0">
                    {exportScope === 'single'
                      ? `Blueprint JSON: ${spec.odcBlockName}`
                      : `Bundle Completo JSON (${totalCount} Bloques ODC)`}
                  </h4>
                  <p className="text-xs text-[var(--fw-text-muted)] m-0">
                    Estructura de datos serializada para herramientas de automatización, APIs o extensiones de Service Studio.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const filename = exportScope === 'single' ? `${spec.odcBlockName}.json` : 'Flyway_ODC_All_Components_Bundle.json';
                      downloadFile(filename, getCurrentJSONText(), 'application/json');
                    }}
                    className="btn fw-btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar .json
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(getCurrentJSONText(), 'json')}
                    className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    {copiedState === 'json' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        ¡JSON Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar JSON
                      </>
                    )}
                  </button>
                </div>
              </div>

              <pre className="p-4 rounded-xl bg-[#1E1F19] text-[#E6DB74] font-mono text-xs overflow-x-auto leading-relaxed border border-black max-h-[460px]">
                {getCurrentJSONText()}
              </pre>
            </div>
          )}
        </div>

        {/* FOOTER DEL MODAL */}
        <div className="px-5 py-3.5 bg-[#FAF8F5] border-t border-[var(--fw-border)] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[var(--fw-text-muted)]">
            <Info className="w-4 h-4 text-[#4A7C59]" />
            <span>
              {exportScope === 'single' ? (
                <>Bloque actual: <strong className="text-[#1E1F19]">{spec.odcBlockName}</strong>. Compatible con OutSystems ODC y OS11 Reactive Web.</>
              ) : (
                <>Librería completa: <strong className="text-[#1E1F19]">{totalCount} componentes</strong> listos para importar o pasar a la IA de OutSystems.</>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn fw-btn-ghost text-xs py-1.5 px-4"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(getActiveContent(), 'footer-active')}
              className="btn fw-btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              {copiedState === 'footer-active' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#4A7C59]" />
                  ¡Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar Pestaña Actual
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(getCurrentAIPrompt(), 'footer-prompt')}
              className="btn btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5 shadow-xs"
            >
              {copiedState === 'footer-prompt' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  ¡Prompt IA Copiado!
                </>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5 text-white" />
                  Copiar Prompt para IA de OutSystems
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
