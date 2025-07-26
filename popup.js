document.addEventListener('DOMContentLoaded', async () => {
  // Load existing settings
  const result = await chrome.storage.sync.get(['claudeApiKey', 'claudeModel']);
  
  if (result.claudeApiKey) {
    document.getElementById('apiKey').value = result.claudeApiKey;
  }
  
  if (result.claudeModel) {
    document.getElementById('modelSelect').value = result.claudeModel;
  } else {
    // Default to Haiku for new users
    document.getElementById('modelSelect').value = 'claude-3-haiku-20240307';
  }
  
  if (result.claudeApiKey) {
    showStatus('Settings loaded', 'success');
  }

  // Save button handler
  document.getElementById('save').addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('modelSelect').value;
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }
    
    if (!apiKey.startsWith('sk-ant-')) {
      showStatus('Invalid API key format', 'error');
      return;
    }

    // Save both API key and model
    await chrome.storage.sync.set({ 
      claudeApiKey: apiKey,
      claudeModel: model 
    });
    
    const modelName = model.includes('haiku') ? 'Haiku' : 'Sonnet';
    showStatus(`Settings saved! Using ${modelName} model`, 'success');
  });
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  
  if (type === 'success') {
    setTimeout(() => {
      status.textContent = '';
      status.className = '';
    }, 3000);
  }
}