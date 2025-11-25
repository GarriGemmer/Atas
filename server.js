const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const app = express();

app.use(express.json({ limit: "50mb" }));

// === ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ ===
const ID_INSTANCE = process.env.ID_INSTANCE; // твой ID Instance
const API_TOKEN = process.env.API_TOKEN;     // твой API Token
const TARGET_CHAT = process.env.TARGET_CHAT; // куда пересылать

// === Функция отправки текста
async function sendText(chatId, message) {
  await axios.post(`https://api.green-api.com/waInstance${ID_INSTANCE}/sendMessage/${API_TOKEN}`, {
    chatId,
    message
  });
}

// === Функция отправки файла через base64
async function sendFile(chatId, fileBase64, fileName, caption) {
  await axios.post(`https://api.green-api.com/waInstance${ID_INSTANCE}/sendFile/${API_TOKEN}`, {
    chatId,
    base64: fileBase64,
    fileName,
    caption
  });
}

// === Получаем файл в base64 через Green API
async function downloadFile(fileName) {
  const url = `https://api.green-api.com/waInstance${ID_INSTANCE}/downloadFile/${API_TOKEN}?fileName=${fileName}`;
  const response = await axios.get(url);
  return response.data; // base64
}

// === Webhook
app.post("/webhook", async (req, res) => {
  console.log("Incoming:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200); // сразу отвечаем Green-API

  try {
    const msg = req.body;
    if (!msg.messageData) return;

    const senderName =
      msg.senderData?.senderName ||
      msg.senderData?.senderContactName ||
      "Unknown";

    const type = msg.messageData.typeMessage;

    // === 1️⃣ ТЕКСТ
    if (type === "textMessage") {
      const text = msg.messageData.textMessageData.textMessage;
      await sendText(TARGET_CHAT, `*${senderName}:*\n${text}`);
      return;
    }

    // === 2️⃣ ФАЙЛЫ (фото, видео, документы, голосовые)
    const fileData = msg.messageData.fileMessageData;
    if (fileData) {
      const fileBase64 = await downloadFile(fileData.fileName);
      let caption = "";

      switch(type){
        case "imageMessage":
          caption = `📸 Фото от ${senderName}`;
          break;
        case "videoMessage":
          caption = `🎥 Видео от ${senderName}`;
          break;
        case "voiceMessage":
        case "pttMessage":
        case "audioMessage":
          caption = `🎤 Голосовое от ${senderName}`;
          break;
        case "documentMessage":
          caption = `📄 Документ от ${senderName}`;
          break;
        default:
          caption = `📎 Файл от ${senderName}`;
      }

      await sendFile(TARGET_CHAT, fileBase64, fileData.fileName, caption);
      return;
    }

  } catch (err) {
    console.error("ERROR:", err.response?.data || err.message);
  }
});

// === Запуск сервера
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
