import type { Cell, Word } from './types';
import { detectWords, numberWords } from './gridUtils';

interface PuzExportData {
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
 * CRC-16 variant checksum routine used in .puz format
 * Based on specification: https://gist.github.com/sliminality/dab21fa834eae0a70193c7cd69c356d5
 */
function cksum_region(data: Uint8Array, len: number, cksum: number): number {
  for (let i = 0; i < len; i++) {
    if (cksum & 0x0001) {
      cksum = (cksum >> 1) + 0x8000;
    } else {
      cksum = cksum >> 1;
    }
    cksum += data[i];
  }
  return cksum & 0xFFFF; // Keep it to 16 bits
}

/**
 * Calculate checksum for a string
 */
function cksum_string(str: string, cksum: number): number {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return cksum_region(bytes, str.length, cksum);
}

/**
 * Exports a crossword puzzle to .puz format
 * Based on the .puz file format specification: https://gist.github.com/sliminality/dab21fa834eae0a70193c7cd69c356d5
 */
export function exportToPuz(data: PuzExportData): Uint8Array {
  const { grid, rows, cols, clues, puzzleTitle, author, copyright, notes } = data;
  
  // Detect and number words
  const words = numberWords(detectWords(grid));
  
  // Build solution grid according to .puz format spec:
  // Boards are stored as a single string of ASCII, one character per cell
  // Scanning order: top-left, left to right then top to bottom (reading order)
  // Solution: non-playable (black) cells are denoted by '.', letters are the filled-in solution
  const solutionGrid: string[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = grid[row][col];
      if (cell.type === 'black') {
        solutionGrid.push('.'); // Black cell
      } else if (cell.type === 'letter' && cell.letter) {
        solutionGrid.push(cell.letter.toUpperCase()); // Filled cell with letter
      } else {
        solutionGrid.push('-'); // Empty cell (may appear in incomplete puzzles)
      }
    }
  }
  const solutionString = solutionGrid.join('');
  
