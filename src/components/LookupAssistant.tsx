import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Send, X, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { getRequestStatusLabel } from '../lib/statusLabels';

interface Result { label: string; description?: string; href?: string; status?: string; purchaseStatus?: string }
interface Message { role: 'user' | 'assistant'; text: string; results?: Result[]; queriedAt?: string }
const welcome: Message = { role: 'assistant', text: 'Chào bạn! Tôi hỗ trợ tra cứu dữ liệu hệ thống theo mẫu, miễn phí và không dùng API AI bên ngoài. Nhập mã phiếu hoặc chọn câu hỏi gợi ý. Tôi chỉ đọc dữ liệu, không sửa hay duyệt phiếu.' };
const purchaseLabels: Record<string, string> = { DRAFT: 'Nháp', PENDING_APPROVAL: 'Chờ duyệt', PARTIALLY_APPROVED: 'Duyệt một phần', APPROVED: 'Chờ mua sắm', ORDERED: 'Chờ giao', DELIVERING: 'Đang giao', PARTIALLY_DELIVERED: 'Giao một phần', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy', REJECTED: 'Từ chối' };
const safeHref = (href?: string) => href && /^\/(?:requests|purchase-orders)(?:\/[a-zA-Z0-9%_-]+)?$/.test(href) ? href : undefined;

export default function LookupAssistant({ role }: { role?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const privileged = role === 'ADMIN';
  const suggestions = ['Phiếu chờ duyệt', 'Tồn kho: Giấy A4', ...(privileged ? ['Tổng chi tháng này'] : [])];
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => { if (open) end.current?.scrollIntoView({ block: 'nearest' }); }, [messages, pending, open]);
  const close = () => { setOpen(false); launcher.current?.focus(); };

  async function send(value: string) {
    const text = value.trim();
    if (!text || text.length > 300 || controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setPending(true); setQuestion('');
    setMessages(previous => [...previous.slice(-39), { role: 'user', text }]);
    try {
      const { data } = await api.post('/assistant/query', { question: text }, { signal: request.signal, timeout: 30000 });
      if (typeof data?.text !== 'string' || !Array.isArray(data.results)) throw new Error('Invalid response');
      setMessages(previous => [...previous, { role: 'assistant', text: data.text, results: data.results, queriedAt: data.queriedAt }]);
    } catch (error: unknown) {
      if (request.signal.aborted) return;
      const status = (error as { response?: { status?: number } }).response?.status;
      const text = status === 404 ? 'Trợ lý chưa được cập nhật trên máy chủ. Vui lòng thử lại sau khi triển khai backend.'
        : status === 429 ? 'Bạn tra cứu quá nhanh. Vui lòng chờ một phút rồi thử lại.'
        : status === 403 ? 'Tài khoản hiện chưa được phép tra cứu.'
        : 'Chưa lấy được dữ liệu từ máy chủ. Hãy thử lại. Đây không phải kết quả không có phiếu.';
      setMessages(previous => [...previous, { role: 'assistant', text }]);
      setQuestion(previous => previous || value);
    } finally {
      if (!request.signal.aborted) { controller.current = null; setPending(false); }
    }
  }

  return <div className="fixed bottom-4 right-4 z-[60] print:hidden lg:bottom-20 lg:left-4 lg:right-auto">
    {open && <section role="dialog" aria-label="Trợ lý tra cứu" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } }}
      className="absolute bottom-16 right-0 flex h-[min(620px,calc(100dvh-110px))] w-[min(420px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg text-sm text-slate-800 lg:left-0 lg:right-auto">
      <header className="flex items-center justify-between border-b border-slate-200 bg-indigo-50 p-4">
        <div><h2 className="font-bold text-indigo-700">Trợ lý tra cứu</h2><p className="mt-1 text-xs text-slate-500">Theo mẫu · Dữ liệu theo quyền tài khoản</p></div>
        <button type="button" onClick={close} aria-label="Đóng trợ lý" className="rounded-lg p-2 hover:bg-indigo-100"><X size={18} /></button>
      </header>
      <div role="log" aria-live="polite" aria-relevant="additions" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message, i) => <div key={i} className={`rounded-xl p-3 ${message.role === 'user' ? 'ml-8 bg-indigo-600 text-white' : 'mr-2 bg-slate-50'}`}>
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
          {message.results?.map((result, index) => <div key={index} className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
            {safeHref(result.href) ? <Link onClick={close} to={safeHref(result.href)!} className="font-semibold text-indigo-700 underline">{result.label}</Link> : <p className="font-semibold">{result.label}</p>}
            {result.status && <p className="mt-1 text-xs text-indigo-700">{getRequestStatusLabel(result.status)}</p>}
            {result.purchaseStatus && <p className="mt-1 text-xs text-indigo-700">{purchaseLabels[result.purchaseStatus] || result.purchaseStatus}</p>}
            {result.description && <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{result.description}</p>}
          </div>)}
          {message.queriedAt && <p className="mt-2 text-[11px] text-slate-500">Tra cứu lúc {new Date(message.queriedAt).toLocaleString('vi-VN')}</p>}
        </div>)}
        {pending && <p role="status" className="flex items-center gap-2 text-slate-500"><Loader2 size={16} className="animate-spin" />Đang tra cứu…</p>}
        <div ref={end} />
      </div>
      <div className="border-t border-slate-200 p-3">
        <button type="button" onClick={() => setShowExamples(!showExamples)} aria-expanded={showExamples} className="mb-2 text-xs font-semibold text-indigo-700 underline">{showExamples ? 'Thu gọn thoại mẫu' : 'Xem các thoại mẫu / Hướng dẫn'}</button>
        {showExamples && <div className="mb-3 max-h-40 overflow-y-auto rounded-lg bg-slate-50 p-2 text-xs">
          <p className="mb-2 text-slate-500">Chọn mẫu để điền vào ô nhập; bạn có thể sửa trước khi gửi.</p>
          {['Các câu hỏi mẫu', 'Cách tạo đề xuất', 'Cách hiệu chỉnh giá', 'Cách đổi vật tư', 'Cách in VPP / VS', 'Tồn kho: ', ...(privileged ? ['Tổng chi tháng 9/2026'] : [])].map(sample => <button type="button" key={sample} onClick={() => { setQuestion(sample); input.current?.focus(); }} className="mb-1 mr-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-left hover:bg-indigo-50">{sample}</button>)}
          <p className="mt-1 text-slate-500">Tra phiếu: nhập mã PDX/PO/PR thực tế của bạn. Chatbot chỉ hướng dẫn, không tự hiệu chỉnh dữ liệu.</p>
        </div>}
        <div className="mb-3 flex flex-wrap gap-2">{suggestions.map(value => <button key={value} type="button" disabled={pending} onClick={() => void send(value)} className="rounded-lg border border-indigo-200 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">{value}</button>)}</div>
        <form onSubmit={e => { e.preventDefault(); void send(question); }} className="flex gap-2">
          <input ref={input} aria-label="Câu hỏi tra cứu" value={question} onChange={e => setQuestion(e.target.value)} maxLength={300} placeholder="Nhập mã PDX/PO hoặc câu hỏi…" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
          <button type="submit" aria-label="Gửi câu hỏi" disabled={pending || !question.trim()} className="rounded-lg bg-indigo-600 px-3 text-white disabled:opacity-40"><Send size={18} /></button>
        </form>
      </div>
    </section>}
    <button ref={launcher} type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-indigo-700"><MessageCircle size={20} /><span>Tra cứu</span></button>
  </div>;
}
