function firstFiniteNumber(...values: unknown[]): number {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

/**
 * Giá của dòng phiếu là snapshot giao dịch. Giá trong danh mục chỉ dùng làm
 * phương án dự phòng cho dữ liệu cũ chưa có unitPrice/replacementPrice.
 */
export function getRequestLineUnitPrice(line: any): number {
  if (!line) return 0;

  if (line.replacementItemId) {
    return firstFiniteNumber(
      line.replacementPrice,
      line.replacementItem?.price,
      line.issue_item?.price,
      line.unitPrice,
      line.item?.price,
    );
  }

  return firstFiniteNumber(
    line.unitPrice,
    line.item?.price,
    line.issue_item?.price,
  );
}

export function getOriginalRequestLineUnitPrice(line: any): number {
  return firstFiniteNumber(line?.unitPrice, line?.item?.price);
}

export function getRequestLineAmount(line: any, quantity?: number | null): number {
  const effectiveQuantity = quantity
    ?? line?.replacementQty
    ?? line?.qtyApproved
    ?? line?.qtyRequested
    ?? 0;
  return getRequestLineUnitPrice(line) * Number(effectiveQuantity || 0);
}
