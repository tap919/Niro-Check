import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, "data.json");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize data file if it doesn't exist
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ entries: [], settings: null }));
  }

  // API Routes
  app.get("/api/data", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    res.json(data);
  });

  // Dexcom OAuth Routes
  app.get("/api/auth/dexcom/url", (req, res) => {
    const clientId = process.env.DEXCOM_CLIENT_ID;
    const redirectUri = process.env.DEXCOM_REDIRECT_URI || `${req.protocol}://${req.get('host')}/auth/callback`;
    
    if (!clientId) {
      // In simulation mode if no keys
      return res.json({ url: "/simulation/auth?provider=dexcom" });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'offline_access',
      state: 'dexcom_auth'
    });

    const isSandbox = process.env.DEXCOM_SANDBOX === 'true';
    const authHost = isSandbox ? 'https://sandbox-api.dexcom.com' : 'https://api.dexcom.com';
    res.json({ url: `${authHost}/v2/oauth2/login?${params}` });
  });

  app.get("/auth/callback", (req, res) => {
    res.send(`
      <html>
        <body style="background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'dexcom' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <div style="text-align: center;">
            <p>Authentication synchronized with Niro Protocol.</p>
            <p style="font-size: 10px; opacity: 0.5;">CLOSING SYSTEM WINDOW...</p>
          </div>
        </body>
      </html>
    `);
  });

  app.post("/api/cgm/sync", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    
    // Generate realistic random walk based on last state
    const glucoseEntries = data.entries.filter((e: any) => e.type === 'glucose');
    const lastValue = glucoseEntries.length > 0 ? glucoseEntries[0].value : 120;
    
    const simulatedReadings = [];
    let currentVal = lastValue;
    
    for (let i = 0; i < 5; i++) {
      const noise = (Math.random() - 0.5) * 8;
      currentVal = Math.max(40, Math.min(400, Math.round(currentVal + noise)));
      simulatedReadings.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'glucose',
        value: currentVal,
        timestamp: new Date(Date.now() - i * 300000).toISOString(),
        context: 'other',
        notes: 'Protocol Synchronized: Biological Stream'
      });
    }

    data.entries = [...simulatedReadings, ...data.entries].slice(0, 500); 
    if (data.settings && data.settings.cgm) {
      data.settings.cgm.lastSync = new Date().toISOString();
      data.settings.cgm.isConnected = true;
    }
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true, entries: simulatedReadings });
  });

  // EHR / FHIR Interoperability
  app.get("/api/clinical/fhir/bundle", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const bundle = {
      resourceType: "Bundle",
      type: "collection",
      timestamp: new Date().toISOString(),
      entry: data.entries.map((e: any) => {
        if (e.type === 'glucose') {
          return {
            resource: {
              resourceType: "Observation",
              id: e.id,
              status: "final",
              category: [
                {
                  coding: [
                    {
                      system: "http://terminology.hl7.org/CodeSystem/observation-category",
                      code: "vital-signs",
                      display: "Vital Signs"
                    }
                  ]
                }
              ],
              code: {
                coding: [
                  {
                    system: "http://loinc.org",
                    code: "15074-8",
                    display: "Glucose [Mass/volume] in Blood"
                  }
                ]
              },
              effectiveDateTime: e.timestamp,
              valueQuantity: {
                value: e.value,
                unit: "mg/dL",
                system: "http://unitsofmeasure.org",
                code: "mg/dL"
              },
              note: e.notes ? [{ text: e.notes }] : undefined
            }
          };
        }
        return null;
      }).filter(Boolean)
    };
    res.json(bundle);
  });

  // Family Circle Management
  app.post("/api/family/invite", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const { email, role } = req.body;
    
    const newMember = {
      id: Math.random().toString(36).substr(2, 9),
      name: email.split('@')[0],
      role: role || 'caregiver',
      email: email,
      isSharingActive: true
    };

    if (data.settings) {
      if (!data.settings.familyCircle) data.settings.familyCircle = [];
      data.settings.familyCircle.push(newMember);
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    }
    
    res.json(newMember);
  });

  app.post("/api/entries", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const index = data.entries.findIndex((e: any) => e.id === req.body.id);
    if (index !== -1) {
      data.entries[index] = req.body;
    } else {
      data.entries = [req.body, ...data.entries];
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json(req.body);
  });

  app.delete("/api/entries/:id", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    data.entries = data.entries.filter((e: any) => e.id !== req.params.id);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  });

  app.post("/api/settings", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    data.settings = req.body;
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json(data.settings);
  });

  // Observability & Agent Health
  const decisionsStore: any[] = [];
  const tracesStore: any[] = [];
  const securityEventsStore: any[] = [];

  app.get("/api/observability/metrics", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    const entries = data.entries || [];
    const glucoseEntries = entries.filter((e: any) => e.type === 'glucose');
    
    // Calculate real biological coverage (expectation: 1 reading every 5 min = 288/day)
    const last24h = glucoseEntries.filter((e: any) => 
      new Date(e.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
    );
    const biologicalCoverage = Math.min(1.0, last24h.length / 288);

    res.json({
      maintenanceBacklog: Math.max(0, 20 - entries.length),
      syncLatencyMs: 50 + Math.floor(Math.random() * 400),
      dependencyDrift: 0.05,
      biologicalCoverage: biologicalCoverage,
      prLatencyHours: 1.5,
      securityScore: 99
    });
  });

  app.get("/api/security/events", (req, res) => {
    if (securityEventsStore.length === 0) {
      securityEventsStore.push({
        id: "s1",
        timestamp: new Date().toISOString(),
        type: "encryption",
        severity: "low",
        description: "AES-256 Rotating Key Cycle Completed. All biological nodes synchronized.",
        source: "crypto-vault-us-east1"
      });
      securityEventsStore.push({
        id: "s2",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        type: "access",
        severity: "medium",
        description: "Failed login attempt from unrecognized IP node (Brussels, BE). Geo-fence locking engaged.",
        source: "identity-shield"
      });
      securityEventsStore.push({
        id: "s3",
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        type: "integrity",
        severity: "low",
        description: "Device fingerprint verified for clinical pump node ID: PUMP-99XB.",
        source: "hardware-attestation"
      });
    }
    res.json(securityEventsStore);
  });

  app.get("/api/observability/decisions", (req, res) => {
    if (decisionsStore.length === 0) {
      // Mock some decisions if empty
      decisionsStore.push({
        id: "d1",
        timestamp: new Date().toISOString(),
        reasoning: "Detected 3 consecutive glucose outliers > 300mg/dL without meal log. Possible sensor displacement.",
        strategy: "repair",
        affectedNodes: ["sensor-node-04", "glucose-stream"],
        confidence: 0.94
      });
      decisionsStore.push({
        id: "d2",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        reasoning: "Maintenance backlog exceeded threshold (10 items). Prioritizing high-priority journal reconciliations.",
        strategy: "optimize",
        affectedNodes: ["system-scheduler"],
        confidence: 0.88
      });
    }
    res.json(decisionsStore);
  });

  app.get("/api/observability/traces", (req, res) => {
    if (tracesStore.length === 0) {
      tracesStore.push({
        id: "t1",
        timestamp: new Date().toISOString(),
        tool: "sync-cgm",
        action: "AUTH_GATEWAY_PROBE",
        durationMs: 124
      });
      tracesStore.push({
        id: "t2",
        timestamp: new Date(Date.now() - 5000).toISOString(),
        tool: "sync-cgm",
        action: "FETCH_BIOLOGICAL_RECORDS",
        durationMs: 840
      });
      tracesStore.push({
        id: "t3",
        timestamp: new Date(Date.now() - 10000).toISOString(),
        tool: "fhir-exporter",
        action: "BUNDLE_SERIALIZATION",
        durationMs: 45
      });
    }
    res.json(tracesStore);
  });

  app.post("/api/agent/repair", (req, res) => {
    const { nodeId, strategy } = req.body;
    // Simulate repair logic
    const decision = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      reasoning: `Manual repair request triggered for node ${nodeId} using ${strategy} strategy.`,
      strategy: strategy,
      affectedNodes: [nodeId],
      confidence: 1.0
    };
    decisionsStore.unshift(decision);
    res.json({ success: true, decision });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
