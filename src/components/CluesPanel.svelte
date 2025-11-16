<script lang="ts">
  import { words, clues, grid } from '../lib/store';
  import { getWordCells } from '../lib/gridUtils';

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
    }).join('');
  }
</script>

<div class="clues-panel">
  <div class="clues-content">
    {#if acrossWords.length > 0 || downWords.length > 0}
      {#if acrossWords.length > 0}
        <div class="clues-section">
          <h3 class="section-heading">Across</h3>
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
          </div>
        </div>
      {/if}
      
      {#if downWords.length > 0}
        <div class="clues-section">
          <h3 class="section-heading">Down</h3>
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
          </div>
        </div>
      {/if}
    {:else}
      <p class="no-clues">No words detected</p>
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

  .clues-content {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--carbon-spacing-06);
  }

  .clues-section {
    display: flex;
    flex-direction: column;
    gap: var(--carbon-spacing-04);
  }

  .section-heading {
    font-size: 14px;
    font-weight: 600;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
    margin: 0;
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

