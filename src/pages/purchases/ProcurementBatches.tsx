import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { 
  Folder, Plus, Calendar, Settings, Lock, FileSpreadsheet, FileText, 
  Trash2, PlusCircle, AlertTriangle, ArrowLeft, RefreshCw, Layers, 
  CheckCircle, Database, LayoutDashboard, User, ShieldAlert, X
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function ProcurementBatches() {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchDetail, setBatchDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);

  // Create Batch Form
  const [batchName, setBatchName] = useState('');
  const [batchType, setBatchType] = useState('VPP');
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const [docTypes, setDocTypes] = useState<string[]>(['REQUEST', 'PURCHASE_ORDER', 'DELIVERY', 'WAREHOUSE_RECEIPT', 'HANDOVER']);
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [categoryTypes, setCategoryTypes] = useState<string[]>(['VPP', 'DO_VE_SINH']);

  // Manual Add Document Form
  const [addDocType, setAddDocType] = useState('REQUEST');
  const [addDocCode, setAddDocCode] = useState('');
  const [submittingDoc, setSubmittingDoc] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('vpp_user');
    if (saved) {
      setCurrentUser(JSON.parse(saved));
    }
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      fetchBatchDetails(selectedBatchId);
    }
  }, [selectedBatchId]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await api.get('/procurement-batches');
      setBatches(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi tải danh sách batch');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchDetails = async (id: string) => {
    try {
      setDetailLoading(true);
      const res = await api.get(`/procurement-batches/${id}`);
      setBatchDetail(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi tải chi tiết batch');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchName) {
      toast.error('Vui lòng nhập tên batch');
      return;
    }

    try {
      setLoading(true);
      const filterConfigJson = {
        period_month: periodMonth ? Number(periodMonth) : null,
        period_year: periodYear ? Number(periodYear) : null,
        document_types: docTypes,
        document_statuses: [], // Empty means scan all statuses
        category_types: categoryTypes,
        created_date_from: createdFrom || null,
        created_date_to: createdTo || null
      };

      await api.post('/procurement-batches', {
        batchName,
        batchType,
        periodMonth: periodMonth ? Number(periodMonth) : null,
        periodYear: periodYear ? Number(periodYear) : null,
        filterConfigJson
      });

      toast.success('Đã tạo và quét batch thành công!');
      setShowCreateModal(false);
      // Reset form
      setBatchName('');
      setCreatedFrom('');
      setCreatedTo('');
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi tạo batch');
    } finally {
      setLoading(false);
    }
  };

  const handleSetReady = async () => {
    if (!selectedBatchId) return;
    try {
      setDetailLoading(true);
      await api.post(`/procurement-batches/${selectedBatchId}/ready`);
      toast.success('Đã đánh dấu sẵn sàng!');
      fetchBatchDetails(selectedBatchId);
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi cập nhật trạng thái');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLockBatch = async () => {
    if (!selectedBatchId) return;
    try {
      setDetailLoading(true);
      await api.post(`/procurement-batches/${selectedBatchId}/lock`);
      toast.success('Chốt batch thành công! Số liệu đã được đóng băng.');
      fetchBatchDetails(selectedBatchId);
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi chốt batch');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteBatch = async () => {
    if (!selectedBatchId) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa batch này? Hành động này không thể hoàn tác.')) return;

    try {
      setLoading(true);
      await api.delete(`/procurement-batches/${selectedBatchId}`);
      toast.success('Đã xóa batch thành công');
      setSelectedBatchId(null);
      setBatchDetail(null);
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi xóa batch');
    } finally {
      setLoading(false);
    }
  };

  const handleAddManualDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addDocCode) {
      toast.error('Vui lòng nhập mã chứng từ');
      return;
    }

    try {
      setSubmittingDoc(true);
      await api.post(`/procurement-batches/${selectedBatchId}/items`, {
        documentType: addDocType,
        documentCode: addDocCode
      });

      toast.success('Thêm chứng từ thành công!');
      setAddDocCode('');
      setShowAddDocModal(false);
      fetchBatchDetails(selectedBatchId!);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi thêm chứng từ');
    } finally {
      setSubmittingDoc(false);
    }
  };

  const handleRemoveDocument = async (itemId: string) => {
    if (!window.confirm('Bạn có chắc muốn loại chứng từ này ra khỏi batch?')) return;
    try {
      setDetailLoading(true);
      await api.delete(`/procurement-batches/${selectedBatchId}/items/${itemId}`);
      toast.success('Đã loại bỏ chứng từ khỏi batch.');
      fetchBatchDetails(selectedBatchId!);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi loại bỏ chứng từ');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExportReport = async (reportType: string) => {
    try {
      setDetailLoading(true);
      const res = await api.post(`/procurement-batches/${selectedBatchId}/reports/export`, {
        reportType,
        format: 'XLSX'
      });
      if (res.data.fileUrl) {
        window.open(api.defaults.baseURL ? api.defaults.baseURL + res.data.fileUrl : res.data.fileUrl, '_blank');
        toast.success('Báo cáo đã xuất thành công!');
        fetchBatchDetails(selectedBatchId!);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Lỗi xuất báo cáo batch');
    } finally {
      setDetailLoading(false);
    }
  };

  // Helper labels
  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string, style: string }> = {
      DRAFT: { label: 'Nháp', style: 'bg-slate-100 text-slate-700 border-slate-200' },
      READY: { label: 'Sẵn sàng', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      LOCKED: { label: 'Đã chốt', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    };
    const s = map[status] || { label: status, style: 'bg-slate-100 text-slate-700 border-slate-200' };
    return <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border shadow-sm ${s.style}`}>{s.label}</span>;
  };

  const getDocTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      REQUEST: 'Yêu cầu',
      PURCHASE_ORDER: 'Mua sắm',
      DELIVERY: 'Giao hàng',
      WAREHOUSE_RECEIPT: 'Nhập kho',
      HANDOVER: 'Bàn giao'
    };
    return map[type] || type;
  };

  // Extract current active dashboard metrics (live or snapshot)
  const dashboardData = batchDetail?.status === 'LOCKED' 
    ? batchDetail.snapshotData?.summary 
    : batchDetail?.liveSummary?.summary;

  const dashboardStatus = batchDetail?.status === 'LOCKED'
    ? batchDetail.snapshotData?.status_summary
    : batchDetail?.liveSummary?.status_summary;

  const itemsList = batchDetail?.status === 'LOCKED'
    ? batchDetail.snapshotData?.items?.map((item: any, idx: number) => ({
        ...item,
        id: `snap-${idx}`,
        documentType: item.document_type,
        documentCode: item.document_code,
        documentDate: item.document_date,
        departmentName: item.department_name,
        documentStatus: item.status,
        addedMethod: 'AUTO_SNAP'
      }))
    : batchDetail?.liveSummary?.items;

  // Toggle selection helper for doc types
  const toggleDocType = (type: string) => {
    if (docTypes.includes(type)) {
      setDocTypes(docTypes.filter(t => t !== type));
    } else {
      setDocTypes([...docTypes, type]);
    }
  };

  const toggleCategoryType = (type: string) => {
    if (categoryTypes.includes(type)) {
      setCategoryTypes(categoryTypes.filter(t => t !== type));
    } else {
      setCategoryTypes([...categoryTypes, type]);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Title Header */}
      {!batchDetail ? (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
              <Database className="w-8 h-8 text-indigo-600" /> Batch Hồ sơ Mua sắm & Cấp phát
            </h1>
            <p className="text-slate-500 mt-1 font-medium">Gom và chốt hồ sơ chứng từ văn phòng phẩm, tạp hóa theo kỳ tổng hợp.</p>
          </div>
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase px-5 py-3 rounded-xl tracking-wider shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tạo Batch hồ sơ mới
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setSelectedBatchId(null); setBatchDetail(null); fetchBatches(); }}
              className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-slate-800">{batchDetail.batchName}</span>
                <span className="text-slate-400 font-bold">({batchDetail.batchCode})</span>
                {getStatusBadge(batchDetail.status)}
              </div>
              <p className="text-slate-500 text-sm mt-0.5 font-medium">
                Loại: <span className="font-bold text-slate-600">{batchDetail.batchType}</span> | Kỳ: <span className="font-bold text-slate-600">{batchDetail.periodMonth ? `Tháng ${batchDetail.periodMonth}/${batchDetail.periodYear}` : 'Tự do'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {batchDetail.status === 'DRAFT' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && (
              <button
                onClick={handleSetReady}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase px-5 py-3 rounded-xl tracking-wider shadow-md active:scale-95 transition cursor-pointer"
              >
                Đánh dấu Sẵn sàng
              </button>
            )}
            {batchDetail.status === 'READY' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && (
              <button
                onClick={handleLockBatch}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase px-5 py-3 rounded-xl tracking-wider shadow-md active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-4 h-4" /> Chốt Batch hồ sơ
              </button>
            )}
            {batchDetail.status !== 'LOCKED' && currentUser?.role === 'ADMIN' && (
              <button
                onClick={handleDeleteBatch}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-xs uppercase px-4 py-3 rounded-xl tracking-wider border border-rose-200 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Xóa Batch
              </button>
            )}
          </div>
        </div>
      )}

      {/* Warning hint for live batches */}
      {batchDetail && batchDetail.status !== 'LOCKED' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-800">⚠️ Batch chưa chốt, dữ liệu có thể thay đổi.</p>
            <p className="text-xs text-amber-600 mt-0.5">Hồ sơ vẫn đang liên kết trực tiếp với dữ liệu live. Hãy rà soát kỹ trước khi bấm "Chốt batch".</p>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-500 font-bold">Đang tải dữ liệu...</p>
        </div>
      ) : !batchDetail ? (
        /* Batch Grid List */
        batches.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-sm flex flex-col items-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6">
              <Folder className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide">Chưa có Batch hồ sơ nào</h3>
            <p className="text-slate-500 mt-2 text-sm">Tạo kỳ hồ sơ đầu tiên để quản lý và chốt dữ liệu chứng từ tập trung.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map(b => (
              <div 
                key={b.id} 
                onClick={() => setSelectedBatchId(b.id)}
                className="bg-white rounded-3xl border border-slate-200/60 p-6 hover:shadow-xl hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between group h-56 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-bl-full -z-10"></div>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{b.batchCode}</span>
                    {getStatusBadge(b.status)}
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-800 group-hover:text-indigo-600 transition-colors leading-snug">{b.batchName}</h3>
                  <div className="flex gap-4 mt-3 text-xs text-slate-500 font-medium">
                    <span>Loại: <span className="font-bold text-slate-700">{b.batchType}</span></span>
                    <span>Kỳ: <span className="font-bold text-slate-700">{b.periodMonth ? `${b.periodMonth}/${b.periodYear}` : 'Tự do'}</span></span>
                  </div>
                </div>
                
                <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>Số chứng từ: <span className="font-black text-slate-700">{b._count?.items || 0}</span></span>
                  <span className="text-indigo-600 group-hover:translate-x-1 transition-transform">Chi tiết &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Batch Detail View */
        detailLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
            <p className="text-slate-500 font-bold">Đang tải chi tiết hồ sơ...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Dashboard Metrics Grid */}
            {dashboardData && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-sm text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Đề xuất</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{dashboardData.total_request}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-sm text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mua sắm (PO)</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{dashboardData.total_purchase_order}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-sm text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Giao hàng</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{dashboardData.total_delivery}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-sm text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nhập kho</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{dashboardData.total_warehouse_receipt}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-sm text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bàn giao</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{dashboardData.total_handover}</p>
                </div>
                <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100 p-4 shadow-sm text-center">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">Tổng chứng từ</p>
                  <p className="text-2xl font-black text-indigo-700 mt-1">{dashboardData.total_documents}</p>
                </div>
                <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-4 shadow-sm text-center col-span-2 lg:col-span-1">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Tổng giá trị</p>
                  <p className="text-sm font-black text-emerald-700 mt-2 truncate">{Number(dashboardData.total_amount || 0).toLocaleString('vi-VN')} đ</p>
                </div>
              </div>
            )}

            {/* Locked user trace detail */}
            {batchDetail.status === 'LOCKED' && (
              <div className="bg-slate-100/70 rounded-2xl p-4 flex items-center justify-between text-xs text-slate-500 font-bold border border-slate-200">
                <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-slate-400" /> Người chốt: {batchDetail.lockedBy || 'Hệ thống'}</span>
                <span>Thời gian khóa: {batchDetail.lockedAt ? new Date(batchDetail.lockedAt).toLocaleString('vi-VN') : '—'}</span>
              </div>
            )}

            {/* Documents Table & Operations toolbar */}
            <div className="bg-white rounded-3xl border border-slate-200/70 overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-md font-black text-slate-800 uppercase tracking-wider">Danh sách chứng từ ({itemsList?.length || 0})</h3>
                
                <div className="flex flex-wrap items-center gap-2">
                  {batchDetail.status !== 'LOCKED' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && (
                    <button
                      onClick={() => setShowAddDocModal(true)}
                      className="bg-white hover:bg-slate-50 text-slate-700 font-black text-[10px] uppercase border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4 text-indigo-600" /> Thêm phiếu thủ công
                    </button>
                  )}
                  
                  {/* Export report dropdown */}
                  <div className="relative group">
                    <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase rounded-xl px-4 py-2.5 flex items-center gap-1.5 transition cursor-pointer">
                      <FileSpreadsheet className="w-4 h-4" /> Xuất báo cáo
                    </button>
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 hidden group-hover:block z-50">
                      <button 
                        onClick={() => handleExportReport('BATCH_SUMMARY')}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                      >
                        Xuất Excel danh sách
                      </button>
                      <button 
                        onClick={() => handleExportReport('REQUEST_SUMMARY')}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                      >
                        Xuất Excel Tổng hợp đề xuất
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black text-[9px] uppercase tracking-wider">
                      <th className="py-4 px-6" style={{ width: '8%' }}>STT</th>
                      <th className="py-4 px-6" style={{ width: '15%' }}>Loại phiếu</th>
                      <th className="py-4 px-6" style={{ width: '20%' }}>Mã phiếu</th>
                      <th className="py-4 px-6" style={{ width: '15%' }}>Ngày lập</th>
                      <th className="py-4 px-6" style={{ width: '22%' }}>Phòng ban</th>
                      <th className="py-4 px-6 text-right" style={{ width: '12%' }}>Giá trị</th>
                      <th className="py-4 px-6 text-center" style={{ width: '10%' }}>Trạng thái</th>
                      {batchDetail.status !== 'LOCKED' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && (
                        <th className="py-4 px-6 text-center" style={{ width: '8%' }}>Xóa</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-700">
                    {(!itemsList || itemsList.length === 0) ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400 font-bold">
                          Không có chứng từ nào trong batch này.
                        </td>
                      </tr>
                    ) : (
                      itemsList.map((item: any, idx: number) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-4 px-6 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-4 px-6">
                            <span className="font-bold text-slate-800">{getDocTypeLabel(item.documentType)}</span>
                            {item.addedMethod === 'MANUAL' && (
                              <span className="ml-2 bg-amber-50 text-amber-700 border border-amber-100 text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm">Thủ công</span>
                            )}
                          </td>
                          <td className="py-4 px-6 font-bold text-indigo-600">{item.documentCode}</td>
                          <td className="py-4 px-6 text-slate-500">{item.documentDate ? new Date(item.documentDate).toLocaleDateString('vi-VN') : '—'}</td>
                          <td className="py-4 px-6 font-semibold">{item.departmentName || 'Khác'}</td>
                          <td className="py-4 px-6 text-right font-bold text-slate-800">{Number(item.amount || 0).toLocaleString('vi-VN')} đ</td>
                          <td className="py-4 px-6 text-center">
                            <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-slate-200">{item.documentStatus}</span>
                          </td>
                          {batchDetail.status !== 'LOCKED' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && (
                            <td className="py-4 px-6 text-center">
                              <button 
                                onClick={() => handleRemoveDocument(item.id)}
                                className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Export History Log List */}
            {batchDetail.exports && batchDetail.exports.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200/70 overflow-hidden shadow-sm p-6 space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Lịch sử xuất báo cáo batch</h3>
                <div className="divide-y divide-slate-100">
                  {batchDetail.exports.map((exp: any) => (
                    <div key={exp.id} className="py-3.5 flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                          <FileSpreadsheet className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{exp.fileName}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Loại: {exp.reportType} | Dung lượng: {(exp.fileSize / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-500 font-bold">{new Date(exp.exportedAt).toLocaleString('vi-VN')}</span>
                        <a 
                          href={api.defaults.baseURL ? api.defaults.baseURL + exp.fileUrl : exp.fileUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 font-black hover:underline cursor-pointer"
                        >
                          Tải xuống &darr;
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* Modal: Create Batch */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-md font-black text-slate-800 uppercase tracking-wider">Tạo Batch hồ sơ mới</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateBatch} className="p-6 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tên Batch hồ sơ</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Hồ sơ VPP tháng 05/2026"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-700 transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Loại Batch</label>
                  <select 
                    value={batchType}
                    onChange={(e) => setBatchType(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-700 transition"
                  >
                    <option value="VPP">Văn phòng phẩm (VPP)</option>
                    <option value="VE_SINH">Tạp hóa / Vệ sinh</option>
                    <option value="KHAC">Loại khác</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Kỳ tổng hợp (Tháng/Năm)</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      min="1" max="12"
                      value={periodMonth}
                      onChange={(e) => setPeriodMonth(Number(e.target.value))}
                      className="w-1/2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-700 text-center transition"
                      placeholder="Tháng"
                    />
                    <input 
                      type="number" 
                      value={periodYear}
                      onChange={(e) => setPeriodYear(Number(e.target.value))}
                      className="w-1/2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-700 text-center transition"
                      placeholder="Năm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Danh mục lọc</label>
                <div className="flex gap-4">
                  {['VPP', 'DO_VE_SINH', 'KHAC'].map(cat => (
                    <label key={cat} className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={categoryTypes.includes(cat)}
                        onChange={() => toggleCategoryType(cat)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5"
                      />
                      {cat === 'VPP' ? 'Văn phòng phẩm' : cat === 'DO_VE_SINH' ? 'Vệ sinh' : 'Khác'}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Loại chứng từ quét tự động</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {['REQUEST', 'PURCHASE_ORDER', 'DELIVERY', 'WAREHOUSE_RECEIPT', 'HANDOVER'].map(type => (
                    <label key={type} className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={docTypes.includes(type)}
                        onChange={() => toggleDocType(type)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5"
                      />
                      {getDocTypeLabel(type)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 border-t border-slate-100 pt-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Khoảng ngày quét (Ưu tiên hơn kỳ tháng)</span>
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="date"
                    value={createdFrom}
                    onChange={(e) => setCreatedFrom(e.target.value)}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-700 transition"
                  />
                  <input 
                    type="date"
                    value={createdTo}
                    onChange={(e) => setCreatedTo(e.target.value)}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-700 transition"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-500 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-500/20 transition cursor-pointer"
                >
                  Tạo và Quét
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Document Manually */}
      {showAddDocModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-md font-black text-slate-800 uppercase tracking-wider">Thêm chứng từ thủ công</h3>
              <button 
                onClick={() => setShowAddDocModal(false)}
                className="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddManualDocument} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Loại chứng từ</label>
                <select 
                  value={addDocType}
                  onChange={(e) => setAddDocType(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-700 transition"
                >
                  <option value="REQUEST">Phiếu đề xuất (REQUEST)</option>
                  <option value="PURCHASE_ORDER">Phiếu mua sắm (PURCHASE_ORDER)</option>
                  <option value="DELIVERY">Phiếu giao hàng (DELIVERY)</option>
                  <option value="WAREHOUSE_RECEIPT">Phiếu nhập kho (WAREHOUSE_RECEIPT)</option>
                  <option value="HANDOVER">Phiếu bàn giao (HANDOVER)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mã chứng từ (document_code)</label>
                <input 
                  type="text" 
                  placeholder="Nhập chính xác mã chứng từ..."
                  value={addDocCode}
                  onChange={(e) => setAddDocCode(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-700 transition"
                  required
                />
              </div>

              <div className="border-t border-slate-100 pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="w-1/2 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-500 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingDoc}
                  className="w-1/2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-500/20 transition cursor-pointer"
                >
                  {submittingDoc ? 'Đang thêm...' : 'Lưu lại'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
