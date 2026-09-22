/**
 * Fills a UI template: format('Tarjeta {index} de {total}', { index: 3, total: 9 }).
 *
 * Separate from index.ts, with no imports, so browser scripts can use it
 * without pulling site config into the client bundle. Unknown placeholders are
 * left as-is, so a typo shows up on screen instead of silently vanishing.
 */
export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}
