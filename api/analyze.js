export default async function handler(req, res) {
  try {
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

    // ✅ Log the incoming request
    console.log('📥 Request method:', req.method);
    console.log('📥 Request headers:', req.headers);
    console.log('📥 Request body type:', typeof req.body);
    console.log('📥 Request body:', req.body);

    // ✅ Validate request body exists
    if (!req.body) {
      console.error('❌ No request body found');
      return res.status(400).json({ 
        error: 'Request body is required',
        received: req.body
      });
    }

    const { code } = req.body;
    
    // ✅ Enhanced validation
    if (!code) {
      console.error('❌ Missing code field in request body');
      return res.status(400).json({ 
        error: 'Missing code field in request body',
        received: { code, bodyKeys: Object.keys(req.body) }
      });
    }

    if (typeof code !== 'string') {
      console.error('❌ Code field must be a string, received:', typeof code);
      return res.status(400).json({ 
        error: 'Code field must be a string',
        received: { codeType: typeof code, code: code }
      });
    }

    if (code.trim().length === 0) {
      console.error('❌ Code field is empty');
      return res.status(400).json({ 
        error: 'Code field cannot be empty',
        received: { codeLength: code.length }
      });
    }

    console.log('✅ Code validation passed. Length:', code.length);
    console.log('📝 Code preview:', code.slice(0, 100) + '...');

    // ✅ Check environment variable
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not set in environment');
      return res.status(500).json({ 
        error: 'Gemini API key not configured',
        hint: 'Check environment variables'
      });
    }

    // ✅ Prepare Gemini API prompt
    const prompt = `Just extract the Time and Space Complexity in format: Time Complexity: O(...) Space Complexity: O(...) Code: \`\`\` ${code} \`\`\``;
    
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
      console.error('❌ Gemini API error:', errorText);
      return res.status(500).json({ 
        error: 'Gemini API request failed',
        geminiError: errorText,
        status: response.status
      });
    }

    const data = await response.json();
    console.log('📊 Gemini API response data:', JSON.stringify(data, null, 2));
    
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!text || !text.includes('Time Complexity')) {
      console.error('❌ No valid response from Gemini');
      console.log('📊 Full Gemini response:', data);
      return res.status(500).json({ 
        error: 'No valid response from Gemini',
        geminiResponse: data,
        extractedText: text
      });
    }

    console.log('✅ Success! Gemini response:', text.trim());
    
    return res.status(200).json({ 
      result: text.trim(),
      success: true
    });

  } catch (err) {
    console.error('💥 Internal Server Error:', err);
    console.error('💥 Error stack:', err.stack);
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}