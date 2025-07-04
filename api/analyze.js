// File: /api/analyze.js
export default async function handler(req, res) {
  // ✅ Always set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ✅ Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Tell browser it's safe
  }

  // ✅ Block anything except POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method is allowed' });
  }

  // ✅ Your existing logic goes here
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  const prompt = `Just extract the Time and Space Complexity in format:
Time Complexity: O(...)
Space Complexity: O(...)
Code:
\`\`\`
${code}
\`\`\``;

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
    return res.status(500).json({ result: 'No valid response from Gemini' });
  }

  return res.status(200).json({ result: text.trim() });
}
