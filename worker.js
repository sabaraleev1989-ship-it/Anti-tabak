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

    const fetchWithTimeout = (url, options = {}, timeout = 20000) => {
      return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ]);
    };

    try {
      console.log("1. Авторизация...");
      const authResponse = await fetchWithTimeout('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'RqUID': crypto.randomUUID(),
          'Authorization': 'Basic ' + env.GIGACHAT_KEY,
        },
        body: 'scope=GIGACHAT_API_PERS',
        cf: { insecure: true }
      }, 10000);

      const authText = await authResponse.text();
      let authData;
      try { authData = JSON.parse(authText); } catch(e) { throw new Error("Ошибка авторизации: " + authText); }
      if (!authData.access_token) throw new Error("Нет токена: " + authText);
      
      console.log("2. Токен получен. Отправляем запрос...");

      const userBody = await request.json();
      
      const gigaResponse = await fetchWithTimeout('https://api.giga.chat/v1/chat/completions', {
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
          max_tokens: 600 // Увеличили, чтобы ИИ мог давать развернутые ответы
        }),
        cf: { insecure: true }
      }, 20000);

      const gigaText = await gigaResponse.text();
      console.log("3. Успех!");

      return new Response(gigaText, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });

    } catch (err) {
      console.error("ОШИБКА:", err.message);
      return new Response(JSON.stringify({ 
        error: err.message === 'Timeout' ? 'GigaChat отвечает слишком долго' : err.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
}
