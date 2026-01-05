# Auto Sales Tracker

A comprehensive used car sales tracking application for dealerships. Built with React, Express, and Docker.

## Features

- **Dashboard**: Real-time sales metrics, charts, and KPIs
- **Sales Management**: Track individual vehicle sales with full details
- **Reports**: Detailed analytics with multiple chart types
- **User Management**: Admin controls for user accounts and permissions
- **Salespeople Management**: Track and manage your sales team
- **Settings**: Configure Pack amount, working days, sales targets, and more

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, DaisyUI, Recharts
- **Backend**: Node.js, Express
- **Storage**: File-based JSON storage (persistent via Docker volumes)
- **Containerization**: Docker & Docker Compose

## Quick Start

### Prerequisites
- Docker and Docker Compose installed

### Running the Application

1. Clone or download this project

2. Start the containers:
```bash
docker-compose up --build
```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Default Login Credentials
- **Username**: admin
- **Password**: admin123

## Project Structure

```
car-sales-tracker/
├── docker-compose.yml
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── components/
│       │   ├── Layout.jsx
│       │   └── Sidebar.jsx
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── hooks/
│       │   └── useApi.js
│       └── pages/
│           ├── LoginPage.jsx
│           ├── DashboardPage.jsx
│           ├── SalesPage.jsx
│           ├── ReportsPage.jsx
│           ├── UsersPage.jsx
│           ├── SalespeoplePage.jsx
│           └── SettingsPage.jsx
└── backend/
    ├── Dockerfile
    ├── package.json
    └── server.js
```

## Configuration

### Settings (Admin Only)
- **Pack Amount**: Fixed cost deducted from each sale's gross profit
- **Commission Rate**: Percentage paid to salespeople
- **Working Days Per Month**: For target calculations
- **Daily Sales Target**: Goal for dashboard progress tracking

### Data Persistence
All data is stored in JSON files within a Docker volume:
- `users.json`: User accounts
- `sales.json`: Sales records
- `salespeople.json`: Salesperson profiles
- `settings.json`: Application settings

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Sales
- `GET /api/sales` - List sales (with filters)
- `POST /api/sales` - Create sale
- `PUT /api/sales/:id` - Update sale
- `DELETE /api/sales/:id` - Delete sale

### Users (Admin)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Salespeople
- `GET /api/salespeople` - List salespeople
- `POST /api/salespeople` - Create salesperson (Admin)
- `PUT /api/salespeople/:id` - Update salesperson (Admin)
- `DELETE /api/salespeople/:id` - Delete salesperson (Admin)

### Settings (Admin)
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

### Analytics
- `GET /api/analytics/dashboard` - Dashboard data

## Development

For local development without Docker:

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## License

MIT
