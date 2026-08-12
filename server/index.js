import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const app = express();                    // ← isso precisa vir ANTES
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// rota do chat (Gemini) - já existia
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

// rotas novas do Meshy (3D) - vêm DEPOIS de "const app = express()"
const MESHY_BASE_URL = 'https://api.meshy.ai/openapi/v2';

// A Meshy trabalha em 2 etapas: "preview" (malha sem textura) e "refine"
// (aplica textura). Esse mapa guarda, em memória, qual refine_task_id
// corresponde a cada preview_task_id, para o front-end continuar usando
// um único taskId do início ao fim (igual funcionava com a Tripo).
const refineTaskMap = new Map();

// Normaliza o status da Meshy (PENDING/IN_PROGRESS/SUCCEEDED/FAILED/CANCELED)
// para o vocabulário que o front-end já espera (success/failed/cancelled).
function normalizeStatus(meshyStatus) {
  const map = {
    SUCCEEDED: 'success',
    FAILED: 'failed',
    CANCELED: 'cancelled',
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
  };
  return map[meshyStatus] || meshyStatus?.toLowerCase();
}

app.post('/api/generate-3d', async (req, res) => {
  try {
    const { prompt } = req.body;

    const response = await fetch(`${MESHY_BASE_URL}/text-to-3d`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MESHY_API_KEY}`,
      },
      body: JSON.stringify({
        mode: 'preview',
        prompt,
        art_style: 'realistic',
        should_remesh: true,
      }),
    });

    const data = await response.json();
    console.log('Resposta da Meshy (preview):', JSON.stringify(data, null, 2));
    // Meshy retorna { result: "<task_id>" }
    res.json({ task_id: data.result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar tarefa de geração 3D' });
  }
});

app.get('/api/task/:id', async (req, res) => {
  try {
    const clientId = req.params.id;
    // Se já existe uma etapa de refine em andamento para esse id, consulta ela
    const actualId = refineTaskMap.get(clientId) || clientId;

    const response = await fetch(`${MESHY_BASE_URL}/text-to-3d/${actualId}`, {
      headers: { Authorization: `Bearer ${process.env.MESHY_API_KEY}` },
    });
    const data = await response.json();

    // Etapa 1 (preview) terminou e o refine ainda não foi disparado:
    // dispara o refine automaticamente e devolve "em andamento" pro front-end.
    if (data.status === 'SUCCEEDED' && actualId === clientId && !refineTaskMap.has(clientId)) {
      const refineResponse = await fetch(`${MESHY_BASE_URL}/text-to-3d`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.MESHY_API_KEY}`,
        },
        body: JSON.stringify({
          mode: 'refine',
          preview_task_id: clientId,
          enable_pbr: true,
        }),
      });
      const refineData = await refineResponse.json();
      refineTaskMap.set(clientId, refineData.result);

      return res.json({ status: 'in_progress', progress: 0 });
    }

    res.json({
      status: normalizeStatus(data.status),
      progress: data.progress,
      output: { model_url: data.model_urls?.glb || null },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao consultar tarefa' });
  }
});

app.post('/api/generate-3d-image', async (req, res) => {
  try {
    const { image_base64 } = req.body;
    console.log('Prefixo recebido:', image_base64?.substring(0, 50));

    const response = await fetch('https://api.meshy.ai/openapi/v1/image-to-3d', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MESHY_API_KEY}`,
      },
      body: JSON.stringify({
        image_url: image_base64, // aceita data URI base64 direto
        enable_pbr: true,
        should_texture: true,
      }),
    });

    const data = await response.json();
    console.log('Resposta da Meshy (image-to-3d):', JSON.stringify(data, null, 2));
    res.json({ task_id: data.result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar tarefa de geração 3D a partir de imagem' });
  }
});

app.get('/api/task-image/:id', async (req, res) => {
  try {
    const response = await fetch(`https://api.meshy.ai/openapi/v1/image-to-3d/${req.params.id}`, {
      headers: { Authorization: `Bearer ${process.env.MESHY_API_KEY}` },
    });
    const data = await response.json();

    res.json({
      status: normalizeStatus(data.status),
      progress: data.progress,
      output: { model_url: data.model_urls?.glb || null },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao consultar tarefa de imagem' });
  }
});

app.listen(3001, () => console.log('Servidor rodando na porta 3001'));   // ← isso precisa vir por ÚLTIMO