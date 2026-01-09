const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// PDF.js for parsing PDFs
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

// Helper function to extract text from PDF buffer
async function extractPdfText(buffer) {
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return { text: fullText, numpages: pdf.numPages };
}

// Helper function to format names: First Last only, Title Case
function formatName(name) {
  if (!name) return '';

  // Split name into parts and filter empty
  const parts = name.trim().split(/\s+/).filter(p => p);

  if (parts.length === 0) return '';

  // Get first and last name only (skip middle names)
  let firstName = parts[0];
  let lastName = parts.length > 1 ? parts[parts.length - 1] : '';

  // Convert to Title Case (first letter uppercase, rest lowercase)
  const toTitleCase = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  firstName = toTitleCase(firstName);
  lastName = toTitleCase(lastName);

  return lastName ? `${firstName} ${lastName}` : firstName;
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

const app = express();
const PORT = process.env.PORT || 9000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const DATA_DIR = process.env.DATA_DIR || './data';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// File paths for persistent storage
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SALES_FILE = path.join(DATA_DIR, 'sales.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const SALESPEOPLE_FILE = path.join(DATA_DIR, 'salespeople.json');
const TEAMS_FILE = path.join(DATA_DIR, 'teams.json');

// Helper functions for file-based storage
function readJSON(filePath, defaultValue = []) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  return defaultValue;
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
  }
}

// Initialize default admin user if no users exist
function initializeDefaults() {
  const users = readJSON(USERS_FILE, []);
  if (users.length === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const defaultAdmin = {
      id: uuidv4(),
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      fullName: 'System Administrator',
      email: 'admin@dealership.com',
      createdAt: new Date().toISOString()
    };
    writeJSON(USERS_FILE, [defaultAdmin]);
    console.log('Default admin user created (username: admin, password: admin123)');
  }

  const settings = readJSON(SETTINGS_FILE, null);
  if (!settings) {
    const defaultSettings = {
      packAmount: 500,
      workingDaysPerMonth: 22,
      salesTargetPerDay: 3,
      commissionRate: 2.5,
      dealershipName: 'Auto Sales Dealership',
      fiscalYearStart: 'January'
    };
    writeJSON(SETTINGS_FILE, defaultSettings);
    console.log('Default settings created');
  }

  const salespeople = readJSON(SALESPEOPLE_FILE, []);
  if (salespeople.length === 0) {
    const defaultSalespeople = [
      { id: uuidv4(), name: 'John Smith', active: true, hireDate: '2023-01-15' },
      { id: uuidv4(), name: 'Sarah Johnson', active: true, hireDate: '2023-03-20' },
      { id: uuidv4(), name: 'Mike Davis', active: true, hireDate: '2022-11-01' }
    ];
    writeJSON(SALESPEOPLE_FILE, defaultSalespeople);
    console.log('Default salespeople created');
  }
}

initializeDefaults();

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ============ AUTH ROUTES ============
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const users = readJSON(USERS_FILE, []);

  const user = users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      email: user.email
    }
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const users = readJSON(USERS_FILE, []);
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    email: user.email
  });
});

// ============ USER MANAGEMENT ROUTES ============
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  const users = readJSON(USERS_FILE, []);
  res.json(users.map(u => ({
    id: u.id,
    username: u.username,
    role: u.role,
    fullName: u.fullName,
    email: u.email,
    createdAt: u.createdAt
  })));
});

app.post('/api/users', authenticateToken, requireAdmin, (req, res) => {
  const { username, password, role, fullName, email } = req.body;
  const users = readJSON(USERS_FILE, []);

  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const newUser = {
    id: uuidv4(),
    username,
    password: bcrypt.hashSync(password, 10),
    role: role || 'user',
    fullName,
    email,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeJSON(USERS_FILE, users);

  res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    role: newUser.role,
    fullName: newUser.fullName,
    email: newUser.email
  });
});

app.put('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { username, password, role, fullName, email } = req.body;
  const users = readJSON(USERS_FILE, []);

  const index = users.findIndex(u => u.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  users[index] = {
    ...users[index],
    username: username || users[index].username,
    role: role || users[index].role,
    fullName: fullName || users[index].fullName,
    email: email || users[index].email
  };

  if (password) {
    users[index].password = bcrypt.hashSync(password, 10);
  }

  writeJSON(USERS_FILE, users);

  res.json({
    id: users[index].id,
    username: users[index].username,
    role: users[index].role,
    fullName: users[index].fullName,
    email: users[index].email
  });
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  let users = readJSON(USERS_FILE, []);

  const user = users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.username === 'admin') {
    return res.status(400).json({ error: 'Cannot delete default admin user' });
  }

  users = users.filter(u => u.id !== id);
  writeJSON(USERS_FILE, users);

  res.json({ message: 'User deleted successfully' });
});

