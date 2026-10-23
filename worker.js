export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      console.log("1. Начинаем авторизацию...");
      const authResponse = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'RqUID': crypto.randomUUID(),
          'Authorization': 'Basic ' + env.GIGACHAT_KEY,
        },
        body: 'scope=GIGACHAT_API_PERS'
      });

      const authText = await authResponse.text();
      console.log("2. Ответ авторизации:", authText);

      let authData;
      try { authData = JSON.parse(authText); } catch(e) { throw new Error("Ошибка парсинга авторизации: " + authText); }

      if (!authData.access_token) {
        throw new Error("Нет токена. Ответ: " + authText);
      }
      console.log("3. Токен получен!");

      const userBody = await request.json();
      console.log("4. Отправляем запрос в GigaChat...");
      
      const gigaResponse = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer ' + authData.access_token,
        },
        body: JSON.stringify({
          model: 'GigaChat',
          messages: userBody.messages,
          temperature: 0.7,
          max_tokens: 300
        })
      });

      const gigaText = await gigaResponse.text();
      console.log("5. Ответ GigaChat:", gigaText);

      return new Response(gigaText, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });

    } catch (err) {
      console.error("КРИТИЧЕСКАЯ ОШИБКА:", err.message);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
}
