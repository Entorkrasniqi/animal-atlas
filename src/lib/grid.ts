/**
 * The world grid every range layer is stored on: equirectangular, 1024 × 512 cells of 0.3516°
 * (about 39 km at the equator). It matches GBIF's smallest density square at zoom 0, so recorded
 * sightings land in cells without resampling.
 */
export const GRID_W = 1024;
export const GRID_H = 512;
export const CELL_DEG = 360 / GRID_W;

/** Cell index; row 0 is the northern edge, column 0 the antimeridian in the west. */
export const cellIndex = (col: number, row: number): number => row * GRID_W + col;

export const cellCol = (cell: number): number => cell % GRID_W;
export const cellRow = (cell: number): number => Math.floor(cell / GRID_W);

/** Longitude of a cell's western edge. */
export const colToLon = (col: number): number => -180 + col * CELL_DEG;
/** Latitude of a cell's northern edge. */
export const rowToLat = (row: number): number => 90 - row * CELL_DEG;

/** The cell holding a position, or null outside the grid. */
export function lonLatToCell(lon: number, lat: number): number | null {
  const col = Math.floor((lon + 180) / CELL_DEG);
  const row = Math.floor((90 - lat) / CELL_DEG);
  if (col < 0 || col >= GRID_W || row < 0 || row >= GRID_H) return null;
  return cellIndex(col, row);
}
