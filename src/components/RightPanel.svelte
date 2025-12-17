<script lang="ts">
  import CluesPanel from './CluesPanel.svelte';
  import MetadataPanel from './MetadataPanel.svelte';
  import HelpPanel from './HelpPanel.svelte';
  import FillPanel from './FillPanel.svelte';
  import LookupPanel from './LookupPanel.svelte';
  import SettingsPanel from './SettingsPanel.svelte';
  import GridPanel from './GridPanel.svelte';
  import PlayPanel from './PlayPanel.svelte';
  import { activeTab, isPlayMode, solutionGrid, playGrid, selectedWordId, incorrectCells, playAuthor } from '../lib/store';
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import type { ActiveTab } from '../lib/store';

  const allTabs: Array<{ id: ActiveTab; label: string }> = [
    { id: 'grid', label: 'Grid' },
    { id: 'fill', label: 'Fill' },
    { id: 'clues', label: 'Clues' },
    { id: 'lookup', label: 'Lookup' },
    { id: 'metadata', label: 'Info' },
    { id: 'settings', label: 'Settings' },
    { id: 'help', label: 'Help' },
    { id: 'play', label: 'Play' }
  ];

  let tabsContainer: HTMLDivElement;
  let visibleTabs: Array<{ id: ActiveTab; label: string }> = [...allTabs];
  let hiddenTabs: Array<{ id: ActiveTab; label: string }> = [];
  let showMoreMenu = false;
  let resizeObserver: ResizeObserver | null = null;

  // Reactive statement to re-check tabs when active tab changes
  $: if ($activeTab && tabsContainer) {
    // Re-check tabs fit when active tab changes to ensure it's visible
    requestAnimationFrame(() => {
      checkTabsFit();
    });
  }

  function handleTabClick(tab: string) {
    // If switching away from play tab while in play mode, exit play mode
    if ($isPlayMode && tab !== 'play') {
      isPlayMode.set(false);
      solutionGrid.set(null);
      playGrid.set(null);
      selectedWordId.set(null);
      incorrectCells.set(new Set());
      playAuthor.set('');
    }
    activeTab.set(tab as ActiveTab);
    showMoreMenu = false;
  }

  function checkTabsFit() {
    if (!tabsContainer) return;

    // Measure the container width
    const containerWidth = tabsContainer.offsetWidth;
    if (containerWidth === 0) return; // Container not yet rendered
    
    // Get current active tab
    const currentActiveTabId = get(activeTab);
    const activeTabIndex = allTabs.findIndex(tab => tab.id === currentActiveTabId);
    const activeTabObj = activeTabIndex >= 0 ? allTabs[activeTabIndex] : null;

    // Create a temporary container to measure individual tab widths
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.visibility = 'hidden';
    tempContainer.style.display = 'flex';
    tempContainer.style.flexDirection = 'row';
    document.body.appendChild(tempContainer);

    // Measure each tab's natural width (without flex: 1)
    const tabWidths: number[] = [];
    allTabs.forEach((tab) => {
      const tempButton = document.createElement('button');
      tempButton.textContent = tab.label;
      tempButton.style.padding = 'var(--carbon-spacing-04)';
      tempButton.style.fontSize = '14px';
      tempButton.style.fontFamily = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
      tempButton.style.whiteSpace = 'nowrap';
      tempButton.style.border = 'none';
      tempButton.style.background = 'transparent';
      tempButton.style.width = 'auto';
      tempButton.style.display = 'inline-block';
      tempContainer.appendChild(tempButton);
    });

    // Force layout and measure
    void tempContainer.offsetHeight;
    const buttons = Array.from(tempContainer.children) as HTMLElement[];
    buttons.forEach((button) => {
      tabWidths.push(button.getBoundingClientRect().width);
    });
    
    // Measure "More..." button width
    const moreButtonTemp = document.createElement('button');
    moreButtonTemp.textContent = 'More...';
    moreButtonTemp.style.padding = 'var(--carbon-spacing-04)';
    moreButtonTemp.style.fontSize = '14px';
    moreButtonTemp.style.fontFamily = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";
    moreButtonTemp.style.whiteSpace = 'nowrap';
    moreButtonTemp.style.display = 'inline-flex';
    moreButtonTemp.style.alignItems = 'center';
    moreButtonTemp.style.gap = 'var(--carbon-spacing-02)';
    moreButtonTemp.style.width = 'auto';
    tempContainer.appendChild(moreButtonTemp);
    void moreButtonTemp.offsetHeight;
    const moreButtonWidth = moreButtonTemp.getBoundingClientRect().width;
    
    // Clean up temp container
    document.body.removeChild(tempContainer);

    // Calculate which tabs fit
    // Strategy: Always include active tab, then try to fit others in order
    
    const activeTabWidth = activeTabObj ? tabWidths[activeTabIndex] : 0;
    const visibleTabIndices: number[] = [];
    let totalWidth = 0;
    
    // First, always include the active tab if it exists
    if (activeTabIndex >= 0 && activeTabObj) {
      visibleTabIndices.push(activeTabIndex);
      totalWidth += activeTabWidth;
    }
    
    // Then try to fit other tabs in their original order
    for (let i = 0; i < allTabs.length; i++) {
      // Skip active tab (already added)
      if (i === activeTabIndex) continue;
      
      const tabWidth = tabWidths[i];
      // Calculate how many tabs would remain after this one
      const tabsAfterThis = allTabs.length - visibleTabIndices.length - 1; // -1 for current tab being considered
      const needsMoreButton = tabsAfterThis > 0;
      const neededWidth = totalWidth + tabWidth + (needsMoreButton ? moreButtonWidth : 0);
      
      if (neededWidth <= containerWidth) {
        totalWidth += tabWidth;
        visibleTabIndices.push(i);
      } else {
        // Can't fit this tab, stop trying - remaining tabs go to More
        break;
      }
    }

    // Build visible and hidden arrays, maintaining original order
    const visibleSet = new Set(visibleTabIndices);
    const proposedVisible: Array<{ id: ActiveTab; label: string }> = [];
    const proposedHidden: Array<{ id: ActiveTab; label: string }> = [];
    
    // Build arrays in original order
    allTabs.forEach((tab, index) => {
      if (visibleSet.has(index)) {
        proposedVisible.push(tab);
      } else {
        proposedHidden.push(tab);
      }
    });

    // Ensure active tab is in visible (should already be, but double-check)
    if (activeTabObj && !proposedVisible.includes(activeTabObj)) {
      // Remove from hidden if it's there
      const hiddenIndex = proposedHidden.indexOf(activeTabObj);
      if (hiddenIndex >= 0) {
        proposedHidden.splice(hiddenIndex, 1);
        // Insert at original position
        const originalIndex = allTabs.indexOf(activeTabObj);
        const insertPos = Math.min(originalIndex, proposedVisible.length);
        proposedVisible.splice(insertPos, 0, activeTabObj);
      }
    }

    // If all tabs fit, show all
    if (proposedHidden.length === 0) {
      visibleTabs = [...allTabs];
      hiddenTabs = [];
    } else {
      visibleTabs = proposedVisible;
      hiddenTabs = proposedHidden;
    }
  }

  // Close more menu when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.more-menu-container')) {
      showMoreMenu = false;
    }
  }

  onMount(() => {
    // Set up click outside handler
    document.addEventListener('click', handleClickOutside);
    
    // Initial check after DOM is ready
    requestAnimationFrame(() => {
      if (tabsContainer) {
        checkTabsFit();
        
        // Use ResizeObserver to watch for container size changes
        resizeObserver = new ResizeObserver((entries) => {
          // Use a small debounce to avoid excessive calculations during resize
          requestAnimationFrame(() => {
            checkTabsFit();
          });
        });
        resizeObserver.observe(tabsContainer);
      }
    });

    // Also check on window resize (debounced)
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        requestAnimationFrame(() => {
          checkTabsFit();
        });
      }, 100);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('click', handleClickOutside);
      clearTimeout(resizeTimeout);
    };
  });

  onDestroy(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
  });
