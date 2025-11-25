import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const ID_GROUP_A = "120363422621243676@g.us";
const ID_GROUP_B = "120363404167759617@g.us";

const ID_INSTANCE = "7105390724";
const API_TOKEN = "03f916929671498882ee3293c6291187d003267fdc1a4c148e";

const GREEN_API = `https://api.green-api.com/waInstance${ID_INSTANCE}`;

// UNIVERSAL MEDIA FORWARD FUNCTION
async function forwardMedia(url, fileName, mime, caption, sender) {
    return fetch(`${GREEN_API}/sendFileByUrl/${API_TOKEN}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            chatId: ID_GROUP_B,
            urlFile: url,
            fileName: fileName || "file",
            caption: `📩 ${sender}\n${caption || ""}`,
        })
    });
}

// MAIN WEBHOOK
app.post("/webhook", async (req, res) => {
    console.log("Incoming:", JSON.stringify(req.body, null, 2));

    const hook = req.body;

    if (hook.typeWebhook !== "incomingMessageReceived")
        return res.sendStatus(200);

    const chatId = hook.senderData.chatId;
    const sender = hook.senderData.senderName || "Unknown";

    // Только пересылка из группы А
    if (chatId !== ID_GROUP_A)
        return res.sendStatus(200);

    const msg = hook.messageData;

    try {
        // ---------- TEXT ----------
        if (msg.typeMessage === "textMessage") {
            const text = msg.textMessageData.textMessage;

            await fetch(`${GREEN_API}/sendMessage/${API_TOKEN}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatId: ID_GROUP_B,
                    message: `📩 ${sender}: ${text}`
                })
            });

            console.log("Forwarded TEXT:", text);
        }

        // ---------- MEDIA: PHOTO, VIDEO, AUDIO, DOCS ----------
        if (msg.typeMessage !== "textMessage" && msg.fileMessageData) {

            const f = msg.fileMessageData;

            await forwardMedia(
                f.downloadUrl,
                f.fileName,
                f.mimeType,
                f.caption,
                sender
            );

            console.log("Forwarded MEDIA:", f.fileName);
        }

    } catch (e) {
        console.error("Forwarding error:", e);
    }

    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Bot listening on port", PORT));
