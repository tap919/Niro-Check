import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from './App';

// Mock Firebase and external services
vi.mock('./lib/firebase', () => ({
  auth: { 
    currentUser: { uid: 'test-user-id', displayName: 'Audit Node' },
    onAuthStateChanged: vi.fn((cb) => {
      cb({ uid: 'test-user-id', displayName: 'Audit Node' });
      return () => {};
    })
  },
  db: {},
  onAuthStateChanged: vi.fn((auth, cb) => {
    cb({ uid: 'test-user-id', displayName: 'Audit Node' });
    return () => {};
  }),
  onSnapshot: vi.fn((ref, cb) => {
    cb({ 
      exists: () => true, 
      data: () => ({ name: 'Audit Node', targetRange: { min: 70, max: 140 }, unit: 'mg/dL', alerts: [], theme: 'dark', familyCircle: [] }),
      docs: []
    });
    return () => {};
  }),
  doc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  setDoc: vi.fn().mockResolvedValue({}),
  testConnection: vi.fn()
}));

// Mock SpeechSynthesis
const mockSpeak = vi.fn();
if (typeof window !== 'undefined') {
  window.speechSynthesis = {
    speak: mockSpeak,
    cancel: vi.fn(),
    getVoices: () => [],
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as any;
}

describe('Niro Protocol E2E Integrity Audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Verifies Automated Data Dispersal: Core Navigation', async () => {
    render(<App />);
    
    // Check if Dashboard is primary entry point - use partial match
    await waitFor(() => {
      expect(screen.getAllByText(/Niro/i).length).toBeGreaterThan(0);
    });
    
    // Verify dispersal to Review tab (History)
    const reviewTabs = screen.getAllByText(/Review/i);
    fireEvent.click(reviewTabs[0]);
    
    // Use findByText with correct clinical archive nomenclature
    expect(await screen.findByText(/The Records/i)).toBeTruthy();
  });

  it('Verifies Concurrency: Rapid Entry Synchronization', async () => {
    render(<App />);
    
    // Add Entry tab
    const addTabs = screen.getAllByText(/Add Entry/i);
    fireEvent.click(addTabs[0]);
    
    // Wait for LogForm to mount - placeholder "100" is for glucose reading
    const glucoseInput = await screen.findByPlaceholderText("100");
    fireEvent.change(glucoseInput, { target: { value: '120' } });
    
    // Submit using the "GO" button identified in source
    const submitBtn = screen.getByText(/GO/i);
    fireEvent.click(submitBtn);
    
    // Verify sync notification triggered (message: 'Biological Node Synchronized')
    expect(await screen.findByText(/Synchronized/i)).toBeTruthy();
  });

  it('Verifies Integrity: Observability Dashboard Latency', async () => {
    // Mock global fetch for metrics
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/observability/metrics')) {
        return Promise.resolve({
          json: () => Promise.resolve({ syncLatencyMs: 120, biologicalCoverage: 0.95, maintenanceBacklog: 0, dependencyDrift: 0.01, securityScore: 99 })
        });
      }
      return Promise.resolve({ json: () => Promise.resolve([]) });
    });

    render(<App />);
    
    // Navigate to Integrity
    const integrityTabs = screen.getAllByText(/Integrity/i);
    fireEvent.click(integrityTabs[0]);
    
    // Check latency metric dispersal
    expect(await screen.findByText(/120ms/i)).toBeDefined();
    expect(screen.getAllByText(/99%/i)[0]).toBeDefined();
  });

  it('Verifies Privacy: Data Sovereignty Gate', async () => {
    render(<App />);
    
    // Settings -> Clinical
    const careTabs = screen.getAllByText(/Care/i);
    fireEvent.click(careTabs[0]);
    
    const clinicalBtn = await screen.findByText(/Clinical/i);
    fireEvent.click(clinicalBtn);
    
    // Verify Privacy Vault exists
    expect(await screen.findByText(/Privacy & Integrity Vault/i)).toBeDefined();
  });
});
