/** Adds `value` to the list, or removes it if present (multi-select filters). */
export const toggle = <T>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
