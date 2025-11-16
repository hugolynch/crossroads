<script lang="ts">
  import { rows, cols, symmetry, grid, highlightShortWords, clues, puzzleTitle, notes, collaborators, selectedRow, selectedCol, currentPuzzleId } from '../lib/store';
  import { createEmptyGrid } from '../lib/gridUtils';
  import type { SymmetryType } from '../lib/store';
  import { get } from 'svelte/store';

  function handleRowsChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = parseInt(target.value, 10);
    if (!isNaN(value) && value > 0 && value <= 50) {
      rows.set(value);
    }
  }

  function handleColsChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = parseInt(target.value, 10);
    if (!isNaN(value) && value > 0 && value <= 50) {
      cols.set(value);
    }
  }

  function incrementRows() {
    const current = $rows;
    if (current < 50) {
      rows.set(current + 1);
    }
  }

  function decrementRows() {
    const current = $rows;
    if (current > 1) {
      rows.set(current - 1);
    }
  }

  function incrementCols() {
    const current = $cols;
    if (current < 50) {
      cols.set(current + 1);
    }
  }

  function decrementCols() {
    const current = $cols;
    if (current > 1) {
      cols.set(current - 1);
    }
  }

  function handleSymmetryChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    symmetry.set(target.value as SymmetryType);
  }

  function handleHighlightShortWordsChange(event: Event) {
    const target = event.target as HTMLInputElement;
    highlightShortWords.set(target.checked);
  }

  function handleClearGrid() {
    // Clear everything
    const currentRows = get(rows);
    const currentCols = get(cols);
    grid.set(createEmptyGrid(currentRows, currentCols));
  }

  function handleClearFill() {
    // Keep black cells, remove letters
    grid.update(g => {
      return g.map(row => 
        row.map(cell => {
          if (cell.type === 'letter') {
            return { type: 'empty' };
          }
          return { ...cell };
        })
      );
    });
  }

  function handleNewPuzzle() {
    if (!confirm('Are you sure you want to create a new puzzle? This will clear the current grid, clues, and metadata.')) {
      return;
    }

    // Reset to default 10x10 grid
    rows.set(10);
    cols.set(10);
    grid.set(createEmptyGrid(10, 10));
    
    // Clear clues
    clues.set(new Map());
    
    // Clear metadata
    puzzleTitle.set('');
    notes.set('');
    collaborators.set([]);
    
    // Reset symmetry
    symmetry.set('none');
    
    // Reset selected cell
    selectedRow.set(0);
    selectedCol.set(0);
    
    // Clear current puzzle ID so next save creates a new puzzle
    currentPuzzleId.set(null);
  }

</script>

<div class="controls-panel">
  <h2>Grid Settings</h2>
  <div class="control-group">
    <label for="rows">Rows:</label>
    <div class="number-input-wrapper">
      <input
        id="rows"
        type="number"
        min="1"
        max="50"
        value={$rows}
        on:input={handleRowsChange}
      />
      <div class="number-controls">
        <button 
          type="button" 
          class="number-button number-button-down" 
          on:click={decrementRows}
          aria-label="Decrease rows"
        >
          −
        </button>
        <button 
          type="button" 
          class="number-button number-button-up" 
          on:click={incrementRows}
          aria-label="Increase rows"
        >
          +
        </button>
      </div>
    </div>
  </div>
  <div class="control-group">
    <label for="cols">Columns:</label>
    <div class="number-input-wrapper">
      <input
        id="cols"
        type="number"
        min="1"
        max="50"
        value={$cols}
        on:input={handleColsChange}
      />
      <div class="number-controls">
        <button 
          type="button" 
          class="number-button number-button-down" 
          on:click={decrementCols}
          aria-label="Decrease columns"
        >
          −
        </button>
        <button 
          type="button" 
          class="number-button number-button-up" 
          on:click={incrementCols}
          aria-label="Increase columns"
        >
          +
        </button>
      </div>
    </div>
  </div>
  <div class="control-group">
    <label for="symmetry">Symmetry:</label>
    <select id="symmetry" value={$symmetry} on:change={handleSymmetryChange}>
      <option value="none">None</option>
      <option value="rotational">Rotational</option>
      <option value="vertical">Vertical</option>
      <option value="horizontal">Horizontal</option>
    </select>
  </div>
  <div class="control-group">
    <label class="checkbox-label">
      <input
        type="checkbox"
        checked={$highlightShortWords}
        on:change={handleHighlightShortWordsChange}
      />
      <span>Highlight unfillable cells</span>
    </label>
  </div>
  <div class="control-group">
    <div class="clear-buttons">
      <button class="clear-button" on:click={handleClearGrid}>
        Clear Grid
      </button>
      <button class="clear-button" on:click={handleClearFill}>
        Clear Fill
      </button>
    </div>
  </div>
  <div class="control-group">
    <button class="action-button new-button" on:click={handleNewPuzzle}>
      New Puzzle
    </button>
  </div>
