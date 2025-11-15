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
    padding: 20px;
    display: flex;
    flex-direction: column;
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid #8C8E98;
    margin-bottom: 15px;
  }

  .tab {
    flex: 1;
    padding: 10px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-bottom: 2px solid transparent;
  }

  .tab.active {
    border-bottom-color: #6D6E78;
    font-weight: bold;
  }

  .clues-content {
    flex: 1;
    overflow-y: auto;
  }

  .clues-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .clue-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .clue-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .clue-number {
    font-weight: bold;
  }

  .word-display {
    font-family: monospace;
    font-size: 14px;
    color: #6D6E78;
  }

  .clue-input {
    width: 100%;
    padding: 5px;
    font-size: 14px;
  }

  .no-clues {
    color: #8C8E98;
    font-style: italic;
  }
</style>

