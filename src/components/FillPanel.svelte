<script lang="ts">
  import { grid, selectedRow, selectedCol, selectedDirection, words } from '../lib/store';
  import { getWordCells } from '../lib/gridUtils';
  import type { Word } from '../lib/types';
  import { wordLists } from '../lib/wordLists';
  import type { WordWithRating } from '../lib/wordLists';

  interface Suggestion {
    word: string;
    rating: number | null;
  }

  let suggestions: Suggestion[] = [];
  let allFilteredSuggestions: Suggestion[] = [];
  let currentPage: number = 1;
  const itemsPerPage: number = 50;
  let minRating: number | null = null;
  let maxRating: number | null = null;
  let sortBy: 'rating' | 'alphabetical' = 'rating';
  
  // Cache for unique words indexed by length for faster filtering
  let uniqueWordsByLength: Map<number, Suggestion[]> = new Map();
  let uniqueWordsCache: Suggestion[] = [];
  let lastWordListsHash: string = '';

  // Get combined word list from all enabled lists (reactive)
  $: combinedWordList = $wordLists
    .filter(list => list.enabled)
    .flatMap(list => list.words);
  
  // Create a hash of enabled lists to detect when we need to rebuild cache
  $: wordListsHash = $wordLists
    .filter(list => list.enabled)
    .map(list => `${list.id}:${list.words.length}`)
    .join('|');
  
  // Get unique words with their highest rating (only recalculate when word lists change)
  $: {
    if (wordListsHash !== lastWordListsHash) {
      const wordMap = new Map<string, number | null>();
      for (const item of combinedWordList) {
        const existing = wordMap.get(item.word);
        if (existing === undefined || existing === null) {
          wordMap.set(item.word, item.rating);
        } else if (item.rating !== null && (existing === null || item.rating > existing)) {
          wordMap.set(item.word, item.rating);
        }
      }
      uniqueWordsCache = Array.from(wordMap.entries()).map(([word, rating]) => ({ word, rating }));
      
      // Index by length for faster filtering
      uniqueWordsByLength.clear();
      for (const item of uniqueWordsCache) {
        const len = item.word.length;
        if (!uniqueWordsByLength.has(len)) {
          uniqueWordsByLength.set(len, []);
        }
        uniqueWordsByLength.get(len)!.push(item);
      }
      
      lastWordListsHash = wordListsHash;
    }
  }

  // Match a word against a pattern (e.g., "H_LLO" matches "HELLO")
  // Optimized: early return on first mismatch
  function matchesPattern(word: string, pattern: string): boolean {
    if (word.length !== pattern.length) return false;
    
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] !== '_' && pattern[i] !== word[i]) {
        return false;
      }
    }
    return true;
  }
  
  // Debounce helper for filter inputs
  let debounceTimer: number | null = null;
  function debounceFilter(callback: () => void, delay: number = 150) {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(callback, delay);
  }

  // Check if rating matches filter
  function matchesRating(rating: number | null): boolean {
    if (minRating !== null && (rating === null || rating < minRating)) return false;
    if (maxRating !== null && (rating === null || rating > maxRating)) return false;
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

  // Reactive: update suggestions when selection, grid, filters, or sort changes
  // Optimized: only filter words of matching length, use cached data
  $: {
    if (currentWord && pattern && uniqueWordsCache.length > 0) {
      const wordLength = pattern.length;
      // Get words of matching length from cache (much faster than filtering all words)
      const candidates = uniqueWordsByLength.get(wordLength) || [];
      
      // Filter by pattern and rating
      const filtered = candidates
        .filter(item => matchesPattern(item.word, pattern) && matchesRating(item.rating))
        .sort((a, b) => {
          if (sortBy === 'rating') {
            // Sort by rating (higher first), then alphabetically
            if (a.rating !== null && b.rating !== null) {
              if (b.rating !== a.rating) return b.rating - a.rating;
            } else if (a.rating !== null) return -1;
            else if (b.rating !== null) return 1;
            return a.word.localeCompare(b.word);
          } else {
            // Sort alphabetically
            return a.word.localeCompare(b.word);
          }
        });
      
      // Store all filtered suggestions
      allFilteredSuggestions = filtered;
      // Reset to first page when pattern, filters, or sort changes
      currentPage = 1;
    } else {
      allFilteredSuggestions = [];
      currentPage = 1;
    }
  }

  // Reactive: paginate suggestions based on current page
  $: {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    suggestions = allFilteredSuggestions.slice(startIndex, endIndex);
  }

  $: totalPages = Math.ceil(allFilteredSuggestions.length / itemsPerPage);
  $: startItem = allFilteredSuggestions.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  $: endItem = Math.min(currentPage * itemsPerPage, allFilteredSuggestions.length);

  function goToNextPage() {
    if (currentPage < totalPages) {
      currentPage++;
    }
  }

  function goToPreviousPage() {
    if (currentPage > 1) {
      currentPage--;
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

    <div class="rating-filters">
      <div class="filter-group">
        <label for="min-rating">Min Rating:</label>
        <input
          id="min-rating"
          type="number"
          min="0"
          max="100"
          placeholder="Any"
          value={minRating ?? ''}
          on:input={(e) => {
            const value = e.currentTarget.value;
            const numValue = value === '' ? null : parseInt(value, 10);
            minRating = numValue; // Update immediately for UI responsiveness
            debounceFilter(() => {
              // Trigger reactivity after debounce
              minRating = numValue;
            });
          }}
        />
      </div>
      <div class="filter-group">
        <label for="max-rating">Max Rating:</label>
        <input
          id="max-rating"
          type="number"
          min="0"
          max="100"
          placeholder="Any"
          value={maxRating ?? ''}
          on:input={(e) => {
            const value = e.currentTarget.value;
            const numValue = value === '' ? null : parseInt(value, 10);
            maxRating = numValue; // Update immediately for UI responsiveness
            debounceFilter(() => {
              // Trigger reactivity after debounce
              maxRating = numValue;
            });
          }}
        />
      </div>
      <div class="filter-group">
        <label for="sort-by">Sort By:</label>
        <select
          id="sort-by"
          value={sortBy}
          on:change={(e) => {
            sortBy = e.currentTarget.value as 'rating' | 'alphabetical';
          }}
        >
          <option value="rating">Rating</option>
          <option value="alphabetical">Alphabetical</option>
        </select>
      </div>
    </div>
    
    <div class="suggestions-list">
      {#if allFilteredSuggestions.length > 0}
        <table class="suggestions-table">
          <thead>
            <tr>
              <th>Word</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
            {#each suggestions as suggestion}
              <tr
                class="suggestion-row"
                role="button"
                tabindex="0"
                on:click={() => {
                  // Fill the word into the grid
                  const newGrid = $grid.map(row => row.map(cell => ({ ...cell })));
                  
                  for (let i = 0; i < suggestion.word.length && i < currentWord.length; i++) {
                    const letter = suggestion.word[i];
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
                on:keydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.currentTarget.click();
                  }
                }}
              >
                <td class="word-cell">{suggestion.word}</td>
                <td class="rating-cell">{suggestion.rating ?? '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        {#if totalPages > 1}
          <div class="pagination-controls">
            <button
              class="pagination-button"
              disabled={currentPage === 1}
              on:click={goToPreviousPage}
              aria-label="Previous page"
            >
              Previous
            </button>
            <span class="pagination-info">
              Showing {startItem}-{endItem} of {allFilteredSuggestions.length}
            </span>
            <button
              class="pagination-button"
              disabled={currentPage === totalPages}
              on:click={goToNextPage}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        {/if}
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
    overflow-y: auto;
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

  .rating-filters {
    display: flex;
    gap: var(--carbon-spacing-04);
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: var(--carbon-spacing-02);
    flex: 1;
  }

  .filter-group label {
    font-weight: 600;
    font-size: 12px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
  }

  .filter-group input,
  .filter-group select {
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

  .filter-group select {
    padding-right: calc(var(--carbon-spacing-03) + 20px);
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='%23525252' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M4 6l4 4 4-4'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right var(--carbon-spacing-03) center;
  }

  .filter-group input:focus,
  .filter-group select:focus {
    border-bottom-color: var(--carbon-blue-60);
    outline: none;
  }

  .filter-group input:focus-visible,
  .filter-group select:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .filter-group select:focus {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='%230F62FE' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M4 6l4 4 4-4'/%3E%3C/svg%3E");
  }

  .suggestions-list {
    flex: 1;
    overflow-y: auto;
  }

  .suggestions-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
  }

  .suggestions-table thead {
    background: var(--carbon-gray-10);
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .suggestions-table th {
    padding: var(--carbon-spacing-03) var(--carbon-spacing-04);
    text-align: left;
    font-weight: 600;
    font-size: 12px;
    color: var(--carbon-gray-100);
    border-bottom: 1px solid var(--carbon-gray-20);
  }

  .suggestions-table td {
    padding: var(--carbon-spacing-01) var(--carbon-spacing-01);
    border-bottom: 1px solid var(--carbon-gray-20);
    color: var(--carbon-gray-100);
  }

  .suggestion-row {
    cursor: pointer;
    transition: background 0.2s;
  }

  .suggestion-row:hover {
    background: var(--carbon-gray-10);
  }

  .suggestion-row:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .word-cell {
    font-weight: 500;
  }

  .rating-cell {
    text-align: right;
    color: var(--carbon-gray-70);
    font-family: 'IBM Plex Mono', 'Courier New', monospace;
  }

  .no-suggestions,
  .no-word-selected {
    color: var(--carbon-gray-70);
    font-style: italic;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    text-align: center;
    padding: var(--carbon-spacing-05);
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--carbon-spacing-04);
  }

  .pagination-button {
    padding: var(--carbon-spacing-02) var(--carbon-spacing-04);
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

  .pagination-button:hover:not(:disabled) {
    background: var(--carbon-gray-10);
    border-color: var(--carbon-gray-30);
  }

  .pagination-button:active:not(:disabled) {
    background: var(--carbon-gray-20);
  }

  .pagination-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pagination-button:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .pagination-info {
    font-size: 14px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-70);
  }
</style>

