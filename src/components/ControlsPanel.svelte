<script lang="ts">
  import { rows, cols, symmetry, grid, highlightShortWords, clues, puzzleTitle, notes, collaborators, selectedRow, selectedCol } from '../lib/store';
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
  }

</script>

<div class="controls-panel">
  <h2>Grid Settings</h2>
  <div class="control-group">
    <label for="rows">Rows:</label>
    <input
      id="rows"
      type="number"
      min="1"
      max="50"
      value={$rows}
      on:input={handleRowsChange}
    />
  </div>
  <div class="control-group">
    <label for="cols">Columns:</label>
    <input
      id="cols"
      type="number"
      min="1"
      max="50"
      value={$cols}
      on:input={handleColsChange}
    />
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
    padding: 20px;
  }

  .controls-panel h2 {
    margin-top: 0;
    font-size: 18px;
  }

  .control-group {
    margin-bottom: 15px;
  }

  .control-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }

  .control-group input[type="number"],
  .control-group input[type="text"],
  .control-group select {
    width: 100%;
    padding: 5px;
    font-size: 14px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: auto;
    cursor: pointer;
  }

  .clear-buttons {
    display: flex;
    gap: 10px;
    width: 100%;
  }

  .clear-button {
    flex: 1;
    padding: 8px;
    font-size: 14px;
    background: #F2F3FB;
    border: 1px solid #8C8E98;
    border-radius: 3px;
    cursor: pointer;
  }

  .clear-button:hover {
    background: #E3E5EF;
  }

  .action-button {
    width: 100%;
    padding: 10px;
    font-size: 14px;
    border: 1px solid #8C8E98;
    border-radius: 3px;
    cursor: pointer;
    font-weight: bold;
  }

  .new-button {
    background: #F2F3FB;
    color: #2E2F38;
    font-weight: normal;
  }

  .new-button:hover {
    background: #E3E5EF;
  }
</style>

