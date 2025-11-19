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
// Load display options from localStorage
function loadDisplayOptions(): { highlightShortWords: boolean; highlightUncheckedCells: boolean; showOneLetterClues: boolean } {
  try {
    const saved = localStorage.getItem('crossword-display-options');
    if (saved) {
      const options = JSON.parse(saved);
      return {
        highlightShortWords: options.highlightShortWords ?? false,
        highlightUncheckedCells: options.highlightUncheckedCells ?? false,
        showOneLetterClues: options.showOneLetterClues ?? false
      };
    }
  } catch (error) {
    console.error('Failed to load display options:', error);
  }
  return {
    highlightShortWords: false,
    highlightUncheckedCells: false,
    showOneLetterClues: false
  };
}

// Save display options to localStorage
function saveDisplayOptions(options: { highlightShortWords: boolean; highlightUncheckedCells: boolean; showOneLetterClues: boolean }) {
  try {
    localStorage.setItem('crossword-display-options', JSON.stringify(options));
  } catch (error) {
    console.error('Failed to save display options:', error);
  }
}

const initialDisplayOptions = loadDisplayOptions();

export const highlightShortWords = writable<boolean>(initialDisplayOptions.highlightShortWords);
export const highlightUncheckedCells = writable<boolean>(initialDisplayOptions.highlightUncheckedCells);
export const showOneLetterClues = writable<boolean>(initialDisplayOptions.showOneLetterClues);

// Subscribe to display options changes and save to localStorage
highlightShortWords.subscribe(value => {
  const options = {
    highlightShortWords: value,
    highlightUncheckedCells: get(highlightUncheckedCells),
    showOneLetterClues: get(showOneLetterClues)
  };
  saveDisplayOptions(options);
});

highlightUncheckedCells.subscribe(value => {
  const options = {
    highlightShortWords: get(highlightShortWords),
    highlightUncheckedCells: value,
    showOneLetterClues: get(showOneLetterClues)
  };
  saveDisplayOptions(options);
});

showOneLetterClues.subscribe(value => {
  const options = {
    highlightShortWords: get(highlightShortWords),
    highlightUncheckedCells: get(highlightUncheckedCells),
    showOneLetterClues: value
  };
  saveDisplayOptions(options);
});

export const hoveredWordLength = writable<number | null>(null);

// Preview grid for autofill (shows preview letters at 50% opacity)
export const previewGrid = writable<Cell[][] | null>(null);

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

// Active tab in the right panel
export type ActiveTab = 'fill' | 'clues' | 'metadata' | 'help' | 'lookup' | 'settings' | 'grid' | 'play';

// Load active tab from localStorage
function loadActiveTab(): ActiveTab {
  try {
    const saved = localStorage.getItem('crossword-active-tab');
    if (saved && ['fill', 'clues', 'metadata', 'help', 'lookup', 'settings', 'grid', 'play'].includes(saved)) {
      return saved as ActiveTab;
    }
  } catch (error) {
    console.error('Failed to load active tab:', error);
  }
  return 'grid'; // Default to grid tab
}

// Save active tab to localStorage
function saveActiveTab(tab: ActiveTab) {
  try {
    localStorage.setItem('crossword-active-tab', tab);
  } catch (error) {
    console.error('Failed to save active tab:', error);
  }
}

export const activeTab = writable<ActiveTab>(loadActiveTab());

// Subscribe to active tab changes and save to localStorage
activeTab.subscribe(value => {
  saveActiveTab(value);
});

// Play mode stores
// When in play mode, solutionGrid stores the solution and playGrid stores player's fill
export const isPlayMode = writable<boolean>(false);
export const solutionGrid = writable<Cell[][] | null>(null); // The solution puzzle
export const playGrid = writable<Cell[][] | null>(null); // Player's current fill (blank cells for empty)
export const selectedWordId = writable<string | null>(null); // Currently selected word ID for highlighting clues
export const incorrectCells = writable<Set<string>>(new Set()); // Set of cell keys (row-col) that are incorrect
export const playAuthor = writable<string>(''); // Author of the puzzle being played
export const showCompletionMessage = writable<boolean>(false); // Show completion success message

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

