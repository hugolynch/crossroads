<script lang="ts">
</script>

<div class="help-panel">
  <h2>Help</h2>
  
  <div class="section">
    <h3>Keyboard Controls</h3>
    <div class="controls-list">
      <div class="control-item">
        <div class="control-keys">
          <kbd>↑</kbd>
          <kbd>↓</kbd>
          <kbd>←</kbd>
          <kbd>→</kbd>
        </div>
        <div class="control-description">Move selection one cell</div>
      </div>
      
      <div class="control-item">
        <div class="control-keys">
          <kbd>Shift</kbd> + <kbd>↑</kbd>
          <kbd>↓</kbd>
          <kbd>←</kbd>
          <kbd>→</kbd>
        </div>
        <div class="control-description">Move selection, skipping over black cells</div>
      </div>
      
      <div class="control-item">
        <div class="control-keys">
          <kbd>Tab</kbd>
        </div>
        <div class="control-description">Move to next word in current direction</div>
      </div>
      
      <div class="control-item">
        <div class="control-keys">
          <kbd>Shift</kbd> + <kbd>Tab</kbd>
        </div>
        <div class="control-description">Move to previous word in current direction</div>
      </div>
      
      <div class="control-item">
        <div class="control-keys">
          <kbd>Enter</kbd>
        </div>
        <div class="control-description">Toggle word direction</div>
      </div>
      
      <div class="control-item">
        <div class="control-keys">
          <kbd>A</kbd> - <kbd>Z</kbd>
        </div>
        <div class="control-description">Input letter</div>
      </div>
      
      <div class="control-item">
        <div class="control-keys">
          <kbd>.</kbd>
        </div>
        <div class="control-description">Toggle black cell</div>
      </div>
      
      <div class="control-item">
        <div class="control-keys">
          <kbd>Backspace</kbd> / <kbd>Delete</kbd>
        </div>
        <div class="control-description">Clear current cell and move back one cell</div>
      </div>
    
    </div>
  </div>
</div>

<style>
  .help-panel {
    padding: var(--carbon-spacing-05);
    background: var(--carbon-white);
  }

  .help-panel h2 {
    margin-top: 0;
    margin-bottom: var(--carbon-spacing-05);
    font-size: 16px;
    font-weight: 600;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
  }

  .section {
    margin-bottom: var(--carbon-spacing-06);
  }

  .section h3 {
    font-size: 14px;
    font-weight: 600;
    margin-top: 0;
    margin-bottom: var(--carbon-spacing-04);
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    color: var(--carbon-gray-100);
  }

  .controls-list {
    display: flex;
    flex-direction: column;
    gap: var(--carbon-spacing-05);
  }

  .control-item {
    display: flex;
    flex-direction: column;
    gap: var(--carbon-spacing-01);

  }

  .control-keys {
    display: flex;
    align-items: center;
    gap: var(--carbon-spacing-02);
    flex-wrap: wrap;
  }

  kbd {
    background: var(--carbon-gray-10);
    border: 1px solid var(--carbon-gray-20);
    border-radius: 0;
    padding: var(--carbon-spacing-01) var(--carbon-spacing-02);
    font-family: 'IBM Plex Mono', 'Courier New', monospace;
    font-size: 12px;
    font-weight: 600;
    color: var(--carbon-gray-100);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    letter-spacing: 0.16px;
    border-radius: 4px;
    min-width: 28px;
    text-align: center;
  }

  .control-description {
    color: var(--carbon-gray-70);
    font-size: 14px;
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.5;
  }
</style>

