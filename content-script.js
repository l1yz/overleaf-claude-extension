// Complete content-script.js - Enhanced Claude extension for Overleaf
class SmartOverleafClaude {
  constructor() {
    this.apiKey = null;
    this.model = null;
    this.editor = null;
    this.lastGeneratedText = '';
    this.init();
  }

  async init() {
    console.log("🤖 Claude extension starting...");
    await this.waitForEditor();
    this.setupUI();
    this.bindEvents();
    this.loadApiKey();
  }

  // Wait for Overleaf's CodeMirror editor to be ready
  async waitForEditor() {
    return new Promise((resolve) => {
      const checkEditor = () => {
        // Try to find CodeMirror 6 editor
        const editorEl = document.querySelector('.cm-editor');
        if (editorEl) {
          // Try to get the editor view
          this.editor = editorEl.cmView || window.cmView;
          console.log("✅ Found CodeMirror editor:", !!this.editor);
          resolve();
        } else {
          setTimeout(checkEditor, 500);
        }
      };
      checkEditor();
    });
  }

  async loadApiKey() {
    try {
      const result = await chrome.storage.sync.get(['claudeApiKey', 'claudeModel']);
      this.apiKey = result.claudeApiKey;
      this.model = result.claudeModel || 'claude-3-haiku-20240307';
      console.log("Settings loaded:", {
        hasApiKey: !!this.apiKey,
        model: this.model
      });
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  }

  setupUI() {
    // Create enhanced floating button
    const button = document.createElement('button');
    button.id = 'claude-trigger';
    button.innerHTML = '🤖 Claude';
    button.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      z-index: 9999;
      background: #0066cc;
      color: white;
      border: none;
      padding: 10px;
      border-radius: 5px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(button);

    // Create enhanced input panel
    const panel = document.createElement('div');
    panel.id = 'claude-panel';
    panel.innerHTML = `
      <div style="padding: 15px; position: relative;">
        <button id="close-btn" style="position: absolute; top: 8px; right: 8px; background: none; border: none; font-size: 18px; cursor: pointer; color: #666;">×</button>
        
        <h3 style="margin: 0 20px 15px 0;">Claude Assistant</h3>
        
        <textarea id="claude-input" placeholder="Ask about your LaTeX or describe what you want to generate..." 
                  style="width: 100%; height: 80px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; padding: 8px; resize: vertical;"></textarea>
        
        <div style="margin: 10px 0; display: flex; gap: 8px;">
          <button id="generate-btn" style="flex: 1; background: #28a745; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer;">Generate</button>
          <button id="test-btn" style="background: #17a2b8; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer;">Test</button>
        </div>
        
        <div id="result" style="margin-top: 15px; background: #f8f9fa; padding: 10px; border-radius: 4px; min-height: 40px; white-space: pre-wrap; font-family: monospace; max-height: 300px; overflow-y: auto; display: none;"></div>
        
        <div id="copy-section" style="margin-top: 10px; display: none;">
          <button id="copy-btn" style="background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 14px;">📋 Copy Result</button>
          <span id="copy-status" style="margin-left: 10px; font-size: 12px; color: #28a745;"></span>
        </div>
      </div>
    `;
    panel.style.cssText = `
      position: fixed;
      top: 150px;
      right: 20px;
      width: 450px;
      background: white;
      border: 2px solid #ccc;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      display: none;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    document.body.appendChild(panel);
    console.log("✅ Enhanced UI setup complete");
  }

  bindEvents() {
    document.getElementById('claude-trigger').addEventListener('click', () => {
      const panel = document.getElementById('claude-panel');
      const isVisible = panel.style.display !== 'none';
      panel.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) {
        // Auto-focus the input when opening
        setTimeout(() => {
          document.getElementById('claude-input').focus();
        }, 100);
      }
    });

    document.getElementById('generate-btn').addEventListener('click', () => {
      this.generateCode();
    });

    document.getElementById('test-btn').addEventListener('click', () => {
      this.testConnection();
    });

    document.getElementById('close-btn').addEventListener('click', () => {
      document.getElementById('claude-panel').style.display = 'none';
    });

    document.getElementById('copy-btn').addEventListener('click', () => {
      this.copyResult();
    });

    // Enter key shortcut for generate
    document.getElementById('claude-input').addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        this.generateCode();
      }
    });

    // Keyboard shortcut to open panel
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        document.getElementById('claude-trigger').click();
      }
    });

    // Click outside to close panel
    document.addEventListener('click', (e) => {
      const panel = document.getElementById('claude-panel');
      const button = document.getElementById('claude-trigger');
      
      // Check if panel is visible
      if (panel.style.display !== 'none') {
        // If click is outside both panel and trigger button, close the panel
        if (!panel.contains(e.target) && !button.contains(e.target)) {
          panel.style.display = 'none';
        }
      }
    });
  }

  // SIMPLIFIED: Just use current visible content
  getSmartContext() {
    try {
      // Just get whatever content is currently visible
      const fullText = this.getFullDocumentContent();
      
      if (!fullText) {
        return {
          type: 'error',
          content: 'No LaTeX content found',
          preview: '❌ Could not read document content'
        };
      }

      console.log("✅ Using visible content:", fullText.length, "chars");

      return {
        type: 'auto',
        content: fullText,
        preview: `Auto context (${fullText.length} chars)`
      };

    } catch (error) {
      console.error("Context extraction error:", error);
      return {
        type: 'error',
        content: 'Error reading content: ' + error.message,
        preview: 'Error: ' + error.message
      };
    }
  }

  // NEW: Reliable document content extraction
  getFullDocumentContent() {
    console.log("📖 Attempting to read document content...");
    
    const methods = [
      // Method 1: CodeMirror 6 (current Overleaf)
      {
        name: 'CodeMirror 6 content',
        extract: () => {
          const cmContent = document.querySelector('.cm-content');
          return cmContent ? (cmContent.textContent || cmContent.innerText) : null;
        }
      },
      
      // Method 2: CodeMirror lines (alternative)
      {
        name: 'CodeMirror lines',
        extract: () => {
          const lines = document.querySelectorAll('.cm-line');
          if (lines.length > 0) {
            return Array.from(lines).map(line => line.textContent || line.innerText).join('\n');
          }
          return null;
        }
      },
      
      // Method 3: ACE Editor (older Overleaf)
      {
        name: 'ACE Editor',
        extract: () => {
          const aceContent = document.querySelector('.ace_content');
          return aceContent ? (aceContent.textContent || aceContent.innerText) : null;
        }
      },
      
      // Method 4: Any textarea with LaTeX
      {
        name: 'Textarea fallback',
        extract: () => {
          const textareas = document.querySelectorAll('textarea');
          for (let textarea of textareas) {
            if (textarea.value && textarea.value.includes('\\')) {
              return textarea.value;
            }
          }
          return null;
        }
      },
      
      // Method 5: Editor container
      {
        name: 'Editor container',
        extract: () => {
          const editor = document.querySelector('#editor') || 
                        document.querySelector('.editor-panel') ||
                        document.querySelector('[class*="editor"]');
          return editor ? (editor.textContent || editor.innerText) : null;
        }
      }
    ];

    // Try each method until one works
    for (let method of methods) {
      try {
        const content = method.extract();
        if (content && content.trim() && content.includes('\\')) {
          console.log(`✅ Successfully extracted content using: ${method.name}`);
          console.log(`   Content length: ${content.length} chars`);
          console.log(`   Line count: ${content.split('\n').length} lines`);
          console.log(`   First 200 chars: ${content.slice(0, 200)}...`);
          return content.trim();
        } else if (content) {
          console.log(`⚠️ ${method.name} found content but no LaTeX detected`);
          console.log(`   Content preview: ${content.slice(0, 100)}...`);
        }
      } catch (error) {
        console.log(`❌ ${method.name} failed:`, error.message);
      }
    }

    console.log("❌ All extraction methods failed");
    return null;
  }

  async testConnection() {
    console.log("🧪 Testing connection...");
    const context = this.getSmartContext();
    
    // Show result area
    document.getElementById('result').style.display = 'block';
    document.getElementById('result').textContent = 'Testing connection...';
    
    if (!this.apiKey) {
      document.getElementById('result').innerHTML = `
        <div style="color: red;">❌ No API Key</div>
        <div>Please set your API key in the extension popup first!</div>
      `;
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'generateLatex',
        prompt: 'test connection - just say "hello" and tell me what context you see',
        context: context.content,
        apiKey: this.apiKey,
        model: this.model
      });

      if (response.success) {
        const responseText = this.extractResponseText(response);
        document.getElementById('result').innerHTML = `
          <div style="color: green; margin-bottom: 10px;">✅ Connection Works!</div>
          <div style="background: white; padding: 8px; border: 1px solid #dee2e6; border-radius: 4px;">
            ${responseText}
          </div>
        `;
        this.showCopyButton(responseText);
      } else {
        document.getElementById('result').innerHTML = `
          <div style="color: red;">❌ API Error:</div>
          <div>${response.error}</div>
        `;
      }
    } catch (error) {
      document.getElementById('result').innerHTML = `
        <div style="color: red;">❌ Connection Failed</div>
        <div>Error: ${error.message}</div>
      `;
    }
  }

  async generateCode() {
    const input = document.getElementById('claude-input').value;
    const context = this.getSmartContext();
    
    console.log("🚀 Generate request:", {
      prompt: input.slice(0, 50) + "...",
      contextLength: context.content.length,
      model: this.model
    });
    
    if (!input) {
      // Show result area with error
      document.getElementById('result').style.display = 'block';
      document.getElementById('result').textContent = 'Please enter a description first';
      return;
    }
    
    if (!this.apiKey) {
      document.getElementById('result').style.display = 'block';
      document.getElementById('result').innerHTML = `
        <div style="color: red;">❌ No API Key Found</div>
        <div>Please set your API key in the extension popup!</div>
      `;
      return;
    }

    // Show result area and loading state
    document.getElementById('result').style.display = 'block';
    document.getElementById('generate-btn').textContent = 'Generating...';
    document.getElementById('result').textContent = 'Thinking...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'generateLatex',
        prompt: input,
        context: context.content,
        apiKey: this.apiKey,
        model: this.model
      });

      if (response.success) {
        const result = this.extractResponseText(response);
        const cleanResult = result.replace(/```latex\n?/g, '').replace(/```\n?/g, '');
        
        document.getElementById('result').innerHTML = `
          <div style="color: green; margin-bottom: 8px; font-size: 14px;">✅ Generated with ${this.model.includes('haiku') ? 'Haiku' : 'Sonnet'}:</div>
          <div style="background: white; padding: 10px; border: 1px solid #dee2e6; border-radius: 4px; white-space: pre-wrap; font-family: monospace;">
            ${cleanResult}
          </div>
        `;
        
        this.showCopyButton(cleanResult);
        console.log("✅ Generation successful");
      } else {
        document.getElementById('result').innerHTML = `
          <div style="color: red;">❌ Error:</div>
          <div>${response.error}</div>
        `;
        this.hideCopyButton();
      }
    } catch (error) {
      document.getElementById('result').innerHTML = `
        <div style="color: red;">❌ Request Failed</div>
        <div>Error: ${error.message}</div>
      `;
      this.hideCopyButton();
    }

    document.getElementById('generate-btn').textContent = 'Generate';
  }

  showCopyButton(text) {
    this.lastGeneratedText = text;
    document.getElementById('copy-section').style.display = 'block';
  }

  hideCopyButton() {
    document.getElementById('copy-section').style.display = 'none';
  }

  async copyResult() {
    if (!this.lastGeneratedText) return;
    
    try {
      await navigator.clipboard.writeText(this.lastGeneratedText);
      document.getElementById('copy-status').textContent = '✅ Copied!';
      setTimeout(() => {
        document.getElementById('copy-status').textContent = '';
      }, 2000);
    } catch (error) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = this.lastGeneratedText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      document.getElementById('copy-status').textContent = '✅ Copied!';
      setTimeout(() => {
        document.getElementById('copy-status').textContent = '';
      }, 2000);
    }
  }

  extractResponseText(response) {
    try {
      if (response.data && response.data.content && Array.isArray(response.data.content) && response.data.content.length > 0) {
        return response.data.content[0].text || "Empty response";
      } else {
        return `Unexpected response format: ${JSON.stringify(response.data)}`;
      }
    } catch (e) {
      return `Response parsing failed: ${e.message}`;
    }
  }
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new SmartOverleafClaude());
} else {
  new SmartOverleafClaude();
}