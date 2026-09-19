import { Router, Response } from 'express';
import { queryAll, queryOne, executeRun, logActivity } from '../db.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../auth.ts';

const router = Router();
router.use(requireAuth);

// -------------------------------------------------------------
// 1. DISEASE REFERENCE TABLE
// -------------------------------------------------------------
// GET /api/health/diseases
router.get('/diseases', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { species } = req.query;
    let sql = `SELECT * FROM diseases WHERE 1=1`;
    const params: any[] = [];
    if (species && species !== 'all') {
      sql += ` AND (species_affected = ? OR species_affected = 'all')`;
      params.push(species);
    }
    sql += ` ORDER BY name ASC`;
    const diseases = queryAll(sql, params);
    res.json(diseases);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch diseases: ' + err.message });
  }
});

// POST /api/health/diseases - Admin or Vet
router.post('/diseases', requireRole('admin', 'vet'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, species_affected, symptoms, recommended_medicines, dosage_info, treatment_duration } = req.body;
    if (!name || !species_affected || !symptoms || !recommended_medicines || !dosage_info || !treatment_duration) {
      return res.status(400).json({ error: 'All disease reference fields are mandatory.' });
    }

    const existing = queryOne(`SELECT id FROM diseases WHERE LOWER(name) = ?`, [name.trim().toLowerCase()]);
    if (existing) {
      return res.status(400).json({ error: `A disease entry with the name "${name}" already exists.` });
    }

    const now = new Date().toISOString();
    const { lastInsertRowid } = executeRun(`
      INSERT INTO diseases (name, species_affected, symptoms, recommended_medicines, dosage_info, treatment_duration, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `, [name.trim(), species_affected, symptoms.trim(), recommended_medicines.trim(), dosage_info.trim(), treatment_duration.trim(), now]);

    logActivity(req.user!.id, req.user!.full_name, 'health', 'ADD_DISEASE_REF', `Added reference entry for disease "${name}"`);

    res.status(201).json({ id: lastInsertRowid, name, species_affected, symptoms, recommended_medicines, dosage_info, treatment_duration });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add disease reference: ' + err.message });
  }
});

// -------------------------------------------------------------
// 2. MEDICINE INVENTORY (FULL STOCK LIST)
// -------------------------------------------------------------
// GET /api/health/medicines
router.get('/medicines', (req: AuthenticatedRequest, res: Response) => {
  try {
    const medicines = queryAll(`
      SELECT 
        m.*,
        CASE 
          WHEN m.stock_quantity <= m.reorder_threshold THEN 1 
          ELSE 0 
        END as is_low_stock,
        CASE 
          WHEN date(m.expiry_date) <= date('now') THEN 'expired'
          WHEN date(m.expiry_date) <= date('now', '+30 days') THEN 'expiring_soon'
          ELSE 'good'
        END as expiry_status
      FROM medicines m
      ORDER BY m.name ASC;
    `);
    res.json(medicines);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch medicine inventory: ' + err.message });
  }
});

