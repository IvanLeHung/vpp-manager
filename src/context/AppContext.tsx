import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../lib/api';

export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'WAREHOUSE';
export type User = {
  id: string;
  userId: string;
  name: string;
  fullName: string;
  username: string;
  role: UserRole;
  department: string;
  departmentId: string | null;
  managerId: string | null;
  avatar?: string | null;
  phoneNumber?: string | null;
  bio?: string | null;
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
  isActive?: boolean;
  printSortGroup?: string | null;
};

export type RequestLine = {
  id: string;
  itemId: string;
  item: { name: string, mvpp: string, unit: string, itemType?: string, price?: number, printSortGroup?: string | null };
  qtyRequested: number;
  qtyManagerApproved: number | null;
  qtyAdminApproved: number | null;
  qtyApproved: number | null;
  qtyDelivered: number;
  status: string;
  note: string;
  replacementItemId?: string | null;
  replacementItem?: { name: string, mvpp: string, unit: string };
  replacementQty?: number | null;
  replacementPrice?: number | null;
  replacementReason?: string | null;
  replacedById?: string | null;
  replacedAt?: string | null;
};

export type VPPRequest = {
  id: string;
  requesterId: string;
  requester: { fullName: string, department: string };
  department: string;
  requestType: string;
  priority: string;
  purpose: string;
  status: string;
  currentApproverId?: string | null;
  createdAt: string;
  neededByDate?: string | null;
  managerApprovedAt?: string | null;
  adminApprovedAt?: string | null;
  handoverAt?: string | null;
  lines: RequestLine[];
  rejectReason?: string;
  returnReason?: string;
  cancelReason?: string;
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
    const token = localStorage.getItem('vpp_token');
    const saved = localStorage.getItem('vpp_user');

    if (!token || !saved) {
      localStorage.removeItem('vpp_token');
      localStorage.removeItem('vpp_user');
      return null;
    }

    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem('vpp_token');
      localStorage.removeItem('vpp_user');
      return null;
    }
  });
  
  const [items, setItems] = useState<VPPItem[]>([]);
  const [requests, setRequests] = useState<VPPRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const logout = () => {
    localStorage.removeItem('vpp_token');
    localStorage.removeItem('vpp_user');
    setCurrentUser(null);
    setItems([]);
    setRequests([]);
  };

  const refreshData = async () => {
    const token = localStorage.getItem('vpp_token');
    if (!currentUser || !token) {
      if (currentUser && !token) logout();
      return;
    }

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
        itemType: i.itemType,
        isActive: i.isActive
      }));
      setItems(formattedItems);
      setRequests(Array.isArray(reqRes.data) ? reqRes.data : (reqRes.data?.data || []));
    } catch (err: any) {
      console.error('Lỗi lấy dữ liệu Data:', err);
      if (err.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [currentUser]);

  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener('vpp:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('vpp:unauthorized', handleUnauthorized);
  }, []);

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