// ============ SALES ROUTES ============
app.get('/api/sales', authenticateToken, (req, res) => {
  const { startDate, endDate, salespersonId } = req.query;
  let sales = readJSON(SALES_FILE, []);

  if (startDate) {
    sales = sales.filter(s => s.saleDate >= startDate);
  }
  if (endDate) {
    sales = sales.filter(s => s.saleDate <= endDate);
  }
  if (salespersonId) {
    sales = sales.filter(s => s.salespersonId === salespersonId);
  }

  res.json(sales.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate)));
});

app.post('/api/sales', authenticateToken, (req, res) => {
  const {
    dealNumber,
    stockNumber,
    frontEnd,
    backEnd,
    salespersonId,
    salespersonName,
    saleDate,
    customerName,
    serviceComplete,
    cpo,
    sslp,
    delivered,
    notes,
    shopBill
  } = req.body;

  // Handle salesperson(s) - supports split deals with "/" separator
  let finalSalespersonId = salespersonId;
  let secondSalespersonId = null;
  let isSplit = false;

  // Helper function to find salesperson by name or nickname
  const findSalesperson = (salespeople, searchName) => {
    const searchLower = searchName.toLowerCase();
    return salespeople.find(sp =>
      sp.name.toLowerCase() === searchLower ||
      (sp.nickname && sp.nickname.toLowerCase() === searchLower)
    );
  };

  if (salespersonName && !salespersonId) {
    const salespeople = readJSON(SALESPEOPLE_FILE, []);

    // Check if it's a split deal (contains "/")
    const names = salespersonName.split('/').map(n => n.trim()).filter(n => n);

    if (names.length >= 2) {
      isSplit = true;
      // First salesperson
      let sp1 = findSalesperson(salespeople, names[0]);
      if (!sp1) {
        sp1 = { id: uuidv4(), name: names[0], nickname: '', active: true, hireDate: new Date().toISOString().split('T')[0] };
        salespeople.push(sp1);
        console.log(`Auto-created salesperson: ${names[0]}`);
      }
      finalSalespersonId = sp1.id;

      // Second salesperson
      let sp2 = findSalesperson(salespeople, names[1]);
      if (!sp2) {
        sp2 = { id: uuidv4(), name: names[1], nickname: '', active: true, hireDate: new Date().toISOString().split('T')[0] };
        salespeople.push(sp2);
        console.log(`Auto-created salesperson: ${names[1]}`);
      }
      secondSalespersonId = sp2.id;

      writeJSON(SALESPEOPLE_FILE, salespeople);
    } else {
      // Single salesperson
      let salesperson = findSalesperson(salespeople, names[0]);
      if (!salesperson) {
        salesperson = { id: uuidv4(), name: names[0], nickname: '', active: true, hireDate: new Date().toISOString().split('T')[0] };
        salespeople.push(salesperson);
        writeJSON(SALESPEOPLE_FILE, salespeople);
        console.log(`Auto-created salesperson: ${names[0]}`);
      }
      finalSalespersonId = salesperson.id;
    }
  }

  const settings = readJSON(SETTINGS_FILE, {});
  const packAmount = settings.packAmount || 500;
  // Gross profit is front + back (pack is tracked separately for reporting)
  const grossProfit = frontEnd + backEnd;

  const newSale = {
    id: uuidv4(),
    dealNumber,
    stockNumber,
    frontEnd,
    backEnd,
    packAmount,
    grossProfit,
    shopBill: shopBill || 0,
    salespersonId: finalSalespersonId,
    secondSalespersonId,
    isSplit,
    saleDate: saleDate || new Date().toISOString().split('T')[0],
    customerName,
    serviceComplete: serviceComplete || false,
    cpo: cpo || false,
    sslp: sslp || false,
    delivered: delivered || false,
    notes,
    createdBy: req.user.id,
    createdAt: new Date().toISOString()
  };

  const sales = readJSON(SALES_FILE, []);
  sales.push(newSale);
  writeJSON(SALES_FILE, sales);

  res.status(201).json(newSale);
});


