import { Router, Response } from 'express';
import { queryAll, queryOne, executeRun, logActivity } from '../db.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../auth.ts';

const router = Router();
router.use(requireAuth);

// GET /api/animals
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { species, status, pen, search, is_batch } = req.query;
    let sql = `
      SELECT 
        a.*,
        u.full_name as created_by_name
      FROM animals a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (species && species !== 'all') {
      sql += ` AND a.species = ?`;
      params.push(species);
    }
    if (status && status !== 'all') {
      sql += ` AND a.status = ?`;
      params.push(status);
    }
    if (pen && pen !== 'all') {
      sql += ` AND a.pen_location LIKE ?`;
      params.push(`%${pen}%`);
    }
    if (is_batch !== undefined && is_batch !== 'all') {
      sql += ` AND a.is_batch = ?`;
      params.push(is_batch === '1' || is_batch === 'true' ? 1 : 0);
    }
    if (search) {
      sql += ` AND (a.tag_id LIKE ? OR a.breed LIKE ? OR a.pen_location LIKE ? OR a.notes LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    sql += ` ORDER BY a.id DESC`;
    const animals = queryAll(sql, params);
    res.json(animals);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch animals: ' + err.message });
  }
});

// GET /api/animals/:id
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const animal = queryOne(
      `SELECT a.*, u.full_name as created_by_name FROM animals a LEFT JOIN users u ON a.created_by = u.id WHERE a.id = ?`,
      [id]
    );
    if (!animal) return res.status(404).json({ error: 'Animal not found' });
    res.json(animal);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch animal details: ' + err.message });
  }
});

// POST /api/animals - Register animal or flock
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      tag_id,
      species,
      breed,
      sex,
      date_of_birth,
      source,
      pen_location,
      is_batch,
      batch_count,
      notes,
    } = req.body;

    if (!tag_id || !species || !breed || !sex || !date_of_birth || !source || !pen_location) {
      return res.status(400).json({ error: 'Please provide all mandatory animal fields.' });
    }

    if (!['pig', 'hen', 'ostrich'].includes(species)) {
      return res.status(400).json({ error: 'Species must be pig, hen, or ostrich.' });
    }

    const existing = queryOne(`SELECT id FROM animals WHERE UPPER(tag_id) = ?`, [String(tag_id).trim().toUpperCase()]);
    if (existing) {
      return res.status(400).json({ error: `An animal or flock with tag ID "${tag_id}" already exists.` });
    }

    const isBatchInt = is_batch ? 1 : 0;
    const batchCountInt = isBatchInt ? Math.max(1, parseInt(batch_count, 10) || 1) : 1;
    const now = new Date().toISOString();

    const { lastInsertRowid } = executeRun(`
      INSERT INTO animals (
        tag_id, species, breed, sex, date_of_birth, source, status,
        pen_location, is_batch, batch_count, notes, created_by, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'alive', ?, ?, ?, ?, ?, ?);
    `, [
      String(tag_id).trim().toUpperCase(),
      species,
      breed.trim(),
      sex,
      date_of_birth,
      source,
      pen_location.trim(),
      isBatchInt,
      batchCountInt,
      notes ? notes.trim() : '',
      req.user!.id,
      now
    ]);

    logActivity(
      req.user!.id,
      req.user!.full_name,
      'animals',
      'REGISTER_ANIMAL',
      `Registered ${species} ${isBatchInt ? `flock/batch (${batchCountInt} count)` : 'individual'} with tag "${tag_id.toUpperCase()}"`
    );

    res.status(201).json({
      id: lastInsertRowid,
      tag_id: String(tag_id).trim().toUpperCase(),
      species,
      breed,
      sex,
      date_of_birth,
      source,
      status: 'alive',
      pen_location,
      is_batch: isBatchInt,
      batch_count: batchCountInt,
      notes,
      created_by: req.user!.id,
      created_at: now
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to register animal: ' + err.message });
  }
});

// PUT /api/animals/:id - Update animal details
router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = queryOne<any>(`SELECT * FROM animals WHERE id = ?`, [id]);
    if (!existing) return res.status(404).json({ error: 'Animal not found.' });

    // Workers cannot edit historical core records if restricted, but can update pen location or status
    const {
      tag_id,
      breed,
      sex,
      pen_location,
      status,
      batch_count,
      notes,
    } = req.body;

    const updatedTag = (tag_id || existing.tag_id).trim().toUpperCase();
    if (updatedTag !== existing.tag_id) {
      const clash = queryOne(`SELECT id FROM animals WHERE UPPER(tag_id) = ? AND id != ?`, [updatedTag, id]);
      if (clash) return res.status(400).json({ error: `Tag ID ${updatedTag} is already taken.` });
    }

    const updatedBreed = breed?.trim() || existing.breed;
    const updatedSex = sex || existing.sex;
    const updatedPen = pen_location?.trim() || existing.pen_location;
    const updatedStatus = status || existing.status;
    const updatedBatchCount = batch_count !== undefined ? parseInt(batch_count, 10) : existing.batch_count;
    const updatedNotes = notes !== undefined ? notes : existing.notes;

    executeRun(`
      UPDATE animals 
      SET tag_id = ?, breed = ?, sex = ?, pen_location = ?, status = ?, batch_count = ?, notes = ?
      WHERE id = ?;
    `, [updatedTag, updatedBreed, updatedSex, updatedPen, updatedStatus, updatedBatchCount, updatedNotes, id]);

    logActivity(
      req.user!.id,
      req.user!.full_name,
      'animals',
      'UPDATE_ANIMAL',
      `Updated animal record ID ${id} (${updatedTag})`
    );

    res.json({ message: 'Animal updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update animal: ' + err.message });
  }
});

// DELETE /api/animals/:id - Admin only
router.delete('/:id', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = queryOne<any>(`SELECT tag_id, species FROM animals WHERE id = ?`, [id]);
    if (!existing) return res.status(404).json({ error: 'Animal not found' });

    executeRun(`DELETE FROM animals WHERE id = ?;`, [id]);

    logActivity(
      req.user!.id,
      req.user!.full_name,
      'animals',
      'DELETE_ANIMAL',
      `Deleted animal tag ${existing.tag_id} (${existing.species})`
    );

    res.json({ message: 'Animal deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete animal: ' + err.message });
  }
});

export default router;