</script>

<div class="right-panel">
  <div class="tabs" bind:this={tabsContainer}>
    {#each visibleTabs as tab (tab.id)}
      <button
        class="tab"
        class:active={$activeTab === tab.id}
        on:click={() => handleTabClick(tab.id)}
      >
        {tab.label}
      </button>
    {/each}
    {#if hiddenTabs.length > 0}
      <div class="more-menu-container">
        <button
          class="tab more-button"
          class:active={showMoreMenu || hiddenTabs.some(t => $activeTab === t.id)}
          on:click={(e) => {
            e.stopPropagation();
            showMoreMenu = !showMoreMenu;
          }}
        >
          More...
          <svg
            class="chevron-icon"
            class:expanded={showMoreMenu}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M4 6l4 4 4-4"
            />
          </svg>
        </button>
        {#if showMoreMenu}
          <div class="more-dropdown">
            {#each hiddenTabs as tab (tab.id)}
              <button
                class="more-dropdown-item"
                class:active={$activeTab === tab.id}
                on:click={() => handleTabClick(tab.id)}
              >
                {tab.label}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="tab-content">
    {#if $activeTab === 'grid'}
      <GridPanel />
    {:else if $activeTab === 'fill'}
      <FillPanel />
    {:else if $activeTab === 'clues'}
      <CluesPanel />
    {:else if $activeTab === 'lookup'}
      <LookupPanel />
    {:else if $activeTab === 'metadata'}
      <MetadataPanel />
    {:else if $activeTab === 'settings'}
      <SettingsPanel />
    {:else if $activeTab === 'play'}
      <PlayPanel />
    {:else}
      <HelpPanel />
    {/if}
  </div>
</div>

<style>
  .right-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--carbon-white);
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid var(--carbon-gray-20);
    background: var(--carbon-white);
    position: relative;
    overflow: visible;
  }

  .tab {
    flex: 0 1 auto;
    padding: var(--carbon-spacing-04);
    border: none;
    background: transparent;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    font-weight: 400;
    color: var(--carbon-gray-70);
    transition: color 0.2s, border-color 0.2s, background 0.2s;
    white-space: nowrap;
    min-width: fit-content;
  }

  .tab:hover {
    background: var(--carbon-gray-10);
    color: var(--carbon-gray-100);
  }

  .tab:active {
    background: var(--carbon-gray-20);
  }

  .tab:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .tab.active {
    border-bottom-color: var(--carbon-blue-60);
    color: var(--carbon-gray-100);
    font-weight: 600;
  }

  .more-menu-container {
    position: relative;
    flex-shrink: 0;
  }

  .more-button {
    display: flex;
    align-items: center;
    gap: var(--carbon-spacing-02);
    flex: 0 0 auto;
    min-width: 80px;
  }

  .chevron-icon {
    transition: transform 0.2s;
    flex-shrink: 0;
  }

  .chevron-icon.expanded {
    transform: rotate(180deg);
  }

  .more-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--carbon-white);
    border: 1px solid var(--carbon-gray-20);
    border-top: none;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    min-width: 150px;
    display: flex;
    flex-direction: column;
  }

  .more-dropdown-item {
    padding: var(--carbon-spacing-04);
    border: none;
    background: transparent;
    cursor: pointer;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    font-weight: 400;
    color: var(--carbon-gray-70);
    text-align: left;
    transition: background 0.2s, color 0.2s;
  }

  .more-dropdown-item:hover {
    background: var(--carbon-gray-10);
    color: var(--carbon-gray-100);
  }

  .more-dropdown-item.active {
    background: var(--carbon-blue-10);
    color: var(--carbon-blue-60);
    font-weight: 600;
  }

  .more-dropdown-item:focus-visible {
    outline: 2px solid var(--carbon-blue-60);
    outline-offset: -2px;
  }

  .tab-content {
    flex: 1;
    overflow-y: auto;
    background: var(--carbon-white);
  }
</style>

