import { useState, useEffect, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import api from '../lib/api';
import { 
  TrendingUp, Download, Clock, CheckCircle, RefreshCw, 
  FileText, Printer, ArrowUpRight, ArrowDownRight, Package, 
  Activity, AlertTriangle, PlusCircle, Search, RefreshCcw, 
  X, CheckCircle2, User, ChevronDown, Landmark, Building2, HelpCircle,
  ExternalLink, AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

interface VppItem {
  name: string;
  unit: string;
  qtyRequested: number;
  qtyApproved: number;
  qtyReceived: number;
  status: 'Đã nhận đủ' | 'Nhận thiếu' | 'Chưa nhận' | 'Nhận sai hàng' | 'Chờ bổ sung' | 'Chờ giao hàng';
  note: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

interface DeliveryTicket {
  id: string; // PDX-VPP-YYYYMMDD-XXX
  date: string;
  department: string;
  requester: string;
  approver: string;
  approvalDate: string;
  approvalStatus: string;
  deliveryStatus: 'RECEIVED_FULL' | 'RECEIVED_SHORT' | 'WRONG_ITEMS' | 'PENDING';
  deliveryDate?: string;
  deliverer?: string;
  receiver?: string;
  delivererSignature?: string;
  receiverSignature?: string;
  generalNote?: string;
  items: VppItem[];
}

const TEMPLATE_ITEMS = [
  { name: 'Giấy A4', unit: 'Ram' },
  { name: 'Bút bi', unit: 'Cái' },
  { name: 'Bìa hồ sơ', unit: 'Cái' },
  { name: 'Kẹp giấy', unit: 'Hộp' },
  { name: 'Mực máy in', unit: 'Lọ' },
  { name: 'Sổ tay', unit: 'Cuốn' },
  { name: 'Nước rửa tay', unit: 'Chai' },
  { name: 'Khăn giấy', unit: 'Gói' }
];

const INITIAL_TICKETS: DeliveryTicket[] = [
  {
    id: "PDX-VPP-20260501-001",
    date: "2026-05-01",
    department: "Phòng Hành chính",
    requester: "Nguyễn Văn A",
    approver: "Trần Thị B",
    approvalDate: "2026-05-02",
    approvalStatus: "APPROVED",
    deliveryStatus: "RECEIVED_FULL",
    deliveryDate: "2026-05-03",
    deliverer: "Lê Văn Giao",
    receiver: "Nguyễn Văn A",
    delivererSignature: "Lê Văn Giao",
    receiverSignature: "Nguyễn Văn A",
    generalNote: "Giao đủ hàng đợt 1",
    items: [
      { name: "Giấy A4", unit: "Ram", qtyRequested: 10, qtyApproved: 10, qtyReceived: 10, status: "Đã nhận đủ", note: "Nhận đủ giấy A4 bãi bằng" },
      { name: "Bút bi", unit: "Cái", qtyRequested: 50, qtyApproved: 50, qtyReceived: 50, status: "Đã nhận đủ", note: "Nhận đủ bút Thiên Long" },
      { name: "Bìa hồ sơ", unit: "Cái", qtyRequested: 20, qtyApproved: 20, qtyReceived: 20, status: "Đã nhận đủ", note: "" }
    ]
  },
  {
    id: "PDX-VPP-20260510-002",
    date: "2026-05-10",
    department: "Phòng Kế toán",
    requester: "Lê Văn C",
    approver: "Trần Thị B",
    approvalDate: "2026-05-11",
    approvalStatus: "APPROVED",
    deliveryStatus: "RECEIVED_SHORT",
    deliveryDate: "2026-05-12",
    deliverer: "Lê Văn Giao",
    receiver: "Lê Văn C",
    delivererSignature: "Lê Văn Giao",
    receiverSignature: "Lê Văn C",
    generalNote: "Nhà cung cấp hết hàng kẹp giấy và mực in",
    items: [
      { name: "Kẹp giấy", unit: "Hộp", qtyRequested: 30, qtyApproved: 30, qtyReceived: 20, status: "Nhận thiếu", note: "Thiếu 10 hộp do NCC hết hàng" },
      { name: "Mực máy in", unit: "Lọ", qtyRequested: 5, qtyApproved: 4, qtyReceived: 4, status: "Đã nhận đủ", note: "" },
      { name: "Sổ tay", unit: "Cuốn", qtyRequested: 15, qtyApproved: 12, qtyReceived: 0, status: "Chưa nhận", note: "Chưa giao sổ tay da" }
    ]
  },
  {
    id: "PDX-VPP-20260515-003",
    date: "2026-05-15",
    department: "Phòng Kinh doanh",
    requester: "Phạm Văn D",
    approver: "Trần Thị B",
    approvalDate: "2026-05-16",
    approvalStatus: "APPROVED",
    deliveryStatus: "WRONG_ITEMS",
    deliveryDate: "2026-05-17",
    deliverer: "Lê Văn Giao",
    receiver: "Phạm Văn D",
    delivererSignature: "Lê Văn Giao",
    receiverSignature: "Phạm Văn D",
    generalNote: "Khăn giấy nhận sai loại",
    items: [
      { name: "Nước rửa tay", unit: "Chai", qtyRequested: 10, qtyApproved: 10, qtyReceived: 10, status: "Đã nhận đủ", note: "" },
      { name: "Khăn giấy", unit: "Gói", qtyRequested: 100, qtyApproved: 80, qtyReceived: 80, status: "Nhận sai hàng", note: "Nhận sai mẫu khăn giấy cuộn thay vì khăn hộp" },
      { name: "Giấy A4", unit: "Ram", qtyRequested: 5, qtyApproved: 5, qtyReceived: 5, status: "Đã nhận đủ", note: "" }
    ]
  }
];

export default function Analytics() {
  const { currentUser } = useAppContext();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<DeliveryTicket[]>([]);
  
  const departmentsList = useMemo(() => {
    const depts = new Set(tickets.map(t => t.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [tickets]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'report' | 'tickets'>('report');
  
  // ── FILTER STATES ──
  const [deptFilter, setDeptFilter] = useState('ALL');
  const today = new Date();

  // Calendar tab: "day" | "month"
  const [calendarTab, setCalendarTab] = useState<'day' | 'month'>('day');

  // Day-tab: month/year currently displayed in calendar
  const [calViewMonth, setCalViewMonth] = useState(today.getMonth() + 1);
  const [calViewYear, setCalViewYear] = useState(today.getFullYear());

  // Day-tab selection mode
  type DayMode = 'single' | 'multi' | 'range';
  const [dayMode, setDayMode] = useState<DayMode>('single');

  // For single / multi mode
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // For range mode
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [hoverDay, setHoverDay] = useState<string | null>(null);

  // Month-tab
  const [monthRangeStart, setMonthRangeStart] = useState<{ month: number; year: number } | null>(null);
  const [monthRangeEnd, setMonthRangeEnd] = useState<{ month: number; year: number } | null>(null);
  const [appliedMonthRange, setAppliedMonthRange] = useState<{ start: { month: number; year: number }; end: { month: number; year: number } } | null>(null);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list = [];
    for (let y = currentYear - 3; y <= currentYear + 2; y++) {
      list.push(y);
    }
    return list;
  }, []);

  // Helper: compare two date strings YYYY-MM-DD
  const dateCompare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

  // Helper: is a day within range (handles swapped start/end)
  const isDayInRange = (dateStr: string, start: string | null, end: string | null) => {
    if (!start || !end) return false;
    const lo = dateCompare(start, end) <= 0 ? start : end;
    const hi = dateCompare(start, end) <= 0 ? end : start;
    return dateStr >= lo && dateStr <= hi;
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfWeek = (month: number, year: number) => {
    const day = new Date(year, month - 1, 1).getDay();
    return day === 0 ? 6 : day - 1; // convert Sunday=0 to index 6, Monday=1 to index 0
  };

  const renderCalendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(calViewMonth, calViewYear);
    const firstDayIndex = getFirstDayOfWeek(calViewMonth, calViewYear);
    
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];
    
    // Previous month days
    const prevMonth = calViewMonth === 1 ? 12 : calViewMonth - 1;
    const prevYear = calViewMonth === 1 ? calViewYear - 1 : calViewYear;
    const daysInPrevMonth = getDaysInMonth(prevMonth, prevYear);
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const mStr = String(prevMonth).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      days.push({
        dateStr: `${prevYear}-${mStr}-${dStr}`,
        dayNum: d,
        isCurrentMonth: false
      });
    }
    
    // Current month days
    const mStr = String(calViewMonth).padStart(2, '0');
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = String(d).padStart(2, '0');
      days.push({
        dateStr: `${calViewYear}-${mStr}-${dStr}`,
        dayNum: d,
        isCurrentMonth: true
      });
    }
    
    // Next month days to fill the grid (42 cells)
    const nextMonth = calViewMonth === 12 ? 1 : calViewMonth + 1;
    const nextYear = calViewMonth === 12 ? calViewYear + 1 : calViewYear;
    const remainingCells = 42 - days.length;
    const nextMStr = String(nextMonth).padStart(2, '0');
    for (let d = 1; d <= remainingCells; d++) {
      const dStr = String(d).padStart(2, '0');
      days.push({
        dateStr: `${nextYear}-${nextMStr}-${dStr}`,
        dayNum: d,
        isCurrentMonth: false
      });
    }
    
    return days;
  }, [calViewMonth, calViewYear]);

  const handleDayClick = (dateStr: string) => {
    if (dayMode === 'single') {
      setSelectedDays(selectedDays[0] === dateStr ? [] : [dateStr]);
    } else if (dayMode === 'multi') {
      if (selectedDays.includes(dateStr)) {
        setSelectedDays(selectedDays.filter(d => d !== dateStr));
      } else {
        setSelectedDays([...selectedDays, dateStr]);
      }
    } else if (dayMode === 'range') {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        // Start new range
        setRangeStart(dateStr);
        setRangeEnd(null);
      } else {
        // Complete range - auto swap if needed
        if (dateCompare(dateStr, rangeStart) >= 0) {
          setRangeEnd(dateStr);
        } else {
          setRangeEnd(rangeStart);
          setRangeStart(dateStr);
        }
      }
    }
  };

  const handleCurrentMonth = () => {
    const t = new Date();
    setCalViewMonth(t.getMonth() + 1);
    setCalViewYear(t.getFullYear());
  };

  const handleClearSelection = () => {
    setSelectedDays([]);
    setRangeStart(null);
    setRangeEnd(null);
    setAppliedMonthRange(null);
    setMonthRangeStart(null);
    setMonthRangeEnd(null);
  };
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState('ALL');
  const [reporter, setReporter] = useState(currentUser?.fullName || 'Bộ phận Hành chính');
  const [searchText, setSearchText] = useState('');
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  
  // Modals States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isConfirmSingleItemModalOpen, setIsConfirmSingleItemModalOpen] = useState(false);
  
  const [selectedTicket, setSelectedTicket] = useState<DeliveryTicket | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string>('');
  
  // Form States
  const [newTicketForm, setNewTicketForm] = useState<{
    department: string;
    requester: string;
    approver: string;
    deliverer: string;
    receiver: string;
    generalNote: string;
    delivererSignature: string;
    receiverSignature: string;
    items: { name: string; qtyRequested: number; qtyApproved: number; qtyReceived: number; note: string; isWrong: boolean }[];
  }>({
    department: 'Phòng Hành chính',
    requester: currentUser?.fullName || '',
    approver: 'Trần Thị B',
    deliverer: 'Lê Văn Giao',
    receiver: '',
    generalNote: '',
    delivererSignature: '',
    receiverSignature: '',
    items: [{ name: 'Giấy A4', qtyRequested: 10, qtyApproved: 10, qtyReceived: 10, note: '', isWrong: false }]
  });

  const [confirmForm, setConfirmForm] = useState<{
    confirmedBy: string;
    confirmedAt: string;
    generalNote: string;
    items: { name: string; qtyReceived: number; status: VppItem['status']; note: string }[];
  }>({
    confirmedBy: currentUser?.fullName || '',
    confirmedAt: new Date().toISOString().split('T')[0],
    generalNote: '',
    items: []
  });

  const [confirmSingleForm, setConfirmSingleForm] = useState<{
    qtyReceived: number;
    status: VppItem['status'];
    confirmedBy: string;
    confirmedAt: string;
    note: string;
  }>({
    qtyReceived: 0,
    status: 'Đã nhận đủ',
    confirmedBy: currentUser?.fullName || '',
    confirmedAt: new Date().toISOString().split('T')[0],
    note: ''
  });

  // Fetch tickets from real-time backend API
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/vpp-giao-nhan');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setTickets(res.data);
        localStorage.setItem('vpp_delivery_tickets', JSON.stringify(res.data));
      } else {
        // Fallback to local storage or initial templates if empty
        const saved = localStorage.getItem('vpp_delivery_tickets');
        if (saved) {
          setTickets(JSON.parse(saved));
        } else {
          localStorage.setItem('vpp_delivery_tickets', JSON.stringify(INITIAL_TICKETS));
          setTickets(INITIAL_TICKETS);
        }
      }
    } catch (err: any) {
      console.error('Lỗi tải báo cáo VPP:', err);
      // Fallback
      const saved = localStorage.getItem('vpp_delivery_tickets');
      if (saved) {
        setTickets(JSON.parse(saved));
      } else {
        setTickets(INITIAL_TICKETS);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const saveTickets = (updated: DeliveryTicket[]) => {
    localStorage.setItem('vpp_delivery_tickets', JSON.stringify(updated));
    setTickets(updated);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setDeptFilter('ALL');
    const t = new Date();
    setCalViewMonth(t.getMonth() + 1);
    setCalViewYear(t.getFullYear());
    setSelectedDays([]);
    setDayMode('single');
    setRangeStart(null);
    setRangeEnd(null);
    setCalendarTab('day');
    setAppliedMonthRange(null);
    setMonthRangeStart(null);
    setMonthRangeEnd(null);
    setStatusFilter('ALL');
    setApprovalStatusFilter('ALL');
    setReporter(currentUser?.fullName || 'Bộ phận Hành chính');
    setSearchText('');
    toast.info("Đã làm mới bộ lọc");
  };

  // 1. Filter tickets by everything EXCEPT calendar date selections (used for calendar marks/counts)
  const ticketsFilteredExceptDate = useMemo(() => {
    return tickets.filter(t => {
      // Dept filter
      if (deptFilter !== 'ALL' && t.department !== deptFilter) return false;
      
      // Approval Status filter
      if (approvalStatusFilter !== 'ALL' && t.approvalStatus !== approvalStatusFilter) return false;
      
      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'RECEIVED_FULL' && t.deliveryStatus !== 'RECEIVED_FULL') return false;
        if (statusFilter === 'RECEIVED_SHORT' && t.deliveryStatus !== 'RECEIVED_SHORT') return false;
        if (statusFilter === 'WRONG_ITEMS' && t.deliveryStatus !== 'WRONG_ITEMS') return false;
        if (statusFilter === 'PENDING' && t.deliveryStatus !== 'PENDING') return false;
      }
      
      // Search text
      if (searchText.trim()) {
        const query = searchText.toLowerCase();
        const matchesId = t.id.toLowerCase().includes(query);
        const matchesRequester = t.requester.toLowerCase().includes(query);
        const matchesItems = t.items.some(i => i.name.toLowerCase().includes(query));
        if (!matchesId && !matchesRequester && !matchesItems) return false;
      }
      
      return true;
    });
  }, [tickets, deptFilter, statusFilter, approvalStatusFilter, searchText]);

  // 2. Filtered Tickets (the final list) - multi-mode date filter
  const filteredTickets = useMemo(() => {
    return ticketsFilteredExceptDate.filter(t => {
      const dateStr = t.date; // YYYY-MM-DD
      const [y, m] = dateStr.split('-').map(Number);

      if (calendarTab === 'month') {
        // Month-range filter
        if (appliedMonthRange) {
          const { start, end } = appliedMonthRange;
          const startDate = `${start.year}-${String(start.month).padStart(2, '0')}-01`;
          const endYear = end.year;
          const endMonth = end.month;
          const lastDay = new Date(endYear, endMonth, 0).getDate();
          const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
          return dateStr >= startDate && dateStr <= endDate;
        }
        // No month range applied yet — show nothing or current month
        return y === calViewYear && m === calViewMonth;
      }

      // Day-tab filters
      if (dayMode === 'single' || dayMode === 'multi') {
        if (selectedDays.length > 0) {
          return selectedDays.includes(dateStr);
        }
        // Default: show current calendar month
        return y === calViewYear && m === calViewMonth;
      }

      if (dayMode === 'range') {
        if (rangeStart && rangeEnd) {
          return dateStr >= rangeStart && dateStr <= rangeEnd;
        }
        if (rangeStart && !rangeEnd) {
          // Only start selected: show that single day
          return dateStr === rangeStart;
        }
        return y === calViewYear && m === calViewMonth;
      }

      return y === calViewYear && m === calViewMonth;
    });
  }, [ticketsFilteredExceptDate, calendarTab, appliedMonthRange, calViewMonth, calViewYear, dayMode, selectedDays, rangeStart, rangeEnd]);

  // Tickets grouped by date for the calendar dots and tooltips
  const ticketsByDate = useMemo(() => {
    const groups: Record<string, DeliveryTicket[]> = {};
    ticketsFilteredExceptDate.forEach(t => {
      if (!groups[t.date]) {
        groups[t.date] = [];
      }
      groups[t.date].push(t);
    });
    return groups;
  }, [ticketsFilteredExceptDate]);

  const getTooltipContent = (dateStr: string) => {
    const list = ticketsByDate[dateStr] || [];
    if (list.length === 0) return null;
    const [y, m, d] = dateStr.split('-');
    return {
      date: `${d}/${m}/${y}`,
      count: list.length,
      tickets: list.slice(0, 5).map(t => t.id),
      totalCount: list.length
    };
  };

  const getPrintedDateRangeLabel = () => {
    if (selectedTicket) return 'Theo phiếu giao nhận';
    if (calendarTab === 'month' && appliedMonthRange) {
      const { start, end } = appliedMonthRange;
      return `Tháng ${start.month}/${start.year} đến Tháng ${end.month}/${end.year}`;
    }
    if (dayMode === 'range' && rangeStart && rangeEnd) {
      const [sy, sm, sd] = rangeStart.split('-');
      const [ey, em, ed] = rangeEnd.split('-');
      return `Từ ${sd}/${sm}/${sy} đến ${ed}/${em}/${ey}`;
    }
    if (selectedDays.length > 0) {
      return `Các ngày: ${selectedDays.map(d => {
        const [yy, mm, dd] = d.split('-');
        return `${dd}/${mm}/${yy}`;
      }).join(', ')}`;
    }
    return `Tháng ${calViewMonth}/${calViewYear}`;
  };

  const handleSelectAllDaysWithTickets = () => {
    const daysWithTickets = ticketsFilteredExceptDate
      .filter(t => {
        const [y, m] = t.date.split('-').map(Number);
        return y === calViewYear && m === calViewMonth;
      })
      .map(t => t.date);
    const uniqueDays = Array.from(new Set(daysWithTickets));
    setSelectedDays(uniqueDays);
    setDayMode('multi');
    toast.success(`Đã chọn tất cả các ngày có phiếu trong Tháng ${calViewMonth}/${calViewYear}`);
  };

  // Strategic KPI Calculations
  const stats = useMemo(() => {
    const activeDepts = new Set(filteredTickets.map(t => t.department));
    const itemsSet = new Set<string>();
    let totalRequested = 0;
    let totalApproved = 0;
    let totalReceived = 0;
    let pendingCount = 0;

    filteredTickets.forEach(t => {
      if (t.deliveryStatus === 'PENDING') pendingCount++;
      t.items.forEach(i => {
        itemsSet.add(i.name);
        totalRequested += i.qtyRequested;
        totalApproved += i.qtyApproved;
        totalReceived += i.qtyReceived;
      });
    });

    const totalMissing = Math.max(0, totalApproved - totalReceived);
    const receiveRate = totalApproved > 0 ? Math.round((totalReceived / totalApproved) * 100) : 0;

    return {
      departmentsCount: activeDepts.size,
      itemsCount: itemsSet.size,
      totalRequested,
      totalApproved,
      totalReceived,
      totalMissing,
      receiveRate,
      pendingCount
    };
  }, [filteredTickets]);

  // Aggregated Item Details for Báo Cáo
  const aggregatedItems = useMemo(() => {
    const map = new Map<string, {
      name: string;
      unit: string;
      qtyRequested: number;
      qtyApproved: number;
      qtyReceived: number;
      notes: string[];
      statuses: VppItem['status'][];
    }>();

    filteredTickets.forEach(t => {
      t.items.forEach(i => {
        const exist = map.get(i.name) || {
          name: i.name,
          unit: i.unit,
          qtyRequested: 0,
          qtyApproved: 0,
          qtyReceived: 0,
          notes: [],
          statuses: []
        };
        
        exist.qtyRequested += i.qtyRequested;
        exist.qtyApproved += i.qtyApproved;
        exist.qtyReceived += i.qtyReceived;
        if (i.note) exist.notes.push(`${t.department}: ${i.note}`);
        exist.statuses.push(i.status);
        map.set(i.name, exist);
      });
    });

    return Array.from(map.values()).map((val, idx) => {
      const remaining = Math.max(0, val.qtyApproved - val.qtyReceived);
      
      // Determine aggregated status
      let finalStatus: VppItem['status'] = 'Chờ giao hàng';
      if (val.qtyReceived === 0 && val.qtyApproved > 0) {
        finalStatus = 'Chưa nhận';
      } else if (val.statuses.includes('Nhận sai hàng')) {
        finalStatus = 'Nhận sai hàng';
      } else if (val.statuses.includes('Chờ bổ sung')) {
        finalStatus = 'Chờ bổ sung';
      } else if (remaining > 0 && val.qtyReceived > 0) {
        finalStatus = 'Nhận thiếu';
      } else if (remaining === 0 && val.qtyReceived > 0) {
        finalStatus = 'Đã nhận đủ';
      }

      return {
        stt: idx + 1,
        ...val,
        remaining,
        status: finalStatus,
        note: val.notes.join('; ')
      };
    });
  }, [filteredTickets]);

  // Expanded Departments state for sub-table view
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  const toggleDeptExpand = (dept: string) => {
    setExpandedDepts(prev => ({
      ...prev,
      [dept]: !prev[dept]
    }));
  };

  // Aggregated Department Report Table
  const departmentalSummary = useMemo(() => {
    const map = new Map<string, {
      department: string;
      itemsCount: Set<string>;
      qtyRequested: number;
      qtyApproved: number;
      qtyReceived: number;
      hasWrong: boolean;
      itemsMap: Map<string, {
        name: string;
        unit: string;
        qtyRequested: number;
        qtyApproved: number;
        qtyReceived: number;
        status: VppItem['status'];
        note: string;
      }>;
    }>();

    filteredTickets.forEach(t => {
      const exist = map.get(t.department) || {
        department: t.department,
        itemsCount: new Set<string>(),
        qtyRequested: 0,
        qtyApproved: 0,
        qtyReceived: 0,
        hasWrong: false,
        itemsMap: new Map()
      };

      t.items.forEach(i => {
        exist.itemsCount.add(i.name);
        exist.qtyRequested += i.qtyRequested;
        exist.qtyApproved += i.qtyApproved;
        exist.qtyReceived += i.qtyReceived;
        if (i.status === 'Nhận sai hàng') exist.hasWrong = true;

        const itemExist = exist.itemsMap.get(i.name) || {
          name: i.name,
          unit: i.unit,
          qtyRequested: 0,
          qtyApproved: 0,
          qtyReceived: 0,
          status: 'Chưa nhận' as VppItem['status'],
          note: ''
        };

        itemExist.qtyRequested += i.qtyRequested;
        itemExist.qtyApproved += i.qtyApproved;
        itemExist.qtyReceived += i.qtyReceived;

        // Resolve status for item in dept
        if (i.status === 'Nhận sai hàng' || itemExist.status === 'Nhận sai hàng') {
          itemExist.status = 'Nhận sai hàng';
        } else if (i.status === 'Chờ bổ sung' || itemExist.status === 'Chờ bổ sung') {
          itemExist.status = 'Chờ bổ sung';
        } else if (itemExist.qtyReceived >= itemExist.qtyApproved && itemExist.qtyApproved > 0) {
          itemExist.status = 'Đã nhận đủ';
        } else if (itemExist.qtyReceived > 0) {
          itemExist.status = 'Nhận thiếu';
        } else {
          itemExist.status = 'Chưa nhận';
        }

        if (i.note) {
          itemExist.note = itemExist.note ? `${itemExist.note}; ${i.note}` : i.note;
        }

        exist.itemsMap.set(i.name, itemExist);
      });

      map.set(t.department, exist);
    });

    return Array.from(map.values()).map(val => {
      const remaining = Math.max(0, val.qtyApproved - val.qtyReceived);
      let overallStatus = 'Chưa nhận';
      if (val.hasWrong) {
        overallStatus = 'Có hàng nhận sai';
      } else if (val.qtyReceived === val.qtyApproved && val.qtyApproved > 0) {
        overallStatus = 'Đã nhận đủ';
      } else if (val.qtyReceived > 0) {
        overallStatus = 'Nhận thiếu';
      }

      return {
        department: val.department,
        itemsCount: val.itemsCount.size,
        qtyRequested: val.qtyRequested,
        qtyApproved: val.qtyApproved,
        qtyReceived: val.qtyReceived,
        remaining,
        receiveRate: val.qtyApproved > 0 ? Math.round((val.qtyReceived / val.qtyApproved) * 100) : 0,
        overallStatus,
        items: Array.from(val.itemsMap.values())
      };
    });
  }, [filteredTickets]);

  // Chart Data Calculations
  const chartCompareData = useMemo(() => {
    return departmentalSummary.map(d => ({
      name: d.department,
      'Đề xuất ban đầu': d.qtyRequested,
      'Được duyệt': d.qtyApproved,
      'Thực nhận': d.qtyReceived
    }));
  }, [departmentalSummary]);

  const chartPieData = useMemo(() => {
    let counts = { full: 0, short: 0, none: 0, wrong: 0, pending: 0 };
    filteredTickets.forEach(t => {
      if (t.deliveryStatus === 'RECEIVED_FULL') counts.full++;
      else if (t.deliveryStatus === 'RECEIVED_SHORT') counts.short++;
      else if (t.deliveryStatus === 'WRONG_ITEMS') counts.wrong++;
      else if (t.deliveryStatus === 'PENDING') counts.pending++;
      else counts.none++;
    });

    return [
      { name: 'Đã nhận đủ', value: counts.full },
      { name: 'Nhận thiếu', value: counts.short },
      { name: 'Nhận sai hàng', value: counts.wrong },
      { name: 'Chưa nhận / Chờ giao', value: counts.pending + counts.none }
    ].filter(v => v.value > 0);
  }, [filteredTickets]);

  // Status Labels & Color Schemes
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Đã nhận đủ':
      case 'RECEIVED_FULL':
        return 'bg-emerald-50 text-emerald-700 border-emerald-150';
      case 'Nhận thiếu':
      case 'RECEIVED_SHORT':
        return 'bg-amber-50 text-amber-700 border-amber-150';
      case 'Nhận sai hàng':
      case 'WRONG_ITEMS':
      case 'Có hàng nhận sai':
        return 'bg-rose-50 text-rose-700 border-rose-150';
      case 'Chờ giao hàng':
      case 'PENDING':
        return 'bg-blue-50 text-blue-700 border-blue-150';
      case 'Chưa nhận':
      default:
        return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'RECEIVED_FULL': return 'Đã nhận đủ';
      case 'RECEIVED_SHORT': return 'Nhận thiếu';
      case 'WRONG_ITEMS': return 'Nhận sai hàng';
      case 'PENDING': return 'Chờ giao hàng';
      default: return status;
    }
  };

  // EXPORT EXCEL
  const handleExportExcel = () => {
    if (aggregatedItems.length === 0) {
      toast.warning("Chưa có dữ liệu báo cáo để xuất!");
      return;
    }

    const wb = XLSX.utils.book_new();
    
    // Metadata / Cover Info
    const coverData = [
      { A: 'BÁO CÁO ĐỀ XUẤT VÀ GIAO NHẬN VĂN PHÒNG PHẨM', B: '' },
      { A: 'Thời gian báo cáo:', B: getPrintedDateRangeLabel() },
      { A: 'Phòng ban:', B: deptFilter === 'ALL' ? 'Tất cả phòng ban' : deptFilter },
      { A: 'Ngày lập biểu:', B: new Date().toLocaleDateString('vi-VN') },
      { A: 'Người lập biểu:', B: reporter },
      { A: '', B: '' }
    ];
    const wsCover = XLSX.utils.json_to_sheet(coverData, { skipHeader: true });
    XLSX.utils.book_append_sheet(wb, wsCover, "Thong_Tin_Bao_Cao");

    // Item Detailed List
    const detailedData = aggregatedItems.map(item => ({
      'STT': item.stt,
      'Tên món hàng': item.name,
      'ĐVT': item.unit,
      'SL Đề xuất ban đầu': item.qtyRequested,
      'SL Được duyệt': item.qtyApproved,
      'SL Thực nhận': item.qtyReceived,
      'SL Còn thiếu': item.remaining,
      'Tình trạng': item.status,
      'Ghi chú': item.note
    }));
    const wsDetails = XLSX.utils.json_to_sheet(detailedData);
    
    // Add Total Row
    XLSX.utils.sheet_add_json(wsDetails, [{
      'STT': 'TỔNG CỘNG',
      'Tên món hàng': '',
      'ĐVT': '',
      'SL Đề xuất ban đầu': stats.totalRequested,
      'SL Được duyệt': stats.totalApproved,
      'SL Thực nhận': stats.totalReceived,
      'SL Còn thiếu': stats.totalMissing,
      'Tình trạng': stats.receiveRate + '% thực nhận',
      'Ghi chú': ''
    }], { skipHeader: true, origin: -1 });
    XLSX.utils.book_append_sheet(wb, wsDetails, "Chi_Tiet_VPP");

    // Department Summary Sheet
    const deptData = departmentalSummary.map(d => ({
      'Phòng ban': d.department,
      'Số loại mặt hàng': d.itemsCount,
      'Tổng SL Đề xuất': d.qtyRequested,
      'Tổng SL Được duyệt': d.qtyApproved,
      'Tổng SL Thực nhận': d.qtyReceived,
      'Tổng Còn thiếu': d.remaining,
      'Tỷ lệ thực nhận (%)': d.receiveRate + '%',
      'Trạng thái tổng thể': d.overallStatus
    }));
    const wsDept = XLSX.utils.json_to_sheet(deptData);
    XLSX.utils.book_append_sheet(wb, wsDept, "Tong_Hop_Phong_Ban");

    XLSX.writeFile(wb, `Bao_Cao_Giao_Nhan_VPP_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Xuất báo cáo Excel thành công!");
  };

  // PRINT A4
  const handlePrint = () => {
    if (aggregatedItems.length === 0) {
      toast.warning("Chưa có dữ liệu báo cáo VPP để in");
      return;
    }
    setSelectedTicket(null);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // ADD TICKET FORM ROW ACTIONS
  const handleAddFormItem = () => {
    setNewTicketForm({
      ...newTicketForm,
      items: [...newTicketForm.items, { name: 'Giấy A4', qtyRequested: 5, qtyApproved: 5, qtyReceived: 5, note: '', isWrong: false }]
    });
  };

  const handleRemoveFormItem = (idx: number) => {
    if (newTicketForm.items.length === 1) return;
    setNewTicketForm({
      ...newTicketForm,
      items: newTicketForm.items.filter((_, i) => i !== idx)
    });
  };

  const handleFormItemChange = (idx: number, field: string, val: any) => {
    const updated = newTicketForm.items.map((item, i) => {
      if (i === idx) {
        return { ...item, [field]: val };
      }
      return item;
    });
    setNewTicketForm({ ...newTicketForm, items: updated });
  };

  // SAVE NEW TICKET
  const handleSaveNewTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (!newTicketForm.receiver.trim()) {
      toast.error("Vui lòng điền tên Người nhận hàng");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        department: newTicketForm.department,
        requester: newTicketForm.requester,
        approver: newTicketForm.approver,
        deliverer: newTicketForm.deliverer,
        receiver: newTicketForm.receiver,
        generalNote: newTicketForm.generalNote,
        items: newTicketForm.items.map(i => ({
          name: i.name,
          qtyRequested: Number(i.qtyRequested),
          qtyApproved: Number(i.qtyApproved),
          qtyReceived: Number(i.qtyReceived),
          note: i.note,
          isWrong: i.isWrong
        }))
      };

      const res = await api.post('/reports/vpp-create-ticket', payload);
      toast.success(`Đã tạo và lưu thành công phiếu giao nhận ${res.data.id || res.data.id}`);
      setIsCreateModalOpen(false);
      fetchTickets();
    } catch (err: any) {
      console.error('Lỗi tạo phiếu:', err);
      toast.error('Không thể lưu phiếu giao nhận lên hệ thống: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // OPEN CONFIRM TICKET MODAL
  const openConfirmModal = (ticket: DeliveryTicket) => {
    setSelectedTicket(ticket);
    setConfirmForm({
      confirmedBy: currentUser?.fullName || ticket.receiver || '',
      confirmedAt: new Date().toISOString().split('T')[0],
      generalNote: ticket.generalNote || '',
      items: ticket.items.map(i => ({
        name: i.name,
        qtyReceived: i.qtyReceived,
        status: i.status,
        note: i.note
      }))
    });
    setIsConfirmModalOpen(true);
  };

  const handleConfirmFormChange = (idx: number, field: string, val: any) => {
    const updatedItems = confirmForm.items.map((item, i) => {
      if (i === idx) {
        const copy = { ...item, [field]: val };
        
        // Auto resolve status if quantity received changes
        if (field === 'qtyReceived') {
          const original = selectedTicket?.items[idx];
          if (original) {
            const qtyApp = original.qtyApproved;
            const qtyRec = Number(val);
            if (qtyRec === qtyApp) copy.status = 'Đã nhận đủ';
            else if (qtyRec === 0) copy.status = 'Chưa nhận';
            else if (qtyRec < qtyApp) copy.status = 'Nhận thiếu';
          }
        }
        return copy;
      }
      return item;
    });

    setConfirmForm({ ...confirmForm, items: updatedItems });
  };

  // SUBMIT TICKET CONFIRMATION
  const handleSubmitConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      setLoading(true);
      await api.post('/reports/vpp-confirm', {
        requestId: selectedTicket.id,
        confirmedBy: confirmForm.confirmedBy,
        note: confirmForm.generalNote,
        items: confirmForm.items.map(i => ({
          name: i.name,
          qtyReceived: Number(i.qtyReceived),
          status: i.status,
          note: i.note
        }))
      });

      toast.success(`Đã xác nhận giao nhận cho phiếu ${selectedTicket.id}`);
      setIsConfirmModalOpen(false);
      fetchTickets();
    } catch (err: any) {
      console.error('Lỗi xác nhận phiếu:', err);
      toast.error('Không thể xác nhận giao nhận phiếu: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // OPEN CONFIRM SINGLE ITEM MODAL
  const openConfirmSingleItemModal = (itemName: string) => {
    // Find aggregate values for default
    const details = aggregatedItems.find(i => i.name === itemName);
    if (!details) return;
    setSelectedItemName(itemName);
    setConfirmSingleForm({
      qtyReceived: details.qtyReceived,
      status: details.status,
      confirmedBy: currentUser?.fullName || '',
      confirmedAt: new Date().toISOString().split('T')[0],
      note: details.note || ''
    });
    setIsConfirmSingleItemModalOpen(true);
  };

  // SUBMIT SINGLE ITEM CONFIRMATION
  const handleSubmitSingleItemConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      const targetIds = filteredTickets.map(t => t.id);
      
      for (const rId of targetIds) {
        await api.post('/reports/vpp-confirm', {
          requestId: rId,
          itemName: selectedItemName,
          qtyReceived: Number(confirmSingleForm.qtyReceived),
          status: confirmSingleForm.status,
          note: confirmSingleForm.note,
          confirmedBy: confirmSingleForm.confirmedBy
        });
      }

      toast.success(`Đã cập nhật tình trạng giao nhận cho mặt hàng "${selectedItemName}"`);
      setIsConfirmSingleItemModalOpen(false);
      fetchTickets();
    } catch (err: any) {
      console.error('Lỗi cập nhật mặt hàng:', err);
      toast.error('Không thể xác nhận giao nhận mặt hàng: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // CHECK ALL OVERALL STATUS CONDITIONS
  const getOverallStatusLabel = () => {
    const hasWrong = aggregatedItems.some(i => i.status === 'Nhận sai hàng');
    if (hasWrong) return 'Có hàng nhận sai';
    if (stats.totalReceived === stats.totalApproved && stats.totalApproved > 0) return 'Đã nhận đủ';
    if (stats.totalReceived > 0) return 'Nhận thiếu';
    return 'Chưa nhận';
  };

  // ── DISCREPANCY ANALYSIS: dòng hàng có chênh lệch trong các phiếu đang lọc ──
  const discrepancyRows = useMemo(() => {
    const rows: {
      ticketId: string;
      ticketDate: string;
      department: string;
      itemName: string;
      unit: string;
      qtyRequested: number;
      qtyApproved: number;
      qtyReceived: number;
      diffReqApproved: number;  // đề xuất - được duyệt
      diffApprovedReceived: number; // được duyệt - thực nhận
      status: VppItem['status'];
      note: string;
    }[] = [];

    filteredTickets.forEach(t => {
      t.items.forEach(item => {
        const diffReqApproved = item.qtyRequested - item.qtyApproved;
        const diffApprovedReceived = item.qtyApproved - item.qtyReceived;
        // Chỉ đưa vào nếu có chênh lệch ở bất kỳ bước nào
        if (diffReqApproved !== 0 || diffApprovedReceived !== 0) {
          rows.push({
            ticketId: t.id,
            ticketDate: t.date,
            department: t.department,
            itemName: item.name,
            unit: item.unit,
            qtyRequested: item.qtyRequested,
            qtyApproved: item.qtyApproved,
            qtyReceived: item.qtyReceived,
            diffReqApproved,
            diffApprovedReceived,
            status: item.status,
            note: item.note
          });
        }
      });
    });

    return rows;
  }, [filteredTickets]);

  // Helper: navigate directly to the Request detail page
  const navigateToPDX = (ticketId: string) => {
    navigate(`/requests/${ticketId}`);
  };

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden p-4 lg:p-6 bg-slate-50 relative flex flex-col gap-6 box-border">
      
      {/* ── STYLE BLOCK FOR PRINTING ── */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4 ${printOrientation};
            margin: 12mm;
          }

          body {
            margin: 0;
            background: #fff !important;
            color: #000 !important;
            font-family: "Times New Roman", Times, serif !important;
            font-size: 12pt;
          }

          /* Reset layouts of parent elements to let content flow naturally */
          html, body, #root, .app-container, main, .flex-col {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            display: block !important;
            position: static !important;
            background: #fff !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Hide sidebar, topbar, buttons, filters, and standard layout */
          aside, header, nav, footer, button, select, input,
          .no-print, [role="dialog"], .modal-backdrop {
            display: none !important;
          }

          body * {
            visibility: hidden !important;
          }

          .print-area,
          .print-area * {
            visibility: visible !important;
          }

          .print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #fff !important;
            display: block !important;
            box-sizing: border-box !important;
          }

          /* Header styles in print */
          .report-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-bottom: 2px solid #000 !important;
            padding-bottom: 8px !important;
            margin-bottom: 20px !important;
          }
          .report-header .company {
            width: 38% !important;
            text-align: left !important;
            font-size: 11pt !important;
            line-height: 1.4 !important;
            color: #000 !important;
          }
          .report-header .company strong {
            font-size: 11.5pt !important;
          }
          .report-header .company em {
            font-weight: bold !important;
            font-style: italic !important;
          }
          .report-header .qr {
            width: 20% !important;
            text-align: center !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .report-header .qr img {
            width: 70px !important;
            height: 70px !important;
            border: 1px solid #000 !important;
            padding: 2px !important;
            background: #fff !important;
          }
          .report-header .national {
            width: 42% !important;
            text-align: center !important;
            font-size: 11pt !important;
            line-height: 1.4 !important;
            color: #000 !important;
          }
          .report-header .national strong {
            font-size: 11.5pt !important;
          }
          .report-header .national u {
            font-weight: bold !important;
            text-decoration: underline !important;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 15px !important;
            page-break-inside: auto !important;
          }

          th,
          td {
            border: 1.5px solid #000 !important;
            padding: 6px 8px !important;
            font-size: 10.5pt !important;
            vertical-align: middle !important;
            color: #000 !important;
          }

          th {
            font-weight: bold !important;
            text-align: center !important;
            background-color: #f2f2f2 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }

          .text-right-print {
            text-align: right !important;
          }

          .text-center {
            text-align: center !important;
          }

          .print-signature {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 16px !important;
            margin-top: 40px !important;
            text-align: center !important;
            page-break-inside: avoid !important;
          }

          .print-signature > div {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            height: 110px !important;
            color: #000 !important;
          }

          .print-title {
            text-align: center !important;
            font-weight: bold !important;
            font-size: 16pt !important;
            text-transform: uppercase !important;
            margin-top: 15px !important;
            margin-bottom: 15px !important;
            letter-spacing: 0.5px !important;
          }

          .print-meta {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 6px 20px !important;
            margin-bottom: 16px !important;
            font-size: 11pt !important;
            line-height: 1.4 !important;
            text-align: left !important;
          }
        }
      `}} />

      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-10 no-print w-full min-w-0">
        <div className="animate-in fade-in slide-in-from-left-4 duration-700">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">
              Báo cáo đề xuất & giao nhận VPP
            </h2>
          </div>
          <p className="text-slate-400 font-bold text-sm ml-5 uppercase tracking-widest">
            Văn phòng phẩm Danko Group • {new Date().toLocaleDateString('vi-VN')}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 justify-start xl:justify-end animate-in fade-in slide-in-from-right-4 duration-700 max-w-full">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-3.5 bg-indigo-650 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-100 transition-all flex items-center gap-2 transform active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> Tạo phiếu giao nhận VPP
          </button>
          
          <button 
            onClick={() => setActiveView(activeView === 'report' ? 'tickets' : 'report')}
            className={`px-5 py-3.5 border-2 text-xs font-black uppercase tracking-widest rounded-2xl shadow-sm transition-all flex items-center gap-2 transform active:scale-95 cursor-pointer ${
              activeView === 'tickets' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" /> {activeView === 'report' ? 'Xem Danh Sách Phiếu' : 'Xem Bảng Báo Cáo'}
          </button>

          <button 
            onClick={handleExportExcel}
            className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-100 transition-all flex items-center gap-2 transform active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Xuất Excel
          </button>
          
          <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm gap-1 no-print">
            <button
              type="button"
              onClick={() => setPrintOrientation('portrait')}
              className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                printOrientation === 'portrait'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Khổ dọc
            </button>
            <button
              type="button"
              onClick={() => setPrintOrientation('landscape')}
              className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                printOrientation === 'landscape'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Khổ ngang
            </button>
          </div>

          <button 
            onClick={handlePrint}
            className="px-5 py-3.5 bg-indigo-650 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-100 transition-all flex items-center gap-2 transform active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> In báo cáo A4
          </button>
        </div>
      </div>

      {/* ── FILTERS AREA ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-5 no-print p-4 md:p-5 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase italic">Bộ lọc dữ liệu giao nhận</span>
        </div>
        
        {/* Row 1: Basic filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Phòng ban</label>
            <select 
              value={deptFilter} 
              onChange={e => setDeptFilter(e.target.value)}
              className="w-full h-[34px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Tất cả phòng ban</option>
              {departmentsList.map((dept, idx) => (
                <option key={idx} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Trạng thái phiếu</label>
            <select 
              value={approvalStatusFilter} 
              onChange={e => setApprovalStatusFilter(e.target.value)}
              className="w-full h-[34px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Tất cả trạng thái phiếu</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="REJECTED">Đã từ chối</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Trạng thái nhận hàng</label>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full h-[34px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="RECEIVED_FULL">Đã nhận đủ</option>
              <option value="RECEIVED_SHORT">Nhận thiếu</option>
              <option value="WRONG_ITEMS">Nhận sai hàng</option>
              <option value="PENDING">Chờ giao hàng</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Người lập biểu</label>
            <input 
              type="text" 
              value={reporter} 
              onChange={e => setReporter(e.target.value)}
              placeholder="Họ tên người lập..."
              className="w-full h-[34px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Tìm kiếm phiếu</label>
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text"
                placeholder="Số phiếu, tên món hàng..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="w-full h-[34px] pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Calendar filter section */}
        <div className="pt-4 border-t border-slate-100">
          {/* Tab Switcher */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lọc theo ngày tạo phiếu:</span>
            <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setCalendarTab('day')}
                className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer ${calendarTab === 'day' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                📅 Theo Ngày
              </button>
              <button
                type="button"
                onClick={() => setCalendarTab('month')}
                className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer ${calendarTab === 'month' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                📆 Theo Tháng
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {calendarTab === 'day' ? (
              <>
                {/* DAY TAB: Calendar + mode selector */}
                <div className="lg:col-span-2 flex flex-col sm:flex-row gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  {/* Calendar Grid */}
                  <div className="flex flex-col items-center shrink-0">
                    {/* Month navigation */}
                    <div className="flex items-center justify-between w-full max-w-[280px] mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (calViewMonth === 1) { setCalViewMonth(12); setCalViewYear(y => y - 1); }
                          else setCalViewMonth(m => m - 1);
                        }}
                        className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer text-sm font-black"
                      >
                        ‹
                      </button>
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        Tháng {calViewMonth}/{calViewYear}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (calViewMonth === 12) { setCalViewMonth(1); setCalViewYear(y => y + 1); }
                          else setCalViewMonth(m => m + 1);
                        }}
                        className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer text-sm font-black"
                      >
                        ›
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-1 w-full max-w-[280px]">
                      {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((wd, idx) => (
                        <span key={wd} className={`text-[9px] font-black uppercase ${idx === 6 ? 'text-rose-500' : idx === 5 ? 'text-blue-500' : 'text-slate-400'}`}>
                          {wd}
                        </span>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1 w-full max-w-[280px]">
                      {renderCalendarDays.map(day => {
                        const dayTickets = ticketsByDate[day.dateStr] || [];
                        const hasTickets = dayTickets.length > 0;
                        const ticketCount = dayTickets.length;
                        const tooltip = getTooltipContent(day.dateStr);

                        // Compute visual state
                        let isSelected = false;
                        let isInRange = false;
                        let isRangeStart = false;
                        let isRangeEnd = false;
                        let isHoverRange = false;

                        if (dayMode === 'single' || dayMode === 'multi') {
                          isSelected = selectedDays.includes(day.dateStr);
                        } else if (dayMode === 'range') {
                          isRangeStart = day.dateStr === rangeStart;
                          isRangeEnd = day.dateStr === rangeEnd;
                          if (rangeStart && rangeEnd) {
                            isInRange = isDayInRange(day.dateStr, rangeStart, rangeEnd);
                          } else if (rangeStart && hoverDay && !rangeEnd) {
                            isHoverRange = isDayInRange(day.dateStr, rangeStart, hoverDay);
                            isRangeStart = day.dateStr === rangeStart;
                          }
                          isSelected = isRangeStart || isRangeEnd;
                        }
                        
                        return (
                          <div 
                            key={day.dateStr}
                            onClick={() => day.isCurrentMonth && handleDayClick(day.dateStr)}
                            onMouseEnter={() => dayMode === 'range' && day.isCurrentMonth && setHoverDay(day.dateStr)}
                            onMouseLeave={() => dayMode === 'range' && setHoverDay(null)}
                            className={`h-8 w-8 rounded-lg border relative flex flex-col items-center justify-center text-[11px] font-bold transition-all duration-100 group cursor-pointer ${
                              !day.isCurrentMonth 
                                ? 'border-transparent text-slate-300 opacity-20 pointer-events-none' 
                                : isSelected
                                  ? 'bg-indigo-600 border-indigo-600 text-white font-black shadow-md shadow-indigo-100'
                                  : (isInRange || isHoverRange)
                                    ? 'bg-indigo-100 border-indigo-200 text-indigo-700'
                                    : 'bg-white hover:bg-indigo-50 hover:text-indigo-600 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span>{day.dayNum}</span>
                            
                            {day.isCurrentMonth && hasTickets && (
                              <>
                                <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-emerald-500'}`}></span>
                                {ticketCount > 1 && (
                                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-sm">
                                    {ticketCount}
                                  </span>
                                )}
                              </>
                            )}

                            {/* Tooltip */}
                            {day.isCurrentMonth && tooltip && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 bg-slate-950/95 backdrop-blur-sm text-white text-[10px] p-2.5 rounded-xl shadow-xl w-48 text-left pointer-events-none">
                                <div className="font-black border-b border-slate-800 pb-1 mb-1 text-slate-300">
                                  {tooltip.date}
                                </div>
                                <div className="font-bold mb-1 text-[10px]">Có {tooltip.count} phiếu được tạo:</div>
                                <ul className="space-y-0.5 max-h-24 overflow-y-auto font-mono text-[9px] text-slate-400 list-disc pl-3.5">
                                  {tooltip.tickets.map(id => (
                                    <li key={id}>{id}</li>
                                  ))}
                                  {tooltip.totalCount > 5 && (
                                    <li className="list-none text-slate-500 italic mt-0.5">...và {tooltip.totalCount - 5} phiếu khác</li>
                                  )}
                                </ul>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-950"></div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Mode selector + selected status */}
                  <div className="flex-1 flex flex-col gap-3 py-1 min-w-0">
                    {/* Mode selector */}
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Chế độ chọn ngày:</span>
                      <div className="flex flex-col gap-1">
                        {([
                          { key: 'single', label: '1 Ngày', desc: 'Chọn một ngày duy nhất' },
                          { key: 'multi', label: 'Nhiều ngày', desc: 'Chọn nhiều ngày rời rạc' },
                          { key: 'range', label: 'Khoảng ngày', desc: 'Chọn ngày bắt đầu → kết thúc' },
                        ] as { key: DayMode; label: string; desc: string }[]).map(opt => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => {
                              setDayMode(opt.key);
                              setSelectedDays([]);
                              setRangeStart(null);
                              setRangeEnd(null);
                            }}
                            className={`px-3 py-1.5 text-left rounded-lg border transition-all cursor-pointer flex items-center gap-2 ${dayMode === opt.key ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dayMode === opt.key ? 'bg-white' : 'bg-slate-300'}`}></span>
                            <span className="text-[10px] font-black uppercase">{opt.label}</span>
                            <span className={`text-[9px] font-medium ${dayMode === opt.key ? 'text-indigo-200' : 'text-slate-400'}`}>{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Current filter status */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 min-h-[60px]">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Đang lọc theo:</span>
                      {dayMode === 'range' && rangeStart && !rangeEnd ? (
                        <p className="text-[11px] font-bold text-amber-600">
                          Chọn ngày kết thúc… (bắt đầu từ {rangeStart.split('-').reverse().join('/')})
                        </p>
                      ) : dayMode === 'range' && rangeStart && rangeEnd ? (
                        <p className="text-[11px] font-bold text-indigo-600">
                          📅 Từ {rangeStart.split('-').reverse().join('/')} → {rangeEnd.split('-').reverse().join('/')}
                        </p>
                      ) : selectedDays.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto custom-scrollbar">
                          {selectedDays.map(d => {
                            const [yy, mm, dd] = d.split('-');
                            return (
                              <span 
                                key={d} 
                                onClick={() => handleDayClick(d)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-lg cursor-pointer hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors"
                                title="Click để xóa"
                              >
                                {dd}/{mm}
                                <span className="text-[8px] font-black">✕</span>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] font-bold text-slate-400 italic">
                          Tất cả phiếu trong tháng {calViewMonth}/{calViewYear}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* MONTH TAB: Month range picker */}
                <div className="lg:col-span-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div className="mb-3">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Chọn khoảng tháng liên thông</span>
                  </div>

                  {/* Year navigator + month grid */}
                  {(() => {
                    const [gridYear, setGridYear] = [calViewYear, setCalViewYear];
                    const monthNames = ['Th.1','Th.2','Th.3','Th.4','Th.5','Th.6','Th.7','Th.8','Th.9','Th.10','Th.11','Th.12'];
                    
                    const isMonthInRange = (m: number, y: number) => {
                      if (!monthRangeStart || !monthRangeEnd) return false;
                      const val = y * 100 + m;
                      const startVal = monthRangeStart.year * 100 + monthRangeStart.month;
                      const endVal = monthRangeEnd.year * 100 + monthRangeEnd.month;
                      const lo = Math.min(startVal, endVal);
                      const hi = Math.max(startVal, endVal);
                      return val >= lo && val <= hi;
                    };
                    const isMonthSelected = (m: number, y: number) => {
                      const val = y * 100 + m;
                      const sv = monthRangeStart ? monthRangeStart.year * 100 + monthRangeStart.month : null;
                      const ev = monthRangeEnd ? monthRangeEnd.year * 100 + monthRangeEnd.month : null;
                      return val === sv || val === ev;
                    };

                    return (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <button type="button" onClick={() => setCalViewYear((y: number) => y - 1)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 font-black text-sm cursor-pointer">‹</button>
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Năm {gridYear}</span>
                          <button type="button" onClick={() => setCalViewYear((y: number) => y + 1)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 font-black text-sm cursor-pointer">›</button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {monthNames.map((name, idx) => {
                            const m = idx + 1;
                            const y = gridYear;
                            const inRange = isMonthInRange(m, y);
                            const selected = isMonthSelected(m, y);
                            const ticketsInMonth = ticketsFilteredExceptDate.filter(t => {
                              const [ty, tm] = t.date.split('-').map(Number);
                              return ty === y && tm === m;
                            }).length;
                            
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => {
                                  if (!monthRangeStart || (monthRangeStart && monthRangeEnd)) {
                                    setMonthRangeStart({ month: m, year: y });
                                    setMonthRangeEnd(null);
                                  } else {
                                    const sv = monthRangeStart.year * 100 + monthRangeStart.month;
                                    const ev = y * 100 + m;
                                    if (ev >= sv) {
                                      setMonthRangeEnd({ month: m, year: y });
                                    } else {
                                      setMonthRangeEnd(monthRangeStart);
                                      setMonthRangeStart({ month: m, year: y });
                                    }
                                  }
                                }}
                                className={`relative py-2.5 px-2 rounded-xl text-[10px] font-black transition-all cursor-pointer border ${
                                  selected
                                    ? 'bg-violet-600 border-violet-600 text-white shadow-md'
                                    : inRange
                                      ? 'bg-violet-100 border-violet-200 text-violet-700'
                                      : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-600'
                                }`}
                              >
                                {name}
                                {ticketsInMonth > 0 && (
                                  <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center ${selected ? 'bg-white text-violet-600' : 'bg-violet-500 text-white'}`}>
                                    {ticketsInMonth > 9 ? '9+' : ticketsInMonth}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Apply button */}
                        {monthRangeStart && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 text-[10px] text-violet-700 font-bold bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                              {monthRangeStart && !monthRangeEnd ? (
                                <>Từ <strong>Tháng {monthRangeStart.month}/{monthRangeStart.year}</strong> → Chọn tháng kết thúc...</>
                              ) : (
                                <>Từ <strong>Tháng {monthRangeStart.month}/{monthRangeStart.year}</strong> đến <strong>Tháng {monthRangeEnd!.month}/{monthRangeEnd!.year}</strong></>
                              )}
                            </div>
                            {monthRangeStart && monthRangeEnd && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAppliedMonthRange({ start: monthRangeStart!, end: monthRangeEnd! });
                                  toast.success(`Đã lọc từ Tháng ${monthRangeStart!.month}/${monthRangeStart!.year} đến Tháng ${monthRangeEnd!.month}/${monthRangeEnd!.year}`);
                                }}
                                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-black rounded-lg transition-all cursor-pointer uppercase tracking-widest whitespace-nowrap"
                              >
                                Áp dụng
                              </button>
                            )}
                          </div>
                        )}

                        {appliedMonthRange && (
                          <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <span className="text-[10px] font-bold text-emerald-700 flex-1">
                              ✓ Đang lọc: Tháng {appliedMonthRange.start.month}/{appliedMonthRange.start.year} → Tháng {appliedMonthRange.end.month}/{appliedMonthRange.end.year}
                            </span>
                            <button type="button" onClick={() => { setAppliedMonthRange(null); setMonthRangeStart(null); setMonthRangeEnd(null); }} className="text-[9px] text-rose-500 hover:text-rose-700 font-black cursor-pointer">✕ Xóa</button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}

            {/* Column 3: Action buttons */}
            <div className="flex flex-col justify-between gap-2">
              <div className="space-y-2">
                <button 
                  type="button"
                  onClick={handleCurrentMonth}
                  className="w-full px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> Về tháng hiện tại
                </button>

                {calendarTab === 'day' && (
                  <button 
                    type="button"
                    onClick={handleSelectAllDaysWithTickets}
                    className="w-full px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> Chọn tất cả ngày có phiếu
                  </button>
                )}

                {(selectedDays.length > 0 || rangeStart || appliedMonthRange) && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="w-full px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" /> Xóa lọc thời gian
                  </button>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                {/* Filter summary */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-2.5 text-[10px]">
                  <div className="font-black text-slate-400 uppercase tracking-widest mb-1">Kết quả lọc</div>
                  <div className="font-bold text-indigo-700 text-sm">{filteredTickets.length} <span className="text-slate-500 text-[10px] font-bold">phiếu</span></div>
                  <div className="text-slate-500 text-[9px] mt-0.5 truncate">{getPrintedDateRangeLabel()}</div>
                </div>
                <button 
                  type="button"
                  onClick={handleResetFilters}
                  className="w-full px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider text-[10px] rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCcw className="w-3.5 h-3.5 text-white" /> Làm mới bộ lọc
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>




      {/* ── STRATEGIC KPIS ── */}
      <div className="stats-grid mb-8 no-print">
        <StatCard label="Phòng đề xuất" value={stats.departmentsCount} color="indigo" />
        <StatCard label="Tổng mặt hàng" value={stats.itemsCount} color="blue" />
        <StatCard label="Tổng đề xuất" value={stats.totalRequested} color="indigo" />
        <StatCard label="Được duyệt" value={stats.totalApproved} color="emerald" />
        <StatCard label="Thực nhận" value={stats.totalReceived} color="emerald" />
        <StatCard label="Tổng còn thiếu" value={stats.totalMissing} color="amber" />
        <StatCard label="Tỷ lệ thực nhận" value={stats.receiveRate + '%'} color={stats.receiveRate < 60 ? 'rose' : 'emerald'} />
        <StatCard label="Phiếu chưa xong" value={stats.pendingCount} color={stats.pendingCount > 0 ? 'amber' : 'slate'} />
      </div>

      {/* ── CHARTS SECTION ── */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 shadow-sm text-center mb-8 no-print">
          <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-400 font-bold text-sm uppercase tracking-wider">Chưa có dữ liệu báo cáo trong kỳ đã chọn</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8 no-print w-full">
          {/* Compare Chart */}
          <div className="xl:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm min-w-0">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" /> Biến động Giao nhận theo phòng ban
            </h4>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartCompareData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.06)'}} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="Đề xuất ban đầu" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Được duyệt" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Thực nhận" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Pie Chart */}
          <div className="xl:col-span-1 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col min-w-0">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-4 text-center">
              Tỷ lệ trạng thái phiếu
            </h4>
            <div className="flex-1 flex flex-col justify-center items-center">
              <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={chartPieData} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" cy="50%" 
                      innerRadius={45} outerRadius={65} 
                      paddingAngle={3}
                      stroke="none"
                    >
                      {chartPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full mt-4">
                {chartPieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                    <span className="text-[10px] font-bold text-slate-650 truncate uppercase tracking-tight">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW SECTIONS ── */}
      {activeView === 'report' ? (
        <div className="space-y-8 no-print">
          {/* TAB 1: BẢNG TỔNG HỢP THEO PHÒNG BAN */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">1. Bảng tổng hợp số lượng theo phòng ban</h4>
            </div>
            <div className="table-wrapper">
              <table className="min-w-[900px] w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="p-4">Phòng ban</th>
                    <th className="p-4 text-center">Số loại VPP</th>
                    <th className="p-4 text-right">Tổng SL đề xuất</th>
                    <th className="p-4 text-right">Tổng SL được duyệt</th>
                    <th className="p-4 text-right">Tổng SL thực nhận</th>
                    <th className="p-4 text-right">Tổng còn thiếu</th>
                    <th className="p-4 text-center">Tỷ lệ thực nhận</th>
                    <th className="p-4 text-center">Trạng thái tổng thể</th>
                    <th className="p-4 text-center w-36">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                  {departmentalSummary.length === 0 && (
                    <tr><td colSpan={9} className="p-10 text-center text-slate-400 italic">Không có dữ liệu</td></tr>
                  )}
                  {departmentalSummary.map(d => (
                    <Fragment key={d.department}>
                      <tr className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                        <td className="p-4 text-slate-900">{d.department}</td>
                        <td className="p-4 text-center tabular-nums">{d.itemsCount} món</td>
                        <td className="p-4 text-right tabular-nums">{d.qtyRequested}</td>
                        <td className="p-4 text-right tabular-nums">{d.qtyApproved}</td>
                        <td className="p-4 text-right tabular-nums text-emerald-600">{d.qtyReceived}</td>
                        <td className="p-4 text-right tabular-nums text-amber-600">{d.remaining}</td>
                        <td className="p-4 text-center tabular-nums text-indigo-600">{d.receiveRate}%</td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${getStatusBadgeClass(d.overallStatus)}`}>
                            {d.overallStatus}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => toggleDeptExpand(d.department)}
                            className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-indigo-55 hover:border-indigo-200 hover:text-indigo-650 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 mx-auto"
                          >
                            {expandedDepts[d.department] ? (
                              <>▲ Ẩn hàng hóa</>
                            ) : (
                              <>▼ Xem hàng hóa</>
                            )}
                          </button>
                        </td>
                      </tr>
                      {expandedDepts[d.department] && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={9} className="p-6">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-hidden animate-in slide-in-from-top-1 duration-200">
                              <h5 className="text-xs font-black text-indigo-700 uppercase tracking-widest mb-3 italic">
                                Danh mục hàng hóa của {d.department}
                              </h5>
                              
                              {d.items.length === 0 ? (
                                <p className="text-xs font-bold text-slate-400 italic">Chưa có danh mục hàng hóa cho phòng ban này</p>
                              ) : (
                                <div className="table-wrapper">
                                  <table className="min-w-[900px] w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                                        <th className="p-3 text-center w-12">STT</th>
                                        <th className="p-3">Tên hàng hóa / Tên VPP</th>
                                        <th className="p-3 text-center">Đơn vị tính</th>
                                        <th className="p-3 text-right">Số lượng đề xuất ban đầu</th>
                                        <th className="p-3 text-right">Số lượng được duyệt</th>
                                        <th className="p-3 text-right">Số lượng thực nhận</th>
                                        <th className="p-3 text-right">Số lượng còn thiếu</th>
                                        <th className="p-3 text-center">Trạng thái nhận hàng</th>
                                        <th className="p-3">Ghi chú</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700 font-bold">
                                      {d.items.map((item: any, idx: number) => {
                                        const missingQty = Math.max(0, item.qtyApproved - item.qtyReceived);
                                        return (
                                          <tr key={idx} className="hover:bg-slate-50/50">
                                            <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                                            <td className="p-3 text-slate-900">{item.name}</td>
                                            <td className="p-3 text-center text-slate-500 uppercase">{item.unit}</td>
                                            <td className="p-3 text-right tabular-nums">{item.qtyRequested}</td>
                                            <td className="p-3 text-right tabular-nums">{item.qtyApproved}</td>
                                            <td className="p-3 text-right text-emerald-600 tabular-nums">{item.qtyReceived}</td>
                                            <td className="p-3 text-right text-amber-600 tabular-nums">{missingQty}</td>
                                            <td className="p-3 text-center">
                                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${getStatusBadgeClass(item.status)}`}>
                                                {item.status}
                                              </span>
                                            </td>
                                            <td className="p-3 text-slate-400 italic text-[11px] truncate max-w-xs">{item.note || '-'}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TAB 2: BẢNG CHI TIẾT THEO MÓN HÀNG VPP */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">2. Chi tiết tổng hợp theo từng món hàng</h4>
            </div>
            <div className="table-wrapper">
              <table className="min-w-[900px] w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="p-4 text-center w-12">STT</th>
                    <th className="p-4">Tên món hàng</th>
                    <th className="p-4 text-center">ĐVT</th>
                    <th className="p-4 text-right">SL đề xuất</th>
                    <th className="p-4 text-right">SL được duyệt</th>
                    <th className="p-4 text-right">SL thực nhận</th>
                    <th className="p-4 text-right">SL còn thiếu</th>
                    <th className="p-4 text-center">Trạng thái nhận hàng</th>
                    <th className="p-4 text-center">Xác nhận nhận hàng</th>
                    <th className="p-4">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {aggregatedItems.length === 0 && (
                    <tr><td colSpan={10} className="p-10 text-center text-slate-400 italic">Không có dữ liệu</td></tr>
                  )}
                  {aggregatedItems.map(item => (
                    <tr key={item.name} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-center font-bold text-slate-400">{item.stt}</td>
                      <td className="p-4 font-bold text-slate-900">{item.name}</td>
                      <td className="p-4 text-center uppercase font-bold text-slate-500">{item.unit}</td>
                      <td className="p-4 text-right font-bold tabular-nums">{item.qtyRequested}</td>
                      <td className="p-4 text-right font-bold tabular-nums">{item.qtyApproved}</td>
                      <td className="p-4 text-right font-bold text-emerald-600 tabular-nums">{item.qtyReceived}</td>
                      <td className="p-4 text-right font-bold text-amber-600 tabular-nums">{item.remaining}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getStatusBadgeClass(item.status)}`}>{item.status}</span>
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => openConfirmSingleItemModal(item.name)} className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all cursor-pointer">Xác nhận</button>
                      </td>
                      <td className="p-4 text-slate-400 italic text-[11px] max-w-xs truncate" title={item.note}>{item.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                {aggregatedItems.length > 0 && (
                  <tfoot className="bg-slate-900 text-white font-black text-xs uppercase tracking-wider italic">
                    <tr>
                      <td className="p-4 text-center"></td>
                      <td className="p-4" colSpan={2}>T\u1ed4NG C\u1ed8NG</td>
                      <td className="p-4 text-right tabular-nums">{stats.totalRequested}</td>
                      <td className="p-4 text-right tabular-nums">{stats.totalApproved}</td>
                      <td className="p-4 text-right text-emerald-400 tabular-nums">{stats.totalReceived}</td>
                      <td className="p-4 text-right text-amber-400 tabular-nums">{stats.totalMissing}</td>
                      <td className="p-4 text-center text-indigo-300" colSpan={2}>{stats.receiveRate}% th\u1ef1c nh\u1eadn</td>
                      <td className="p-4"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* TAB 3: BẢNG RÀ SOÁT CHÊNH LỆCH SỐ LIỆU */}
          <div className="bg-white rounded-3xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-amber-100 bg-amber-50/60 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">3. Rà soát chênh lệch số liệu</h4>
                <span className="text-[9px] font-bold text-slate-400 italic">(Đề xuất / Được duyệt / Thực nhận)</span>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${discrepancyRows.length > 0 ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                {discrepancyRows.length > 0 ? `${discrepancyRows.length} dòng có chênh lệch` : 'Không có chênh lệch'}
              </span>
            </div>
            {discrepancyRows.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider">Không có chênh lệch số liệu</p>
                <p className="text-xs font-medium text-slate-400 mt-1 italic">Tất cả các món hàng đều có số liệu khớp nhau</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="min-w-[1100px] w-full text-left">
                  <thead>
                    <tr className="bg-amber-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-amber-100">
                      <th className="p-3 text-center w-8">STT</th>
                      <th className="p-3">Số phiếu (PDX)</th>
                      <th className="p-3">Ngày tạo</th>
                      <th className="p-3">Phòng ban</th>
                      <th className="p-3">Món hàng</th>
                      <th className="p-3 text-center">ĐVT</th>
                      <th className="p-3 text-right">Đề xuất</th>
                      <th className="p-3 text-right">Được duyệt (Admin)</th>
                      <th className="p-3 text-right">Thực nhận</th>
                      <th className="p-3 text-right">CL ĐX⇒Duyệt</th>
                      <th className="p-3 text-right">CL Duyệt⇒Nhận</th>
                      <th className="p-3 text-center">Trạng thái</th>
                      <th className="p-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50/50 text-xs font-semibold text-slate-700">
                    {discrepancyRows.map((row, idx) => {
                      const isReducedByApproval = row.diffReqApproved > 0;
                      const isNotFullyReceived = row.diffApprovedReceived > 0;
                      return (
                        <tr key={idx} className={`hover:bg-amber-50/40 transition-colors ${(isReducedByApproval || isNotFullyReceived) ? '' : 'opacity-70'}`}>
                          <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-3">
                            <span className="font-mono font-black text-[10px] text-indigo-700 uppercase">{row.ticketId}</span>
                          </td>
                          <td className="p-3 font-mono text-slate-500">{row.ticketDate}</td>
                          <td className="p-3 text-slate-700">{row.department}</td>
                          <td className="p-3 font-bold text-slate-900">{row.itemName}</td>
                          <td className="p-3 text-center uppercase text-slate-500 text-[10px]">{row.unit}</td>
                          <td className="p-3 text-right tabular-nums font-bold text-slate-700">{row.qtyRequested}</td>
                          <td className="p-3 text-right tabular-nums font-bold text-blue-600">{row.qtyApproved}</td>
                          <td className="p-3 text-right tabular-nums font-bold text-emerald-600">{row.qtyReceived}</td>
                          {/* Chênh lệch đề xuất → duyệt */}
                          <td className="p-3 text-right">
                            {row.diffReqApproved === 0 ? (
                              <span className="text-emerald-500 text-[10px] font-black">✓ 0</span>
                            ) : (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black tabular-nums border ${
                                isReducedByApproval
                                  ? 'bg-orange-50 border-orange-200 text-orange-600'
                                  : 'bg-blue-50 border-blue-200 text-blue-600'
                              }`}>
                                {row.diffReqApproved > 0 ? '-' : '+'}{Math.abs(row.diffReqApproved)}
                              </span>
                            )}
                          </td>
                          {/* Chênh lệch duyệt → nhận */}
                          <td className="p-3 text-right">
                            {row.diffApprovedReceived === 0 ? (
                              <span className="text-emerald-500 text-[10px] font-black">✓ 0</span>
                            ) : (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black tabular-nums border ${
                                isNotFullyReceived
                                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                                  : 'bg-blue-50 border-blue-200 text-blue-600'
                              }`}>
                                {row.diffApprovedReceived > 0 ? '-' : '+'}{Math.abs(row.diffApprovedReceived)}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${getStatusBadgeClass(row.status)}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => navigateToPDX(row.ticketId)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg transition-all cursor-pointer text-[10px] font-black uppercase tracking-wider"
                              title="Đi đến Phiếu Đề Xuất tương ứng"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Đến PĐX
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-amber-50 border-t border-amber-100">
                    <tr>
                      <td colSpan={6} className="p-3 text-[10px] font-black text-amber-700 uppercase tracking-wider">
                        TỔNG CỘNG
                      </td>
                      <td className="p-3 text-right font-black text-slate-700 tabular-nums">
                        {discrepancyRows.reduce((s, r) => s + r.qtyRequested, 0)}
                      </td>
                      <td className="p-3 text-right font-black text-blue-600 tabular-nums">
                        {discrepancyRows.reduce((s, r) => s + r.qtyApproved, 0)}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-600 tabular-nums">
                        {discrepancyRows.reduce((s, r) => s + r.qtyReceived, 0)}
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-black text-orange-600 tabular-nums">
                          -{discrepancyRows.filter(r => r.diffReqApproved > 0).reduce((s, r) => s + r.diffReqApproved, 0)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-black text-rose-600 tabular-nums">
                          -{discrepancyRows.filter(r => r.diffApprovedReceived > 0).reduce((s, r) => s + r.diffApprovedReceived, 0)}
                        </span>
                      </td>
                      <td colSpan={2} className="p-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden no-print animate-in fade-in duration-300">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">Danh sách toàn bộ phiếu đề xuất & giao nhận VPP</h4>
          </div>
          <div className="table-wrapper">
            <table className="min-w-[900px] w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="p-4">Số phiếu đề xuất</th>
                  <th className="p-4">Ngày tạo</th>
                  <th className="p-4">Phòng ban</th>
                  <th className="p-4">Người đề xuất</th>
                  <th className="p-4 text-right">Đề xuất</th>
                  <th className="p-4 text-right">Được duyệt</th>
                  <th className="p-4 text-right">Thực nhận</th>
                  <th className="p-4 text-right">Chênh lệch</th>
                  <th className="p-4 text-center">Trạng thái</th>
                  <th className="p-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredTickets.length === 0 && (
                  <tr><td colSpan={9} className="p-10 text-center text-slate-400 italic">Không tìm thấy phiếu nào phù hợp bộ lọc</td></tr>
                )}
                {filteredTickets.map(t => {
                  const sumRequested = t.items.reduce((s, i) => s + i.qtyRequested, 0);
                  const sumApproved = t.items.reduce((s, i) => s + i.qtyApproved, 0);
                  const sumReceived = t.items.reduce((s, i) => s + i.qtyReceived, 0);
                  const gap = sumApproved - sumReceived;
                  const hasDiscrepancy = t.items.some(i => i.qtyRequested !== i.qtyApproved || i.qtyApproved !== i.qtyReceived);
                  return (
                  <tr key={t.id} className={`hover:bg-slate-50/50 transition-colors ${hasDiscrepancy ? 'bg-amber-50/30' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {hasDiscrepancy && <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0" title="Có chênh lệch số liệu" />}
                        <span className="font-bold text-slate-900 font-mono uppercase text-[10px]">{t.id}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs">{t.date}</td>
                    <td className="p-4 text-slate-900 text-xs">{t.department}</td>
                    <td className="p-4 text-xs">{t.requester}</td>
                    <td className="p-4 text-right tabular-nums font-bold text-slate-700">{sumRequested}</td>
                    <td className="p-4 text-right tabular-nums font-bold text-blue-600">{sumApproved}</td>
                    <td className="p-4 text-right tabular-nums font-bold text-emerald-600">{sumReceived}</td>
                    <td className="p-4 text-right">
                      {gap === 0 ? (
                        <span className="text-[10px] font-black text-emerald-600">0</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-[10px] font-black tabular-nums">
                          -{gap}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getStatusBadgeClass(t.deliveryStatus)}`}>
                        {getStatusLabel(t.deliveryStatus)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5 flex-wrap">
                        <button 
                          onClick={() => { setSelectedTicket(t); setIsDetailModalOpen(true); }}
                          className="px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                        >
                          Chi tiết
                        </button>
                        <button 
                          onClick={() => navigateToPDX(t.id)}
                          className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-bold text-[10px] uppercase tracking-wider cursor-pointer flex items-center gap-1"
                          title="Đi đến Phiếu Đề Xuất"
                        >
                          <ExternalLink className="w-3 h-3" />
                          PĐX
                        </button>
                        <button 
                          onClick={() => { setSelectedTicket(t); setTimeout(() => window.print(), 100); }}
                          className="p-1.5 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="In phiếu"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openConfirmModal(t)}
                          className="px-2.5 py-1.5 bg-indigo-650 text-white rounded-lg hover:bg-indigo-700 transition-colors font-black text-[10px] uppercase tracking-wider cursor-pointer"
                        >
                          Xác nhận nhận
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PRINT-ONLY A4 AREA ── */}
      <div id="print-area-wrapper" className="print-area hidden">
        <div className="report-header">
          <div className="company">
            <strong>CÔNG TY CỔ PHẦN TẬP ĐOÀN DANKO</strong><br />
            <em>{selectedTicket ? "Báo cáo đề xuất & giao nhận VPP" : "Báo cáo tổng hợp văn phòng phẩm"}</em><br />
            Ban Hành chính Nhân sự
          </div>

          <div className="qr">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(
                selectedTicket ? selectedTicket.id : `BC-VPP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`
              )}`} 
              alt="QR Code" 
            />
          </div>

          <div className="national">
            <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br />
            <u>Độc lập - Tự do - Hạnh phúc</u><br />
            <em>Hà Nội, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</em>
          </div>
        </div>

        <div className="print-title">
          BÁO CÁO ĐỀ XUẤT VÀ GIAO NHẬN VĂN PHÒNG PHẨM
        </div>
        
        {/* Report Meta Info */}
        <div className="print-meta">
          <div><strong>Phòng ban:</strong> {selectedTicket ? selectedTicket.department : (deptFilter === 'ALL' ? 'Tất cả phòng ban đề xuất' : deptFilter)}</div>
          <div><strong>Thời gian báo cáo:</strong> {getPrintedDateRangeLabel()}</div>
          <div><strong>Ngày lập biểu:</strong> {selectedTicket ? selectedTicket.date : new Date().toLocaleDateString('vi-VN')}</div>
          <div><strong>Người lập biểu:</strong> {selectedTicket ? selectedTicket.creator || reporter : reporter}</div>
          {selectedTicket ? (
            <div><strong>Số phiếu giao nhận:</strong> {selectedTicket.id}</div>
          ) : (
            <div><strong>Mã báo cáo:</strong> BC-VPP-{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}{String(new Date().getDate()).padStart(2, '0')}</div>
          )}
        </div>

        {/* Detailed Items Table */}
        <table className="w-full">
          <thead>
            <tr>
              <th style={{width: '50px'}}>STT</th>
              <th>Tên món hàng</th>
              <th style={{width: '75px'}}>ĐVT</th>
              <th style={{width: '95px'}}>SL đề xuất ban đầu</th>
              <th style={{width: '95px'}}>SL được duyệt</th>
              <th style={{width: '95px'}}>SL thực nhận</th>
              <th style={{width: '95px'}}>SL còn thiếu</th>
              <th style={{width: '130px'}}>Xác nhận nhận hàng</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {(selectedTicket ? selectedTicket.items : aggregatedItems).map((item, idx) => (
              <tr key={idx}>
                <td className="text-center">{idx + 1}</td>
                <td style={{fontWeight: 'bold'}}>{item.name}</td>
                <td className="text-center">{item.unit}</td>
                <td className="text-right-print">{item.qtyRequested}</td>
                <td className="text-right-print">{item.qtyApproved}</td>
                <td className="text-right-print" style={{fontWeight: 'bold'}}>{item.qtyReceived}</td>
                <td className="text-right-print">{Math.max(0, item.qtyApproved - item.qtyReceived)}</td>
                <td className="text-center" style={{fontSize: '9.5pt'}}>{getStatusLabel(item.status)}</td>
                <td style={{fontSize: '9.5pt', fontStyle: 'italic'}}>{item.note || '-'}</td>
              </tr>
            ))}
            {/* Total Row */}
            <tr style={{fontWeight: 'bold', fontStyle: 'italic', background: '#fafafa'}}>
              <td className="text-center"></td>
              <td colSpan={2}>CỘNG TỔNG</td>
              <td className="text-right-print">
                {selectedTicket ? selectedTicket.items.reduce((s, i) => s + i.qtyRequested, 0) : stats.totalRequested}
              </td>
              <td className="text-right-print">
                {selectedTicket ? selectedTicket.items.reduce((s, i) => s + i.qtyApproved, 0) : stats.totalApproved}
              </td>
              <td className="text-right-print">
                {selectedTicket ? selectedTicket.items.reduce((s, i) => s + i.qtyReceived, 0) : stats.totalReceived}
              </td>
              <td className="text-right-print">
                {selectedTicket ? selectedTicket.items.reduce((s, i) => s + Math.max(0, i.qtyApproved - i.qtyReceived), 0) : stats.totalMissing}
              </td>
              <td className="text-center" style={{fontSize: '10pt'}}>
                {selectedTicket ? getStatusLabel(selectedTicket.deliveryStatus) : getOverallStatusLabel()}
              </td>
              <td>Tỷ lệ thực nhận: {selectedTicket ? Math.round((selectedTicket.items.reduce((s, i) => s + i.qtyReceived, 0) / (selectedTicket.items.reduce((s, i) => s + i.qtyApproved, 0) || 1)) * 100) : stats.receiveRate}%</td>
            </tr>
          </tbody>
        </table>

        {/* Signature Area */}
        <div className="print-signature">
          <div>
            <div className="font-bold">Người lập biểu</div>
            <div className="text-xs italic mb-10">(Ký & ghi rõ họ tên)</div>
            <div className="font-bold text-slate-700 mt-6">{reporter}</div>
          </div>
          <div>
            <div className="font-bold">Người giao hàng</div>
            <div className="text-xs italic mb-10">(Ký & ghi rõ họ tên)</div>
            <div className="font-bold text-slate-700 mt-6">{selectedTicket?.deliverer || 'Lê Văn Giao'}</div>
          </div>
          <div>
            <div className="font-bold">Người nhận hàng</div>
            <div className="text-xs italic mb-10">(Ký & ghi rõ họ tên)</div>
            <div className="font-bold text-slate-700 mt-6">{selectedTicket?.receiver || '---'}</div>
          </div>
          <div>
            <div className="font-bold">Trưởng bộ phận</div>
            <div className="text-xs italic mb-10">(Ký & đóng dấu)</div>
            <div className="font-bold text-slate-700 mt-6">{selectedTicket?.approver || 'Trần Thị B'}</div>
          </div>
        </div>
      </div>

      {/* ── MODALS SECTION ── */}

      {/* MODAL 1: TẠO PHIẾU GIAO NHẬN VPP */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-650 animate-pulse" /> Lập phiếu giao nhận văn phòng phẩm mới
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveNewTicket} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Phòng ban nhận</label>
                  <select 
                    value={newTicketForm.department}
                    onChange={e => setNewTicketForm({ ...newTicketForm, department: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {departmentsList.length > 0 ? (
                      departmentsList.map((dept, index) => (
                        <option key={index} value={dept}>{dept}</option>
                      ))
                    ) : (
                      <>
                        <option value="Phòng Hành chính">Phòng Hành chính</option>
                        <option value="Phòng Kế toán">Phòng Kế toán</option>
                        <option value="Phòng Kinh doanh">Phòng Kinh doanh</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Người đề xuất / Nhận hàng</label>
                  <input 
                    type="text" 
                    required
                    value={newTicketForm.receiver}
                    onChange={e => setNewTicketForm({ ...newTicketForm, receiver: e.target.value })}
                    placeholder="Nhập tên người nhận..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 h-[38px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Người giao hàng</label>
                  <input 
                    type="text" 
                    required
                    value={newTicketForm.deliverer}
                    onChange={e => setNewTicketForm({ ...newTicketForm, deliverer: e.target.value })}
                    placeholder="Nhập tên người giao..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 h-[38px]"
                  />
                </div>
              </div>

              {/* Dynamic Items List */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Danh sách văn phòng phẩm cấp phát</span>
                  <button 
                    type="button" 
                    onClick={handleAddFormItem}
                    className="text-xs font-bold text-indigo-655 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    + Thêm dòng vật tư
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-x-auto">
                  <table className="min-w-[800px] w-full text-left">
                    <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="p-3 w-10 text-center">STT</th>
                        <th className="p-3 w-48">Tên món hàng</th>
                        <th className="p-3 w-28 text-right">SL Đề xuất</th>
                        <th className="p-3 w-28 text-right">SL Được duyệt</th>
                        <th className="p-3 w-28 text-right">SL Thực nhận</th>
                        <th className="p-3 w-28 text-center">Nhận sai hàng?</th>
                        <th className="p-3">Ghi chú</th>
                        <th className="p-3 w-12 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {newTicketForm.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/30">
                          <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-3">
                            <select 
                              value={item.name} 
                              onChange={e => handleFormItemChange(idx, 'name', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-705"
                            >
                              {TEMPLATE_ITEMS.map(t => (
                                <option key={t.name} value={t.name}>{t.name} ({t.unit})</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3">
                            <input 
                              type="number" 
                              required
                              min="1"
                              value={item.qtyRequested}
                              onChange={e => handleFormItemChange(idx, 'qtyRequested', e.target.value)}
                              className="w-full text-right px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                            />
                          </td>
                          <td className="p-3">
                            <input 
                              type="number" 
                              required
                              min="0"
                              value={item.qtyApproved}
                              onChange={e => handleFormItemChange(idx, 'qtyApproved', e.target.value)}
                              className="w-full text-right px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                            />
                          </td>
                          <td className="p-3">
                            <input 
                              type="number" 
                              required
                              min="0"
                              value={item.qtyReceived}
                              onChange={e => handleFormItemChange(idx, 'qtyReceived', e.target.value)}
                              className="w-full text-right px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-600"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input 
                              type="checkbox"
                              checked={item.isWrong}
                              onChange={e => handleFormItemChange(idx, 'isWrong', e.target.checked)}
                              className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5 cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <input 
                              type="text" 
                              value={item.note}
                              onChange={e => handleFormItemChange(idx, 'note', e.target.value)}
                              placeholder="Nhập ghi chú dòng..."
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button 
                              type="button" 
                              onClick={() => handleRemoveFormItem(idx)}
                              disabled={newTicketForm.items.length === 1}
                              className="p-1 hover:bg-rose-50 rounded-lg text-rose-500 hover:text-rose-700 transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Chữ ký Người giao hàng (Xác nhận chữ)</label>
                  <input 
                    type="text" 
                    value={newTicketForm.delivererSignature}
                    onChange={e => setNewTicketForm({ ...newTicketForm, delivererSignature: e.target.value })}
                    placeholder="Chữ ký Người giao (Họ tên)..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 h-[38px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Chữ ký Người nhận hàng (Xác nhận chữ)</label>
                  <input 
                    type="text" 
                    value={newTicketForm.receiverSignature}
                    onChange={e => setNewTicketForm({ ...newTicketForm, receiverSignature: e.target.value })}
                    placeholder="Chữ ký Người nhận (Họ tên)..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 h-[38px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Ghi chú chung của phiếu</label>
                <textarea 
                  value={newTicketForm.generalNote}
                  onChange={e => setNewTicketForm({ ...newTicketForm, generalNote: e.target.value })}
                  placeholder="Ghi chú tổng quan..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-indigo-650 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-indigo-700 cursor-pointer"
                >
                  Lưu phiếu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: XEM CHI TIẾT PHIẾU GIAO NHẬN */}
      {isDetailModalOpen && selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" /> Chi tiết phiếu giao nhận {selectedTicket.id}
              </h3>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs border-b border-slate-100 pb-4">
                <div><span className="text-slate-400 font-bold block uppercase text-[10px]">Phòng ban:</span> <strong className="text-slate-800 text-sm">{selectedTicket.department}</strong></div>
                <div><span className="text-slate-400 font-bold block uppercase text-[10px]">Thời gian đề xuất:</span> <strong className="text-slate-800">{selectedTicket.date}</strong></div>
                <div><span className="text-slate-400 font-bold block uppercase text-[10px]">Người đề xuất / Nhận:</span> <strong className="text-slate-800">{selectedTicket.requester}</strong></div>
                <div><span className="text-slate-400 font-bold block uppercase text-[10px]">Người duyệt:</span> <strong className="text-slate-800">{selectedTicket.approver}</strong></div>
                <div><span className="text-slate-400 font-bold block uppercase text-[10px]">Người giao hàng:</span> <strong className="text-slate-800">{selectedTicket.deliverer || 'N/A'}</strong></div>
                <div><span className="text-slate-400 font-bold block uppercase text-[10px]">Tình trạng nhận hàng:</span> <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase ${getStatusBadgeClass(selectedTicket.deliveryStatus)}`}>{getStatusLabel(selectedTicket.deliveryStatus)}</span></div>
              </div>

              <div className="space-y-3">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Danh sách món hàng</h5>
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="min-w-[800px] w-full text-left text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-450 border-b border-slate-100">
                      <tr>
                        <th className="p-3 text-center w-12">STT</th>
                        <th className="p-3">Tên món hàng</th>
                        <th className="p-3 text-center">ĐVT</th>
                        <th className="p-3 text-right">SL Đề xuất</th>
                        <th className="p-3 text-right">SL Được duyệt</th>
                        <th className="p-3 text-right">SL Thực nhận</th>
                        <th className="p-3 text-center">Tình trạng</th>
                        <th className="p-3">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedTicket.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/30">
                          <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900">{item.name}</td>
                          <td className="p-3 text-center uppercase font-bold text-slate-500">{item.unit}</td>
                          <td className="p-3 text-right font-bold tabular-nums">{item.qtyRequested}</td>
                          <td className="p-3 text-right font-bold tabular-nums">{item.qtyApproved}</td>
                          <td className="p-3 text-right font-bold text-emerald-600 tabular-nums">{item.qtyReceived}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase border ${getStatusBadgeClass(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 italic text-[11px] max-w-xs truncate">{item.note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedTicket.generalNote && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 font-medium">
                  <strong>Ghi chú:</strong> {selectedTicket.generalNote}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer"
                >
                  Đóng lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: XÁC NHẬN NHẬN HÀNG TOÀN PHIẾU */}
      {isConfirmModalOpen && selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Xác nhận đã nhận hàng cho phiếu {selectedTicket.id}
              </h3>
              <button onClick={() => setIsConfirmModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitConfirmation} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Người nhận hàng / Xác nhận</label>
                  <input 
                    type="text" 
                    required
                    value={confirmForm.confirmedBy}
                    onChange={e => setConfirmForm({ ...confirmForm, confirmedBy: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Ngày xác nhận thực tế</label>
                  <input 
                    type="date" 
                    required
                    value={confirmForm.confirmedAt}
                    onChange={e => setConfirmForm({ ...confirmForm, confirmedAt: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                  />
                </div>
              </div>

              {/* Items List to Verify */}
              <div className="space-y-3">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kiểm chứng số lượng thực nhận của từng dòng</h5>
                <div className="border border-slate-200 rounded-2xl overflow-x-auto">
                  <table className="min-w-[800px] w-full text-left text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-450 border-b border-slate-100">
                      <tr>
                        <th className="p-3 text-center w-12">STT</th>
                        <th className="p-3">Tên món hàng</th>
                        <th className="p-3 text-center">ĐVT</th>
                        <th className="p-3 text-right">SL Được duyệt</th>
                        <th className="p-3 w-32 text-right">SL Thực nhận</th>
                        <th className="p-3 w-40 text-center">Xác nhận tình trạng</th>
                        <th className="p-3">Ghi chú dòng hàng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedTicket.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/30">
                          <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900">{item.name}</td>
                          <td className="p-3 text-center uppercase font-bold text-slate-500">{item.unit}</td>
                          <td className="p-3 text-right font-bold tabular-nums">{item.qtyApproved}</td>
                          <td className="p-3">
                            <input 
                              type="number"
                              required
                              min="0"
                              max={item.qtyApproved}
                              value={confirmForm.items[idx]?.qtyReceived ?? 0}
                              onChange={e => handleConfirmFormChange(idx, 'qtyReceived', e.target.value)}
                              className="w-full text-right px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-emerald-600"
                            />
                          </td>
                          <td className="p-3">
                            <select
                              value={confirmForm.items[idx]?.status ?? 'Đã nhận đủ'}
                              onChange={e => handleConfirmFormChange(idx, 'status', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                            >
                              <option value="Đã nhận đủ">Đã nhận đủ</option>
                              <option value="Nhận thiếu">Nhận thiếu</option>
                              <option value="Chưa nhận">Chưa nhận</option>
                              <option value="Nhận sai hàng">Nhận sai hàng</option>
                              <option value="Chờ bổ sung">Chờ bổ sung</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <input 
                              type="text"
                              value={confirmForm.items[idx]?.note ?? ''}
                              onChange={e => handleConfirmFormChange(idx, 'note', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Ghi chú đối chiếu chung</label>
                <textarea 
                  value={confirmForm.generalNote}
                  onChange={e => setConfirmForm({ ...confirmForm, generalNote: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-650 h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-emerald-700 cursor-pointer"
                >
                  Xác nhận lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: XÁC NHẬN NHẬN HÀNG CHO TỪNG DÒNG MÓN HÀNG */}
      {isConfirmSingleItemModalOpen && selectedItemName && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-650" /> Xác nhận cho: {selectedItemName}
              </h3>
              <button onClick={() => setIsConfirmSingleItemModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 cursor-pointer">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmitSingleItemConfirmation} className="space-y-4 text-xs font-bold">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tổng Số lượng thực nhận</label>
                <input 
                  type="number"
                  required
                  min="0"
                  value={confirmSingleForm.qtyReceived}
                  onChange={e => setConfirmSingleForm({ ...confirmSingleForm, qtyReceived: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-emerald-600 text-right outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tình trạng nhận hàng</label>
                <select
                  value={confirmSingleForm.status}
                  onChange={e => setConfirmSingleForm({ ...confirmSingleForm, status: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="Đã nhận đủ">Đã nhận đủ</option>
                  <option value="Nhận thiếu">Nhận thiếu</option>
                  <option value="Chưa nhận">Chưa nhận</option>
                  <option value="Nhận sai hàng">Nhận sai hàng</option>
                  <option value="Chờ bổ sung">Chờ bổ sung</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Người xác nhận thực tế</label>
                <input 
                  type="text"
                  required
                  value={confirmSingleForm.confirmedBy}
                  onChange={e => setConfirmSingleForm({ ...confirmSingleForm, confirmedBy: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Ngày xác nhận</label>
                <input 
                  type="date"
                  required
                  value={confirmSingleForm.confirmedAt}
                  onChange={e => setConfirmSingleForm({ ...confirmSingleForm, confirmedAt: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Ghi chú chi tiết</label>
                <textarea 
                  value={confirmSingleForm.note}
                  onChange={e => setConfirmSingleForm({ ...confirmSingleForm, note: e.target.value })}
                  placeholder="Ghi chú xác thực..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 h-16 resize-none outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsConfirmSingleItemModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// ── REUSABLE KPI CARD ──
function StatCard({ label, value, color }: { label: string, value: any, color: string }) {
  const bgMap: any = {
    indigo: 'bg-indigo-50/80 text-indigo-700 border-indigo-100',
    blue: 'bg-blue-50/80 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50/80 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50/80 text-amber-700 border-amber-100',
    rose: 'bg-rose-50/80 text-rose-700 border-rose-100',
    slate: 'bg-slate-50 text-slate-500 border-slate-200'
  };

  return (
    <div className={`p-4 border rounded-2xl flex flex-col justify-center min-h-[96px] shadow-sm select-none ${bgMap[color] || bgMap.slate}`}>
      <span className="text-[9px] font-black uppercase tracking-wider opacity-60 leading-none mb-2">{label}</span>
      <span className="text-xl font-black italic tracking-tighter tabular-nums leading-none">{value}</span>
    </div>
  );
}
