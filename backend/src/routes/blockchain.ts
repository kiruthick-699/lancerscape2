import { Router } from 'express';

const router = Router();

// Placeholder routes
router.get('/contracts', (req, res) => {
  res.json({ message: 'Get contracts endpoint' });
});

router.post('/deploy', (req, res) => {
  res.json({ message: 'Deploy contract endpoint' });
});

export default router; 