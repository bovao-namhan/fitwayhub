import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';
import { query as dbQuery } from '../config/database';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// ── Cloudflare R2 Client (S3-compatible) ─────────────────────────────────────
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Upload a buffered file to Cloudflare R2.
 * @param file  The multer file with a populated `buffer` property.
 * @param folder  Logical folder prefix inside the bucket (e.g. 'images', 'videos').
 * @returns  The public URL of the uploaded object.
 */
export async function uploadToR2(file: Express.Multer.File, folder = 'uploads'): Promise<string> {
  const ext = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '').toLowerCase() || '.bin';
  const safeFieldname = file.fieldname.replace(/[^a-zA-Z0-9_-]/g, '');
  const key = `${folder}/${safeFieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

// ── All multer instances use memory storage ───────────────────────────────────
const storage = multer.memoryStorage();

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

// Upload for videos (40MB limit)
const uploadVideo = multer({
  storage: storage,
  fileFilter: videoFilter,
  limits: { fileSize: 40 * 1024 * 1024 }
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
        if (!file.buffer || file.buffer.length === 0) continue;

        const ext = path.extname(file.originalname).toLowerCase();

        // Skip SVGs and GIFs (animated) — sharp handles them poorly
        if (ext === '.svg' || ext === '.gif') continue;

        const image = sharp(file.buffer);
        const metadata = await image.metadata();
        if (!metadata.width || !metadata.height) continue;

        let pipeline = sharp(file.buffer).rotate(); // auto-rotate based on EXIF

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
          // Update originalname and mimetype when converting to JPEG
          if (ext !== '.jpg' && ext !== '.jpeg') {
            file.originalname = file.originalname.replace(/\.[^.]+$/, '.jpg');
            file.mimetype = 'image/jpeg';
          }
        }

        file.buffer = outputBuffer;
        file.size = outputBuffer.length;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

export default upload;

/**
 * Middleware to validate video file size against app_settings.
 * Checks max_video_upload_size_mb setting after upload.
 * Deletes file and returns error if oversized.
 */
async function validateVideoSize(req: Request, res: Response, next: NextFunction) {
  try {
    // Get max size from database (cached for 5 min)
    let maxSizeMb = 40; // default
    try {
      const rows = await dbQuery('SELECT setting_value FROM app_settings WHERE setting_key = ?', ['max_video_upload_size_mb']) as any[];
      if (rows && rows.length > 0) {
        maxSizeMb = parseInt(String(rows[0].setting_value), 10) || 40;
      }
    } catch (e) {
      // Use default if query fails
    }

    const maxSizeBytes = maxSizeMb * 1024 * 1024;
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
      // Only check video files
      if (!file.mimetype.startsWith('video/')) continue;
      if (file.size > maxSizeBytes) {
        return res.status(413).json({
          message: `File too large. Maximum video size is ${maxSizeMb}MB, but file is ${(file.size / 1024 / 1024).toFixed(2)}MB`
        });
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

export { upload, uploadAny, uploadVideo, uploadFont, uploadAudio, optimizeImage, validateVideoSize };
