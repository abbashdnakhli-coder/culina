exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'GEMINI_API_KEY غير معرف في Netlify' })
    };
  }

  // استخدام gemini-2.5-flash كخيار مستقر مع gemini-2.5-pro كاحتياطي
  const models = ['gemini-2.5-flash', 'gemini-2.5-pro'];

  try {
    const { prompt, systemInstruction } = JSON.parse(event.body || '{}');
    const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;

    let responseData = null;
    let lastError = null;

    for (const model of models) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: fullPrompt }] }]
            })
          }
        );

        const data = await res.json();

        if (res.ok && !data.error) {
          responseData = data;
          break;
        } else {
          lastError = data.error?.message || 'High demand';
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    if (!responseData) {
      return {
        statusCode: 503,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `السيرفر مشغول حالياً، يرجى إعادة المحاولة بعد لحظات: ${lastError}` })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(responseData)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'حدث خطأ غير متوقع' })
    };
  }
};
