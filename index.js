const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json({ limit: '50mb' }));

// ────────────────────── НАСТРОЙКИ ──────────────────────
const ID_INSTANCE = "7105390724";
const API_TOKEN   = "03f916929671498882ee3293c6291187d003267fdc1a4c148e";
const SOURCE_CHAT = "120363422621243676@g.us";   // ← откуда читаем
const TARGET_CHAT = "120363404167759617@g.us";   // ← куда шлём
// ──────────────────────────────────────────────────────

const BASE_URL = `https://7105.api.greenapi.com/waInstance${ID_INSTANCE}`;

console.log('WhatsApp Forwarder запущен и готов к работе');
console.log(`Источник: ${SOURCE_CHAT}`);
console.log(`Куда шлём: ${TARGET_CHAT}`);

// ====================== ОСНОВНОЙ ВЕБХУК ======================
app.post('/webhook', async (req, res) => {
  console.log('\nWebhook получен →', new Date().toLocaleTimeString());

  const body = req.body;

  // Логируем весь запрос — это спасёт тебя в 100% случаев
  console.log('Полный payload:', JSON.stringify(body, null, 2));

  if (body.typeWebhook !== "incomingMessageReceived") {
    console.log('Не входящее сообщение → игнорируем');
    return res.status(200).send('OK');
  }

  const msg = body.messageData;
  if (!msg) {
    console.log('messageData отсутствует');
    return res.status(200).send('OK');
  }

  const chatId = msg.senderData?.chatId;  // в 100% случаев в группах он здесь
    if (!chatId || chatId !== SOURCE_CHAT) {
      console.log('Не наша группа или chatId пустой → пропускаем');
      return res.status(200).send('OK');
    }
  console.log('Сообщение пришло из:', chatId);

  if (chatId !== SOURCE_CHAT) {
    console.log('Не наша группа → пропускаем');
    return res.status(200).send('OK');
  }

  console.log('НАША ГРУППА! Пересылаем…');
  const senderName = msg.senderData?.senderName || "Аноним";
  const prefix = `От: *${senderName}*\n\n`;
  const type = msg.typeMessage;

  try {
    // ТЕКСТ И ЦИТАТЫ
    if (type === "textMessage" || type === "extendedTextMessage") {
      const text = msg.textMessageData?.textMessageData?.textMessage ||
                   msg.extendedTextMessageData?.text || "";
      await axios.post(`${BASE_URL}/sendMessage/${API_TOKEN}`, {
        chatId: TARGET_CHAT,
        message: prefix + text
      });
      console.log('Текст успешно переслано');
    }

    // ГОЛОСОВЫЕ СООБЩЕНИЯ
    else if (type === "audioMessage" || type === "pttMessage") {
      const url = msg.audioMessage?.urlVoiceMessage || msg.audioMessage?.downloadUrl;
      if (!url) throw new Error("Нет ссылки на голосовое");
      await axios.post(`${BASE_URL}/sendVoiceMessage/${API_TOKEN}`, {
        chatId: TARGET_CHAT,
        link: url,
        caption: prefix
      });
      console.log('Голосовое переслано');
    }

    // ФОТО, ВИДЕО, ДОКУМЕНТЫ, СТИКЕРЫ
    else if (["imageMessage", "videoMessage", "documentMessage", "stickerMessage"].includes(type)) {
      const media = msg[type];
      const url = media?.urlMessage || media?.downloadUrl || media?.directPath;
      if (!url) throw new Error(`Нет ссылки для ${type}`);

      const payload = {
        chatId: TARGET_CHAT,
        link: url,
        caption: prefix + (media?.caption || "")
      };

      if (type === "documentMessage") {
        payload.fileName = media.fileName || "file";
      }

      await axios.post(`${BASE_URL}/sendFileByUrl/${API_TOKEN}`, payload);
      console.log(`${type} переслано`);
    }

    else {
      console.log('Тип сообщения не поддерживается или игнорируется:', type);
    }

  } catch (error) {
    console.error('ОШИБКА ПЕРЕСЫЛКИ:', error.response?.data || error.message);
  }

  res.status(200).send('OK');
});

// ====================== СТАТУСНАЯ СТРАНИЦА ======================
app.get('/', (req, res) => {
  res.send(`
    <h2>WhatsApp Forwarder АКТИВЕН</h2>
    <p>Источник: <b>${SOURCE_CHAT}</b></p>
    <p>Куда шлём: <b>${TARGET_CHAT}</b></p>
    <p>Всё работает — сообщения пересылаются автоматически</p>
    <hr>
    <small>Время сервера: ${new Date().toLocaleString()}</small>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Установи этот URL в Green-API как Webhook:`);
  console.log(`https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'твой-сервис'}.onrender.com/webhook`);
});
