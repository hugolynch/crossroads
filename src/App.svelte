<script lang="ts">
  import Grid from './components/Grid.svelte';
  import RightPanel from './components/RightPanel.svelte';
  import { onMount } from 'svelte';
  import { grid, rows, cols, clues, puzzleTitle, notes, collaborators, symmetry, selectedRow, selectedCol, selectedDirection, activeTab, isPlayMode, playGrid, solutionGrid, incorrectCells, selectedWordId, words, showCompletionMessage } from './lib/store';
  import { loadAutosave, saveAutosave } from './lib/autosave';
  import { get } from 'svelte/store';
  import { wordLists, initializeWordLists, loadWordList } from './lib/wordLists';
  import { getWordCells } from './lib/gridUtils';

  let rightPanelCollapsed = false;
  let rightPanelWidth = 500;

  let isResizingRight = false;
  let resizeStartX = 0;
  let resizeStartRightWidth = 0;

  let autosaveTimeout: ReturnType<typeof setTimeout> | null = null;
  let isInitialLoad = true;
  let showCheckMenu = false;
  let showRevealMenu = false;
  let completionAlertShown = false;
  let completionMessageTimeout: ReturnType<typeof setTimeout> | null = null;

  // Load autosave on mount
  onMount(async () => {
    // Close dropdowns when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.play-button-group')) {
        showCheckMenu = false;
        showRevealMenu = false;
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    // Load grid first
    const autosaveData = loadAutosave();
    if (autosaveData) {
      // Load the autosaved state
      // Set dimensions first (this will trigger grid updates, but we'll overwrite with the saved grid)
      rows.set(autosaveData.rows);
      cols.set(autosaveData.cols);
      // Set grid after dimensions to ensure correct size
      // Use setTimeout to ensure dimension subscriptions have run
      setTimeout(() => {
        grid.set(autosaveData.grid);
        clues.set(new Map(autosaveData.clues));
        puzzleTitle.set(autosaveData.puzzleTitle || '');
        notes.set(autosaveData.notes || '');
        collaborators.set(autosaveData.collaborators || []);
        symmetry.set(autosaveData.symmetry as any);
        selectedRow.set(autosaveData.selectedRow || 0);
        selectedCol.set(autosaveData.selectedCol || 0);
        selectedDirection.set(autosaveData.selectedDirection || 'across');
        isInitialLoad = false;
        setupAutosave();
      }, 0);
    } else {
      // New puzzle - start on grid tab
      activeTab.set('grid');
      isInitialLoad = false;
      setupAutosave();
    }

    // Load word lists last (after grid is loaded)
    // Use setTimeout to ensure grid loading completes first
    setTimeout(async () => {
      if (get(wordLists).length === 0) {
        const initialLists = initializeWordLists();
        wordLists.set(initialLists);
        
        // Load only enabled word lists to save time and memory
        const enabledLists = initialLists.filter(list => list.enabled);
        const disabledLists = initialLists.filter(list => !list.enabled);
        
        // Load enabled lists first (sequentially)
        for (const list of enabledLists) {
          await loadWordList(list);
          // Update store after each load
          wordLists.set([...get(wordLists)]);
        }
        
        // Load disabled lists in background (lower priority)
        // This allows them to be available if user enables them later
        Promise.all(disabledLists.map(list => loadWordList(list))).then(() => {
          wordLists.set([...get(wordLists)]);
        });
      }
    }, 100); // Small delay to ensure grid loads first

    // Also save on page unload
    window.addEventListener('beforeunload', performAutosave);

    return () => {
      if (autosaveTimeout) {
        clearTimeout(autosaveTimeout);
      }
      window.removeEventListener('beforeunload', performAutosave);
      document.removeEventListener('click', handleClickOutside);
    };
  });

  function setupAutosave() {
    // Set up auto-save subscriptions with debouncing
    const storesToWatch = [grid, rows, cols, clues, puzzleTitle, notes, collaborators, symmetry, selectedRow, selectedCol, selectedDirection];
    
    storesToWatch.forEach(store => {
      store.subscribe(() => {
        if (isInitialLoad) return; // Don't save during initial load
        
        // Debounce autosave to avoid excessive writes
        if (autosaveTimeout) {
          clearTimeout(autosaveTimeout);
        }
        autosaveTimeout = setTimeout(() => {
          performAutosave();
        }, 500); // Wait 500ms after last change before saving
      });
    });
  }

  function performAutosave() {
    try {
      saveAutosave({
        grid: get(grid),
        rows: get(rows),
        cols: get(cols),
        clues: Array.from(get(clues).entries()),
        puzzleTitle: get(puzzleTitle),
        notes: get(notes),
        collaborators: get(collaborators),
        symmetry: get(symmetry),
        selectedRow: get(selectedRow),
        selectedCol: get(selectedCol),
        selectedDirection: get(selectedDirection)
      });
    } catch (error) {
      // Silently fail - autosave shouldn't interrupt user workflow
      console.warn('Autosave failed:', error);
    }
  }

  function toggleRightPanel() {
    rightPanelCollapsed = !rightPanelCollapsed;
  }

  function handleRightResizeStart(event: MouseEvent) {
    if (rightPanelCollapsed) return;
    isResizingRight = true;
    resizeStartX = event.clientX;
    resizeStartRightWidth = rightPanelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleRightResizeMove);
    document.addEventListener('mouseup', handleRightResizeEnd);
    event.preventDefault();
  }

  function handleRightResizeMove(event: MouseEvent) {
    if (!isResizingRight) return;
    const deltaX = resizeStartX - event.clientX; // Inverted because right panel
    const newWidth = Math.max(150, Math.min(500, resizeStartRightWidth + deltaX));
    rightPanelWidth = newWidth;
  }

  function handleRightResizeEnd() {
    isResizingRight = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleRightResizeMove);
    document.removeEventListener('mouseup', handleRightResizeEnd);
  }

  function checkSelectedLetters() {
    const $playGrid = get(playGrid);
    const $solutionGrid = get(solutionGrid);
    const $selectedRow = get(selectedRow);
    const $selectedCol = get(selectedCol);
    
    if (!$playGrid || !$solutionGrid) return;
    
    const newIncorrect = new Set<string>();
    const cell = $playGrid[$selectedRow]?.[$selectedCol];
    const solutionCell = $solutionGrid[$selectedRow]?.[$selectedCol];
    
    if (cell?.type === 'letter' && solutionCell?.type === 'letter') {
      if (cell.letter !== solutionCell.letter) {
        newIncorrect.add(`${$selectedRow}-${$selectedCol}`);
      }
    }
    
    incorrectCells.set(newIncorrect);
  }

  function checkSelectedWord() {
    const $playGrid = get(playGrid);
    const $solutionGrid = get(solutionGrid);
    const $selectedRow = get(selectedRow);
    const $selectedCol = get(selectedCol);
    const $selectedDirection = get(selectedDirection);
    const $words = get(words);
    
    if (!$playGrid || !$solutionGrid) return;
    
    const word = $words.find(w => 
      w.startRow === $selectedRow && 
      w.startCol === $selectedCol && 
      w.direction === $selectedDirection
    );
    
    if (!word) return;
    
    const newIncorrect = new Set(get(incorrectCells));
    const cells = getWordCells($playGrid, word);
    const solutionCells = getWordCells($solutionGrid, word);
    
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const solutionCell = solutionCells[i];
      
      if (cell.type === 'letter' && solutionCell.type === 'letter') {
        if (cell.letter !== solutionCell.letter) {
          if (word.direction === 'across') {
            newIncorrect.add(`${word.startRow}-${word.startCol + i}`);
          } else {
            newIncorrect.add(`${word.startRow + i}-${word.startCol}`);
          }
        }
      }
    }
    
    incorrectCells.set(newIncorrect);
  }

  function isPuzzleComplete(): boolean {
    const $playGrid = get(playGrid);
    const $solutionGrid = get(solutionGrid);
    const $rows = get(rows);
    const $cols = get(cols);
    
    if (!$playGrid || !$solutionGrid) return false;
    
    // Check if all letter cells are filled and match solution
    for (let r = 0; r < $rows; r++) {
      for (let c = 0; c < $cols; c++) {
        const cell = $playGrid[r]?.[c];
        const solutionCell = $solutionGrid[r]?.[c];
        
        if (solutionCell?.type === 'letter') {
          // Solution has a letter here, so play grid must have the same letter
          if (cell?.type !== 'letter' || cell.letter !== solutionCell.letter) {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  function checkEntirePuzzle() {
    const $playGrid = get(playGrid);
    const $solutionGrid = get(solutionGrid);
    const $rows = get(rows);
    const $cols = get(cols);
    
    if (!$playGrid || !$solutionGrid) return;
    
    const newIncorrect = new Set<string>();
    
    for (let r = 0; r < $rows; r++) {
      for (let c = 0; c < $cols; c++) {
        const cell = $playGrid[r]?.[c];
        const solutionCell = $solutionGrid[r]?.[c];
        
        if (cell?.type === 'letter' && solutionCell?.type === 'letter') {
          if (cell.letter !== solutionCell.letter) {
            newIncorrect.add(`${r}-${c}`);
          }
        }
      }
    }
    
    incorrectCells.set(newIncorrect);
    
    // Check if puzzle is complete and correct
    if (!completionAlertShown && newIncorrect.size === 0 && isPuzzleComplete()) {
      completionAlertShown = true;
      showCompletionMessage.set(true);
      if (completionMessageTimeout) {
        clearTimeout(completionMessageTimeout);
      }
      completionMessageTimeout = setTimeout(() => {
        showCompletionMessage.set(false);
      }, 5000); // Show for 5 seconds
    }
  }
  
  // Reset completion alert flag when exiting play mode
  $: if (!$isPlayMode) {
    completionAlertShown = false;
    showCompletionMessage.set(false);
    if (completionMessageTimeout) {
      clearTimeout(completionMessageTimeout);
      completionMessageTimeout = null;
    }
  }

  function revealSelectedLetters() {
    const $playGrid = get(playGrid);
    const $solutionGrid = get(solutionGrid);
    const $selectedRow = get(selectedRow);
    const $selectedCol = get(selectedCol);
    
    if (!$playGrid || !$solutionGrid) return;
    
    const solutionCell = $solutionGrid[$selectedRow]?.[$selectedCol];
    if (solutionCell?.type === 'letter' && solutionCell.letter) {
      playGrid.update(g => {
        if (!g) return g;
        const newGrid = g.map(row => [...row]);
        newGrid[$selectedRow] = [...newGrid[$selectedRow]];
        const currentCell = newGrid[$selectedRow][$selectedCol];
        newGrid[$selectedRow][$selectedCol] = {
          type: 'letter',
          letter: solutionCell.letter,
          number: currentCell.number
        };
        return newGrid;
      });
      const updatedGrid = get(playGrid);
      if (updatedGrid) {
        grid.set(updatedGrid);
      }
    }
  }

  function revealSelectedWord() {
    const $playGrid = get(playGrid);
    const $solutionGrid = get(solutionGrid);
    const $selectedRow = get(selectedRow);
    const $selectedCol = get(selectedCol);
    const $selectedDirection = get(selectedDirection);
    const $words = get(words);
    
    if (!$playGrid || !$solutionGrid) return;
    
    const word = $words.find(w => 
      w.startRow === $selectedRow && 
      w.startCol === $selectedCol && 
      w.direction === $selectedDirection
    );
    
    if (!word) return;
    
    playGrid.update(g => {
      if (!g) return g;
      const newGrid = g.map(row => [...row]);
      const solutionCells = getWordCells($solutionGrid, word);
      
      for (let i = 0; i < solutionCells.length; i++) {
        const solutionCell = solutionCells[i];
        if (solutionCell.type === 'letter' && solutionCell.letter) {
          if (word.direction === 'across') {
            const r = word.startRow;
            const c = word.startCol + i;
            const currentCell = newGrid[r][c];
            newGrid[r][c] = {
              type: 'letter',
              letter: solutionCell.letter,
              number: currentCell.number
            };
          } else {
            const r = word.startRow + i;
            const c = word.startCol;
            const currentCell = newGrid[r][c];
            newGrid[r][c] = {
              type: 'letter',
              letter: solutionCell.letter,
              number: currentCell.number
            };
          }
        }
      }
      return newGrid;
    });
    const updatedGrid = get(playGrid);
    if (updatedGrid) {
      grid.set(updatedGrid);
    }
  }

  function revealEntirePuzzle() {
    const $solutionGrid = get(solutionGrid);
    const $rows = get(rows);
    const $cols = get(cols);
    
    if (!$solutionGrid) return;
    
    playGrid.update(g => {
      if (!g) return g;
      const newGrid = g.map(row => [...row]);
      for (let r = 0; r < $rows; r++) {
        for (let c = 0; c < $cols; c++) {
          const solutionCell = $solutionGrid[r]?.[c];
          if (solutionCell?.type === 'letter' && solutionCell.letter) {
            const currentCell = newGrid[r][c];
            newGrid[r][c] = {
              type: 'letter',
              letter: solutionCell.letter,
              number: currentCell.number
            };
          }
        }
      }
      return newGrid;
    });
    const updatedGrid = get(playGrid);
    if (updatedGrid) {
      grid.set(updatedGrid);
    }
  }
</script>

<main>
  {#if $showCompletionMessage}
    <div class="completion-alert">
      {$puzzleTitle ? `Congratulations! You completed "${$puzzleTitle}" correctly!` : 'Congratulations! You completed the puzzle correctly!'}
    </div>
  {/if}
  <div class="center-panel">
    <div class="logo-container">
      <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Crossword Editor" class="logo" />
    </div>
    {#if $isPlayMode}
      <div class="play-controls">
        <div class="play-button-group">
          <button class="play-action-button" on:click={() => showCheckMenu = !showCheckMenu}>
            Check
            <svg
              class="chevron-icon"
              class:expanded={showCheckMenu}
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M4 6l4 4 4-4"
              />
            </svg>
          </button>
          {#if showCheckMenu}
            <div class="play-dropdown-menu">
              <button class="play-dropdown-item" on:click={() => { checkSelectedLetters(); showCheckMenu = false; }}>
                Check Selected Letters
              </button>
              <button class="play-dropdown-item" on:click={() => { checkSelectedWord(); showCheckMenu = false; }}>
                Check Selected Word
              </button>
              <button class="play-dropdown-item" on:click={() => { checkEntirePuzzle(); showCheckMenu = false; }}>
                Check Entire Puzzle
              </button>
            </div>
          {/if}
        </div>
        
        <div class="play-button-group">
          <button class="play-action-button" on:click={() => showRevealMenu = !showRevealMenu}>
            Reveal
            <svg
              class="chevron-icon"
              class:expanded={showRevealMenu}
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M4 6l4 4 4-4"
              />
            </svg>
          </button>
          {#if showRevealMenu}
            <div class="play-dropdown-menu">
              <button class="play-dropdown-item" on:click={() => { revealSelectedLetters(); showRevealMenu = false; }}>
                Reveal Selected Letters
              </button>
              <button class="play-dropdown-item" on:click={() => { revealSelectedWord(); showRevealMenu = false; }}>
                Reveal Selected Word
              </button>
              <button class="play-dropdown-item" on:click={() => { revealEntirePuzzle(); showRevealMenu = false; }}>
                Reveal Entire Puzzle
              </button>
            </div>
          {/if}
        </div>
      </div>
    {/if}
    <Grid />
  </div>
  {#if !rightPanelCollapsed}
    <div 
      class="resize-handle resize-handle-right"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize right panel"
      on:mousedown={handleRightResizeStart}
    ></div>
  {/if}
  <button 
    class="collapse-button collapse-right" 
    class:collapsed={rightPanelCollapsed}
    class:resizing={isResizingRight}
    style="right: {rightPanelCollapsed ? 16 : rightPanelWidth +16}px"
    on:click={toggleRightPanel}
  >
    {rightPanelCollapsed ? '◀' : '▶'}
  </button>
  <div 
    class="right-panel" 
    class:collapsed={rightPanelCollapsed}
    class:resizing={isResizingRight}
    style="width: {rightPanelCollapsed ? 0 : rightPanelWidth}px"
  >
    {#if !rightPanelCollapsed}
      <RightPanel />
    {/if}
  </div>
</main>

<style>
  main {
    display: flex;
    height: 100vh;
    width: 100vw;
    position: relative;
  }

  .right-panel {
    background: var(--carbon-gray-10);
    border: none;
    overflow-y: auto;
    position: relative;
    flex-shrink: 0;
  }

  .right-panel:not(.collapsed):not(.resizing) {
    transition: width 0.2s ease;
  }

  .right-panel.collapsed {
    border: none;
    overflow: hidden;
  }

  .resize-handle {
    width: 1px;
    background: var(--carbon-gray-20);
    cursor: col-resize;
    flex-shrink: 0;
    transition: background 0.15s;
    position: relative;
  }

  .resize-handle::before {
    content: '';
    position: absolute;
    left: -3px;
    right: -3px;
    top: 0;
    bottom: 0;
    background: transparent;
    cursor: col-resize;
  }

  .resize-handle:hover {
    background: var(--carbon-blue-60);
  }

  .resize-handle-left {
    margin-left: 0;
  }

  .resize-handle-right {
    margin-right: 0;
  }

  .collapse-button {
    background: var(--carbon-white);
    border: 1px solid var(--carbon-gray-20);
    border-radius: 0;
    padding: var(--carbon-spacing-02) var(--carbon-spacing-03);
    cursor: pointer;
    font-size: 12px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
    z-index: 10;
    transition: background 0.2s, border-color 0.2s;
  }

  .collapse-button:hover {
    background: var(--carbon-gray-20);
    border-color: var(--carbon-gray-30);
  }

  .collapse-button:active {
    background: var(--carbon-gray-30);
  }

  .collapse-button:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .collapse-right {
    position: absolute;
    top: var(--carbon-spacing-04);
    z-index: 100;
  }

  .collapse-right:not(.resizing) {
    transition: right 0.2s ease;
  }

  .center-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--carbon-spacing-05);
    overflow: auto;
    min-width: 0;
    min-height: 0;
    background: var(--carbon-gray-10);
  }

  .logo-container {
    margin-bottom: var(--carbon-spacing-05);
    display: flex;
    justify-content: center;
  }

  .play-controls {
    display: flex;
    gap: var(--carbon-spacing-03);
    margin-bottom: var(--carbon-spacing-04);
    justify-content: center;
  }

  .play-button-group {
    position: relative;
  }

  .play-action-button {
    display: flex;
    align-items: center;
    gap: var(--carbon-spacing-02);
    padding: var(--carbon-spacing-02) var(--carbon-spacing-04);
    background: var(--carbon-white);
    color: var(--carbon-gray-100);
    border: 1px solid var(--carbon-gray-20);
    border-radius: 0;
    font-size: 14px;
    font-weight: 400;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
  }

  .play-action-button:hover {
    background: var(--carbon-gray-10);
    border-color: var(--carbon-gray-30);
  }

  .chevron-icon {
    color: var(--carbon-gray-70);
    transition: transform 0.2s;
    flex-shrink: 0;
    margin-left: var(--carbon-spacing-02);
  }

  .chevron-icon.expanded {
    transform: rotate(180deg);
  }

  .play-dropdown-menu {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: var(--carbon-spacing-01);
    background: var(--carbon-white);
    border: 1px solid var(--carbon-gray-20);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    z-index: 100;
    min-width: 180px;
  }

  .play-dropdown-item {
    display: block;
    width: 100%;
    padding: var(--carbon-spacing-03) var(--carbon-spacing-04);
    background: var(--carbon-white);
    border: none;
    text-align: left;
    font-size: 14px;
    color: var(--carbon-gray-100);
    cursor: pointer;
    transition: background 0.2s;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
  }

  .play-dropdown-item:hover {
    background: var(--carbon-gray-10);
  }

  .completion-alert {
    position: fixed;
    top: var(--carbon-spacing-05);
    left: 50%;
    transform: translateX(-50%);
    background: var(--carbon-white);
    color: var(--carbon-gray-100);
    border: 1px solid var(--carbon-gray-20);
    border-radius: 0;
    padding: var(--carbon-spacing-03) var(--carbon-spacing-05);
    font-size: 14px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateX(-50%) translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }
</style>