app.put('/api/sales/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const sales = readJSON(SALES_FILE, []);

  const index = sales.findIndex(s => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Sale not found' });
  }

  // Handle salesperson(s) - supports split deals with "/" separator
  let salespersonId = req.body.salespersonId || sales[index].salespersonId;
  let secondSalespersonId = sales[index].secondSalespersonId || null;
  let isSplit = sales[index].isSplit || false;

  // Helper function to find salesperson by name or nickname
  const findSalesperson = (salespeople, searchName) => {
    const searchLower = searchName.toLowerCase();
    return salespeople.find(sp =>
      sp.name.toLowerCase() === searchLower ||
      (sp.nickname && sp.nickname.toLowerCase() === searchLower)
    );
  };

  if (req.body.salespersonName && !req.body.salespersonId) {
    const salespeople = readJSON(SALESPEOPLE_FILE, []);
    const names = req.body.salespersonName.split('/').map(n => n.trim()).filter(n => n);

    if (names.length >= 2) {
      isSplit = true;
      let sp1 = findSalesperson(salespeople, names[0]);
      if (!sp1) {
        sp1 = { id: uuidv4(), name: names[0], nickname: '', active: true, hireDate: new Date().toISOString().split('T')[0] };
        salespeople.push(sp1);
      }
      salespersonId = sp1.id;

      let sp2 = findSalesperson(salespeople, names[1]);
      if (!sp2) {
        sp2 = { id: uuidv4(), name: names[1], nickname: '', active: true, hireDate: new Date().toISOString().split('T')[0] };
        salespeople.push(sp2);
      }
      secondSalespersonId = sp2.id;
      writeJSON(SALESPEOPLE_FILE, salespeople);
    } else {
      isSplit = false;
      secondSalespersonId = null;
      let salesperson = findSalesperson(salespeople, names[0]);
      if (!salesperson) {
        salesperson = { id: uuidv4(), name: names[0], nickname: '', active: true, hireDate: new Date().toISOString().split('T')[0] };
        salespeople.push(salesperson);
        writeJSON(SALESPEOPLE_FILE, salespeople);
      }
      salespersonId = salesperson.id;
    }
  }

  const settings = readJSON(SETTINGS_FILE, {});
  const packAmount = settings.packAmount || 500;

  const updatedSale = {
    ...sales[index],
    ...req.body,
    salespersonId,
    secondSalespersonId,
    isSplit,
    packAmount,
    updatedAt: new Date().toISOString()
  };

  delete updatedSale.salespersonName;

  // Recalculate gross profit if front or back end changed (pack is tracked separately)
  if (req.body.frontEnd !== undefined || req.body.backEnd !== undefined) {
    updatedSale.grossProfit = updatedSale.frontEnd + updatedSale.backEnd;
  }

  sales[index] = updatedSale;
  writeJSON(SALES_FILE, sales);

  res.json(updatedSale);
});

app.delete('/api/sales/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  let sales = readJSON(SALES_FILE, []);

  if (!sales.find(s => s.id === id)) {
    return res.status(404).json({ error: 'Sale not found' });
  }

  sales = sales.filter(s => s.id !== id);
  writeJSON(SALES_FILE, sales);

  res.json({ message: 'Sale deleted successfully' });
});

// ============ SALESPEOPLE ROUTES ============
app.get('/api/salespeople', authenticateToken, (req, res) => {
  const salespeople = readJSON(SALESPEOPLE_FILE, []);
  res.json(salespeople);
});

app.post('/api/salespeople', authenticateToken, requireAdmin, (req, res) => {
  const { name, nickname, hireDate, monthlyGoal } = req.body;
  const salespeople = readJSON(SALESPEOPLE_FILE, []);

  // Check for duplicate name (case-insensitive)
  const nameLower = name.trim().toLowerCase();
  const existingByName = salespeople.find(sp => sp.name.toLowerCase() === nameLower);
  if (existingByName) {
    return res.status(400).json({ error: `A salesperson with the name "${name}" already exists` });
  }

  // Check for duplicate nickname if provided (case-insensitive)
  if (nickname && nickname.trim()) {
    const nicknameLower = nickname.trim().toLowerCase();
    const existingByNickname = salespeople.find(sp =>
      sp.nickname && sp.nickname.toLowerCase() === nicknameLower
    );
    if (existingByNickname) {
      return res.status(400).json({ error: `A salesperson with the nickname "${nickname}" already exists (${existingByNickname.name})` });
    }
  }

  const newSalesperson = {
    id: uuidv4(),
    name: name.trim(),
    nickname: nickname ? nickname.trim() : '',
    active: true,
    hireDate: hireDate || new Date().toISOString().split('T')[0],
    monthlyGoal: monthlyGoal || 0
  };

  salespeople.push(newSalesperson);
  writeJSON(SALESPEOPLE_FILE, salespeople);

  res.status(201).json(newSalesperson);
});

app.put('/api/salespeople/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, nickname } = req.body;
  const salespeople = readJSON(SALESPEOPLE_FILE, []);

  const index = salespeople.findIndex(s => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Salesperson not found' });
  }

  // Check for duplicate name if name is being updated (case-insensitive, exclude current)
  if (name && name.trim()) {
    const nameLower = name.trim().toLowerCase();
    const existingByName = salespeople.find(sp =>
      sp.id !== id && sp.name.toLowerCase() === nameLower
    );
    if (existingByName) {
      return res.status(400).json({ error: `A salesperson with the name "${name}" already exists` });
    }
  }

  // Check for duplicate nickname if nickname is being updated (case-insensitive, exclude current)
  if (nickname && nickname.trim()) {
    const nicknameLower = nickname.trim().toLowerCase();
    const existingByNickname = salespeople.find(sp =>
      sp.id !== id && sp.nickname && sp.nickname.toLowerCase() === nicknameLower
    );
    if (existingByNickname) {
      return res.status(400).json({ error: `A salesperson with the nickname "${nickname}" already exists (${existingByNickname.name})` });
    }
  }

  // Trim name and nickname if provided
  const updates = { ...req.body };
  if (updates.name) updates.name = updates.name.trim();
  if (updates.nickname) updates.nickname = updates.nickname.trim();

  salespeople[index] = { ...salespeople[index], ...updates };
  writeJSON(SALESPEOPLE_FILE, salespeople);

  res.json(salespeople[index]);
});

