import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { queryOne } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'the_mutoporaz_farms_super_secret_jwt_key_2026';

export interface TokenPayload {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'worker' | 'vet';
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing token.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  // Check if user is still active in database
  const user = queryOne<{ id: number; status: string; role: 'admin' | 'worker' | 'vet' }>(
    'SELECT id, status, role FROM users WHERE id = ?',
    [decoded.id]
  );

  if (!user || user.status !== 'active') {
    return res.status(403).json({ error: 'User account is inactive or has been deactivated.' });
  }

  // Keep fresh role from db
  req.user = {
    ...decoded,
    role: user.role,
  };
  next();
}

export function requireRole(...allowedRoles: Array<'admin' | 'worker' | 'vet'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Permission denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
}
