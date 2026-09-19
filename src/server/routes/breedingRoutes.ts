import { Router, Response } from 'express';
import { queryAll, queryOne, executeRun, logActivity } from '../db.ts';
import { requireAuth, AuthenticatedRequest } from '../auth.ts';

const router = Router();
router.use(requireAuth);

// Helper to compute expected due date
export function calculateExpectedDueDate(serviceDate: string, species: string): string {
  const date = new Date(serviceDate);
  if (isNaN(date.getTime())) {
    return serviceDate;
  }

  // Gestation / Incubation periods:
  // Pig: 114 days (3 months, 3 weeks, 3 days)
  // Hen: 21 days
  // Ostrich: 42 days (6 weeks)
  let days = 114;
  if (species === 'hen') days = 21;
  if (species === 'ostrich') days = 42;

  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

// GET /api/breeding
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { species, status } = req.query;
    let sql = `
      SELECT 
        br.*,
        a.tag_id as female_tag,
        a.breed as female_breed,
        a.pen_location as female_pen,
        u.full_name as logged_by_name,
        CASE
          WHEN date(br.expected_due_date) < date('now') AND br.status IN ('pregnant/incubating', 'confirmed') THEN 'overdue'
          WHEN date(br.expected_due_date) <= date('now', '+7 days') AND br.status IN ('pregnant/incubating', 'confirmed') THEN 'due_soon'
          ELSE 'normal'
        END as due_urgency
      FROM breeding_records br
      JOIN animals a ON br.female_id = a.id
      LEFT JOIN users u ON br.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (species && species !== 'all') {
      sql += ` AND br.species = ?`;
      params.push(species);
    }
    if (status && status !== 'all') {
      sql += ` AND br.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY br.service_date DESC, br.id DESC`;
    const records = queryAll(sql, params);
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch breeding records: ' + err.message });
  }
});

// POST /api/breeding - Log service / mating
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { female_id, male_id, service_date, species, notes } = req.body;
    if (!female_id || !male_id || !service_date || !species) {
      return res.status(400).json({ error: 'Female animal, male ID / AI, service date, and species are required.' });
    }

    const female = queryOne<any>(`SELECT * FROM animals WHERE id = ?`, [parseInt(female_id, 10)]);
    if (!female) {
      return res.status(404).json({ error: 'Female animal not found in registry.' });
    }

    if (female.status === 'deceased' || female.status === 'sold') {
      return res.status(400).json({ error: `Cannot service animal "${female.tag_id}" because status is ${female.status}.` });
    }

    const expectedDueDate = calculateExpectedDueDate(service_date, species);
    const now = new Date().toISOString();

    const { lastInsertRowid } = executeRun(`
      INSERT INTO breeding_records (female_id, male_id, service_date, species, expected_due_date, status, notes, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, 'pregnant/incubating', ?, ?, ?);
    `, [female.id, String(male_id).trim(), service_date, species, expectedDueDate, notes ? notes.trim() : '', req.user!.id, now]);

    logActivity(
      req.user!.id,
      req.user!.full_name,
      'breeding',
      'LOG_SERVICE',
      `Logged service for ${species} "${female.tag_id}" with male "${male_id}". Expected due date: ${expectedDueDate}`
    );

    res.status(201).json({
      id: lastInsertRowid,
      female_id: female.id,
      female_tag: female.tag_id,
      male_id,
      service_date,
      species,
      expected_due_date: expectedDueDate,
      status: 'pregnant/incubating',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record breeding service: ' + err.message });
  }
});

// PUT /api/breeding/:id - Update pregnancy status / failed conception
router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = queryOne<any>(`SELECT * FROM breeding_records WHERE id = ?`, [id]);
    if (!existing) return res.status(404).json({ error: 'Breeding record not found.' });

    const { status, failed_reason, reservice_date, notes } = req.body;

    if (!['pregnant/incubating', 'confirmed', 'not_confirmed', 'failed', 'delivered'].includes(status)) {
      return res.status(400).json({ error: 'Invalid breeding status value.' });
    }

    executeRun(`
      UPDATE breeding_records 
      SET status = ?, failed_reason = ?, reservice_date = ?, notes = COALESCE(?, notes)
      WHERE id = ?;
    `, [status, failed_reason || null, reservice_date || null, notes, id]);

    logActivity(
      req.user!.id,
      req.user!.full_name,
      'breeding',
      'UPDATE_BREEDING_STATUS',
      `Updated breeding record ID ${id} to "${status}"${failed_reason ? ` (Reason: ${failed_reason})` : ''}`
    );

    res.json({ message: 'Breeding status updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update breeding record: ' + err.message });
  }
});

// GET /api/breeding/stats - Reproduction success rate dashboard per species
router.get('/stats', (req: AuthenticatedRequest, res: Response) => {
  try {
    const speciesList = ['pig', 'hen', 'ostrich'] as const;

    const stats = speciesList.map(sp => {
      const allServices = queryOne<any>(`
        SELECT COUNT(*) as count FROM breeding_records WHERE species = ?;
      `, [sp])?.count || 0;

      const successful = queryOne<any>(`
        SELECT COUNT(*) as count FROM breeding_records WHERE species = ? AND status = 'delivered';
      `, [sp])?.count || 0;

      const activePregnant = queryOne<any>(`
        SELECT COUNT(*) as count FROM breeding_records WHERE species = ? AND status IN ('pregnant/incubating', 'confirmed');
      `, [sp])?.count || 0;

      const failed = queryOne<any>(`
        SELECT COUNT(*) as count FROM breeding_records WHERE species = ? AND status = 'failed';
      `, [sp])?.count || 0;

      // Completed attempts = successful + failed
      const completed = successful + failed;
      const successRate = completed > 0 ? ((successful / completed) * 100).toFixed(1) : (successful > 0 ? '100.0' : '0.0');

      return {
        species: sp,
        totalServices: allServices,
        activePregnant,
        successful,
        failed,
        successRate: parseFloat(successRate),
      };
    });

    const upcomingDue = queryAll(`
      SELECT 
        br.*, 
        a.tag_id as female_tag,
        a.breed as female_breed,
        a.pen_location as female_pen
      FROM breeding_records br
      JOIN animals a ON br.female_id = a.id
      WHERE br.status IN ('pregnant/incubating', 'confirmed')
        AND date(br.expected_due_date) <= date('now', '+14 days')
      ORDER BY br.expected_due_date ASC;
    `);

    res.json({
      speciesSuccessRates: stats,
      upcomingDue,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate reproduction stats: ' + err.message });
  }
});

export default router;