// POST /api/health/medicines - Add new medicine item (Admin or Vet)
router.post('/medicines', requireRole('admin', 'vet'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, category, stock_quantity, unit, reorder_threshold, expiry_date, supplier, date_received } = req.body;
    if (!name || !category || stock_quantity === undefined || !unit || !reorder_threshold || !expiry_date || !supplier) {
      return res.status(400).json({ error: 'All medicine stock fields are required.' });
    }

    const existing = queryOne(`SELECT id FROM medicines WHERE LOWER(name) = ?`, [name.trim().toLowerCase()]);
    if (existing) {
      return res.status(400).json({ error: `A medicine named "${name}" already exists in inventory.` });
    }

    const now = new Date().toISOString();
    const { lastInsertRowid } = executeRun(`
      INSERT INTO medicines (name, category, stock_quantity, unit, reorder_threshold, expiry_date, supplier, date_received, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      name.trim(),
      category.trim(),
      parseFloat(stock_quantity) || 0,
      unit,
      parseFloat(reorder_threshold) || 0,
      expiry_date,
      supplier.trim(),
      date_received || new Date().toISOString().slice(0, 10),
      now
    ]);

    logActivity(req.user!.id, req.user!.full_name, 'health', 'ADD_MEDICINE', `Added medicine stock: ${name} (${stock_quantity} ${unit})`);

    res.status(201).json({ id: lastInsertRowid, message: 'Medicine added to inventory' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add medicine: ' + err.message });
  }
});

// PUT /api/health/medicines/:id - Restock or edit thresholds (Admin or Vet)
router.put('/medicines/:id', requireRole('admin', 'vet'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = queryOne<any>(`SELECT * FROM medicines WHERE id = ?`, [id]);
    if (!existing) return res.status(404).json({ error: 'Medicine not found.' });

    const { stock_quantity, reorder_threshold, expiry_date, supplier, add_quantity } = req.body;

    let finalStock = existing.stock_quantity;
    if (add_quantity !== undefined) {
      finalStock += parseFloat(add_quantity) || 0;
    } else if (stock_quantity !== undefined) {
      finalStock = parseFloat(stock_quantity) || 0;
    }

    const finalThreshold = reorder_threshold !== undefined ? parseFloat(reorder_threshold) : existing.reorder_threshold;
    const finalExpiry = expiry_date || existing.expiry_date;
    const finalSupplier = supplier?.trim() || existing.supplier;

    executeRun(`
      UPDATE medicines 
      SET stock_quantity = ?, reorder_threshold = ?, expiry_date = ?, supplier = ?
      WHERE id = ?;
    `, [finalStock, finalThreshold, finalExpiry, finalSupplier, id]);

    logActivity(
      req.user!.id,
      req.user!.full_name,
      'health',
      'RESTOCK_MEDICINE',
      `Updated ${existing.name} stock to ${finalStock} ${existing.unit} (Threshold: ${finalThreshold})`
    );

    res.json({ message: 'Medicine updated successfully', current_stock: finalStock });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update medicine: ' + err.message });
  }
});

// -------------------------------------------------------------
// 3. SICK ANIMAL LOGS (HEALTH RECORDS)
// -------------------------------------------------------------
// GET /api/health/records
router.get('/records', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, species } = req.query;
    let sql = `
      SELECT 
        h.*,
        a.tag_id as animal_tag,
        d.name as disease_name,
        u.full_name as reported_by_name
      FROM health_records h
      LEFT JOIN animals a ON h.animal_id = a.id
      LEFT JOIN diseases d ON h.disease_id = d.id
      LEFT JOIN users u ON h.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (status && status !== 'all') {
      sql += ` AND h.status = ?`;
      params.push(status);
    }
    if (species && species !== 'all') {
      sql += ` AND h.species = ?`;
      params.push(species);
    }
    sql += ` ORDER BY h.date_reported DESC, h.id DESC`;
    const records = queryAll(sql, params);
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch health records: ' + err.message });
  }
});

// POST /api/health/records - Log sick animal
router.post('/records', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { animal_id, batch_tag, species, date_reported, symptoms, disease_id, diagnosed_condition, notes } = req.body;
    if (!species || !date_reported || !symptoms || !diagnosed_condition) {
      return res.status(400).json({ error: 'Species, date reported, symptoms, and condition diagnosis are required.' });
    }

    let resolvedAnimalId = animal_id ? parseInt(animal_id, 10) : null;
    let resolvedBatchTag = batch_tag ? String(batch_tag).trim().toUpperCase() : null;

    if (resolvedAnimalId) {
      const animal = queryOne<any>(`SELECT tag_id, species FROM animals WHERE id = ?`, [resolvedAnimalId]);
      if (animal) resolvedBatchTag = animal.tag_id;
    }

    const now = new Date().toISOString();
    const { lastInsertRowid } = executeRun(`
      INSERT INTO health_records (animal_id, batch_tag, species, date_reported, symptoms, disease_id, diagnosed_condition, status, notes, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'sick', ?, ?, ?);
    `, [
      resolvedAnimalId,
      resolvedBatchTag,
      species,
      date_reported,
      symptoms.trim(),
      disease_id ? parseInt(disease_id, 10) : null,
      diagnosed_condition.trim(),
      notes ? notes.trim() : '',
      req.user!.id,
      now
    ]);

    logActivity(
      req.user!.id,
      req.user!.full_name,
      'health',
      'REPORT_SICK',
      `Reported sick ${species} (${resolvedBatchTag || 'Unspecified'}): ${diagnosed_condition}`
    );

    res.status(201).json({ id: lastInsertRowid, message: 'Sick animal logged successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record health issue: ' + err.message });
  }
});

// PUT /api/health/records/:id - Update recovery status
router.put('/records/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, notes } = req.body;
    if (!['sick', 'under_treatment', 'recovered', 'deceased'].includes(status)) {
      return res.status(400).json({ error: 'Invalid health status.' });
    }

    executeRun(`UPDATE health_records SET status = ?, notes = COALESCE(?, notes) WHERE id = ?;`, [status, notes, id]);
    res.json({ message: 'Health record status updated.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update record: ' + err.message });
  }
});

