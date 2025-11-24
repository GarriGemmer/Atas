const express = require("express");
const app = express();
app.use(express.json());

// ---------------------------
// Настройки
// ---------------------------
const ID_GROUP_A = "120363422621243676@g.us"; // группа-источник
const ID_GROUP_B = "120363404167759617@g.us"; // группа-получатель

const ID_INSTANCE = "7105390724"; 
const API_TOKEN = "03f916929671498882ee3293c6291187d003267fdc1a4c148e";

// ---------------------------
// Вебхук
// ---------------------------
app.post("/webhook", async (req, res) => {
    const hook = req.body;

    console.log("Incoming webhook:", JSON.stringify(hook, null, 2));

    // Проверяем тип сообщения
    if (hook.typeWebhook !== "incomingMessageReceived") {
        return res.sendStatus(200);
    }

    const chatId = hook.senderData.chatId;
    const senderName = hook.senderData.senderName || hook.senderData.senderContactName || "Unknown";
    const msg = hook.messageData;

    // Проверяем группу-источник
    if (chatId !== ID_GROUP_A) return res.sendStatus(200);

    try {
        // ---------------------------
        // 1. ТЕКСТ
        // ---------------------------
        if (msg.typeMessage === "textMessage") {
            const text = msg.textMessageData?.textMessage;
            if (text) {
                await fetch(`https://api.green-api.com/waInstance${ID_INSTANCE}/sendMessage/${API_TOKEN}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chatId: ID_GROUP_B,
                        message: `${senderName}: ${text}`
                    })
                });
                console.log("Forwarded text:", text);
            }
        }

        // ---------------------------
        // 2. МЕДИА (фото, видео, аудио, голосовые, документы)
        // ---------------------------
        const mediaTypes = ["imageMessage", "videoMessage", "audioMessage", "voiceMessage", "documentMessage"];

        if (mediaTypes.includes(msg.typeMessage)) {
            const url = msg.downloadUrl;
            const name = msg.fileName || `${msg.typeMessage}_${hook.idMessage}`;
            const caption = msg.caption || "";

            if (url) {
                await fetch(`https://api.green-api.com/waInstance${ID_INSTANCE}/sendFileByUrl/${API_TOKEN}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chatId: ID_GROUP_B,
                        urlFile: url,
                        fileName: name,
                        caption: caption ? `${senderName}: ${caption}` : `${senderName}`
                    })
                });
                console.log("Forwarded media:", name);
            }
        }

    } catch (err) {
        console.error("Error forwarding:", err);
    }

    res.sendStatus(200);
});

// ---------------------------
// Запуск сервера
// ---------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Bot listening on port", PORT));
