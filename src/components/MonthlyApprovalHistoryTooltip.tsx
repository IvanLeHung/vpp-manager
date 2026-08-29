import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Popover } from 'antd';
import api from '../lib/api';

type MonthHistory = { month: number; quantity: number };

type ApprovalHistoryResponse = {
  item: { id: string; name: string; mvpp: string; unit: string };
  department: string;
  departmentId?: string | null;
  year: number;
  months: MonthHistory[];
  total: number;
  approvedRequestCount: number;
};

interface Props {
  itemId: string;
  itemName: string;
  department?: string;
  departmentId?: string | null;
  requestId?: string;
  year?: number;
  children: ReactNode;
}

const historyCache = new Map<string, ApprovalHistoryResponse>();

export default function MonthlyApprovalHistoryTooltip({
  itemId,
  itemName,
  department,
  departmentId,
  requestId,
  year = new Date().getFullYear(),
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<ApprovalHistoryResponse | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const cacheKey = `${itemId}|${requestId || ''}|${departmentId || ''}|${department || ''}|${year}`;

  useEffect(() => {
    if (!open || !itemId) return;

    const cached = historyCache.get(cacheKey);
    if (cached) {
      setHistory(cached);
      setLoading(false);
      setError('');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setHistory(null);
    setError('');
    api.get('/requests/admin-approval-history', {
      params: {
        itemId,
        requestId: requestId || undefined,
        departmentId: departmentId || undefined,
        department: department || undefined,
        year,
      },
      timeout: 15000,
    })
      .then(response => {
        if (cancelled) return;
        const data = response.data?.data || response.data;
        historyCache.set(cacheKey, data);
        setHistory(data);
      })
      .catch(err => {
        if (!cancelled) {
          setError(
            err.code === 'ECONNABORTED'
              ? 'Máy chủ phản hồi quá chậm (quá 15 giây).'
              : err.response?.data?.error || 'Không tải được lịch sử Hành chính duyệt'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, department, departmentId, itemId, open, requestId, retryToken, year]);

  const months = useMemo(() => {
    const values = new Map((history?.months || []).map(month => [month.month, month.quantity]));
    return Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      quantity: values.get(index + 1) || 0,
    }));
  }, [history]);

  const content = (
    <div className="max-w-[calc(100vw-32px)] py-1">
      {loading ? (
        <div className="w-[360px] max-w-full py-5 text-center text-xs font-bold text-slate-500">Đang tổng hợp theo phòng ban...</div>
      ) : error ? (
        <div className="w-[360px] max-w-full py-3 text-center text-xs font-bold text-rose-600">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setRetryToken(token => token + 1)}
            className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-black uppercase text-rose-700 hover:bg-rose-100"
          >
            Thử lại
          </button>
        </div>
      ) : history ? (
        <div className="w-[620px] max-w-full">
          <div className="mb-3 flex items-start justify-between gap-4 border-b border-slate-200 pb-2.5">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-indigo-600">Lịch sử Hành chính duyệt</p>
              <p className="mt-0.5 truncate text-sm font-black text-slate-900">{history.department}</p>
              <p className="mt-1 truncate text-[11px] font-semibold text-slate-500" title={history.item?.name || itemName}>
                {history.item?.name || itemName}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="inline-flex rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-700">Năm {history.year}</span>
              <p className="mt-1 text-[10px] font-bold text-slate-400">{history.approvedRequestCount} phiếu đã duyệt</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {months.map(month => (
              <div
                key={month.month}
                className={`rounded-lg border px-2 py-1.5 text-center ${month.quantity > 0 ? 'border-indigo-200 bg-indigo-50/70' : 'border-slate-200 bg-slate-50'}`}
              >
                <p className="text-[9px] font-black uppercase text-slate-400">Tháng {month.month}</p>
                <p className={`mt-0.5 text-sm font-black tabular-nums ${month.quantity > 0 ? 'text-indigo-700' : 'text-slate-300'}`}>
                  {month.quantity > 0 ? month.quantity.toLocaleString('vi-VN') : '—'}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-2.5 flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2 text-white">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Cộng tất cả người đề xuất cùng phòng ban</p>
              <p className="text-[10px] font-semibold text-slate-300">Tính theo ngày Hành chính duyệt</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase text-slate-400">Tổng</p>
              <p className="text-lg font-black tabular-nums text-emerald-400">{history.total.toLocaleString('vi-VN')}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger={['hover', 'focus']}
      placement="top"
      mouseEnterDelay={0.2}
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
      }}
    >
      <span className="inline-flex w-full cursor-help justify-center border-b border-dashed border-indigo-300" tabIndex={0}>
        {children}
      </span>
    </Popover>
  );
}
