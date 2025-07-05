import OpenAI from 'openai';

const debugMode = process.env.debugmode === 'true';
 // Set false to disable debug logs and debug info in response

function localFallbackAnalyzer(code) {
  const codeLower = code.toLowerCase();
  let time = 'O(1)';
  let space = 'O(1)';

  if (/for\s*\(.+;.+;.+\)/g.test(code) || /while\s*\(.+\)/g.test(code)) {
    time = 'O(n)';
  }
  if (/for\s*\(.+\)\s*{[^}]*for\s*\(.+\)/gs.test(code)) {
    time = 'O(n^2)';
  }
  if (/merge|quick|sort|binary|log/i.test(codeLower)) {
    time = 'O(n log n)';
  }
  if (/recursion|fibonacci|factorial|dp|memo/i.test(codeLower)) {
    time = 'O(2^n)';
  }

  return `Time Complexity: ${time}\nSpace Complexity: ${space}`;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method is allowed' });
  }

  const { code } = req.body;

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid code input' });
  }

  if (debugMode) console.log('✅ Valid code received, length:', code.length);

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  let debugInfo = {
    geminiKeyPresent: !!GEMINI_API_KEY,
    openrouterKeyPresent: !!OPENROUTER_API_KEY,
    geminiCalled: false,
    geminiSuccess: false,
    geminiError: null,
    openrouterCalled: false,
    openrouterSuccess: false,
    openrouterError: null,
  };

  // === Try Gemini API ===
  if (GEMINI_API_KEY) {
    try {
      debugInfo.geminiCalled = true;
      const prompt = `Just extract the Time and Space Complexity in format:
Time Complexity: O(...)
Space Complexity: O(...)
Code:
\`\`\`
${code}
\`\`\``;

      if (debugMode) console.log('🚀 Calling Gemini API...');

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 },
          }),
        }
      );

      if (debugMode) console.log('📡 Gemini API status:', geminiResponse.status);

      if (!geminiResponse.ok) {
        const errText = await geminiResponse.text();
        debugInfo.geminiError = `Status ${geminiResponse.status}: ${errText}`;
        if (debugMode) console.warn('❌ Gemini API failed:', debugInfo.geminiError);
      } else {
        const data = await geminiResponse.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (text && text.includes('Time Complexity')) {
          debugInfo.geminiSuccess = true;
          if (debugMode) console.log('✅ Gemini Success:', text.trim());
          return res.status(200).json({
            result: text.trim(),
            success: true,
            source: 'gemini',
            debugInfo: debugMode ? debugInfo : undefined,
          });
        } else {
          debugInfo.geminiError = `Invalid Gemini response text: ${text}`;
          if (debugMode) console.warn('⚠️ Invalid Gemini response:', text);
        }
      }
    } catch (e) {
      debugInfo.geminiError = e.message || String(e);
      if (debugMode) console.error('💥 Gemini Exception:', e);
    }
  } else {
    if (debugMode) console.warn('⚠️ No Gemini API key provided');
  }

  // === Try OpenRouter API ===
  if (OPENROUTER_API_KEY) {
    try {
      debugInfo.openrouterCalled = true;
      if (debugMode) console.log('🚨 Calling OpenRouter API...');

      const openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: OPENROUTER_API_KEY,
        defaultHeaders: {
          'HTTP-Referer': 'https://your-site-url.com', // Change this to your deployed site URL if needed
          'X-Title': 'Code Analyzer Extension',
        },
      });

      const openRouterPrompt = `Just extract the Time and Space Complexity in format:
Time Complexity: O(...)
Space Complexity: O(...)
Code:
\`\`\`
${code}
\`\`\``;

      const completion = await openai.chat.completions.create({
  model: 'openai/gpt-4o',
  messages: [{ role: 'user', content: openRouterPrompt }],
  temperature: 0.2,
  max_tokens: 1000, // ✅ Reduce from 16384 to fit free quota
});


      if (debugMode) console.log('📬 OpenRouter raw response:', completion);

      const text = completion?.choices?.[0]?.message?.content;

      if (text && text.includes('Time Complexity')) {
        debugInfo.openrouterSuccess = true;
        if (debugMode) console.log('✅ OpenRouter Success:', text.trim());
        return res.status(200).json({
          result: text.trim(),
          success: true,
          source: 'openrouter',
          debugInfo: debugMode ? debugInfo : undefined,
        });
      } else {
        debugInfo.openrouterError = `Invalid OpenRouter response text: ${text}`;
        if (debugMode) console.warn('⚠️ Invalid OpenRouter response:', text);
      }
    } catch (e) {
      debugInfo.openrouterError = e.message || String(e);
      if (debugMode) console.error('💥 OpenRouter Exception:', e);
    }
  } else {
    if (debugMode) console.warn('⚠️ No OpenRouter API key provided');
  }

  // === Both APIs failed, return fallback ===
  const fallbackResult = localFallbackAnalyzer(code);

  if (debugMode) console.log('🔄 Returning fallback result');

  return res.status(200).json({
    result: fallbackResult,
    success: false,
    source: 'fallback',
    reason: 'Both Gemini and OpenRouter failed',
    debugInfo: debugMode ? debugInfo : undefined,
  });
}
