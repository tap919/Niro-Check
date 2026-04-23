export type EntryType = 'glucose' | 'meal' | 'medication' | 'activity' | 'journal' | 'patch';

export interface BaseEntry {
  id: string;
  timestamp: string;
  type: EntryType;
  notes?: string;
}

export interface PatchEntry extends BaseEntry {
  type: 'patch';
  patchType: 'cgm' | 'pump' | 'other';
  brand: string; // Dexcom, Libre, Omnipod, etc.
  expiryTimestamp: string;
  location: string;
}

export interface GlucoseEntry extends BaseEntry {
  type: 'glucose';
  value: number; 
  context?: 'fasting' | 'before_meal' | 'after_meal' | 'bedtime' | 'other';
}

export interface MealEntry extends BaseEntry {
  type: 'meal';
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  foodDescription?: string;
}

export interface MedicationEntry extends BaseEntry {
  type: 'medication';
  name: string;
  dosage: string;
}

export interface ActivityEntry extends BaseEntry {
  type: 'activity';
  description: string;
  duration: number; 
  intensity: 'low' | 'medium' | 'high';
}

export interface JournalEntry extends BaseEntry {
  type: 'journal';
  content: string;
  mood?: string;
}

export type Entry = GlucoseEntry | MealEntry | MedicationEntry | ActivityEntry | JournalEntry | PatchEntry;

export interface CgmConfig {
  provider: 'dexcom' | 'libre' | 'none';
  isConnected: boolean;
  lastSync?: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: 'caregiver' | 'supported';
  email: string;
  avatar?: string;
  isSharingActive: boolean;
}

export interface EhrConfig {
  provider: 'epic' | 'cerner' | 'smart_on_fhir' | 'none';
  isConnected: boolean;
  lastExport?: string;
  fhirEndpoint?: string;
}

export interface AgentDecision {
  id: string;
  timestamp: string;
  reasoning: string;
  strategy: 'repair' | 'sync' | 'optimize' | 'escalate';
  affectedNodes: string[];
  confidence: number;
}

export interface TraceStep {
  id: string;
  timestamp: string;
  tool: string;
  action: string;
  input?: any;
  output?: any;
  durationMs: number;
}

export interface HealthMetrics {
  maintenanceBacklog: number;
  syncLatencyMs: number;
  dependencyDrift: number; // 0-1
  biologicalCoverage: number; // 0-1
  prLatencyHours: number; // Simulated as 'Protocol Request' processing time
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: 'access' | 'encryption' | 'threat' | 'integrity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: string;
}

export interface UserSettings {
  name: string;
  targetRange: {
    min: number;
    max: number;
  };
  clinical?: {
    icr: number; // Insulin to Carb Ratio
    isf: number; // Insulin Sensitivity Factor
    target: number; // Target Glucose
    activeInsulinDuration: number; // Hours
  };
  unit: 'mg/dL' | 'mmol/L';
  alerts: ScheduledAlert[];
  theme: 'light' | 'dark';
  cgm?: CgmConfig;
  familyCircle: FamilyMember[];
  ehr?: EhrConfig;
  observability?: {
    enabled: boolean;
    tracingLevel: 'basic' | 'advanced';
  };
  security?: {
    e2eEncryption: boolean;
    deviceFingerprint: string;
    mfaEnabled: boolean;
  };
}

export interface ScheduledAlert {
  id: string;
  time: string; // HH:mm
  label: string;
  enabled: boolean;
  days: number[]; // 0-6 for Sun-Sat
}
