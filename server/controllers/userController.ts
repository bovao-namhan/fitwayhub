import { Request, Response } from 'express';

// Simple endpoint to accept points updates from client and return current total.
export const addPoints = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || null;
    const { points } = req.body;
    if (points === undefined) return res.status(400).json({ message: 'points required' });

    // In a real app update DB. Here, just echo back a mock updated user.
    const updated = {
      id: userId,
      points: (points || 0),
    };

    console.log(`Points updated for user ${userId}: +${points}`);
    return res.json({ success: true, user: updated });
  } catch (err) {
    console.error('Add points error', err);
    return res.status(500).json({ message: 'Could not add points' });
  }
};
