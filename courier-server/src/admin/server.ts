import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import { adminRouter } from './routes';

const ADMIN_PASSWORD = crypto.randomBytes(32).toString('hex');

export function getAdminPassword(): string {
  return ADMIN_PASSWORD;
}

function adminMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing admin token' });
    return;
  }
  const token = header.slice(7);
  if (token !== ADMIN_PASSWORD) {
    res.status(403).json({ error: 'Invalid admin token' });
    return;
  }
  next();
}

export function startAdminServer(port: number): void {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Serve admin UI
  const publicDir = path.join(__dirname, '..', 'public');
  app.use('/admin', express.static(publicDir, { index: 'admin.html' }));

  // Admin API routes — all behind admin auth
  app.use('/api/admin', adminMiddleware, adminRouter);

  app.listen(port, '0.0.0.0', () => {
    console.log('');
    console.log('┌──────────────────────────────────────────────┐');
    console.log('│  Courier admin server                        │');
    console.log(`│  http://0.0.0.0:${port}/admin                    │`);
    console.log(`│  Password: ${ADMIN_PASSWORD}  │`);
    console.log('└──────────────────────────────────────────────┘');
    console.log('');
  });
}
