import { unsafeFetch } from "https://esm.sh/workers-unsafe-https@0.1.0";

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
      console.log("1. Авторизация...");
      // Используем unsafeFetch, который игнорирует проверку сертификата
      const authResponse = await unsafeFetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'RqUID': crypto.randomUUID(),
          'Authorization': 'Basic ' + env.GIGACHAT_KEY,
        },
        body: 'scope=GIGACHAT_API_PERS',
        connectTimeout: 10000,
        headersTimeout: 15000,
      });

      const authText = await authResponse.text();
      console.log("2. Ответ авторизации:", authText);

      let authData;
      try { authData = JSON.parse(authText); } catch(e) { throw new Error("Ошибка парсинга: " + authText); }
      if (!authData.access_token) throw new Error("Нет токена: " + authText);
      
      console.log("3. Токен получен. Отправляем запрос...");

      const userBody = await request.json();
      
      // Используем unsafeFetch для самого запроса к GigaChat
      const gigaResponse = await unsafeFetch('https://api.giga.chat/v1/chat/completions', {
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
          max_tokens: 600
        }),
        connectTimeout: 10000,
        headersTimeout: 20000,
      });

      const gigaText = await gigaResponse.text();
      console.log("4. Ответ GigaChat:", gigaText);

      return new Response(gigaText, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });

    } catch (err) {
      console.error("ОШИБКА:", err.message);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
}
