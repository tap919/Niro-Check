import { describe, it, expect } from 'vitest';
import { 
  calculateGMI, 
  calculateTIR, 
  calculateCV, 
  calculateIOB, 
  calculateBolus, 
  calculateROC,
  predictGlucose,
  Entry
} from './lib/bioEngine';

describe('Niro Clinical Precision Suite', () => {
  
  it('Verifies GMI Accuracy: Industry Standard Formula', () => {
    // 150 mg/dL should result in ~6.9% GMI
    // 3.31 + (0.02392 * 150) = 3.31 + 3.588 = 6.898
    const gmi = calculateGMI(150);
    expect(gmi).toBeCloseTo(6.898, 2);
  });

  it('Verifies TIR Calibration: Standard 70-180 Range', () => {
    const entries: Entry[] = [
      { id: '1', type: 'glucose', value: 80, timestamp: '' },
      { id: '2', type: 'glucose', value: 120, timestamp: '' },
      { id: '3', type: 'glucose', value: 200, timestamp: '' },
      { id: '4', type: 'glucose', value: 60, timestamp: '' }
    ];
    // 2 out of 4 are in range (70-180)
    const tir = calculateTIR(entries);
    expect(tir).toBe(50);
  });

  it('Verifies Bolus Calculator: Industry Correction & Carb Logic', () => {
    const input = {
      carbs: 60,
      currentGlucose: 200,
      targetGlucose: 100,
      icr: 10,  // 1 unit per 10g carbs
      isf: 50,  // 1 unit drops 50 mg/dL
      iob: 1    // 1 unit already active
    };
    
    // Carb dose: 60 / 10 = 6 units
    // Correction: (200 - 100) / 50 = 2 units
    // Total: 6 + 2 - 1 (IOB) = 7 units
    const dose = calculateBolus(input);
    expect(dose).toBe(7);
  });

  it('Verifies IOB Decay Profile: 4-Hour Linear Model', () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    
    const entries: Entry[] = [
      { id: '1', type: 'medication', name: 'Rapid', dosage: '10', timestamp: twoHoursAgo }
    ];
    
    // After 2 hours (50% elapsed), 5 units should remain active
    const iob = calculateIOB(entries, now);
    expect(iob).toBeCloseTo(5, 1);
  });

  it('Verifies Biological ROC: Direct Delta Calculation', () => {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    
    const entries: Entry[] = [
      { id: '1', type: 'glucose', value: 150, timestamp: now.toISOString() },
      { id: '2', type: 'glucose', value: 140, timestamp: fiveMinAgo }
    ];
    
    // (150 - 140) / 5 min = +2 mg/dL per minute
    const roc = calculateROC(entries);
    expect(roc).toBe(2);
  });

  it('Verifies Glucose Prediction: 30-Minute Linear Horizon', () => {
    const now = new Date();
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    
    const entries: Entry[] = [
      { id: '1', type: 'glucose', value: 150, timestamp: now.toISOString() },
      { id: '2', type: 'glucose', value: 120, timestamp: tenMinAgo }
    ];
    
    // ROC = (150 - 120) / 10 = 3 mg/dL per minute
    // Prediction in 30 min = 150 + (3 * 30) = 240
    const prediction = predictGlucose(entries, 30);
    expect(prediction).toBe(240);
  });

});
