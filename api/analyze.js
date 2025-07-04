export default async function handler(req, res) {
  // ✅ CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ✅ Handle preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ✅ Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method is allowed' });
  }

  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      console.error('Missing or invalid code input:', code);
      return res.status(400).json({ error: 'Missing or invalid code input' });
    }

    console.log('[Analyzer] Code received:', code.slice(0, 100)); // log first 100 chars

    // ✅ Prepare Gemini API prompt
    const prompt = `Just extract the Time and Space Complexity in format:
Time Complexity: O(...)
Space Complexity: O(...)
Code:
\`\`\`
${code}
\`\`\``;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not set in environment');
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

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

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text || !text.includes('Time Complexity')) {
      console.error('[Analyzer] No valid response from Gemini', data);
      return res.status(500).json({ result: 'No valid response from Gemini' });
    }

    console.log('[Analyzer] Gemini response:', text.trim());

    return res.status(200).json({ result: text.trim() });

  } catch (err) {
    console.error('[Analyzer] Internal Server Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
