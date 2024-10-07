const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const app = express();
// const port = 3000;
const port = process.env.PORT || 3000;

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Serve the HTML form
app.get("/", (req, res) => {
  res.send(`
    <html>
    <head>
      <title>SVG/PNG to GIF Converter</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background-color: #f0f0f0;
          margin: 0;
        }
        form {
          background: #fff;
          padding: 20px;
          border-radius: 5px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          text-align: center;
        }
        input[type="file"], button {
          margin: 10px 0;
        }
        .drop-area {
          border: 2px dashed #ccc;
          padding: 20px;
          border-radius: 5px;
          margin-bottom: 10px;
          cursor: pointer;
          background-color: #fafafa;
          transition: background-color 0.3s;
        }
        .drop-area.dragover {
          background-color: #e0e0e0;
        }
        #file-name {
          margin-top: 10px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <form action="/upload" method="POST" enctype="multipart/form-data">
        <h2>Upload an SVG or PNG to Convert to GIF</h2>
        <p>File will be resized to fit within a 400x160 canvas while keeping aspect ratio.</p>
        <p>Transparent backgrounds will be converted to white.</p>
        <div id="drop-area" class="drop-area">
          Drag & Drop your file here or click to select
        </div>
        <input type="file" name="image" accept="image/svg+xml, image/png" required hidden />
        <div id="file-name"></div>
        <button type="submit">Upload</button>
      </form>

      <script>
        const dropArea = document.getElementById('drop-area');
        const fileInput = document.querySelector('input[name="image"]');
        const fileNameDisplay = document.getElementById('file-name');

        // Highlight the drop area when file is dragged over
        dropArea.addEventListener('dragover', (e) => {
          e.preventDefault();
          dropArea.classList.add('dragover');
        });

        dropArea.addEventListener('dragleave', () => {
          dropArea.classList.remove('dragover');
        });

        // Handle file drop
        dropArea.addEventListener('drop', (e) => {
          e.preventDefault();
          dropArea.classList.remove('dragover');
          fileInput.files = e.dataTransfer.files; // Transfer dropped files to input
          displayFileName(fileInput.files[0].name);
        });

        // Allow clicking on the drop area to select a file
        dropArea.addEventListener('click', () => fileInput.click());
        
        // Display file name when input changes
        fileInput.addEventListener('change', () => {
          displayFileName(fileInput.files[0].name);
        });

        // Function to display file name
        function displayFileName(name) {
          fileNameDisplay.textContent = \`Selected File: \${name}\`;
        }
      </script>
    </body>
    </html>
  `);
});

// Handle file upload and conversion
app.post("/upload", upload.single("image"), async (req, res) => {
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
  console.log(`Server running on http://localhost:${port}`);
});
