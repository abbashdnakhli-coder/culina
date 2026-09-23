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

  const models = ['gemini-3.6-flash', 'gemini-3.1-pro-preview'];

  try {
    const { prompt, systemInstruction } = JSON.parse(event.body || '{}');
    const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;

    let responseData = null;
    let lastErrorMessage = '';

    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
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
            lastErrorMessage = data.error?.message || 'مواجهة ضغط في السيرفر';
            // إذا تجاوز الحد المسموح، ننتظر ثانيتين ثم نكرر المحاولة أوتوماتيكياً
            if (data.error?.code === 429 || res.status === 429) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        } catch (err) {
          lastErrorMessage = err.message;
        }
      }

      if (responseData) break;
    }

    if (!responseData) {
      return {
        statusCode: 429,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'تم تجاوز عدد الأسئلة المسموح بها في الدقيقة، يرجى الانتظار بضع ثوانٍ ثم المحاولة.' })
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
