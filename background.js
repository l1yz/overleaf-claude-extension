// Enhanced background.js with detailed logging and error handling

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("🔧 Background script received message:", request.action);
  
  if (request.action === 'generateLatex') {
    console.log("📤 Making API request with:", {
      prompt: request.prompt.slice(0, 50) + "...",
      contextLength: request.context.length,
      hasApiKey: !!request.apiKey,
      model: request.model || "claude-3-haiku-20240307",
      apiKeyStart: request.apiKey ? request.apiKey.slice(0, 10) + "..." : "none"
    });
    
    generateLatex(request.prompt, request.context, request.apiKey, request.model)
      .then(result => {
        console.log("📥 API result:", result);
        sendResponse(result);
      })
      .catch(error => {
        console.error("💥 API error:", error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep message channel open for async response
  }
});

async function generateLatex(prompt, context, apiKey, model = 'claude-3-haiku-20240307') {
  console.log("🚀 Starting API call to Claude...");
  
  // Validate API key format
  if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    throw new Error("Invalid API key format. Should start with 'sk-ant-'");
  }
  
  const systemPrompt = `You are a LaTeX expert. Generate clean LaTeX code based on the request. 
  
Current document context:
${context}

Return only the LaTeX code, no explanations.`;

  const requestBody = {
    model: model,  // Use the selected model
    max_tokens: 800,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }]
  };
  
  console.log("📋 Request body:", JSON.stringify(requestBody, null, 2));

  try {
    console.log("🌐 Making fetch request to Claude API...");
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(requestBody)
    });

    console.log("📡 Response status:", response.status, response.statusText);
    console.log("📡 Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ HTTP Error:", errorText);
      
      // Try to parse error as JSON for better error messages
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(`API Error (${response.status}): ${errorJson.error?.message || errorText}`);
      } catch {
        throw new Error(`HTTP Error ${response.status}: ${errorText}`);
      }
    }

    const data = await response.json();
    console.log("✅ Raw API response:", JSON.stringify(data, null, 2));
    
    // Validate response structure
    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      console.error("❌ Unexpected response structure:", data);
      throw new Error(`Unexpected response structure. Expected 'content' array, got: ${JSON.stringify(data)}`);
    }
    
    if (!data.content[0].text) {
      console.error("❌ No text in response:", data.content[0]);
      throw new Error(`No text content in response: ${JSON.stringify(data.content[0])}`);
    }
    
    console.log("✅ Successfully extracted text:", data.content[0].text.slice(0, 100) + "...");
    return { success: true, data };

  } catch (error) {
    console.error("💥 Fetch error:", error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error("Network error: Cannot reach Claude API. Check your internet connection.");
    }
    
    throw error;
  }
}