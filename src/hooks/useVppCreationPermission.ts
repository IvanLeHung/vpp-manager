import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchVppCreationPermission, type VppCreationPermission } from '../services/vppPermissionApi';

export function useVppCreationPermission() {
  const [permission, setPermission] = useState<VppCreationPermission | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef<Promise<VppCreationPermission | null> | null>(null);
  const serverOffset = useRef(0);

  const check = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    setChecking(true); setError('');
    inFlight.current = fetchVppCreationPermission().then(data => {
      serverOffset.current = new Date(data.serverTime).getTime() - Date.now();
      setPermission(data);
      return data;
    }).catch(() => {
      setError('Không thể kiểm tra thời gian tạo đề xuất. Vui lòng thử lại.');
      return null;
    }).finally(() => { setChecking(false); inFlight.current = null; });
    return inFlight.current;
  }, []);

  useEffect(() => {
    if (!permission || permission.allowed) return;
    const target = permission.allowed ? undefined : permission.nextOpenAt;
    if (!target) return;
    const delay = Math.max(1000, new Date(target).getTime() - (Date.now() + serverOffset.current));
    const timer = window.setTimeout(() => { void check(); }, delay + 250);
    return () => window.clearTimeout(timer);
  }, [permission, check]);

  const serverNow = useCallback(() => Date.now() + serverOffset.current, []);
  return { permission, checking, error, check, serverNow };
}
