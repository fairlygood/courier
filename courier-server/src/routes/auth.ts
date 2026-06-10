import { Request, Response, Router } from 'express';
import { authMiddleware } from '../auth';
import { registerSchema, loginSchema, updateProfileSchema, lookupSchema, refreshSchema } from '../validation/auth';
import * as authService from '../services/auth';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  try {
    const result = await authService.register(parsed.data.displayName, parsed.data.bio, parsed.data.country, parsed.data.password);
    res.status(201).json(result);
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'Registration failed. Try again.' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const result = await authService.login(parsed.data.username, parsed.data.password);
  if (!result) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  res.json(result);
});

router.post('/refresh', (req: Request, res: Response) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const result = authService.refreshAccessToken(parsed.data.refreshToken);
  if (!result) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  res.json(result);
});

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const profile = authService.getProfile(userId);

  if (!profile) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(profile);
});

router.patch('/me', authMiddleware, (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const result = authService.updateProfile(userId, parsed.data.displayName, parsed.data.bio, parsed.data.country);
  res.json(result);
});

router.get('/lookup', authMiddleware, (req: Request, res: Response) => {
  const parsed = lookupSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const result = authService.lookupUser(parsed.data.username, req.auth!.userId);
  res.json(result);
});

export default router;
