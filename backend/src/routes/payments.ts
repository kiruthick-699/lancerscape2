import { Router } from 'express';

const router = Router();

// Placeholder routes
router.post('/create-payment', (req, res) => {
  res.json({ message: 'Create payment endpoint' });
});

router.post('/confirm-payment', (req, res) => {
  res.json({ message: 'Confirm payment endpoint' });
});

export default router; 