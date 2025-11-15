export type CellType = 'letter' | 'black' | 'empty';

export interface Cell {
  type: CellType;
  letter?: string;
  number?: number;
}

export type WordDirection = 'across' | 'down';

export interface Word {
  id: string;
  number: number;
  direction: WordDirection;
  startRow: number;
  startCol: number;
  length: number;
}

export interface Clue {
  wordId: string;
  text: string;
}

