const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "whatsapp_bot_token_123";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "1004904122716846";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userMessage }] }]
      })
    });
    const data = await response.json();
    console.log('Gemini yanıt:', JSON.stringify(data));
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text;
    } else {
      console.error('Beklenmeyen yanıt:', JSON.stringify(data));
      return 'Üzgünüm, şu an cevap veremiyorum.';
    }
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
