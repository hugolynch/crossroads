<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { 
    grid, rows, cols, clues, puzzleTitle, notes, collaborators, symmetry, 
    currentPuzzleId, isPlayMode, solutionGrid, playGrid, words, activeTab, selectedWordId,
    selectedRow, selectedCol, selectedDirection, incorrectCells, playAuthor
  } from '../lib/store';
  import { createEmptyGrid, getWordCells } from '../lib/gridUtils';
  import type { Cell, Word } from '../lib/types';
  import { importFromPuz } from '../lib/puzImport';

  const STORAGE_KEY = 'crossword-puzzles';

  interface PuzzleData {
    id: string;
    grid: Cell[][];
    rows: number;
    cols: number;
    clues: Array<[string, string]>;
    puzzleTitle: string;
    notes: string;
    collaborators: any[];
    symmetry: string;
    savedAt: number;
  }

  let savedPuzzles: PuzzleData[] = [];
  let showLoadSuccess = false;
  let loadSuccessTimeout: ReturnType<typeof setTimeout> | null = null;
  let fileInput: HTMLInputElement;
  let cluesListRef: HTMLDivElement;

  // Filter words based on showOneLetterClues setting
  $: filteredWords = $words.filter(w => w.length > 1);

  // Sort words by their grid number
  $: acrossWords = filteredWords.filter(w => w.direction === 'across').sort((a, b) => {
    if (a.number !== b.number) return a.number - b.number;
    if (a.startRow !== b.startRow) return a.startRow - b.startRow;
    return a.startCol - b.startCol;
  });
  $: downWords = filteredWords.filter(w => w.direction === 'down').sort((a, b) => {
    if (a.number !== b.number) return a.number - b.number;
    if (a.startRow !== b.startRow) return a.startRow - b.startRow;
    return a.startCol - b.startCol;
  });

  function getClueText(wordId: string): string {
    return $clues.get(wordId) || '';
  }

  // Scroll to selected clue
  $: if ($selectedWordId) {
    setTimeout(() => {
      // Try to find the selected clue in any clues list
      const selectedElement = document.querySelector(`[data-word-id="${$selectedWordId}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
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

  function handleClueClick(word: Word) {
    // Select the word in the grid
    // In play mode, go to first unfilled letter if word is partially filled
    if ($isPlayMode && $playGrid) {
      const pos = findFirstUnfilledPosition(word, $playGrid);
      if (pos) {
        selectedRow.set(pos.row);
        selectedCol.set(pos.col);
      } else {
        selectedRow.set(word.startRow);
        selectedCol.set(word.startCol);
      }
    } else {
      selectedRow.set(word.startRow);
      selectedCol.set(word.startCol);
    }
    selectedDirection.set(word.direction);
    selectedWordId.set(word.id);
  }

  onMount(() => {
    loadSavedPuzzlesList();
  });

  function loadSavedPuzzlesList() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        savedPuzzles = JSON.parse(saved);
        savedPuzzles.sort((a, b) => b.savedAt - a.savedAt);
      } else {
        savedPuzzles = [];
      }
    } catch (error) {
      savedPuzzles = [];
    }
  }

  function loadPuzzleForPlay(puzzleId: string) {
    try {
      const puzzle = savedPuzzles.find(p => p.id === puzzleId);
      if (!puzzle) {
        alert('Puzzle not found.');
        return;
      }

      // Store solution grid
      solutionGrid.set(puzzle.grid);
      
      // Create blank play grid (same structure but empty letters)
      const blankGrid: Cell[][] = [];
      for (let r = 0; r < puzzle.rows; r++) {
        blankGrid[r] = [];
        for (let c = 0; c < puzzle.cols; c++) {
          const solutionCell = puzzle.grid[r][c];
          if (solutionCell.type === 'black') {
            blankGrid[r][c] = { type: 'black' };
          } else if (solutionCell.type === 'letter') {
            // Keep the number but remove the letter
            blankGrid[r][c] = { 
              type: 'empty',
              number: solutionCell.number
            };
          } else {
            blankGrid[r][c] = { ...solutionCell };
          }
        }
      }
      playGrid.set(blankGrid);

      // Set dimensions
      rows.set(puzzle.rows);
      cols.set(puzzle.cols);
      
      // Load clues
      clues.set(new Map(puzzle.clues));
      
      // Load metadata
      puzzleTitle.set(puzzle.puzzleTitle || '');
      notes.set(puzzle.notes || '');
      
      // Get author from collaborators
      const constructor = puzzle.collaborators?.find((c: any) => c.role === 'Constructor');
      playAuthor.set(constructor?.name || '');
      
      // Clear incorrect cells
      incorrectCells.set(new Set());
      
      // Update the main grid to show play grid
      grid.set(blankGrid);
      
      // Set play mode (after setting grid so words are calculated correctly)
      isPlayMode.set(true);
      
      // Select first horizontal word after a brief delay to ensure words are calculated
      setTimeout(() => {
        const $words = get(words);
        const acrossWords = $words.filter(w => w.direction === 'across' && w.length > 1);
        if (acrossWords.length > 0) {
          // Sort by number, then by position
          const sortedAcross = acrossWords.sort((a, b) => {
            if (a.number !== b.number) return a.number - b.number;
            if (a.startRow !== b.startRow) return a.startRow - b.startRow;
            return a.startCol - b.startCol;
          });
          const firstWord = sortedAcross[0];
          selectedRow.set(firstWord.startRow);
          selectedCol.set(firstWord.startCol);
          selectedDirection.set('across');
          selectedWordId.set(firstWord.id);
        }
      }, 100);
      
      loadSavedPuzzlesList();
      
      showLoadSuccess = true;
      if (loadSuccessTimeout) {
        clearTimeout(loadSuccessTimeout);
      }
      loadSuccessTimeout = setTimeout(() => {
        showLoadSuccess = false;
      }, 3000);
    } catch (error) {
      alert('Error loading puzzle: ' + error);
    }
  }

  function handleImportPuz() {
    fileInput?.click();
  }

  async function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) {
      return;
    }
    
    if (!file.name.toLowerCase().endsWith('.puz')) {
      alert('Please select a .puz file');
      return;
    }
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const importedData = importFromPuz(arrayBuffer);
      
      // Store solution grid
      solutionGrid.set(importedData.grid);
      
      // Create blank play grid
      const blankGrid: Cell[][] = [];
      for (let r = 0; r < importedData.rows; r++) {
        blankGrid[r] = [];
        for (let c = 0; c < importedData.cols; c++) {
          const solutionCell = importedData.grid[r][c];
          if (solutionCell.type === 'black') {
            blankGrid[r][c] = { type: 'black' };
          } else if (solutionCell.type === 'letter') {
            blankGrid[r][c] = { 
              type: 'empty',
              number: solutionCell.number
            };
          } else {
            blankGrid[r][c] = { ...solutionCell };
          }
        }
      }
      playGrid.set(blankGrid);

      // Load the imported puzzle
      rows.set(importedData.rows);
      cols.set(importedData.cols);
      clues.set(importedData.clues);
      puzzleTitle.set(importedData.puzzleTitle || '');
      notes.set(importedData.notes || '');
      playAuthor.set(importedData.author || '');
      
      // Clear incorrect cells
      incorrectCells.set(new Set());
      
      // Update the main grid to show play grid
      grid.set(blankGrid);
      
      // Set play mode (after setting grid so words are calculated correctly)
      isPlayMode.set(true);
      
      // Clear current puzzle ID
      currentPuzzleId.set(null);
      
      // Select first horizontal word after a brief delay to ensure words are calculated
      setTimeout(() => {
        const $words = get(words);
        const acrossWords = $words.filter(w => w.direction === 'across' && w.length > 1);
        if (acrossWords.length > 0) {
          // Sort by number, then by position
          const sortedAcross = acrossWords.sort((a, b) => {
            if (a.number !== b.number) return a.number - b.number;
            if (a.startRow !== b.startRow) return a.startRow - b.startRow;
            return a.startCol - b.startCol;
          });
          const firstWord = sortedAcross[0];
          selectedRow.set(firstWord.startRow);
          selectedCol.set(firstWord.startCol);
          selectedDirection.set('across');
          selectedWordId.set(firstWord.id);
        }
      }, 100);
      
      showLoadSuccess = true;
      if (loadSuccessTimeout) {
        clearTimeout(loadSuccessTimeout);
      }
      loadSuccessTimeout = setTimeout(() => {
        showLoadSuccess = false;
      }, 3000);
      
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      alert('Error importing puzzle: ' + error);
      if (fileInput) {
        fileInput.value = '';
      }
    }
  }

  function exitPlayMode() {
    isPlayMode.set(false);
    solutionGrid.set(null);
    playGrid.set(null);
    selectedWordId.set(null);
    incorrectCells.set(new Set());
    playAuthor.set('');
    // Switch back to play tab to select puzzles
    activeTab.set('play');
  }

</script>

<div class="play-panel">
  {#if !$isPlayMode}
    <div class="play-setup">
      <h2>Play Crossword</h2>
      <p class="description">Load a saved puzzle or import a .puz file to start playing.</p>
      
      <div class="section">
        <h3>Load Saved Puzzle</h3>
        {#if savedPuzzles.length > 0}
          <div class="puzzles-list">
            {#each savedPuzzles as puzzle (puzzle.id)}
              <div 
                class="puzzle-item" 
                role="button"
                tabindex="0"
                on:click={() => loadPuzzleForPlay(puzzle.id)}
                on:keydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    loadPuzzleForPlay(puzzle.id);
                  }
                }}
              >
                <div class="puzzle-info">
                  <div class="puzzle-title">{puzzle.puzzleTitle || 'Untitled Puzzle'}</div>
                  <div class="puzzle-meta">
                    {puzzle.rows} × {puzzle.cols} • {new Date(puzzle.savedAt).toLocaleDateString()}
                  </div>
                </div>
                <button class="load-button" on:click|stopPropagation={() => loadPuzzleForPlay(puzzle.id)}>
                  Load
                </button>
              </div>
            {/each}
          </div>
        {:else}
          <p class="no-puzzles">No saved puzzles found.</p>
        {/if}
      </div>

      <div class="section">
        <h3>Import .puz File</h3>
        <button class="import-button" on:click={handleImportPuz}>
          Choose .puz File
        </button>
        <input
          bind:this={fileInput}
      type="file"
      accept=".puz"
      on:change={handleFileChange}
      style="display: none;"
        />
      </div>
    </div>
  {:else}
    <div class="play-clues">
      <div class="play-header">
        <div>
          <h2>{$puzzleTitle || 'Crossword Puzzle'}</h2>
          {#if $playAuthor}
            <div class="author">By {$playAuthor}</div>
          {/if}
        </div>
        <button class="exit-button" on:click={exitPlayMode}>Exit Play Mode</button>
      </div>
      
      {#if showLoadSuccess}
        <div class="success-message">Puzzle loaded successfully!</div>
      {/if}

      {#if acrossWords.length > 0 || downWords.length > 0}
        {#if acrossWords.length > 0}
          <div class="clues-section">
            <h3 class="section-heading">Across</h3>
            <div class="clues-list" bind:this={cluesListRef}>
              {#each acrossWords as word (word.id)}
                <div 
                  class="clue-item" 
                  class:selected={$selectedWordId === word.id}
                  data-word-id={word.id}
                  role="button"
                  tabindex="0"
                  on:click={() => handleClueClick(word)}
                  on:keydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleClueClick(word);
                    }
                  }}
                >
                  <span class="clue-number">{word.number}.</span>
                  <span class="clue-text">{getClueText(word.id) || 'No clue'}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
        
        {#if downWords.length > 0}
          <div class="clues-section">
            <h3 class="section-heading">Down</h3>
            <div class="clues-list">
              {#each downWords as word (word.id)}
                <div 
                  class="clue-item" 
                  class:selected={$selectedWordId === word.id}
                  data-word-id={word.id}
                  role="button"
                  tabindex="0"
                  on:click={() => handleClueClick(word)}
                  on:keydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleClueClick(word);
                    }
                  }}
                >
                  <span class="clue-number">{word.number}.</span>
                  <span class="clue-text">{getClueText(word.id) || 'No clue'}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {:else}
        <p class="no-clues">No clues available. Load a puzzle to start playing.</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .play-panel {
    padding: var(--carbon-spacing-05);
    background: var(--carbon-white);
    height: 100%;
    overflow-y: auto;
  }

  .play-setup h2 {
    margin-top: 0;
    margin-bottom: var(--carbon-spacing-03);
    font-size: 18px;
    font-weight: 600;
    color: var(--carbon-gray-100);
  }

  .description {
    margin-bottom: var(--carbon-spacing-06);
    color: var(--carbon-gray-70);
    font-size: 14px;
  }

  .section {
    margin-bottom: var(--carbon-spacing-06);
  }

  .section h3 {
    margin-top: 0;
    margin-bottom: var(--carbon-spacing-04);
    font-size: 14px;
    font-weight: 600;
    color: var(--carbon-gray-100);
  }

  .puzzles-list {
    display: flex;
    flex-direction: column;
    gap: var(--carbon-spacing-02);
  }

  .puzzle-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--carbon-spacing-04);
    background: var(--carbon-gray-10);
    border: 1px solid var(--carbon-gray-20);
    border-radius: 0;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }

  .puzzle-item:hover {
    background: var(--carbon-gray-20);
    border-color: var(--carbon-gray-30);
  }

  .puzzle-info {
    flex: 1;
  }

  .puzzle-title {
    font-weight: 600;
    font-size: 14px;
    color: var(--carbon-gray-100);
    margin-bottom: var(--carbon-spacing-01);
  }

  .puzzle-meta {
    font-size: 12px;
    color: var(--carbon-gray-70);
  }

  .load-button {
    padding: var(--carbon-spacing-02) var(--carbon-spacing-04);
    background: var(--carbon-blue-60);
    color: var(--carbon-white);
    border: none;
    border-radius: 0;
    font-size: 14px;
    font-weight: 400;
    cursor: pointer;
    transition: background 0.2s;
  }

  .load-button:hover {
    background: var(--carbon-blue-70);
  }

  .no-puzzles {
    color: var(--carbon-gray-70);
    font-size: 14px;
    font-style: italic;
  }

  .import-button {
    padding: var(--carbon-spacing-03) var(--carbon-spacing-05);
    background: var(--carbon-white);
    color: var(--carbon-gray-100);
    border: 1px solid var(--carbon-gray-20);
    border-radius: 0;
    font-size: 14px;
    font-weight: 400;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }

  .import-button:hover {
    background: var(--carbon-gray-10);
    border-color: var(--carbon-gray-30);
  }

  .play-clues {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .play-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .play-header h2 {
    margin: 0 0 var(--carbon-spacing-01) 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--carbon-gray-100);
  }

  .author {
    font-size: 12px;
    color: var(--carbon-gray-70);
    font-style: italic;
  }

  .exit-button {
    padding: var(--carbon-spacing-02) var(--carbon-spacing-04);
    background: var(--carbon-white);
    color: var(--carbon-gray-100);
    border: 1px solid var(--carbon-gray-20);
    border-radius: 0;
    font-size: 12px;
    font-weight: 400;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }

  .exit-button:hover {
    background: var(--carbon-gray-10);
    border-color: var(--carbon-gray-30);
  }

  .success-message {
    padding: var(--carbon-spacing-03);
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
    border-radius: 0;
    margin-bottom: var(--carbon-spacing-04);
    font-size: 14px;
  }

  .clues-section {
    margin-bottom: var(--carbon-spacing-06);
  }

  .section-heading {
    font-size: 14px;
    font-weight: 600;
    color: var(--carbon-gray-100);
    margin-bottom: var(--carbon-spacing-03);
    padding-bottom: var(--carbon-spacing-02);
    border-bottom: 1px solid var(--carbon-gray-20);
  }

  .clues-list {
    display: flex;
    flex-direction: column;
  }

  .clue-item {
    cursor: pointer;
    padding: var(--carbon-spacing-02);
    border-radius: 0;
    transition: background 0.2s;
    border-left: 3px solid transparent;
    display: flex;
    align-items: baseline;
    gap: var(--carbon-spacing-02);
  }

  .clue-item:hover {
    background: var(--carbon-gray-10);
  }

  .clue-item.selected {
    background: var(--carbon-gray-10);
    border-left-color: var(--carbon-blue-60);
  }

  .clue-number {
    font-weight: 600;
    font-size: 14px;
    color: var(--carbon-gray-100);
    min-width: 30px;
    flex-shrink: 0;
  }

  .clue-text {
    font-size: 14px;
    color: var(--carbon-gray-100);
    line-height: 1.5;
    flex: 1;
  }

  .no-clues {
    color: var(--carbon-gray-70);
    font-size: 14px;
    font-style: italic;
    text-align: center;
    padding: var(--carbon-spacing-06);
  }
</style>

