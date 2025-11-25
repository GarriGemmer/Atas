const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json({ limit: "50mb" }));

// ======== ВАШИ ДАННЫЕ ========
const ID_INSTANCE = "7105390724"; 
const API_TOKEN = "03f916929671498882ee3293c6291187d003267fdc1a4c148e"; 
const SOURCE_CHAT = "120363422621243676@g.us";  // группа источник
const TARGET_CHAT = "120363404167759617@g.us";  // группа получатель
// ============================

// ======== ФУНКЦИИ ========
async function sendText(chatId, message) {
  await axios.post(`https://api.green-api.com/waInstance${ID_INSTANCE}/sendMessage/${API_TOKEN}`, {
    chatId,
    message
  });
}

async function sendFile(chatId, base64, fileName, caption) {
  await axios.post(`https://api.green-api.com/waInstance${ID_INSTANCE}/sendFile/${API_TOKEN}`, {
    chatId,
    base64,
    fileName,
    caption
  });
}

// скачиваем файл с downloadUrl и конвертим в base64
async function downloadFileFromUrl(url) {
  const res = await axios.get(url, { responseType: "arraybuffer" });
  const base64 = Buffer.from(res.data, "binary").toString("base64");
  return base64;
}

// ======== WEBHOOK ========
app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body;
    console.log("Incoming:", JSON.stringify(msg, null, 2));

    res.sendStatus(200); // сразу отвечаем Green-API

    // игнорируем ненужные уведомления
    if (msg.typeWebhook !== "incomingMessageReceived") return;

    const chatId = msg.senderData?.chatId;
    if (chatId !== SOURCE_CHAT) return; // только нужная группа

    const senderName = msg.senderData?.senderName || msg.senderData?.senderContactName || "Unknown";

    const type = msg.messageData.typeMessage;

    // ====== 1️⃣ ТЕКСТ ======
    if (type === "textMessage") {
      const text = msg.messageData.textMessageData.textMessage;
      await sendText(TARGET_CHAT, `*${senderName}:*\n${text}`);
      return;
    }

    // ====== 2️⃣ МЕДИА ======
    const fileData = msg.messageData.fileMessageData || msg.messageData.audioMessage || msg.messageData.videoMessage || msg.messageData.documentMessage;
    if (fileData) {
      const url = fileData.downloadUrl;
      if (!url) return;

      const base64 = await downloadFileFromUrl(url);

      let caption = "";
      switch (type){
        case "imageMessage":
          caption = `📸 Фото от ${senderName}`;
          break;
        case "videoMessage":
          caption = `🎥 Видео от ${senderName}`;
          break;
        case "audioMessage":
        case "pttMessage":
        case "voiceMessage":
          caption = `🎤 Голосовое от ${senderName}`;
          break;
        case "documentMessage":
          caption = `📄 Документ от ${senderName}`;
          break;
        default:
          caption = `📎 Файл от ${senderName}`;
      }

      await sendFile(TARGET_CHAT, base64, fileData.fileName, caption);
    }

  } catch (err) {
    console.error("ERROR:", err.response?.data || err.message);
  }
});

// ======== ЗАПУСК СЕРВЕРА ========
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
