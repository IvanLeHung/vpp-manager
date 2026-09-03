import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

export type ProposalDateSelection = {
  params: { dates?: string; startDate?: string; endDate?: string };
  label: string;
};

export function bangkokDateKey(now = new Date()): string {
  return new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export const formatReportDate = (key: string) => key.split('-').reverse().join('/');

function monthSelection(startMonth: string, endMonth = startMonth): ProposalDateSelection {
  const [year, month] = endMonth.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    params: { startDate: `${startMonth}-01`, endDate: `${endMonth}-${lastDay}` },
    label: startMonth === endMonth
      ? `Tháng ${formatReportDate(startMonth)}`
      : `Từ tháng ${formatReportDate(startMonth)} đến tháng ${formatReportDate(endMonth)}`,
  };
}

export function currentProposalMonth(): ProposalDateSelection {
  return monthSelection(bangkokDateKey().slice(0, 7));
}

type DayMode = 'single' | 'multi' | 'range';
const dayModes: { id: DayMode; name: string; description: string }[] = [
  { id: 'single', name: '1 ngày', description: 'Chọn một ngày duy nhất' },
  { id: 'multi', name: 'Nhiều ngày', description: 'Chọn các ngày rời rạc' },
  { id: 'range', name: 'Khoảng ngày', description: 'Chọn ngày bắt đầu và kết thúc' },
];

