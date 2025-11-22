const express = require("express");
const fetch = require("node-fetch");
const app = express();
app.use(express.json());

// ID групп
const ID_GROUP_A = "120363422621243676@g.us"; // группа-источник
const ID_GROUP_B = "120363404167759617@g.us"; // группа-получатель

// Данные инстанса Green-API
const ID_INSTANCE = "7105390724"; 
const API_TOKEN = "03f916929671498882ee3293c6291187d003267fdc1a4c148e";

// Вебхук Green-API
app.post("/webhook", async (req, res) => {
    const data = req.body;

    // Проверяем, есть ли текст сообщения
    if (!data?.message?.text) return res.sendStatus(200);

    const chatId = data.sender; // ID чата, откуда пришло сообщение
    const text = data.message.text;

    // Если сообщение из группы А, пересылаем в группу Б
    if (chatId === ID_GROUP_A) {
        await fetch(`https://api.green-api.com/waInstance${ID_INSTANCE}/sendMessage/${API_TOKEN}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatId: ID_GROUP_B, message: text })
        });
    }

    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Bot listening on port", PORT));