app.delete('/api/salespeople/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  let salespeople = readJSON(SALESPEOPLE_FILE, []);

  if (!salespeople.find(s => s.id === id)) {
    return res.status(404).json({ error: 'Salesperson not found' });
  }

  salespeople = salespeople.filter(s => s.id !== id);
  writeJSON(SALESPEOPLE_FILE, salespeople);

  res.json({ message: 'Salesperson deleted successfully' });
});

// ============ SETTINGS ROUTES ============
app.get('/api/settings', authenticateToken, (req, res) => {
  const settings = readJSON(SETTINGS_FILE, {});
  res.json(settings);
});

app.put('/api/settings', authenticateToken, requireAdmin, (req, res) => {
  const currentSettings = readJSON(SETTINGS_FILE, {});
  const updatedSettings = { ...currentSettings, ...req.body };
  writeJSON(SETTINGS_FILE, updatedSettings);
  res.json(updatedSettings);
});

// ============ ANALYTICS ROUTES ============
// Helper function to get current date in CST (America/Chicago)
function getCSTDateString() {
  const now = new Date();
  // Convert to CST timezone
  const cstOptions = { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' };
  const cstParts = new Intl.DateTimeFormat('en-CA', cstOptions).format(now); // en-CA gives YYYY-MM-DD format
  return cstParts;
}

function getCSTDate() {
  const dateStr = getCSTDateString();
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day, dateStr };
}

app.get('/api/analytics/dashboard', authenticateToken, (req, res) => {
  const sales = readJSON(SALES_FILE, []);
  const salespeople = readJSON(SALESPEOPLE_FILE, []);
  const settings = readJSON(SETTINGS_FILE, {});

  // Use CST timezone for all date calculations
  const cst = getCSTDate();
  const today = cst.dateStr;
  const thisMonth = `${cst.year}-${String(cst.month).padStart(2, '0')}`;
  const thisYear = String(cst.year);

  // Today's sales
  const todaySales = sales.filter(s => s.saleDate === today);
  const todayCount = todaySales.length;
  const todayRevenue = todaySales.reduce((sum, s) => sum + (s.frontEnd || 0), 0);
  const todayProfit = todaySales.reduce((sum, s) => sum + s.grossProfit, 0);

  // This month's sales
  const monthSales = sales.filter(s => s.saleDate.startsWith(thisMonth));
  const monthCount = monthSales.length;
  const monthRevenue = monthSales.reduce((sum, s) => sum + (s.frontEnd || 0), 0);
  const monthProfit = monthSales.reduce((sum, s) => sum + s.grossProfit, 0);

  // This year's sales
  const yearSales = sales.filter(s => s.saleDate.startsWith(thisYear));
  const yearCount = yearSales.length;
  const yearRevenue = yearSales.reduce((sum, s) => sum + (s.frontEnd || 0), 0);
  const yearProfit = yearSales.reduce((sum, s) => sum + s.grossProfit, 0);

  // Daily target progress
  const targetPerDay = settings.salesTargetPerDay || 3;
  const dailyProgress = (todayCount / targetPerDay) * 100;

  // Monthly target (working days * daily target)
  const workingDays = settings.workingDaysPerMonth || 22;
  const monthlyTarget = workingDays * targetPerDay;
  const monthlyProgress = (monthCount / monthlyTarget) * 100;

  // Sales by salesperson (this month) - handles splits
  const salesBySalesperson = salespeople.map(sp => {
    // Get sales where this person is primary
    const primarySales = monthSales.filter(s => s.salespersonId === sp.id);
    // Get sales where this person is secondary (split)
    const secondarySales = monthSales.filter(s => s.secondSalespersonId === sp.id);

    // Count: full credit for non-split primary, 0.5 for splits (primary or secondary)
    let salesCount = 0;
    let revenue = 0;
    let profit = 0;

    primarySales.forEach(s => {
      if (s.isSplit) {
        salesCount += 0.5;
        revenue += (s.frontEnd || 0) / 2;
        profit += (s.grossProfit || 0) / 2;
      } else {
        salesCount += 1;
        revenue += (s.frontEnd || 0);
        profit += (s.grossProfit || 0);
      }
    });

    secondarySales.forEach(s => {
      salesCount += 0.5;
      revenue += (s.frontEnd || 0) / 2;
      profit += (s.grossProfit || 0) / 2;
    });

    return {
      id: sp.id,
      name: sp.name,
      salesCount,
      revenue,
      profit
    };
  }).sort((a, b) => b.salesCount - a.salesCount);

  // Daily sales for the last 30 days (using CST)
  const last30Days = [];
  // Start from today in CST and go back
  const cstToday = new Date(`${today}T12:00:00`); // Use noon to avoid timezone edge cases
  for (let i = 29; i >= 0; i--) {
    const date = new Date(cstToday);
    date.setDate(cstToday.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const daySales = sales.filter(s => s.saleDate === dateStr);
    last30Days.push({
      date: dateStr,
      count: daySales.length,
      revenue: daySales.reduce((sum, s) => sum + (s.frontEnd || 0), 0),
      profit: daySales.reduce((sum, s) => sum + s.grossProfit, 0)
    });
  }

  // Monthly sales for the last 12 months (using CST)
  const last12Months = [];
  for (let i = 11; i >= 0; i--) {
    // Calculate month offset from current CST month
    let targetMonth = cst.month - i;
    let targetYear = cst.year;
    while (targetMonth <= 0) {
      targetMonth += 12;
      targetYear -= 1;
    }
    const monthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
    const mSales = sales.filter(s => s.saleDate && s.saleDate.startsWith(monthStr));
    last12Months.push({
      month: monthStr,
      count: mSales.length,
      revenue: mSales.reduce((sum, s) => sum + (s.frontEnd || 0), 0),
      profit: mSales.reduce((sum, s) => sum + (s.grossProfit || 0), 0)
    });
  }

  res.json({
    today: { count: todayCount, revenue: todayRevenue, profit: todayProfit },
    month: { count: monthCount, revenue: monthRevenue, profit: monthProfit },
    year: { count: yearCount, revenue: yearRevenue, profit: yearProfit },
    targets: {
      daily: { target: targetPerDay, actual: todayCount, progress: dailyProgress },
      monthly: { target: monthlyTarget, actual: monthCount, progress: monthlyProgress }
    },
    salesBySalesperson,
    dailySales: last30Days,
    monthlySales: last12Months
  });
});

// Teams API
app.get('/api/teams', authenticateToken, (req, res) => {
  const teams = readJSON(TEAMS_FILE, []);
  res.json(teams);
});

app.get('/api/teams/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const teams = readJSON(TEAMS_FILE, []);
  const team = teams.find(t => t.id === id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }
  res.json(team);
});

