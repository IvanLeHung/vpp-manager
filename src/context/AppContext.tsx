import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../lib/api';

export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'WAREHOUSE';
export type User = {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  role: UserRole;
  departmentId: string | null;
  managerId: string | null;
};

export type VPPItem = {
  id: string;
  mvpp: string;
  name: string;
  category: string;
  unit: string;
  quota: number;
  price: number;
  stock: number;
  itemType?: string;
};

export type RequestLine = {
  id: string;
  itemId: string;
  item: { name: string, mvpp: string, unit: string };
  qtyRequested: number;
  qtyApproved: number | null;
  qtyDelivered: number;
  status: string;
  note: string;
};

export type VPPRequest = {
  id: string;
  requesterId: string;
  requester: { fullName: string; department: { name: string } | null };
  department: string;           // snapshot field on Request model
  requestType: string;
  priority: string;
  purpose: string;
  status:
    | 'DRAFT' | 'PENDING_MANAGER' | 'PENDING_ADMIN' | 'RETURNED'
    | 'PARTIALLY_APPROVED' | 'APPROVED'
    | 'READY_TO_PICK' | 'PICKING' | 'READY_TO_HANDOVER'
    | 'PARTIALLY_FULFILLED' | 'OUT_OF_STOCK' | 'NEEDS_PROCUREMENT'
    | 'COMPLETED' | 'REJECTED' | 'CANCELLED'
    // legacy
    | 'READY_TO_ISSUE' | 'PARTIALLY_ISSUED' | 'WAITING_HANDOVER' | 'BACKORDER'
    | string;
  currentApproverId: string | null;
  currentHandlerRole?: string | null;
  currentApprover?: { fullName: string };
  warehouseNote?: string | null;
  createdAt: string;
  submittedAt?: string | null;
  neededByDate?: string | null;
  managerApprovedAt?: string | null;
  adminApprovedAt?: string | null;
  handoverAt?: string | null;
  lines: RequestLine[];
  rejectReason?: string;
  returnReason?: string;
  cancelReason?: string;
  revisionReason?: string;
};

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  items: VPPItem[];
  setItems: React.Dispatch<React.SetStateAction<VPPItem[]>>;
  requests: VPPRequest[];
  loading: boolean;
  refreshData: () => Promise<void>;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('vpp_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [items, setItems] = useState<VPPItem[]>([]);
  const [requests, setRequests] = useState<VPPRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const [itemsRes, reqRes] = await Promise.all([
        api.get('/items'),
        api.get('/requests')
      ]);
      
      const formattedItems = itemsRes.data.map((i: any) => ({
        id: i.id,
        mvpp: i.mvpp,
        name: i.name,
        category: i.category,
        unit: i.unit,
        quota: i.quota,
        price: Number(i.price),
        stock: i.stocks?.[0]?.quantityOnHand || 0,
        itemType: i.itemType
      }));
      setItems(formattedItems);
      setRequests(reqRes.data.data);
    } catch (err) {
      console.error('Lỗi lấy dữ liệu Data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh current user's profile from DB on every app load
  // This ensures stale JWT data (outdated managerId/departmentId) is always overwritten
  const refreshCurrentUser = async () => {
    const token = localStorage.getItem('vpp_token');
    if (!token) return;
    try {
      const res = await api.get('/auth/me');
      const freshUser = {
        id: res.data.id,
        userId: res.data.id,
        fullName: res.data.fullName,
        username: res.data.username,
        role: res.data.role,
        departmentId: res.data.departmentId ?? null,
        managerId: res.data.managerId ?? null,
      };
      setCurrentUser(freshUser);
      localStorage.setItem('vpp_user', JSON.stringify(freshUser));
      console.log('[AppContext] User profile refreshed from DB:', freshUser.username, 'managerId:', freshUser.managerId);
    } catch (err) {
      console.warn('[AppContext] Could not refresh user profile (token may be expired):', err);
    }
  };

  useEffect(() => {
    // On mount: always sync user profile from DB to handle admin updates to managerId/departmentId
    refreshCurrentUser();
  }, []);

  useEffect(() => {
    refreshData();
  }, [currentUser]);


  const logout = () => {
    localStorage.removeItem('vpp_token');
    localStorage.removeItem('vpp_user');
    setCurrentUser(null);
  };

  return (
    <AppContext.Provider value={{ currentUser, setCurrentUser, items, setItems, requests, loading, refreshData, logout }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
}
