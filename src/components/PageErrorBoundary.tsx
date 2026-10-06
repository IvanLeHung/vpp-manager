import React from 'react';
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';

interface PageErrorBoundaryProps {
  children: React.ReactNode;
  resetKey: string;
  onBack: () => void;
  onRetry: () => void;
}

interface PageErrorBoundaryState {
  hasError: boolean;
}

class PageErrorBoundary extends React.Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  state: PageErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PageErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[page-error] Purchase detail failed to render', error, info);
  }

  componentDidUpdate(previousProps: PageErrorBoundaryProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-full bg-slate-50 p-6 flex items-center justify-center">
        <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">Không thể hiển thị chi tiết phiếu</h2>
          <p className="mt-2 text-sm text-slate-500">
            Dữ liệu phiếu chưa tải đúng hoặc có định dạng không hợp lệ. Bạn có thể thử tải lại mà không cần làm mới toàn bộ trang.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={this.props.onBack} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" /> Quay lại
            </button>
            <button onClick={this.props.onRetry} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
              <RotateCcw className="h-4 w-4" /> Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default PageErrorBoundary;
