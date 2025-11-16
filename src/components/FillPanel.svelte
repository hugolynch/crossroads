<script lang="ts">
  import { onMount } from 'svelte';
  import { grid, selectedRow, selectedCol, selectedDirection, words } from '../lib/store';
  import { getWordCells } from '../lib/gridUtils';
  import type { Word } from '../lib/types';

  let wordList: string[] = [];
  let suggestions: string[] = [];

  onMount(async () => {
    try {
      const response = await fetch('/Crossword Nexus Word List.txt');
      const text = await response.text();
      // Parse the file: skip header lines (starting with #) and empty lines
      wordList = text
        .split('\n')
        .map(line => line.trim().toUpperCase())
        .filter(line => line.length > 0 && !line.startsWith('#'));
    } catch (error) {
      console.error('Failed to load word list:', error);
    }
  });

  // Match a word against a pattern (e.g., "H_LLO" matches "HELLO")
  function matchesPattern(word: string, pattern: string): boolean {
    if (word.length !== pattern.length) return false;
    
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] !== '_' && pattern[i] !== word[i]) {
        return false;
      }
    }
    return true;
  }

  // Reactive: get current word based on selection
  $: currentWord = $words.find(w => {
    if (w.direction !== $selectedDirection) return false;
    if ($selectedDirection === 'across') {
      return w.startRow === $selectedRow && $selectedCol >= w.startCol && $selectedCol < w.startCol + w.length;
    } else {
      return w.startCol === $selectedCol && $selectedRow >= w.startRow && $selectedRow < w.startRow + w.length;
    }
  });

  // Reactive: get pattern for current word (letters filled, _ for empty)
  $: pattern = currentWord ? (() => {
    const cells = getWordCells($grid, currentWord);
    return cells.map(cell => {
      if (cell.type === 'letter' && cell.letter) {
        return cell.letter.toUpperCase();
      }
      return '_';
    }).join('');
  })() : '';

  // Reactive: update suggestions when selection or grid changes
  $: {
    if (currentWord && wordList.length > 0 && pattern) {
      suggestions = wordList
        .filter(word => matchesPattern(word, pattern))
        .slice(0, 50); // Limit to 50 suggestions
    } else {
      suggestions = [];
    }
  }
</script>

<div class="fill-panel">
  {#if currentWord}
    <div class="word-info">
      <div class="word-pattern">
        <span class="label">Pattern:</span>
        <span class="pattern-text">{pattern}</span>
      </div>
      <div class="word-length">
        <span class="label">Length:</span>
        <span class="length-value">{currentWord.length}</span>
      </div>
    </div>
    
    <div class="suggestions-list">
      {#if suggestions.length > 0}
        {#each suggestions as suggestion}
          <button
            class="suggestion-item"
            on:click={() => {
              // Fill the word into the grid
              const newGrid = $grid.map(row => row.map(cell => ({ ...cell })));
              
              for (let i = 0; i < suggestion.length && i < currentWord.length; i++) {
                const letter = suggestion[i];
                let row: number, col: number;
                
                if (currentWord.direction === 'across') {
                  row = currentWord.startRow;
                  col = currentWord.startCol + i;
                } else {
                  row = currentWord.startRow + i;
                  col = currentWord.startCol;
                }
                
                if (row >= 0 && row < newGrid.length && col >= 0 && col < newGrid[row].length) {
                  const existingCell = newGrid[row][col];
                  newGrid[row][col] = {
                    type: 'letter',
                    letter: letter,
                    number: existingCell.number
                  };
                }
              }
              
              grid.set(newGrid);
            }}
          >
            {suggestion}
          </button>
        {/each}
      {:else if pattern.includes('_')}
        <p class="no-suggestions">No matching words found</p>
      {:else}
        <p class="no-suggestions">Word is already complete</p>
      {/if}
    </div>
  {:else}
    <p class="no-word-selected">Select a word in the grid to see suggestions</p>
  {/if}
</div>

<style>
  .fill-panel {
    padding: var(--carbon-spacing-05);
    display: flex;
    flex-direction: column;
    gap: var(--carbon-spacing-05);
    background: var(--carbon-white);
    height: 100%;
  }

  .word-info {
    display: flex;
    flex-direction: column;
    gap: var(--carbon-spacing-03);
    padding-bottom: var(--carbon-spacing-04);
    border-bottom: 1px solid var(--carbon-gray-20);
  }

  .word-pattern,
  .word-length {
    display: flex;
    align-items: center;
    gap: var(--carbon-spacing-02);
  }

  .label {
    font-weight: 600;
    font-size: 12px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
  }

  .pattern-text {
    font-family: 'IBM Plex Mono', 'Courier New', monospace;
    font-size: 14px;
    color: var(--carbon-gray-100);
    letter-spacing: 2px;
  }

  .length-value {
    font-size: 14px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
  }

  .suggestions-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--carbon-spacing-02);
  }

  .suggestion-item {
    width: 100%;
    padding: var(--carbon-spacing-03) var(--carbon-spacing-04);
    text-align: left;
    background: var(--carbon-white);
    border: 1px solid var(--carbon-gray-20);
    border-radius: 0;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    color: var(--carbon-gray-100);
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }

  .suggestion-item:hover {
    background: var(--carbon-gray-10);
    border-color: var(--carbon-gray-30);
  }

  .suggestion-item:active {
    background: var(--carbon-gray-20);
  }

  .suggestion-item:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .no-suggestions,
  .no-word-selected {
    color: var(--carbon-gray-70);
    font-style: italic;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    text-align: center;
    padding: var(--carbon-spacing-05);
  }
</style>

