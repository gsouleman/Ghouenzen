const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite Database
const db = new Database('./data.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS testator (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS heirs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    testator_id INTEGER,
    relation TEXT NOT NULL,
    full_name TEXT NOT NULL,
    share_type TEXT,
    FOREIGN KEY (testator_id) REFERENCES testator(id)
  );

  CREATE TABLE IF NOT EXISTS executors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    testator_id INTEGER,
    full_name TEXT NOT NULL,
    contact TEXT,
    FOREIGN KEY (testator_id) REFERENCES testator(id)
  );

  CREATE TABLE IF NOT EXISTS debtors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    testator_id INTEGER,
    full_name TEXT NOT NULL,
    contact TEXT,
    reason TEXT,
    amount REAL DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (testator_id) REFERENCES testator(id)
  );

  CREATE TABLE IF NOT EXISTS creditors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    testator_id INTEGER,
    full_name TEXT NOT NULL,
    contact TEXT,
    reason TEXT,
    amount REAL DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (testator_id) REFERENCES testator(id)
  );

  CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    testator_id INTEGER,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT,
    estimated_value REAL DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (testator_id) REFERENCES testator(id)
  );
`);

// Helper function to get current testator
function getCurrentTestator() {
  return db.prepare('SELECT * FROM testator ORDER BY id DESC LIMIT 1').get();
}

// API Routes

// Testator
app.get('/api/testator', (req, res) => {
  const testator = getCurrentTestator();
  if (!testator) {
    return res.status(404).json({ error: 'No testator found' });
  }
  res.json(testator);
});

app.post('/api/testator', (req, res) => {
  const { full_name, address } = req.body;
  const stmt = db.prepare('INSERT INTO testator (full_name, address) VALUES (?, ?)');
  const result = stmt.run(full_name, address || '');
  res.json({ id: result.lastInsertRowid, message: 'Testator created' });
});

app.put('/api/testator/:id', (req, res) => {
  const { full_name, address } = req.body;
  const stmt = db.prepare('UPDATE testator SET full_name = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(full_name, address || '', req.params.id);
  res.json({ message: 'Testator updated' });
});

// Heirs
app.get('/api/heirs', (req, res) => {
  const testator = getCurrentTestator();
  if (!testator) return res.json([]);
  const heirs = db.prepare('SELECT * FROM heirs WHERE testator_id = ?').all(testator.id);
  res.json(heirs);
});

app.post('/api/heirs', (req, res) => {
  const testator = getCurrentTestator();
  if (!testator) return res.status(400).json({ error: 'No testator' });
  const { relation, full_name, share_type } = req.body;
  const stmt = db.prepare('INSERT INTO heirs (testator_id, relation, full_name, share_type) VALUES (?, ?, ?, ?)');
  const result = stmt.run(testator.id, relation, full_name, share_type);
  res.json({ id: result.lastInsertRowid, message: 'Heir added' });
});

app.put('/api/heirs/:id', (req, res) => {
  const { relation, full_name, share_type } = req.body;
  const stmt = db.prepare('UPDATE heirs SET relation = ?, full_name = ?, share_type = ? WHERE id = ?');
  stmt.run(relation, full_name, share_type, req.params.id);
  res.json({ message: 'Heir updated' });
});

app.delete('/api/heirs/:id', (req, res) => {
  db.prepare('DELETE FROM heirs WHERE id = ?').run(req.params.id);
  res.json({ message: 'Heir deleted' });
});

// Executors
app.get('/api/executors', (req, res) => {
  const testator = getCurrentTestator();
  if (!testator) return res.json([]);
  const executors = db.prepare('SELECT * FROM executors WHERE testator_id = ?').all(testator.id);
  res.json(executors);
});

app.post('/api/executors', (req, res) => {
  const testator = getCurrentTestator();
  if (!testator) return res.status(400).json({ error: 'No testator' });
  const { full_name, contact } = req.body;
  const stmt = db.prepare('INSERT INTO executors (testator_id, full_name, contact) VALUES (?, ?, ?)');
  const result = stmt.run(testator.id, full_name, contact || '');
  res.json({ id: result.lastInsertRowid, message: 'Executor added' });
});

app.put('/api/executors/:id', (req, res) => {
  const { full_name, contact } = req.body;
  const stmt = db.prepare('UPDATE executors SET full_name = ?, contact = ? WHERE id = ?');
  stmt.run(full_name, contact || '', req.params.id);
  res.json({ message: 'Executor updated' });
});

app.delete('/api/executors/:id', (req, res) => {
  db.prepare('DELETE FROM executors WHERE id = ?').run(req.params.id);
  res.json({ message: 'Executor deleted' });
});

// Debtors
app.get('/api/debtors', (req, res) => {
  const testator = getCurrentTestator();
  if (!testator) return res.json([]);
  const debtors = db.prepare('SELECT * FROM debtors WHERE testator_id = ?').all(testator.id);
  res.json(debtors);
});

app.post('/api/debtors', (req, res) => {
  const testator = getCurrentTestator();
  if (!testator) return res.status(400).json({ error: 'No testator' });
  const { full_name, contact, reason, amount, notes } = req.body;
  const stmt = db.prepare('INSERT INTO debtors (testator_id, full_name, contact, reason, amount, notes) VALUES (?, ?, ?, ?, ?, ?)');
  const result = stmt.run(testator.id, full_name, contact || '', reason || '', amount || 0, notes || '');
  res.json({ id: result.lastInsertRowid, message: 'Debtor added' });
});

app.put('/api/debtors/:id', (req, res) => {
  const { full_name, contact, reason, amount, notes } = req.body;
  const stmt = db.prepare('UPDATE debtors SET full_name = ?, contact = ?, reason = ?, amount = ?, notes = ? WHERE id = ?');
  stmt.run(full_name, contact || '', reason || '', amount || 0, notes || '', req.params.id);
  res.json({ message: 'Debtor updated' });
});

app.delete('/api/debtors/:id', (req, res) => {
  db.prepare('DELETE FROM debtors WHERE id = ?').run(req.params.id);
  res.json({ message: 'Debtor deleted' });
});

// Creditors
app.get('/api/creditors', (req, res) => {
  const testator = getCurrentTestator();
  if (!testator) return res.json([]);
  const creditors = db.prepare('SELECT * FROM creditors WHERE testator_id = ?').all(testator.id);
  res.json(creditors);
});

app.post('/api/creditors', (req, res) => {
  const testator = getCurrentTestator();
  if (!testator) return res.status(400).json({ error: 'No testator' });
  const { full_name, contact, reason, amount, notes } = req.body;
  const stmt = db.prepare('INSERT INTO creditors (testator_id, full_name, contact, reason, amount, notes) VALUES (?, ?, ?, ?, ?, ?)');
  const result = stmt.run(testator.id, full_name, contact || '', reason || '', amount || 0, notes || '');
  res.json({ id: result.lastInsertRowid, message: 'Creditor added' });
});

app.put('/api/creditors/:id', (req, res) => {
  const { full_name, contact, reason, amount, notes } = req.body;
  const stmt = db.prepare('UPDATE creditors SET full_name = ?, contact = ?, reason = ?, amount = ?, notes = ? WHERE id = ?');
  stmt.run(full_name, contact || '', reason || '', amount || 0, notes || '', req.params.id);
  res.json({ message: 'Creditor updated' });
});

app.delete('/api/creditors/:id', (req, res) => {
  db.prepare('DELETE FROM creditors WHERE id = ?').run(req.params.id);
  res.json({ message: 'Creditor deleted' });
});

// Assets
app.get('/api/assets', (req, res) => {
  const testator = getCurrentTestator();
  if (!testator) return res.json([]);
  const assets = db.prepare('SELECT * FROM assets WHERE testator_id = ?').all(testator.id);
  res.json(assets);
});

app.post('/api/assets', (req, res) => {
  const testator = getCurrentTestator();
  if (!testator) return res.status(400).json({ error: 'No testator' });
  const { category, description, location, estimated_value, notes } = req.body;
  const stmt = db.prepare('INSERT INTO assets (testator_id, category, description, location, estimated_value, notes) VALUES (?, ?, ?, ?, ?, ?)');
  const result = stmt.run(testator.id, category, description, location || '', estimated_value || 0, notes || '');
  res.json({ id: result.lastInsertRowid, message: 'Asset added' });
});

app.put('/api/assets/:id', (req, res) => {
  const { category, description, location, estimated_value, notes } = req.body;
  const stmt = db.prepare('UPDATE assets SET category = ?, description = ?, location = ?, estimated_value = ?, notes = ? WHERE id = ?');
  stmt.run(category, description, location || '', estimated_value || 0, notes || '', req.params.id);
  res.json({ message: 'Asset updated' });
});

app.delete('/api/assets/:id', (req, res) => {
  db.prepare('DELETE FROM assets WHERE id = ?').run(req.params.id);
  res.json({ message: 'Asset deleted' });
});

// Summary with Islamic inheritance calculation
app.get('/api/summary', (req, res) => {
  const testator = getCurrentTestator();
  if (!testator) {
    return res.status(404).json({ error: 'No testator found' });
  }

  const heirs = db.prepare('SELECT * FROM heirs WHERE testator_id = ?').all(testator.id);
  const debtors = db.prepare('SELECT * FROM debtors WHERE testator_id = ?').all(testator.id);
  const creditors = db.prepare('SELECT * FROM creditors WHERE testator_id = ?').all(testator.id);
  const assets = db.prepare('SELECT * FROM assets WHERE testator_id = ?').all(testator.id);
  const executors = db.prepare('SELECT * FROM executors WHERE testator_id = ?').all(testator.id);

  const totalDebtors = debtors.reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalCreditors = creditors.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalAssets = assets.reduce((sum, a) => sum + (a.estimated_value || 0), 0);
  const immovableAssets = assets.filter(a => a.category === 'immovable').reduce((sum, a) => sum + (a.estimated_value || 0), 0);
  const movableAssets = assets.filter(a => a.category === 'movable').reduce((sum, a) => sum + (a.estimated_value || 0), 0);
  const otherAssets = assets.filter(a => a.category === 'other').reduce((sum, a) => sum + (a.estimated_value || 0), 0);

  const totalPool = totalAssets + totalDebtors;
  const netEstate = totalPool - totalCreditors;

  // Calculate Islamic inheritance
  const inheritance = calculateIslamicInheritance(netEstate, heirs);

  res.json({
    testator: { full_name: testator.full_name, address: testator.address },
    totals: {
      debtors: totalDebtors,
      creditors: totalCreditors,
      assets: totalAssets,
      immovable_assets: immovableAssets,
      movable_assets: movableAssets,
      other_assets: otherAssets,
      total_pool: totalPool,
      net_estate: netEstate
    },
    inheritance,
    counts: {
      heirs: heirs.length,
      executors: executors.length,
      debtors: debtors.length,
      creditors: creditors.length,
      assets: assets.length
    }
  });
});

function calculateIslamicInheritance(netEstate, heirs) {
  if (netEstate <= 0) {
    return { status: 'insolvent', message: 'Estate is insolvent', shares: [] };
  }

  const shares = [];
  let remaining = netEstate;

  const wifeCount = heirs.filter(h => h.relation === 'wife').length;
  const motherCount = heirs.filter(h => h.relation === 'mother').length;
  const sonCount = heirs.filter(h => h.relation === 'son').length;
  const daughterCount = heirs.filter(h => h.relation === 'daughter').length;
  const hasChildren = sonCount > 0 || daughterCount > 0;

  // Wife's share: 1/8 when there are children, 1/4 otherwise
  if (wifeCount > 0) {
    const wifeFraction = hasChildren ? 1/8 : 1/4;
    const wifeShare = netEstate * wifeFraction;
    heirs.filter(h => h.relation === 'wife').forEach(h => {
      shares.push({
        name: h.full_name,
        relation: 'Wife',
        fraction: hasChildren ? '1/8' : '1/4',
        amount: wifeShare / wifeCount
      });
    });
    remaining -= wifeShare;
  }

  // Mother's share: 1/6 when there are children, 1/3 otherwise
  if (motherCount > 0) {
    const motherFraction = hasChildren ? 1/6 : 1/3;
    const motherShare = netEstate * motherFraction;
    heirs.filter(h => h.relation === 'mother').forEach(h => {
      shares.push({
        name: h.full_name,
        relation: 'Mother',
        fraction: hasChildren ? '1/6' : '1/3',
        amount: motherShare / motherCount
      });
    });
    remaining -= motherShare;
  }

  // Children share the residue (Asaba) - sons get 2 shares, daughters get 1
  if (sonCount > 0 || daughterCount > 0) {
    const totalChildShares = (sonCount * 2) + daughterCount;
    const shareUnit = remaining / totalChildShares;

    heirs.filter(h => h.relation === 'son').forEach(h => {
      shares.push({
        name: h.full_name,
        relation: 'Son',
        fraction: `2/${totalChildShares} of residue`,
        amount: shareUnit * 2
      });
    });

    heirs.filter(h => h.relation === 'daughter').forEach(h => {
      shares.push({
        name: h.full_name,
        relation: 'Daughter',
        fraction: `1/${totalChildShares} of residue`,
        amount: shareUnit
      });
    });
  }

  return { status: 'calculated', net_estate: netEstate, shares };
}

// Load demo data
app.post('/api/load-demo', (req, res) => {
  // Clear existing data
  db.exec('DELETE FROM assets; DELETE FROM creditors; DELETE FROM debtors; DELETE FROM executors; DELETE FROM heirs; DELETE FROM testator;');

  // Create testator
  const testatorStmt = db.prepare('INSERT INTO testator (full_name, address) VALUES (?, ?)');
  const testatorResult = testatorStmt.run('GHOUENZEN SOULEMANOU', 'Mankon-Bamenda, Cameroon');
  const testatorId = testatorResult.lastInsertRowid;

  // Add heirs
  const heirStmt = db.prepare('INSERT INTO heirs (testator_id, relation, full_name, share_type) VALUES (?, ?, ?, ?)');
  const heirsData = [
    ['wife', 'GHOUENZEN MEFIRE HAFSETOU', 'fixed'],
    ['mother', 'MENJIKOUE ABIBA', 'fixed'],
    ['son', 'GHOUENZEN NJOYA MOHAMED HANIF', 'residue'],
    ['son', 'GHOUENZEN SALIH NASRI SALIM', 'residue'],
    ['son', 'GHOUENZEN NJIKAM MUSTAFA HAKIM', 'residue'],
    ['daughter', 'GHOUENZEN HABIBA MARYAM IMANN', 'residue'],
    ['daughter', 'GHOUENZEN MEFIRE ZAINAB NOURA', 'residue']
  ];
  heirsData.forEach(h => heirStmt.run(testatorId, h[0], h[1], h[2]));

  // Add assets
  const assetStmt = db.prepare('INSERT INTO assets (testator_id, category, description, location, estimated_value, notes) VALUES (?, ?, ?, ?, ?, ?)');
  const assetsData = [
    ['immovable', 'Land - 400 m²', 'Foumban (West Region)', 8000000, 'Est. @ 20,000 XAF/m²'],
    ['immovable', 'Land - 4,000 m²', 'Ngombe (Littoral Region)', 40000000, 'Est. @ 10,000 XAF/m²'],
    ['immovable', 'Land - 500 m²', 'Bomono (Littoral Region)', 7500000, 'Est. @ 15,000 XAF/m²'],
    ['immovable', 'Land with Family House - 450 m²', 'Lendi (Littoral Region)', 13500000, 'Est. @ 30,000 XAF/m² (with house)'],
    ['immovable', 'Land (2nd Plot) - 450 m²', 'Lendi (Littoral Region)', 9000000, 'Est. @ 20,000 XAF/m²'],
    ['immovable', 'Land - 3,500 m²', 'Massoumbou (Littoral Region)', 24500000, 'Est. @ 7,000 XAF/m²'],
    ['immovable', 'Farmland - ~5 hectares', 'Malere (West Region)', 25000000, 'Est. @ 5M XAF/ha (agricultural)'],
    ['movable', 'Vehicle: Nissan X-Trail', 'Cameroon', 0, 'Value to be determined'],
    ['movable', 'Vehicle: Mitsubishi Single-Cabin Pickup', 'Cameroon', 0, 'Value to be determined']
  ];
  assetsData.forEach(a => assetStmt.run(testatorId, a[0], a[1], a[2], a[3], a[4]));

  res.json({ message: 'Demo data loaded', testator_id: testatorId });
});

// Reset data
app.post('/api/reset', (req, res) => {
  db.exec('DELETE FROM assets; DELETE FROM creditors; DELETE FROM debtors; DELETE FROM executors; DELETE FROM heirs; DELETE FROM testator;');
  res.json({ message: 'All data cleared' });
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/will', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'will.html'));
});

app.listen(PORT, () => {
  console.log(`Al-Wasiyyah server running on port ${PORT}`);
});
