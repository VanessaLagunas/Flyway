import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, AlertCircle, Check } from 'lucide-react';

export interface ODCDateRangePickerProps {
  id?: string;
  startDate: string; // ISO (YYYY-MM-DD) or DD-MM-YYYY
  endDate: string;   // ISO (YYYY-MM-DD) or DD-MM-YYYY
  onChange: (dates: { startDate: string; endDate: string; formattedRange: string }) => void;
  minDate?: string;  // Defaults to today
  labelStart?: string;
  labelEnd?: string;
  error?: string;
  className?: string;
}

// Convert any date format to YYYY-MM-DD
export function normalizeToISO(dateStr: string): string {
  if (!dateStr) return getTodayISO();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('-');
    return `${y}-${m}-${d}`;
  }
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return getTodayISO();
}

export function getTodayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysISO(isoStr: string, days: number): string {
  const [y, m, d] = isoStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const nextY = date.getFullYear();
  const nextM = String(date.getMonth() + 1).padStart(2, '0');
  const nextD = String(date.getDate()).padStart(2, '0');
  return `${nextY}-${nextM}-${nextD}`;
}

export function formatFriendlyDate(isoStr: string): string {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${d} ${months[date.getMonth()]} ${y}`;
}

/**
 * Componente Bloque de OutSystems ODC: DateRangePicker con Seguridad de Calendario
 * 
 * Reglas de seguridad:
 * 1. Fecha de Ida no puede ser en el pasado (mínimo hoy).
 * 2. Fecha de Vuelta no puede ser anterior a la fecha de Ida seleccionada.
 * 3. Si se cambia la Ida y supera a la Vuelta, la Vuelta se ajusta automáticamente.
 * 4. Calendario visual interactivo con navegación de meses y días deshabilitados de forma segura.
 */
export const ODCDateRangePicker: React.FC<ODCDateRangePickerProps> = ({
  id = 'odc-date-range-picker',
  startDate: propStartDate,
  endDate: propEndDate,
  onChange,
  minDate = getTodayISO(),
  labelStart = 'Ida',
  labelEnd = 'Vuelta',
  error,
  className = '',
}) => {
  const todayISO = getTodayISO();
  const effectiveMin = minDate || todayISO;

  // Local ISO states
  const [isoStart, setIsoStart] = useState<string>(() => {
    const norm = normalizeToISO(propStartDate);
    return norm < effectiveMin ? effectiveMin : norm;
  });

  const [isoEnd, setIsoEnd] = useState<string>(() => {
    const norm = normalizeToISO(propEndDate);
    const start = normalizeToISO(propStartDate);
    return norm < start ? addDaysISO(start, 1) : norm;
  });

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activePickingTab, setActivePickingTab] = useState<'start' | 'end'>('start');
  const [viewYearMonth, setViewYearMonth] = useState<{ year: number; month: number }>(() => {
    const [y, m] = (normalizeToISO(propStartDate) || todayISO).split('-').map(Number);
    return { year: y, month: m - 1 };
  });
  const [securityNotice, setSecurityNotice] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync when props change from outside
  useEffect(() => {
    const normStart = normalizeToISO(propStartDate);
    const validStart = normStart < effectiveMin ? effectiveMin : normStart;
    setIsoStart(validStart);

    const normEnd = normalizeToISO(propEndDate);
    const validEnd = normEnd < validStart ? addDaysISO(validStart, 1) : normEnd;
    setIsoEnd(validEnd);
  }, [propStartDate, propEndDate, effectiveMin]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    if (calendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [calendarOpen]);

  // Clear notice after 3.5 seconds
  useEffect(() => {
    if (securityNotice) {
      const timer = setTimeout(() => setSecurityNotice(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [securityNotice]);

  const emitChange = (newStart: string, newEnd: string) => {
    const formattedRange = `${formatFriendlyDate(newStart)} - ${formatFriendlyDate(newEnd)}`;
    onChange({
      startDate: newStart,
      endDate: newEnd,
      formattedRange,
    });
  };

  // Safe handler for start date change
  const handleStartChange = (newStart: string) => {
    // Cannot be earlier than effectiveMin
    const safeStart = newStart < effectiveMin ? effectiveMin : newStart;
    setIsoStart(safeStart);

    // If new start date is later than current end date, automatically adjust end date to next day
    let safeEnd = isoEnd;
    if (safeStart > isoEnd) {
      safeEnd = addDaysISO(safeStart, 1);
      setIsoEnd(safeEnd);
      setSecurityNotice(
        `Seguridad aplicada: La fecha de vuelta se ajustó automáticamente a ${formatFriendlyDate(safeEnd)} para ser posterior a la ida.`
      );
    } else {
      setSecurityNotice(null);
    }

    emitChange(safeStart, safeEnd);
  };

  // Safe handler for end date change
  const handleEndChange = (newEnd: string) => {
    // Security check: cannot be earlier than start date!
    if (newEnd < isoStart) {
      setSecurityNotice(
        `Seguridad de calendario: No puedes elegir como vuelta una fecha anterior al día de ida (${formatFriendlyDate(isoStart)}).`
      );
      // Enforce at least same day or next day
      const safeEnd = isoStart;
      setIsoEnd(safeEnd);
      emitChange(isoStart, safeEnd);
      return;
    }

    setIsoEnd(newEnd);
    setSecurityNotice(null);
    emitChange(isoStart, newEnd);
  };

  // Calendar Day Picker logic
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => {
    // 0 = Sun, 1 = Mon ... In Spanish calendars Monday is day 0
    const day = new Date(year, month, 1).getDay();
    return (day + 6) % 7;
  };

  const handlePrevMonth = () => {
    setViewYearMonth((prev) => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setViewYearMonth((prev) => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleSelectDay = (dayNum: number) => {
    const mStr = String(viewYearMonth.month + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    const selectedIso = `${viewYearMonth.year}-${mStr}-${dStr}`;

    if (activePickingTab === 'start') {
      if (selectedIso < effectiveMin) return;
      handleStartChange(selectedIso);
      setActivePickingTab('end');
    } else {
      if (selectedIso < isoStart) {
        // Enforce safety constraint
        setSecurityNotice(
          `No puedes seleccionar el ${formatFriendlyDate(selectedIso)} como vuelta porque es anterior a la fecha de ida (${formatFriendlyDate(isoStart)}).`
        );
        return;
      }
      handleEndChange(selectedIso);
      setCalendarOpen(false);
    }
  };

  // Quick duration shortcuts
  const handleQuickDuration = (days: number) => {
    const newEnd = addDaysISO(isoStart, days);
    setIsoEnd(newEnd);
    emitChange(isoStart, newEnd);
    setSecurityNotice(`Ruta configurada para ${days} día${days > 1 ? 's' : ''}.`);
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  const weekdayNames = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  const totalDays = daysInMonth(viewYearMonth.year, viewYearMonth.month);
  const startOffset = firstDayOfMonth(viewYearMonth.year, viewYearMonth.month);

  // Calculate duration in days
  const startD = new Date(isoStart);
  const endD = new Date(isoEnd);
  const diffTime = Math.abs(endD.getTime() - startD.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  return (
    <div className={`w-full relative ${className}`} ref={containerRef} id={id}>
      <div className="fw-row-2">
        {/* Campo Fecha de Ida */}
        <div>
          <label className="fw-label flex items-center justify-between">
            <span>{labelStart}</span>
            <span className="text-[11px] text-[var(--fw-text-muted)] font-normal">
              Mín: Hoy
            </span>
          </label>
          <input type="hidden" id={`${id}-start-input`} value={isoStart} readOnly />
          <button
            type="button"
            id={`${id}-start-trigger`}
            onClick={() => {
              setActivePickingTab('start');
              const [y, m] = isoStart.split('-').map(Number);
              setViewYearMonth({ year: y, month: m - 1 });
              setCalendarOpen((prev) => (activePickingTab === 'start' ? !prev : true));
            }}
            className={`form-control w-full flex items-center justify-between text-left font-semibold text-[var(--fw-text)] cursor-pointer transition-all ${
              calendarOpen && activePickingTab === 'start'
                ? 'border-[var(--color-primary)] ring-2 ring-[var(--fw-primary-soft)]'
                : 'hover:border-[var(--color-primary)]'
            }`}
            title="Seleccionar fecha de ida"
            aria-expanded={calendarOpen && activePickingTab === 'start'}
          >
            <span className="truncate">{formatFriendlyDate(isoStart)}</span>
            <Calendar className="w-4 h-4 text-[var(--color-primary)] shrink-0 ml-2" />
          </button>
        </div>

        {/* Campo Fecha de Vuelta (Con seguridad de calendario) */}
        <div>
          <label className="fw-label flex items-center justify-between">
            <span>{labelEnd}</span>
            <span className="text-[11px] text-[#4A7C59] font-medium bg-[#E1F2E2] px-1.5 py-0.5 rounded">
              {diffDays} {diffDays === 1 ? 'día' : 'días'}
            </span>
          </label>
          <input type="hidden" id={`${id}-end-input`} value={isoEnd} readOnly />
          <button
            type="button"
            id={`${id}-end-trigger`}
            onClick={() => {
              setActivePickingTab('end');
              const [y, m] = isoEnd.split('-').map(Number);
              setViewYearMonth({ year: y, month: m - 1 });
              setCalendarOpen((prev) => (activePickingTab === 'end' ? !prev : true));
            }}
            className={`form-control w-full flex items-center justify-between text-left font-semibold text-[var(--fw-text)] cursor-pointer transition-all ${
              isoEnd < isoStart
                ? 'not-valid border-red-500'
                : calendarOpen && activePickingTab === 'end'
                ? 'border-[var(--color-primary)] ring-2 ring-[var(--fw-primary-soft)]'
                : 'hover:border-[var(--color-primary)]'
            }`}
            title="Seleccionar fecha de vuelta (no puede ser anterior a la ida)"
            aria-expanded={calendarOpen && activePickingTab === 'end'}
          >
            <span className="truncate">{formatFriendlyDate(isoEnd)}</span>
            <Calendar className="w-4 h-4 text-[var(--color-primary)] shrink-0 ml-2" />
          </button>
        </div>
      </div>

      {/* Mensaje de Seguridad / Ayuda */}
      {securityNotice && (
        <div
          className="mt-2.5 p-2.5 rounded-lg bg-[#FAF0DC] border border-[#8B6F3E]/30 text-[#8B6F3E] text-xs flex items-start gap-2 animate-fadeIn"
          role="status"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#8B6F3E]" />
          <span>{securityNotice}</span>
        </div>
      )}

      {error && (
        <div className="fw-field-error mt-1" role="alert">
          {error}
        </div>
      )}

      {/* Resumen dinámico de duración y atajos rápidos */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--fw-text-muted)]">
        <span>
          Duración seleccionada: <strong className="text-[var(--fw-text)]">{diffDays} {diffDays === 1 ? 'día' : 'días'}</strong> ({formatFriendlyDate(isoStart)} al {formatFriendlyDate(isoEnd)})
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleQuickDuration(1)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
              diffDays === 2
                ? 'bg-[#E1F2E2] text-[#2F4F39] border-[#4A7C59]/40 font-bold'
                : 'bg-[#FAF8F5] text-[var(--fw-text-muted)] border-[var(--fw-border)] hover:bg-[#F0ECE1]'
            }`}
          >
            2 días
          </button>
          <button
            type="button"
            onClick={() => handleQuickDuration(2)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
              diffDays === 3
                ? 'bg-[#E1F2E2] text-[#2F4F39] border-[#4A7C59]/40 font-bold'
                : 'bg-[#FAF8F5] text-[var(--fw-text-muted)] border-[var(--fw-border)] hover:bg-[#F0ECE1]'
            }`}
          >
            3 días
          </button>
          <button
            type="button"
            onClick={() => handleQuickDuration(4)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
              diffDays === 5
                ? 'bg-[#E1F2E2] text-[#2F4F39] border-[#4A7C59]/40 font-bold'
                : 'bg-[#FAF8F5] text-[var(--fw-text-muted)] border-[var(--fw-border)] hover:bg-[#F0ECE1]'
            }`}
          >
            5 días
          </button>
        </div>
      </div>

      {/* POPUP DE CALENDARIO VISUAL INTERACTIVO */}
      {calendarOpen && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-[var(--fw-border)] p-2.5 sm:p-4 max-w-sm mx-auto">
          {/* Header de pestañas Ida / Vuelta */}
          <div className="flex bg-[#F0ECE1] rounded-lg p-1 mb-3">
            <button
              type="button"
              className={`flex-1 py-1.5 px-1 sm:px-2 text-[11px] sm:text-xs truncate font-semibold rounded-md transition-all ${

                activePickingTab === 'start'
                  ? 'bg-white text-[#1E1F19] shadow-sm'
                  : 'text-[#6B6A63] hover:text-[#1E1F19]'
              }`}
              onClick={() => setActivePickingTab('start')}
            >
              1. Ida: {formatFriendlyDate(isoStart)}
            </button>
            <button
              type="button"
              className={`flex-1 py-1.5 px-1 sm:px-2 text-[11px] sm:text-xs truncate font-semibold rounded-md transition-all ${

                activePickingTab === 'end'
                  ? 'bg-white text-[#1E1F19] shadow-sm'
                  : 'text-[#6B6A63] hover:text-[#1E1F19]'
              }`}
              onClick={() => setActivePickingTab('end')}
            >
              2. Vuelta: {formatFriendlyDate(isoEnd)}
            </button>
          </div>

          {/* Navegación del mes */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-full hover:bg-[var(--fw-sand)] text-[var(--fw-text)] transition-colors"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm text-[var(--fw-text)]">
              {monthNames[viewYearMonth.month]} {viewYearMonth.year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-full hover:bg-[var(--fw-sand)] text-[var(--fw-text)] transition-colors"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Cabecera de días de la semana */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[var(--fw-text-muted)] mb-1">
            {weekdayNames.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          {/* Cuadrícula de días */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {/* Celdas vacías de desfase */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`offset-${i}`} className="h-8" />
            ))}

            {/* Días del mes con reglas de seguridad */}
            {Array.from({ length: totalDays }).map((_, i) => {
              const dayNum = i + 1;
              const mStr = String(viewYearMonth.month + 1).padStart(2, '0');
              const dStr = String(dayNum).padStart(2, '0');
              const currentIso = `${viewYearMonth.year}-${mStr}-${dStr}`;

              // REGLA DE SEGURIDAD 1: Ida no puede ser anterior a hoy
              const isPastDate = currentIso < effectiveMin;

              // REGLA DE SEGURIDAD 2: Si estamos eligiendo vuelta, no puede ser anterior a la ida seleccionada
              const isBeforeStart = activePickingTab === 'end' && currentIso < isoStart;

              const isDisabled = isPastDate || isBeforeStart;

              const isStartSelected = currentIso === isoStart;
              const isEndSelected = currentIso === isoEnd;
              const isInRange = currentIso > isoStart && currentIso < isoEnd;

              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-8 w-8 mx-auto rounded-full flex items-center justify-center font-medium transition-all ${
                    isDisabled
                      ? 'text-gray-300 cursor-not-allowed line-through opacity-40'
                      : isStartSelected || isEndSelected
                      ? 'bg-[#4A7C59] text-white font-bold shadow'
                      : isInRange
                      ? 'bg-[#E1F2E2] text-[#366447] font-semibold'
                      : 'hover:bg-[#E0D4BC]/40 text-[#1E1F19]'
                  }`}
                  title={
                    isPastDate
                      ? 'No disponible: Fecha pasada'
                      : isBeforeStart
                      ? `Bloqueado por seguridad: Anterior a la fecha de ida (${formatFriendlyDate(isoStart)})`
                      : `Seleccionar ${dayNum} de ${monthNames[viewYearMonth.month]}`
                  }
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Atajos de duración rápida */}
          <div className="mt-3 pt-3 border-t border-[var(--fw-border)] flex flex-wrap gap-1.5 items-center justify-between text-[11px]">
            <span className="text-[var(--fw-text-muted)]">Atajos:</span>
            <div className="flex gap-1">
              <button
                type="button"
                className="px-2 py-0.5 rounded bg-[#F0ECE1] hover:bg-[#E0D4BC] text-[#1E1F19] font-medium"
                onClick={() => handleQuickDuration(2)}
              >
                Fin de semana (2d)
              </button>
              <button
                type="button"
                className="px-2 py-0.5 rounded bg-[#F0ECE1] hover:bg-[#E0D4BC] text-[#1E1F19] font-medium"
                onClick={() => handleQuickDuration(3)}
              >
                Puente (3d)
              </button>
              <button
                type="button"
                className="px-2 py-0.5 rounded bg-[#F0ECE1] hover:bg-[#E0D4BC] text-[#1E1F19] font-medium"
                onClick={() => handleQuickDuration(7)}
              >
                1 Semana (7d)
              </button>
            </div>
          </div>

          {/* Botón Listo */}
          <div className="mt-3">
            <button
              type="button"
              className="btn btn-primary w-full py-1.5 text-xs flex items-center justify-center gap-1.5"
              onClick={() => setCalendarOpen(false)}
            >
              <Check className="w-3.5 h-3.5" />
              Confirmar Fechas ({diffDays} días)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
