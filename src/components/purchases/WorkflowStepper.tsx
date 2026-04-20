import React from 'react';
import { Check, Clock, Package, ShoppingCart, Truck, CheckCircle, XCircle } from 'lucide-react';

interface WorkflowStep {
  id: string;
  label: string;
  icon: any;
  status: 'PENDING' | 'CURRENT' | 'COMPLETED' | 'ERROR';
}

interface WorkflowStepperProps {
  currentStatus: string;
}

const WorkflowStepper: React.FC<WorkflowStepperProps> = ({ currentStatus }) => {
  const steps = [
    { id: 'DRAFT', label: 'Nháp', icon: Clock },
    { id: 'PENDING_APPROVAL', label: 'Chờ Duyệt', icon: Package },
    { id: 'APPROVED', label: 'Đã Duyệt', icon: CheckCircle },
    { id: 'ORDERED', label: 'Đặt Hàng', icon: ShoppingCart },
    { id: 'DELIVERING', label: 'Đang Giao', icon: Truck },
    { id: 'RECEIVED', label: 'Đã Nhận', icon: Check },
    { id: 'COMPLETED', label: 'Hoàn Tất', icon: CheckCircle },
  ];

  const getStatusIndex = (status: string) => {
    if (status === 'REJECTED' || status === 'CANCELLED') return -1;
    const mapping: Record<string, number> = {
      'DRAFT': 0,
      'PENDING_APPROVAL': 1,
      'APPROVED': 2,
      'ORDERED': 3,
      'DELIVERING': 4,
      'PARTIALLY_DELIVERED': 4,
      'RECEIVED': 5,
      'COMPLETED': 6
    };
    return mapping[status] ?? 0;
  };

  const currentIndex = getStatusIndex(currentStatus);
  const isFailed = currentStatus === 'REJECTED' || currentStatus === 'CANCELLED';

  return (
    <div className="w-full py-6 px-4 print:hidden">
      <div className="flex items-start justify-between relative">
        {/* Connector Line */}
        <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-200 z-0"></div>
        <div 
            className="absolute top-5 left-0 h-0.5 bg-indigo-500 z-0 transition-all duration-500" 
            style={{ width: `${currentIndex >= 0 ? (currentIndex / (steps.length - 1)) * 100 : 0}%` }}
        ></div>

        {steps.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex flex-col items-center relative z-10 group">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-2 ${
                isCompleted 
                  ? 'bg-indigo-600 border-indigo-600 text-white' 
                  : isCurrent 
                    ? 'bg-white border-indigo-600 text-indigo-600 shadow-lg shadow-indigo-200 scale-110' 
                    : 'bg-white border-slate-200 text-slate-400'
              }`}>
                {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <p className={`mt-3 text-[10px] font-black uppercase tracking-widest text-center max-w-[80px] leading-tight ${
                isCurrent ? 'text-indigo-600' : isCompleted ? 'text-slate-800' : 'text-slate-400'
              }`}>
                {step.label}
              </p>
            </div>
          );
        })}

        {isFailed && (
            <div className="flex flex-col items-center relative z-10 ml-4 animate-pulse">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-500 border-2 border-rose-500 text-white shadow-lg shadow-rose-200">
                    <XCircle className="w-5 h-5" />
                </div>
                <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-rose-600 text-center">
                    {currentStatus === 'REJECTED' ? 'Từ Chối' : 'Đã Hủy'}
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowStepper;
