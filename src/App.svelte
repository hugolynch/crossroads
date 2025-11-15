<script lang="ts">
  import ControlsPanel from './components/ControlsPanel.svelte';
  import Grid from './components/Grid.svelte';
  import RightPanel from './components/RightPanel.svelte';

  let leftPanelCollapsed = false;
  let rightPanelCollapsed = false;
  let leftPanelWidth = 250;
  let rightPanelWidth = 500;

  let isResizingLeft = false;
  let isResizingRight = false;
  let resizeStartX = 0;
  let resizeStartLeftWidth = 0;
  let resizeStartRightWidth = 0;

  function toggleLeftPanel() {
    leftPanelCollapsed = !leftPanelCollapsed;
  }

  function toggleRightPanel() {
    rightPanelCollapsed = !rightPanelCollapsed;
  }

  function handleLeftResizeStart(event: MouseEvent) {
    if (leftPanelCollapsed) return;
    isResizingLeft = true;
    resizeStartX = event.clientX;
    resizeStartLeftWidth = leftPanelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleLeftResizeMove);
    document.addEventListener('mouseup', handleLeftResizeEnd);
    event.preventDefault();
  }

  function handleLeftResizeMove(event: MouseEvent) {
    if (!isResizingLeft) return;
    const deltaX = event.clientX - resizeStartX;
    const newWidth = Math.max(150, Math.min(500, resizeStartLeftWidth + deltaX));
    leftPanelWidth = newWidth;
  }

  function handleLeftResizeEnd() {
    isResizingLeft = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleLeftResizeMove);
    document.removeEventListener('mouseup', handleLeftResizeEnd);
  }

  function handleRightResizeStart(event: MouseEvent) {
    if (rightPanelCollapsed) return;
    isResizingRight = true;
    resizeStartX = event.clientX;
    resizeStartRightWidth = rightPanelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleRightResizeMove);
    document.addEventListener('mouseup', handleRightResizeEnd);
    event.preventDefault();
  }

  function handleRightResizeMove(event: MouseEvent) {
    if (!isResizingRight) return;
    const deltaX = resizeStartX - event.clientX; // Inverted because right panel
    const newWidth = Math.max(150, Math.min(500, resizeStartRightWidth + deltaX));
    rightPanelWidth = newWidth;
  }

  function handleRightResizeEnd() {
    isResizingRight = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleRightResizeMove);
    document.removeEventListener('mouseup', handleRightResizeEnd);
  }
</script>

<main>
  <button 
    class="collapse-button collapse-left" 
    class:collapsed={leftPanelCollapsed}
    class:resizing={isResizingLeft}
    style="left: {leftPanelCollapsed ? 10 : leftPanelWidth + 10}px"
    on:click={toggleLeftPanel}
  >
    {leftPanelCollapsed ? '▶' : '◀'}
  </button>
  <div 
    class="left-panel" 
    class:collapsed={leftPanelCollapsed}
    class:resizing={isResizingLeft}
    style="width: {leftPanelCollapsed ? 0 : leftPanelWidth}px"
  >
    {#if !leftPanelCollapsed}
      <ControlsPanel />
    {/if}
  </div>
  {#if !leftPanelCollapsed}
    <div 
      class="resize-handle resize-handle-left"
      on:mousedown={handleLeftResizeStart}
    ></div>
  {/if}
  <div class="center-panel">
    <div class="logo-container">
      <img src="/logo.svg" alt="Crossword Editor" class="logo" />
    </div>
    <Grid />
  </div>
  {#if !rightPanelCollapsed}
    <div 
      class="resize-handle resize-handle-right"
      on:mousedown={handleRightResizeStart}
    ></div>
  {/if}
  <button 
    class="collapse-button collapse-right" 
    class:collapsed={rightPanelCollapsed}
    class:resizing={isResizingRight}
    style="right: {rightPanelCollapsed ? 10 : rightPanelWidth + 10}px"
    on:click={toggleRightPanel}
  >
    {rightPanelCollapsed ? '◀' : '▶'}
  </button>
  <div 
    class="right-panel" 
    class:collapsed={rightPanelCollapsed}
    class:resizing={isResizingRight}
    style="width: {rightPanelCollapsed ? 0 : rightPanelWidth}px"
  >
    {#if !rightPanelCollapsed}
      <RightPanel />
    {/if}
  </div>
</main>

<style>
  main {
    display: flex;
    height: 100vh;
    width: 100vw;
    position: relative;
  }

  .left-panel {
    border-right: 1px solid #FFFFFF;
    overflow-y: auto;
    position: relative;
    flex-shrink: 0;
    box-shadow: 0 0 4px 0px rgba(0, 0, 0, 0.5);
  }

  .left-panel:not(.collapsed):not(.resizing) {
    transition: width 0.2s ease;
  }

  .left-panel.collapsed {
    border: none;
    overflow: hidden;
  }

  .right-panel {
    border-left: 1px solid #FFFFFF;
    overflow-y: auto;
    position: relative;
    flex-shrink: 0;
    box-shadow: 0 0 4px 0px rgba(0, 0, 0, 0.5);

  }

  .right-panel:not(.collapsed):not(.resizing) {
    transition: width 0.2s ease;
  }

  .right-panel.collapsed {
    border: none;
    overflow: hidden;
  }

  .resize-handle {
    width: 3px;
    background: #8C8E98;
    cursor: col-resize;
    flex-shrink: 0;
    transition: background 0.2s;
  }

  .resize-handle:hover {
    background: #6D6E78;
  }

  .resize-handle-left {
    margin-left: -2px;
  }

  .resize-handle-right {
    margin-right: -2px;
  }

  .collapse-button {
    background: #F2F3FB;
    border: 1px solid #8C8E98;
    border-radius: 3px;
    padding: 5px 8px;
    cursor: pointer;
    font-size: 12px;
    z-index: 10;
  }

  .collapse-left {
    position: absolute;
    top: 10px;
    z-index: 100;
  }

  .collapse-left:not(.resizing) {
    transition: left 0.2s ease;
  }

  .collapse-right {
    position: absolute;
    top: 10px;
    z-index: 100;
  }

  .collapse-right:not(.resizing) {
    transition: right 0.2s ease;
  }

  .center-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    overflow: auto;
    min-width: 0;
    min-height: 0;
  }

  .logo-container {
    margin-bottom: 20px;
    display: flex;
    justify-content: center;
  }
</style>