app.post('/api/teams', authenticateToken, requireAdmin, (req, res) => {
  const { name, description, color, members, contestName, startDate, endDate, goal } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Team name is required' });
  }

  const teams = readJSON(TEAMS_FILE, []);

  // Check for duplicate team name
  if (teams.some(t => t.name.toLowerCase() === name.toLowerCase())) {
    return res.status(400).json({ error: 'A team with this name already exists' });
  }

  const newTeam = {
    id: uuidv4(),
    name: name.trim(),
    description: description || '',
    color: color || '#3b82f6',
    members: members || [],
    contestName: contestName || '',
    startDate: startDate || null,
    endDate: endDate || null,
    goal: goal || 0,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  teams.push(newTeam);
  writeJSON(TEAMS_FILE, teams);

  res.status(201).json(newTeam);
});

app.put('/api/teams/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  let teams = readJSON(TEAMS_FILE, []);
  const teamIndex = teams.findIndex(t => t.id === id);

  if (teamIndex === -1) {
    return res.status(404).json({ error: 'Team not found' });
  }

  // Check for duplicate name if name is being updated
  if (updates.name && updates.name.toLowerCase() !== teams[teamIndex].name.toLowerCase()) {
    if (teams.some(t => t.id !== id && t.name.toLowerCase() === updates.name.toLowerCase())) {
      return res.status(400).json({ error: 'A team with this name already exists' });
    }
  }

  teams[teamIndex] = {
    ...teams[teamIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  writeJSON(TEAMS_FILE, teams);
  res.json(teams[teamIndex]);
});

app.delete('/api/teams/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  let teams = readJSON(TEAMS_FILE, []);

  if (!teams.find(t => t.id === id)) {
    return res.status(404).json({ error: 'Team not found' });
  }

  teams = teams.filter(t => t.id !== id);
  writeJSON(TEAMS_FILE, teams);

  res.json({ message: 'Team deleted successfully' });
});

