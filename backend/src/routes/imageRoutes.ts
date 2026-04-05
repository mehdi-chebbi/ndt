import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// All image routes require authentication
router.use(authenticate);

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'ai-imgs');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase(); // .png, .jpg, .jpeg, .webp
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter: only allow png, jpeg, webp
const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/png', 'image/jpeg', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PNG, JPEG, and WebP images are allowed'));
  }
};

// Accept up to 20 files per upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: 20,
  },
});

// Upload one or more images
router.post('/upload-image', upload.array('images', 20), (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const images = files.map((file) => ({
      filename: file.filename,
      imageUrl: `/api/ai-images/${file.filename}`,
      originalName: file.originalname,
      size: file.size,
    }));

    res.status(201).json({ images });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

export default router;
