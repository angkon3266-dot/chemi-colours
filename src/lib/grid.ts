/**
 * Shared tile-grid column presets. The mobile figure is never 1 for the
 * 3-and-4 desktop presets — a single full-width column was what made the
 * All Products grid and the sub-category tiles look oversized and messy on
 * phones; two columns reads as a proper grid at any width.
 */
export const GRID_COLUMNS: Record<string, string> = {
  '2': 'grid-cols-1 sm:grid-cols-2',
  '3': 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
}

export function gridColsClass(value: unknown, fallback: '2' | '3' | '4' = '3'): string {
  return GRID_COLUMNS[String(value ?? fallback)] ?? GRID_COLUMNS[fallback]
}
