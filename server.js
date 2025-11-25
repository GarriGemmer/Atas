const express = require("express");
const fetch = require("node-fetch");
const app = express();
app.use(express.json());

// === НАСТРОЙКИ ===
const ID_INSTANCE = "7105390724"; // Ваш ID_INSTANCE
const API_TOKEN = "03f916929671498882ee3293c6291187d003267fdc1a4c148e"; // Ваш API_TOKEN
const ID_GROUP_A = "120363422621243676@g.us"; // Группа источник
const ID_GROUP_B = "120363404167759617@g.us"; // Группа-получатель

// === Функция отправки текста ===
async function sendText(chatId, text) {
  await fetch(`https://api.green-api.com/waInstance${ID_INSTANCE}/sendMessage/${API_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chatId,
      message: text
    })
  });
}

// === Функция отправки файла через downloadUrl ===
async function sendFile(chatId, url, filename, caption, mimeType) {
  await fetch(`https://api.green-api.com/waInstance${ID_INSTANCE}/sendFile/${API_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chatId,
      url,
      filename,
      caption,
      type: mimeType
    })
  });
}

// === Вебхук Green-API ===
app.post("/webhook", async (req, res) => {
  const hook = req.body;
  console.log("Incoming:", JSON.stringify(hook, null, 2));

  if (hook.typeWebhook !== "incomingMessageReceived") return res.sendStatus(200);

  const chatId = hook.senderData.chatId;
  const senderName = hook.senderData.senderName || hook.senderData.senderContactName || "Someone";

  // Пересылка только из группы-источника
  if (chatId === ID_GROUP_A) {
    try {
      const msgData = hook.messageData;

      if (msgData.typeMessage === "textMessage") {
        // Текст
        await sendText(ID_GROUP_B, `${senderName}: ${msgData.textMessageData.textMessage}`);
        console.log("Forwarded text:", msgData.textMessageData.textMessage);
      } else if (msgData.typeMessage === "imageMessage") {
        // Фото
        await sendFile(ID_GROUP_B, msgData.fileMessageData.downloadUrl, msgData.fileMessageData.fileName, `${senderName}: ${msgData.fileMessageData.caption || ""}`, "image/jpeg");
        console.log("Forwarded image:", msgData.fileMessageData.fileName);
      } else if (msgData.typeMessage === "audioMessage") {
        // Аудио
        await sendFile(ID_GROUP_B, msgData.downloadUrl, msgData.fileName, `${senderName}`, "audio/ogg");
        console.log("Forwarded audio:", msgData.fileName);
      } else if (msgData.typeMessage === "videoMessage") {
        // Видео
        await sendFile(ID_GROUP_B, msgData.downloadUrl, msgData.fileName, `${senderName}`, "video/mp4");
        console.log("Forwarded video:", msgData.fileName);
      } else {
        console.log("Message type not supported:", msgData.typeMessage);
      }
    } catch (err) {
      console.error("Error forwarding message:", err);
    }
  }

  res.sendStatus(200);
});

// === Запуск сервера ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Bot listening on port", PORT));
