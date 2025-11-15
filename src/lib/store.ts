import { writable, derived, get } from 'svelte/store';
import type { Cell, Word, Clue } from './types';
import { createEmptyGrid, detectWords, numberWords, numberPotentialStarts } from './gridUtils';

export type SymmetryType = 'none' | 'rotational' | 'vertical' | 'horizontal';

export const rows = writable<number>(10);
export const cols = writable<number>(10);
export const grid = writable<Cell[][]>(createEmptyGrid(10, 10));
export const selectedRow = writable<number>(0);
export const selectedCol = writable<number>(0);
export const selectedDirection = writable<'across' | 'down'>('across');
export const symmetry = writable<SymmetryType>('none');
export const highlightShortWords = writable<boolean>(false);

// Derived store for detected and numbered words
export const words = derived(grid, ($grid) => {
  const detected = detectWords($grid);
  return numberWords(detected);
});

// Derived store for potential word start numbers (for empty cells)
export const potentialNumbers = derived(grid, ($grid) => {
  return numberPotentialStarts($grid);
});

// Clues map: wordId -> clue text
export const clues = writable<Map<string, string>>(new Map());

// Puzzle metadata
export const puzzleTitle = writable<string>('');
export const notes = writable<string>('');

export type CollaboratorRole = 'Constructor' | 'Cluer' | 'Editor';

export interface Collaborator {
  id: string;
  name: string;
  role: CollaboratorRole;
}

export const collaborators = writable<Collaborator[]>([]);

// Current puzzle ID (for tracking which puzzle is loaded/being edited)
export const currentPuzzleId = writable<string | null>(null);

// Update grid when dimensions change
rows.subscribe((newRows) => {
  grid.update(g => {
    const currentCols = get(cols);
    const newGrid = createEmptyGrid(newRows, currentCols);
    // Copy existing cells if possible
    const oldRows = g.length;
    const oldCols = g[0]?.length || 0;
    for (let r = 0; r < Math.min(oldRows, newRows); r++) {
      for (let c = 0; c < Math.min(oldCols, currentCols); c++) {
        newGrid[r][c] = g[r][c];
      }
    }
    return newGrid;
  });
});

cols.subscribe((newCols) => {
  grid.update(g => {
    const currentRows = get(rows);
    const newGrid = createEmptyGrid(currentRows, newCols);
    // Copy existing cells if possible
    const oldRows = g.length;
    const oldCols = g[0]?.length || 0;
    for (let r = 0; r < Math.min(oldRows, currentRows); r++) {
      for (let c = 0; c < Math.min(oldCols, newCols); c++) {
        newGrid[r][c] = g[r][c];
      }
    }
    return newGrid;
  });
});

