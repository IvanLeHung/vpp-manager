import { useState, useEffect } from 'react';
import { Calendar, Users, Tag, Filter, ChevronDown, CheckCircle2, History } from 'lucide-react';
import api from '../lib/api';

interface ReportFiltersProps {
  onFilterChange: (filters: any) => void;
  isLoading?: boolean;
}

export default function ReportFilters({ onFilterChange, isLoading }: ReportFiltersProps) {
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [dateRange, setDateRange] = useState('LAST_30_DAYS');
  const [customDates, setCustomDates] = useState({ start: '', end: '' });
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [warehouse, setWarehouse] = useState('MAIN');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, itemRes] = await Promise.all([
          api.get('/departments'),
          api.get('/items?all=true')
        ]);
        setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
        
        // Extract unique categories
        const itemData = Array.isArray(itemRes.data) ? itemRes.data : [];
        const cats = Array.from(new Set(itemData.map((i: any) => i.category))).filter(Boolean) as string[];
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load filter data', err);
      }
    };
    fetchData();
  }, []);

  const handleApply = () => {
    let startDate = '';
    let endDate = '';
    const now = new Date();

    if (dateRange === 'THIS_MONTH') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      endDate = new Date().toISOString().split('T')[0];
    } else if (dateRange === 'LAST_MONTH') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    } else if (dateRange === 'Q1') {
      startDate = `${now.getFullYear()}-01-01`; endDate = `${now.getFullYear()}-03-31`;
    } else if (dateRange === 'Q2') {
      startDate = `${now.getFullYear()}-04-01`; endDate = `${now.getFullYear()}-06-30`;
    } else if (dateRange === 'Q3') {
      startDate = `${now.getFullYear()}-07-01`; endDate = `${now.getFullYear()}-09-30`;
    } else if (dateRange === 'Q4') {
      startDate = `${now.getFullYear()}-10-01`; endDate = `${now.getFullYear()}-12-31`;
    } else if (dateRange === 'THIS_YEAR') {
      startDate = `${now.getFullYear()}-01-01`;
      endDate = new Date().toISOString().split('T')[0];
    } else if (dateRange === 'CUSTOM') {
      startDate = customDates.start;
      endDate = customDates.end;
    }

    onFilterChange({
      startDate,
      endDate,
      departmentId: selectedDept === 'ALL' ? undefined : selectedDept,
      category: selectedCategory === 'ALL' ? undefined : selectedCategory,
      warehouseCode: warehouse
    });
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden mb-8 no-print animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="p-1 px-8 bg-slate-50 border-b border-slate-200 flex items-center justify-between min-h-[50px]">
         <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-black text-slate-500 tracking-widest uppercase italic">Bộ lọc báo cáo chuyên sâu</span>
         </div>
         <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-400">Warehouse:</span>
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                <button 
                  onClick={() => setWarehouse('MAIN')}
                  className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${warehouse === 'MAIN' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >TỔNG</button>
                <button 
                  onClick={() => setWarehouse('VE_SINH')}
                  className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${warehouse === 'VE_SINH' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >VỆ SINH</button>
            </div>
         </div>
      </div>

      <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Time Filter */}
        <div className="space-y-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 pl-1">
            <Calendar className="w-3 h-3 text-indigo-500" /> Chu kỳ báo cáo
          </label>
          <div className="relative group">
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full pl-5 pr-10 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black text-slate-700 appearance-none shadow-inner transition-all"
            >
              <option value="LAST_30_DAYS">30 Ngày gần nhất</option>
              <option value="THIS_MONTH">Tháng này</option>
              <option value="LAST_MONTH">Tháng trước</option>
              <option value="Q1">Quý 1 (Jan-Mar)</option>
              <option value="Q2">Quý 2 (Apr-Jun)</option>
              <option value="Q3">Quý 3 (Jul-Sep)</option>
              <option value="Q4">Quý 4 (Oct-Dec)</option>
              <option value="THIS_YEAR">Năm {new Date().getFullYear()}</option>
              <option value="CUSTOM">Tuỳ chỉnh khoảng ngày</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
          </div>
          
          {dateRange === 'CUSTOM' && (
            <div className="grid grid-cols-2 gap-2 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <input 
                type="date" 
                value={customDates.start} 
                onChange={(e) => setCustomDates({...customDates, start: e.target.value})}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input 
                type="date" 
                value={customDates.end} 
                onChange={(e) => setCustomDates({...customDates, end: e.target.value})}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Department Filter */}
        <div className="space-y-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 pl-1">
            <Users className="w-3 h-3 text-emerald-500" /> Theo phòng ban
          </label>
          <div className="relative group">
            <select 
              value={selectedDept} 
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full pl-5 pr-10 py-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none font-black text-slate-700 appearance-none shadow-inner transition-all"
            >
              <option value="ALL">Tất cả phòng ban</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-emerald-500 transition-colors" />
          </div>
        </div>

        {/* Category Filter */}
        <div className="space-y-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 pl-1">
            <Tag className="w-3 h-3 text-rose-500" /> Nhóm vật tư
          </label>
          <div className="relative group">
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-5 pr-10 py-4 bg-slate-50 border-2 border-transparent focus:border-rose-500 rounded-2xl outline-none font-black text-slate-700 appearance-none shadow-inner transition-all"
            >
              <option value="ALL">Tất cả nhóm hàng</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-rose-500 transition-colors" />
          </div>
        </div>

        {/* Apply Button */}
        <div className="flex flex-col justify-end pb-1">
           <button 
             onClick={handleApply}
             disabled={isLoading}
             className="w-full bg-slate-900 text-white rounded-[1.25rem] py-4 font-black shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all transform active:scale-95 flex items-center justify-center gap-3"
           >
             {isLoading ? (
               <History className="w-5 h-5 animate-spin" />
             ) : (
               <CheckCircle2 className="w-5 h-5 text-emerald-400" />
             )}
             ÁP DỤNG BỘ LỌC
           </button>
        </div>
      </div>
    </div>
  );
}
