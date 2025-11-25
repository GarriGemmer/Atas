const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json({ limit: '10mb' })); // важно для голосовых и медиа

const ID_INSTANCE = "7105390724";
const API_TOKEN = "03f916929671498882ee3293c6291187d003267fdc1a4c148e";
const SOURCE_CHAT = "120363422621243676@g.us"; // откуда берём
const TARGET_CHAT = "120363404167759617@g.us";   // куда шлём

const GREEN_API_URL = `https://7105.api.greenapi.com/waInstance${ID_INSTANCE}`;

// ========== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ОТПРАВКИ ==========
async function forwardMessage(messageData) {
  try {
    const chatId = messageData.senderData?.chatId || messageData.senderData?.sender;

    // Пропускаем сообщения не из нужной группы
    if (chatId !== SOURCE_CHAT) return;

    const senderName = messageData.senderData?.senderName || "Неизвестный";
    const prefix = `✉ Отправитель: *${senderName}*\n\n`;

    let response;

    if (messageData.typeMessage === "textMessage") {
      const text = messageData.textMessageData?.textMessageData?.textMessage || "";
      response = await axios.post(
        `${GREEN_API_URL}/sendMessage/${API_TOKEN}`,
        {
          chatId: TARGET_CHAT,
          message: prefix + text,
        }
      );
    }

    else if (messageData.typeMessage === "extendedTextMessage") {
      const text = messageData.extendedTextMessageData?.text || "";
      response = await axios.post(
        `${GREEN_API_URL}/sendMessage/${API_TOKEN}`,
        {
          chatId: TARGET_CHAT,
          message: prefix + text,
        }
      );
    }

    else if (messageData.typeMessage === "imageMessage" || 
             messageData.typeMessage === "videoMessage" || 
             messageData.typeMessage === "documentMessage" || 
             messageData.typeMessage === "audioMessage" ||
             messageData.typeMessage === "stickerMessage") {

      const fileUrl = messageData[messageData.typeMessage]?.urlMessage || 
                      messageData[messageData.typeMessage]?.directPath; // иногда url в другом месте

      // Скачиваем файл
      const fileResponse = await axios.get(fileUrl || messageData[messageData.typeMessage]?.downloadUrl, {
        responseType: 'arraybuffer',
        headers: { 'Authorization': `Bearer ${API_TOKEN}` }
      });

      const base64 = Buffer.from(fileResponse.data).toString('base64');

      let caption = prefix;
      if (messageData[messageData.typeMessage]?.caption) {
        caption += messageData[messageData.typeMessage].caption;
      }

      const payload = {
        chatId: TARGET_CHAT,
        caption: caption,
        file: base64,
      };

      let endpoint;
      if (messageData.typeMessage === "imageMessage") endpoint = "sendFileByUpload";
      else if (messageData.type === "videoMessage") endpoint = "sendFileByUpload";
      else if (messageData.type === "documentMessage") {
        payload.fileName = messageData.documentMessage?.fileName || "file";
        endpoint = "sendFileByUpload";
      }
      else if (messageData.type === "audioMessage") endpoint = "sendFileByUpload";
      else if (messageData.type === "stickerMessage") endpoint = "sendFileByUpload";

      response = await axios.post(`${GREEN_API_URL}/${endpoint}/${API_TOKEN}`, payload);
    }

    console.log("Переслано:", response.data);
  } catch (err) {
    console.error("Ошибка пересылки:", err.response?.data || err.message);
  }
}

// ========== ОСНОВНОЙ ВЕБХУК ==========
app.post('/webhook', async (req, res) => {
  const body = req.body;

  // Green-API присылает несколько типов уведомлений, нам нужны только входящие сообщения
  if (body.typeWebhook === "incomingMessageReceived" && body.messageData) {
    await forwardMessage(body.messageData);
  }

  // Важно: всегда отвечаем 200, иначе Green-API будет слать повторно
  res.status(200).send('OK');
});

// Простой роут для проверки, что сервер живой (Render требует)
app.get('/', (req, res) => {
  res.send('WhatsApp Forwarder работает! 🚀');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Установи webhook в личном кабинете Green-API:`);
  console.log(`   https://7105.api.greenapi.com/waInstance${ID_INSTANCE}/setSettings/${API_TOKEN}`);
  console.log(`   URL: https://твой-сайт.onrender.com/webhook`);
});
