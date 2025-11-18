import { writable } from 'svelte/store';

export interface WordWithRating {
  word: string;
  rating: number | null;
}

export interface WordList {
  id: string;
  name: string;
  filename: string;
  enabled: boolean;
  words: WordWithRating[];
  loading: boolean;
}

// Module-level cache to persist loaded word lists across component instances
export const wordListCache = new Map<string, WordWithRating[]>();

// Store for word lists
export const wordLists = writable<WordList[]>([]);

// Load saved word list preferences from localStorage
export function loadWordListPreferences(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem('crossword-word-list-preferences');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load word list preferences:', error);
  }
  return {};
}

// Save word list preferences to localStorage
export function saveWordListPreferences(lists: WordList[]) {
  try {
    const preferences: Record<string, boolean> = {};
    lists.forEach(list => {
      preferences[list.id] = list.enabled;
    });
    localStorage.setItem('crossword-word-list-preferences', JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save word list preferences:', error);
  }
}

// Initialize word lists
export function initializeWordLists(): WordList[] {
  const savedPreferences = loadWordListPreferences();
  
  return [
    {
      id: 'crossword-nexus',
      name: 'Crossword Nexus',
      filename: 'Crossword Nexus Word List.txt',
      enabled: savedPreferences['crossword-nexus'] !== undefined ? savedPreferences['crossword-nexus'] : true,
      words: [],
      loading: false
    },
    {
      id: 'juggernaut',
      name: 'Juggernaut',
      filename: 'Juggernaut Word List.txt',
      enabled: savedPreferences['juggernaut'] !== undefined ? savedPreferences['juggernaut'] : true,
      words: [],
      loading: false
    },
    {
      id: 'peter-broda',
      name: 'Peter Broda',
      filename: 'Peter Broda Wordlist.txt',
      enabled: savedPreferences['peter-broda'] !== undefined ? savedPreferences['peter-broda'] : true,
      words: [],
      loading: false
    },
    {
      id: 'spread-the-wordlist',
      name: 'Spread the Wordlist',
      filename: 'Spread the Wordlist.txt',
      enabled: savedPreferences['spread-the-wordlist'] !== undefined ? savedPreferences['spread-the-wordlist'] : true,
      words: [],
      loading: false
    },
    {
      id: 'collaborative',
      name: 'The Collaborative Word List Project',
      filename: 'The Collaborative Word List Project.txt',
      enabled: savedPreferences['collaborative'] !== undefined ? savedPreferences['collaborative'] : true,
      words: [],
      loading: false
    }
  ];
}

export async function loadWordList(list: WordList): Promise<void> {
  // Check cache first - if already loaded, use cached data
  if (wordListCache.has(list.id)) {
    list.words = wordListCache.get(list.id)!;
    list.loading = false;
    return;
  }
  
  // Skip if already loaded in component
  if (list.words.length > 0) {
    wordListCache.set(list.id, list.words);
    return;
  }
  
  list.loading = true;
  
  // Use requestIdleCallback or setTimeout to avoid blocking
  await new Promise(resolve => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => resolve(undefined), { timeout: 1000 });
    } else {
      setTimeout(() => resolve(undefined), 0);
    }
  });
  
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}${list.filename}`);
    const text = await response.text();
    
    // Process in chunks to avoid blocking
    const lines = text.split('\n');
    const chunkSize = 10000;
    list.words = [];
    
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize);
      const processed = chunk
        .map(line => line.trim().toUpperCase())
        .filter(line => line.length > 0 && !line.startsWith('#'))
        .map(line => {
          // Check if line has rating (format: WORD;RATING)
          const parts = line.split(';');
          if (parts.length === 2) {
            const word = parts[0].trim();
            const rating = parseInt(parts[1].trim(), 10);
            return { word, rating: isNaN(rating) ? null : rating };
          }
          return { word: line, rating: null };
        });
      list.words.push(...processed);
      
      // Yield to browser between chunks
      if (i + chunkSize < lines.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    // Cache the loaded words
    wordListCache.set(list.id, list.words);
  } catch (error) {
    console.error(`Failed to load word list ${list.name}:`, error);
    list.words = [];
  } finally {
    list.loading = false;
  }
}

