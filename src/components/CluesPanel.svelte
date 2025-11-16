<script lang="ts">
  import { words, clues, grid, showOneLetterClues, selectedRow, selectedCol, selectedDirection } from '../lib/store';
  import { getWordCells } from '../lib/gridUtils';

  let clearKey = 0;

  // Filter words based on showOneLetterClues setting
  $: filteredWords = $showOneLetterClues 
    ? $words 
    : $words.filter(w => w.length > 1);

  // Sort words by their grid number, but for down words also ensure proper position ordering
  $: acrossWords = filteredWords.filter(w => w.direction === 'across').sort((a, b) => {
    if (a.number !== b.number) return a.number - b.number;
    // If same number, sort by position (row, then col)
    if (a.startRow !== b.startRow) return a.startRow - b.startRow;
    return a.startCol - b.startCol;
  });
  $: downWords = filteredWords.filter(w => w.direction === 'down').sort((a, b) => {
    if (a.number !== b.number) return a.number - b.number;
    // For down words, sort by start position: row first, then column
    if (a.startRow !== b.startRow) return a.startRow - b.startRow;
    return a.startCol - b.startCol;
  });
  
  // Combine all words for tabbing order: all across words first, then all down words
  $: allClueWords = [...acrossWords, ...downWords];

  function handleClearClues() {
    if (!confirm('Are you sure you want to clear all clues?')) {
      return;
    }
    // Clear all clues - this will automatically update all input fields
    clues.set(new Map());
    // Force re-render of inputs by changing the key
    clearKey++;
  }

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

  function handleClueClick(word: import('../lib/types').Word) {
    // Select the word in the grid by setting the selection to its start position
    selectedRow.set(word.startRow);
    selectedCol.set(word.startCol);
    selectedDirection.set(word.direction);
  }

  function handleClueInputKeyDown(event: KeyboardEvent, currentWord: import('../lib/types').Word, allWords: import('../lib/types').Word[]) {
    if (event.key === 'Tab') {
      event.preventDefault();
      
      // Find current word index
      const currentIndex = allWords.findIndex(w => w.id === currentWord.id);
      
      if (event.shiftKey) {
        // Shift+Tab: go to previous clue
        if (currentIndex > 0) {
          const prevWord = allWords[currentIndex - 1];
          // Focus the previous input
          setTimeout(() => {
            const prevInput = document.querySelector(`input[data-word-id="${prevWord.id}"]`) as HTMLInputElement;
            if (prevInput) {
              prevInput.focus();
            }
          }, 0);
        } else {
          // Loop to last clue
          const lastWord = allWords[allWords.length - 1];
          setTimeout(() => {
            const lastInput = document.querySelector(`input[data-word-id="${lastWord.id}"]`) as HTMLInputElement;
            if (lastInput) {
              lastInput.focus();
            }
          }, 0);
        }
      } else {
        // Tab: go to next clue
        if (currentIndex < allWords.length - 1) {
          const nextWord = allWords[currentIndex + 1];
          // Focus the next input
          setTimeout(() => {
            const nextInput = document.querySelector(`input[data-word-id="${nextWord.id}"]`) as HTMLInputElement;
            if (nextInput) {
              nextInput.focus();
            }
          }, 0);
        } else {
          // Loop to first clue
          const firstWord = allWords[0];
          setTimeout(() => {
            const firstInput = document.querySelector(`input[data-word-id="${firstWord.id}"]`) as HTMLInputElement;
            if (firstInput) {
              firstInput.focus();
            }
          }, 0);
        }
      }
    }
  }
</script>

<div class="clues-panel">
  <div class="clues-header">
    <button class="clear-clues-button" on:click={handleClearClues}>
      Clear Clues
    </button>
  </div>
  <div class="clues-content">
    {#if acrossWords.length > 0 || downWords.length > 0}
      {#if acrossWords.length > 0}
        <div class="clues-section">
          <h3 class="section-heading">Across</h3>
          <div class="clues-list">
            {#each acrossWords as word (`across-${word.id}-${clearKey}`)}
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
                  data-word-id={word.id}
                  on:input={(e) => updateClue(word.id, e.currentTarget.value)}
                  on:focus={() => handleClueClick(word)}
                  on:keydown={(e) => handleClueInputKeyDown(e, word, allClueWords)}
                  on:click={(e) => e.stopPropagation()}
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
            {#each downWords as word (`down-${word.id}-${clearKey}`)}
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
                  data-word-id={word.id}
                  on:input={(e) => updateClue(word.id, e.currentTarget.value)}
                  on:focus={() => handleClueClick(word)}
                  on:keydown={(e) => handleClueInputKeyDown(e, word, allClueWords)}
                  on:click={(e) => e.stopPropagation()}
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

  .clues-header {
    margin-bottom: var(--carbon-spacing-05);
  }

  .clear-clues-button {
    width: 100%;
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

  .clear-clues-button:hover {
    background: var(--carbon-gray-10);
    border-color: var(--carbon-gray-30);
  }

  .clear-clues-button:active {
    background: var(--carbon-gray-20);
  }

  .clear-clues-button:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
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