  // Build player state grid according to .puz format spec:
  // Player state stored similarly to solution
  // Empty cells are stored as '-', black cells as '.', filled cells as letters
  const gridState: string[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = grid[row][col];
      if (cell.type === 'black') {
        gridState.push('.'); // Black cell
      } else if (cell.type === 'letter' && cell.letter) {
        gridState.push(cell.letter.toUpperCase()); // Filled cell
      } else {
        gridState.push('-'); // Empty cell
      }
    }
  }
  const gridStateString = gridState.join('');
  
  // Get clues organized by number and direction
  // According to .puz format spec: clues are arranged numerically
  // When two clues have the same number, the Across clue comes before the Down clue
  // The clue assignment is derived from the grid shape (which cells get numbers)
  
  // Create maps to store clues by number and direction
  // Key: clue number, Value: clue text
  const acrossCluesByNumber = new Map<number, string>();
  const downCluesByNumber = new Map<number, string>();
  
  // Collect clues for each word, ensuring we match by word ID
  for (const word of words) {
    const clueText = clues.get(word.id) || '';
    
    if (word.direction === 'across') {
      // Store the clue for this number, but only if we haven't set it yet
      // This ensures that if multiple words share a number, we use the first one
      if (!acrossCluesByNumber.has(word.number)) {
        acrossCluesByNumber.set(word.number, clueText);
      }
    } else {
      // Store the clue for this number, but only if we haven't set it yet
      if (!downCluesByNumber.has(word.number)) {
        downCluesByNumber.set(word.number, clueText);
      }
    }
  }
  
  // Get all unique clue numbers and sort them
  // This represents all numbered positions in the grid
  const allClueNumbers = new Set<number>();
  for (const word of words) {
    allClueNumbers.add(word.number);
  }
  const sortedClueNumbers = Array.from(allClueNumbers).sort((a, b) => a - b);
  
  // Build clue strings according to .puz format spec:
  // Clues are arranged numerically, and when two clues have the same number,
  // the Across clue comes before the Down clue
  const allClues: string[] = [];
  
  for (const num of sortedClueNumbers) {
    // Add across clue first if it exists for this number
    if (acrossCluesByNumber.has(num)) {
      allClues.push(acrossCluesByNumber.get(num)!);
    }
    // Add down clue next if it exists for this number
    if (downCluesByNumber.has(num)) {
      allClues.push(downCluesByNumber.get(num)!);
    }
  }
  
  const numClues = allClues.length;
  
  // Prepare strings (null-terminated)
  const title = (puzzleTitle || 'Untitled Puzzle').substring(0, 50);
  const authorStr = (author || '').substring(0, 50);
  const copyrightStr = (copyright || '').substring(0, 200);
  const notesStr = (notes || '').substring(0, 2000);
  
  // Calculate sizes
  const solutionSize = solutionString.length;
  const gridStateSize = gridStateString.length;
  const titleSize = title.length + 1;
  const authorSize = authorStr.length + 1;
  const copyrightSize = copyrightStr.length + 1;
  const notesSize = notesStr.length + 1;
  
  // Calculate clue sizes (each clue is null-terminated, separated by null bytes)
  let cluesSize = 0;
  for (const clue of allClues) {
    cluesSize += clue.length + 1; // clue text + null terminator
  }
  cluesSize += 1; // Final null terminator
  
  // Calculate total file size
  const headerSize = 52; // 0x34
  const totalSize = headerSize + solutionSize + gridStateSize + titleSize + authorSize + 
                    copyrightSize + cluesSize + notesSize;
  
  // Create buffer
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let offset = 0;
  
  // We'll write checksums later, so skip them for now
  // Offset 0x00-0x01: Overall file checksum (will calculate later)
  offset += 2;
  
  // Offset 0x02-0x0D: File Magic "ACROSS&DOWN\0" (12 bytes)
  const magic = 'ACROSS&DOWN\0';
  for (let i = 0; i < magic.length; i++) {
    view.setUint8(offset++, magic.charCodeAt(i));
  }
  
  // Offset 0x0E-0x0F: CIB Checksum (will calculate later)
  const cibChecksumOffset = offset;
  offset += 2;
  
  // Offset 0x10-0x13: Masked Low Checksums (will calculate later)
  const maskedLowOffset = offset;
  offset += 4;
  
  // Offset 0x14-0x17: Masked High Checksums (will calculate later)
  const maskedHighOffset = offset;
  offset += 4;
  
  // Offset 0x18-0x1B: Version String (4 bytes)
  const version = '1.3\0';
  for (let i = 0; i < version.length; i++) {
    view.setUint8(offset++, version.charCodeAt(i));
  }
  // Pad to 4 bytes
  while (offset < 0x1C) {
    view.setUint8(offset++, 0);
  }
  
  // Offset 0x1C-0x1D: Reserved1C (2 bytes, uninitialized memory)
  offset += 2;
  
  // Offset 0x1E-0x1F: Scrambled Checksum (0 for unscrambled)
  view.setUint16(offset, 0, true);
  offset += 2;
  
  // Offset 0x20-0x2B: Reserved (12 bytes)
  offset += 12;
  
  // Offset 0x2C: Width (byte)
  view.setUint8(offset++, cols);
  
  // Offset 0x2D: Height (byte)
  view.setUint8(offset++, rows);
  
  // Offset 0x2E-0x2F: Number of Clues (short, little-endian)
  view.setUint16(offset, numClues, true);
  offset += 2;
  
  // Offset 0x30-0x31: Unknown Bitmask (short, set to 0)
  view.setUint16(offset, 0, true);
  offset += 2;
  
  // Offset 0x32-0x33: Scrambled Tag (short, 0 for unscrambled)
  view.setUint16(offset, 0, true);
  offset += 2;
  
  // Header ends at offset 0x34 (52 bytes)
  
  // Solution grid (w*h bytes)
  const solutionBytes = new Uint8Array(solutionSize);
  for (let i = 0; i < solutionSize; i++) {
    solutionBytes[i] = solutionString.charCodeAt(i);
    view.setUint8(offset++, solutionBytes[i]);
  }
  
  // Grid state (w*h bytes)
  const gridStateBytes = new Uint8Array(gridStateSize);
  for (let i = 0; i < gridStateSize; i++) {
    gridStateBytes[i] = gridStateString.charCodeAt(i);
    view.setUint8(offset++, gridStateBytes[i]);
  }
  
  // Title (null-terminated)
  for (let i = 0; i < title.length; i++) {
    view.setUint8(offset++, title.charCodeAt(i));
  }
  view.setUint8(offset++, 0);
  
  // Author (null-terminated)
  for (let i = 0; i < authorStr.length; i++) {
    view.setUint8(offset++, authorStr.charCodeAt(i));
  }
  view.setUint8(offset++, 0);
  
  // Copyright (null-terminated)
  for (let i = 0; i < copyrightStr.length; i++) {
    view.setUint8(offset++, copyrightStr.charCodeAt(i));
  }
  view.setUint8(offset++, 0);
  
  // Clues (null-terminated, separated by null bytes)
  for (const clue of allClues) {
    for (let i = 0; i < clue.length; i++) {
      view.setUint8(offset++, clue.charCodeAt(i));
    }
    view.setUint8(offset++, 0); // Null terminator
  }
  view.setUint8(offset++, 0); // Final null terminator
  
  // Notes (null-terminated)
  for (let i = 0; i < notesStr.length; i++) {
    view.setUint8(offset++, notesStr.charCodeAt(i));
  }
  view.setUint8(offset++, 0);
  
  // Now calculate checksums
  
  // CIB Checksum: checksum over 8 bytes starting at width (offset 0x2C)
  const cibData = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    cibData[i] = view.getUint8(0x2C + i);
  }
  const c_cib = cksum_region(cibData, 8, 0);
  view.setUint16(cibChecksumOffset, c_cib, true);
  
  // Solution Checksum
  const c_sol = cksum_region(solutionBytes, solutionSize, 0);
  
  // Grid Checksum
  const c_grid = cksum_region(gridStateBytes, gridStateSize, 0);
  
  // Partial checksum (title, author, copyright, clues, notes)
  let c_part = 0;
  if (title.length > 0) {
    c_part = cksum_string(title + '\0', c_part);
  }
  if (authorStr.length > 0) {
    c_part = cksum_string(authorStr + '\0', c_part);
  }
  if (copyrightStr.length > 0) {
    c_part = cksum_string(copyrightStr + '\0', c_part);
  }
  for (const clue of allClues) {
    if (clue.length > 0) {
      c_part = cksum_string(clue, c_part);
    }
  }
  if (notesStr.length > 0) {
    c_part = cksum_string(notesStr + '\0', c_part);
  }
  
  // Masked checksums: XOR with "ICHEATED"
  // Low bytes: XOR with "ICHE"
  view.setUint8(maskedLowOffset + 0, 0x49 ^ (c_cib & 0xFF));
  view.setUint8(maskedLowOffset + 1, 0x43 ^ (c_sol & 0xFF));
  view.setUint8(maskedLowOffset + 2, 0x48 ^ (c_grid & 0xFF));
  view.setUint8(maskedLowOffset + 3, 0x45 ^ (c_part & 0xFF));
  
  // High bytes: XOR with "ATED"
  view.setUint8(maskedHighOffset + 0, 0x41 ^ ((c_cib & 0xFF00) >> 8));
  view.setUint8(maskedHighOffset + 1, 0x54 ^ ((c_sol & 0xFF00) >> 8));
  view.setUint8(maskedHighOffset + 2, 0x45 ^ ((c_grid & 0xFF00) >> 8));
  view.setUint8(maskedHighOffset + 3, 0x44 ^ ((c_part & 0xFF00) >> 8));
  
  // Overall file checksum
  // Primary board checksum uses CIB checksum and other data
  let overallChecksum = c_cib;
  overallChecksum = cksum_region(solutionBytes, solutionSize, overallChecksum);
  overallChecksum = cksum_region(gridStateBytes, gridStateSize, overallChecksum);
  
  if (title.length > 0) {
    overallChecksum = cksum_string(title + '\0', overallChecksum);
  }
  if (authorStr.length > 0) {
    overallChecksum = cksum_string(authorStr + '\0', overallChecksum);
  }
  if (copyrightStr.length > 0) {
    overallChecksum = cksum_string(copyrightStr + '\0', overallChecksum);
  }
  for (const clue of allClues) {
    if (clue.length > 0) {
      overallChecksum = cksum_string(clue, overallChecksum);
    }
  }
  if (notesStr.length > 0) {
    overallChecksum = cksum_string(notesStr + '\0', overallChecksum);
  }
  
  view.setUint16(0, overallChecksum, true);
  
  return new Uint8Array(buffer);
}
