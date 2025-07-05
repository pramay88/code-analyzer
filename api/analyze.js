import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://your-site-url.com', // Optional but recommended
    'X-Title': 'Code Complexity Analyzer',
  },
});

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
  try {
    const prompt = `Just extract the Time and Space Complexity in format:
Time Complexity: O(...)
Space Complexity: O(...)
Code:
\`\`\`
${code}
\`\`\``;

    const completion = await openai.chat.completions.create({
      model: 'mistral', // Or try 'deepseek-coder', 'meta-llama/llama-3-8b-instruct'
      messages: [
        { role: 'system', content: 'You are a code complexity analyzer.' },
        { role: 'user', content: prompt }
      ]
    });

    const text = completion?.choices?.[0]?.message?.content;

    if (!text || !text.includes('Time Complexity')) {
      return null;
    }

    return {
      result: text.trim(),
      success: true,
      source: 'openrouter'
    };
  } catch (err) {
    console.error('❌ OpenRouter error:', err.message);
    return null;
  }
}

export default async function handler(req, res) {
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

  // --- Gemini Primary API Call ---
  try {
    if (GEMINI_API_KEY) {
      const prompt = `Just extract the Time and Space Complexity in format:
Time Complexity: O(...)
Space Complexity: O(...)
Code:
\`\`\`
${code}
\`\`\``;

      const geminiRes = await fetch(
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

      const geminiData = await geminiRes.json();
      const geminiText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (geminiRes.ok && geminiText.includes('Time Complexity')) {
        return res.status(200).json({
          result: geminiText.trim(),
          success: true,
          source: 'gemini'
        });
      }

      console.warn('⚠️ Gemini fallback triggered:', geminiData);
    } else {
      console.warn('⚠️ GEMINI_API_KEY not set. Skipping Gemini.');
    }
  } catch (err) {
    console.error('❌ Gemini API Error:', err.message);
  }

  // --- OpenRouter Fallback ---
  const openrouterResult = await openRouterLLMFallback(code);
  if (openrouterResult) {
    return res.status(200).json(openrouterResult);
  }

  // --- Static Analyzer (Final Fallback) ---
  const fallbackResult = localFallbackAnalyzer(code);
  return res.status(200).json({
    result: fallbackResult,
    success: false,
    source: 'fallback',
    reason: 'Both Gemini and OpenRouter failed'
  });
}
