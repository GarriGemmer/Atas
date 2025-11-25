const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json({ limit: "50mb" }));

// Переменные из Render Dashboard → Environment
const ID_INSTANCE = process.env.ID_INSTANCE;
const API_TOKEN = process.env.API_TOKEN;
const TARGET_CHAT = process.env.TARGET_CHAT;

// Функция отправки сообщений
async function sendGreen(method, body) {
  const url = `https://api.green-api.com/waInstance${ID_INSTANCE}/${method}/${API_TOKEN}`;
  return axios.post(url, body);
}

app.post("/webhook", async (req, res) => {
  console.log("Incoming:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);

  try {
    const msg = req.body;
    if (!msg.messageData) return;

    const senderName =
      msg.senderData?.senderName ||
      msg.senderData?.senderContactName ||
      "Unknown";

    const type = msg.messageData.typeMessage;

    // =============================
    // 📌 1. ТЕКСТ
    // =============================
    if (type === "textMessage") {
      const text = msg.messageData.textMessageData.textMessage;

      await sendGreen("sendMessage", {
        chatId: TARGET_CHAT,
        message: `*${senderName}:*\n${text}`,
      });

      return;
    }

    // =============================
    // 📌 2. ФАЙЛЫ (универсальный метод)
    // =============================
    if (msg.messageData.fileMessageData) {
      const f = msg.messageData.fileMessageData;

      let caption = "";
      if (type === "imageMessage") caption = `📸 Фото от ${senderName}`;
      if (type === "videoMessage") caption = `🎥 Видео от ${senderName}`;
      if (type === "voiceMessage" || type === "pttMessage")
        caption = `🎤 Голосовое от ${senderName}`;
      if (type === "documentMessage")
        caption = `📄 Документ от ${senderName}`;
      if (!caption) caption = `📎 Файл от ${senderName}`;

      await sendGreen("sendFileByUrl", {
        chatId: TARGET_CHAT,
        urlFile: f.downloadUrl,
        fileName: f.fileName,
        caption,
      });

      return;
    }

  } catch (err) {
    console.error("ERROR:", err.response?.data || err.message);
  }
});

app.listen(10000, () => console.log("Server listening on 10000"));
