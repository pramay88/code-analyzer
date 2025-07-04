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
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Only POST method is allowed' });
    }

    console.log('📥 Request body:', req.body);
    const { code } = req.body;

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid code input',
        received: code
      });
    }

    console.log('✅ Valid code received, length:', code.length);

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      console.warn('⚠️ No Gemini API key. Using fallback.');
      const fallbackResult = localFallbackAnalyzer(code);
      return res.status(200).json({
        result: fallbackResult,
        success: false,
        source: 'fallback',
        reason: 'Missing API key'
      });
    }

    const prompt = `Just extract the Time and Space Complexity in format:
Time Complexity: O(...)
Space Complexity: O(...)
Code:
\`\`\`
${code}
\`\`\``;

    console.log('🚀 Calling Gemini API...');
    const response = await fetch(
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

    console.log('📡 Gemini API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('❌ Gemini API failed. Falling back.', errorText);
      const fallbackResult = localFallbackAnalyzer(code);
      return res.status(200).json({
        result: fallbackResult,
        success: false,
        source: 'fallback',
        reason: 'Gemini API failed',
        geminiError: errorText
      });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text || !text.includes('Time Complexity')) {
      console.warn('⚠️ Invalid Gemini response. Using fallback.', text);
      const fallbackResult = localFallbackAnalyzer(code);
      return res.status(200).json({
        result: fallbackResult,
        success: false,
        source: 'fallback',
        reason: 'Invalid Gemini response',
        geminiResponse: data
      });
    }

    console.log('✅ Gemini Success:', text.trim());

    return res.status(200).json({
      result: text.trim(),
      success: true,
      source: 'gemini'
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
