import type { Cell } from './types';
import { detectWords, numberWords } from './gridUtils';

interface PuzImportData {
  grid: Cell[][];
  rows: number;
  cols: number;
  clues: Map<string, string>;
  puzzleTitle: string;
  author: string;
  copyright: string;
  notes: string;
}

/**
 * Reads a null-terminated string from a buffer
 */
function readNullTerminatedString(view: DataView, offset: number): { str: string; nextOffset: number } {
  let str = '';
  let currentOffset = offset;
  
  while (currentOffset < view.byteLength) {
    const char = view.getUint8(currentOffset);
    if (char === 0) {
      return { str, nextOffset: currentOffset + 1 };
    }
    str += String.fromCharCode(char);
    currentOffset++;
  }
  
  return { str, nextOffset: currentOffset };
}

/**
 * Imports a crossword puzzle from .puz format
 * Based on the .puz file format specification: https://gist.github.com/sliminality/dab21fa834eae0a70193c7cd69c356d5
 */
export function importFromPuz(buffer: ArrayBuffer): PuzImportData {
  const view = new DataView(buffer);
  let offset = 0;
  
  // Skip overall file checksum (0x00-0x01)
  offset += 2;
  
  // Read magic string (0x02-0x0D): "ACROSS&DOWN\0"
  const magicBytes = [];
  for (let i = 0; i < 12; i++) {
    magicBytes.push(view.getUint8(offset + i));
  }
  const magic = String.fromCharCode(...magicBytes);
  if (!magic.startsWith('ACROSS&DOWN')) {
    throw new Error('Invalid .puz file: missing magic string');
  }
  offset += 12;
  
  // Skip CIB checksum (0x0E-0x0F)
  offset += 2;
  
  // Skip masked checksums (0x10-0x17)
  offset += 8;
  
  // Skip version string (0x18-0x1B)
  offset += 4;
  
  // Skip reserved bytes (0x1C-0x2B)
  offset += 16;
  
  // Read width (0x2C)
  const cols = view.getUint8(offset++);
  
  // Read height (0x2D)
  const rows = view.getUint8(offset++);
  
  // Read number of clues (0x2E-0x2F)
  const numClues = view.getUint16(offset, true);
  offset += 2;
  
  // Skip unknown bitmask (0x30-0x31) and scrambled tag (0x32-0x33)
  offset += 4;
  
  // Header ends at offset 0x34 (52 bytes)
  
  // Read solution grid (w*h bytes)
  const solutionGrid: string[] = [];
  for (let i = 0; i < rows * cols; i++) {
    const char = String.fromCharCode(view.getUint8(offset++));
    solutionGrid.push(char);
  }
  
  // Read grid state (w*h bytes) - we'll use this to determine which cells are filled
  const gridState: string[] = [];
  for (let i = 0; i < rows * cols; i++) {
    const char = String.fromCharCode(view.getUint8(offset++));
    gridState.push(char);
  }
  
  // Read title (null-terminated)
  const titleResult = readNullTerminatedString(view, offset);
  const puzzleTitle = titleResult.str;
  offset = titleResult.nextOffset;
  
  // Read author (null-terminated)
  const authorResult = readNullTerminatedString(view, offset);
  const author = authorResult.str;
  offset = authorResult.nextOffset;
  
  // Read copyright (null-terminated)
  const copyrightResult = readNullTerminatedString(view, offset);
  const copyright = copyrightResult.str;
  offset = copyrightResult.nextOffset;
  
  // Read clues (null-terminated, separated by null bytes)
  const clueStrings: string[] = [];
  while (clueStrings.length < numClues && offset < view.byteLength) {
    const clueResult = readNullTerminatedString(view, offset);
    if (clueResult.str.length > 0) {
      clueStrings.push(clueResult.str);
    }
    offset = clueResult.nextOffset;
    
    // Check if we've hit the final null terminator (double null)
    if (offset < view.byteLength && view.getUint8(offset) === 0) {
      offset++; // Skip final null terminator
      break;
    }
  }
  
  // Read notes (null-terminated) - if present
  let notes = '';
  if (offset < view.byteLength) {
    const notesResult = readNullTerminatedString(view, offset);
    notes = notesResult.str;
  }
  
  // Build grid from solution
  // Use solution grid to determine black cells and letters
  // Grid state represents player's current fill, but we want the solution
  const grid: Cell[][] = [];
  for (let row = 0; row < rows; row++) {
    grid[row] = [];
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      const solutionChar = solutionGrid[idx];
      
      if (solutionChar === '.') {
        // Black cell
        grid[row][col] = { type: 'black' };
      } else if (solutionChar === '-' || solutionChar === '\0') {
        // Empty cell (shouldn't happen in a valid puzzle, but handle it)
        grid[row][col] = { type: 'empty' };
      } else {
        // Letter cell - use solution for the letter
        grid[row][col] = { 
          type: 'letter', 
          letter: solutionChar.toUpperCase() 
        };
      }
    }
  }
  
  // Number the words to match clue numbers
  const words = numberWords(detectWords(grid));
  
  // Map clues to words
  // According to .puz format: clues are arranged numerically
  // When two clues have the same number, the Across clue comes before the Down clue
  const clues = new Map<string, string>();
  
  // Group words by number
  const wordsByNumber = new Map<number, { across?: typeof words[0]; down?: typeof words[0] }>();
  for (const word of words) {
    if (!wordsByNumber.has(word.number)) {
      wordsByNumber.set(word.number, {});
    }
    const entry = wordsByNumber.get(word.number)!;
    if (word.direction === 'across') {
      entry.across = word;
    } else {
      entry.down = word;
    }
  }
  
  // Get sorted clue numbers
  const sortedNumbers = Array.from(wordsByNumber.keys()).sort((a, b) => a - b);
  
  // Map clue strings to words
  let clueIndex = 0;
  for (const num of sortedNumbers) {
    const entry = wordsByNumber.get(num)!;
    
    // Across clue comes first
    if (entry.across && clueIndex < clueStrings.length) {
      clues.set(entry.across.id, clueStrings[clueIndex++]);
    }
    
    // Down clue comes second
    if (entry.down && clueIndex < clueStrings.length) {
      clues.set(entry.down.id, clueStrings[clueIndex++]);
    }
  }
  
  return {
    grid,
    rows,
    cols,
    clues,
    puzzleTitle,
    author,
    copyright,
    notes
  };
}

