const express = require("express");
const fetch = require("node-fetch");
const app = express();
app.use(express.json());

const ID_GROUP_FROM = "120363422621243676@g.us"; 
const ID_GROUP_TO   = "120363404167759617@g.us";

const ID_INSTANCE = "7105390724";
const API_TOKEN   = "03f916929671498882ee3293c6291187d003267fdc148e";

// -----------------------
// Отправка текста
// -----------------------
async function sendText(chatId, text) {
    await fetch(`https://api.green-api.com/waInstance${ID_INSTANCE}/sendMessage/${API_TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message: text })
    });
}

// -----------------------
// Отправка медиа
// -----------------------
async function sendMedia(chatId, url, fileName, caption) {
    await fetch(`https://api.green-api.com/waInstance${ID_INSTANCE}/sendFileByUrl/${API_TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chatId,
            urlFile: url,
            fileName: fileName || "file",
            caption: caption || ""
        })
    });
}


// -----------------------
// Вебхук
// -----------------------
app.post("/webhook", async (req, res) => {
    const data = req.body;

    console.log("Incoming:", JSON.stringify(data, null, 2));

    try {
        // ============================================================
        // 1) ФОРМАТ №1 → incomingMessageReceived (только текст)
        // ============================================================
        if (data.typeWebhook === "incomingMessageReceived") {

            const chatId = data.senderData.chatId;
            if (chatId !== ID_GROUP_FROM) return res.sendStatus(200);

            const sender = data.senderData.senderName || "Unknown";
            const typeMsg = data.messageData.typeMessage;

            if (typeMsg === "textMessage") {
                const text = data.messageData.textMessageData.textMessage;
                await sendText(ID_GROUP_TO, `${sender}: ${text}`);
            }

            return res.sendStatus(200);
        }

        // ============================================================
        // 2) ФОРМАТ №2 → incoming (фото / аудио / видео / док)
        // ============================================================
        if (data.type === "incoming") {

            if (data.chatId !== ID_GROUP_FROM) return res.sendStatus(200);

            const sender = data.senderName || "Unknown";
            const typeMsg = data.typeMessage;

            // Пересылка медиа
            if (data.downloadUrl) {
                await sendMedia(
                    ID_GROUP_TO,
                    data.downloadUrl,
                    data.fileName,
                    `${sender}: ${data.caption || ""}`
                );
            }

            return res.sendStatus(200);
        }

    } catch (err) {
        console.error("FORWARD ERROR:", err);
    }

    res.sendStatus(200);
});


// -----------------------
// Старт
// -----------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server started on", PORT));
