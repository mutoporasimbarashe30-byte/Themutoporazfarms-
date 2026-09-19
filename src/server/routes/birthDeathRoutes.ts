import { Router, Response } from 'express';
import { queryAll, queryOne, executeRun, logActivity } from '../db.ts';
import { requireAuth, AuthenticatedRequest } from '../auth.ts';

const router = Router();
router.use(requireAuth);

// GET /api/births
router.get('/births', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { species, startDate, endDate } = req.query;
    let sql = `
      SELECT 
        b.*,
        u.full_name as logged_by_name,
        a.tag_id as mother_tag_ref
      FROM births b
      LEFT JOIN users u ON b.created_by = u.id
      LEFT JOIN animals a ON b.mother_id = a.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (species && species !== 'all') {
      sql += ` AND b.species = ?`;
      params.push(species);
    }
    if (startDate) {
      sql += ` AND b.birth_date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND b.birth_date <= ?`;
      params.push(endDate);
    }

    sql += ` ORDER BY b.birth_date DESC, b.id DESC`;
    const births = queryAll(sql, params);
    res.json(births);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch births: ' + err.message });
  }
});

// POST /api/births - Log birth / litter / hatch
router.post('/births', (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      birth_date,
      species,
      mother_id,
      number_born,
      pen_location,
      notes,
    } = req.body;

    if (!birth_date || !species || !number_born || !pen_location) {
      return res.status(400).json({ error: 'Birth date, species, count, and pen location are required.' });
    }

    const count = parseInt(number_born, 10);
    if (count <= 0) {
      return res.status(400).json({ error: 'Number born must be at least 1.' });
    }

    let motherTag = null;
    let motherIdInt = null;
    if (mother_id) {
      const mother = queryOne<any>(`SELECT id, tag_id, species FROM animals WHERE id = ?`, [parseInt(mother_id, 10)]);
      if (mother) {
        motherIdInt = mother.id;
        motherTag = mother.tag_id;
      }
    }

    const now = new Date().toISOString();
    const { lastInsertRowid } = executeRun(`
      INSERT INTO births (birth_date, species, mother_id, mother_tag, number_born, pen_location, notes, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [birth_date, species, motherIdInt, motherTag, count, pen_location.trim(), notes ? notes.trim() : '', req.user!.id, now]);

    logActivity(
      req.user!.id,
      req.user!.full_name,
      'births',
      'LOG_BIRTH',
      `Logged birth of ${count} ${species}(s) in ${pen_location} (Mother: ${motherTag || 'Unspecified'})`
    );

    res.status(201).json({
      id: lastInsertRowid,
      birth_date,
      species,
      mother_id: motherIdInt,
      mother_tag: motherTag,
      number_born: count,
      pen_location,
      notes,
      created_by: req.user!.id,
      created_at: now
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record birth: ' + err.message });
  }
});