export default function ProposalDateFilter({ onChange }: { onChange: (value: ProposalDateSelection) => void }) {
  const [tab, setTab] = useState<'day' | 'month'>('day');
  const [expanded, setExpanded] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => bangkokDateKey().slice(0, 7));
  const [mode, setMode] = useState<DayMode>('single');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [hoverDay, setHoverDay] = useState('');
  const [monthStart, setMonthStart] = useState('');
  const [monthEnd, setMonthEnd] = useState('');
  const [monthMode, setMonthMode] = useState<'single' | 'range'>('single');
  const [year, month] = viewMonth.split('-').map(Number);

  const selection = useMemo<ProposalDateSelection>(() => {
    if (tab === 'month') return monthSelection(monthStart || viewMonth, monthEnd || monthStart || viewMonth);
    if (mode === 'range' && rangeStart) {
      const end = rangeEnd || rangeStart;
      return {
        params: { startDate: rangeStart, endDate: end },
        label: rangeStart === end ? `Ngày ${formatReportDate(rangeStart)}` : `Từ ${formatReportDate(rangeStart)} đến ${formatReportDate(end)}`,
      };
    }
    if (mode !== 'range' && selectedDays.length) {
      const days = [...selectedDays].sort();
      return { params: { dates: days.join(',') }, label: `Ngày ${days.map(formatReportDate).join(', ')}` };
    }
    return monthSelection(viewMonth);
  }, [tab, mode, selectedDays, rangeStart, rangeEnd, monthStart, monthEnd, viewMonth]);

  useEffect(() => onChange(selection), [selection, onChange]);

  const days = useMemo(() => {
    const first = new Date(Date.UTC(year, month - 1, 1));
    const offset = (first.getUTCDay() + 6) % 7;
    const length = Math.ceil((offset + new Date(Date.UTC(year, month, 0)).getUTCDate()) / 7) * 7;
    return Array.from({ length }, (_, index) => {
      const date = new Date(Date.UTC(year, month - 1, index - offset + 1));
      return { key: date.toISOString().slice(0, 10), day: date.getUTCDate(), current: date.getUTCMonth() === month - 1 };
    });
  }, [year, month]);

  const moveCalendar = (direction: number) => {
    const next = new Date(Date.UTC(year + (tab === 'month' ? direction : 0), month - 1 + (tab === 'day' ? direction : 0), 1));
    setViewMonth(next.toISOString().slice(0, 7));
  };

  const clearDays = () => { setSelectedDays([]); setRangeStart(''); setRangeEnd(''); setHoverDay(''); };
  const reset = () => {
    clearDays(); setMonthStart(''); setMonthEnd(''); setViewMonth(bangkokDateKey().slice(0, 7));
  };
  const selectDay = (day: string) => {
    if (mode === 'single') setSelectedDays(previous => previous[0] === day ? [] : [day]);
    else if (mode === 'multi') setSelectedDays(previous => previous.includes(day) ? previous.filter(value => value !== day) : [...previous, day]);
    else if (!rangeStart || rangeEnd) { setRangeStart(day); setRangeEnd(''); }
    else { setRangeStart(day < rangeStart ? day : rangeStart); setRangeEnd(day < rangeStart ? rangeStart : day); }
  };
  const selectMonth = (value: string) => {
    if (monthMode === 'single' || !monthStart || monthEnd) { setMonthStart(value); setMonthEnd(''); }
    else { setMonthStart(value < monthStart ? value : monthStart); setMonthEnd(value < monthStart ? monthStart : value); }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Lọc theo ngày tạo phiếu">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <CalendarDays className="h-4 w-4 text-indigo-600" aria-hidden="true" />
        <span className="text-xs font-semibold text-slate-600">Lọc theo ngày tạo phiếu</span>
        <div className="inline-flex gap-1 rounded-lg bg-slate-100 p-1">
          {(['day', 'month'] as const).map(value => (
            <button key={value} type="button" aria-pressed={tab === value} onClick={() => { setTab(value); setExpanded(true); }} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${tab === value ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
              {value === 'day' ? 'Theo ngày' : 'Theo tháng'}
            </button>
          ))}
        </div>
        <button type="button" onClick={reset} className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600"><RotateCcw className="h-3.5 w-3.5" /> Tháng hiện tại</button>
        <button type="button" aria-expanded={expanded} aria-controls="proposal-date-options" onClick={() => setExpanded(value => !value)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
          {expanded ? 'Thu gọn' : 'Mở bộ lọc'}<ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {expanded ? (
        <div id="proposal-date-options" className="flex flex-col gap-5 border-t border-slate-100 px-4 py-4 sm:flex-row">
          <div className="w-[248px] shrink-0">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" aria-label={tab === 'day' ? 'Tháng trước' : 'Năm trước'} onClick={() => moveCalendar(-1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-xs font-bold text-slate-700">{tab === 'day' ? `Tháng ${month}/${year}` : `Năm ${year}`}</span>
              <button type="button" aria-label={tab === 'day' ? 'Tháng sau' : 'Năm sau'} onClick={() => moveCalendar(1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button>
            </div>
            {tab === 'day' ? <>
              <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label, index) => <span key={label} className={index === 6 ? 'text-rose-500' : index === 5 ? 'text-indigo-500' : ''}>{label}</span>)}</div>
              <div className="grid grid-cols-7 gap-1" onMouseLeave={() => setHoverDay('')}>
                {days.map(day => {
                  const end = rangeEnd || hoverDay;
                  const inRange = mode === 'range' && rangeStart && end && day.key >= (rangeStart < end ? rangeStart : end) && day.key <= (rangeStart > end ? rangeStart : end);
                  const selected = mode === 'range' ? day.key === rangeStart || day.key === rangeEnd : selectedDays.includes(day.key);
                  return <button key={day.key} type="button" disabled={!day.current} aria-label={formatReportDate(day.key)} aria-pressed={Boolean(selected)} onMouseEnter={() => setHoverDay(day.key)} onFocus={() => setHoverDay(day.key)} onClick={() => selectDay(day.key)} className={`h-8 rounded-md border text-xs tabular-nums transition-colors ${!day.current ? 'border-transparent text-slate-200' : selected ? 'border-indigo-600 bg-indigo-600 font-bold text-white' : inRange ? 'border-indigo-100 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-400'}`}>{day.day}</button>;
                })}
              </div>
            </> : <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }, (_, index) => {
                const key = `${year}-${String(index + 1).padStart(2, '0')}`;
                const selected = key === monthStart || key === monthEnd || (!monthStart && key === viewMonth);
                const inRange = monthStart && monthEnd && key >= monthStart && key <= monthEnd;
                return <button key={key} type="button" aria-pressed={Boolean(selected || inRange)} onClick={() => selectMonth(key)} className={`rounded-lg border px-2 py-2.5 text-xs font-semibold ${selected ? 'border-indigo-600 bg-indigo-600 text-white' : inRange ? 'border-indigo-100 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-indigo-300'}`}>Tháng {index + 1}</button>;
              })}
            </div>}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Chế độ chọn {tab === 'day' ? 'ngày' : 'tháng'}</p>
            <div className="grid gap-1.5">
              {tab === 'day' ? dayModes.map(option => <button key={option.id} type="button" aria-pressed={mode === option.id} onClick={() => { setMode(option.id); clearDays(); }} className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-left text-xs ${mode === option.id ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><span className="font-bold">{option.name}</span><span className={mode === option.id ? 'text-indigo-100' : 'text-slate-400'}>{option.description}</span></button>) : (['single', 'range'] as const).map(value => <button key={value} type="button" aria-pressed={monthMode === value} onClick={() => { setMonthMode(value); setMonthStart(''); setMonthEnd(''); }} className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold ${monthMode === value ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 text-slate-600'}`}>{value === 'single' ? 'Một tháng' : 'Khoảng tháng — chọn tháng bắt đầu và kết thúc'}</button>)}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3" aria-live="polite">
              <p className="mb-1 text-[10px] font-semibold uppercase text-slate-400">Đang lọc theo</p>
              <p className="break-words text-xs font-semibold leading-relaxed text-indigo-700">{selection.label}</p>
              {tab === 'day' && mode === 'range' && rangeStart && !rangeEnd && <p className="mt-1 text-xs text-slate-500">Chọn ngày kết thúc để hoàn tất khoảng ngày.</p>}
              {tab === 'month' && monthMode === 'range' && monthStart && !monthEnd && <p className="mt-1 text-xs text-slate-500">Chọn tháng kết thúc để hoàn tất khoảng tháng.</p>}
              <p className="mt-2 text-[11px] text-slate-500">Dùng ngày tạo phiếu đề xuất, theo giờ Việt Nam.</p>
            </div>
            <button type="button" onClick={() => { clearDays(); setMonthStart(''); setMonthEnd(''); }} className="self-start text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-indigo-600">Xóa lựa chọn, xem cả tháng đang mở</button>
          </div>
        </div>
      ) : <p className="border-t border-slate-100 px-4 py-2 text-xs font-medium text-indigo-700">{selection.label}</p>}
    </section>
  );
}
