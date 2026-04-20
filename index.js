const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "whatsapp_bot_token_123";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "1004904122716846";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (message && message.type === 'text') {
    const from = message.from;
    const text = message.text.body;
    console.log(`Mesaj: ${from} → ${text}`);
    const reply = await getGeminiReply(text);
    await sendReply(from, reply);
  }
  res.sendStatus(200);
});

async function getGeminiReply(userMessage) {
  try {
    const result = await model.generateContent(userMessage);
    const response = await result.response;
    const text = response.text();
    console.log('Gemini yanıt:', text);
    return text;
  } catch (error) {
    console.error('Gemini hatası:', error);
    return 'Üzgünüm, şu an cevap veremiyorum.';
  }
}

async function sendReply(to, message) {
  await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      text: { body: message }
    })
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot çalışıyor! Port: ${PORT}`));
