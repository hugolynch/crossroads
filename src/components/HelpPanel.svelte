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
    padding: 20px;
  }

  .help-panel h2 {
    margin-top: 0;
    font-size: 18px;
  }

  .section {
    margin-bottom: 30px;
  }

  .section h3 {
    font-size: 16px;
    margin-top: 0;
    margin-bottom: 15px;
    color: #2E2F38;
  }

  .controls-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .control-item {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .control-keys {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
  }

  kbd {
    background: #F2F3FB;
    border: 1px solid #C9CAD6;
    border-radius: 3px;
    padding: 4px 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: #2E2F38;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .control-description {
    color: #6D6E78;
    font-size: 14px;
    line-height: 1.5;
  }
</style>

