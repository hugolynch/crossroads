<script lang="ts">
  import { grid, selectedRow, selectedCol, selectedDirection, words, previewGrid, rows, cols } from '../lib/store';
  import { getWordCells, detectWords, numberWords } from '../lib/gridUtils';
  import type { Word } from '../lib/types';
  import { wordLists } from '../lib/wordLists';
  import type { WordWithRating } from '../lib/wordLists';
  import { get } from 'svelte/store';
  import type { Cell } from '../lib/types';

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

  // Check if word lists are still loading
  $: hasEnabledLists = $wordLists.length > 0 && $wordLists.some(list => list.enabled);
  $: wordListsLoading = hasEnabledLists && (
    $wordLists.some(list => list.enabled && list.loading) ||
    $wordLists.filter(list => list.enabled).some(list => !list.loading && list.words.length === 0)
  );

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

  // Autofill functionality
  let autofillVariations: Cell[][][] = [];
  let currentVariationIndex = -1;
  let isAutofilling = false;
  let isApplyingAutofill = false;
  let autofillProgress = '';
  let hasMoreThanMaxVariations = false;
  
  // Reactive statement to ensure UI updates when variations change
  $: hasVariations = autofillVariations.length > 0;

  // Helper function to check if a word can fit at a position considering intersecting words
  function canWordFit(
    word: Word,
    candidateWord: string,
    grid: Cell[][],
    allWords: Word[],
    wordOptions: Map<string, Suggestion[]>
  ): boolean {
    const currentRows = get(rows);
    const currentCols = get(cols);
    
    // Check each position in the word
    for (let i = 0; i < candidateWord.length && i < word.length; i++) {
      const letter = candidateWord[i];
      let row: number, col: number;
      
      if (word.direction === 'across') {
        row = word.startRow;
        col = word.startCol + i;
      } else {
        row = word.startRow + i;
        col = word.startCol;
      }
      
      if (row < 0 || row >= currentRows || col < 0 || col >= currentCols) {
        return false;
      }
      
      const cell = grid[row][col];
      
      // If cell already has a letter, it must match
      if (cell.type === 'letter' && cell.letter) {
        if (cell.letter !== letter) {
          return false;
        }
      }
      
      // Check intersecting words - find words that cross at this position
      const intersectingWords = allWords.filter(w => {
        if (w.direction === word.direction) return false; // Same direction doesn't intersect
        if (w.direction === 'across') {
          return w.startRow === row && col >= w.startCol && col < w.startCol + w.length;
        } else {
          return w.startCol === col && row >= w.startRow && row < w.startRow + w.length;
        }
      });
      
      // For each intersecting word, check if there's at least one option that works
      for (const intersectingWord of intersectingWords) {
        const intersectingWordKey = `${intersectingWord.direction}-${intersectingWord.startRow}-${intersectingWord.startCol}`;
        const intersectingOptions = wordOptions.get(intersectingWordKey);
        
        if (!intersectingOptions || intersectingOptions.length === 0) {
          // No options for intersecting word, but we'll let it pass (might be filled later)
          continue;
        }
        
        // Find the position of the intersection in the intersecting word
        let intersectPos: number;
        if (intersectingWord.direction === 'across') {
          intersectPos = col - intersectingWord.startCol;
        } else {
          intersectPos = row - intersectingWord.startRow;
        }
        
        // Check if at least one option for the intersecting word has the correct letter at this position
        const hasCompatibleOption = intersectingOptions.some(option => {
          return option.word.length > intersectPos && option.word[intersectPos] === letter;
        });
        
        if (!hasCompatibleOption) {
          // No intersecting word option has the correct letter at this position
          return false;
        }
      }
    }
    
    return true;
  }

  // Quick conflict check without full grid copy (optimized)
  function hasConflict(
    baseGrid: Cell[][],
    word: Word,
    selectedWord: string,
    currentSelections: Map<string, string>
  ): boolean {
    const currentRows = get(rows);
    const currentCols = get(cols);
    
    // Pre-compute intersecting words for faster lookup
    const intersectingWords: Array<{ key: string; word: string; direction: string; startRow: number; startCol: number }> = [];
    for (const [key, otherWord] of currentSelections.entries()) {
      const [dir, startRowStr, startColStr] = key.split('-');
      intersectingWords.push({
        key,
        word: otherWord,
        direction: dir,
        startRow: parseInt(startRowStr),
        startCol: parseInt(startColStr)
      });
    }
    
    for (let i = 0; i < selectedWord.length && i < word.length; i++) {
      const letter = selectedWord[i];
      let row: number, col: number;
      
      if (word.direction === 'across') {
        row = word.startRow;
        col = word.startCol + i;
      } else {
        row = word.startRow + i;
        col = word.startCol;
      }
      
      if (row >= 0 && row < currentRows && col >= 0 && col < currentCols) {
        const cell = baseGrid[row][col];
        
        // Check against base grid
        if (cell.type === 'letter' && cell.letter && cell.letter !== letter) {
          return true; // Conflict with existing letter
        }
        
        // Check against intersecting words (only check words that could intersect)
        for (const other of intersectingWords) {
          if (other.direction === word.direction) continue; // Same direction doesn't intersect
          
          let isInOtherWord = false;
          let otherPos = -1;
          
          if (other.direction === 'across' && other.startRow === row && col >= other.startCol && col < other.startCol + other.word.length) {
            isInOtherWord = true;
            otherPos = col - other.startCol;
          } else if (other.direction === 'down' && other.startCol === col && row >= other.startRow && row < other.startRow + other.word.length) {
            isInOtherWord = true;
            otherPos = row - other.startRow;
          }
          
          if (isInOtherWord && otherPos >= 0 && otherPos < other.word.length) {
            if (other.word[otherPos] !== letter) {
              return true; // Conflict with another selected word
            }
          }
        }
      }
    }
    
    return false;
  }

  // Helper function to try filling a grid with specific word selections
  function tryFillGrid(
    baseGrid: Cell[][],
    wordsToFill: Word[],
    wordSelections: Map<string, string>
  ): Cell[][] | null {
    const newGrid = baseGrid.map(row => row.map(cell => ({ ...cell })));
    const currentRows = get(rows);
    const currentCols = get(cols);
    
    for (const word of wordsToFill) {
      const wordKey = `${word.direction}-${word.startRow}-${word.startCol}`;
      const selectedWord = wordSelections.get(wordKey);
      
      if (!selectedWord) return null;
      
      // Fill the word into the grid
      for (let i = 0; i < selectedWord.length && i < word.length; i++) {
        const letter = selectedWord[i];
        let row: number, col: number;
        
        if (word.direction === 'across') {
          row = word.startRow;
          col = word.startCol + i;
        } else {
          row = word.startRow + i;
          col = word.startCol;
        }
        
        if (row >= 0 && row < currentRows && col >= 0 && col < currentCols) {
          const existingCell = newGrid[row][col];
          // Only fill empty cells or cells that match
          if (existingCell.type === 'empty') {
            newGrid[row][col] = {
              type: 'letter',
              letter: letter,
              number: existingCell.number
            };
          } else if (existingCell.type === 'letter') {
            if (existingCell.letter !== letter) {
              // Conflict - this combination won't work
              return null;
            }
            // Already filled with correct letter, continue
          }
        }
      }
    }
    
    return newGrid;
  }

  // Backtracking algorithm to fill crossword grid (optimized)
  async function backtrackFill(
    grid: Cell[][],
    wordsToFill: Word[],
    wordOptions: Map<string, Suggestion[]>,
    currentSelections: Map<string, string>,
    variationIndex: number,
    maxVariations: number,
    variations: Cell[][][],
    seenCombinations: Set<string>,
    onProgress?: (selections: number, total: number, found: number) => Promise<void> | void,
    progressCounter: { count: number } = { count: 0 }
  ): Promise<boolean> {
    // If we've filled all words, we have a valid solution
    if (currentSelections.size === wordsToFill.length) {
      // Optimized combination key generation
      const keys = Array.from(currentSelections.keys()).sort();
      const combinationKey = keys.map(key => `${key}:${currentSelections.get(key)}`).join(';');
      
      if (seenCombinations.has(combinationKey)) {
        return false; // Already seen this combination
      }
      seenCombinations.add(combinationKey);
      
      const filledGrid = tryFillGrid(grid, wordsToFill, currentSelections);
      if (filledGrid) {
        variations.push(filledGrid);
        
        // Batch progress updates (every 10 variations or when done)
        progressCounter.count++;
        if (onProgress && (progressCounter.count % 10 === 0 || variations.length >= maxVariations)) {
          await onProgress(currentSelections.size, wordsToFill.length, variations.length);
        }
        
        return variations.length >= maxVariations;
      }
      return false;
    }
    
    // Find the most constrained word (fewest options) - cache result
    let mostConstrainedWord: Word | null = null;
    let fewestOptions = Infinity;
    
    for (const word of wordsToFill) {
      const wordKey = `${word.direction}-${word.startRow}-${word.startCol}`;
      if (currentSelections.has(wordKey)) continue; // Already filled
      
      const options = wordOptions.get(wordKey) || [];
      if (options.length < fewestOptions) {
        fewestOptions = options.length;
        mostConstrainedWord = word;
      }
    }
    
    if (!mostConstrainedWord || fewestOptions === 0) {
      return false; // No valid options
    }
    
    const wordKey = `${mostConstrainedWord.direction}-${mostConstrainedWord.startRow}-${mostConstrainedWord.startCol}`;
    const options = wordOptions.get(wordKey)!;
    
    // Try each option for this word
    for (const option of options) {
      // Quick conflict check before doing expensive grid operations
      if (hasConflict(grid, mostConstrainedWord, option.word, currentSelections)) {
        continue; // Skip this option
      }
      
      // Check if this word can fit with current selections
      const testSelections = new Map(currentSelections);
      testSelections.set(wordKey, option.word);
      
      // Quick validation: check if this word conflicts with already selected words
      const testGrid = tryFillGrid(grid, wordsToFill.filter(w => {
        const key = `${w.direction}-${w.startRow}-${w.startCol}`;
        return testSelections.has(key);
      }), testSelections);
      
      if (testGrid) {
        // Batch progress updates
        progressCounter.count++;
        if (onProgress && progressCounter.count % 50 === 0) {
          await onProgress(testSelections.size, wordsToFill.length, variations.length);
        }
        
        // Recursively try to fill the rest
        const result = await backtrackFill(
          grid,
          wordsToFill,
          wordOptions,
          testSelections,
          variationIndex,
          maxVariations,
          variations,
          seenCombinations,
          onProgress,
          progressCounter
        );
        
        if (result) {
          return true; // Found enough variations
        }
      }
    }
    
    return false;
  }

  // Generate autofill variations using backtracking algorithm
  async function generateAutofill() {
    if (isAutofilling) return;
    isAutofilling = true;
    autofillProgress = 'Analyzing grid...';
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const currentGrid = get(grid);
    const currentWords = get(words);
    const currentRows = get(rows);
    const currentCols = get(cols);
    
    // Get all words that need filling (have at least one empty cell)
    const wordsToFill = currentWords.filter(word => {
      const cells = getWordCells(currentGrid, word);
      return cells.some(cell => cell.type === 'empty' || (cell.type === 'letter' && !cell.letter));
    });

    if (wordsToFill.length === 0) {
      autofillProgress = '';
      isAutofilling = false;
      return;
    }

    autofillProgress = `Finding words for ${wordsToFill.length} entries...`;
    await new Promise(resolve => setTimeout(resolve, 10));

    // Pre-compute all possible word matches for each word slot
    const wordOptions = new Map<string, Suggestion[]>();
    for (const word of wordsToFill) {
      const cells = getWordCells(currentGrid, word);
      const pattern = cells.map(cell => {
        if (cell.type === 'letter' && cell.letter) {
          return cell.letter.toUpperCase();
        }
        return '_';
      }).join('');
      
      const wordLength = pattern.length;
      const candidates = uniqueWordsByLength.get(wordLength) || [];
      const matches = candidates
        .filter(item => matchesPattern(item.word, pattern))
        .sort((a, b) => {
          if (a.rating !== null && b.rating !== null) {
            return b.rating - a.rating;
          }
          if (a.rating !== null) return -1;
          if (b.rating !== null) return 1;
          return 0;
        });
      
      const wordKey = `${word.direction}-${word.startRow}-${word.startCol}`;
      wordOptions.set(wordKey, matches);
      
      if (matches.length === 0) {
        autofillProgress = `No matches found for ${word.direction} word at (${word.startRow}, ${word.startCol})`;
        isAutofilling = false;
        return;
      }
    }

    autofillProgress = 'Generating fills using backtracking...';
    await new Promise(resolve => setTimeout(resolve, 10));

    // Use backtracking to find valid fills
    const variations: Cell[][][] = [];
    const maxVariations = 100;
    const seenCombinations = new Set<string>();
    
    // Progress update tracking
    let lastProgressUpdate = Date.now();
    const progressCounter = { count: 0 };
    
    await backtrackFill(
      currentGrid,
      wordsToFill,
      wordOptions,
      new Map(),
      0,
      maxVariations,
      variations,
      seenCombinations,
      async (selections, total, found) => {
        const now = Date.now();
        if (now - lastProgressUpdate > 200) { // Update every 200ms
          autofillProgress = `Finding fills... (${found} found, ${selections}/${total} words placed)`;
          lastProgressUpdate = now;
          // Allow UI to update
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      },
      progressCounter
    );
    
    console.log('Autofill complete. Variations found:', variations.length);
    
    // Check if we hit the max limit
    hasMoreThanMaxVariations = variations.length >= maxVariations;
    
    // Force reactivity by creating a new array reference
    autofillVariations = [...variations];
    currentVariationIndex = variations.length > 0 ? 0 : -1;
    
    if (variations.length > 0) {
      // Set preview grid - make a deep copy to ensure reactivity
      const firstVariation = variations[0].map(row => row.map(cell => ({ ...cell })));
      console.log('Setting preview grid with', firstVariation.length, 'rows');
      console.log('First cell of preview:', firstVariation[0]?.[0]);
      
      // Set flag to prevent reactive statement from clearing preview
      autofillJustCompleted = true;
      
      // Set the variations array first
      autofillVariations = [...variations];
      currentVariationIndex = 0;
      
      // Then set the preview grid
      previewGrid.set(firstVariation);
      
      if (hasMoreThanMaxVariations) {
        autofillProgress = 'More than 100 variations found';
      } else {
        autofillProgress = `Found ${variations.length} variation${variations.length !== 1 ? 's' : ''}`;
      }
      
      // Update grid snapshot to prevent clearing
      lastGridSnapshot = JSON.stringify(currentGrid);
      
      // Reset flag after a longer delay to allow UI to update
      setTimeout(() => {
        const currentPreview = get(previewGrid);
        console.log('Preview grid after set:', currentPreview ? `${currentPreview.length} rows` : 'null');
        console.log('hasVariations:', hasVariations);
        console.log('isAutofilling:', isAutofilling);
        console.log('autofillVariations.length:', autofillVariations.length);
        
        // Check if preview has any letters
        if (currentPreview) {
          let letterCount = 0;
          for (let row = 0; row < currentPreview.length; row++) {
            for (let col = 0; col < (currentPreview[row]?.length || 0); col++) {
              const cell = currentPreview[row][col];
              if (cell?.type === 'letter' && cell.letter) {
                letterCount++;
              }
            }
          }
          console.log('Preview grid has', letterCount, 'letter cells');
        }
        
        // Keep the flag set longer - only clear if user actually edits
        // Don't automatically clear autofillJustCompleted - let it stay true
        // The reactive statement will only clear if grid actually changes
      }, 500);
    } else {
      autofillProgress = 'No valid combinations found. Try filling some words manually first.';
      previewGrid.set(null);
      autofillVariations = [];
      currentVariationIndex = -1;
      autofillJustCompleted = false;
    }
    
    isAutofilling = false;
  }

  function nextVariation() {
    if (autofillVariations.length === 0) return;
    
    currentVariationIndex = (currentVariationIndex + 1) % autofillVariations.length;
    const variation = autofillVariations[currentVariationIndex].map(row => row.map(cell => ({ ...cell })));
    previewGrid.set(variation);
  }

  function previousVariation() {
    if (autofillVariations.length === 0) return;
    
    currentVariationIndex = (currentVariationIndex - 1 + autofillVariations.length) % autofillVariations.length;
    const variation = autofillVariations[currentVariationIndex].map(row => row.map(cell => ({ ...cell })));
    previewGrid.set(variation);
  }

  function applyAutofill() {
    if (currentVariationIndex >= 0 && currentVariationIndex < autofillVariations.length) {
      isApplyingAutofill = true;
      grid.set(autofillVariations[currentVariationIndex]);
      previewGrid.set(null);
      autofillVariations = [];
      currentVariationIndex = -1;
      // Reset flag after a brief delay to allow grid update to complete
      setTimeout(() => {
        isApplyingAutofill = false;
      }, 100);
    }
  }

  function clearPreview() {
    previewGrid.set(null);
    autofillVariations = [];
    currentVariationIndex = -1;
  }

  // Track when autofill just completed to prevent clearing preview immediately
  let autofillJustCompleted = false;
  let lastGridSnapshot: string = '';
  let isInitialized = false;
  
  // Clear preview when user manually edits grid (but not when we're applying autofill or just completed)
  $: {
    // Create a snapshot of the grid to detect actual changes
    const gridSnapshot = JSON.stringify($grid);
    
    // Initialize snapshot on first run
    if (!isInitialized) {
      lastGridSnapshot = gridSnapshot;
      isInitialized = true;
    } else if ($grid && !isAutofilling && !isApplyingAutofill && !autofillJustCompleted && $previewGrid) {
      // Only clear if the grid actually changed (user manually edited)
      if (gridSnapshot !== lastGridSnapshot) {
        console.log('Grid changed, clearing preview');
        previewGrid.set(null);
        autofillVariations = [];
        currentVariationIndex = -1;
        autofillJustCompleted = false; // Reset flag when user edits
      }
    }
    
    // Update snapshot
    lastGridSnapshot = gridSnapshot;
  }
</script>

<div class="fill-panel">
  <div class="autofill-section">
    <h3 class="section-heading">Autofill</h3>
    <div class="autofill-controls">
    <button
        class="autofill-button" 
        on:click={generateAutofill}
        disabled={isAutofilling || wordListsLoading}
      >
        {isAutofilling ? 'Generating...' : 'Generate Autofill'}
      </button>
      {#if isAutofilling}
        <div class="loading-indicator">
          <div class="spinner"></div>
          <span class="loading-text">{autofillProgress || 'Generating fills...'}</span>
        </div>
      {/if}
      {#if hasVariations && !isAutofilling}
        <div class="variation-info">
          <span class="variation-count">
            {#if hasMoreThanMaxVariations}
              More than 100 variations found
            {:else}
              {autofillVariations.length} variation{autofillVariations.length !== 1 ? 's' : ''} found
            {/if}
          </span>
        </div>
        <div class="variation-controls">
          <button 
            class="variation-button" 
            on:click={previousVariation}
            disabled={autofillVariations.length <= 1}
          >
            Previous
          </button>
          <button 
            class="variation-button" 
            on:click={nextVariation}
            disabled={autofillVariations.length <= 1}
          >
            Next
          </button>
          <div class="variation-counter">
            {currentVariationIndex + 1}/{hasMoreThanMaxVariations ? 100 : autofillVariations.length}
          </div>
        </div>
        <div class="action-controls">
          <button 
            class="cancel-button" 
            on:click={clearPreview}
          >
            Discard Fill
          </button>
          <button 
            class="accept-button" 
            on:click={applyAutofill}
          >
            Accept Fill
          </button>
        </div>
      {/if}
      {#if autofillProgress && !isAutofilling}
        <div class="autofill-message">
          {autofillProgress}
        </div>
      {/if}
    </div>
  </div>

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
      <div class="results-count">
        <span class="label">Results:</span>
        <span class="count-value">{allFilteredSuggestions.length.toLocaleString()}</span>
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
  {:else if wordListsLoading}
    <p class="no-word-selected">Loading word lists...</p>
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
  .word-length,
  .results-count {
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

  .length-value,
  .count-value {
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

  .autofill-section {
    padding-bottom: var(--carbon-spacing-04);
    border-bottom: 1px solid var(--carbon-gray-20);
  }

  .section-heading {
    font-size: 14px;
    font-weight: 600;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
    margin-bottom: var(--carbon-spacing-03);
  }

  .autofill-controls {
    display: flex;
    flex-direction: column;
    gap: var(--carbon-spacing-03);
  }

  .autofill-button,
  .variation-button,
  .accept-button,
  .cancel-button {
    width: 100%;
    height: 40px;
    padding: 0 var(--carbon-spacing-04);
    font-size: 14px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    font-weight: 400;
    border: 1px solid var(--carbon-gray-20);
    border-radius: 0;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }

  .autofill-button {
    background: var(--carbon-white);
    color: var(--carbon-gray-100);
  }

  .autofill-button:hover:not(:disabled) {
    background: var(--carbon-gray-10);
    border-color: var(--carbon-gray-30);
  }

  .autofill-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .variation-controls {
    display: flex;
    gap: var(--carbon-spacing-02);
    align-items: center;
  }

  .variation-counter {
    flex: 1;
    text-align: center;
    font-size: 14px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-70);
    font-weight: 500;
  }

  .variation-button {
    flex: 1;
    background: var(--carbon-white);
    color: var(--carbon-gray-100);
  }

  .variation-button:hover:not(:disabled) {
    background: var(--carbon-gray-10);
    border-color: var(--carbon-gray-30);
  }

  .variation-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-controls {
    display: flex;
    gap: var(--carbon-spacing-02);
  }

  .accept-button {
    flex: 1;
    background: var(--carbon-blue-60);
    color: var(--carbon-white);
    border-color: var(--carbon-blue-60);
  }

  .accept-button:hover {
    background: var(--carbon-blue-70);
    border-color: var(--carbon-blue-70);
  }

  .cancel-button {
    flex: 1;
    background: var(--carbon-white);
    color: var(--carbon-gray-100);
  }

  .cancel-button:hover {
    background: var(--carbon-gray-10);
    border-color: var(--carbon-gray-30);
  }

  .autofill-button:focus-visible,
  .variation-button:focus-visible,
  .accept-button:focus-visible,
  .cancel-button:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .loading-indicator {
    display: flex;
    align-items: center;
    gap: var(--carbon-spacing-03);
    padding: var(--carbon-spacing-03);
    margin-top: var(--carbon-spacing-03);
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--carbon-gray-20);
    border-top-color: var(--carbon-blue-60);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-text {
    font-size: 14px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-70);
  }

  .variation-info {
    padding: var(--carbon-spacing-01);
  }

  .variation-count {
    font-size: 14px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
    font-weight: 500;
  }

  .autofill-message {
    padding: var(--carbon-spacing-03);
    margin-top: var(--carbon-spacing-03);
    font-size: 14px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-70);
    font-style: italic;
  }
</style>

