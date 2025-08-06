import { Router } from 'express';

const router = Router();

// Placeholder routes
router.get('/dashboard', (req, res) => {
  res.json({ message: 'Admin dashboard endpoint' });
});

router.get('/users', (req, res) => {
  res.json({ message: 'Admin users endpoint' });
});

export default router; 