</div>

<style>
  .controls-panel {
    padding: var(--carbon-spacing-05);
    background: var(--carbon-white);
    height: 100%;
  }

  .controls-panel h2 {
    margin-top: 0;
    margin-bottom: var(--carbon-spacing-05);
    font-size: 16px;
    font-weight: 600;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
  }

  .control-group {
    margin-bottom: var(--carbon-spacing-05);
  }

  .control-group label {
    display: block;
    margin-bottom: var(--carbon-spacing-02);
    font-weight: 600;
    font-size: 12px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
    letter-spacing: 0.16px;
  }

  .number-input-wrapper {
    position: relative;
    width: 100%;
    display: flex;
    align-items: stretch;
  }

  .number-input-wrapper input[type="number"] {
    flex: 1;
    padding-right: 72px;
    appearance: textfield;
    -moz-appearance: textfield;
  }

  .number-input-wrapper input[type="number"]::-webkit-outer-spin-button,
  .number-input-wrapper input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .number-controls {
    position: absolute;
    right: var(--carbon-spacing-03);
    top: 0;
    height: 40px;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--carbon-spacing-05);
    pointer-events: none;
  }

  .number-controls::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    height: 12px;
    width: 1px;
    background: var(--carbon-gray-30);
  }

  .number-button {
    width: 16px;
    height: 16px;
    background: transparent;
    border: none;
    color: var(--carbon-gray-70);
    font-size: 14px;
    font-weight: 400;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: color 0.2s ease, background 0.2s ease;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    pointer-events: auto;
    border-radius: 0;
    position: relative;
  }

  .number-button:hover {
    background: transparent;
    color: var(--carbon-gray-100);
  }

  .number-button:active {
    background: transparent;
    color: var(--carbon-blue-60);
  }

  .number-button:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .number-input-wrapper:has(input[type="number"]:focus) .number-button {
    color: var(--carbon-blue-60);
  }

  .control-group input[type="number"],
  .control-group select {
    width: 100%;
    height: 40px;
    padding: 0 var(--carbon-spacing-03);
    font-size: 14px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
    background: var(--carbon-gray-10);
    border: none;
    border-bottom: 1px solid var(--carbon-gray-50);
    border-radius: 0;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }

  .control-group select {
    padding-right: calc(var(--carbon-spacing-03) + 20px);
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 6L8 9L11 6' stroke='%23525252' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right var(--carbon-spacing-03) center;
    background-size: 16px 16px;
  }

  .control-group input[type="number"]:focus,
  .control-group select:focus {
    border-bottom-color: var(--carbon-blue-60);
    outline: none;
  }

  .control-group select:focus {
    background-image: url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 6L8 9L11 6' stroke='%230f62fe' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  }

  .control-group input[type="number"]:focus-visible,
  .control-group select:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--carbon-spacing-02);
    cursor: pointer;
    font-weight: 400;
    font-size: 14px;
    color: var(--carbon-gray-100);
  }

  .checkbox-label input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--carbon-blue-60);
  }

  .clear-buttons {
    display: flex;
    gap: var(--carbon-spacing-02);
    width: 100%;
  }

  .clear-button {
    flex: 1;
    height: 40px;
    padding: 0 var(--carbon-spacing-04);
    font-size: 14px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    font-weight: 400;
    background: var(--carbon-white);
    border: 1px solid var(--carbon-gray-20);
    border-radius: 0;
    cursor: pointer;
    color: var(--carbon-gray-100);
    transition: background 0.2s, border-color 0.2s;
  }

  .clear-button:hover {
    background: var(--carbon-gray-10);
    border-color: var(--carbon-gray-30);
  }

  .clear-button:active {
    background: var(--carbon-gray-20);
  }

  .clear-button:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .action-button {
    width: 100%;
    height: 40px;
    padding: 0 var(--carbon-spacing-04);
    font-size: 14px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    border: 1px solid var(--carbon-gray-20);
    border-radius: 0;
    cursor: pointer;
    font-weight: 400;
    transition: background 0.2s, border-color 0.2s;
  }

  .new-button {
    background: var(--carbon-white);
    color: var(--carbon-gray-100);
    font-weight: 400;
  }

  .new-button:hover {
    background: var(--carbon-gray-10);
    border-color: var(--carbon-gray-30);
  }

  .new-button:active {
    background: var(--carbon-gray-20);
  }

  .new-button:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }
</style>

