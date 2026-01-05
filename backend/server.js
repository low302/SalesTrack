const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
