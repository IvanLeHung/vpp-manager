export type HistoryPerson = { fullName?: string | null; role?: string | null };
export type RequestHistoryEntry = {
  action?: string | null;
  reason?: string | null;
  approver?: HistoryPerson | null;
};

const normalize = (value?: string | null) => (value || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN');

// Presentation only: never modify the stored actor, event, or request status.
export function getRequestHistoryDisplay(history: RequestHistoryEntry, requester?: HistoryPerson | null) {
  const originalActor = history.approver;
  const actorName = normalize(originalActor?.fullName).replace(/\s*\(adm\)$/, '').trim();
  const showRequester = history.action === 'COMPLETED'
    && normalize(history.reason) === normalize('Người dùng xác nhận đã nhận ĐỦ hàng')
    && originalActor?.role === 'ADMIN'
    && actorName === normalize('Lê Thanh Hùng')
    && Boolean(requester?.fullName?.trim());

  return {
    person: showRequester ? requester : originalActor,
    originalActor,
    showRequester,
  };
}
