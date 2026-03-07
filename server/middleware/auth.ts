import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { get } from '../config/database';

interface JwtPayload { id: number; email: string; role?: string; }

const COACH_GRACE_DAYS = 7;

interface CoachMembershipPolicy {
  isCoach: boolean;
  membershipActive: boolean;
  isWithinGracePeriod: boolean;
  graceDaysLeft: number;
  daysSinceCreated: number;
}

function getDaysSince(dateInput: string | null | undefined): number {
  if (!dateInput) return 0;
  const created = new Date(dateInput).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, (Date.now() - created) / (1000 * 60 * 60 * 24));
}

function getCoachMembershipPolicy(userRow: any): CoachMembershipPolicy {
  const isCoach = userRow?.role === 'coach';
  const membershipActive = !!(userRow?.coach_membership_active || userRow?.membership_paid);
  const daysSinceCreated = getDaysSince(userRow?.created_at);
  const isWithinGracePeriod = daysSinceCreated <= COACH_GRACE_DAYS;
  const graceDaysLeft = Math.max(0, Math.ceil(COACH_GRACE_DAYS - daysSinceCreated));

  return {
    isCoach,
    membershipActive,
    isWithinGracePeriod,
    graceDaysLeft,
    daysSinceCreated,
  };
}

declare global {
  namespace Express {
    interface Request { user?: JwtPayload & { role: string }; }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });
  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as JwtPayload;
    const user = await get<any>('SELECT role FROM users WHERE id = ?', [decoded.id]);
    (req as any).user = { ...decoded, role: user?.role || 'user' };
    next();
  } catch {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Coaches can access the app without membership, but deal actions require active membership.
export const requireActiveCoachMembershipForDeals = async (req: any, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role === 'admin') return next();
    if (req.user?.role !== 'coach') return next();

    const userRow = await get<any>(
      'SELECT role, coach_membership_active, membership_paid, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!userRow) return res.status(404).json({ message: 'User not found' });

    const policy = getCoachMembershipPolicy(userRow);
    if (policy.membershipActive) return next();

    return res.status(403).json({
      message: policy.isWithinGracePeriod
        ? `Your 7-day coach access period is active (${policy.graceDaysLeft} day(s) left), but deals are locked until membership payment is completed.`
        : 'Coach membership payment is required to continue. Deal actions are locked until membership is activated.',
      code: 'COACH_DEALS_LOCKED',
      graceDaysLeft: policy.graceDaysLeft,
      membershipActive: false,
    });
  } catch {
    return res.status(500).json({ message: 'Failed to validate coach membership status' });
  }
};
