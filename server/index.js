import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const lastMessage = messages[messages.length - 1].content;

    const interaction = await ai.interactions.create({
      model: 'gemini-3.5-flash',
      input: lastMessage,
    });

    res.json({ reply: interaction.output_text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao chamar a API do Gemini' });
  }
});

app.listen(3001, () => console.log('Servidor rodando na porta 3001'));
