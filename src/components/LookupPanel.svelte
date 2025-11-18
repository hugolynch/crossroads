<script lang="ts">
  import { grid, selectedRow, selectedCol, selectedDirection, words } from '../lib/store';
  import { getWordCells } from '../lib/gridUtils';
  import type { Word } from '../lib/types';

  // Mock data for UI demonstration
  let searchQuery = '';
  let outletFilter = '';
  let keywordFilter = '';
  let expandedClueId: string | null = null;

  // Get current word based on selection
  $: currentWord = $words.find(w => {
    if (w.direction !== $selectedDirection) return false;
    if ($selectedDirection === 'across') {
      return w.startRow === $selectedRow && $selectedCol >= w.startCol && $selectedCol < w.startCol + w.length;
    } else {
      return w.startCol === $selectedCol && $selectedRow >= w.startRow && $selectedRow < w.startRow + w.length;
    }
  });

  // Extract word text from grid
  $: selectedWordText = currentWord ? (() => {
    const cells = getWordCells($grid, currentWord);
    const wordText = cells.map(cell => {
      if (cell.type === 'letter' && cell.letter) {
        return cell.letter.toUpperCase();
      }
      return '';
    }).join('');
    // Only return if word is complete (no empty cells)
    return wordText.length === currentWord.length ? wordText : '';
  })() : '';

  // Track previous selected word to only update when it changes
  let previousSelectedWordId: string | null = null;

  // Auto-populate search query when a word is selected
  $: {
    const currentWordId = currentWord?.id || null;
    // Only update search query if:
    // 1. A word is selected
    // 2. The word has changed (different word ID)
    // 3. The word text is complete (no empty cells)
    if (currentWordId && currentWordId !== previousSelectedWordId && selectedWordText && selectedWordText.length > 0) {
      searchQuery = selectedWordText;
      previousSelectedWordId = currentWordId;
    } else if (!currentWordId) {
      previousSelectedWordId = null;
    }
  }

  // Mock word data - will be replaced with real data later
  // For now, use selected word or default
  $: mockWordData = {
    word: selectedWordText || 'HELLO',
    length: selectedWordText ? selectedWordText.length : 5,
    totalOccurrences: 247,
    lastAppearance: {
      date: '2024-01-15',
      outlet: 'New York Times'
    }
  };

  // Mock outlets list
  const mockOutlets = [
    'All Outlets',
    'New York Times',
    'Washington Post',
    'LA Times',
    'Wall Street Journal',
    'USA Today'
  ];

  // Mock clues data
  const mockClues = [
    {
      id: '1',
      clue: 'Greeting',
      appearances: 45,
      dates: [
        { date: '2024-01-15', outlet: 'New York Times' },
        { date: '2023-12-20', outlet: 'Washington Post' },
        { date: '2023-11-10', outlet: 'LA Times' },
        { date: '2023-10-05', outlet: 'Wall Street Journal' }
      ]
    },
    {
      id: '2',
      clue: 'Friendly salutation',
      appearances: 32,
      dates: [
        { date: '2024-01-10', outlet: 'New York Times' },
        { date: '2023-12-15', outlet: 'USA Today' }
      ]
    },
    {
      id: '3',
      clue: 'Word said when answering the phone',
      appearances: 28,
      dates: [
        { date: '2023-11-25', outlet: 'Washington Post' },
        { date: '2023-10-18', outlet: 'LA Times' }
      ]
    },
    {
      id: '4',
      clue: 'Casual greeting',
      appearances: 19,
      dates: [
        { date: '2023-09-12', outlet: 'New York Times' }
      ]
    }
  ];

  function toggleClueExpansion(clueId: string) {
    if (expandedClueId === clueId) {
      expandedClueId = null;
    } else {
      expandedClueId = clueId;
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
</script>

<div class="lookup-panel">
  <h2>Lookup <span class="coming-soon-badge">Coming Soon</span></h2>

  <!-- Primary Search Box -->
  <div class="search-section">
    <input
      type="text"
      class="search-input"
      placeholder="Enter word to lookup..."
      bind:value={searchQuery}
    />
  </div>

  <!-- Word Information -->
  {#if searchQuery}
    <div class="word-info-section">
      <div class="word-header">
        <span class="word-text">{mockWordData.word}</span>
      </div>
      <div class="word-stats">
        <div class="stat-item">
          <span class="stat-label">Total Occurrences:</span>
          <span class="stat-value">{mockWordData.totalOccurrences}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Last Appearance:</span>
          <span class="stat-value">
            {formatDate(mockWordData.lastAppearance.date)} • {mockWordData.lastAppearance.outlet}
          </span>
        </div>
      </div>
    </div>

    <!-- Filtering Options -->
    <div class="filters-section">
      <div class="filter-group">
        <label for="outlet-filter">Filter by Outlet:</label>
        <select id="outlet-filter" bind:value={outletFilter}>
          {#each mockOutlets as outlet}
            <option value={outlet === 'All Outlets' ? '' : outlet}>{outlet}</option>
          {/each}
        </select>
      </div>
      <div class="filter-group">
        <label for="keyword-filter">Filter by Keyword in Clue:</label>
        <input
          type="text"
          id="keyword-filter"
          class="keyword-input"
          placeholder="Enter keyword..."
          bind:value={keywordFilter}
        />
      </div>
    </div>

    <!-- Clues Table -->
    <div class="clues-section">
      <h3>Clues</h3>
      <div class="clues-table-container">
        <table class="clues-table">
          <thead>
            <tr>
              <th>Clue</th>
              <th>Appearances</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each mockClues as clue}
              <tr class="clue-row">
                <td class="clue-text">{clue.clue}</td>
                <td class="clue-appearances">{clue.appearances}</td>
                <td class="clue-expand-cell">
                  <button
                    class="expand-button"
                    class:expanded={expandedClueId === clue.id}
                    on:click={() => toggleClueExpansion(clue.id)}
                    aria-label={expandedClueId === clue.id ? 'Collapse' : 'Expand'}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 6L8 9L11 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </td>
              </tr>
              {#if expandedClueId === clue.id}
                <tr class="clue-details-row">
                  <td colspan="3" class="clue-details-cell">
                    <div class="clue-dates-list">
                      {#each clue.dates as dateInfo}
                        <div class="date-item">
                          <span class="date-text">{formatDate(dateInfo.date)}</span>
                          <span class="outlet-text">{dateInfo.outlet}</span>
                        </div>
                      {/each}
                    </div>
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {:else}
    <p class="placeholder-text">Enter a word in the search box above to see its clue history.</p>
  {/if}
</div>

<style>
  .lookup-panel {
    padding: var(--carbon-spacing-05);
    display: flex;
    flex-direction: column;
    background: var(--carbon-white);
    height: 100%;
  }

  .lookup-panel h2 {
    margin-top: 0;
    margin-bottom: var(--carbon-spacing-05);
    font-size: 16px;
    font-weight: 600;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
    display: flex;
    align-items: center;
    gap: var(--carbon-spacing-03);
  }

  .coming-soon-badge {
    font-size: 11px;
    font-weight: 400;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-70);
    background: var(--carbon-gray-10);
    padding: var(--carbon-spacing-01) var(--carbon-spacing-02);
    border-radius: 2px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .lookup-panel h3 {
    font-size: 14px;
    font-weight: 600;
    margin-top: 0;
    margin-bottom: var(--carbon-spacing-04);
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
  }

  .search-section {
    margin-bottom: var(--carbon-spacing-05);
  }

  .search-input {
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

  .search-input:focus {
    border-bottom-color: var(--carbon-blue-60);
  }

  .search-input::placeholder {
    color: var(--carbon-gray-50);
  }

  .word-info-section {
    padding: var(--carbon-spacing-04);
    background: var(--carbon-gray-10);
    border: 1px solid var(--carbon-gray-20);
    margin-bottom: var(--carbon-spacing-05);
  }

  .word-header {
    display: flex;
    align-items: center;
    gap: var(--carbon-spacing-03);
    margin-bottom: var(--carbon-spacing-03);
  }

  .word-text {
    font-size: 24px;
    font-weight: 600;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
    letter-spacing: 1px;
  }

  .word-stats {
    display: flex;
    flex-direction: column;
    gap: var(--carbon-spacing-02);
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
  }

  .stat-label {
    font-weight: 600;
    color: var(--carbon-gray-100);
  }

  .stat-value {
    color: var(--carbon-gray-70);
  }

  .filters-section {
    display: flex;
    gap: var(--carbon-spacing-04);
    margin-bottom: var(--carbon-spacing-05);
    padding-bottom: var(--carbon-spacing-04);
    border-bottom: 1px solid var(--carbon-gray-20);
  }

  .filter-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--carbon-spacing-02);
  }

  .filter-group label {
    font-weight: 600;
    font-size: 12px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
    letter-spacing: 0.16px;
  }

  .filter-group select,
  .keyword-input {
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
    -webkit-appearance: none;
    -moz-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 6L8 9L11 6' stroke='%23525252' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right var(--carbon-spacing-03) center;
    background-size: 16px 16px;
  }

  .filter-group select:focus,
  .keyword-input:focus {
    border-bottom-color: var(--carbon-blue-60);
  }

  .clues-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .clues-table-container {
    flex: 1;
    overflow-y: auto;
  }

  .clues-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
  }

  .clues-table thead {
    background: var(--carbon-gray-10);
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .clues-table th {
    padding: var(--carbon-spacing-03) var(--carbon-spacing-04);
    text-align: left;
    font-weight: 600;
    font-size: 12px;
    color: var(--carbon-gray-100);
    border-bottom: 1px solid var(--carbon-gray-20);
  }

  .clue-row {
    cursor: pointer;
    transition: background 0.15s;
  }

  .clue-row:hover {
    background: var(--carbon-gray-10);
  }

  .clue-text {
    padding: var(--carbon-spacing-03) var(--carbon-spacing-04);
    color: var(--carbon-gray-100);
    border-bottom: 1px solid var(--carbon-gray-20);
  }

  .clue-appearances {
    padding: var(--carbon-spacing-03) var(--carbon-spacing-04);
    text-align: right;
    color: var(--carbon-gray-70);
    font-family: 'IBM Plex Mono', 'Courier New', monospace;
    border-bottom: 1px solid var(--carbon-gray-20);
  }

  .clue-expand-cell {
    padding: var(--carbon-spacing-03) var(--carbon-spacing-04);
    width: 40px;
    border-bottom: 1px solid var(--carbon-gray-20);
  }

  .expand-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--carbon-spacing-01);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--carbon-gray-70);
    transition: color 0.2s, transform 0.2s;
  }

  .expand-button:hover {
    color: var(--carbon-gray-100);
  }

  .expand-button.expanded {
    transform: rotate(180deg);
  }

  .expand-button:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
    border-radius: 2px;
  }

  .clue-details-row {
    background: var(--carbon-gray-10);
  }

  .clue-details-cell {
    padding: var(--carbon-spacing-04);
    border-bottom: 1px solid var(--carbon-gray-20);
  }

  .clue-dates-list {
    display: flex;
    flex-direction: column;
    gap: var(--carbon-spacing-02);
  }

  .date-item {
    display: flex;
    justify-content: space-between;
    padding: var(--carbon-spacing-02) 0;
    font-size: 13px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
  }

  .date-text {
    color: var(--carbon-gray-100);
  }

  .outlet-text {
    color: var(--carbon-gray-70);
    font-weight: 500;
  }

  .placeholder-text {
    color: var(--carbon-gray-70);
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    font-style: italic;
    text-align: center;
    padding: var(--carbon-spacing-05);
  }
</style>
