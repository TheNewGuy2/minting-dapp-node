// index.js
// Cloud Functions for Firebase (2nd gen), HTTP endpoint with OpenAI usage.
// - Uses defineSecret('OPENAI_API_KEY') bound at runtime.
// - Creates the OpenAI client *inside* the handler (safe for deploy analysis).
// - CORS enabled. GET returns a simple health payload; POST expects { "prompt": "..." }.

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

// Bind your OpenAI API key in Secret Manager with the exact name OPENAI_API_KEY
// and ensure the runtime service account has Secret Manager Secret Accessor.
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

exports.apiv2 = onRequest(
  {
    region: 'us-central1',
    timeoutSeconds: 60,
    memory: '256MiB',
    secrets: [OPENAI_API_KEY],
  },
  async (req, res) => {
    // --- CORS (tighten origin to your domain in production) ---//
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    // Simple browser health check
    if (req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        name: 'apiv2',
        note: 'Send POST with JSON: { "prompt": "..." }',
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
      const { prompt } = req.body || {};
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Missing "prompt" (string) in body.' });
      }

      // Lazily construct OpenAI client
      const OpenAI = require('openai');
      const apiKey = OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OPENAI_API_KEY is not set in Secret Manager or environment.');

      const client = new OpenAI({ apiKey });

      // Minimal example using Chat Completions
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a concise, helpful assistant.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      });

      const text = completion.choices?.[0]?.message?.content ?? '';
      return res.status(200).json({ text });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err?.message || 'Unknown error' });
    }
  }
);



