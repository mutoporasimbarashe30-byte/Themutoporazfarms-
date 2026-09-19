import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

let dbInstance: Database | null = null;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'farm.sqlite');

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();
  let db: Database;

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
    } catch (err) {
      console.error('Failed to load existing database file, creating fresh one:', err);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  initSchema(db);
  seedInitialData(db);
  persistDb(db);

  dbInstance = db;
  return dbInstance;
}

export function persistDb(db?: Database) {
  const targetDb = db || dbInstance;
  if (!targetDb) return;
  try {
    const data = targetDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error persisting SQLite database to disk:', err);
  }
}

function initSchema(db: Database) {
  db.run(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'worker', 'vet')),
      contact_number TEXT,
      date_added TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive'))
    );

    CREATE TABLE IF NOT EXISTS animals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag_id TEXT UNIQUE NOT NULL,
      species TEXT NOT NULL CHECK(species IN ('pig', 'hen', 'ostrich')),
      breed TEXT NOT NULL,
      sex TEXT NOT NULL CHECK(sex IN ('male', 'female', 'batch_mixed')),
      date_of_birth TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('born_on_farm', 'purchased')),
      status TEXT NOT NULL DEFAULT 'alive' CHECK(status IN ('alive', 'sold', 'deceased')),
      pen_location TEXT NOT NULL,
      is_batch INTEGER NOT NULL DEFAULT 0,
      batch_count INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS births (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      birth_date TEXT NOT NULL,
      species TEXT NOT NULL CHECK(species IN ('pig', 'hen', 'ostrich')),
      mother_id INTEGER,
      mother_tag TEXT,
      number_born INTEGER NOT NULL DEFAULT 1,
      pen_location TEXT NOT NULL,
      notes TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (mother_id) REFERENCES animals(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS deaths (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      death_date TEXT NOT NULL,
      animal_id INTEGER,
      batch_tag TEXT,
      species TEXT NOT NULL CHECK(species IN ('pig', 'hen', 'ostrich')),
      quantity INTEGER NOT NULL DEFAULT 1,
      cause_of_death TEXT NOT NULL CHECK(cause_of_death IN ('disease', 'predation', 'natural', 'stillbirth', 'culled', 'unknown')),
      notes TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS diseases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      species_affected TEXT NOT NULL,
      symptoms TEXT NOT NULL,
      recommended_medicines TEXT NOT NULL,
      dosage_info TEXT NOT NULL,
      treatment_duration TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      stock_quantity REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL CHECK(unit IN ('ml', 'tablets', 'doses')),
      reorder_threshold REAL NOT NULL DEFAULT 10,
      expiry_date TEXT NOT NULL,
      supplier TEXT NOT NULL,
      date_received TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS health_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      animal_id INTEGER,
      batch_tag TEXT,
      species TEXT NOT NULL CHECK(species IN ('pig', 'hen', 'ostrich')),
      date_reported TEXT NOT NULL,
      symptoms TEXT NOT NULL,
      disease_id INTEGER,
      diagnosed_condition TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'sick' CHECK(status IN ('sick', 'under_treatment', 'recovered', 'deceased')),
      notes TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE SET NULL,
      FOREIGN KEY (disease_id) REFERENCES diseases(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS treatments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      health_record_id INTEGER,
      animal_id INTEGER,
      batch_tag TEXT,
      species TEXT NOT NULL CHECK(species IN ('pig', 'hen', 'ostrich')),
      medicine_id INTEGER NOT NULL,
      dosage_given REAL NOT NULL,
      date_administered TEXT NOT NULL,
      administered_by TEXT NOT NULL,
      recovery_status TEXT NOT NULL CHECK(recovery_status IN ('recovering', 'recovered', 'deceased')),
      notes TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (health_record_id) REFERENCES health_records(id) ON DELETE SET NULL,
      FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE SET NULL,
      FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS feed_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('starter', 'grower', 'layer', 'finisher', 'breeder', 'forage', 'supplement', 'other')),
      current_stock_kg REAL NOT NULL DEFAULT 0,
      reorder_threshold_kg REAL NOT NULL DEFAULT 50,
      supplier TEXT NOT NULL,
      date_received TEXT NOT NULL,
      cost_per_kg REAL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feed_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      species TEXT NOT NULL CHECK(species IN ('pig', 'hen', 'ostrich')),
      pen_location TEXT NOT NULL,
      feed_type_id INTEGER NOT NULL,
      quantity_kg REAL NOT NULL,
      log_date TEXT NOT NULL,
      log_time TEXT NOT NULL,
      logged_by TEXT NOT NULL,
      created_by INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (feed_type_id) REFERENCES feed_types(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS breeding_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      female_id INTEGER NOT NULL,
      male_id TEXT NOT NULL,
      service_date TEXT NOT NULL,
      species TEXT NOT NULL CHECK(species IN ('pig', 'hen', 'ostrich')),
      expected_due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pregnant/incubating' CHECK(status IN ('pregnant/incubating', 'confirmed', 'not_confirmed', 'failed', 'delivered')),
      failed_reason TEXT,
      reservice_date TEXT,
      notes TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (female_id) REFERENCES animals(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT NOT NULL,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);
}

function seedInitialData(db: Database) {
  // Check if users already exist
  const res = db.exec("SELECT COUNT(*) as count FROM users;");
  const count = (res[0]?.values[0]?.[0] as number) || 0;
  if (count > 0) return;

  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync('SimbaFarm2026!', 10);
  const workerHash = bcrypt.hashSync('WorkerPass123!', 10);
  const vetHash = bcrypt.hashSync('VetPass123!', 10);

  // 1. Seed Users (SIMBA as default manager/admin)
  db.run(`
    INSERT INTO users (email, password_hash, full_name, role, contact_number, date_added, status)
    VALUES 
      (?, ?, 'SIMBA (Simbarashe Mutopora)', 'admin', '+263 77 123 4567', ?, 'active'),
      ('worker@mutoporaz.com', ?, 'John Moyo', 'worker', '+263 77 987 6543', ?, 'active'),
      ('vet@mutoporaz.com', ?, 'Dr. Sarah Chikore', 'vet', '+263 77 555 8899', ?, 'active');
  `, [
    'mutoporasimbarashe30@gmail.com', passwordHash, now,
    workerHash, now,
    vetHash, now
  ]);

  // 2. Seed Disease Reference Data
  db.run(`
    INSERT INTO diseases (name, species_affected, symptoms, recommended_medicines, dosage_info, treatment_duration, created_at)
    VALUES
      ('Swine Respiratory Disease (SRD)', 'pig', 'Coughing, abdominal breathing (thumping), nasal discharge, fever', 'Oxytetracycline 20% LA', '1 ml per 10 kg body weight deep IM', 'Repeat after 72 hours if necessary', ?),
      ('Porcine Parvovirus (PPV)', 'pig', 'Reproductive failure, mummified fetuses, small litters', 'Parvo Vaccine & Multivitamins', '2 ml IM per breeding sow', 'Annual booster prior to breeding', ?),
      ('Newcastle Disease', 'hen', 'Gasping, coughing, greenish diarrhea, twisted neck (torticollis)', 'Newcastle Lasota Vaccine', '1 drop ocular/nasal per bird or via drinking water', 'Routine schedule at 3-4 week intervals', ?),
      ('Coccidiosis', 'hen', 'Bloody droppings, ruffled feathers, severe lethargy, weight loss', 'Amprolium 20% Soluble Powder', '1g per 2 liters drinking water', '5-7 consecutive days', ?),
      ('Avian Influenza / Respiratory Complex', 'ostrich', 'Swollen infraorbital sinuses, ocular discharge, depression, anorexia', 'Enrofloxacin 10% Solution', '10 mg per kg body weight oral/drinking water', '3-5 days', ?),
      ('Impaction Colic', 'ostrich', 'Absence of fecal output, lethargy, recumbency, kicking at abdomen', 'Liquid Paraffin & Electrolytes', '500 ml oral drench plus fluid therapy', 'Single dose drench, monitor 24-48 hrs', ?);
  `, [now, now, now, now, now, now]);

  // 3. Seed Medicines
  db.run(`
    INSERT INTO medicines (name, category, stock_quantity, unit, reorder_threshold, expiry_date, supplier, date_received, created_at)
    VALUES
      ('Oxytetracycline 20% LA', 'Antibiotic', 850, 'ml', 200, '2027-06-15', 'VetPharm Zimbabwe', '2026-01-10', ?),
      ('Amprolium 20% Powder', 'Antiprotozoal', 320, 'doses', 100, '2026-11-30', 'Harare Agrovet Supplies', '2026-02-12', ?),
      ('Enrofloxacin 10% Oral', 'Antibiotic', 600, 'ml', 150, '2027-01-20', 'VetPharm Zimbabwe', '2026-01-15', ?),
      ('Newcastle Lasota Vaccine', 'Vaccine', 1500, 'doses', 500, '2026-10-15', 'National Bio-Vet Laboratories', '2026-02-01', ?),
      ('Ivermectin 1% Injectable', 'Dewormer', 45, 'ml', 100, '2026-04-10', 'Livestock Medics Africa', '2025-10-05', ?),
      ('Vitamin AD3E + Selenium', 'Vitamin/Supplement', 450, 'ml', 100, '2027-08-30', 'Harare Agrovet Supplies', '2026-02-18', ?);
  `, [now, now, now, now, now, now]);

  // 4. Seed Feed Types
  db.run(`
    INSERT INTO feed_types (name, category, current_stock_kg, reorder_threshold_kg, supplier, date_received, cost_per_kg, created_at)
    VALUES
      ('Pig Grower Pellets', 'grower', 1250, 400, 'Agrifoods Zimbabwe', '2026-03-01', 0.65, ?),
      ('Pig Sow & Weaner Meal', 'breeder', 820, 300, 'Agrifoods Zimbabwe', '2026-03-05', 0.72, ?),
      ('Broiler / Layer Mash', 'layer', 240, 500, 'National Foods Ltd', '2026-02-20', 0.58, ?),
      ('Chick Starter Crumbs', 'starter', 650, 200, 'National Foods Ltd', '2026-03-10', 0.85, ?),
      ('Ostrich Maintenance Pellets', 'grower', 1800, 500, 'SuperFeeds Livestock', '2026-02-28', 0.78, ?),
      ('Lucerne / Alfalfa Hay Bales', 'forage', 950, 250, 'Norton Farmers Coop', '2026-03-08', 0.45, ?);
  `, [now, now, now, now, now, now]);

  // 5. Seed Animals (Pigs, Hens, Ostriches)
  db.run(`
    INSERT INTO animals (tag_id, species, breed, sex, date_of_birth, source, status, pen_location, is_batch, batch_count, notes, created_by, created_at)
    VALUES
      ('PIG-001', 'pig', 'Large White', 'female', '2024-05-12', 'born_on_farm', 'alive', 'Pen P-1 (Sow Stall)', 0, 1, 'Top breeding sow, healthy maternal history', 1, ?),
      ('PIG-002', 'pig', 'Landrace', 'female', '2024-07-20', 'purchased', 'alive', 'Pen P-2 (Gestation)', 0, 1, 'High litter viability recorded', 1, ?),
      ('PIG-003', 'pig', 'Duroc', 'male', '2023-11-05', 'purchased', 'alive', 'Pen P-Boar-A', 0, 1, 'Primary breeding sire boar "Titan"', 1, ?),
      ('PIG-004', 'pig', 'Large White x Landrace', 'female', '2025-02-14', 'born_on_farm', 'alive', 'Pen P-3 (Farrowing)', 0, 1, 'First-time gilt', 1, ?),
      ('HEN-BATCH-2026A', 'hen', 'Lohmann Brown', 'batch_mixed', '2025-10-10', 'purchased', 'alive', 'Coop H-1 (Layer Shed)', 1, 350, 'Flock A - peak egg production cycle', 1, ?),
      ('HEN-BATCH-2026B', 'hen', 'Boschveld Indigenous', 'batch_mixed', '2025-12-05', 'born_on_farm', 'alive', 'Coop H-2 (Free Range)', 1, 180, 'Hardy dual-purpose free-range flock', 1, ?),
      ('OST-001', 'ostrich', 'Black Neck (African)', 'female', '2022-09-18', 'purchased', 'alive', 'Paddock O-1', 0, 1, 'Breeder hen "Nyota", consistent layer', 1, ?),
      ('OST-002', 'ostrich', 'Blue Neck (Somali)', 'male', '2022-08-10', 'purchased', 'alive', 'Paddock O-1', 0, 1, 'Dominant cock "Simba King"', 1, ?),
      ('OST-003', 'ostrich', 'African Black', 'female', '2023-04-14', 'born_on_farm', 'alive', 'Paddock O-2', 0, 1, 'Young breeding hen', 1, ?),
      ('OST-CHICK-B1', 'ostrich', 'African Black', 'batch_mixed', '2026-01-15', 'born_on_farm', 'alive', 'Nursery Pen O-North', 1, 14, 'Batch 1 healthy growing chicks', 1, ?);
  `, [now, now, now, now, now, now, now, now, now, now]);

  // 6. Seed Breeding Records with real gestation / incubation calculations
  // Pig: 114 days from service date
  // Hen: 21 days
  // Ostrich: 42 days
  const serviceDatePig = '2026-01-20'; // Expected due date ~ 2026-05-14
  const serviceDateOstrich = '2026-02-15'; // Expected due date ~ 2026-03-29
  db.run(`
    INSERT INTO breeding_records (female_id, male_id, service_date, species, expected_due_date, status, notes, created_by, created_at)
    VALUES
      (1, 'PIG-003', ?, 'pig', '2026-05-14', 'confirmed', 'Ultrasound confirmed 10+ viable fetuses', 1, ?),
      (2, 'PIG-003', '2026-02-10', 'pig', '2026-06-04', 'pregnant/incubating', 'Naturally serviced by Titan', 1, ?),
      (7, 'OST-002', ?, 'ostrich', '2026-03-29', 'pregnant/incubating', 'Eggs placed in incubator #2 (approx 42 days incubation)', 1, ?);
  `, [serviceDatePig, now, now, serviceDateOstrich, now]);

  // 7. Seed Births
  db.run(`
    INSERT INTO births (birth_date, species, mother_id, mother_tag, number_born, pen_location, notes, created_by, created_at)
    VALUES
      ('2026-01-15', 'ostrich', 7, 'OST-001', 14, 'Nursery Pen O-North', 'Successful hatch from clutch 4. Healthy vigorous chicks.', 1, ?),
      ('2025-11-28', 'pig', 1, 'PIG-001', 11, 'Pen P-3 (Farrowing)', 'Litter of 11 piglets, all survived weaning.', 1, ?);
  `, [now, now]);

  // 8. Seed Health Records and Treatments
  db.run(`
    INSERT INTO health_records (animal_id, batch_tag, species, date_reported, symptoms, disease_id, diagnosed_condition, status, notes, created_by, created_at)
    VALUES
      (4, NULL, 'pig', '2026-03-12', 'Mild fever, dry coughing during morning feeding', 1, 'Swine Respiratory Disease (SRD)', 'under_treatment', 'Isolated in hospital pen H-P', 3, ?),
      (NULL, 'HEN-BATCH-2026A', 'hen', '2026-03-14', 'Lethargy, 3 birds showing bloody droppings', 4, 'Coccidiosis', 'under_treatment', 'Water line medicated with Amprolium', 3, ?);
  `, [now, now]);

  db.run(`
    INSERT INTO treatments (health_record_id, animal_id, batch_tag, species, medicine_id, dosage_given, date_administered, administered_by, recovery_status, notes, created_by, created_at)
    VALUES
      (1, 4, NULL, 'pig', 1, 8.5, '2026-03-12', 'Dr. Sarah Chikore', 'recovering', 'First dose Oxytetracycline 20% LA administered IM', 3, ?),
      (2, NULL, 'HEN-BATCH-2026A', 'hen', 2, 40, '2026-03-14', 'Dr. Sarah Chikore', 'recovering', 'Amprolium batch dosed into flock drinking tank', 3, ?);
  `, [now, now]);

  // 9. Seed Feed Logs
  db.run(`
    INSERT INTO feed_logs (species, pen_location, feed_type_id, quantity_kg, log_date, log_time, logged_by, created_by, created_at)
    VALUES
      ('pig', 'Pen P-1 (Sow Stall)', 2, 12.5, '2026-03-18', '07:30', 'John Moyo', 2, ?),
      ('hen', 'Coop H-1 (Layer Shed)', 3, 42.0, '2026-03-18', '08:00', 'John Moyo', 2, ?),
      ('ostrich', 'Paddock O-1', 5, 25.0, '2026-03-18', '08:45', 'John Moyo', 2, ?);
  `, [now, now, now]);

  // 10. Seed Activity Log
  db.run(`
    INSERT INTO activity_log (user_id, user_name, module, action, details, timestamp)
    VALUES
      (1, 'SIMBA', 'system', 'INITIALIZE', 'The Mutoporaz Farms farm management database initialized', ?),
      (3, 'Dr. Sarah Chikore', 'health', 'DIAGNOSE', 'Diagnosed SRD for PIG-004 and prescribed Oxytetracycline', ?),
      (2, 'John Moyo', 'feed', 'LOG_INTAKE', 'Fed 42kg Layer Mash to Coop H-1 flock', ?);
  `, [now, now, now]);
}

// Database helper functions to run SQL queries cleanly
export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return rows;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function executeRun(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  persistDb(dbInstance);

  const res = dbInstance.exec("SELECT last_insert_rowid() as id, changes() as affected;");
  const lastInsertRowid = (res[0]?.values[0]?.[0] as number) || 0;
  const changes = (res[0]?.values[0]?.[1] as number) || 0;
  return { lastInsertRowid, changes };
}

export function logActivity(userId: number | null, userName: string, module: string, action: string, details: string) {
  try {
    const timestamp = new Date().toISOString();
    executeRun(`
      INSERT INTO activity_log (user_id, user_name, module, action, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?);
    `, [userId, userName, module, action, details, timestamp]);
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
