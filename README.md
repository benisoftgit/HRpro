# HR Pro — Employee Management System (Ghana)

A full-featured HR management system built with Django REST Framework and React, tailored for Ghanaian payroll regulations (PAYE, SSNIT, Tier 2/3).

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- pip & virtualenv

---

## Backend Setup

```bash
cd hrpro/backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Linux/macOS
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your database credentials and secret key

# Run database migrations
python manage.py migrate

# Create a superuser (Admin)
python manage.py createsuperuser

# Load initial data (optional)
python manage.py loaddata initial_data

# Start the development server
python manage.py runserver
```

The backend API will be available at: `http://localhost:8000`

---

## Frontend Setup

```bash
cd hrpro/frontend

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env — set REACT_APP_API_URL=http://localhost:8000/api

# Start the development server
npm start
```

The frontend will be available at: `http://localhost:3000`

---

## Default Login

After running `createsuperuser`, log in with the credentials you set.

To create role-based users, use the Django admin at `http://localhost:8000/admin/` or the API.

**Roles:**
| Role     | Access Level                                      |
|----------|---------------------------------------------------|
| ADMIN    | Full access to all modules                        |
| HR       | Employees, Leave, Attendance, Departments         |
| FINANCE  | Payroll, Salary, Loans, Reports                   |
| EMPLOYEE | Own profile, own payslips, own leave requests     |

---

## Module Overview

| Module       | Description                                                  |
|--------------|--------------------------------------------------------------|
| Accounts     | JWT authentication, user roles, profile management           |
| Employees    | Employee profiles, Ghana Card, SSNIT, TIN, bank details      |
| Departments  | Departments and positions/grades                             |
| Salary       | Salary structures, allowances, overtime rates                |
| Attendance   | Daily clock-in/out, status tracking                          |
| Leave        | Leave types, balances, requests, approvals                   |
| Loans        | Salary advances, personal loans, repayment schedules         |
| Payroll      | Monthly payroll runs, payslip generation, email dispatch     |
| Reports      | GRA PAYE reports, SSNIT schedules, payroll summaries         |

---

## Ghana Payroll Compliance

- **SSNIT Employee Contribution:** 5.5% of basic salary
- **SSNIT Employer Contribution:** 13% of basic salary
- **Tier 2 Employer Contribution:** 5% of basic salary
- **PAYE Tax Bands (Annual):**
  - First GHS 4,380 → 0%
  - Next GHS 1,320 → 5%
  - Next GHS 1,560 → 10%
  - Next GHS 38,000 → 17.5%
  - Next GHS 192,000 → 25%
  - Above GHS 240,000 → 30%

---

## API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/api/docs/`
- Admin Panel: `http://localhost:8000/admin/`

---

## Tech Stack

**Backend:** Django 4.2, Django REST Framework, SimpleJWT, PostgreSQL  
**Frontend:** React 18, React Router 6, Zustand, TanStack Query, Tailwind CSS, Recharts
