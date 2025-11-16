<script lang="ts">
  import { words, clues, grid } from '../lib/store';
  import { getWordCells } from '../lib/gridUtils';

  let activeTab: 'across' | 'down' = 'across';

  // Sort words by their grid number, but for down words also ensure proper position ordering
  $: acrossWords = $words.filter(w => w.direction === 'across').sort((a, b) => {
    if (a.number !== b.number) return a.number - b.number;
    // If same number, sort by position (row, then col)
    if (a.startRow !== b.startRow) return a.startRow - b.startRow;
    return a.startCol - b.startCol;
  });
  $: downWords = $words.filter(w => w.direction === 'down').sort((a, b) => {
    if (a.number !== b.number) return a.number - b.number;
    // For down words, sort by start position: row first, then column
    if (a.startRow !== b.startRow) return a.startRow - b.startRow;
    return a.startCol - b.startCol;
  });

  function updateClue(wordId: string, text: string) {
    clues.update(c => {
      const newClues = new Map(c);
      if (text.trim()) {
        newClues.set(wordId, text);
      } else {
        newClues.delete(wordId);
      }
      return newClues;
    });
  }

  function getClueText(wordId: string): string {
    return $clues.get(wordId) || '';
  }

  function getWordDisplay(word: import('../lib/types').Word): string {
    const cells = getWordCells($grid, word);
    return cells.map(cell => {
      if (cell.type === 'letter' && cell.letter) {
        return cell.letter;
      }
      return '_';
    }).join(' ');
  }
</script>

<div class="clues-panel">
  <div class="tabs">
    <button
      class="tab"
      class:active={activeTab === 'across'}
      on:click={() => activeTab = 'across'}
    >
      Across
    </button>
    <button
      class="tab"
      class:active={activeTab === 'down'}
      on:click={() => activeTab = 'down'}
    >
      Down
    </button>
  </div>

  <div class="clues-content">
    {#if activeTab === 'across'}
      <div class="clues-list">
        {#each acrossWords as word (word.id)}
          <div class="clue-item">
            <div class="clue-header">
              <span class="clue-number">{word.number}.</span>
              <span class="word-display">{getWordDisplay(word)}</span>
            </div>
            <input
              type="text"
              class="clue-input"
              placeholder="Enter clue..."
              value={getClueText(word.id)}
              on:input={(e) => updateClue(word.id, e.currentTarget.value)}
            />
          </div>
        {/each}
        {#if acrossWords.length === 0}
          <p class="no-clues">No across words detected</p>
        {/if}
      </div>
    {:else}
      <div class="clues-list">
        {#each downWords as word (word.id)}
          <div class="clue-item">
            <div class="clue-header">
              <span class="clue-number">{word.number}.</span>
              <span class="word-display">{getWordDisplay(word)}</span>
            </div>
            <input
              type="text"
              class="clue-input"
              placeholder="Enter clue..."
              value={getClueText(word.id)}
              on:input={(e) => updateClue(word.id, e.currentTarget.value)}
            />
          </div>
        {/each}
        {#if downWords.length === 0}
          <p class="no-clues">No down words detected</p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .clues-panel {
    padding: var(--carbon-spacing-05);
    display: flex;
    flex-direction: column;
    background: var(--carbon-white);
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid var(--carbon-gray-20);
    margin-bottom: var(--carbon-spacing-05);
  }

  .tab {
    flex: 1;
    padding: var(--carbon-spacing-04);
    border: none;
    background: transparent;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    font-weight: 400;
    color: var(--carbon-gray-70);
    transition: color 0.2s, border-color 0.2s, background 0.2s;
  }

  .tab:hover {
    background: var(--carbon-gray-10);
    color: var(--carbon-gray-100);
  }

  .tab:active {
    background: var(--carbon-gray-20);
  }

  .tab:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .tab.active {
    border-bottom-color: var(--carbon-blue-60);
    color: var(--carbon-gray-100);
    font-weight: 600;
  }

  .clues-content {
    flex: 1;
    overflow-y: auto;
  }

  .clues-list {
    display: flex;
    flex-direction: column;
    gap: var(--carbon-spacing-05);
  }

  .clue-item {
    display: flex;
    flex-direction: column;
    gap: var(--carbon-spacing-02);
  }

  .clue-header {
    display: flex;
    align-items: center;
    gap: var(--carbon-spacing-02);
  }

  .clue-number {
    font-weight: 600;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
    font-size: 14px;
  }

  .word-display {
    font-family: 'IBM Plex Mono', 'Courier New', monospace;
    font-size: 14px;
    color: var(--carbon-gray-70);
  }

  .clue-input {
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

  .clue-input:focus {
    border-bottom-color: var(--carbon-blue-60);
    outline: none;
  }

  .clue-input:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .clue-input::placeholder {
    color: var(--carbon-gray-70);
  }

  .no-clues {
    color: var(--carbon-gray-70);
    font-style: italic;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
  }
</style>

