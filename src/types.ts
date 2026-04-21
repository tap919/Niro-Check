export type EntryType = 'glucose' | 'meal' | 'medication' | 'activity' | 'journal';

export interface BaseEntry {
  id: string;
  timestamp: string;
  type: EntryType;
  notes?: string;
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

export type Entry = GlucoseEntry | MealEntry | MedicationEntry | ActivityEntry | JournalEntry;

export interface UserSettings {
  name: string;
  targetRange: {
    min: number;
    max: number;
  };
  unit: 'mg/dL' | 'mmol/L';
  alerts: ScheduledAlert[];
  theme: 'light' | 'dark';
}

export interface ScheduledAlert {
  id: string;
  time: string; // HH:mm
  label: string;
  enabled: boolean;
  days: number[]; // 0-6 for Sun-Sat
}
