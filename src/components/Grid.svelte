<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { grid, selectedRow, selectedCol, selectedDirection, words, potentialNumbers, symmetry, rows, cols, highlightShortWords } from '../lib/store';
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

  // Check if a cell is part of a range less than 3 cells long in either direction
  // This checks for sequences of 1 or 2 cells (not just words)
  function isCellInShortRange(row: number, col: number, wordsList: Word[]): boolean {
    const $grid = get(grid);
    const cell = $grid[row]?.[col];
    
    // Black cells are never part of ranges
    if (cell?.type === 'black') return false;
    
    // Check if this cell is part of any word/range less than 3 long
    const inShortWord = wordsList.some(word => {
      if (word.length >= 3) return false;
      
      // Check if this cell is part of this word
      if (word.direction === 'across') {
        return word.startRow === row && col >= word.startCol && col < word.startCol + word.length;
      } else {
        return word.startCol === col && row >= word.startRow && row < word.startRow + word.length;
      }
    });
    
    if (inShortWord) return true;
    
    // Also check for isolated cells or pairs that aren't part of detected words
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
    
    // Return true if either direction has a range less than 3
    return horizontalLength < 3 || verticalLength < 3;
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
    const $grid = get(grid);
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
      }
      event.preventDefault();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const $selectedDirection = get(selectedDirection);
      const $words = get(words);
      const isShiftTab = event.shiftKey;
      
      if (isShiftTab) {
        // Shift+Tab: Go to previous word in same direction
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
        
        // If no previous word found, wrap to last word
        if (!prevWord && sortedWords.length > 0) {
          prevWord = sortedWords[sortedWords.length - 1];
        }
        
        // Move to the start of the previous word (keep same direction)
        if (prevWord) {
          selectedRow.set(prevWord.startRow);
          selectedCol.set(prevWord.startCol);
          // Keep the same direction, don't change it
        }
      } else {
        // Tab: Skip to next word in current direction
        const currentWord = getWordAtCell($selectedRow, $selectedCol, $selectedDirection);
        
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
        
        // If no next word found, wrap to first word
        if (!nextWord && wordsInDirection.length > 0) {
          nextWord = wordsInDirection[0];
        }
        
        // Move to the start of the next word
        if (nextWord) {
          selectedRow.set(nextWord.startRow);
          selectedCol.set(nextWord.startCol);
          selectedDirection.set(nextWord.direction);
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
      const currentCell = $grid[$selectedRow][$selectedCol];
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
      
      grid.update(g => {
        const newGrid = g.map(row => [...row]);
        newGrid[$selectedRow] = [...newGrid[$selectedRow]];
        newGrid[$selectedRow][$selectedCol] = { type: 'empty' };
        return applySymmetry(newGrid, $selectedRow, $selectedCol, symType, totalRows, totalCols);
      });
      
      // Always move to previous cell in current direction, skipping over black cells
      const updatedGrid = get(grid);
      
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
      
      event.preventDefault();
    } else if (event.key.length === 1 && /[a-zA-Z]/.test(event.key) && !event.metaKey && !event.ctrlKey) {
      const letter = event.key.toUpperCase();
      const $selectedDirection = get(selectedDirection);
      
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
    tabindex="0"
    on:keydown={handleKeyDown}
    on:click={handleGridClick}
    style="--cell-size: {cellSize}px;"
  >
  {#each $grid as row, rowIndex}
    <div class="grid-row">
      {#each row as cell, colIndex}
        {@const wordNum = getWordNumber(rowIndex, colIndex, $words)}
        {@const potentialNum = $potentialNumbers.get(`${rowIndex}-${colIndex}`)}
        {@const displayNum = cell.number ?? wordNum ?? potentialNum}
        {@const isSelected = rowIndex === $selectedRow && colIndex === $selectedCol}
        {@const inCurrentWord = isCellInCurrentWord(rowIndex, colIndex, $selectedRow, $selectedCol, $selectedDirection)}
        {@const inShortWord = $highlightShortWords && isCellInShortRange(rowIndex, colIndex, $words)}
        <div
          class="cell"
          class:selected={isSelected}
          class:in-word={inCurrentWord}
          class:short-word={inShortWord}
          class:black={cell.type === 'black'}
          class:letter={cell.type === 'letter'}
          on:click={(e) => handleCellClick(rowIndex, colIndex, e)}
          role="button"
          tabindex="-1"
        >
          {#if displayNum !== undefined}
            <span class="cell-number">{displayNum}</span>
          {/if}
          {#if cell.type === 'letter' && cell.letter}
            <span class="cell-letter">{cell.letter}</span>
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

  .cell.black {
    background: #000000 !important;
  }

  .cell.black.in-word {
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

  .cell.letter {
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
</style>

