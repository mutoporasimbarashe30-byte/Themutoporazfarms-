export type Role = 'admin' | 'worker' | 'vet';
export type Species = 'pig' | 'hen' | 'ostrich';
export type AnimalStatus = 'alive' | 'sold' | 'deceased';
export type Sex = 'male' | 'female' | 'batch_mixed';
export type Source = 'born_on_farm' | 'purchased';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  contact_number: string;
  date_added: string;
  status: 'active' | 'inactive';
  activity_count?: number;
  last_active?: string;
}

export interface Animal {
  id: number;
  tag_id: string;
  species: Species;
  breed: string;
  sex: Sex;
  date_of_birth: string;
  source: Source;
  status: AnimalStatus;
  pen_location: string;
  is_batch: number;
  batch_count: number;
  notes?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
}

export interface BirthRecord {
  id: number;
  birth_date: string;
  species: Species;
  mother_id?: number | null;
  mother_tag?: string | null;
  mother_tag_ref?: string | null;
  number_born: number;
  pen_location: string;
  notes?: string;
  created_by?: number;
  logged_by_name?: string;
  created_at: string;
}

export interface DeathRecord {
  id: number;
  death_date: string;
  animal_id?: number | null;
  batch_tag?: string | null;
  animal_tag_ref?: string | null;
  species: Species;
  quantity: number;
  cause_of_death: 'disease' | 'predation' | 'natural' | 'stillbirth' | 'culled' | 'unknown';
  notes?: string;
  created_by?: number;
  logged_by_name?: string;
  created_at: string;
}

export interface Disease {
  id: number;
  name: string;
  species_affected: string;
  symptoms: string;
  recommended_medicines: string;
  dosage_info: string;
  treatment_duration: string;
  created_at?: string;
}

export interface Medicine {
  id: number;
  name: string;
  category: string;
  stock_quantity: number;
  unit: 'ml' | 'tablets' | 'doses';
  reorder_threshold: number;
  expiry_date: string;
  supplier: string;
  date_received: string;
  is_low_stock?: number;
  expiry_status?: 'good' | 'expiring_soon' | 'expired';
}

export interface HealthRecord {
  id: number;
  animal_id?: number | null;
  batch_tag?: string | null;
  animal_tag?: string | null;
  species: Species;
  date_reported: string;
  symptoms: string;
  disease_id?: number | null;
  disease_name?: string | null;
  diagnosed_condition: string;
  status: 'sick' | 'under_treatment' | 'recovered' | 'deceased';
  notes?: string;
  created_by?: number;
  reported_by_name?: string;
  created_at: string;
}

export interface Treatment {
  id: number;
  health_record_id?: number | null;
  animal_id?: number | null;
  batch_tag?: string | null;
  animal_tag?: string | null;
  species: Species;
  medicine_id: number;
  medicine_name?: string;
  medicine_unit?: string;
  dosage_given: number;
  date_administered: string;
  administered_by: string;
  recovery_status: 'recovering' | 'recovered' | 'deceased';
  notes?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
}

export interface FeedType {
  id: number;
  name: string;
  category: 'starter' | 'grower' | 'layer' | 'finisher' | 'breeder' | 'forage' | 'supplement' | 'other';
  current_stock_kg: number;
  reorder_threshold_kg: number;
  supplier: string;
  date_received: string;
  cost_per_kg: number;
  is_low_stock?: number;
}

export interface FeedLog {
  id: number;
  species: Species;
  pen_location: string;
  feed_type_id: number;
  feed_name?: string;
  feed_category?: string;
  cost_per_kg?: number;
  quantity_kg: number;
  log_date: string;
  log_time: string;
  logged_by: string;
  logged_by_user?: string;
  created_at: string;
}

export interface BreedingRecord {
  id: number;
  female_id: number;
  female_tag?: string;
  female_breed?: string;
  female_pen?: string;
  male_id: string;
  service_date: string;
  species: Species;
  expected_due_date: string;
  status: 'pregnant/incubating' | 'confirmed' | 'not_confirmed' | 'failed' | 'delivered';
  failed_reason?: string | null;
  reservice_date?: string | null;
  notes?: string;
  due_urgency?: 'overdue' | 'due_soon' | 'normal';
  created_by?: number;
  logged_by_name?: string;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  user_id?: number | null;
  user_name: string;
  module: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface DashboardOverview {
  today: string;
  totalLiveAnimals: number;
  speciesBreakdown: Array<{
    species: Species;
    totalHead: number;
    recordCount: number;
  }>;
  todayBirths: number;
  todayDeaths: number;
  sickCount: number;
  upcomingDue: Array<{
    id: number;
    species: Species;
    expected_due_date: string;
    status: string;
    female_tag: string;
    female_pen: string;
    urgency: 'overdue' | 'urgent' | 'upcoming';
  }>;
  feedStockSummary: FeedType[];
  lowFeedAlerts: FeedType[];
  medicineStockSummary: Medicine[];
  lowMedicineAlerts: Medicine[];
  expiringMedicineAlerts: Medicine[];
  recentActivity: ActivityLog[];
}
