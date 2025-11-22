const express = require("express");
const fetch = require("node-fetch");
const app = express();
app.use(express.json());

const ID_GROUP_A = "120363422621243676@g.us";
const ID_GROUP_B = "120363404167759617@g.us";

const ID_INSTANCE = "7105390724";
const API_TOKEN = "03f916929671498882ee3293c6291187d003267fdc1a4c148e";

// Webhook
app.post("/webhook", async (req, res) => {
    console.log("Incoming webhook:", JSON.stringify(req.body, null, 2));

    const hook = req.body;

    // Проверяем, что это текстовое сообщение
    if (hook.typeWebhook !== "incomingMessageReceived") 
        return res.sendStatus(200);

    const chatId = hook.senderData.chatId;
    const text = hook.messageData?.textMessageData?.textMessage;

    if (!text) return res.sendStatus(200);

    // Проверяем только группу-источник (ID_GROUP_A)
    if (chatId === ID_GROUP_A) {
        try {
            await fetch(`https://api.green-api.com/waInstance${ID_INSTANCE}/sendMessage/${API_TOKEN}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatId: ID_GROUP_B,
                    message: text
                })
            });
            console.log("Forwarded message:", text);
        } catch (err) {
            console.error("Error forwarding message:", err);
        }
    }

    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Bot listening on port", PORT));
