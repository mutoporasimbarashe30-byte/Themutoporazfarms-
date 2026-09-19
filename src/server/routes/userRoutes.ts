import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { queryAll, queryOne, executeRun, logActivity } from '../db.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../auth.ts';

const router = Router();

// All routes here require Admin role (SIMBA)
router.use(requireAuth);

// GET /api/users
router.get('/', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = queryAll<any>(`
      SELECT 
        u.id, 
        u.email, 
        u.full_name, 
        u.role, 
        u.contact_number, 
        u.date_added, 
        u.status,
        (SELECT COUNT(*) FROM activity_log WHERE user_id = u.id) as activity_count,
        (SELECT MAX(timestamp) FROM activity_log WHERE user_id = u.id) as last_active
      FROM users u
      ORDER BY u.id ASC;
    `);
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch users: ' + err.message });
  }
});

// POST /api/users - Add user
router.post('/', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, full_name, role, contact_number } = req.body;
    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Email, password, full name, and role are required.' });
    }

    const safeRole = ['admin', 'worker', 'vet'].includes(role) ? role : 'worker';
    const existing = queryOne(`SELECT id FROM users WHERE LOWER(email) = ?`, [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();

    const { lastInsertRowid } = executeRun(`
      INSERT INTO users (email, password_hash, full_name, role, contact_number, date_added, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active');
    `, [email.toLowerCase().trim(), passwordHash, full_name.trim(), safeRole, contact_number || '', now]);

    logActivity(
      req.user!.id,
      req.user!.full_name,
      'users',
      'CREATE_USER',
      `Created user ${full_name} (${email}) with role ${safeRole}`
    );

    res.status(201).json({
      id: lastInsertRowid,
      email: email.toLowerCase().trim(),
      full_name: full_name.trim(),
      role: safeRole,
      contact_number: contact_number || '',
      date_added: now,
      status: 'active',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add user: ' + err.message });
  }
});

// PUT /api/users/:id - Update user role, contact, status
router.put('/:id', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const { full_name, role, contact_number, status, password } = req.body;

    const existing = queryOne<any>(`SELECT * FROM users WHERE id = ?`, [targetId]);
    if (!existing) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Protect against self-deactivation or self-demotion if the admin is editing own account
    if (targetId === req.user!.id) {
      if (status === 'inactive') {
        return res.status(400).json({ error: 'You cannot deactivate your own admin account.' });
      }
      if (role && role !== 'admin') {
        return res.status(400).json({ error: 'You cannot demote your own admin account.' });
      }
    }

    const updatedName = full_name?.trim() || existing.full_name;
    const updatedRole = role && ['admin', 'worker', 'vet'].includes(role) ? role : existing.role;
    const updatedContact = contact_number !== undefined ? contact_number : existing.contact_number;
    const updatedStatus = status && ['active', 'inactive'].includes(status) ? status : existing.status;

    let updatedHash = existing.password_hash;
    if (password && password.trim().length >= 6) {
      updatedHash = bcrypt.hashSync(password.trim(), 10);
    }

    executeRun(`
      UPDATE users 
      SET full_name = ?, role = ?, contact_number = ?, status = ?, password_hash = ?
      WHERE id = ?;
    `, [updatedName, updatedRole, updatedContact, updatedStatus, updatedHash, targetId]);

    logActivity(
      req.user!.id,
      req.user!.full_name,
      'users',
      'UPDATE_USER',
      `Updated user ID ${targetId} (${updatedName}) - Role: ${updatedRole}, Status: ${updatedStatus}`
    );

    res.json({ message: 'User updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update user: ' + err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (targetId === req.user!.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const targetUser = queryOne<any>(`SELECT full_name, email FROM users WHERE id = ?`, [targetId]);
    if (!targetUser) return res.status(404).json({ error: 'User not found.' });

    executeRun(`DELETE FROM users WHERE id = ?;`, [targetId]);

    logActivity(
      req.user!.id,
      req.user!.full_name,
      'users',
      'DELETE_USER',
      `Deleted user ${targetUser.full_name} (${targetUser.email})`
    );

    res.json({ message: 'User deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete user: ' + err.message });
  }
});

// GET /api/users/activity-logs (Audit Trail)
router.get('/audit/logs', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { module, userId, limit = 100 } = req.query;
    let sql = `SELECT * FROM activity_log WHERE 1=1`;
    const params: any[] = [];

    if (module && module !== 'all') {
      sql += ` AND module = ?`;
      params.push(module);
    }
    if (userId && userId !== 'all') {
      sql += ` AND user_id = ?`;
      params.push(parseInt(String(userId), 10));
    }

    sql += ` ORDER BY id DESC LIMIT ?`;
    params.push(parseInt(String(limit), 10) || 100);

    const logs = queryAll(sql, params);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch activity logs: ' + err.message });
  }
});

export default router;
