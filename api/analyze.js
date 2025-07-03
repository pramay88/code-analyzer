export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method is allowed' });
  }

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });

  const prompt = `
Analyze the following code and provide:
1. Time Complexity
2. Space Complexity
3. A short justification for both.

Code:
\`\`\`
${code}
\`\`\`
`;

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      console.error('Gemini Raw Response:', JSON.stringify(data, null, 2));
      return res.status(500).json({ result: 'No valid response from Gemini' });
    }

    return res.status(200).json({ result: reply });
  } catch (error) {
    console.error('Gemini Error:', error);
    return res.status(500).json({ error: 'Failed to fetch from Gemini', details: error.message });
  }
}
