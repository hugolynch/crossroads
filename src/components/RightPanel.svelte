<script lang="ts">
  import CluesPanel from './CluesPanel.svelte';
  import MetadataPanel from './MetadataPanel.svelte';
  import HelpPanel from './HelpPanel.svelte';
  import FillPanel from './FillPanel.svelte';
  import LookupPanel from './LookupPanel.svelte';

  let activeTab: 'fill' | 'clues' | 'metadata' | 'help' | 'lookup' = 'clues';
</script>

<div class="right-panel">
  <div class="tabs">
    <button
      class="tab"
      class:active={activeTab === 'fill'}
      on:click={() => activeTab = 'fill'}
    >
      Fill
    </button>
    <button
      class="tab"
      class:active={activeTab === 'clues'}
      on:click={() => activeTab = 'clues'}
    >
      Clues
    </button>
    <button
      class="tab"
      class:active={activeTab === 'lookup'}
      on:click={() => activeTab = 'lookup'}
    >
      Lookup
    </button>
    <button
      class="tab"
      class:active={activeTab === 'metadata'}
      on:click={() => activeTab = 'metadata'}
    >
      Info
    </button>
    <button
      class="tab"
      class:active={activeTab === 'help'}
      on:click={() => activeTab = 'help'}
    >
      Help
    </button>
  </div>

  <div class="tab-content">
    {#if activeTab === 'fill'}
      <FillPanel />
    {:else if activeTab === 'clues'}
      <CluesPanel />
    {:else if activeTab === 'lookup'}
      <LookupPanel />
    {:else if activeTab === 'metadata'}
      <MetadataPanel />
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
  }

  .tab {
    flex: 1;
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

  .tab-content {
    flex: 1;
    overflow-y: auto;
    background: var(--carbon-white);
  }
</style>

