import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { uploadRouter } from './routes/upload.js';

const app = express();

app.use(
  cors({
    origin: config.corsOrigin.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'OPTIONS'],
  })
);
app.use(express.json({ limit: '1mb' }));

app.use('/api/upload', uploadRouter);

// Serve built client in production
if (config.nodeEnv === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(config.port, () => {
  console.log(`Wedding uploader server listening on port ${config.port}`);
});
