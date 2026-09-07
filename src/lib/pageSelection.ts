/** Toggle only the current page, preserving selections on every other page. */
export function togglePageSelection(selectedIds: string[], pageIds: string[]): string[] {
  if (pageIds.length === 0) return selectedIds;
  const selected = new Set(selectedIds);
  const allSelected = pageIds.every(id => selected.has(id));
  for (const id of pageIds) {
    if (allSelected) selected.delete(id);
    else selected.add(id);
  }
  return [...selected];
}
