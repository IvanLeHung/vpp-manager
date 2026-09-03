type Department = { id: string; name: string };

// These labels are only for the printed table. The legend always retains the full name.
export function printDepartmentLabels(departments: Department[]) {
  const maxLength = departments.length > 24 ? 8 : departments.length > 16 ? 10 : departments.length > 8 ? 14 : 22;
  const used = new Set<string>();
  const prefixes: [RegExp, string][] = [
    [/^Văn phòng Bán hàng\s+/iu, 'VPBH'],
    [/^Trung tâm Thương mại\s+/iu, 'TTTM'],
    [/^Văn phòng\s+/iu, 'VP'], [/^Trung tâm\s+/iu, 'TT'],
    [/^Phòng\s+/iu, 'P'], [/^Ban\s+/iu, 'B'],
    [/^P\.\s*/iu, 'P'], [/^B\.\s*/iu, 'B'],
  ];
  return departments.map((department, index) => {
    const name = department.name.trim().replace(/\s+/gu, ' ');
    let label = name;
    if (name.length > maxLength) {
      const prefix = prefixes.find(([pattern]) => pattern.test(name));
      const rest = prefix ? name.replace(prefix[0], '') : name;
      const initials = (rest.match(/[\p{L}\p{N}]+/gu) || []).map(word => /^\d+$/.test(word) ? word : [...word][0]).join('').toLocaleUpperCase('vi');
      label = `${prefix ? `${prefix[1]}.` : ''}${initials}`;
      if (!label || label.length > maxLength) label = `PB${index + 1}`;
    }
    let base = label;
    let suffix = 2;
    while (used.has(label.toLocaleUpperCase('vi'))) {
      label = `${base}-${suffix++}`;
      if (label.length > maxLength) { base = `PB${index + 1}`; label = base; }
    }
    used.add(label.toLocaleUpperCase('vi'));
    return { ...department, label };
  });
}
