import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '20mb' }));

// POST /api/gemini/generate-poster-image
app.post('/api/gemini/generate-poster-image', async (req, res) => {
  try {
    const { prompt, aspectRatio = '1:1', model = 'gemini-3.1-flash-lite-image', sourceImageBase64, mimeType } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'សូមវាយបញ្ចូលការណែនាំ (Prompt is required)' });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const targetModel = model || 'gemini-3.1-flash-lite-image';

    const parts: any[] = [];
    if (sourceImageBase64) {
      const base64Data = sourceImageBase64.includes('base64,')
        ? sourceImageBase64.split('base64,')[1]
        : sourceImageBase64;
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType || 'image/jpeg',
        },
      });
    }
    parts.push({ text: prompt });

    const config: any = {
      imageConfig: {
        aspectRatio: aspectRatio || '1:1',
      },
    };

    if (targetModel === 'gemini-nano-banana-2.1') {
      config.imageConfig.imageSize = '1K';
    }

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: { parts },
      config,
    });

    let generatedImageUrl: string | null = null;
    let textResponse = '';

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        generatedImageUrl = `data:${mime};base64,${part.inlineData.data}`;
      } else if (part.text) {
        textResponse += part.text;
      }
    }

    if (!generatedImageUrl) {
      return res.status(500).json({ 
        error: 'មិនអាចបង្កើតរូបភាពបានទេ',
        details: textResponse || 'The Gemini model did not generate an image for this prompt.'
      });
    }

    return res.json({ imageUrl: generatedImageUrl, text: textResponse });
  } catch (error: any) {
    console.error('Error generating poster image via Gemini API:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate poster image' });
  }
});

// Setup Vite dev server in non-production environment
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(process.cwd(), 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
  });
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
