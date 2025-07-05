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

async function openRouterLLMFallback(code) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) return null;

  const prompt = `Just extract the Time and Space Complexity in format:
Time Complexity: O(...)
Space Complexity: O(...)
Code:
\`\`\`
${code}
\`\`\``;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'mistral', // or 'deepseek-coder'
      messages: [
        { role: 'system', content: 'You are a code complexity analyzer.' },
        { role: 'user', content: prompt }
      ],
    }),
  });

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;

  if (!response.ok || !text || !text.includes('Time Complexity')) {
    console.warn('🧩 OpenRouter failed or gave unexpected output:', text);
    return null;
  }

  return {
    result: text.trim(),
    success: true,
    source: 'openrouter'
  };
}

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Only POST method is allowed' });
    }

    const { code } = req.body;

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid code input', received: code });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      const fallbackResult = localFallbackAnalyzer(code);
      return res.status(200).json({
        result: fallbackResult,
        success: false,
        source: 'fallback',
        reason: 'Missing Gemini API key'
      });
    }

    // ====== Call Gemini ======
    const geminiPrompt = `Just extract the Time and Space Complexity in format:
Time Complexity: O(...)
Space Complexity: O(...)
Code:
\`\`\`
${code}
\`\`\``;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: geminiPrompt }] }],
          generationConfig: { temperature: 0.2 },
        }),
      }
    );

    const geminiData = await geminiResponse.json();
    const geminiText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (geminiResponse.ok && geminiText.includes('Time Complexity')) {
      return res.status(200).json({
        result: geminiText.trim(),
        success: true,
        source: 'gemini'
      });
    }

    console.warn('⚠️ Gemini failed. Trying OpenRouter...');

    // ====== Call OpenRouter as fallback ======
    const openrouterResult = await openRouterLLMFallback(code);
    if (openrouterResult) {
      return res.status(200).json(openrouterResult);
    }

    console.warn('⚠️ OpenRouter also failed. Using static fallback.');

    // ====== Final Fallback: Static Analyzer ======
    const fallbackResult = localFallbackAnalyzer(code);
    return res.status(200).json({
      result: fallbackResult,
      success: false,
      source: 'fallback',
      reason: 'Both Gemini and OpenRouter failed'
    });

  } catch (err) {
    console.error('💥 Unexpected Error:', err);
    const fallbackResult = localFallbackAnalyzer(req.body?.code || '');
    return res.status(200).json({
      result: fallbackResult,
      success: false,
      source: 'fallback',
      reason: 'Exception in try-catch',
      error: err.message
    });
  }
}
