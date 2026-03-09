import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { uploadVideo, optimizeImage, validateVideoSize } from '../middleware/upload';
import {
  createBlog,
  deleteBlog,
  getBlogs,
  getPublicBlogBySlug,
  getPublicBlogs,
  updateBlog,
} from '../controllers/blogController';

const router = Router();

// Public read endpoints for website visitors
router.get('/public', getPublicBlogs);
router.get('/public/:slug', getPublicBlogBySlug);

// Authenticated feed + management endpoints
router.get('/', authenticateToken, getBlogs);

router.post(
  '/',
  authenticateToken,
  uploadVideo.fields([
    { name: 'headerImage', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ]),
  validateVideoSize,
  optimizeImage(),
  createBlog
);

router.put(
  '/:id',
  authenticateToken,
  uploadVideo.fields([
    { name: 'headerImage', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ]),
  validateVideoSize,
  optimizeImage(),
  updateBlog
);

router.delete('/:id', authenticateToken, deleteBlog);

export default router;
