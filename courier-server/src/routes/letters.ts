import { Request, Response, Router } from 'express';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../auth';
import { createLetterSchema } from '../validation/letters';
import * as lettersService from '../services/letters';
import { getThumbnailPath } from '../storage/fileStore';
import multer from 'multer';

const upload = multer({ dest: path.join(__dirname, '..', '..', 'data', 'tmp') });
const router = Router();

router.post('/', authMiddleware, upload.array('pages', 50), (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const files = req.files as Express.Multer.File[] | undefined;

  const parsed = createLetterSchema.safeParse({
    ...req.body,
    pages: files,
  });

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  const { description, recipientUsername, isPublic } = parsed.data;

  let recipientId: string | null = null;
  if (recipientUsername) {
    recipientId = lettersService.resolveRecipient(recipientUsername);
    if (!recipientId) {
      res.status(404).json({ error: 'Recipient not found' });
      return;
    }
  }

  const pub = typeof isPublic === 'string' ? isPublic === 'true' : !!isPublic;
  const result = lettersService.createLetter(
    userId,
    files!,
    description || '',
    recipientId,
    pub,
  );

  res.status(201).json(result);
});

router.get('/inbox', authMiddleware, (req: Request, res: Response) => {
  const letters = lettersService.getInbox(req.auth!.userId);
  res.json(letters);
});

router.get('/feed', authMiddleware, (_req: Request, res: Response) => {
  const letters = lettersService.getFeed();
  res.json(letters);
});

router.get('/sent', authMiddleware, (req: Request, res: Response) => {
  const letters = lettersService.getSent(req.auth!.userId);
  res.json(letters);
});

router.get('/:id', authMiddleware, (req: Request<{ id: string }>, res: Response) => {
  if (!lettersService.canUserAccessLetter(req.auth!.userId, req.params.id)) {
    res.status(404).json({ error: 'Letter not found' });
    return;
  }

  const letter = lettersService.getLetterById(req.params.id);
  res.json(letter);
});

router.get('/:id/download', authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  if (!lettersService.canUserAccessLetter(req.auth!.userId, req.params.id)) {
    res.status(404).json({ error: 'Letter not found' });
    return;
  }

  // Mark as read when the recipient downloads (no-op if not the recipient)
  lettersService.markLetterAsRead(req.params.id, req.auth!.userId);

  const pageHashes = lettersService.getLetterPageHashes(req.params.id);
  if (!pageHashes) {
    res.status(404).json({ error: 'Letter not found' });
    return;
  }

  for (const hash of pageHashes) {
    const p = getThumbnailPath(hash);
    if (!fs.existsSync(p)) {
      res.status(404).json({ error: 'Page files missing from server' });
      return;
    }
  }

  try {
    const letter = lettersService.getLetterById(req.params.id);
    const coverMeta = letter ? {
      authorName: letter.authorName,
      authorUsername: letter.authorUsername,
      createdAt: letter.createdAt,
    } : undefined;

    const pdf = await lettersService.generatePdf(pageHashes, coverMeta);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="letter.pdf"`);
    res.send(pdf);
  } catch {
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

router.get('/:id/page/:pageNum', authMiddleware, (req: Request<{ id: string; pageNum: string }>, res: Response) => {
  if (!lettersService.canUserAccessLetter(req.auth!.userId, req.params.id)) {
    res.status(404).json({ error: 'Letter not found' });
    return;
  }

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

router.delete('/:id', authMiddleware, (req: Request<{ id: string }>, res: Response) => {
  const authorId = lettersService.getLetterAuthorId(req.params.id);
  if (!authorId) {
    res.status(404).json({ error: 'Letter not found' });
    return;
  }
  if (authorId !== req.auth!.userId) {
    res.status(403).json({ error: 'Not your letter' });
    return;
  }

  lettersService.deleteLetter(req.params.id);
  res.json({ ok: true });
});

export default router;
