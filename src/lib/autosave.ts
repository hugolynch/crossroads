import { get } from 'svelte/store';
import type { Cell } from './types';
import type { Collaborator } from './store';

const AUTOSAVE_KEY = 'crossword-autosave';

export interface AutosaveData {
  grid: Cell[][];
  rows: number;
  cols: number;
  clues: Array<[string, string]>;
  puzzleTitle: string;
  notes: string;
  collaborators: Collaborator[];
  symmetry: string;
  selectedRow: number;
  selectedCol: number;
  selectedDirection: 'across' | 'down';
}

export function saveAutosave(data: AutosaveData): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
  } catch (error) {
    // Silently fail - autosave shouldn't interrupt user workflow
    console.warn('Failed to autosave:', error);
  }
}

export function loadAutosave(): AutosaveData | null {
  try {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn('Failed to load autosave:', error);
  }
  return null;
}

export function clearAutosave(): void {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch (error) {
    console.warn('Failed to clear autosave:', error);
  }
}

