exports.handler = async function(event, context) {
  // السماح بطلبات CORS من موقع Firebase وأي موقع آخر
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ error: 'GEMINI_API_KEY غير معرف في Netlify' })
    };
  }

  try {
    const { prompt, systemInstruction } = JSON.parse(event.body || '{}');
    const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }]
        })
      }
    );

    const data = await response.json();

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ error: error.message || 'حدث خطأ غير متوقع' })
    };
  }
};
