<script lang="ts">
  import { grid, words, rows, cols, hoveredWordLength } from '../lib/store';

  $: stats = calculateStats($grid, $words, $rows, $cols);

  function calculateStats(
    grid: import('../lib/types').Cell[][],
    words: import('../lib/types').Word[],
    totalRows: number,
    totalCols: number
  ) {
    const totalCells = totalRows * totalCols;
    let blackSquares = 0;
    const wordLengths: number[] = [];

    // Count black squares
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col]?.type === 'black') {
          blackSquares++;
        }
      }
    }

    // Collect word lengths
    for (const word of words) {
      wordLengths.push(word.length);
    }

    // Calculate statistics
    const totalWords = words.length;
    const blackSquarePercent = totalCells > 0 ? (blackSquares / totalCells) * 100 : 0;
    const averageWordLength = wordLengths.length > 0
      ? wordLengths.reduce((sum, len) => sum + len, 0) / wordLengths.length
      : 0;

    // Count words by length
    const wordsByLength = new Map<number, number>();
    for (const length of wordLengths) {
      wordsByLength.set(length, (wordsByLength.get(length) || 0) + 1);
    }

    return {
      totalWords,
      blackSquares,
      blackSquarePercent,
      averageWordLength,
      wordsByLength
    };
  }
</script>

<div class="stats-panel">
  <h2>Puzzle Statistics</h2>
  
  <div class="stat-group">
    <div class="stat-item">
      <span class="stat-label">Grid Size:</span>
      <span class="stat-value">{$rows} × {$cols}</span>
    </div>
    
    <div class="stat-item">
      <span class="stat-label">Total Words:</span>
      <span class="stat-value">{stats.totalWords}</span>
    </div>
    
    <div class="stat-item">
      <span class="stat-label">Black Squares:</span>
      <span class="stat-value">{stats.blackSquares} ({stats.blackSquarePercent.toFixed(1)}%)</span>
    </div>
    
    <div class="stat-item">
      <span class="stat-label">Average Word Length:</span>
      <span class="stat-value">{stats.averageWordLength.toFixed(1)}</span>
    </div>
  </div>

  <div class="stat-group">
    <h3>Words by Length</h3>
    {#if stats.wordsByLength.size === 0}
      <p class="no-data">No words detected</p>
    {:else}
      <div class="length-distribution">
        {#each Array.from(stats.wordsByLength.entries()).sort((a, b) => a[0] - b[0]) as [length, count]}
          <div 
            class="length-item"
            class:hovered={$hoveredWordLength === length}
            on:mouseenter={() => hoveredWordLength.set(length)}
            on:mouseleave={() => hoveredWordLength.set(null)}
          >
            <span class="length-label">{length} letters:</span>
            <span class="length-count">{count}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .stats-panel {
    padding: var(--carbon-spacing-05);
    background: var(--carbon-white);
  }

  .stats-panel h2 {
    margin-top: 0;
    margin-bottom: var(--carbon-spacing-05);
    font-size: 16px;
    font-weight: 600;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
  }

  .stats-panel h3 {
    font-size: 14px;
    font-weight: 600;
    margin-top: 0;
    margin-bottom: var(--carbon-spacing-04);
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
  }

  .stat-group {
    margin-bottom: var(--carbon-spacing-05);
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    padding: var(--carbon-spacing-02) 0;
    border-bottom: 1px solid var(--carbon-gray-20);
  }

  .stat-label {
    font-weight: 600;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
    font-size: 14px;
  }

  .stat-value {
    color: var(--carbon-gray-70);
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
  }

  .length-distribution {
    display: flex;
    flex-direction: column;
    gap: var(--carbon-spacing-02);
  }

  .length-item {
    display: flex;
    justify-content: space-between;
    padding: var(--carbon-spacing-02) 0;
    cursor: pointer;
    border-radius: 2px;
    transition: background 0.15s;
  }

  .length-item:hover,
  .length-item.hovered {
    background: var(--carbon-gray-10);
  }

  .length-label {
    color: var(--carbon-gray-70);
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
  }

  .length-count {
    font-weight: 600;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
    font-size: 14px;
  }

  .no-data {
    color: var(--carbon-gray-70);
    font-style: italic;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    margin: var(--carbon-spacing-03) 0;
    font-size: 14px;
  }
</style>