// Get team stats with sales data
app.get('/api/teams/:id/stats', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;

  const teams = readJSON(TEAMS_FILE, []);
  const team = teams.find(t => t.id === id);

  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const sales = readJSON(SALES_FILE, []);
  const settings = readJSON(SETTINGS_FILE, {});
  const packAmount = settings.packAmount || 500;

  // Filter sales by date range if provided
  let filteredSales = sales;
  if (startDate || endDate || team.startDate || team.endDate) {
    const start = startDate || team.startDate;
    const end = endDate || team.endDate;

    filteredSales = sales.filter(s => {
      if (!s.saleDate) return false;
      const saleDate = s.saleDate.split('T')[0];
      if (start && saleDate < start) return false;
      if (end && saleDate > end) return false;
      return true;
    });
  }

  // Calculate stats for team members
  const memberStats = team.members.map(memberId => {
    let count = 0;
    let frontEnd = 0;
    let backEnd = 0;
    let gross = 0;

    filteredSales.forEach(s => {
      if (s.salespersonId === memberId) {
        const mult = s.isSplit ? 0.5 : 1;
        count += mult;
        frontEnd += (s.frontEnd || 0) * mult;
        backEnd += (s.backEnd || 0) * mult;
        gross += (s.grossProfit || 0) * mult;
      }
      if (s.secondSalespersonId === memberId) {
        count += 0.5;
        frontEnd += (s.frontEnd || 0) * 0.5;
        backEnd += (s.backEnd || 0) * 0.5;
        gross += (s.grossProfit || 0) * 0.5;
      }
    });

    return { memberId, count, frontEnd, backEnd, gross };
  });

  const totalCount = memberStats.reduce((sum, m) => sum + m.count, 0);
  const totalFrontEnd = memberStats.reduce((sum, m) => sum + m.frontEnd, 0);
  const totalBackEnd = memberStats.reduce((sum, m) => sum + m.backEnd, 0);
  const totalGross = memberStats.reduce((sum, m) => sum + m.gross, 0);

  res.json({
    team,
    stats: {
      totalCount,
      totalFrontEnd,
      totalBackEnd,
      totalGross,
      memberStats,
      goalProgress: team.goal > 0 ? (totalCount / team.goal) * 100 : 0
    }
  });
});

// ============ PDF IMPORT ROUTES ============

