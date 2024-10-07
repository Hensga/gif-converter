const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Serve the static files in the public directory
app.use(express.static(path.join(__dirname, "../public")));

// Serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html"));
});

// Handle file upload and conversion
app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    const buffer = req.file.buffer;

    // Render SVG/PNG and resize to fit within 400x160 canvas while keeping aspect ratio
    const renderedImage = await sharp(buffer)
      .resize({
        width: 400,
        height: 160,
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer();

    // Create a 400x160 white background canvas
    const background = await sharp({
      create: {
        width: 400,
        height: 160,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    // Composite the rendered image over the white background
    const outputBuffer = await sharp(background)
      .composite([{ input: renderedImage, gravity: "center" }])
      .gif()
      .toBuffer();

    // Send the buffer as a file download
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="converted.gif"',
    );
    res.setHeader("Content-Type", "image/gif");
    res.send(outputBuffer);
  } catch (error) {
    console.error("Error during conversion:", error);
    res.status(500).send("An error occurred during conversion.");
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

module.exports = app;
