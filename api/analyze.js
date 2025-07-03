// File: /api/analyze.js

export default async function handler(req, res) {
  // ✅ CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method is allowed' });
  }

  const { code } = req.body;

  const prompt = `Just tell only this:\nTime Complexity: \nSpace Complexity:\n\nCode:\n\`\`\`\n${code}\n\`\`\``;

  const apiKey = process.env.GEMINI_API_KEY;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    }
  );

  const data = await geminiRes.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No valid response from Gemini';

  res.status(200).json({ result: reply });
}
