const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase configuration for image storage
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Service role key for storage uploads
const STORAGE_BUCKET = 'survey-images';

// Enable CORS for React app (supports both development and production)
const allowedOrigins = [
  'http://localhost:3000',
  'http://10.47.120.26:3000',
  process.env.FRONTEND_URL, // Vercel URL will be set as environment variable
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(allowed => origin?.startsWith(allowed))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Helper function to upload image to Supabase Storage
async function uploadToSupabaseStorage(imageBuffer, filename) {
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${filename}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'image/png',
      'x-upsert': 'true' // Overwrite if exists
    },
    body: imageBuffer
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload to Supabase Storage: ${response.status} - ${errorText}`);
  }

  // Return the public URL for the uploaded image
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${filename}`;
}

// Endpoint to generate images
app.post('/api/generate-image', async (req, res) => {
  try {
    const { title, surveyId } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    console.log(`Generating image for: "${title}"`);

    // Create a professional prompt for DALL-E
    const prompt = `A professional, modern business illustration representing the concept of "${title}".
    Use vibrant colors, clean minimalist design, abstract geometric shapes, and symbolic imagery.
    Corporate style, high quality, suitable for a professional survey or workshop setting.`;

    // Generate image using DALL-E 3
    const dalleResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "vivid"
    });

    const tempImageUrl = dalleResponse.data[0].url;
    console.log(`Image generated from DALL-E: ${tempImageUrl}`);

    // Download the image from DALL-E (temporary URL)
    console.log('Downloading image from DALL-E...');
    const imageResponse = await fetch(tempImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image from DALL-E: ${imageResponse.status}`);
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    console.log(`Image downloaded, size: ${imageBuffer.length} bytes`);

    // Upload to Supabase Storage for permanent storage
    const filename = `survey-${surveyId || Date.now()}-${Date.now()}.png`;
    console.log(`Uploading to Supabase Storage as: ${filename}`);

    const permanentUrl = await uploadToSupabaseStorage(imageBuffer, filename);
    console.log(`Image uploaded successfully: ${permanentUrl}`);

    res.json({ imageUrl: permanentUrl });
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Image generation server running on port ${PORT}`);
});
