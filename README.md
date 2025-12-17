# Crossroads

A crossword puzzle builder built with Svelte, TypeScript, and Vite.

## Features

### Grid Panel
- **Grid Controls**: Adjust grid dimensions, set symmetry

### Fill Panel
- **Word Suggestions**: Get word suggestions based on current fill pattern
- **Word Lists**: Multiple built-in word lists (dictionaries, word games, etc.)
- **Filtering & Sorting**: Filter by rating, sort alphabetically or by rating
- **Pattern Matching**: Automatically detects word patterns from grid fill

### Clues Panel
- **Clue Management**: Add and edit clues for each word
- **Quick Access**: Click clues to navigate to corresponding words in the grid

### Lookup Panel
- **Word Search**: Search for words and get clue suggestions
- **Clue Database**: Browse clues by outlet, keyword, or search query
- **Auto-populate**: Automatically searches when a complete word is selected

### Info Panel
- **Puzzle Information**: Set puzzle title, notes, and author information
- **Collaborators**: Add multiple collaborators with roles (Constructor, Cluer, Editor)
- **Save & Load**: Save puzzles to browser localStorage and load them later
- **Import/Export**: Import and export puzzles in `.puz` format
- **Puzzle Management**: View, load, delete, and manage saved puzzles
- **Statistics**: View puzzle statistics (word count, average word length, etc.)
- **Word Length Hover**: Hover over word length indicators to see matching words

### Play Mode
- **Puzzle Playback**: Play saved puzzles or imported `.puz` files