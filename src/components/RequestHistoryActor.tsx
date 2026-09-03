import { getRequestHistoryDisplay } from '../lib/requestHistoryDisplay';
import type { HistoryPerson, RequestHistoryEntry } from '../lib/requestHistoryDisplay';

export default function RequestHistoryActor({ history, requester, showAdminSuffix = false }: {
  history: RequestHistoryEntry;
  requester?: HistoryPerson | null;
  showAdminSuffix?: boolean;
}) {
  const { person, originalActor, showRequester } = getRequestHistoryDisplay(history, requester);
  return <span title={showRequester ? `Hiển thị theo người tạo đề xuất. Người thao tác trong nhật ký gốc: ${originalActor?.fullName}` : undefined}>
    {person?.fullName}{showAdminSuffix && person?.role === 'ADMIN' ? ' (ADM)' : ''}
  </span>;
}
