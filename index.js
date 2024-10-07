const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Serve the HTML form
app.get('/', (req, res) => {
  res.send(`
    <h2>Upload an SVG to Convert to GIF</h2>
    <form action="/upload" method="POST" enctype="multipart/form-data">
      <input type="file" name="image" accept="image/svg+xml" required />
      <button type="submit">Upload</button>
    </form>
  `);
});

// Handle file upload and conversion
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const buffer = req.file.buffer;

    // Render SVG as PNG with correct dimensions
    const renderedSvg = await sharp(buffer)
      .resize(400) // Resize to width 400px, maintaining aspect ratio
      .png()
      .toBuffer();

    // Create a 400x160 white background canvas
    const background = await sharp({
      create: {
        width: 400,
        height: 160,
        channels: 4, // RGBA channels
        background: { r: 255, g: 255, b: 255, alpha: 1 }, // White background
      }
    })
      .png()
      .toBuffer();

    // Composite the rendered SVG PNG over the white background
    const outputBuffer = await sharp(background)
      .composite([{ input: renderedSvg, gravity: 'center' }]) // Center the SVG on the white canvas
      .gif()
      .toBuffer();

    const outputPath = path.join(__dirname, 'output.gif');
    fs.writeFileSync(outputPath, outputBuffer);

    // Send the converted image as a download
    res.download(outputPath, 'converted.gif', (err) => {
      if (err) console.error('Error sending file:', err);
      fs.unlinkSync(outputPath); // Clean up file after sending
    });
  } catch (error) {
    console.error('Error during conversion:', error);
    res.status(500).send('An error occurred during conversion.');
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
