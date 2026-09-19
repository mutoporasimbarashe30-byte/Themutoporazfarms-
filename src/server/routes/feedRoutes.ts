import { Router, Response } from 'express';
import { queryAll, queryOne, executeRun, logActivity } from '../db.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../auth.ts';

const router = Router();
router.use(requireAuth);

// -------------------------------------------------------------
// 1. FEED INVENTORY (FULL STOCK LIST)
// -------------------------------------------------------------
// GET /api/feed/types
router.get('/types', (req: AuthenticatedRequest, res: Response) => {
  try {
    const feedTypes = queryAll(`
      SELECT 
        f.*,
        CASE 
          WHEN f.current_stock_kg <= f.reorder_threshold_kg THEN 1 
          ELSE 0 
        END as is_low_stock
      FROM feed_types f
      ORDER BY f.name ASC;
    `);
    res.json(feedTypes);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch feed inventory: ' + err.message });
  }
});

// POST /api/feed/types - Add new feed type (Admin or Vet)
router.post('/types', requireRole('admin', 'vet'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, category, current_stock_kg, reorder_threshold_kg, supplier, date_received, cost_per_kg } = req.body;
    if (!name || !category || current_stock_kg === undefined || reorder_threshold_kg === undefined || !supplier) {
      return res.status(400).json({ error: 'Feed name, category, stock, threshold, and supplier are required.' });
    }

    const existing = queryOne(`SELECT id FROM feed_types WHERE LOWER(name) = ?`, [name.trim().toLowerCase()]);
    if (existing) {
      return res.status(400).json({ error: `A feed type named "${name}" already exists.` });
    }

    const now = new Date().toISOString();
    const stockKg = parseFloat(current_stock_kg) || 0;
    const thresholdKg = parseFloat(reorder_threshold_kg) || 0;
    const cost = parseFloat(cost_per_kg) || 0;

    const { lastInsertRowid } = executeRun(`
      INSERT INTO feed_types (name, category, current_stock_kg, reorder_threshold_kg, supplier, date_received, cost_per_kg, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `, [name.trim(), category, stockKg, thresholdKg, supplier.trim(), date_received || now.slice(0, 10), cost, now]);

    logActivity(
      req.user!.id,
      req.user!.full_name,
      'feed',
      'ADD_FEED_TYPE',
      `Added new feed type: ${name} (${stockKg} kg)`
    );

    res.status(201).json({ id: lastInsertRowid, message: 'Feed stock item created successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create feed item: ' + err.message });
  }
});

// PUT /api/feed/types/:id - Restock or update threshold (Admin or Vet)
router.put('/types/:id', requireRole('admin', 'vet'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = queryOne<any>(`SELECT * FROM feed_types WHERE id = ?`, [id]);
    if (!existing) return res.status(404).json({ error: 'Feed item not found.' });

    const { current_stock_kg, reorder_threshold_kg, cost_per_kg, supplier, add_kg } = req.body;

    let finalStock = existing.current_stock_kg;
    if (add_kg !== undefined) {
      finalStock += parseFloat(add_kg) || 0;
    } else if (current_stock_kg !== undefined) {
      finalStock = parseFloat(current_stock_kg) || 0;
    }

    const finalThreshold = reorder_threshold_kg !== undefined ? parseFloat(reorder_threshold_kg) : existing.reorder_threshold_kg;
    const finalCost = cost_per_kg !== undefined ? parseFloat(cost_per_kg) : existing.cost_per_kg;
    const finalSupplier = supplier?.trim() || existing.supplier;

    executeRun(`
      UPDATE feed_types 
      SET current_stock_kg = ?, reorder_threshold_kg = ?, cost_per_kg = ?, supplier = ?
      WHERE id = ?;
    `, [finalStock, finalThreshold, finalCost, finalSupplier, id]);

    logActivity(
      req.user!.id,
      req.user!.full_name,
      'feed',
      'RESTOCK_FEED',
      `Updated ${existing.name} stock to ${finalStock} kg (Threshold: ${finalThreshold} kg)`
    );

    res.json({ message: 'Feed stock updated successfully', current_stock_kg: finalStock });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update feed: ' + err.message });
  }
});

