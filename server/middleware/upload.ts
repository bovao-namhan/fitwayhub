import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Sanitize extension to prevent path traversal
    const ext = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '').toLowerCase();
    const safeFieldname = file.fieldname.replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, safeFieldname + '-' + uniqueSuffix + ext);
  }
});

const imageFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed'), false);
  }
};

const videoFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video or image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Upload for videos (500MB limit)
const uploadVideo = multer({
  storage: storage,
  fileFilter: videoFilter,
  limits: { fileSize: 500 * 1024 * 1024 }
});

const uploadAny = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const fontFilter = (req: any, file: any, cb: any) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (['.woff', '.woff2', '.ttf', '.otf'].includes(ext) || file.mimetype.startsWith('font/') || file.mimetype === 'application/x-font-ttf' || file.mimetype === 'application/x-font-opentype' || file.mimetype === 'application/octet-stream') {
    cb(null, true);
  } else {
    cb(new Error('Only font files (woff, woff2, ttf, otf) are allowed'), false);
  }
};

const audioFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/ogg' || file.mimetype === 'video/webm') {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed'), false);
  }
};

const uploadFont = multer({
  storage: storage,
  fileFilter: fontFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadAudio = multer({
  storage: storage,
  fileFilter: audioFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

/**
 * Middleware to optimize uploaded images using sharp.
 * Resizes to fit within maxWidth x maxHeight while preserving aspect ratio.
 * Converts to JPEG (or keeps PNG if transparent) with quality optimization.
 */
function optimizeImage(maxWidth = 1920, maxHeight = 1920, quality = 80) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const files: Express.Multer.File[] = [];

      if ((req as any).file) {
        files.push((req as any).file);
      }
      if ((req as any).files) {
        if (Array.isArray((req as any).files)) {
          files.push(...(req as any).files);
        } else {
          for (const fieldFiles of Object.values((req as any).files as Record<string, Express.Multer.File[]>)) {
            files.push(...fieldFiles);
          }
        }
      }

      for (const file of files) {
        if (!file.mimetype.startsWith('image/')) continue;

        const filePath = file.path;
        const ext = path.extname(file.originalname).toLowerCase();

        // Skip SVGs and GIFs (animated) — sharp handles them poorly
        if (ext === '.svg' || ext === '.gif') continue;

        const image = sharp(filePath);
        const metadata = await image.metadata();
        if (!metadata.width || !metadata.height) continue;

        let pipeline = sharp(filePath).rotate(); // auto-rotate based on EXIF

        // Only shrink — never upscale
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
          pipeline = pipeline.resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
          });
        }

        // Keep PNG for transparency, otherwise convert to JPEG
        const isPng = metadata.format === 'png' || ext === '.png';
        let outputBuffer: Buffer;
        if (isPng) {
          outputBuffer = await pipeline.png({ quality, compressionLevel: 8 }).toBuffer();
        } else {
          outputBuffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
          // Update filename extension to .jpg if it wasn't already
          if (ext !== '.jpg' && ext !== '.jpeg') {
            const newPath = filePath.replace(/\.[^.]+$/, '.jpg');
            await fs.promises.writeFile(newPath, outputBuffer);
            await fs.promises.unlink(filePath);
            file.path = newPath;
            file.filename = path.basename(newPath);
            file.mimetype = 'image/jpeg';
            file.size = outputBuffer.length;
            continue;
          }
        }

        await fs.promises.writeFile(filePath, outputBuffer);
        file.size = outputBuffer.length;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

export default upload;
export { upload, uploadAny, uploadVideo, uploadFont, uploadAudio, optimizeImage };
