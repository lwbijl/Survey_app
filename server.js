const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = 3001;

// Enable CORS for React app
app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Endpoint to generate images
app.post('/api/generate-image', async (req, res) => {
  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    console.log(`Generating image for: "${title}"`);

    // Create a professional prompt for DALL-E
    const prompt = `A professional, modern business illustration representing the concept of "${title}".
    Use vibrant colors, clean minimalist design, abstract geometric shapes, and symbolic imagery.
    Corporate style, high quality, suitable for a professional survey or workshop setting.`;

    // Generate image using DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "vivid"
    });

    const imageUrl = response.data[0].url;
    console.log(`Image generated successfully: ${imageUrl}`);

    res.json({ imageUrl });
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({
      error: 'Failed to generate image',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Image generation server running on http://localhost:${PORT}`);
});
