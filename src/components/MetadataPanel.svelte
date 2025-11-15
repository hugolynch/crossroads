<script lang="ts">
  import { puzzleTitle, notes, collaborators, grid, rows, cols, clues, symmetry, selectedRow, selectedCol, currentPuzzleId } from '../lib/store';
  import type { Collaborator, CollaboratorRole } from '../lib/store';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { createEmptyGrid } from '../lib/gridUtils';
  import type { Cell } from '../lib/types';

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
    <label>Collaborators:</label>
    <div class="collaborators-list">
      {#each $collaborators as collaborator (collaborator.id)}
        <div class="collaborator-item">
          <input
            type="text"
            class="collaborator-name"
            placeholder="Name..."
            value={collaborator.name}
            on:input={(e) => updateCollaboratorName(collaborator.id, e.currentTarget.value)}
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
    <h3>Save / Load</h3>
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
    <h3>Saved Puzzles</h3>
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
    padding: 20px;
    position: relative;
  }

  .success-alert {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #F2F3FB;
    color: #2E2F38;
    border: 1px solid #8C8E98;
    border-radius: 3px;
    padding: 12px 20px;
    font-size: 14px;
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

  .control-group input,
  .control-group textarea {
    width: 100%;
    padding: 5px;
    font-size: 14px;
  }

  .notes-input {
    resize: vertical;
    font-family: inherit;
  }

  .collaborators-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .collaborator-item {
    display: flex;
    gap: 5px;
    align-items: center;
  }

  .collaborator-name {
    flex: 1;
  }

  .collaborator-role {
    width: 120px;
    padding: 5px;
    font-size: 14px;
  }

  .remove-button {
    background: #F2F3FB;
    color: #2E2F38;
    border: 1px solid #8C8E98;
    border-radius: 3px;
    width: auto;
    min-width: 24px;
    height: auto;
    padding: 5px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-weight: bold;
    line-height: 1;
  }

  .remove-button:hover {
    background: #E3E5EF;
  }

  .add-button {
    width: 100%;
    padding: 8px;
    background: #F2F3FB;
    border: 1px solid #8C8E98;
    border-radius: 3px;
    cursor: pointer;
    font-size: 14px;
  }

  .add-button:hover {
    background: #E3E5EF;
  }

  .control-group h3 {
    font-size: 16px;
    margin-top: 0;
    margin-bottom: 10px;
    color: #2E2F38;
  }

  .save-buttons {
    display: flex;
    gap: 10px;
    width: 100%;
  }

  .action-button {
    flex: 1;
    padding: 10px;
    font-size: 14px;
    border: 1px solid #8C8E98;
    border-radius: 3px;
    cursor: pointer;
    font-weight: bold;
  }

  .save-button {
    background: #F2F3FB;
    color: #2E2F38;
  }

  .save-button:hover {
    background: #E3E5EF;
  }

  .save-as-button {
    background: #F2F3FB;
    color: #2E2F38;
  }

  .save-as-button:hover {
    background: #E3E5EF;
  }

  .info-text {
    color: #8C8E98;
    font-size: 12px;
    font-style: italic;
    margin-top: 10px;
  }

  .table-container {
    overflow-x: auto;
    margin-top: 10px;
  }

  .puzzles-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }

  .puzzles-table thead {
    background: #F2F3FB;
    border-bottom: 2px solid #8C8E98;
  }

  .puzzles-table th {
    padding: 8px 12px;
    text-align: left;
    font-weight: bold;
    color: #2E2F38;
    font-size: 12px;
  }

  .puzzles-table tbody tr {
    border-bottom: 1px solid #E3E5EF;
  }

  .puzzles-table tbody tr:hover {
    background: #F2F3FB;
  }

  .puzzles-table td {
    padding: 8px 12px;
    color: #2E2F38;
    font-size: 13px;
  }

  .puzzle-title-cell {
    font-weight: bold;
  }

  .puzzle-constructor-cell {
    color: #6D6E78;
  }

  .puzzle-date-cell {
    color: #8C8E98;
    font-size: 12px;
  }

  .puzzle-actions-cell {
    display: flex;
    gap: 8px;
  }

  .table-button {
    padding: 6px 12px;
    border: 1px solid #8C8E98;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    font-weight: bold;
    transition: background 0.2s;
  }

  .load-table-button {
    background: #F2F3FB;
    color: #2E2F38;
  }

  .load-table-button:hover {
    background: #E3E5EF;
  }

  .delete-table-button {
    background: #F2F3FB;
    color: #2E2F38;
  }

  .delete-table-button:hover {
    background: #E3E5EF;
  }
</style>

