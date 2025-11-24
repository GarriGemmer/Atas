const express = require("express");
const app = express();
app.use(express.json());

const ID_GROUP_A = "120363422621243676@g.us"; // группа-источник
const ID_GROUP_B = "120363404167759617@g.us"; // группа-получатель

const ID_INSTANCE = "7105390724";
const API_TOKEN = "03f916929671498882ee3293c6291187d003267fdc1a4c148e";

app.post("/webhook", async (req, res) => {
    console.log("Incoming webhook:", JSON.stringify(req.body, null, 2));

    const hook = req.body;

    if (hook.typeWebhook !== "incomingMessageReceived") 
        return res.sendStatus(200);

    const chatId = hook.senderData.chatId;
    const msg = hook.messageData;

    if (chatId !== ID_GROUP_A) return res.sendStatus(200);

    try {
        // --------------------------
        // 1. ТЕКСТ
        // --------------------------
        if (msg.typeMessage === "textMessage") {
            const text = msg.textMessageData?.textMessage;
            if (text) {
                await fetch(`https://api.green-api.com/waInstance${ID_INSTANCE}/sendMessage/${API_TOKEN}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chatId: ID_GROUP_B,
                        message: text
                    })
                });
                console.log("Forwarded text:", text);
            }
        }

        // --------------------------
        // 2. МЕДИА (фото, видео, голосовые, документы)
        // --------------------------
        const fileData = msg.fileMessageData || msg.voiceMessageData || msg.audioMessageData || msg.imageMessageData || msg.videoMessageData || null;

        if (fileData) {
            const fileName = fileData.fileName || "file";
            const caption = fileData.caption || "";

            // 2.1 Получаем ссылку на файл
            const dl = await fetch(`https://api.green-api.com/waInstance${ID_INSTANCE}/downloadFile/${API_TOKEN}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idMessage: hook.idMessage })
            }).then(r => r.json());

            if (dl?.urlFile) {
                // 2.2 Пересылаем файл по URL
                await fetch(`https://api.green-api.com/waInstance${ID_INSTANCE}/sendFileByUrl/${API_TOKEN}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chatId: ID_GROUP_B,
                        urlFile: dl.urlFile,
                        fileName: fileName,
                        caption: caption
                    })
                });
                console.log("Forwarded media:", fileName);
            }
        }

    } catch (err) {
        console.error("Error forwarding:", err);
    }

    res.sendStatus(200);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Bot listening on port", PORT));
