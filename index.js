// index.js
// Cloud Functions for Firebase (v2), HTTP endpoint with OpenAI usage.
// Key points:
// - Secrets are bound via defineSecret; no secrets are read at module load.
// - OpenAI client is created *inside* the handler to avoid deploy-time analysis crashes.
// - Basic CORS and input validation included.

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

// Bind your OpenAI API key via Firebase Functions secrets:
//   firebase functions:secrets:set OPENAI_API_KEY
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

exports.api = onRequest(
  {
    region: 'us-central1',
    timeoutSeconds: 60,
    memory: '256MiB',
    secrets: [OPENAI_API_KEY],
  },
  async (req, res) => {
    // --- CORS (adjust origins as needed) ---
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed. Use POST with JSON: { "prompt": "..." }',
      });
    }

    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing "prompt" (string) in body.' });
    }

    try {
      // Lazily load & construct the OpenAI client inside the handler
      const OpenAI = require('openai');
      const client = new OpenAI({
        apiKey: OPENAI_API_KEY.value(), // runtime secret; not read at deploy-time
      });

      // Minimal chat completion example
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
      const message = err?.message || 'Unknown error';
      return res.status(500).json({ error: message });
    }
  }
);
