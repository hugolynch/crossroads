<script lang="ts">
  import Grid from './components/Grid.svelte';
  import RightPanel from './components/RightPanel.svelte';
  import { onMount } from 'svelte';
  import { grid, rows, cols, clues, puzzleTitle, notes, collaborators, symmetry, selectedRow, selectedCol, selectedDirection } from './lib/store';
  import { loadAutosave, saveAutosave } from './lib/autosave';
  import { get } from 'svelte/store';
  import { wordLists, initializeWordLists, loadWordList } from './lib/wordLists';

  let rightPanelCollapsed = false;
  let rightPanelWidth = 500;

  let isResizingRight = false;
  let resizeStartX = 0;
  let resizeStartRightWidth = 0;

  let autosaveTimeout: ReturnType<typeof setTimeout> | null = null;
  let isInitialLoad = true;

  // Load autosave on mount
  onMount(async () => {
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
</script>

<main>
  <div class="center-panel">
    <div class="logo-container">
      <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Crossword Editor" class="logo" />
    </div>
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
</style>
