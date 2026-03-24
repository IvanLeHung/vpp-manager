import React, { createContext, useContext, useEffect, useState } from 'react';
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
  item: {
    name: string;
    mvpp: string;
    unit: string;
  };
  qtyRequested: number;
  qtyApproved: number | null;
  qtyDelivered: number;
  status: string;
  note: string;
};

export type VPPRequest = {
  id: string;
  requesterId: string;
  requester: {
    fullName: string;
    department: string;
  };
  department: string;
  requestType: string;
  priority: string;
  purpose: string;
  status: string;
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
  setRequests: React.Dispatch<React.SetStateAction<VPPRequest[]>>;
  loading: boolean;
  refreshData: () => Promise<void>;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('vpp_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [items, setItems] = useState<VPPItem[]>([]);
  const [requests, setRequests] = useState<VPPRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshData = async () => {
    if (!currentUser) {
      setItems([]);
      setRequests([]);
      return;
    }

    try {
      setLoading(true);

      const [itemsRes, reqRes] = await Promise.all([
        api.get('/items'),
        api.get('/requests'),
      ]);

      const formattedItems: VPPItem[] = Array.isArray(itemsRes.data)
        ? itemsRes.data.map((i: any) => ({
            id: i.id,
            mvpp: i.mvpp,
            name: i.name,
            category: i.category,
            unit: i.unit,
            quota: Number(i.quota ?? 0),
            price: Number(i.price ?? 0),
            stock: Number(i.stocks?.[0]?.quantityOnHand ?? 0),
            itemType: i.itemType,
          }))
        : [];

      setItems(formattedItems);
      setRequests(Array.isArray(reqRes.data?.data) ? reqRes.data.data : []);
    } catch (err) {
      console.error('Lỗi lấy dữ liệu AppContext:', err);
      setItems([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('vpp_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('vpp_user');
    }
  }, [currentUser]);

  useEffect(() => {
    refreshData();
  }, [currentUser]);

  const logout = () => {
    localStorage.removeItem('vpp_token');
    localStorage.removeItem('vpp_user');
    setCurrentUser(null);
    setItems([]);
    setRequests([]);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        items,
        setItems,
        requests,
        setRequests,
        loading,
        refreshData,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }

  return context;
}

export const useApp = useAppContext;