// Helper function to parse F&I Management Report PDF
function parseFIReportPDF(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const records = [];

  // Find where the actual data starts (after header row)
  let dataStartIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Deal Date') && lines[i].includes('Deal Number')) {
      dataStartIndex = i + 1;
      break;
    }
  }

  // Parse the combined text block - the PDF text comes as a continuous string per record
  // We need to identify patterns: Date at start (MM/DD/YYYY), then deal number, etc.
  const datePattern = /^(\d{1,2}\/\d{1,2}\/\d{4})/;
  const fullText = text;

  // Split by date patterns to get individual records
  const recordTexts = fullText.split(/(?=\d{1,2}\/\d{1,2}\/\d{4})/);

  for (const recordText of recordTexts) {
    const trimmed = recordText.trim();
    if (!trimmed || !datePattern.test(trimmed)) continue;

    try {
      // Extract date
      const dateMatch = trimmed.match(datePattern);
      if (!dateMatch) continue;
      const dealDate = dateMatch[1];

      // Extract deal number (5-6 digits after date)
      const dealNumMatch = trimmed.match(/\d{1,2}\/\d{1,2}\/\d{4}\s*(\d{5,6})/);
      if (!dealNumMatch) continue;
      const dealNumber = dealNumMatch[1];

      // Extract deal type (Retail or Lease)
      const dealTypeMatch = trimmed.match(/\d{5,6}\s*(Retail|Lease)/i);
      const dealType = dealTypeMatch ? dealTypeMatch[1] : 'Retail';

      // Extract vehicle year, make, model (YYYY MAKE MODEL pattern)
      const vehicleMatch = trimmed.match(/(Retail|Lease)\s*(\d{4})\s*([A-Z]+)\s+([A-Z][A-Z0-9\s\.]+?)(?=\s+[\d\-,]+\.\d{2}|\s+\d{1}[A-Z]\d)/i);
      let vehicleYear = '', vehicleMake = '', vehicleModel = '';
      if (vehicleMatch) {
        vehicleYear = vehicleMatch[2];
        vehicleMake = vehicleMatch[3].trim();
        vehicleModel = vehicleMatch[4].trim().replace(/\.{3}$/, '');
      }

      // Extract price and stock number - look for pattern like "34,159.07 5S8959B" or just price
      const priceStockMatch = trimmed.match(/([0-9,]+\.\d{2})\s+([A-Z0-9]+)?\s+(-?[0-9,]+\.\d{2})\s+(-?[0-9,]+\.\d{2})/);
      let vehiclePrice = 0, stockNumber = '', frontEnd = 0, backEnd = 0;

      if (priceStockMatch) {
        vehiclePrice = parseFloat(priceStockMatch[1].replace(/,/g, ''));
        stockNumber = priceStockMatch[2] || '';
        frontEnd = parseFloat(priceStockMatch[3].replace(/,/g, ''));
        backEnd = parseFloat(priceStockMatch[4].replace(/,/g, ''));
      }

      // Extract salesperson(s) - pattern: NAME (ID)
      const salespersonMatches = trimmed.matchAll(/([A-Z][A-Z\s]+?)\s*\((\d+)\)/g);
      const salespeople = Array.from(salespersonMatches).map(m => ({
        name: formatName(m[1].trim()),
        employeeId: m[2]
      }));

      // First salesperson is primary, second is split if exists, third is desk manager
      let salesperson1 = salespeople[0] || null;
      let salesperson2 = null;
      let deskManager = null;

      if (salespeople.length >= 3) {
        salesperson2 = salespeople[1];
        deskManager = salespeople[2];
      } else if (salespeople.length === 2) {
        // Could be sp1 + desk or sp1 + sp2 - check if second appears to be desk manager
        // Desk managers typically have names like JEFFERY D SAPP, JOSE M AYALA
        deskManager = salespeople[1];
      }

      // Find the last person with ID (desk manager) - everything after is notes + customer name
      const personIdMatches = [...trimmed.matchAll(/\(\d+\)/g)];
      let remainingText = '';
      if (personIdMatches.length > 0) {
        const lastMatch = personIdMatches[personIdMatches.length - 1];
        const lastIndex = lastMatch.index + lastMatch[0].length;
        remainingText = trimmed.slice(lastIndex).trim();
      }

      // Extract customer name - proper name pattern (FIRST MIDDLE? LAST) at the end
      // Customer names look like "HAYLEY ELIZABETH SMITH" or "DANIEL ANTHONY SORIA"
      // They appear after notes and before "Yes" (if certified)
      let customerName = '';
      let notes = '';

      // Check if certified (ends with Yes)
      const certified = /\bYes\s*$/.test(trimmed); // Keep original certified logic

      // Remove trailing "Yes" if present from remainingText
      const certifiedMatchInRemaining = remainingText.match(/\s+Yes\s*$/);
      if (certifiedMatchInRemaining) {
        remainingText = remainingText.slice(0, -certifiedMatchInRemaining[0].length);
      }

      // Split remaining text - look for customer name pattern at end
      // Customer names are 2-4 capitalized words without numbers or special chars like /
      // Also allow trailing ellipsis (PDF truncation)

      // First remove trailing ellipsis if present
      remainingText = remainingText.replace(/\.{3}$/, '').trim();

      // Common business keywords to exclude from customer names
      const businessKeywords = /\d|\/|TBB|SAF|FUNDED|FUNDING|PENDING|HOLDING|RESIGN|LEASE|BUYOUT|CANCEL|ADDS|PRICING|MANAGER|TITLE/i;

      const customerNameMatch = remainingText.match(/\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})\s*$/);
      if (customerNameMatch && !customerNameMatch[1].match(businessKeywords)) {
        customerName = customerNameMatch[1].trim();
        notes = remainingText.slice(0, remainingText.length - customerNameMatch[0].length).trim();
      } else {
        // Try all-caps pattern for names like "DANIEL ANTHONY SORIA"
        const capsCustomerMatch = remainingText.match(/\s+([A-Z]+(?:\s+[A-Z]+){1,3})\s*$/);
        if (capsCustomerMatch && !capsCustomerMatch[1].match(businessKeywords)) {
          customerName = capsCustomerMatch[1].trim();
          notes = remainingText.slice(0, remainingText.length - capsCustomerMatch[0].length).trim();
        } else {
          notes = remainingText.trim();
        }
      }

      // Convert date from MM/DD/YYYY to YYYY-MM-DD
      const dateParts = dealDate.split('/');
      const saleDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;

      records.push({
        saleDate,
        dealNumber,
        dealType,
        vehicleYear: parseInt(vehicleYear) || null,
        vehicleMake,
        vehicleModel,
        vehiclePrice,
        stockNumber,
        frontEnd,
        backEnd,
        grossProfit: frontEnd + backEnd,
        salesperson1,
        salesperson2,
        deskManager: deskManager ? formatName(deskManager.name) : '',
        customerName: formatName(customerName),
        certified,
        notes,
        rawText: trimmed.substring(0, 200) // For debugging
      });
    } catch (err) {
      console.error('Error parsing record:', err.message);
    }
  }

  return records;
}

// Preview PDF import - returns parsed data with duplicate detection
app.post('/api/sales/import-pdf', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Parse PDF
    const pdfData = await extractPdfText(req.file.buffer);
    const records = parseFIReportPDF(pdfData.text);

    if (records.length === 0) {
      return res.status(400).json({ error: 'No valid records found in PDF. Ensure this is an F&I Management Report.' });
    }

    // Get existing data for duplicate detection and salesperson matching
    const existingSales = readJSON(SALES_FILE, []);
    const existingSalespeople = readJSON(SALESPEOPLE_FILE, []);

    // Process each record
    const processedRecords = records.map(record => {
      // Check for duplicate by deal number
      const existingSale = existingSales.find(s => s.dealNumber === record.dealNumber);

      // Match or prepare to create salespeople
      let salesperson1Match = null;
      let salesperson2Match = null;

      if (record.salesperson1) {
        salesperson1Match = existingSalespeople.find(sp =>
          sp.employeeId === record.salesperson1.employeeId ||
          sp.name.toLowerCase() === record.salesperson1.name.toLowerCase()
        );
      }

      if (record.salesperson2) {
        salesperson2Match = existingSalespeople.find(sp =>
          sp.employeeId === record.salesperson2.employeeId ||
          sp.name.toLowerCase() === record.salesperson2.name.toLowerCase()
        );
      }

      return {
        ...record,
        isDuplicate: !!existingSale,
        existingSaleId: existingSale?.id || null,
        salesperson1Exists: !!salesperson1Match,
        salesperson1Id: salesperson1Match?.id || null,
        salesperson2Exists: !!salesperson2Match,
        salesperson2Id: salesperson2Match?.id || null,
        duplicateAction: existingSale ? 'skip' : 'create' // Default action
      };
    });

    res.json({
      success: true,
      totalRecords: processedRecords.length,
      duplicates: processedRecords.filter(r => r.isDuplicate).length,
      newSalespeople: processedRecords.filter(r => r.salesperson1 && !r.salesperson1Exists).length,
      records: processedRecords
    });

  } catch (error) {
    console.error('PDF import error:', error);
    res.status(500).json({ error: 'Failed to parse PDF: ' + error.message });
  }
});

