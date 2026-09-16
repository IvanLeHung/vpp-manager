import api from '../lib/api';

export type VppCreationStatus = 'ALLOWED' | 'NOT_OPEN_YET' | 'CLOSED' | 'BYPASS_ROLE' | 'EXEMPT_USER';
export type VppCreationPermission = {
  allowed: boolean; status: VppCreationStatus; message: string;
  serverTime: string; openAt: string; closeAt: string; exclusiveCloseAt: string; nextOpenAt: string;
  remainingSeconds: number; timeZone: 'Asia/Ho_Chi_Minh';
};

export async function fetchVppCreationPermission() {
  const response = await api.get<VppCreationPermission>('/requests/create-permission', { headers: { 'Cache-Control': 'no-cache' } });
  return response.data;
}
