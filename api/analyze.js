export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method is allowed' });
  }

  const { code } = req.body;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!code || !GEMINI_API_KEY) {
    return res.status(400).json({ error: 'Code or API key missing' });
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
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      return res.status(500).json({ result: 'No valid response from Gemini' });
    }

    return res.status(200).json({ result: reply });
  } catch (err) {
    console.error('Gemini API Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
