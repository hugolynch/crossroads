import type { Cell, Word } from './types';

export function createEmptyGrid(rows: number, cols: number): Cell[][] {
  return Array(rows).fill(null).map(() => 
    Array(cols).fill(null).map(() => ({ type: 'empty' }))
  );
}

export function detectWords(grid: Cell[][]): Word[] {
  const words: Word[] = [];
  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  // Detect horizontal (across) words - including potential words
  for (let row = 0; row < rows; row++) {
    let wordStart = -1;
    let wordLength = 0;

    for (let col = 0; col <= cols; col++) {
      const cell = col < cols ? grid[row][col] : null;
      const isBlack = cell?.type === 'black';
      const isEmptyOrLetter = cell?.type === 'empty' || cell?.type === 'letter';

      if (isEmptyOrLetter) {
        if (wordStart === -1) {
          wordStart = col;
        }
        wordLength++;
      } else if (isBlack || col === cols) {
        // End of word (black square or end of row)
        // Include single cells and pairs as well (length >= 1)
        if (wordLength >= 1 && wordStart !== -1) {
          words.push({
            id: `across-${row}-${wordStart}`,
            number: 0, // Will be assigned later
            direction: 'across',
            startRow: row,
            startCol: wordStart,
            length: wordLength
          });
        }
        wordStart = -1;
        wordLength = 0;
      }
    }
  }

  // Detect vertical (down) words - including potential words
  for (let col = 0; col < cols; col++) {
    let wordStart = -1;
    let wordLength = 0;

    for (let row = 0; row <= rows; row++) {
      const cell = row < rows ? grid[row][col] : null;
      const isBlack = cell?.type === 'black';
      const isEmptyOrLetter = cell?.type === 'empty' || cell?.type === 'letter';

      if (isEmptyOrLetter) {
        if (wordStart === -1) {
          wordStart = row;
        }
        wordLength++;
      } else if (isBlack || row === rows) {
        // End of word (black square or end of column)
        // Include single cells and pairs as well (length >= 1)
        if (wordLength >= 1 && wordStart !== -1) {
          words.push({
            id: `down-${wordStart}-${col}`,
            number: 0, // Will be assigned later
            direction: 'down',
            startRow: wordStart,
            startCol: col,
            length: wordLength
          });
        }
        wordStart = -1;
        wordLength = 0;
      }
    }
  }

  return words;
}

export function numberWords(words: Word[]): Word[] {
  // Sort all words by position: top to bottom, left to right
  // This ensures words are ordered by their first letter position
  const sortedWords = [...words].sort((a, b) => {
    if (a.startRow !== b.startRow) return a.startRow - b.startRow;
    return a.startCol - b.startCol;
  });

  // Create a map of start positions to words (for numbering)
  const startPositions = new Map<string, Word[]>();
  
  for (const word of sortedWords) {
    const key = `${word.startRow}-${word.startCol}`;
    if (!startPositions.has(key)) {
      startPositions.set(key, []);
    }
    startPositions.get(key)!.push(word);
  }

  // Sort positions: top to bottom, left to right
  const sortedPositions = Array.from(startPositions.keys()).sort((a, b) => {
    const [rowA, colA] = a.split('-').map(Number);
    const [rowB, colB] = b.split('-').map(Number);
    if (rowA !== rowB) return rowA - rowB;
    return colA - colB;
  });

  // Assign numbers
  let number = 1;
  const numberedWords: Word[] = [];

  for (const pos of sortedPositions) {
    const wordsAtPos = startPositions.get(pos)!;
    for (const word of wordsAtPos) {
      numberedWords.push({ ...word, number });
    }
    number++;
  }

  // Return words sorted by their grid number
  // Words with the same number are sorted by direction (across first, then down)
  return numberedWords.sort((a, b) => {
    if (a.number !== b.number) return a.number - b.number;
    // If same number, sort by direction (across before down)
    if (a.direction !== b.direction) {
      return a.direction === 'across' ? -1 : 1;
    }
    return 0;
  });
}

export function getWordCells(grid: Cell[][], word: Word): Cell[] {
  const cells: Cell[] = [];
  
  if (word.direction === 'across') {
    for (let i = 0; i < word.length; i++) {
      cells.push(grid[word.startRow][word.startCol + i]);
    }
  } else {
    for (let i = 0; i < word.length; i++) {
      cells.push(grid[word.startRow + i][word.startCol]);
    }
  }
  
  return cells;
}

export function isWordStart(row: number, col: number, words: Word[]): boolean {
  return words.some(w => w.startRow === row && w.startCol === col);
}

export function getWordNumber(row: number, col: number, words: Word[]): number | undefined {
  const word = words.find(w => w.startRow === row && w.startCol === col);
  return word?.number;
}

// Detect potential word starts based on black squares (for numbering empty cells)
export function detectPotentialWordStarts(grid: Cell[][]): Array<{ row: number; col: number }> {
  const starts: Array<{ row: number; col: number }> = [];
  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = grid[row][col];
      // Skip black squares
      if (cell.type === 'black') continue;

      // Check if this could be the start of an across word
      const couldBeAcrossStart = 
        col === 0 || grid[row][col - 1]?.type === 'black' // Start of row or after black square
        ? col < cols - 1 && grid[row][col + 1]?.type !== 'black' // Has space for at least 2 cells
        : false;

      // Check if this could be the start of a down word
      const couldBeDownStart = 
        row === 0 || grid[row - 1][col]?.type === 'black' // Start of column or after black square
        ? row < rows - 1 && grid[row + 1][col]?.type !== 'black' // Has space for at least 2 cells
        : false;

      if (couldBeAcrossStart || couldBeDownStart) {
        starts.push({ row, col });
      }
    }
  }

  return starts;
}

// Number potential word starts (for display)
export function numberPotentialStarts(grid: Cell[][]): Map<string, number> {
  const starts = detectPotentialWordStarts(grid);
  const numberMap = new Map<string, number>();
  
  // Sort: top to bottom, left to right
  const sorted = starts.sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  let number = 1;
  for (const start of sorted) {
    const key = `${start.row}-${start.col}`;
    numberMap.set(key, number);
    number++;
  }

  return numberMap;
}

