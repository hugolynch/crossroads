<script lang="ts">
  import { wordLists, saveWordListPreferences, loadWordList } from '../lib/wordLists';
  import { highlightShortWords, highlightUncheckedCells, showOneLetterClues } from '../lib/store';

  let wordListsExpanded: boolean = true;

  function handleHighlightShortWordsChange(event: Event) {
    const target = event.target as HTMLInputElement;
    highlightShortWords.set(target.checked);
  }

  function handleHighlightUncheckedCellsChange(event: Event) {
    const target = event.target as HTMLInputElement;
    highlightUncheckedCells.set(target.checked);
  }

  function handleShowOneLetterCluesChange(event: Event) {
    const target = event.target as HTMLInputElement;
    showOneLetterClues.set(target.checked);
  }

  function toggleWordList(id: string) {
    const currentLists = $wordLists;
    const list = currentLists.find(l => l.id === id);
    if (list) {
      list.enabled = !list.enabled;
      const updatedLists = [...currentLists];
      wordLists.set(updatedLists); // Update store
      saveWordListPreferences(updatedLists); // Save preferences
      
      // If enabling a list that hasn't been loaded yet, load it now
      if (list.enabled && list.words.length === 0 && !list.loading) {
        loadWordList(list).then(() => {
          wordLists.set([...$wordLists]);
        });
      }
    }
  }
</script>

<div class="settings-panel">  
  <div class="control-group">
    <h3 class="section-heading" style="margin-bottom: var(--carbon-spacing-03);">Display Options</h3>
    <label class="checkbox-label">
      <input
        type="checkbox"
        checked={$highlightShortWords}
        on:change={handleHighlightShortWordsChange}
      />
      <span>Highlight 2-letter entries</span>
    </label>
    <label class="checkbox-label">
      <input
        type="checkbox"
        checked={$highlightUncheckedCells}
        on:change={handleHighlightUncheckedCellsChange}
      />
      <span>Highlight unchecked entries</span>
    </label>
    <label class="checkbox-label">
      <input
        type="checkbox"
        checked={$showOneLetterClues}
        on:change={handleShowOneLetterCluesChange}
      />
      <span>Show clues for 1-letter words</span>
    </label>
  </div>

  <div class="control-group">
    <div class="word-lists-section">
      <button
        class="section-toggle"
        on:click={() => wordListsExpanded = !wordListsExpanded}
        aria-expanded={wordListsExpanded}
        aria-label={wordListsExpanded ? 'Collapse word lists' : 'Expand word lists'}
      >
        <h3 class="section-heading">Word Lists</h3>
        <svg
          class="chevron-icon"
          class:expanded={wordListsExpanded}
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
      {#if wordListsExpanded}
        <table class="word-lists-table">
          <thead>
            <tr>
              <th>Enable</th>
              <th>Name</th>
              <th>Words</th>
            </tr>
          </thead>
          <tbody>
            {#each $wordLists as list (list.id)}
              <tr>
                <td>
                  <input
                    type="checkbox"
                    id="list-{list.id}"
                    checked={list.enabled}
                    on:change={() => toggleWordList(list.id)}
                    disabled={list.loading}
                  />
                </td>
                <td>
                  <label for="list-{list.id}">{list.name}</label>
                </td>
                <td>
                  {#if list.loading}
                    <span class="loading-text">Loading...</span>
                  {:else}
                    {list.words.length.toLocaleString()}
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  </div>
</div>

<style>
  .settings-panel {
    padding: var(--carbon-spacing-05);
    background: var(--carbon-white);
    height: 100%;
  }

  .control-group {
    margin-bottom: var(--carbon-spacing-05);
  }

  .section-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    margin-bottom: var(--carbon-spacing-03);
    transition: opacity 0.2s;
  }

  .section-toggle:hover {
    opacity: 0.8;
  }

  .section-toggle:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: 2px;
    border-radius: 2px;
  }

  .section-heading {
    font-size: 14px;
    font-weight: 600;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
    margin: 0;
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

  .word-lists-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
  }

  .word-lists-table thead {
    background: var(--carbon-gray-10);
  }

  .word-lists-table th {
    padding: var(--carbon-spacing-03) var(--carbon-spacing-04);
    text-align: left;
    font-weight: 600;
    font-size: 12px;
    color: var(--carbon-gray-100);
    border-bottom: 1px solid var(--carbon-gray-20);
  }

  .word-lists-table td {
    padding: var(--carbon-spacing-03) var(--carbon-spacing-04);
    border-bottom: 1px solid var(--carbon-gray-20);
    color: var(--carbon-gray-100);
  }

  .word-lists-table tbody tr:hover {
    background: var(--carbon-gray-10);
  }

  .word-lists-table input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--carbon-blue-60);
  }

  .word-lists-table label {
    cursor: pointer;
    font-size: 14px;
    color: var(--carbon-gray-100);
  }

  .loading-text {
    color: var(--carbon-gray-70);
    font-style: italic;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--carbon-spacing-02);
    cursor: pointer;
    font-weight: 400;
    font-size: 14px;
    color: var(--carbon-gray-100);
    margin-bottom: var(--carbon-spacing-03);
  }

  .checkbox-label:last-child {
    margin-bottom: 0;
  }

  .checkbox-label input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--carbon-blue-60);
  }
</style>

