const express = require("express");
const app = express();
app.use(express.json());

// ----------------------------------
// Настройки
// ----------------------------------
const ID_GROUP_FROM = "120363422621243676@g.us"; // откуда пересылать
const ID_GROUP_TO   = "120363404167759617@g.us"; // куда пересылать

const ID_INSTANCE = "7105390724";
const API_TOKEN   = "03f916929671498882ee3293c6291187d003267fdc1a4c148e";

// ----------------------------------
// отправка текста
// ----------------------------------
async function sendText(chatId, text) {
    await fetch(`https://api.green-api.com/waInstance${ID_INSTANCE}/sendMessage/${API_TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chatId: chatId,
            message: text
        })
    });
}

// ----------------------------------
// отправка медиа по URL
// ----------------------------------
async function sendMedia(chatId, url, fileName, caption) {
    await fetch(`https://api.green-api.com/waInstance${ID_INSTANCE}/sendFileByUrl/${API_TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chatId: chatId,
            urlFile: url,
            fileName: fileName || "file",
            caption: caption || ""
        })
    });
}



// ----------------------------------
// Вебхук
// ----------------------------------
app.post("/webhook", async (req, res) => {
    const msg = req.body;

    console.log("Incoming:", JSON.stringify(msg, null, 2));

    // принимаем только реальные входящие сообщения
    if (msg.type !== "incoming") return res.sendStatus(200);

    // проверяем группу-источник
    if (msg.chatId !== ID_GROUP_FROM) return res.sendStatus(200);

    const sender = msg.senderName || "Unknown";
    const type = msg.typeMessage;

    try {
        // -------------------------------
        // 1. Пересылка текста
        // -------------------------------
        if (type === "textMessage") {
            await sendText(
                ID_GROUP_TO,
                `${sender}: ${msg.textMessage}`
            );
        }

        // -------------------------------
        // 2. Пересылка всех медиа
        // -------------------------------
        const mediaTypes = [
            "imageMessage",
            "videoMessage",
            "audioMessage",
            "voiceMessage",
            "documentMessage",
            "pttMessage"
        ];

        if (mediaTypes.includes(type)) {
            await sendMedia(
                ID_GROUP_TO,
                msg.downloadUrl,
                msg.fileName,
                `${sender} ${msg.caption || ""}`
            );
        }

    } catch (err) {
        console.error("FORWARD ERROR:", err);
    }

    res.sendStatus(200);
});



// ----------------------------------
// Старт
// ----------------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server started on", PORT));
