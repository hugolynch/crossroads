<script lang="ts">
  import { grid, words, rows, cols } from '../lib/store';

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
          <div class="length-item">
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
    padding: 20px;
  }

  .stats-panel h2 {
    margin-top: 0;
    font-size: 18px;
  }

  .stats-panel h3 {
    font-size: 14px;
    margin-top: 0;
    margin-bottom: 10px;
  }

  .stat-group {
    margin-bottom: 20px;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #E3E5EF;
  }

  .stat-label {
    font-weight: bold;
  }

  .stat-value {
    color: #6D6E78;
  }

  .length-distribution {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .length-item {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
  }

  .length-label {
    color: #6D6E78;
  }

  .length-count {
    font-weight: bold;
  }

  .no-data {
    color: #8C8E98;
    font-style: italic;
    margin: 10px 0;
  }
</style>

