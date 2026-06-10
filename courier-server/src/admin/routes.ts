import { Request, Response, Router } from 'express';
import fs from 'fs';
import * as lettersService from '../services/letters';
import * as usersService from '../services/users';
import { getThumbnailPath } from '../storage/fileStore';

export const adminRouter = Router();

// --- Letters ---

adminRouter.get('/letters', (_req: Request, res: Response) => {
  const letters = lettersService.getAllLetters();
  res.json(letters);
});

adminRouter.get('/letters/:id', (req: Request<{ id: string }>, res: Response) => {
  const letter = lettersService.getLetterById(req.params.id);
  if (!letter) {
    res.status(404).json({ error: 'Letter not found' });
    return;
  }
  res.json(letter);
});

adminRouter.get('/letters/:id/page/:pageNum', (req: Request<{ id: string; pageNum: string }>, res: Response) => {
  const pageHashes = lettersService.getLetterPageHashes(req.params.id);
  if (!pageHashes) {
    res.status(404).json({ error: 'Letter not found' });
    return;
  }

  const idx = parseInt(req.params.pageNum);
  if (isNaN(idx) || idx < 0 || idx >= pageHashes.length) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  const pngPath = getThumbnailPath(pageHashes[idx]);
  if (!fs.existsSync(pngPath)) {
    res.status(404).json({ error: 'Page image missing' });
    return;
  }

  res.sendFile(pngPath);
});

adminRouter.delete('/letters/:id', (req: Request<{ id: string }>, res: Response) => {
  const exists = lettersService.getLetterById(req.params.id);
  if (!exists) {
    res.status(404).json({ error: 'Letter not found' });
    return;
  }
  lettersService.deleteLetter(req.params.id);
  res.json({ ok: true });
});

// --- Users ---

adminRouter.get('/users', (_req: Request, res: Response) => {
  const users = usersService.getAllUsers();
  res.json(users);
});

adminRouter.delete('/users/:id', (req: Request<{ id: string }>, res: Response) => {
  const user = usersService.getUserById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  usersService.deleteUser(req.params.id);
  res.json({ ok: true });
});
