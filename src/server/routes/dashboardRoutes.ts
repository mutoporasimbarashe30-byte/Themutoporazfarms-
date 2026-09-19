import { Router, Response } from 'express';
import { queryAll, queryOne } from '../db.ts';
import { requireAuth, AuthenticatedRequest } from '../auth.ts';

const router = Router();
router.use(requireAuth);

// GET /api/dashboard/overview
router.get('/overview', (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // 1. Live animals by species
    const speciesBreakdown = ['pig', 'hen', 'ostrich'].map(sp => {
      const res = queryOne<any>(`
        SELECT 
          COALESCE(SUM(CASE WHEN is_batch = 1 THEN batch_count ELSE 1 END), 0) as total_head,
          COUNT(*) as record_count
        FROM animals 
        WHERE species = ? AND status = 'alive'
      `, [sp]);
      return {
        species: sp,
        totalHead: res?.total_head || 0,
        recordCount: res?.record_count || 0,
      };
    });

    const totalLiveAnimals = speciesBreakdown.reduce((sum, item) => sum + item.totalHead, 0);

    // 2. Today's births & deaths
    const todayBirths = queryOne<any>(`
      SELECT COALESCE(SUM(number_born), 0) as count FROM births WHERE birth_date = ?;
    `, [today])?.count || 0;

    const todayDeaths = queryOne<any>(`
      SELECT COALESCE(SUM(quantity), 0) as count FROM deaths WHERE death_date = ?;
    `, [today])?.count || 0;

    // 3. Sick animal count (status in 'sick', 'under_treatment')
    const sickCount = queryOne<any>(`
      SELECT COUNT(*) as count FROM health_records WHERE status IN ('sick', 'under_treatment');
    `)?.count || 0;

    // 4. Upcoming due dates (in next 14 days or overdue)
    const upcomingDue = queryAll(`
      SELECT 
        br.id,
        br.species,
        br.expected_due_date,
        br.status,
        a.tag_id as female_tag,
        a.pen_location as female_pen,
        CASE
          WHEN date(br.expected_due_date) < date('now') THEN 'overdue'
          WHEN date(br.expected_due_date) <= date('now', '+7 days') THEN 'urgent'
          ELSE 'upcoming'
        END as urgency
      FROM breeding_records br
      JOIN animals a ON br.female_id = a.id
      WHERE br.status IN ('pregnant/incubating', 'confirmed')
        AND date(br.expected_due_date) <= date('now', '+14 days')
      ORDER BY br.expected_due_date ASC
      LIMIT 10;
    `);

    // 5. Feed stock summary & alerts
    const feedTypes = queryAll(`
      SELECT id, name, category, current_stock_kg, reorder_threshold_kg, cost_per_kg,
             CASE WHEN current_stock_kg <= reorder_threshold_kg THEN 1 ELSE 0 END as is_low_stock
      FROM feed_types
      ORDER BY current_stock_kg ASC;
    `);
    const lowFeedAlerts = feedTypes.filter((f: any) => f.is_low_stock === 1);

    // 6. Medicine stock summary & alerts
    const medicines = queryAll(`
      SELECT id, name, category, stock_quantity, unit, reorder_threshold, expiry_date,
             CASE WHEN stock_quantity <= reorder_threshold THEN 1 ELSE 0 END as is_low_stock,
             CASE 
               WHEN date(expiry_date) <= date('now') THEN 'expired'
               WHEN date(expiry_date) <= date('now', '+30 days') THEN 'expiring_soon'
               ELSE 'good'
             END as expiry_status
      FROM medicines
      ORDER BY stock_quantity ASC;
    `);
    const lowMedicineAlerts = medicines.filter((m: any) => m.is_low_stock === 1);
    const expiringMedicineAlerts = medicines.filter((m: any) => m.expiry_status !== 'good');

    // 7. Recent activity (last 8)
    const recentActivity = queryAll(`
      SELECT * FROM activity_log ORDER BY id DESC LIMIT 8;
    `);

    res.json({
      today,
      totalLiveAnimals,
      speciesBreakdown,
      todayBirths,
      todayDeaths,
      sickCount,
      upcomingDue,
      feedStockSummary: feedTypes,
      lowFeedAlerts,
      medicineStockSummary: medicines,
      lowMedicineAlerts,
      expiringMedicineAlerts,
      recentActivity,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compile dashboard metrics: ' + err.message });
  }
});

// GET /api/dashboard/export-data - Fetch report records filtered by module & date range
router.get('/export-data', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { module = 'animals', startDate, endDate } = req.query;

    let data: any[] = [];

    if (module === 'animals') {
      data = queryAll(`
        SELECT a.tag_id, a.species, a.breed, a.sex, a.date_of_birth, a.source, a.status, a.pen_location,
               a.is_batch, a.batch_count, a.notes, u.full_name as created_by
        FROM animals a
        LEFT JOIN users u ON a.created_by = u.id
        ORDER BY a.species, a.tag_id;
      `);
    } else if (module === 'births') {
      let sql = `
        SELECT b.birth_date, b.species, b.number_born, b.mother_tag, b.pen_location, b.notes, u.full_name as recorded_by
        FROM births b
        LEFT JOIN users u ON b.created_by = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (startDate) { sql += ` AND b.birth_date >= ?`; params.push(startDate); }
      if (endDate) { sql += ` AND b.birth_date <= ?`; params.push(endDate); }
      sql += ` ORDER BY b.birth_date DESC`;
      data = queryAll(sql, params);
    } else if (module === 'deaths') {
      let sql = `
        SELECT d.death_date, d.species, d.batch_tag as animal_tag, d.quantity, d.cause_of_death, d.notes, u.full_name as recorded_by
        FROM deaths d
        LEFT JOIN users u ON d.created_by = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (startDate) { sql += ` AND d.death_date >= ?`; params.push(startDate); }
      if (endDate) { sql += ` AND d.death_date <= ?`; params.push(endDate); }
      sql += ` ORDER BY d.death_date DESC`;
      data = queryAll(sql, params);
    } else if (module === 'health') {
      data = queryAll(`
        SELECT t.date_administered, t.species, COALESCE(t.batch_tag, a.tag_id) as animal_tag,
               m.name as medicine, t.dosage_given || ' ' || m.unit as dosage,
               t.administered_by, t.recovery_status, t.notes
        FROM treatments t
        JOIN medicines m ON t.medicine_id = m.id
        LEFT JOIN animals a ON t.animal_id = a.id
        ORDER BY t.date_administered DESC;
      `);
    } else if (module === 'feed') {
      let sql = `
        SELECT fl.log_date, fl.log_time, fl.species, fl.pen_location, ft.name as feed_type,
               fl.quantity_kg, ft.cost_per_kg, ROUND(fl.quantity_kg * ft.cost_per_kg, 2) as total_cost,
               fl.logged_by
        FROM feed_logs fl
        JOIN feed_types ft ON fl.feed_type_id = ft.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (startDate) { sql += ` AND fl.log_date >= ?`; params.push(startDate); }
      if (endDate) { sql += ` AND fl.log_date <= ?`; params.push(endDate); }
      sql += ` ORDER BY fl.log_date DESC, fl.log_time DESC`;
      data = queryAll(sql, params);
    } else if (module === 'breeding') {
      data = queryAll(`
        SELECT a.tag_id as female_tag, br.species, br.male_id, br.service_date, br.expected_due_date,
               br.status, br.failed_reason, br.reservice_date, br.notes
        FROM breeding_records br
        JOIN animals a ON br.female_id = a.id
        ORDER BY br.service_date DESC;
      `);
    } else if (module === 'inventory') {
      const feeds = queryAll(`SELECT 'Feed' as type, name, category, current_stock_kg as stock, 'kg' as unit, reorder_threshold_kg as threshold, supplier FROM feed_types`);
      const meds = queryAll(`SELECT 'Medicine' as type, name, category, stock_quantity as stock, unit, reorder_threshold as threshold, supplier FROM medicines`);
      data = [...feeds, ...meds];
    }

    res.json({
      farmName: 'The Mutoporaz Farms',
      generatedAt: new Date().toISOString(),
      module,
      rowCount: data.length,
      data,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to export report data: ' + err.message });
  }
});

export default router;
