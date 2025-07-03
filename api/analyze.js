// File: /api/analyze.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method is allowed' });
  }

  const { code } = req.body;

  const prompt = `Analyze the following code and provide:
1. Time Complexity
2. Space Complexity
3. A short justification for both.

Code:
\`\`\`
${code}
\`\`\``;

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
  });

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || 'No response';

  res.status(200).json({ result: reply });
}
