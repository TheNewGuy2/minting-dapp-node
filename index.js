const functions = require('firebase-functions');
const express = require('express');
const app = express();
const cors = require('cors');
const OpenAI = require('openai');

//
app.use(cors());
app.use(express.json());
require('dotenv').config();


const OPEN_AI_KEY = process.env.OPEN_AI_KEY;
const openai = new OpenAI({ apiKey: OPEN_AI_KEY });

app.post('/completion', async (req, res) => {
    try {
        const completion = await openai.chat.completions.create({
            messages: req.body,
            model: 'gpt-4o',
        });
        return res.send(completion);
    } catch (error) {
        return res.status(500).send({ msg: 'Internal Server Error', error: error });
    }
});

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

exports.api = functions.https.onRequest(app);