// -------------------------------------------------------------
// 2. DAILY FEED INTAKE LOGS (AUTOMATIC STOCK DEDUCTION & BLOCKING)
// -------------------------------------------------------------
// GET /api/feed/logs
router.get('/logs', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { species, feedTypeId, startDate, endDate } = req.query;
    let sql = `
      SELECT 
        fl.*,
        ft.name as feed_name,
        ft.category as feed_category,
        ft.cost_per_kg,
        u.full_name as logged_by_user
      FROM feed_logs fl
      JOIN feed_types ft ON fl.feed_type_id = ft.id
      LEFT JOIN users u ON fl.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (species && species !== 'all') {
      sql += ` AND fl.species = ?`;
      params.push(species);
    }
    if (feedTypeId && feedTypeId !== 'all') {
      sql += ` AND fl.feed_type_id = ?`;
      params.push(parseInt(String(feedTypeId), 10));
    }
    if (startDate) {
      sql += ` AND fl.log_date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND fl.log_date <= ?`;
      params.push(endDate);
    }

    sql += ` ORDER BY fl.log_date DESC, fl.log_time DESC, fl.id DESC`;
    const logs = queryAll(sql, params);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch feed logs: ' + err.message });
  }
});

// POST /api/feed/logs - Record daily intake with automatic stock deduction
router.post('/logs', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { species, pen_location, feed_type_id, quantity_kg, log_date, log_time, logged_by } = req.body;
    if (!species || !pen_location || !feed_type_id || quantity_kg === undefined || !log_date) {
      return res.status(400).json({ error: 'Species, pen location, feed type, quantity, and date are required.' });
    }

    const qty = parseFloat(quantity_kg);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than zero kg.' });
    }

    const feed = queryOne<any>(`SELECT * FROM feed_types WHERE id = ?`, [parseInt(feed_type_id, 10)]);
    if (!feed) {
      return res.status(404).json({ error: 'Selected feed type does not exist in inventory.' });
    }

    // MANDATORY VALIDATION: Block feed entries if stock would go negative!
    if (feed.current_stock_kg < qty) {
      return res.status(400).json({
        error: `Insufficient Feed Stock Alert: Cannot log intake. Available stock for "${feed.name}" is only ${feed.current_stock_kg.toFixed(1)} kg, but ${qty.toFixed(1)} kg was requested. Please order or replenish stock first.`,
      });
    }

    const now = new Date().toISOString();
    const resolvedTime = log_time || new Date().toTimeString().slice(0, 5);
    const resolvedLoggedBy = (logged_by || req.user!.full_name).trim();

    // 1. Insert feed log
    const { lastInsertRowid } = executeRun(`
      INSERT INTO feed_logs (species, pen_location, feed_type_id, quantity_kg, log_date, log_time, logged_by, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      species,
      pen_location.trim(),
      feed.id,
      qty,
      log_date,
      resolvedTime,
      resolvedLoggedBy,
      req.user!.id,
      now
    ]);

    // 2. Automatically deduct feed stock
    const updatedStock = feed.current_stock_kg - qty;
    executeRun(`UPDATE feed_types SET current_stock_kg = ? WHERE id = ?;`, [updatedStock, feed.id]);

    logActivity(
      req.user!.id,
      req.user!.full_name,
      'feed',
      'LOG_FEED_INTAKE',
      `Logged ${qty} kg ${feed.name} fed to ${species} in ${pen_location}. Remaining stock: ${updatedStock.toFixed(1)} kg`
    );

    res.status(201).json({
      id: lastInsertRowid,
      message: 'Feed intake logged and stock deducted.',
      remaining_stock_kg: updatedStock,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record feed intake: ' + err.message });
  }
});

// -------------------------------------------------------------
// 3. FEED REPORTS & CONSUMPTION OVER TIME
// -------------------------------------------------------------
router.get('/reports', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { period = '30days' } = req.query;
    let days = 30;
    if (period === '7days') days = 7;
    if (period === '90days') days = 90;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    // Consumption by species
    const speciesConsumption = queryAll(`
      SELECT 
        fl.species,
        SUM(fl.quantity_kg) as total_kg,
        ROUND(SUM(fl.quantity_kg * ft.cost_per_kg), 2) as estimated_cost,
        COUNT(fl.id) as log_count
      FROM feed_logs fl
      JOIN feed_types ft ON fl.feed_type_id = ft.id
      WHERE fl.log_date >= ?
      GROUP BY fl.species;
    `, [cutoffStr]);

    // Consumption by feed type
    const feedTypeConsumption = queryAll(`
      SELECT 
        ft.name,
        ft.category,
        ft.current_stock_kg,
        ft.reorder_threshold_kg,
        SUM(fl.quantity_kg) as consumed_kg,
        ROUND(SUM(fl.quantity_kg * ft.cost_per_kg), 2) as total_cost
      FROM feed_types ft
      LEFT JOIN feed_logs fl ON fl.feed_type_id = ft.id AND fl.log_date >= ?
      GROUP BY ft.id;
    `, [cutoffStr]);

    // Low stock feed alerts
    const lowStockFeeds = queryAll(`
      SELECT * FROM feed_types WHERE current_stock_kg <= reorder_threshold_kg;
    `);

    res.json({
      periodDays: days,
      cutoffDate: cutoffStr,
      speciesConsumption,
      feedTypeConsumption,
      lowStockFeeds,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compile feed reports: ' + err.message });
  }
});

export default router;