// Confirm and execute PDF import
app.post('/api/sales/import-pdf/confirm', authenticateToken, async (req, res) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Invalid request: records array required' });
    }

    const sales = readJSON(SALES_FILE, []);
    const salespeople = readJSON(SALESPEOPLE_FILE, []);
    const settings = readJSON(SETTINGS_FILE, {});
    const packAmount = settings.packAmount || 500;

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let salespeopleCreated = 0;

    for (const record of records) {
      // Skip if action is skip
      if (record.duplicateAction === 'skip' && record.isDuplicate) {
        skipped++;
        continue;
      }

      // Create/update salesperson 1
      let salesperson1Id = record.salesperson1Id;
      if (record.salesperson1 && !salesperson1Id) {
        const newSp = {
          id: uuidv4(),
          name: record.salesperson1.name,
          employeeId: record.salesperson1.employeeId,
          nickname: '',
          active: true,
          hireDate: new Date().toISOString().split('T')[0],
          monthlyGoal: 0
        };
        salespeople.push(newSp);
        salesperson1Id = newSp.id;
        salespeopleCreated++;
      } else if (record.salesperson1 && salesperson1Id) {
        // Update existing salesperson with employeeId if missing
        const spIndex = salespeople.findIndex(sp => sp.id === salesperson1Id);
        if (spIndex !== -1 && !salespeople[spIndex].employeeId) {
          salespeople[spIndex].employeeId = record.salesperson1.employeeId;
        }
      }

      // Create/update salesperson 2
      let salesperson2Id = record.salesperson2Id;
      if (record.salesperson2 && !salesperson2Id) {
        const newSp = {
          id: uuidv4(),
          name: record.salesperson2.name,
          employeeId: record.salesperson2.employeeId,
          nickname: '',
          active: true,
          hireDate: new Date().toISOString().split('T')[0],
          monthlyGoal: 0
        };
        salespeople.push(newSp);
        salesperson2Id = newSp.id;
        salespeopleCreated++;
      }

      const isSplit = !!salesperson2Id;

      const saleData = {
        dealNumber: record.dealNumber,
        stockNumber: record.stockNumber,
        frontEnd: record.frontEnd,
        backEnd: record.backEnd,
        packAmount,
        grossProfit: record.frontEnd + record.backEnd,
        salespersonId: salesperson1Id,
        secondSalespersonId: salesperson2Id,
        isSplit,
        saleDate: record.saleDate,
        customerName: record.customerName,
        vehicleYear: record.vehicleYear,
        vehicleMake: record.vehicleMake,
        vehicleModel: record.vehicleModel,
        vehiclePrice: record.vehiclePrice,
        dealType: record.dealType,
        deskManager: record.deskManager,
        certified: record.certified,
        cpo: record.certified, // Map certified to cpo
        serviceComplete: true,  // Auto-mark as complete for PDF imports
        sslp: false,
        delivered: true,        // Auto-mark as delivered for PDF imports
        notes: record.notes,
        importedAt: new Date().toISOString()
      };

      if (record.duplicateAction === 'update' && record.existingSaleId) {
        // Update existing sale
        const saleIndex = sales.findIndex(s => s.id === record.existingSaleId);
        if (saleIndex !== -1) {
          sales[saleIndex] = {
            ...sales[saleIndex],
            ...saleData,
            updatedAt: new Date().toISOString()
          };
          updated++;
        }
      } else {
        // Create new sale
        const newSale = {
          id: uuidv4(),
          ...saleData,
          createdBy: req.user.id,
          createdAt: new Date().toISOString()
        };
        sales.push(newSale);
        created++;
      }
    }

    // Save changes
    writeJSON(SALES_FILE, sales);
    writeJSON(SALESPEOPLE_FILE, salespeople);

    res.json({
      success: true,
      created,
      updated,
      skipped,
      salespeopleCreated,
      totalProcessed: created + updated + skipped
    });

  } catch (error) {
    console.error('PDF import confirm error:', error);
    res.status(500).json({ error: 'Failed to import records: ' + error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
