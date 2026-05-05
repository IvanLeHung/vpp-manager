import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, Info, AlertTriangle, CheckCircle2, MessageSquare, ListChecks } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function timeAgo(date: Date | string) {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Vừa xong';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} ngày trước`;
  
  return past.toLocaleDateString('vi-VN');
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  requestId: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data);
      setUnreadCount(res.data.unreadCount);
    } catch (error) {
      console.error('Lỗi tải thông báo:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Tự động làm mới sau mỗi 60 giây
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Lỗi đánh dấu đã đọc:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Lỗi đánh dấu tất cả:', error);
    }
  };

  const handleItemClick = (notif: Notification) => {
    if (!notif.isRead) markAsRead(notif.id);
    setIsOpen(false);
    if (notif.requestId) {
      navigate(`/requests/${notif.requestId}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ADMIN_APPROVED':
      case 'COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'REJECTED':
      case 'RETURNED':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case 'PENDING_APPROVAL':
      case 'PENDING_ADMIN':
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 rounded-xl transition-all duration-300",
          isOpen ? "bg-indigo-50 text-indigo-600 shadow-inner" : "bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-200"
        )}
      >
        <Bell className={cn("w-5 h-5", isOpen && "animate-tada")} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white animate-in zoom-in duration-300">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-[400px] max-w-[calc(100vw-2rem)] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-[110] animate-in slide-in-from-top-2 duration-200 flex flex-col max-h-[550px]">
          {/* Arrow pointing up */}
          <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-t border-l border-slate-200 rotate-45 z-[-1]"></div>
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    Thông báo
                    {unreadCount > 0 && <span className="flex h-5 items-center px-2 bg-rose-500 text-white rounded-full text-[10px] font-black">{unreadCount}</span>}
                </h3>
            </div>
            {unreadCount > 0 && (
                <button 
                    onClick={markAllAsRead}
                    className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-wider flex items-center gap-1"
                >
                    Đọc tất cả <Check className="w-3 h-3" />
                </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                    <MessageSquare className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-xs font-bold text-slate-400">Bạn chưa có thông báo nào</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={cn(
                      "w-full text-left px-6 py-5 flex gap-4 transition-all hover:bg-slate-50 group relative",
                      !notif.isRead && "bg-blue-50/30"
                    )}
                  >
                    {!notif.isRead && (
                        <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 rounded-r-full"></div>
                    )}
                    <div className="mt-1 shrink-0">
                      <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110 duration-300",
                        notif.isRead ? "bg-slate-50 border-slate-100 text-slate-400" : "bg-white border-white shadow-sm"
                      )}>
                        {getIcon(notif.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className={cn(
                          "text-xs font-black",
                          notif.isRead ? "text-slate-600" : "text-slate-800"
                        )}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p className={cn(
                        "text-[11px] leading-relaxed whitespace-pre-wrap",
                        notif.isRead ? "text-slate-400 font-medium" : "text-slate-600 font-bold"
                      )}>
                        {notif.message}
                      </p>
                      
                      {notif.requestId && (
                        <div className="mt-2 flex items-center gap-1.5 text-[9px] font-black text-indigo-500 uppercase tracking-tighter bg-indigo-50 w-fit px-2 py-0.5 rounded-lg border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                           <ListChecks className="w-3 h-3" /> Chi tiết: {notif.requestId}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 text-center bg-white sticky bottom-0">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hệ thống thông báo thời gian thực</p>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes tada {
          0% { transform: scale(1); }
          10%, 20% { transform: scale(0.9) rotate(-3deg); }
          30%, 50%, 70%, 90% { transform: scale(1.1) rotate(3deg); }
          40%, 60%, 80% { transform: scale(1.1) rotate(-3deg); }
          100% { transform: scale(1) rotate(0); }
        }
        .animate-tada {
          animation: tada 1s ease-in-out infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
