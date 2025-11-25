const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json({ limit: '50mb' }));

// =================== ТВОИ ДАННЫЕ (меняешь только здесь) ===================
const ID_INSTANCE = "7105390724";
const API_TOKEN   = "03f916929671498882ee3293c6291187d003267fdc1a4c148e";
const SOURCE_CHAT = "120363422621243676@g.us";   // откуда читаем
const TARGET_CHAT = "120363404167759617@g.us";   // куда шлём
// =========================================================================

const BASE_URL = `https://7105.api.greenapi.com/waInstance${ID_INSTANCE}`;

console.log('Сервер запущен');
console.log('Источник →', SOURCE_CHAT);
console.log('Цель     →', TARGET_CHAT);

// Функция пересылки
async function forward(messageData) {
  try {
    const chatId = messageData.senderData?.chatId || messageData.senderData?.sender || messageData.senderData?.chatId;
    if (chatId !== SOURCE_CHAT) return;

    const sender = messageData.senderData?.senderName || "Аноним";
    const prefix = `От: *${sender}*\n\n`;

    const type = messageData.typeMessage;

    // Текст
    if (type === "textMessage" || type === "extendedTextMessage") {
      const text = messageData.textMessageData?.textMessageData?.textMessage ||
                   messageData.extendedTextMessageData?.text || "";
      await axios.post(`${BASE_URL}/sendMessage/${API_TOKEN}`, {
        chatId: TARGET_CHAT,
        message: prefix + text
      });
      console.log(`Текст от ${sender}`);
    }

    // Голосовое сообщение
    else if (type === "audioMessage") {
      const url = messageData.audioMessage?.urlVoiceMessage;
      if (!url) return console.log("Голосовое без ссылки");
      await axios.post(`${BASE_URL}/sendVoiceMessage/${API_TOKEN}`, {
        chatId: TARGET_CHAT,
        link: url,
        caption: prefix
      });
      console.log(`Голосовое от ${sender}`);
    }

    // Фото, видео, документы, стикеры
    else if (["imageMessage","videoMessage","documentMessage","stickerMessage"].includes(type)) {
      const media = messageData[type];
      const url = media?.urlMessage || media?.downloadUrl;
      if (!url) return console.log(`${type} без ссылки`);

      const payload = {
        chatId: TARGET_CHAT,
        link: url,
        caption: prefix + (media?.caption || "")
      };
      if (type === "documentMessage") payload.fileName = media.fileName || "file";

      await axios.post(`${BASE_URL}/sendFileByUrl/${API_TOKEN}`, payload);
      console.log(`${type} от ${sender}`);
    }

    else {
      console.log("Неизвестный тип:", type);
    }
  } catch (err) {
    console.error("Ошибка:", err.response?.data || err.message);
  }
}

// Webhook
app.post('/webhook', async (req, res) => {
  console.log("Webhook получен", new Date().toLocaleTimeString());

  const body = req.body;
  if (body.typeWebhook === "incomingMessageReceived" && body.messageData) {
    await forward(body.messageData);
  }

  res.status(200).send("OK");
});

// Проверка, что сервер жив
app.get('/', (req, res) => {
  res.send(`
    <h3>WhatsApp Forwarder работает</h3>
    <p>Источник: ${SOURCE_CHAT}</p>
    <p>Цель: ${TARGET_CHAT}</p>
    <hr>
    <small>Webhook URL: <code>https://твой-сервис.onrender.com/webhook</code></small>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер слушает порт ${PORT}`);
  console.log(`Установи webhook в Green-API:`);
  console.log(`→ https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'твой-сервис'}.onrender.com/webhook`);
});
