/**
 * Niro Clinical Engine - Industry Standard Diabetes Mathematics
 * Implementation based on clinical guidelines for GMI, TIR, and IOB/COB decay.
 */

import { Entry, GlucoseEntry, MedicationEntry, MealEntry } from '../types';
export type { Entry, GlucoseEntry, MedicationEntry, MealEntry };

export interface Stats {
  average: number;
  gmi: number;
  tir: number;
  cv: number;
  highs: number;
  lows: number;
}

/**
 * Calculates GMI (Glucose Management Indicator) - formerly known as "estimated A1c"
 * Formula: GMI (%) = 3.31 + (0.02392 × mean glucose in mg/dL)
 */
export const calculateGMI = (avgGlucose: number): number => {
  return 3.31 + (0.02392 * avgGlucose);
};

/**
 * Calculates TIR (Time In Range) assuming 70-180 mg/dL as standard range
 */
export const calculateTIR = (entries: Entry[], min = 70, max = 180): number => {
  const glucoseEntries = entries.filter((e): e is GlucoseEntry => e.type === 'glucose');
  if (glucoseEntries.length === 0) return 0;
  const inRange = glucoseEntries.filter(e => e.value >= min && e.value <= max);
  return (inRange.length / glucoseEntries.length) * 100;
};

/**
 * Calculates Coefficient of Variation (CV) - indicator of glucose variability
 * CV = (Standard Deviation / Mean) * 100
 * Targets below 36% indicate stable control.
 */
export const calculateCV = (entries: Entry[]): number => {
  const values = entries.filter((e): e is GlucoseEntry => e.type === 'glucose').map(e => e.value);
  if (values.length < 2) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(avgSquareDiff);
  
  return (stdDev / mean) * 100;
};

/**
 * Insulin On Board (IOB) Decay Model
 * Uses a standard 4-hour linear decay
 */
export const calculateIOB = (entries: Entry[], currentTime: Date): number => {
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
  return entries
    .filter((e): e is MedicationEntry => e.type === 'medication')
    .reduce((total, e) => {
      const entryTime = new Date(e.timestamp).getTime();
      const elapsed = currentTime.getTime() - entryTime;
      if (elapsed < 0 || elapsed > FOUR_HOURS_MS) return total;
      
      const remaining = 1 - (elapsed / FOUR_HOURS_MS);
      const value = parseFloat(e.dosage) || 0;
      return total + (value * remaining);
    }, 0);
};

/**
 * Carbs On Board (COB) Decay Model
 * Uses a standard 3-hour linear absorption model
 */
export const calculateCOB = (entries: Entry[], currentTime: Date): number => {
  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
  return entries
    .filter((e): e is MealEntry => e.type === 'meal')
    .reduce((total, e) => {
      const entryTime = new Date(e.timestamp).getTime();
      const elapsed = currentTime.getTime() - entryTime;
      if (elapsed < 0 || elapsed > THREE_HOURS_MS) return total;
      
      const remaining = 1 - (elapsed / THREE_HOURS_MS);
      return total + (e.calories * remaining); // Note: Assuming calories/carbs for model
    }, 0);
};

/**
 * Calculates Standard Deviation (SD)
 */
export const calculateSD = (entries: Entry[]): number => {
  const values = entries.filter((e): e is GlucoseEntry => e.type === 'glucose').map(e => e.value);
  if (values.length < 2) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
};

/**
 * Calculates Glucose Rate of Change (ROC) in mg/dL per minute
 */
export const calculateROC = (entries: Entry[]): number | null => {
  const readings = entries
    .filter((e): e is GlucoseEntry => e.type === 'glucose')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  if (readings.length < 2) return null;
  
  const current = readings[0];
  const previous = readings[1];
  const timeDiffMin = (new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime()) / (1000 * 60);
  
  if (timeDiffMin === 0) return 0;
  return (current.value - previous.value) / timeDiffMin;
};

/**
 * Predicts Glucose in X minutes
 */
export const predictGlucose = (entries: Entry[], minutes: number, iob = 0, isf = 50): number => {
  const readings = entries
    .filter((e): e is GlucoseEntry => e.type === 'glucose')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  if (readings.length === 0) return 0;
  
  const current = readings[0].value;
  const roc = calculateROC(entries) || 0;
  
  let prediction = current + (roc * minutes);
  prediction -= (iob * isf) * (minutes / 240);
  
  return Math.max(40, Math.min(400, Math.round(prediction)));
};

/**
 * Savitzky-Golay Filter (Simplified 3-point)
 */
export const smoothGlucose = (values: number[]): number[] => {
  if (values.length < 3) return values;
  const smoothed = [...values];
  for (let i = 1; i < values.length - 1; i++) {
    smoothed[i] = (values[i-1] + values[i] + values[i+1]) / 3;
  }
  return smoothed;
};

/**
 * Bolus Calculator Implementation
 */
export interface BolusInput {
  carbs: number;
  currentGlucose: number;
  targetGlucose: number;
  icr: number;
  isf: number;
  iob: number;
}

export const calculateBolus = (input: BolusInput): number => {
  const carbDose = input.icr > 0 ? input.carbs / input.icr : 0;
  const correctionDose = input.currentGlucose > input.targetGlucose 
    ? (input.currentGlucose - input.targetGlucose) / input.isf 
    : 0;
  
  const total = carbDose + correctionDose - input.iob;
  return Math.max(0, parseFloat(total.toFixed(2)));
};
