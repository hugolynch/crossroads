<script lang="ts">
  import { puzzleTitle, notes, collaborators, grid, rows, cols, clues, symmetry, selectedRow, selectedCol, currentPuzzleId, words } from '../lib/store';
  import type { Collaborator, CollaboratorRole } from '../lib/store';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { createEmptyGrid } from '../lib/gridUtils';
  import type { Cell } from '../lib/types';
  import { exportToPuz } from '../lib/puzExport';

  const STORAGE_KEY = 'crossword-puzzles';

  interface PuzzleData {
    id: string;
    grid: Cell[][];
    rows: number;
    cols: number;
    clues: Array<[string, string]>;
    puzzleTitle: string;
    notes: string;
    collaborators: Collaborator[];
    symmetry: string;
    savedAt: number;
  }

  let savedPuzzles: PuzzleData[] = [];
  let showLoadSuccess = false;
  let loadSuccessTimeout: ReturnType<typeof setTimeout> | null = null;
  let showSaveSuccess = false;
  let saveSuccessTimeout: ReturnType<typeof setTimeout> | null = null;
  let saveSuccessMessage = '';

  onMount(() => {
    loadSavedPuzzlesList();
  });

  function loadSavedPuzzlesList() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        savedPuzzles = JSON.parse(saved);
        // Sort by most recent first
        savedPuzzles.sort((a, b) => b.savedAt - a.savedAt);
      } else {
        savedPuzzles = [];
      }
    } catch (error) {
      savedPuzzles = [];
    }
  }

  function savePuzzle() {
    try {
      const currentTitle = get(puzzleTitle);
      const $currentPuzzleId = get(currentPuzzleId);
      
      // Use current puzzle ID if it exists, otherwise generate a new one
      const puzzleId = $currentPuzzleId || Date.now().toString();
      
      const puzzleData: PuzzleData = {
        id: puzzleId,
        grid: get(grid),
        rows: get(rows),
        cols: get(cols),
        clues: Array.from(get(clues).entries()),
        puzzleTitle: currentTitle,
        notes: get(notes),
        collaborators: get(collaborators),
        symmetry: get(symmetry),
        savedAt: Date.now()
      };

      // Load existing puzzles
      const saved = localStorage.getItem(STORAGE_KEY);
      let puzzles: PuzzleData[] = saved ? JSON.parse(saved) : [];
      
      // Update existing puzzle or add new one
      const existingIndex = puzzles.findIndex(p => p.id === puzzleId);
      if (existingIndex >= 0) {
        puzzles[existingIndex] = puzzleData;
      } else {
        puzzles.push(puzzleData);
      }
      
      // Set as current puzzle ID
      currentPuzzleId.set(puzzleId);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(puzzles));
      loadSavedPuzzlesList();
      
      // Show success message
      saveSuccessMessage = 'Puzzle saved successfully!';
      showSaveSuccess = true;
      if (saveSuccessTimeout) {
        clearTimeout(saveSuccessTimeout);
      }
      saveSuccessTimeout = setTimeout(() => {
        showSaveSuccess = false;
      }, 3000);
    } catch (error) {
      alert('Error saving puzzle: ' + error);
    }
  }

  function saveAsPuzzle() {
    try {
      const currentTitle = get(puzzleTitle);
      
      // Always generate a new puzzle ID for "Save As"
      const puzzleId = Date.now().toString();
      
      const puzzleData: PuzzleData = {
        id: puzzleId,
        grid: get(grid),
        rows: get(rows),
        cols: get(cols),
        clues: Array.from(get(clues).entries()),
        puzzleTitle: currentTitle,
        notes: get(notes),
        collaborators: get(collaborators),
        symmetry: get(symmetry),
        savedAt: Date.now()
      };

      // Load existing puzzles
      const saved = localStorage.getItem(STORAGE_KEY);
      let puzzles: PuzzleData[] = saved ? JSON.parse(saved) : [];
      
      // Add as new puzzle
      puzzles.push(puzzleData);
      
      // Set as current puzzle ID
      currentPuzzleId.set(puzzleId);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(puzzles));
      loadSavedPuzzlesList();
      
      // Show success message
      saveSuccessMessage = 'Puzzle saved as new version!';
      showSaveSuccess = true;
      if (saveSuccessTimeout) {
        clearTimeout(saveSuccessTimeout);
      }
      saveSuccessTimeout = setTimeout(() => {
        showSaveSuccess = false;
      }, 3000);
    } catch (error) {
      alert('Error saving puzzle: ' + error);
    }
  }

  function loadPuzzle(puzzleId: string) {
    try {
      const puzzle = savedPuzzles.find(p => p.id === puzzleId);
      if (!puzzle) {
        alert('Puzzle not found.');
        return;
      }

      // Set as current puzzle ID
      currentPuzzleId.set(puzzleId);

      // Load grid dimensions first
      rows.set(puzzle.rows);
      cols.set(puzzle.cols);
      
      // Load grid
      grid.set(puzzle.grid);
      
      // Load clues
      clues.set(new Map(puzzle.clues));
      
      // Load metadata
      puzzleTitle.set(puzzle.puzzleTitle || '');
      notes.set(puzzle.notes || '');
      collaborators.set(puzzle.collaborators || []);
      
      // Load symmetry
      if (puzzle.symmetry) {
        symmetry.set(puzzle.symmetry as any);
      }
      
      loadSavedPuzzlesList();
      
      // Show success message
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

  function deletePuzzle(puzzleId: string, event: MouseEvent) {
    event.stopPropagation();
    if (!confirm('Are you sure you want to delete this puzzle?')) {
      return;
    }

    try {
      const puzzles = savedPuzzles.filter(p => p.id !== puzzleId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(puzzles));
      loadSavedPuzzlesList();
    } catch (error) {
      alert('Error deleting puzzle: ' + error);
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  function handleExportPuz() {
    try {
      const $grid = get(grid);
      const $rows = get(rows);
      const $cols = get(cols);
      const $clues = get(clues);
      const $puzzleTitle = get(puzzleTitle);
      const $notes = get(notes);
      const $collaborators = get(collaborators);
      
      // Get author from collaborators
      const constructor = $collaborators.find(c => c.role === 'Constructor');
      const author = constructor?.name || '';
      
      // Generate .puz file
      const puzData = exportToPuz({
        grid: $grid,
        rows: $rows,
        cols: $cols,
        clues: $clues,
        puzzleTitle: $puzzleTitle,
        author: author,
        copyright: '',
        notes: $notes
      });
      
      // Create blob and download
      const blob = new Blob([puzData as BlobPart], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = ($puzzleTitle || 'crossword').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.puz';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error exporting puzzle: ' + error);
    }
  }

  function handleTitleChange(event: Event) {
    const target = event.target as HTMLInputElement;
    puzzleTitle.set(target.value);
  }

  function handleNotesChange(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    notes.set(target.value);
  }

  function addCollaborator() {
    collaborators.update(collabs => [
      ...collabs,
      { id: Date.now().toString(), name: '', role: 'Constructor' }
    ]);
  }

  function removeCollaborator(id: string) {
    collaborators.update(collabs => collabs.filter(c => c.id !== id));
  }

  function updateCollaboratorName(id: string, name: string) {
    collaborators.update(collabs =>
      collabs.map(c => c.id === id ? { ...c, name } : c)
    );
  }

  function updateCollaboratorRole(id: string, role: CollaboratorRole) {
    collaborators.update(collabs =>
      collabs.map(c => c.id === id ? { ...c, role } : c)
    );
  }
</script>

<div class="metadata-panel">
  {#if showLoadSuccess}
    <div class="success-alert">
      Puzzle loaded successfully!
    </div>
  {/if}
  {#if showSaveSuccess}
    <div class="success-alert">
      {saveSuccessMessage}
    </div>
  {/if}
  <h2>Puzzle Metadata</h2>
  <div class="control-group">
    <label for="title">Title:</label>
    <input
      id="title"
      type="text"
      value={$puzzleTitle}
      on:input={handleTitleChange}
      placeholder="Enter puzzle title..."
    />
  </div>
  
  <div class="control-group">
    <fieldset>
      <legend>Collaborators:</legend>
      <div class="collaborators-list">
        {#each $collaborators as collaborator (collaborator.id)}
          {@const collaboratorId = collaborator.id}
          <div class="collaborator-item">
            <input
              type="text"
              class="collaborator-name"
              placeholder="Name..."
              value={collaborator.name}
              on:input={(e) => {
                const target = e.target as HTMLInputElement;
                updateCollaboratorName(collaboratorId, target.value);
              }}
            />
            <select
              class="collaborator-role"
              value={collaborator.role}
              on:change={(e) => updateCollaboratorRole(collaborator.id, e.currentTarget.value as CollaboratorRole)}
            >
              <option value="Constructor">Constructor</option>
              <option value="Cluer">Cluer</option>
              <option value="Editor">Editor</option>
            </select>
            <button
              class="remove-button"
              on:click={() => removeCollaborator(collaborator.id)}
              title="Remove collaborator"
            >
              ×
            </button>
          </div>
        {/each}
        <button class="add-button" on:click={addCollaborator}>
          + Add Collaborator
        </button>
      </div>
    </fieldset>
  </div>

  <div class="control-group">
    <label for="notes">Notes:</label>
    <textarea
      id="notes"
      class="notes-input"
      value={$notes}
      on:input={handleNotesChange}
      placeholder="Enter notes..."
      rows="5"
    ></textarea>
  </div>

  <div class="control-group">
    <div class="save-buttons">
      <button class="action-button save-button" on:click={savePuzzle}>
        Save
      </button>
      <button class="action-button save-as-button" on:click={saveAsPuzzle}>
        Save As
      </button>
    </div>
  </div>

  <div class="control-group">
    <button class="action-button export-button" on:click={handleExportPuz}>
      Export
    </button>
  </div>

  <div class="control-group">
    <h2>Saved Puzzles</h2>
    {#if savedPuzzles.length === 0}
      <p class="info-text">No saved puzzles found.</p>
    {:else}
      <div class="table-container">
        <table class="puzzles-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Constructor</th>
              <th>Date Saved</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each savedPuzzles as puzzle (puzzle.id)}
              <tr>
                <td class="puzzle-title-cell">{puzzle.puzzleTitle || 'Untitled Puzzle'}</td>
                <td class="puzzle-constructor-cell">
                  {#if puzzle.collaborators && puzzle.collaborators.length > 0}
                    {@const constructors = puzzle.collaborators.filter(c => c.role === 'Constructor' && c.name)}
                    {#if constructors.length > 0}
                      {constructors.map(c => c.name).join(', ')}
                    {:else}
                      —
                    {/if}
                  {:else if (puzzle as any).constructor}
                    {(puzzle as any).constructor}
                  {:else}
                    —
                  {/if}
                </td>
                <td class="puzzle-date-cell">{formatDate(puzzle.savedAt)}</td>
                <td class="puzzle-actions-cell">
                  <button 
                    class="table-button load-table-button" 
                    on:click={() => loadPuzzle(puzzle.id)}
                    title="Load puzzle"
                  >
                    Load
                  </button>
                  <button 
                    class="table-button delete-table-button" 
                    on:click={(e) => deletePuzzle(puzzle.id, e)}
                    title="Delete puzzle"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<style>
  .metadata-panel {
    padding: var(--carbon-spacing-05);
    position: relative;
    background: var(--carbon-white);
  }

  .success-alert {
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

  .metadata-panel h2 {
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

  .control-group fieldset {
    border: none;
    padding: 0;
    margin: 0;
  }

  .control-group legend {
    display: block;
    margin-bottom: var(--carbon-spacing-02);
    font-weight: 600;
    font-size: 12px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
    letter-spacing: 0.16px;
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

  .control-group input,
  .control-group textarea,
  .control-group select {
    width: 100%;
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

  .control-group input[type="text"] {
    height: 40px;
    padding: 0 var(--carbon-spacing-03);
  }

  .control-group select {
    height: 40px;
    padding: 0 var(--carbon-spacing-03);
    padding-right: calc(var(--carbon-spacing-03) + 20px);
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 6L8 9L11 6' stroke='%23525252' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right var(--carbon-spacing-03) center;
    background-size: 16px 16px;
  }

  .control-group select:focus {
    background-image: url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 6L8 9L11 6' stroke='%230f62fe' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  }

  .control-group textarea {
    min-height: 80px;
    padding: var(--carbon-spacing-03);
    resize: vertical;
  }

  .control-group input:focus,
  .control-group textarea:focus,
  .control-group select:focus {
    border-bottom-color: var(--carbon-blue-60);
    outline: none;
  }

  .control-group input:focus-visible,
  .control-group textarea:focus-visible,
  .control-group select:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .notes-input {
    resize: vertical;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
  }

  .collaborators-list {
    display: flex;
    flex-direction: column;
    gap: var(--carbon-spacing-02);
  }

  .collaborator-item {
    display: flex;
    gap: var(--carbon-spacing-02);
    align-items: center;
  }

  .collaborator-name {
    flex: 1;
    min-width: 0;
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

  .collaborator-name:focus {
    border-bottom-color: var(--carbon-blue-60);
    outline: none;
  }

  .collaborator-name:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .collaborator-role {
    flex: 1;
    min-width: 0;
    height: 40px;
    padding: 0 var(--carbon-spacing-03);
    padding-right: calc(var(--carbon-spacing-03) + 20px);
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
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 6L8 9L11 6' stroke='%23525252' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right var(--carbon-spacing-03) center;
    background-size: 16px 16px;
  }

  .collaborator-role:focus {
    border-bottom-color: var(--carbon-blue-60);
    outline: none;
    background-image: url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 6L8 9L11 6' stroke='%230f62fe' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  }

  .collaborator-role:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .remove-button {
    background: var(--carbon-white);
    color: var(--carbon-gray-100);
    border: 1px solid var(--carbon-gray-20);
    border-radius: 0;
    width: 40px;
    height: 40px;
    min-width: 40px;
    padding: 0;
    cursor: pointer;
    font-size: 20px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-weight: 400;
    line-height: 1;
    transition: background 0.2s, border-color 0.2s, color 0.2s;
  }

  .remove-button:hover {
    background: var(--carbon-gray-10);
    border-color: var(--carbon-gray-30);
    color: var(--carbon-gray-100);
  }

  .remove-button:active {
    background: var(--carbon-gray-20);
  }

  .remove-button:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .add-button {
    width: 100%;
    height: 40px;
    padding: 0 var(--carbon-spacing-04);
    background: var(--carbon-white);
    border: 1px solid var(--carbon-gray-20);
    border-radius: 0;
    cursor: pointer;
    font-size: 14px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    font-weight: 400;
    color: var(--carbon-gray-100);
    transition: background 0.2s, border-color 0.2s;
  }

  .add-button:hover {
    background: var(--carbon-gray-10);
    border-color: var(--carbon-gray-30);
  }

  .add-button:active {
    background: var(--carbon-gray-20);
  }

  .add-button:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .control-group h3 {
    font-size: 14px;
    font-weight: 600;
    margin-top: 0;
    margin-bottom: var(--carbon-spacing-03);
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
  }

  .save-buttons {
    display: flex;
    gap: var(--carbon-spacing-02);
    width: 100%;
  }

  .action-button {
    flex: 1;
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

  .save-button {
    background: var(--carbon-white);
    color: var(--carbon-gray-100);
  }

  .save-button:hover {
    background: var(--carbon-gray-10);
    border-color: var(--carbon-gray-30);
  }

  .save-button:active {
    background: var(--carbon-gray-20);
  }

  .save-button:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .save-as-button {
    background: var(--carbon-white);
    color: var(--carbon-gray-100);
  }

  .save-as-button:hover {
    background: var(--carbon-gray-10);
    border-color: var(--carbon-gray-30);
  }

  .save-as-button:active {
    background: var(--carbon-gray-20);
  }

  .save-as-button:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .export-button {
    width: 100%;
    background: var(--carbon-white);
    color: var(--carbon-gray-100);
  }

  .export-button:hover {
    background: var(--carbon-gray-10);
    border-color: var(--carbon-gray-30);
  }

  .export-button:active {
    background: var(--carbon-gray-20);
  }

  .export-button:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .info-text {
    color: var(--carbon-gray-70);
    font-size: 12px;
    font-style: italic;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    margin-top: var(--carbon-spacing-03);
  }

  .table-container {
    overflow-x: auto;
    margin-top: var(--carbon-spacing-03);
  }

  .puzzles-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
  }

  .puzzles-table thead {
    background: var(--carbon-gray-10);
    border-bottom: 1px solid var(--carbon-gray-20);
  }

  .puzzles-table th {
    padding: var(--carbon-spacing-02) var(--carbon-spacing-03);
    text-align: left;
    font-weight: 600;
    color: var(--carbon-gray-100);
    font-size: 12px;
    letter-spacing: 0.16px;
  }

  .puzzles-table tbody tr {
    border-bottom: 1px solid var(--carbon-gray-20);
    transition: background 0.15s;
  }

  .puzzles-table tbody tr:hover {
    background: var(--carbon-gray-10);
  }

  .puzzles-table tbody tr:last-child {
    border-bottom: none;
  }

  .puzzles-table td {
    padding: var(--carbon-spacing-02) var(--carbon-spacing-03);
    color: var(--carbon-gray-100);
    font-size: 14px;
  }

  .puzzle-title-cell {
    font-weight: 600;
  }

  .puzzle-constructor-cell {
    color: var(--carbon-gray-70);
  }

  .puzzle-date-cell {
    color: var(--carbon-gray-70);
    font-size: 12px;
  }

  .puzzle-actions-cell {
    display: flex;
    gap: var(--carbon-spacing-02);
  }

  .table-button {
    height: 32px;
    padding: 0 var(--carbon-spacing-03);
    border: 1px solid var(--carbon-gray-20);
    border-radius: 0;
    cursor: pointer;
    font-size: 12px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    font-weight: 400;
    transition: background 0.2s, border-color 0.2s;
  }

  .load-table-button {
    background: var(--carbon-white);
    color: var(--carbon-gray-100);
  }

  .load-table-button:hover {
    background: var(--carbon-gray-10);
    border-color: var(--carbon-gray-30);
  }

  .load-table-button:active {
    background: var(--carbon-gray-20);
  }

  .load-table-button:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .delete-table-button {
    background: var(--carbon-white);
    color: var(--carbon-gray-100);
  }

  .delete-table-button:hover {
    background: var(--carbon-gray-10);
    border-color: var(--carbon-gray-30);
  }

  .delete-table-button:active {
    background: var(--carbon-gray-20);
  }

  .delete-table-button:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }
</style>

