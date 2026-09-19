import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { queryOne, executeRun, logActivity } from '../db.ts';
import { generateToken, requireAuth, AuthenticatedRequest } from '../auth.ts';

const router = Router();

// Login with email or contact number + password
router.post('/login', (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/phone and password are required.' });
    }

    const trimmed = String(identifier).trim().toLowerCase();
    const user = queryOne<any>(
      `SELECT * FROM users WHERE LOWER(email) = ? OR contact_number = ? LIMIT 1`,
      [trimmed, identifier]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email/phone or password.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'This account has been deactivated. Please contact SIMBA.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email/phone or password.' });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    });

    logActivity(user.id, user.full_name, 'auth', 'LOGIN', `User logged in`);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        contact_number: user.contact_number,
        date_added: user.date_added,
        status: user.status,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// Signup (e.g. for new staff)
router.post('/signup', (req, res) => {
  try {
    const { email, password, full_name, role = 'worker', contact_number } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required.' });
    }

    const existing = queryOne(`SELECT id FROM users WHERE LOWER(email) = ?`, [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();
    const safeRole = ['admin', 'worker', 'vet'].includes(role) ? role : 'worker';

    const { lastInsertRowid } = executeRun(
      `INSERT INTO users (email, password_hash, full_name, role, contact_number, date_added, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [email.toLowerCase().trim(), passwordHash, full_name.trim(), safeRole, contact_number || '', now]
    );

    const token = generateToken({
      id: lastInsertRowid,
      email: email.toLowerCase().trim(),
      full_name: full_name.trim(),
      role: safeRole as any,
    });

    logActivity(lastInsertRowid, full_name, 'auth', 'SIGNUP', `New user registered as ${safeRole}`);

    res.status(201).json({
      token,
      user: {
        id: lastInsertRowid,
        email: email.toLowerCase().trim(),
        full_name: full_name.trim(),
        role: safeRole,
        contact_number: contact_number || '',
        date_added: now,
        status: 'active',
      },
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Signup failed: ' + err.message });
  }
});

// Get current user profile
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = queryOne<any>(
      `SELECT id, email, full_name, role, contact_number, date_added, status FROM users WHERE id = ?`,
      [req.user!.id]
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// Update own profile
router.put('/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { full_name, contact_number, current_password, new_password } = req.body;
    const userId = req.user!.id;

    const user = queryOne<any>(`SELECT * FROM users WHERE id = ?`, [userId]);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    let newHash = user.password_hash;
    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ error: 'Current password is required to set a new password.' });
      }
      if (!bcrypt.compareSync(current_password, user.password_hash)) {
        return res.status(400).json({ error: 'Incorrect current password.' });
      }
      if (new_password.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      }
      newHash = bcrypt.hashSync(new_password, 10);
    }

    const updatedName = full_name?.trim() || user.full_name;
    const updatedContact = contact_number !== undefined ? contact_number : user.contact_number;

    executeRun(
      `UPDATE users SET full_name = ?, contact_number = ?, password_hash = ? WHERE id = ?`,
      [updatedName, updatedContact, newHash, userId]
    );

    logActivity(userId, updatedName, 'auth', 'UPDATE_PROFILE', 'User updated personal profile details');

    res.json({
      message: 'Profile updated successfully.',
      user: {
        id: user.id,
        email: user.email,
        full_name: updatedName,
        role: user.role,
        contact_number: updatedContact,
        date_added: user.date_added,
        status: user.status,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update profile: ' + err.message });
  }
});

// Password reset simulation / request
router.post('/reset-password-request', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const user = queryOne<any>(`SELECT id, full_name FROM users WHERE LOWER(email) = ?`, [email.toLowerCase().trim()]);
  if (user) {
    logActivity(user.id, user.full_name, 'auth', 'PASSWORD_RESET_REQ', `Password reset requested for ${email}`);
  }
  // Return success response to prevent email enumeration
  res.json({
    message: 'If an account exists with this email, password reset instructions have been dispatched. For immediate farm assistance, contact SIMBA directly.',
  });
});

export default router;
