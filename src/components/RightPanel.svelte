<script lang="ts">
  import CluesPanel from './CluesPanel.svelte';
  import MetadataPanel from './MetadataPanel.svelte';
  import StatsPanel from './StatsPanel.svelte';
  import HelpPanel from './HelpPanel.svelte';

  let activeTab: 'clues' | 'metadata' | 'stats' | 'help' = 'clues';
</script>

<div class="right-panel">
  <div class="tabs">
    <button
      class="tab"
      class:active={activeTab === 'clues'}
      on:click={() => activeTab = 'clues'}
    >
      Clues
    </button>
    <button
      class="tab"
      class:active={activeTab === 'stats'}
      on:click={() => activeTab = 'stats'}
    >
      Stats
    </button>
    <button
      class="tab"
      class:active={activeTab === 'metadata'}
      on:click={() => activeTab = 'metadata'}
    >
      Metadata
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
    {#if activeTab === 'clues'}
      <CluesPanel />
    {:else if activeTab === 'stats'}
      <StatsPanel />
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
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid #8C8E98;
  }

  .tab {
    flex: 1;
    padding: 10px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-bottom: 2px solid transparent;
  }

  .tab.active {
    border-bottom-color: #6D6E78;
    font-weight: bold;
  }

  .tab-content {
    flex: 1;
    overflow-y: auto;
  }
</style>