// -------------------------------------------------------------
// 4. TREATMENTS (WITH AUTOMATIC MEDICINE STOCK DEDUCTION & BLOCKING)
// -------------------------------------------------------------
// GET /api/health/treatments
router.get('/treatments', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { species, medicineId } = req.query;
    let sql = `
      SELECT 
        t.*,
        m.name as medicine_name,
        m.unit as medicine_unit,
        a.tag_id as animal_tag,
        u.full_name as created_by_name
      FROM treatments t
      JOIN medicines m ON t.medicine_id = m.id
      LEFT JOIN animals a ON t.animal_id = a.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (species && species !== 'all') {
      sql += ` AND t.species = ?`;
      params.push(species);
    }
    if (medicineId && medicineId !== 'all') {
      sql += ` AND t.medicine_id = ?`;
      params.push(parseInt(String(medicineId), 10));
    }
    sql += ` ORDER BY t.date_administered DESC, t.id DESC`;
    const treatments = queryAll(sql, params);
    res.json(treatments);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch treatments: ' + err.message });
  }
});

// POST /api/health/treatments - Log treatment & automatically deduct stock
router.post('/treatments', (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      health_record_id,
      animal_id,
      batch_tag,
      species,
      medicine_id,
      dosage_given,
      date_administered,
      administered_by,
      recovery_status = 'recovering',
      notes,
    } = req.body;

    if (!species || !medicine_id || !dosage_given || !date_administered || !administered_by) {
      return res.status(400).json({ error: 'Species, medicine, dosage, administration date, and administrator name are required.' });
    }

    const dosage = parseFloat(dosage_given);
    if (isNaN(dosage) || dosage <= 0) {
      return res.status(400).json({ error: 'Dosage given must be greater than zero.' });
    }

    const medicine = queryOne<any>(`SELECT * FROM medicines WHERE id = ?`, [parseInt(medicine_id, 10)]);
    if (!medicine) {
      return res.status(404).json({ error: 'Selected medicine does not exist in inventory.' });
    }

    // MANDATORY VALIDATION: Block treatment entry if stock would go negative!
    if (medicine.stock_quantity < dosage) {
      return res.status(400).json({
        error: `Insufficient Stock Alert: Cannot log treatment. Available stock for "${medicine.name}" is only ${medicine.stock_quantity} ${medicine.unit}, but ${dosage} ${medicine.unit} is required. Please reorder or restock medicine first.`,
      });
    }

    let resolvedAnimalId = animal_id ? parseInt(animal_id, 10) : null;
    let resolvedBatchTag = batch_tag ? String(batch_tag).trim().toUpperCase() : null;

    if (resolvedAnimalId) {
      const animal = queryOne<any>(`SELECT tag_id FROM animals WHERE id = ?`, [resolvedAnimalId]);
      if (animal) resolvedBatchTag = animal.tag_id;
    }

    const now = new Date().toISOString();

    // 1. Record treatment
    const { lastInsertRowid } = executeRun(`
      INSERT INTO treatments (
        health_record_id, animal_id, batch_tag, species, medicine_id, dosage_given,
        date_administered, administered_by, recovery_status, notes, created_by, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      health_record_id ? parseInt(health_record_id, 10) : null,
      resolvedAnimalId,
      resolvedBatchTag,
      species,
      medicine.id,
      dosage,
      date_administered,
      administered_by.trim(),
      recovery_status,
      notes ? notes.trim() : '',
      req.user!.id,
      now
    ]);

    // 2. Automatically deduct stock
    const updatedStock = medicine.stock_quantity - dosage;
    executeRun(`UPDATE medicines SET stock_quantity = ? WHERE id = ?;`, [updatedStock, medicine.id]);

    // 3. Update health record if linked
    if (health_record_id) {
      executeRun(`UPDATE health_records SET status = 'under_treatment' WHERE id = ?;`, [parseInt(health_record_id, 10)]);
    }

    logActivity(
      req.user!.id,
      req.user!.full_name,
      'health',
      'LOG_TREATMENT',
      `Administered ${dosage} ${medicine.unit} of ${medicine.name} to ${species} (${resolvedBatchTag || 'Unspecified'}). Remaining stock: ${updatedStock.toFixed(1)} ${medicine.unit}`
    );

    res.status(201).json({
      id: lastInsertRowid,
      message: 'Treatment recorded successfully and medicine stock deducted.',
      remaining_stock: updatedStock,
      unit: medicine.unit,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record treatment: ' + err.message });
  }
});

// -------------------------------------------------------------
// 5. HEALTH ALERTS & SUMMARY
// -------------------------------------------------------------
router.get('/alerts', (req: AuthenticatedRequest, res: Response) => {
  try {
    const lowStockMedicines = queryAll(`
      SELECT * FROM medicines WHERE stock_quantity <= reorder_threshold;
    `);

    const expiringMedicines = queryAll(`
      SELECT *,
        CASE 
          WHEN date(expiry_date) <= date('now') THEN 'expired'
          ELSE 'expiring_soon'
        END as alert_type
      FROM medicines 
      WHERE date(expiry_date) <= date('now', '+30 days');
    `);

    const sickAnimalsCount = queryOne<any>(`
      SELECT COUNT(*) as count FROM health_records WHERE status IN ('sick', 'under_treatment');
    `)?.count || 0;

    res.json({
      lowStockCount: lowStockMedicines.length,
      lowStockList: lowStockMedicines,
      expiringCount: expiringMedicines.length,
      expiringList: expiringMedicines,
      sickAnimalsCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch health alerts: ' + err.message });
  }
});

export default router;
