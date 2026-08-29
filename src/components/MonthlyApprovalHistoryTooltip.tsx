import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Popover } from 'antd';
import api from '../lib/api';

type MonthHistory = { month: number; quantity: number };

type ApprovalHistoryResponse = {
  item: { id: string; name: string; mvpp: string; unit: string };
  department: string;
  year: number;
  months: MonthHistory[];
  total: number;
  approvedRequestCount: number;
};

interface Props {
  itemId: string;
  itemName: string;
  department?: string;
  year?: number;
  children: ReactNode;
}

const historyCache = new Map<string, ApprovalHistoryResponse>();

export default function MonthlyApprovalHistoryTooltip({
  itemId,
  itemName,
  department,
  year = new Date().getFullYear(),
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<ApprovalHistoryResponse | null>(null);
  const cacheKey = `${itemId}|${department || ''}|${year}`;

  useEffect(() => {
    if (!open || !itemId || history || loading || error) return;

    const cached = historyCache.get(cacheKey);
    if (cached) {
      setHistory(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    api.get('/requests/admin-approval-history', {
      params: { itemId, department: department || undefined, year },
    })
      .then(response => {
        if (cancelled) return;
        const data = response.data?.data || response.data;
        historyCache.set(cacheKey, data);
        setHistory(data);
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Không tải được lịch sử Hành chính duyệt');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, department, error, history, itemId, loading, open, year]);

  const months = useMemo(() => {
    const values = new Map((history?.months || []).map(month => [month.month, month.quantity]));
    return Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      quantity: values.get(index + 1) || 0,
    }));
  }, [history]);

  const content = (
    <div className="max-w-[92vw] overflow-x-auto py-1">
      {loading ? (
        <div className="w-72 py-5 text-center text-xs font-bold text-slate-500">Đang tải lịch sử duyệt...</div>
      ) : error ? (
        <div className="w-72 py-3 text-xs font-bold text-rose-600">{error}</div>
      ) : history ? (
        <div className="min-w-[780px]">
          <div className="mb-2 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Phòng ban đang đề xuất</p>
              <p className="text-xs font-black text-slate-800">{history.department}</p>
            </div>
            <p className="text-[10px] font-bold text-slate-500">
              Năm {history.year} · {history.approvedRequestCount} phiếu · theo ngày Hành chính duyệt
            </p>
          </div>
          <table className="w-full table-fixed overflow-hidden rounded-xl border border-slate-200 text-center text-[10px]">
            <thead className="bg-slate-100 font-black uppercase text-slate-500">
              <tr>
                <th className="w-52 border-r border-slate-200 px-2 py-2 text-left">Mặt hàng</th>
                {months.map(month => <th key={month.month} className="px-1 py-2">T{month.month}</th>)}
                <th className="w-14 border-l border-slate-200 px-1 py-2">Tổng</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white font-bold text-slate-700">
                <td className="border-r border-slate-200 px-2 py-2 text-left whitespace-normal">{history.item?.name || itemName}</td>
                {months.map(month => (
                  <td key={month.month} className={month.quantity > 0 ? 'px-1 py-2 font-black text-indigo-700' : 'px-1 py-2 text-slate-300'}>
                    {month.quantity > 0 ? month.quantity.toLocaleString('vi-VN') : '—'}
                  </td>
                ))}
                <td className="border-l border-slate-200 px-1 py-2 font-black text-emerald-700">{history.total.toLocaleString('vi-VN')}</td>
              </tr>
            </tbody>
          </table>
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
        if (!nextOpen) setError('');
      }}
    >
      <span className="inline-flex w-full cursor-help justify-center border-b border-dashed border-indigo-300" tabIndex={0}>
        {children}
      </span>
    </Popover>
  );
}
