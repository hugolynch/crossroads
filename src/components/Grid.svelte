<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { grid, selectedRow, selectedCol, selectedDirection, words, potentialNumbers, symmetry, rows, cols, highlightShortWords, highlightUncheckedCells, hoveredWordLength, previewGrid, isPlayMode, playGrid, solutionGrid, selectedWordId, incorrectCells, puzzleTitle, showCompletionMessage } from '../lib/store';
  import { getWordNumber, getWordCells } from '../lib/gridUtils';
  import type { SymmetryType } from '../lib/store';
  import type { Word, Cell } from '../lib/types';

  let gridElement: HTMLDivElement;
  let containerElement: HTMLDivElement;
  let cellSize = 40; // Default cell size in pixels
  const MIN_CELL_SIZE = 20;
  const MAX_CELL_SIZE = 40;
  const GRID_BORDER = 2; // 2px border on each side = 4px total
  const CELL_GAP = 1; // Gap between cells
  let completionAlertShown = false;
  let completionMessageTimeout: ReturnType<typeof setTimeout> | null = null;

  // Reactive statement to determine which grid to display
  $: displayGrid = $isPlayMode && $playGrid ? $playGrid : $grid;
  
  // Reset completion alert flag when exiting play mode
  $: if (!$isPlayMode) {
    completionAlertShown = false;
    showCompletionMessage.set(false);
    if (completionMessageTimeout) {
      clearTimeout(completionMessageTimeout);
      completionMessageTimeout = null;
    }
  }

  // Check if a word is complete (all cells filled)
  function isWordComplete(word: Word, gridToCheck: Cell[][]): boolean {
    const cells = getWordCells(gridToCheck, word);
    return cells.every(cell => cell.type === 'letter' && cell.letter);
  }

  // Find the first unfilled letter position in a word (for play mode navigation)
  function findFirstUnfilledPosition(word: Word, gridToCheck: Cell[][]): { row: number; col: number } | null {
    const cells = getWordCells(gridToCheck, word);
    
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (cell.type !== 'letter' || !cell.letter) {
        // Found first unfilled cell
        if (word.direction === 'across') {
          return { row: word.startRow, col: word.startCol + i };
        } else {
          return { row: word.startRow + i, col: word.startCol };
        }
      }
    }
    
    // Word is complete, return start position
    return { row: word.startRow, col: word.startCol };
  }

  // Check if puzzle is complete and correct
  function checkPuzzleCompletion(playGridToCheck: Cell[][]) {
    if (completionAlertShown) return; // Already shown alert
    
    const $solutionGrid = get(solutionGrid);
    const $rows = get(rows);
    const $cols = get(cols);
    
    if (!$solutionGrid) return;
    
    // Check if all letter cells are filled and match solution
    for (let r = 0; r < $rows; r++) {
      for (let c = 0; c < $cols; c++) {
        const cell = playGridToCheck[r]?.[c];
        const solutionCell = $solutionGrid[r]?.[c];
        
        if (solutionCell?.type === 'letter') {
          // Solution has a letter here, so play grid must have the same letter
          if (cell?.type !== 'letter' || cell.letter !== solutionCell.letter) {
            return; // Not complete or incorrect
          }
        }
      }
    }
    
    // Puzzle is complete and correct!
    completionAlertShown = true;
    showCompletionMessage.set(true);
    if (completionMessageTimeout) {
      clearTimeout(completionMessageTimeout);
    }
    completionMessageTimeout = setTimeout(() => {
      showCompletionMessage.set(false);
    }, 5000); // Show for 5 seconds
  }

  // Update selected word ID based on current selection
  function updateSelectedWordId() {
    const $selectedRow = get(selectedRow);
    const $selectedCol = get(selectedCol);
    const $selectedDirection = get(selectedDirection);
    const word = getWordAtCell($selectedRow, $selectedCol, $selectedDirection);
    if (word) {
      selectedWordId.set(word.id);
    } else {
      selectedWordId.set(null);
    }
  }

  // Find next incomplete word, looping through all across then all down
  function findNextIncompleteWord(currentWord: Word | undefined, allWords: Word[], gridToCheck: Cell[][], reverse: boolean = false): Word | undefined {
    // Sort words: all across first (by number), then all down (by number)
    const sortedWords = [...allWords].sort((a, b) => {
      if (a.direction !== b.direction) {
        // Across comes before down
        return a.direction === 'across' ? -1 : 1;
      }
      // Same direction, sort by number
      if (a.number !== b.number) return a.number - b.number;
      // Same number, sort by position
      if (a.startRow !== b.startRow) return a.startRow - b.startRow;
      return a.startCol - b.startCol;
    });

    if (!currentWord) {
      // No current word, return first incomplete word
      return sortedWords.find(w => !isWordComplete(w, gridToCheck));
    }

    // Find current word index
    const currentIndex = sortedWords.findIndex(w => w.id === currentWord.id);
    
    if (reverse) {
      // Search backwards
      for (let i = 1; i < sortedWords.length; i++) {
        const prevIndex = (currentIndex - i + sortedWords.length) % sortedWords.length;
        const prevWord = sortedWords[prevIndex];
        if (!isWordComplete(prevWord, gridToCheck)) {
          return prevWord;
        }
      }
    } else {
      // Start searching from next word
      for (let i = 1; i < sortedWords.length; i++) {
        const nextIndex = (currentIndex + i) % sortedWords.length;
        const nextWord = sortedWords[nextIndex];
        if (!isWordComplete(nextWord, gridToCheck)) {
          return nextWord;
        }
      }
    }

    // All words are complete
    return undefined;
  }

  function getWordAtCell(row: number, col: number, direction: 'across' | 'down'): Word | undefined {
    const $words = get(words);
    return $words.find(w => {
      if (w.direction !== direction) return false;
      if (direction === 'across') {
        return w.startRow === row && col >= w.startCol && col < w.startCol + w.length;
      } else {
        return w.startCol === col && row >= w.startRow && row < w.startRow + w.length;
      }
    });
  }

  // Reactive function to check if a cell is in the current word
  // Using reactive statements to ensure it updates when stores change
  function isCellInCurrentWord(row: number, col: number, selectedRow: number, selectedCol: number, selectedDirection: 'across' | 'down'): boolean {
    const $grid = get(grid);
    const cell = $grid[row]?.[col];
    
    // Black cells are never part of words
    if (cell?.type === 'black') return false;
    
    const word = getWordAtCell(selectedRow, selectedCol, selectedDirection);
    if (!word) return false;
    
    // Also check if the selected cell is black - if so, no word highlighting
    const selectedCell = $grid[selectedRow]?.[selectedCol];
    if (selectedCell?.type === 'black') return false;
    
    // Check if this cell is part of the word
    if (word.direction === 'across') {
      return word.startRow === row && col >= word.startCol && col < word.startCol + word.length;
    } else {
      return word.startCol === col && row >= word.startRow && row < word.startRow + word.length;
    }
  }

  // Check if a cell is part of a 2-letter word/range
  // This checks for sequences of exactly 2 cells (not 1-letter words)
  function isCellInShortRange(row: number, col: number, wordsList: Word[]): boolean {
    const $grid = get(grid);
    const cell = $grid[row]?.[col];
    
    // Black cells are never part of ranges
    if (cell?.type === 'black') return false;
    
    // Check if this cell is part of any word of exactly 2 letters
    const inShortWord = wordsList.some(word => {
      if (word.length !== 2) return false;
      
      // Check if this cell is part of this word
      if (word.direction === 'across') {
        return word.startRow === row && col >= word.startCol && col < word.startCol + word.length;
      } else {
        return word.startCol === col && row >= word.startRow && row < word.startRow + word.length;
      }
    });
    
    if (inShortWord) return true;
    
    // Also check for pairs that aren't part of detected words
    // Check horizontal range
    let horizontalLength = 1;
    // Check left
    for (let c = col - 1; c >= 0; c--) {
      const checkCell = $grid[row]?.[c];
      if (checkCell?.type === 'black') break;
      horizontalLength++;
    }
    // Check right
    for (let c = col + 1; c < $grid[row]?.length; c++) {
      const checkCell = $grid[row]?.[c];
      if (checkCell?.type === 'black') break;
      horizontalLength++;
    }
    
    // Check vertical range
    let verticalLength = 1;
    // Check up
    for (let r = row - 1; r >= 0; r--) {
      const checkCell = $grid[r]?.[col];
      if (checkCell?.type === 'black') break;
      verticalLength++;
    }
    // Check down
    for (let r = row + 1; r < $grid.length; r++) {
      const checkCell = $grid[r]?.[col];
      if (checkCell?.type === 'black') break;
      verticalLength++;
    }
    
    // Return true if either direction has a range of exactly 2
    return horizontalLength === 2 || verticalLength === 2;
  }

  // Check if a cell is part of a 1-letter word/range (unchecked entry)
  function isCellInUncheckedRange(row: number, col: number, wordsList: Word[]): boolean {
    const $grid = get(grid);
    const cell = $grid[row]?.[col];
    
    // Black cells are never part of ranges
    if (cell?.type === 'black') return false;
    
    // Check if this cell is part of any word of exactly 1 letter
    const inUncheckedWord = wordsList.some(word => {
      if (word.length !== 1) return false;
      
      // Check if this cell is part of this word
      if (word.direction === 'across') {
        return word.startRow === row && col >= word.startCol && col < word.startCol + word.length;
      } else {
        return word.startCol === col && row >= word.startRow && row < word.startRow + word.length;
      }
    });
    
    if (inUncheckedWord) return true;
    
    // Also check for isolated cells that aren't part of detected words
    // Check horizontal range
    let horizontalLength = 1;
    // Check left
    for (let c = col - 1; c >= 0; c--) {
      const checkCell = $grid[row]?.[c];
      if (checkCell?.type === 'black') break;
      horizontalLength++;
    }
    // Check right
    for (let c = col + 1; c < $grid[row]?.length; c++) {
      const checkCell = $grid[row]?.[c];
      if (checkCell?.type === 'black') break;
      horizontalLength++;
    }
    
    // Check vertical range
    let verticalLength = 1;
    // Check up
    for (let r = row - 1; r >= 0; r--) {
      const checkCell = $grid[r]?.[col];
      if (checkCell?.type === 'black') break;
      verticalLength++;
    }
    // Check down
    for (let r = row + 1; r < $grid.length; r++) {
      const checkCell = $grid[r]?.[col];
      if (checkCell?.type === 'black') break;
      verticalLength++;
    }
    
    // Return true if either direction has a range of exactly 1
    return horizontalLength === 1 || verticalLength === 1;
  }

  // Check if a cell is part of a word with the hovered length
  function isCellInHoveredLength(row: number, col: number, wordsList: Word[], hoveredLength: number | null): boolean {
    if (hoveredLength === null) return false;
    
    const $grid = get(grid);
    const cell = $grid[row]?.[col];
    
    // Black cells are never part of words
    if (cell?.type === 'black') return false;
    
    // Check if this cell is part of any word with the hovered length
    return wordsList.some(word => {
      if (word.length !== hoveredLength) return false;
      
      // Check if this cell is part of this word
      if (word.direction === 'across') {
        return word.startRow === row && col >= word.startCol && col < word.startCol + word.length;
      } else {
        return word.startCol === col && row >= word.startRow && row < word.startRow + word.length;
      }
    });
  }

  function handleCellClick(row: number, col: number, event: MouseEvent) {
    event.stopPropagation();
    const $selectedRow = get(selectedRow);
    const $selectedCol = get(selectedCol);
    
    // If clicking the same cell, toggle direction
    if (row === $selectedRow && col === $selectedCol) {
      const $selectedDirection = get(selectedDirection);
      const acrossWord = getWordAtCell(row, col, 'across');
      const downWord = getWordAtCell(row, col, 'down');
      
      // Only toggle if both directions have words
      if (acrossWord && downWord) {
        selectedDirection.set($selectedDirection === 'across' ? 'down' : 'across');
      } else if (acrossWord && !downWord) {
        // Only across word exists, switch to it
        selectedDirection.set('across');
      } else if (downWord && !acrossWord) {
        // Only down word exists, switch to it
        selectedDirection.set('down');
      }
    } else {
      // New cell selected - determine direction
      const acrossWord = getWordAtCell(row, col, 'across');
      const downWord = getWordAtCell(row, col, 'down');
      
      if (acrossWord && downWord) {
        // Both exist, use current direction preference
        selectedDirection.set(get(selectedDirection));
      } else if (acrossWord) {
        selectedDirection.set('across');
      } else if (downWord) {
        selectedDirection.set('down');
      }
      
      selectedRow.set(row);
      selectedCol.set(col);
      
      // Update selected word ID for clue highlighting
      updateSelectedWordId();
    }
    
    if (gridElement) {
      gridElement.focus();
    }
  }

  function handleGridClick() {
    // Ensure grid retains focus when clicking anywhere on it, not just cells
    if (gridElement) {
      gridElement.focus();
    }
  }

  function applySymmetry(
    grid: Cell[][],
    row: number,
    col: number,
    symType: SymmetryType,
    totalRows: number,
    totalCols: number
  ): Cell[][] {
    const newGrid = grid.map(r => r.map(c => ({ ...c })));
    
    if (symType === 'none') {
      return newGrid;
    }

    // Apply symmetry based on type
    if (symType === 'rotational') {
      // 180-degree rotation
      const symRow = totalRows - 1 - row;
      const symCol = totalCols - 1 - col;
      if (symRow !== row || symCol !== col) {
        newGrid[symRow][symCol] = { ...newGrid[row][col] };
      }
    } else if (symType === 'vertical') {
      // Mirror across vertical center
      const symCol = totalCols - 1 - col;
      if (symCol !== col) {
        newGrid[row][symCol] = { ...newGrid[row][col] };
      }
    } else if (symType === 'horizontal') {
      // Mirror across horizontal center
      const symRow = totalRows - 1 - row;
      if (symRow !== row) {
        newGrid[symRow][col] = { ...newGrid[row][col] };
      }
    }

    return newGrid;
  }

  function handleKeyDown(event: KeyboardEvent) {
    const $isPlayMode = get(isPlayMode);
    const $playGrid = get(playGrid);
    const $grid = $isPlayMode && $playGrid ? $playGrid : get(grid);
    const $selectedRow = get(selectedRow);
    const $selectedCol = get(selectedCol);
    const gridRows = $grid.length;
    const gridCols = $grid[0]?.length || 0;

    if (event.key === 'ArrowUp' && $selectedRow > 0) {
      let newRow = $selectedRow - 1;
      
      // If shift is held, skip over black cells
      if (event.shiftKey) {
        while (newRow >= 0 && $grid[newRow]?.[$selectedCol]?.type === 'black') {
          newRow--;
        }
      }
      
      if (newRow >= 0) {
        selectedRow.set(newRow);
        // Update direction based on available words at new position
        const acrossWord = getWordAtCell(newRow, $selectedCol, 'across');
        const downWord = getWordAtCell(newRow, $selectedCol, 'down');
        if (downWord && !acrossWord) {
          selectedDirection.set('down');
        } else if (acrossWord && !downWord) {
          selectedDirection.set('across');
        }
        updateSelectedWordId();
      }
      event.preventDefault();
    } else if (event.key === 'ArrowDown' && $selectedRow < gridRows - 1) {
      let newRow = $selectedRow + 1;
      
      // If shift is held, skip over black cells
      if (event.shiftKey) {
        while (newRow < gridRows && $grid[newRow]?.[$selectedCol]?.type === 'black') {
          newRow++;
        }
      }
      
      if (newRow < gridRows) {
        selectedRow.set(newRow);
        // Update direction based on available words at new position
        const acrossWord = getWordAtCell(newRow, $selectedCol, 'across');
        const downWord = getWordAtCell(newRow, $selectedCol, 'down');
        if (downWord && !acrossWord) {
          selectedDirection.set('down');
        } else if (acrossWord && !downWord) {
          selectedDirection.set('across');
        }
        updateSelectedWordId();
      }
      event.preventDefault();
    } else if (event.key === 'ArrowLeft' && $selectedCol > 0) {
      let newCol = $selectedCol - 1;
      
      // If shift is held, skip over black cells
      if (event.shiftKey) {
        while (newCol >= 0 && $grid[$selectedRow]?.[newCol]?.type === 'black') {
          newCol--;
        }
      }
      
      if (newCol >= 0) {
        selectedCol.set(newCol);
        // Update direction based on available words at new position
        const acrossWord = getWordAtCell($selectedRow, newCol, 'across');
        const downWord = getWordAtCell($selectedRow, newCol, 'down');
        if (acrossWord && !downWord) {
          selectedDirection.set('across');
        } else if (downWord && !acrossWord) {
          selectedDirection.set('down');
        }
        updateSelectedWordId();
      }
      event.preventDefault();
    } else if (event.key === 'ArrowRight' && $selectedCol < gridCols - 1) {
      let newCol = $selectedCol + 1;
      
      // If shift is held, skip over black cells
      if (event.shiftKey) {
        while (newCol < gridCols && $grid[$selectedRow]?.[newCol]?.type === 'black') {
          newCol++;
        }
      }
      
      if (newCol < gridCols) {
        selectedCol.set(newCol);
        // Update direction based on available words at new position
        const acrossWord = getWordAtCell($selectedRow, newCol, 'across');
        const downWord = getWordAtCell($selectedRow, newCol, 'down');
        if (acrossWord && !downWord) {
          selectedDirection.set('across');
        } else if (downWord && !acrossWord) {
          selectedDirection.set('down');
        }
        updateSelectedWordId();
      }
      event.preventDefault();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const $selectedDirection = get(selectedDirection);
      const $words = get(words);
      const isShiftTab = event.shiftKey;
      
      if (isShiftTab) {
        // Shift+Tab: Go to previous word, switching direction when wrapping
        const currentWord = getWordAtCell($selectedRow, $selectedCol, $selectedDirection);
        const wordsInDirection = $words.filter(w => w.direction === $selectedDirection);
        
        let prevWord: Word | undefined;
        
        // Sort words by grid number (which follows position order)
        const sortedWords = wordsInDirection.sort((a, b) => {
          // Sort by grid number first
          if (a.number !== b.number) return a.number - b.number;
          // If same number, sort by position
          if (a.startRow !== b.startRow) return a.startRow - b.startRow;
          return a.startCol - b.startCol;
        });
        
        if (currentWord) {
          // Find the previous word by number (not by position)
          const currentIndex = sortedWords.findIndex(w => w.id === currentWord.id);
          if (currentIndex > 0) {
            prevWord = sortedWords[currentIndex - 1];
          }
        }
        
        // If no previous word found, switch direction and go to last word in opposite direction
        if (!prevWord) {
          const oppositeDirection = $selectedDirection === 'across' ? 'down' : 'across';
          const wordsInOppositeDirection = $words
            .filter(w => w.direction === oppositeDirection)
            .sort((a, b) => {
              if (a.number !== b.number) return a.number - b.number;
              if (a.startRow !== b.startRow) return a.startRow - b.startRow;
              return a.startCol - b.startCol;
            });
          
          if (wordsInOppositeDirection.length > 0) {
            prevWord = wordsInOppositeDirection[wordsInOppositeDirection.length - 1];
            selectedDirection.set(oppositeDirection);
          } else if (sortedWords.length > 0) {
            // Fallback: wrap to last word in same direction if no words in opposite direction
            prevWord = sortedWords[sortedWords.length - 1];
          }
        }
        
        // Move to the start of the previous word, skipping filled words in play mode
        if (prevWord) {
          if ($isPlayMode && $playGrid) {
            // In play mode, skip filled words (search backwards)
            const incompleteWord = findNextIncompleteWord(prevWord, $words, $playGrid, true);
            if (incompleteWord) {
              const pos = findFirstUnfilledPosition(incompleteWord, $playGrid);
              if (pos) {
                selectedRow.set(pos.row);
                selectedCol.set(pos.col);
              } else {
                selectedRow.set(incompleteWord.startRow);
                selectedCol.set(incompleteWord.startCol);
              }
              selectedDirection.set(incompleteWord.direction);
              updateSelectedWordId();
            } else {
              // All words are filled, just move to the previous word
              selectedRow.set(prevWord.startRow);
              selectedCol.set(prevWord.startCol);
              selectedDirection.set(prevWord.direction);
              updateSelectedWordId();
            }
          } else {
            selectedRow.set(prevWord.startRow);
            selectedCol.set(prevWord.startCol);
            selectedDirection.set(prevWord.direction);
            updateSelectedWordId();
          }
        }
      } else {
        // Tab: Skip to next word, switching direction when wrapping
        const currentWord = getWordAtCell($selectedRow, $selectedCol, $selectedDirection);
        
        if ($isPlayMode && $playGrid) {
          // In play mode, use findNextIncompleteWord which skips filled words
          const nextWord = findNextIncompleteWord(currentWord, $words, $playGrid);
          if (nextWord) {
            const pos = findFirstUnfilledPosition(nextWord, $playGrid);
            if (pos) {
              selectedRow.set(pos.row);
              selectedCol.set(pos.col);
            } else {
              selectedRow.set(nextWord.startRow);
              selectedCol.set(nextWord.startCol);
            }
            selectedDirection.set(nextWord.direction);
            updateSelectedWordId();
          }
        } else {
          // Normal edit mode - original logic
          // Sort words by grid number (which follows position order)
          const wordsInDirection = $words
            .filter(w => w.direction === $selectedDirection)
            .sort((a, b) => {
              // Sort by grid number first
              if (a.number !== b.number) return a.number - b.number;
              // If same number, sort by position
              if (a.startRow !== b.startRow) return a.startRow - b.startRow;
              return a.startCol - b.startCol;
            });
          
          let nextWord: Word | undefined;
          
          if (currentWord) {
            // Find the next word by number (not by position)
            const currentIndex = wordsInDirection.findIndex(w => w.id === currentWord.id);
            if (currentIndex >= 0 && currentIndex < wordsInDirection.length - 1) {
              nextWord = wordsInDirection[currentIndex + 1];
            }
          }
          
          // If no next word found, switch direction and go to first word in opposite direction
          if (!nextWord) {
            const oppositeDirection = $selectedDirection === 'across' ? 'down' : 'across';
            const wordsInOppositeDirection = $words
              .filter(w => w.direction === oppositeDirection)
              .sort((a, b) => {
                if (a.number !== b.number) return a.number - b.number;
                if (a.startRow !== b.startRow) return a.startRow - b.startRow;
                return a.startCol - b.startCol;
              });
            
            if (wordsInOppositeDirection.length > 0) {
              nextWord = wordsInOppositeDirection[0];
              selectedDirection.set(oppositeDirection);
            } else if (wordsInDirection.length > 0) {
              // Fallback: wrap to first word in same direction if no words in opposite direction
              nextWord = wordsInDirection[0];
            }
          }
          
          // Move to the start of the next word
          if (nextWord) {
            selectedRow.set(nextWord.startRow);
            selectedCol.set(nextWord.startCol);
            selectedDirection.set(nextWord.direction);
            updateSelectedWordId();
          }
        }
      }
      
      event.preventDefault();
    } else if (event.key === 'Enter') {
      // Toggle word direction
      const $selectedDirection = get(selectedDirection);
      const acrossWord = getWordAtCell($selectedRow, $selectedCol, 'across');
      const downWord = getWordAtCell($selectedRow, $selectedCol, 'down');
      
      // Only toggle if both directions have words
      if (acrossWord && downWord) {
        selectedDirection.set($selectedDirection === 'across' ? 'down' : 'across');
      } else if (acrossWord && !downWord) {
        // Only across word exists, switch to it
        selectedDirection.set('across');
      } else if (downWord && !acrossWord) {
        // Only down word exists, switch to it
        selectedDirection.set('down');
      }
      updateSelectedWordId();
      event.preventDefault();
    } else if (event.key === '.' || event.code === 'Period') {
      const symType = get(symmetry);
      const totalRows = get(rows);
      const totalCols = get(cols);
      const $selectedDirection = get(selectedDirection);
      const currentCell = $grid[$selectedRow][$selectedCol];
      const wasBlack = currentCell.type === 'black';
      
      grid.update(g => {
        const newGrid = g.map(row => [...row]);
        newGrid[$selectedRow] = [...newGrid[$selectedRow]];
        // Toggle: if black, make empty; otherwise make black
        if (wasBlack) {
          newGrid[$selectedRow][$selectedCol] = { type: 'empty' };
        } else {
          newGrid[$selectedRow][$selectedCol] = { type: 'black' };
        }
        return applySymmetry(newGrid, $selectedRow, $selectedCol, symType, totalRows, totalCols);
      });
      
      // Move to next cell if we created a black cell (not if we removed one)
      if (!wasBlack) {
        // Get the updated grid state after symmetry is applied
        const updatedGrid = get(grid);
        
        if ($selectedDirection === 'across') {
          // Move right, skipping over black cells
          let nextCol = $selectedCol + 1;
          while (nextCol < gridCols && updatedGrid[$selectedRow]?.[nextCol]?.type === 'black') {
            nextCol++;
          }
          if (nextCol < gridCols) {
            selectedCol.set(nextCol);
          }
        } else if ($selectedDirection === 'down') {
          // Move down, skipping over black cells
          let nextRow = $selectedRow + 1;
          while (nextRow < gridRows && updatedGrid[nextRow]?.[$selectedCol]?.type === 'black') {
            nextRow++;
          }
          if (nextRow < gridRows) {
            selectedRow.set(nextRow);
          }
        } else if ($selectedCol < gridCols - 1) {
          // Fallback to moving right if down movement isn't possible
          let nextCol = $selectedCol + 1;
          while (nextCol < gridCols && updatedGrid[$selectedRow]?.[nextCol]?.type === 'black') {
            nextCol++;
          }
          if (nextCol < gridCols) {
            selectedCol.set(nextCol);
          }
        }
      }
      
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      const $isPlayMode = get(isPlayMode);
      const $playGrid = get(playGrid);
      const currentGrid = $isPlayMode && $playGrid ? $playGrid : $grid;
      const currentCell = currentGrid[$selectedRow][$selectedCol];
      // Don't remove black cells, but still move back
      if (currentCell.type === 'black') {
        // Move back one cell in current direction, skipping over black cells
        const $selectedDirection = get(selectedDirection);
        
        if ($selectedDirection === 'across') {
          // Move left, skipping over black cells
          let prevCol = $selectedCol - 1;
          while (prevCol >= 0 && $grid[$selectedRow]?.[prevCol]?.type === 'black') {
            prevCol--;
          }
          if (prevCol >= 0) {
            selectedCol.set(prevCol);
          }
        } else if ($selectedDirection === 'down') {
          // Move up, skipping over black cells
          let prevRow = $selectedRow - 1;
          while (prevRow >= 0 && $grid[prevRow]?.[$selectedCol]?.type === 'black') {
            prevRow--;
          }
          if (prevRow >= 0) {
            selectedRow.set(prevRow);
          }
        }
        
        event.preventDefault();
        return;
      }
      
      const symType = get(symmetry);
      const totalRows = get(rows);
      const totalCols = get(cols);
      const $selectedDirection = get(selectedDirection);
      
      if ($isPlayMode && $playGrid) {
        // In play mode, update playGrid
        playGrid.update(g => {
          if (!g) return g;
          const newGrid = g.map(row => [...row]);
          newGrid[$selectedRow] = [...newGrid[$selectedRow]];
          const currentCell = newGrid[$selectedRow][$selectedCol];
          // Preserve the number if it exists
          newGrid[$selectedRow][$selectedCol] = { 
            type: 'empty',
            number: currentCell.number
          };
          return newGrid;
        });
        // Also sync to main grid for display
        const updatedPlayGrid = get(playGrid);
        if (updatedPlayGrid) {
          grid.set(updatedPlayGrid);
        }
      } else {
        // Normal edit mode
        grid.update(g => {
          const newGrid = g.map(row => [...row]);
          newGrid[$selectedRow] = [...newGrid[$selectedRow]];
          newGrid[$selectedRow][$selectedCol] = { type: 'empty' };
          return applySymmetry(newGrid, $selectedRow, $selectedCol, symType, totalRows, totalCols);
        });
      }
      
      // Always move to previous cell in current direction, skipping over black cells
      const updatedGrid = $isPlayMode && $playGrid ? get(playGrid) : get(grid);
      
      if (updatedGrid) {
        if ($selectedDirection === 'across') {
          // Move left, skipping over black cells
          let prevCol = $selectedCol - 1;
          while (prevCol >= 0 && updatedGrid[$selectedRow]?.[prevCol]?.type === 'black') {
            prevCol--;
          }
          if (prevCol >= 0) {
            selectedCol.set(prevCol);
          }
        } else if ($selectedDirection === 'down') {
          // Move up, skipping over black cells
          let prevRow = $selectedRow - 1;
          while (prevRow >= 0 && updatedGrid[prevRow]?.[$selectedCol]?.type === 'black') {
            prevRow--;
          }
          if (prevRow >= 0) {
            selectedRow.set(prevRow);
          }
        }
      }
      
      event.preventDefault();
    } else if (event.key.length === 1 && /[a-zA-Z]/.test(event.key) && !event.metaKey && !event.ctrlKey) {
      const letter = event.key.toUpperCase();
      const $selectedDirection = get(selectedDirection);
      const $isPlayMode = get(isPlayMode);
      const $playGrid = get(playGrid);
      
      if ($isPlayMode && $playGrid) {
        // In play mode, update playGrid
        playGrid.update(g => {
          if (!g) return g;
          const newGrid = g.map(row => [...row]);
          newGrid[$selectedRow] = [...newGrid[$selectedRow]];
          const currentCell = newGrid[$selectedRow][$selectedCol];
          // Preserve the number if it exists
          newGrid[$selectedRow][$selectedCol] = { 
            type: 'letter', 
            letter,
            number: currentCell.number
          };
          return newGrid;
        });
        // Also sync to main grid for display
        const updatedPlayGrid = get(playGrid);
        if (updatedPlayGrid) {
          grid.set(updatedPlayGrid);
          
          // Check if current word is now complete and auto-advance
          const currentWord = getWordAtCell($selectedRow, $selectedCol, $selectedDirection);
          if (currentWord) {
            selectedWordId.set(currentWord.id);
            
            if (isWordComplete(currentWord, updatedPlayGrid)) {
              // Find next incomplete word
              const $words = get(words);
              const nextWord = findNextIncompleteWord(currentWord, $words, updatedPlayGrid);
              if (nextWord) {
                const pos = findFirstUnfilledPosition(nextWord, updatedPlayGrid);
                if (pos) {
                  selectedRow.set(pos.row);
                  selectedCol.set(pos.col);
                } else {
                  selectedRow.set(nextWord.startRow);
                  selectedCol.set(nextWord.startCol);
                }
                selectedDirection.set(nextWord.direction);
                selectedWordId.set(nextWord.id);
                // Don't move to next cell, we've already jumped to next word
                event.preventDefault();
                return;
              } else {
                // All words are complete, check if puzzle is correct
                checkPuzzleCompletion(updatedPlayGrid);
              }
            }
          }
          
          // Move to next cell in current direction, skipping over black cells
          if ($selectedDirection === 'across') {
            // Move right, skipping over black cells
            let nextCol = $selectedCol + 1;
            while (nextCol < gridCols && updatedPlayGrid[$selectedRow]?.[nextCol]?.type === 'black') {
              nextCol++;
            }
            if (nextCol < gridCols) {
              selectedCol.set(nextCol);
              updateSelectedWordId();
            } else {
              // Reached end of word, skip to next incomplete word
              const currentWord = getWordAtCell($selectedRow, $selectedCol, $selectedDirection);
              const $words = get(words);
              const nextWord = findNextIncompleteWord(currentWord, $words, updatedPlayGrid);
              if (nextWord) {
                const pos = findFirstUnfilledPosition(nextWord, updatedPlayGrid);
                if (pos) {
                  selectedRow.set(pos.row);
                  selectedCol.set(pos.col);
                } else {
                  selectedRow.set(nextWord.startRow);
                  selectedCol.set(nextWord.startCol);
                }
                selectedDirection.set(nextWord.direction);
                selectedWordId.set(nextWord.id);
              }
            }
          } else if ($selectedDirection === 'down') {
            // Move down, skipping over black cells
            let nextRow = $selectedRow + 1;
            while (nextRow < gridRows && updatedPlayGrid[nextRow]?.[$selectedCol]?.type === 'black') {
              nextRow++;
            }
            if (nextRow < gridRows) {
              selectedRow.set(nextRow);
              updateSelectedWordId();
            } else {
              // Reached end of word, skip to next incomplete word
              const currentWord = getWordAtCell($selectedRow, $selectedCol, $selectedDirection);
              const $words = get(words);
              const nextWord = findNextIncompleteWord(currentWord, $words, updatedPlayGrid);
              if (nextWord) {
                const pos = findFirstUnfilledPosition(nextWord, updatedPlayGrid);
                if (pos) {
                  selectedRow.set(pos.row);
                  selectedCol.set(pos.col);
                } else {
                  selectedRow.set(nextWord.startRow);
                  selectedCol.set(nextWord.startCol);
                }
                selectedDirection.set(nextWord.direction);
                selectedWordId.set(nextWord.id);
              }
            }
          }
        }
      } else {
        // Normal edit mode
        grid.update(g => {
          const newGrid = g.map(row => [...row]);
          newGrid[$selectedRow] = [...newGrid[$selectedRow]];
          newGrid[$selectedRow][$selectedCol] = { type: 'letter', letter };
          return newGrid;
        });
        
        // Move to next cell in current direction, skipping over black cells
        const updatedGrid = get(grid);
        
        if ($selectedDirection === 'across') {
          // Move right, skipping over black cells
          let nextCol = $selectedCol + 1;
          while (nextCol < gridCols && updatedGrid[$selectedRow]?.[nextCol]?.type === 'black') {
            nextCol++;
          }
          if (nextCol < gridCols) {
            selectedCol.set(nextCol);
          }
        } else if ($selectedDirection === 'down') {
          // Move down, skipping over black cells
          let nextRow = $selectedRow + 1;
          while (nextRow < gridRows && updatedGrid[nextRow]?.[$selectedCol]?.type === 'black') {
            nextRow++;
          }
          if (nextRow < gridRows) {
            selectedRow.set(nextRow);
          }
        }
      }
      
      event.preventDefault();
    }
  }

  function calculateCellSize() {
    if (!containerElement) return;
    
    const containerRect = containerElement.getBoundingClientRect();
    const $rows = get(rows);
    const $cols = get(cols);
    
    // Available space accounting for border (2px on each side = 4px total)
    const availableWidth = containerRect.width - (GRID_BORDER * 2);
    const availableHeight = containerRect.height - (GRID_BORDER * 2);
    
    // Calculate cell size based on available space
    // Formula: availableSpace = (cols * cellSize) + ((cols - 1) * gap)
    // Solving for cellSize: cellSize = (availableSpace - ((cols - 1) * gap)) / cols
    const maxWidthPerCell = (availableWidth - (($cols - 1) * CELL_GAP)) / $cols;
    const maxHeightPerCell = (availableHeight - (($rows - 1) * CELL_GAP)) / $rows;
    
    // Use the smaller dimension to ensure grid fits in both directions
    const calculatedSize = Math.floor(Math.min(maxWidthPerCell, maxHeightPerCell));
    
    // Clamp between min and max sizes
    cellSize = Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, calculatedSize));
  }

  let resizeObserver: ResizeObserver;
  
  onMount(() => {
    if (gridElement) {
      gridElement.focus();
    }
    
    // Calculate initial size after a brief delay to ensure container is measured
    setTimeout(() => {
      calculateCellSize();
      
      // Set up ResizeObserver to recalculate on container size changes
      if (containerElement && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          calculateCellSize();
        });
        resizeObserver.observe(containerElement);
      }
    }, 0);
    
    // Also listen to window resize
    window.addEventListener('resize', calculateCellSize);
    
    // Recalculate when grid dimensions change
    const unsubscribeRows = rows.subscribe(() => {
      setTimeout(calculateCellSize, 0);
    });
    const unsubscribeCols = cols.subscribe(() => {
      setTimeout(calculateCellSize, 0);
    });
    
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', calculateCellSize);
      unsubscribeRows();
      unsubscribeCols();
    };
  });
