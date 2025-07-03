// File: /api/analyze.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method is allowed' });
  }

  const { code } = req.body;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  const prompt = `Analyze the following code and provide:
1. Time Complexity
2. Space Complexity
3. A short justification for both.

Code:
\`\`\`
${code}
\`\`\``;

  try {
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ]
      }),
    });

    const data = await geminiRes.json();

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';

    res.status(200).json({ result: reply });
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze code', details: error.message });
  }
}
