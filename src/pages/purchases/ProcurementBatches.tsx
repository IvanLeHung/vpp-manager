import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { 
  Plus, Lock, FileSpreadsheet, Trash2, PlusCircle, AlertTriangle, 
  ArrowLeft, RefreshCw, Database, X, Folder
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

  // Improvements Phase 1: Tabs, Filters, and Preview States
  const [activeDetailTab, setActiveDetailTab] = useState('overview');
  const [filterDocCode, setFilterDocCode] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [previewDoc, setPreviewDoc] = useState<{ type: string; id: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

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
      // Reset active tab and filters on batch change
      setActiveDetailTab('overview');
      setFilterDocCode('');
      setFilterDept('');
      setFilterStatus('');
      setFilterStartDate('');
      setFilterEndDate('');
    }
  }, [selectedBatchId]);

  useEffect(() => {
    if (previewDoc && previewDoc.id && previewDoc.type) {
      const fetchPreview = async () => {
        try {
          setPreviewLoading(true);
          setPreviewData(null);
          const res = await api.get(`/procurement-batches/document/${previewDoc.type}/${previewDoc.id}`);
          setPreviewData(res.data);
        } catch (err: any) {
          toast.error(err.response?.data?.error || 'Lỗi tải chi tiết tài liệu');
        } finally {
          setPreviewLoading(false);
        }
      };
      fetchPreview();
    }
  }, [previewDoc]);

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

  const handleRefreshReadyData = async () => {
    if (!selectedBatchId) return;
    try {
      setDetailLoading(true);
      // We just need to refetch the batch details which will pull the live data again since it is not LOCKED
      await fetchBatchDetails(selectedBatchId);
      toast.success('Đã làm mới dữ liệu!');
    } catch (err: any) {
      toast.error('Lỗi làm mới dữ liệu');
    } finally {
      setDetailLoading(false);
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
      toast.info('Đang tạo báo cáo, vui lòng đợi...');
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
      DRAFT: { label: '🟡 Đang rà soát', style: 'bg-amber-50 text-amber-800 border-amber-200' },
      READY: { label: '🟢 Sẵn sàng', style: 'bg-indigo-50 text-indigo-850 border-indigo-200' },
      LOCKED: { label: '🔒 Đã chốt (LOCKED)', style: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
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

  const uniqueDepartments = React.useMemo(() => {
    if (!itemsList) return [];
    const depts = new Set<string>();
    itemsList.forEach((i: any) => {
      if (i.departmentName) depts.add(i.departmentName);
    });
    return Array.from(depts);
  }, [itemsList]);

  const getUniqueStatusesForType = (docType: string) => {
    if (!itemsList) return [];
    const statuses = new Set<string>();
    itemsList.forEach((i: any) => {
      if (i.documentType === docType && i.documentStatus) {
        statuses.add(i.documentStatus);
      }
    });
    return Array.from(statuses);
  };

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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <button 
              onClick={() => { setSelectedBatchId(null); setBatchDetail(null); fetchBatches(); }}
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:text-slate-800 shadow-sm transition cursor-pointer self-start"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl font-black text-slate-800">📁 {batchDetail.batchName}</span>
                <span className="text-slate-400 font-bold bg-slate-100 px-2.5 py-0.5 rounded-lg border text-xs">({batchDetail.batchCode})</span>
                {getStatusBadge(batchDetail.status)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5 text-xs text-slate-500 font-semibold pt-1">
                <div>
                  Loại: <span className="font-black text-slate-700">{batchDetail.batchType === 'VPP' ? 'Văn phòng phẩm' : batchDetail.batchType === 'VE_SINH' ? 'Tạp hóa / Vệ sinh' : 'Loại khác'}</span>
                </div>
                <div>
                  Kỳ batch: <span className="font-black text-slate-700">
                    {batchDetail.filterConfigJson?.created_date_from && batchDetail.filterConfigJson?.created_date_to
                      ? `${new Date(batchDetail.filterConfigJson.created_date_from).toLocaleDateString('vi-VN')} - ${new Date(batchDetail.filterConfigJson.created_date_to).toLocaleDateString('vi-VN')}`
                      : batchDetail.periodMonth 
                      ? `${String(batchDetail.periodMonth).padStart(2, '0')}/${batchDetail.periodYear}` 
                      : 'Kỳ tự do'}
                  </span>
                </div>
                <div>
                  Người tạo: <span className="font-black text-slate-700">{batchDetail.createdBy || 'Hệ thống'}</span>
                </div>
                <div>
                  Ngày tạo: <span className="font-black text-slate-700">{new Date(batchDetail.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <div>
                  Cập nhật cuối: <span className="font-black text-slate-700">{new Date(batchDetail.updatedAt).toLocaleString('vi-VN')}</span>
                </div>
                {batchDetail.status === 'LOCKED' && (
                  <div>
                    Người chốt: <span className="font-black text-slate-700">{batchDetail.lockedBy || 'Hệ thống'}</span>
                  </div>
                )}
                {batchDetail.status === 'LOCKED' && batchDetail.lockedAt && (
                  <div>
                    Thời gian chốt: <span className="font-black text-slate-700">{new Date(batchDetail.lockedAt).toLocaleString('vi-VN')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
            {batchDetail.status === 'DRAFT' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && (
              <button
                onClick={handleSetReady}
                className="bg-indigo-650 hover:bg-indigo-755 text-white font-black text-xs uppercase px-5 py-3 rounded-xl tracking-wider shadow-md shadow-indigo-500/10 active:scale-95 transition cursor-pointer"
              >
                Đánh dấu Sẵn sàng
              </button>
            )}
            {batchDetail.status === 'READY' && (
              <button
                onClick={handleRefreshReadyData}
                className="bg-sky-50 hover:bg-sky-100 text-sky-600 font-black text-xs uppercase px-4 py-3 rounded-xl tracking-wider border border-sky-200 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                title="Làm mới dữ liệu theo cấu hình lọc hiện tại"
              >
                <RefreshCw className="w-4 h-4" /> Làm mới
              </button>
            )}
            {batchDetail.status === 'READY' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && (
              <button
                onClick={handleLockBatch}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase px-5 py-3 rounded-xl tracking-wider shadow-md shadow-emerald-500/10 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-4 h-4" /> Chốt Batch hồ sơ
              </button>
            )}
            {batchDetail.status !== 'LOCKED' && currentUser?.role === 'ADMIN' && (
              <button
                onClick={handleDeleteBatch}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-xs uppercase px-4 py-3 rounded-xl tracking-wider border border-rose-200 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4.5 h-4.5" /> Xóa Batch
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
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <RefreshCw className="w-10 h-10 text-indigo-650 animate-spin mb-4" />
            <p className="text-slate-550 font-bold">Đang tải chi tiết hồ sơ...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Tabs Navigation */}
            <div className="flex flex-wrap items-center border-b border-slate-200 gap-1 bg-slate-50 p-1.5 rounded-2xl shadow-inner">
              <button
                onClick={() => setActiveDetailTab('overview')}
                className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  activeDetailTab === 'overview'
                    ? 'bg-white text-indigo-650 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                📊 Tổng quan
              </button>
              <button
                onClick={() => setActiveDetailTab('REQUEST')}
                className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  activeDetailTab === 'REQUEST'
                    ? 'bg-white text-indigo-650 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                📄 Đề xuất ({itemsList?.filter((i: any) => i.documentType === 'REQUEST').length || 0})
              </button>
              <button
                onClick={() => setActiveDetailTab('PURCHASE_ORDER')}
                className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  activeDetailTab === 'PURCHASE_ORDER'
                    ? 'bg-white text-indigo-650 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                🛒 Mua sắm ({itemsList?.filter((i: any) => i.documentType === 'PURCHASE_ORDER').length || 0})
              </button>
              <button
                onClick={() => setActiveDetailTab('DELIVERY')}
                className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  activeDetailTab === 'DELIVERY'
                    ? 'bg-white text-indigo-650 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                🚚 Giao hàng ({itemsList?.filter((i: any) => i.documentType === 'DELIVERY').length || 0})
              </button>
              <button
                onClick={() => setActiveDetailTab('WAREHOUSE_RECEIPT')}
                className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  activeDetailTab === 'WAREHOUSE_RECEIPT'
                    ? 'bg-white text-indigo-650 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                📦 Nhập kho ({itemsList?.filter((i: any) => i.documentType === 'WAREHOUSE_RECEIPT').length || 0})
              </button>
              <button
                onClick={() => setActiveDetailTab('HANDOVER')}
                className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  activeDetailTab === 'HANDOVER'
                    ? 'bg-white text-indigo-650 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                🤝 Bàn giao ({itemsList?.filter((i: any) => i.documentType === 'HANDOVER').length || 0})
              </button>
              <button
                onClick={() => setActiveDetailTab('HISTORY')}
                className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  activeDetailTab === 'HISTORY'
                    ? 'bg-white text-indigo-650 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                ⏳ Lịch sử xuất
              </button>
            </div>

            {/* TAB: OVERVIEW */}
            {activeDetailTab === 'overview' && (
              <div className="space-y-8 animate-in fade-in duration-150">
                {/* Dashboard Metrics Grid */}
                {dashboardData && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-sm text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">📄 Đề xuất</p>
                      <p className="text-2xl font-black text-slate-800 mt-1">{dashboardData.total_request}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-sm text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">🛒 Mua sắm (PO)</p>
                      <p className="text-2xl font-black text-slate-800 mt-1">{dashboardData.total_purchase_order}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-sm text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">🚚 Giao hàng</p>
                      <p className="text-2xl font-black text-slate-800 mt-1">{dashboardData.total_delivery}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-sm text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">📦 Nhập kho</p>
                      <p className="text-2xl font-black text-slate-800 mt-1">{dashboardData.total_warehouse_receipt}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-sm text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">🤝 Bàn giao</p>
                      <p className="text-2xl font-black text-slate-800 mt-1">{dashboardData.total_handover}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-sm text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">🏢 Phòng ban</p>
                      <p className="text-2xl font-black text-slate-800 mt-1">{uniqueDepartments.length}</p>
                    </div>
                    <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100 p-4 shadow-sm text-center">
                      <p className="text-[10px] font-black text-indigo-550 uppercase tracking-wider">Tổng chứng từ</p>
                      <p className="text-2xl font-black text-indigo-700 mt-1">{dashboardData.total_documents}</p>
                    </div>
                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') ? (
                      <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-4 shadow-sm text-center col-span-2 lg:col-span-1">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Tổng giá trị</p>
                        <p className="text-sm font-black text-emerald-700 mt-2 truncate">
                          {Number(dashboardData.total_amount || 0).toLocaleString('vi-VN')} đ
                        </p>
                      </div>
                    ) : (
                      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 shadow-sm text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tổng giá trị</p>
                        <p className="text-xs font-bold text-slate-400 mt-2">🔒 Bảo mật</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Progress Bar Component */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">🚀 Tiến độ hoàn tất hồ sơ</h3>
                    <p className="text-xs text-slate-450 mt-0.5">Tỷ lệ các loại chứng từ đã hoàn thành (COMPLETED, EXECUTED, HANDED_OVER, DELIVERED, RECEIVED).</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {/* Đề xuất Progress */}
                      {(() => {
                        const list = itemsList?.filter((i: any) => i.documentType === 'REQUEST') || [];
                        const total = list.length;
                        const completed = list.filter((i: any) => ['COMPLETED', 'EXECUTED', 'HANDED_OVER', 'DELIVERED', 'RECEIVED'].includes(i.documentStatus?.toUpperCase())).length;
                        const ratio = total > 0 ? Math.round((completed / total) * 100) : 0;
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-slate-650">Đề xuất hoàn tất</span>
                              <span className="text-slate-550">{completed}/{total} ({ratio}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <div className="bg-indigo-650 h-full rounded-full transition-all duration-500" style={{ width: `${ratio}%` }}></div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Mua sắm Progress */}
                      {(() => {
                        const list = itemsList?.filter((i: any) => i.documentType === 'PURCHASE_ORDER') || [];
                        const total = list.length;
                        const completed = list.filter((i: any) => ['COMPLETED', 'EXECUTED', 'HANDED_OVER', 'DELIVERED', 'RECEIVED'].includes(i.documentStatus?.toUpperCase())).length;
                        const ratio = total > 0 ? Math.round((completed / total) * 100) : 0;
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-slate-650">Mua sắm (PO) hoàn tất</span>
                              <span className="text-slate-550">{completed}/{total} ({ratio}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <div className="bg-indigo-650 h-full rounded-full transition-all duration-500" style={{ width: `${ratio}%` }}></div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Giao hàng Progress */}
                      {(() => {
                        const list = itemsList?.filter((i: any) => i.documentType === 'DELIVERY') || [];
                        const total = list.length;
                        const completed = list.filter((i: any) => ['COMPLETED', 'EXECUTED', 'HANDED_OVER', 'DELIVERED', 'RECEIVED'].includes(i.documentStatus?.toUpperCase())).length;
                        const ratio = total > 0 ? Math.round((completed / total) * 100) : 0;
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-slate-650">Giao hàng hoàn tất</span>
                              <span className="text-slate-550">{completed}/{total} ({ratio}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <div className="bg-indigo-650 h-full rounded-full transition-all duration-500" style={{ width: `${ratio}%` }}></div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="space-y-4">
                      {/* Nhập kho Progress */}
                      {(() => {
                        const list = itemsList?.filter((i: any) => i.documentType === 'WAREHOUSE_RECEIPT') || [];
                        const total = list.length;
                        const completed = list.filter((i: any) => ['COMPLETED', 'EXECUTED', 'HANDED_OVER', 'DELIVERED', 'RECEIVED'].includes(i.documentStatus?.toUpperCase())).length;
                        const ratio = total > 0 ? Math.round((completed / total) * 100) : 0;
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-slate-650">Nhập kho hoàn tất</span>
                              <span className="text-slate-550">{completed}/{total} ({ratio}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <div className="bg-indigo-650 h-full rounded-full transition-all duration-500" style={{ width: `${ratio}%` }}></div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Bàn giao Progress */}
                      {(() => {
                        const list = itemsList?.filter((i: any) => i.documentType === 'HANDOVER') || [];
                        const total = list.length;
                        const completed = list.filter((i: any) => ['COMPLETED', 'EXECUTED', 'HANDED_OVER', 'DELIVERED', 'RECEIVED'].includes(i.documentStatus?.toUpperCase())).length;
                        const ratio = total > 0 ? Math.round((completed / total) * 100) : 0;
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-slate-650">Bàn giao hoàn tất</span>
                              <span className="text-slate-550">{completed}/{total} ({ratio}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <div className="bg-indigo-650 h-full rounded-full transition-all duration-500" style={{ width: `${ratio}%` }}></div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Hoàn tất tổng Progress */}
                      {(() => {
                        const list = itemsList || [];
                        const total = list.length;
                        const completed = list.filter((i: any) => ['COMPLETED', 'EXECUTED', 'HANDED_OVER', 'DELIVERED', 'RECEIVED'].includes(i.documentStatus?.toUpperCase())).length;
                        const ratio = total > 0 ? Math.round((completed / total) * 100) : 0;
                        return (
                          <div className="space-y-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 shadow-inner">
                            <div className="flex items-center justify-between text-xs font-black">
                              <span className="text-slate-800">TỔNG THỂ HOÀN TẤT BATCH</span>
                              <span className="text-indigo-650">{completed}/{total} ({ratio}%)</span>
                            </div>
                            <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden mt-1.5">
                              <div className="bg-gradient-to-r from-indigo-500 to-indigo-650 h-full rounded-full transition-all duration-500" style={{ width: `${ratio}%` }}></div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: DOCUMENT TYPES (REQUEST, PURCHASE_ORDER, DELIVERY, WAREHOUSE_RECEIPT, HANDOVER) */}
            {['REQUEST', 'PURCHASE_ORDER', 'DELIVERY', 'WAREHOUSE_RECEIPT', 'HANDOVER'].includes(activeDetailTab) && (
              <div className="bg-white rounded-3xl border border-slate-200/70 overflow-hidden shadow-sm animate-in fade-in duration-150 space-y-4">
                
                {/* Filter Toolbar inside Tab */}
                <div className="p-5 border-b border-slate-100 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      Danh sách {getDocTypeLabel(activeDetailTab).toLowerCase()} trong Batch
                    </h3>
                    
                    {batchDetail.status !== 'LOCKED' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && (
                      <button
                        onClick={() => { setAddDocType(activeDetailTab); setShowAddDocModal(true); }}
                        className="bg-indigo-650 hover:bg-indigo-700 text-white font-black text-[10px] uppercase rounded-xl px-4 py-2.5 flex items-center gap-1.5 transition cursor-pointer self-start"
                      >
                        <PlusCircle className="w-4 h-4" /> Thêm phiếu thủ công
                      </button>
                    )}
                  </div>

                  {/* Filter controls row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                    {/* Search */}
                    <div>
                      <label className="block text-[9px] font-black text-slate-450 uppercase mb-1 tracking-wider">Tìm kiếm mã</label>
                      <input 
                        type="text" 
                        placeholder="Tìm mã chứng từ..."
                        value={filterDocCode}
                        onChange={(e) => setFilterDocCode(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-bold text-slate-700 focus:bg-white transition"
                      />
                    </div>
                    {/* Department */}
                    <div>
                      <label className="block text-[9px] font-black text-slate-450 uppercase mb-1 tracking-wider">Bộ phận / Phòng ban</label>
                      <select
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-bold text-slate-700 focus:bg-white transition"
                      >
                        <option value="">— Tất cả bộ phận —</option>
                        {uniqueDepartments.map((d: any) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    {/* Status */}
                    <div>
                      <label className="block text-[9px] font-black text-slate-450 uppercase mb-1 tracking-wider">Trạng thái</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-bold text-slate-700 focus:bg-white transition"
                      >
                        <option value="">— Tất cả trạng thái —</option>
                        {getUniqueStatusesForType(activeDetailTab).map((s: any) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    {/* Date From */}
                    <div>
                      <label className="block text-[9px] font-black text-slate-450 uppercase mb-1 tracking-wider">Từ ngày lập</label>
                      <input 
                        type="date" 
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-bold text-slate-700 focus:bg-white transition"
                      />
                    </div>
                    {/* Date To */}
                    <div>
                      <label className="block text-[9px] font-black text-slate-450 uppercase mb-1 tracking-wider">Đến ngày lập</label>
                      <input 
                        type="date" 
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-bold text-slate-700 focus:bg-white transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Table Data */}
                {(() => {
                  // Filter itemsList
                  const filteredTabItems = (itemsList || []).filter((i: any) => {
                    if (i.documentType !== activeDetailTab) return false;
                    if (filterDocCode && !i.documentCode?.toUpperCase().includes(filterDocCode.toUpperCase())) return false;
                    if (filterDept && i.departmentName !== filterDept) return false;
                    if (filterStatus && i.documentStatus !== filterStatus) return false;
                    if (filterStartDate && i.documentDate && new Date(i.documentDate) < new Date(filterStartDate)) return false;
                    if (filterEndDate && i.documentDate) {
                      const end = new Date(filterEndDate);
                      end.setHours(23, 59, 59, 999);
                      if (new Date(i.documentDate) > end) return false;
                    }
                    return true;
                  });

                  if (filteredTabItems.length === 0) {
                    return (
                      <div className="p-16 text-center text-slate-450 font-bold text-xs uppercase tracking-wide bg-slate-50/50">
                        📭 Chưa có {getDocTypeLabel(activeDetailTab).toLowerCase()} nào phù hợp trong batch này.
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black text-[9px] uppercase tracking-wider">
                            <th className="py-4 px-6" style={{ width: '6%' }}>STT</th>
                            <th className="py-4 px-6" style={{ width: '22%' }}>Mã chứng từ</th>
                            <th className="py-4 px-6" style={{ width: '14%' }}>Ngày lập</th>
                            <th className="py-4 px-6" style={{ width: '24%' }}>Phòng ban</th>
                            {activeDetailTab === 'PURCHASE_ORDER' && (
                              <th className="py-4 px-6" style={{ width: '22%' }}>Nhà cung cấp</th>
                            )}
                            {activeDetailTab === 'HANDOVER' && (
                              <th className="py-4 px-6" style={{ width: '22%' }}>Người nhận</th>
                            )}
                            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && (
                              <th className="py-4 px-6 text-right" style={{ width: '13%' }}>Giá trị</th>
                            )}
                            <th className="py-4 px-6 text-center" style={{ width: '12%' }}>Trạng thái</th>
                            {batchDetail.status !== 'LOCKED' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && (
                              <th className="py-4 px-6 text-center" style={{ width: '8%' }}>Thao tác</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-700">
                          {filteredTabItems.map((item: any, idx: number) => {
                            // Extract extra properties if snap or try to fetch
                            const supplierName = item.supplier || (item.documentType === 'PURCHASE_ORDER' && item.addedMethod === 'AUTO_SNAP' ? '—' : '—');
                            const receiverName = item.receiver || (item.documentType === 'HANDOVER' && item.addedMethod === 'AUTO_SNAP' ? '—' : '—');

                            return (
                              <tr key={item.id} className="hover:bg-slate-50/60 transition">
                                <td className="py-4 px-6 text-slate-400 font-bold">{idx + 1}</td>
                                <td className="py-4 px-6">
                                  <button
                                    onClick={() => setPreviewDoc({ type: item.documentType, id: item.documentId })}
                                    className="font-extrabold text-indigo-650 hover:text-indigo-850 hover:underline text-left cursor-pointer flex items-center gap-1.5"
                                  >
                                    {item.documentCode}
                                  </button>
                                  {item.addedMethod === 'MANUAL' && (
                                    <span className="block mt-1 text-[8px] font-black uppercase text-amber-600 tracking-wider">Thủ công</span>
                                  )}
                                </td>
                                <td className="py-4 px-6 text-slate-500">
                                  {item.documentDate ? new Date(item.documentDate).toLocaleDateString('vi-VN') : '—'}
                                </td>
                                <td className="py-4 px-6 font-semibold">{item.departmentName || 'Khác'}</td>
                                {activeDetailTab === 'PURCHASE_ORDER' && (
                                  <td className="py-4 px-6 text-slate-500 font-bold">{supplierName}</td>
                                )}
                                {activeDetailTab === 'HANDOVER' && (
                                  <td className="py-4 px-6 text-slate-655 font-bold">{receiverName}</td>
                                )}
                                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && (
                                  <td className="py-4 px-6 text-right font-black text-slate-800">
                                    {Number(item.amount || 0).toLocaleString('vi-VN')} đ
                                  </td>
                                )}
                                <td className="py-4 px-6 text-center">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                    ['COMPLETED', 'EXECUTED', 'HANDED_OVER', 'DELIVERED', 'RECEIVED'].includes(item.documentStatus?.toUpperCase())
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}>
                                    {item.documentStatus}
                                  </span>
                                </td>
                                {batchDetail.status !== 'LOCKED' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'WAREHOUSE') && (
                                  <td className="py-4 px-6 text-center">
                                    <button 
                                      onClick={() => handleRemoveDocument(item.id)}
                                      className="text-slate-400 hover:text-rose-600 transition p-1.5 cursor-pointer"
                                      title="Loại bỏ khỏi batch"
                                    >
                                      <Trash2 className="w-4.5 h-4.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB: HISTORY */}
            {activeDetailTab === 'HISTORY' && (
              <div className="bg-white rounded-3xl border border-slate-200/70 overflow-hidden shadow-sm p-6 space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black text-slate-850 uppercase tracking-wider">Lịch sử xuất báo cáo batch</h3>
                  {/* Quick Export report dropdown */}
                  <div className="relative group">
                    <button className="bg-indigo-650 hover:bg-indigo-755 text-white font-black text-[10px] uppercase rounded-xl px-4 py-2.5 flex items-center gap-1.5 transition cursor-pointer">
                      <FileSpreadsheet className="w-4 h-4" /> Xuất báo cáo mới
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
                
                {(!batchDetail.exports || batchDetail.exports.length === 0) ? (
                  <div className="py-10 text-center text-slate-400 font-bold text-xs uppercase tracking-wide">
                    📭 Chưa có lịch sử xuất báo cáo nào cho batch này.
                  </div>
                ) : (
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
                            className="text-indigo-650 hover:text-indigo-850 font-black hover:underline cursor-pointer"
                          >
                            Tải xuống &darr;
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}

      {/* Polymorphic Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black text-indigo-650 uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                  Chi tiết chứng từ ({getDocTypeLabel(previewDoc.type)})
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-1 flex items-center gap-2">
                  Mã: <span className="font-extrabold text-indigo-650">{previewDoc.id}</span>
                  {previewData?.status && (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border bg-slate-100 text-slate-650 border-slate-200">
                      {previewData.status}
                    </span>
                  )}
                </h3>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)} 
                className="p-2 hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 text-slate-700">
              {previewLoading && (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin"></div>
                  <p className="text-xs font-bold text-slate-400">Đang tải thông tin tài liệu...</p>
                </div>
              )}

              {!previewLoading && !previewData && (
                <div className="py-10 text-center text-slate-400 font-bold text-xs">
                  Không tìm thấy chi tiết tài liệu hoặc lỗi kết nối.
                </div>
              )}

              {!previewLoading && previewData && (
                <div className="space-y-6">
                  {/* 1. REQUEST details */}
                  {previewDoc.type === 'REQUEST' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Người đề xuất</p>
                          <p className="font-bold text-slate-800">{previewData.requester?.fullName || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Bộ phận / Phòng ban</p>
                          <p className="font-bold text-slate-800">{previewData.department || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Ngày lập đề xuất</p>
                          <p className="font-bold text-slate-800">{new Date(previewData.createdAt).toLocaleDateString('vi-VN')}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Mục đích sử dụng</p>
                          <p className="font-bold text-slate-800 italic">"{previewData.purpose || 'Không ghi nhận'}"</p>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mt-6">Danh sách hàng hóa</h4>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-100 font-black">
                            <th className="py-2 w-8 text-center">STT</th>
                            <th className="py-2">Hàng hóa</th>
                            <th className="py-2 text-center w-16">ĐVT</th>
                            <th className="py-2 text-center w-20">Yêu cầu</th>
                            <th className="py-2 text-center w-20">Đã duyệt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {previewData.lines?.map((line: any, idx: number) => (
                            <tr key={line.id} className="hover:bg-slate-50/50">
                              <td className="py-3 text-center text-slate-300 font-medium">{idx + 1}</td>
                              <td className="py-3 font-semibold text-slate-800">
                                {line.item?.name}
                                <span className="block text-[10px] text-slate-400 font-normal">{line.item?.mvpp}</span>
                              </td>
                              <td className="py-3 text-center text-slate-500 font-medium">{line.item?.unit}</td>
                              <td className="py-3 text-center font-bold text-slate-650">{line.qtyRequested}</td>
                              <td className="py-3 text-center font-black text-indigo-650">{line.qtyApproved ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 2. PURCHASE_ORDER details */}
                  {previewDoc.type === 'PURCHASE_ORDER' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Nhà cung cấp</p>
                          <p className="font-bold text-slate-800">{previewData.supplier || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Tổng giá trị PO</p>
                          <p className="font-bold text-emerald-600">{Number(previewData.totalAmount || 0).toLocaleString('vi-VN')} VNĐ</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Ngày hẹn giao</p>
                          <p className="font-bold text-slate-800">{previewData.expectedDate ? new Date(previewData.expectedDate).toLocaleDateString('vi-VN') : '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Người lập đề nghị</p>
                          <p className="font-bold text-slate-800">{previewData.requesterName || previewData.requester?.fullName || 'N/A'}</p>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mt-6">Danh sách vật tư đặt hàng</h4>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-100 font-black">
                            <th className="py-2 w-8 text-center">STT</th>
                            <th className="py-2">Mặt hàng</th>
                            <th className="py-2 text-center w-16">ĐVT</th>
                            <th className="py-2 text-center w-24">Số lượng PO</th>
                            <th className="py-2 text-right w-28">Đơn giá (VNĐ)</th>
                            <th className="py-2 text-right w-32">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {previewData.lines?.map((line: any, idx: number) => (
                            <tr key={line.id} className="hover:bg-slate-50/50">
                              <td className="py-3 text-center text-slate-300 font-medium">{idx + 1}</td>
                              <td className="py-3 font-semibold text-slate-800">
                                {line.item?.name}
                                <span className="block text-[10px] text-slate-400 font-normal">{line.item?.mvpp}</span>
                              </td>
                              <td className="py-3 text-center text-slate-500 font-medium">{line.item?.unit}</td>
                              <td className="py-3 text-center font-bold text-slate-800">{line.qtyOrdered}</td>
                              <td className="py-3 text-right font-medium text-slate-600">{Number(line.unitPrice || 0).toLocaleString('vi-VN')}</td>
                              <td className="py-3 text-right font-bold text-slate-800">{Number(line.lineAmount || 0).toLocaleString('vi-VN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 3. DELIVERY details */}
                  {previewDoc.type === 'DELIVERY' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Mã vận đơn</p>
                          <p className="font-bold text-slate-800">{previewData.deliveryCode}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Người đề xuất gốc</p>
                          <p className="font-bold text-slate-800">{previewData.request?.requester?.fullName || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Phòng ban đề xuất</p>
                          <p className="font-bold text-slate-800">{previewData.request?.department || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Ngày tạo vận đơn</p>
                          <p className="font-bold text-slate-800">{new Date(previewData.createdAt).toLocaleDateString('vi-VN')}</p>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mt-6">Vật tư đang vận chuyển</h4>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-100 font-black">
                            <th className="py-2 w-8 text-center">STT</th>
                            <th className="py-2">Vật tư</th>
                            <th className="py-2 text-center w-16">ĐVT</th>
                            <th className="py-2 text-center w-24">Số lượng giao</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {previewData.items?.map((item: any, idx: number) => (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="py-3 text-center text-slate-300 font-medium">{idx + 1}</td>
                              <td className="py-3 font-semibold text-slate-800">
                                {item.requestLine?.item?.name}
                                <span className="block text-[10px] text-slate-400 font-normal">{item.requestLine?.item?.mvpp}</span>
                              </td>
                              <td className="py-3 text-center text-slate-500 font-medium">{item.requestLine?.item?.unit}</td>
                              <td className="py-3 text-center font-bold text-indigo-650">{item.issueQty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 4. WAREHOUSE_RECEIPT details */}
                  {previewDoc.type === 'WAREHOUSE_RECEIPT' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Mã đơn PO liên kết</p>
                          <p className="font-bold text-slate-800">{previewData.poId || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Nhà cung cấp</p>
                          <p className="font-bold text-slate-800">{previewData.supplier || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Thủ kho nhận hàng</p>
                          <p className="font-bold text-slate-800">{previewData.receiver?.fullName || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Ngày nhận thực tế</p>
                          <p className="font-bold text-slate-800">{new Date(previewData.receiveDate || previewData.createdAt).toLocaleDateString('vi-VN')}</p>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mt-6">Chi tiết thực nhập kho</h4>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-100 font-black">
                            <th className="py-2 w-8 text-center">STT</th>
                            <th className="py-2">Vật tư nhận</th>
                            <th className="py-2 text-center w-16">ĐVT</th>
                            <th className="py-2 text-center w-24">Yêu cầu PO</th>
                            <th className="py-2 text-center w-24">Thực nhập</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {previewData.lines?.map((line: any, idx: number) => (
                            <tr key={line.id} className="hover:bg-slate-50/50">
                              <td className="py-3 text-center text-slate-300 font-medium">{idx + 1}</td>
                              <td className="py-3 font-semibold text-slate-800">
                                {line.item?.name}
                                <span className="block text-[10px] text-slate-400 font-normal">{line.item?.mvpp}</span>
                              </td>
                              <td className="py-3 text-center text-slate-500 font-medium">{line.item?.unit}</td>
                              <td className="py-3 text-center font-bold text-slate-400">{line.qtyOrdered}</td>
                              <td className="py-3 text-center font-black text-emerald-600">{line.qtyConfirmed}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 5. HANDOVER details */}
                  {previewDoc.type === 'HANDOVER' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Mã phiếu cấp phát/bàn giao</p>
                          <p className="font-bold text-slate-800">{previewData.ticketCode}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Phòng ban nhận</p>
                          <p className="font-bold text-slate-800">{previewData.receiverDept || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Người nhận bàn giao</p>
                          <p className="font-bold text-slate-800">{previewData.receiverName || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-0.5">Ngày bàn giao</p>
                          <p className="font-bold text-slate-800">{new Date(previewData.createdAt).toLocaleDateString('vi-VN')}</p>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mt-6">Danh sách cấp phát thực tế</h4>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-100 font-black">
                            <th className="py-2 w-8 text-center">STT</th>
                            <th className="py-2">Vật tư bàn giao</th>
                            <th className="py-2 text-center w-16">ĐVT</th>
                            <th className="py-2 text-center w-24">Số lượng cấp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {previewData.lines?.map((line: any, idx: number) => (
                            <tr key={line.id} className="hover:bg-slate-50/50">
                              <td className="py-3 text-center text-slate-300 font-medium">{idx + 1}</td>
                              <td className="py-3 font-semibold text-slate-800">
                                {line.item?.name}
                                <span className="block text-[10px] text-slate-400 font-normal">{line.item?.mvpp}</span>
                              </td>
                              <td className="py-3 text-center text-slate-500 font-medium">{line.item?.unit}</td>
                              <td className="py-3 text-center font-black text-indigo-650">{line.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-xl transition text-xs uppercase tracking-wide cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
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