</script>

<div class="grid-wrapper" bind:this={containerElement}>
  <div
    bind:this={gridElement}
    class="grid-container"
    role="application"
    aria-label="Crossword grid"
    tabindex="0"
    on:keydown={handleKeyDown}
    on:click={handleGridClick}
    style="--cell-size: {cellSize}px;"
  >
  {#each displayGrid as row, rowIndex}
    <div class="grid-row">
      {#each row as cell, colIndex}
        {@const wordNum = getWordNumber(rowIndex, colIndex, $words)}
        {@const potentialNum = $potentialNumbers.get(`${rowIndex}-${colIndex}`)}
        {@const displayNum = cell.number ?? wordNum ?? potentialNum}
        {@const isSelected = rowIndex === $selectedRow && colIndex === $selectedCol}
        {@const inCurrentWord = isCellInCurrentWord(rowIndex, colIndex, $selectedRow, $selectedCol, $selectedDirection)}
        {@const inShortWord = !$isPlayMode && $highlightShortWords && isCellInShortRange(rowIndex, colIndex, $words)}
        {@const inUncheckedCell = !$isPlayMode && $highlightUncheckedCells && isCellInUncheckedRange(rowIndex, colIndex, $words)}
        {@const inHoveredLength = isCellInHoveredLength(rowIndex, colIndex, $words, $hoveredWordLength)}
        {@const previewCell = $previewGrid?.[rowIndex]?.[colIndex]}
        {@const hasPreviewLetter = $previewGrid && previewCell?.type === 'letter' && previewCell.letter && 
          (cell.type === 'empty' || (cell.type === 'letter' && cell.letter !== previewCell.letter))}
        {@const isIncorrect = $isPlayMode && $incorrectCells.has(`${rowIndex}-${colIndex}`)}
        <div
          class="cell"
          class:selected={isSelected}
          class:in-word={inCurrentWord}
          class:short-word={inShortWord}
          class:unchecked={inUncheckedCell}
          class:length-hovered={inHoveredLength}
          class:black={cell.type === 'black'}
          class:letter={cell.type === 'letter'}
          class:preview={hasPreviewLetter}
          class:incorrect={isIncorrect}
          role="button"
          tabindex="-1"
          aria-label="Cell {rowIndex + 1}, {colIndex + 1}"
          on:click={(e) => handleCellClick(rowIndex, colIndex, e)}
          on:keydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCellClick(rowIndex, colIndex, e as any);
            }
          }}
        >
          {#if displayNum !== undefined}
            <span class="cell-number">{displayNum}</span>
          {/if}
          {#if cell.type === 'letter' && cell.letter}
            <span class="cell-letter">{cell.letter}</span>
          {/if}
          {#if hasPreviewLetter}
            <span class="cell-letter cell-letter-preview">{previewCell.letter}</span>
          {/if}
        </div>
      {/each}
    </div>
  {/each}
  </div>
</div>

<style>
  .grid-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .grid-container {
    display: flex;
    outline: none;
    flex-direction: column;
    border: 2px solid #000000;
    gap: 1px;
    background: #000000;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
  }

  .grid-row {
    display: flex;
    gap: 1px;
  }

  .cell {
    width: var(--cell-size, 40px);
    height: var(--cell-size, 40px);
    min-width: var(--cell-size, 40px);
    min-height: var(--cell-size, 40px);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #FFFFFF;
    cursor: pointer;
  }

  .cell.selected {
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 1), 0 0 0 4px rgba(255, 255, 255, 1), 0 0 0 5px rgba(0, 0, 0, 1);
    z-index: 10;
    position: relative;
    background: #98D1FA !important;
    border-radius: 1px;
  }

  .cell.selected.short-word {
    background: #C5CFEB !important;
  }

  .cell.in-word {
    background: #E9F5FE;
  }

  .cell.short-word {
    background: #FFDBE4;
  }

  .cell.in-word.short-word {
    background: #E6D6E7;
  }

  .cell.unchecked {
    background: #FDB9CC;
  }

  .cell.in-word.unchecked {
    background: #E4B9D3;
  }

  .cell.selected.unchecked {
    background: #C3B9DC !important;
  }

  .cell.selected.in-word.unchecked {
    background: #C3B9DC !important;
  }

  .cell.black {
    background: #000000 !important;
  }

  .cell.black.in-word {
    background: #000000 !important;
  }

  .cell.length-hovered {
    background: #FDF2E9;
  }

  .cell.in-word.length-hovered {
    background: #FADEC9;
  }

  .cell.selected.in-word.length-hovered {
    background: #F5C197 !important;
  }

  .cell.black.length-hovered {
    background: #000000 !important;
  }

  .cell.black.short-word {
    background: #000000 !important;
    background-image: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 2px,
      rgba(255, 255, 255, 0.1) 2px,
      rgba(255, 255, 255, 0.1) 4px
    );
  }


  .cell-number {
    position: absolute;
    top: -2px;
    left: 2px;
    font-size: calc(var(--cell-size, 40px) * 0.25);
  }

  .cell-letter {
    font-size: calc(var(--cell-size, 40px) * 0.55);
    font-weight: bold;
  }

  .cell-letter-preview {
    opacity: 0.5;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .cell.preview {
    position: relative;
  }

  .cell.incorrect {
    background: #FFE6E6 !important;
  }

  .cell.incorrect.selected {
    background: #FFCCCC !important;
  }

  .cell.incorrect.in-word {
    background: #FFD6D6 !important;
  }
</style>

