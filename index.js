const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json({ limit: '50mb', verify: (req, res, buf) => { req.rawBody = buf } }));

// ═══════════════════════════════════════════════════════
// Твои данные – просто меняешь здесь и всё, больше ничего не нужно
// ═══════════════════════════════════════════════════════
const ID_INSTANCE = "7105390724";
const API_TOKEN   = "03f916929671498882ee3293c6291187d003267fdc1a4c148e";
const SOURCE_CHAT = "120363422621243676@g.us";   // откуда читаем
const TARGET_CHAT = "120363404167759617@g.us";   // куда пересылаем
// ═══════════════════════════════════════════════════════

const BASE_URL = `https://7105.api.greenapi.com/waInstance${ID_INSTANCE}`;

console.log('Сервер запускается…');
console.log('Источник:', SOURCE_CHAT);
console.log('Куда пересылаем:', TARGET_CHAT);

// Основная функция пересылки
async function forward(messageData) {
  try {
    const chatId = messageData.senderData?.chatId || messageData.senderData?.sender;
    if (chatId !== SOURCE_CHAT) return;                               // не наша группа — игнор

    const sender = messageData.senderData?.senderName || "Аноним";
    const prefix = `От: *${sender}*\n\n`;

    const type = messageData.typeMessage;

    // ТЕКСТ
    if (type === "textMessage" || type === "extendedTextMessage") {
      const text = messageData.textMessageData?.textMessageData?.textMessage ||
                   messageData.extendedTextMessageData?.text || "";
      await axios.post(`${BASE_URL}/sendMessage/${API_TOKEN}`, {
        chatId: TARGET_CHAT,
        message: prefix + text
      });
      console.log("Текст переслано от", sender);
    }

    // ГОЛОСОВЫЕ СООБЩЕНИЯ
    else if (type === "audioMessage") {
      const url = messageData.audioMessage?.urlVoiceMessage;
      if (!url) return console.log("Голосовое без URL");

      await axios.post(`${BASE_URL}/sendVoiceMessage/${API_TOKEN}`, {
        chatId: TARGET_CHAT,
        link: url,
        caption: prefix
      });
      console.log("Голосовое переслано от", sender);
    }

    // КАРТИНКИ, ВИДЕО, ДОКУМЕНТЫ, СТИКЕРЫ — всё по ссылке (самый стабильный способ)
    else if (["imageMessage","videoMessage","documentMessage","stickerMessage"].includes(type)) {
      const media = messageData[type];
      const url = media?.urlMessage || media?.downloadUrl;
      if (!url) return console.log(`${type} без URL`);

      let endpoint = "sendFileByUrl";
      const payload = {
        chatId: TARGET_CHAT,
        link: url,
        caption: prefix + (media?.caption || "")
      };

      if (type === "documentMessage") payload.fileName = media.fileName || "file";

      await axios.post(`${BASE_URL}/${endpoint}/${API_TOKEN}`, payload);
      console.log(`${type} переслано от`, sender);
    }

    else {
      console.log("Неизвестный/неподдерживаемый тип:", type);
    }
  } catch (e) {
    console.error("Ошибка пересылки:", e.response?.data || e.message);
  );
  }
}

// Webhook от Green-API
app.post('/webhook', async (req, res) => {
  console.log("Webhook получен в", new Date().toLocaleString());

  const body = req.body;

  if (body.typeWebhook === "incomingMessageReceived" && body.messageData) {
    await forward(body.messageData);
  }

  res.status(200).send("OK");
});

// Живой-чек для Render
app.get('/', (req, res) => {
  res.send(`
    <h2>WhatsApp Forwarder работает!</h2>
    <p><b>Откуда:</b> ${SOURCE_CHAT}</p>
    <p><b>Куда:</b> ${TARGET_CHAT}</p>
    <p>Всё ок — сообщения будут пересылаться автоматически</p>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Webhook URL → https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'твой-сервис'}.onrender.com/webhook`);
  console.log("Зайди в Green-API и укажи этот URL в настройках webhook!");
});