// GET /api/deaths
router.get('/deaths', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { species, cause, startDate, endDate } = req.query;
    let sql = `
      SELECT 
        d.*,
        u.full_name as logged_by_name,
        a.tag_id as animal_tag_ref
      FROM deaths d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN animals a ON d.animal_id = a.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (species && species !== 'all') {
      sql += ` AND d.species = ?`;
      params.push(species);
    }
    if (cause && cause !== 'all') {
      sql += ` AND d.cause_of_death = ?`;
      params.push(cause);
    }
    if (startDate) {
      sql += ` AND d.death_date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND d.death_date <= ?`;
      params.push(endDate);
    }

    sql += ` ORDER BY d.death_date DESC, d.id DESC`;
    const deaths = queryAll(sql, params);
    res.json(deaths);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch deaths: ' + err.message });
  }
});

// POST /api/deaths - Log death with strict data validation
router.post('/deaths', (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      death_date,
      animal_id,
      batch_tag,
      species,
      quantity = 1,
      cause_of_death,
      notes,
    } = req.body;

    if (!death_date || !species || !cause_of_death) {
      return res.status(400).json({ error: 'Death date, species, and cause of death are required.' });
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    let targetAnimal: any = null;

    if (animal_id) {
      targetAnimal = queryOne<any>(`SELECT * FROM animals WHERE id = ?`, [parseInt(animal_id, 10)]);
    } else if (batch_tag) {
      targetAnimal = queryOne<any>(`SELECT * FROM animals WHERE UPPER(tag_id) = ?`, [String(batch_tag).trim().toUpperCase()]);
    }

    // Validation: cannot log a death for an animal already marked deceased or sold
    if (targetAnimal) {
      if (targetAnimal.status === 'deceased') {
        return res.status(400).json({
          error: `Validation Error: Animal "${targetAnimal.tag_id}" is already recorded as deceased. Cannot log a second death.`,
        });
      }
      if (targetAnimal.status === 'sold') {
        return res.status(400).json({
          error: `Validation Error: Animal "${targetAnimal.tag_id}" was already sold and is no longer on the farm.`,
        });
      }
    }

    const now = new Date().toISOString();
    const resolvedAnimalId = targetAnimal?.id || null;
    const resolvedBatchTag = targetAnimal?.tag_id || (batch_tag ? String(batch_tag).trim().toUpperCase() : null);

    // Record death
    const { lastInsertRowid } = executeRun(`
      INSERT INTO deaths (death_date, animal_id, batch_tag, species, quantity, cause_of_death, notes, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      death_date,
      resolvedAnimalId,
      resolvedBatchTag,
      species,
      qty,
      cause_of_death,
      notes ? notes.trim() : '',
      req.user!.id,
      now
    ]);

    // Automatically update the animal/flock status
    if (targetAnimal) {
      if (targetAnimal.is_batch) {
        const remainingCount = Math.max(0, targetAnimal.batch_count - qty);
        const newStatus = remainingCount === 0 ? 'deceased' : 'alive';
        executeRun(`UPDATE animals SET batch_count = ?, status = ? WHERE id = ?;`, [remainingCount, newStatus, targetAnimal.id]);
      } else {
        executeRun(`UPDATE animals SET status = 'deceased' WHERE id = ?;`, [targetAnimal.id]);
      }
    }

    logActivity(
      req.user!.id,
      req.user!.full_name,
      'deaths',
      'LOG_DEATH',
      `Logged death of ${qty} ${species}(s) (${resolvedBatchTag || 'Unspecified'}) - Cause: ${cause_of_death}`
    );

    res.status(201).json({
      id: lastInsertRowid,
      death_date,
      animal_id: resolvedAnimalId,
      batch_tag: resolvedBatchTag,
      species,
      quantity: qty,
      cause_of_death,
      notes,
      created_by: req.user!.id,
      created_at: now
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record death: ' + err.message });
  }
});

// GET /api/births-deaths/stats - Birth rate, death rate, mortality % by species over time periods
router.get('/stats', (req: AuthenticatedRequest, res: Response) => {
  try {
    const period = (req.query.period as string) || 'monthly'; // 'weekly', 'monthly', 'yearly', 'all'

    // Compute cutoff date
    const now = new Date();
    let cutoff = new Date();
    if (period === 'weekly') {
      cutoff.setDate(now.getDate() - 7);
    } else if (period === 'monthly') {
      cutoff.setMonth(now.getMonth() - 1);
    } else if (period === 'yearly') {
      cutoff.setFullYear(now.getFullYear() - 1);
    } else {
      cutoff = new Date(0);
    }
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const speciesList = ['pig', 'hen', 'ostrich'] as const;

    const stats = speciesList.map(sp => {
      // Total live population now
      const liveRes = queryOne<any>(`
        SELECT 
          COALESCE(SUM(CASE WHEN is_batch = 1 THEN batch_count ELSE 1 END), 0) as live_count
        FROM animals 
        WHERE species = ? AND status = 'alive'
      `, [sp]);
      const currentLive = liveRes?.live_count || 0;

      // Births in period
      const birthRes = queryOne<any>(`
        SELECT COALESCE(SUM(number_born), 0) as total_born
        FROM births
        WHERE species = ? AND birth_date >= ?
      `, [sp, cutoffStr]);
      const birthsCount = birthRes?.total_born || 0;

      // Deaths in period
      const deathRes = queryOne<any>(`
        SELECT COALESCE(SUM(quantity), 0) as total_dead
        FROM deaths
        WHERE species = ? AND death_date >= ?
      `, [sp, cutoffStr]);
      const deathsCount = deathRes?.total_dead || 0;

      // Mortality percentage: deaths / (currentLive + deaths) * 100
      const totalPopPeriod = currentLive + deathsCount;
      const mortalityRate = totalPopPeriod > 0 ? ((deathsCount / totalPopPeriod) * 100).toFixed(1) : '0.0';
      const birthRate = currentLive > 0 ? ((birthsCount / currentLive) * 100).toFixed(1) : '0.0';

      return {
        species: sp,
        currentLive,
        birthsCount,
        deathsCount,
        mortalityRate: parseFloat(mortalityRate),
        birthRate: parseFloat(birthRate),
      };
    });

    res.json({
      period,
      cutoffDate: cutoffStr,
      speciesStats: stats,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compute birth/death stats: ' + err.message });
  }
});

export default router;
