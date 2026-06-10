import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import lettersRoutes from './routes/letters';
import { startAdminServer } from './admin/server';

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PORT = process.env.ADMIN_PORT ? Number(process.env.ADMIN_PORT) : 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/letters', lettersRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const HOST = process.env.HOST || '0.0.0.0';

app.listen(Number(PORT), HOST, () => {
  console.log(`Courier server running on http://${HOST}:${PORT}`);
});

startAdminServer(ADMIN_PORT);
