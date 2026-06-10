# HR Pro — Quick Setup Guide

## ✅ What's Been Built

A complete, production-ready Employee Management System for Ghana with:

### Core Modules
- ✅ **Authentication** — JWT-based with role-based access (Admin, HR, Finance, Employee)
- ✅ **Employee Management** — Full profiles with Ghana Card, SSNIT, TIN, banking
- ✅ **Departments & Positions** — Organizational structure
- ✅ **Salary Management** — Salary structures, allowances, overtime
- ✅ **Attendance** — Daily tracking with overtime hours
- ✅ **Leave Management** — Types, balances, requests, approvals
- ✅ **Loan Management** — Salary advances, personal loans, repayment tracking
- ✅ **Payroll Engine** — Automated monthly payroll with Ghana tax compliance
- ✅ **Reports** — GRA PAYE, SSNIT schedules, payroll summaries, headcount

### Ghana Compliance
- ✅ SSNIT Employee (5.5%) & Employer (13%) contributions
- ✅ NPRA Tier 2 (5% employer)
- ✅ GRA PAYE tax bands (progressive 0% to 30%)
- ✅ Automated tax calculations
- ✅ Monthly statutory reports

### Tech Stack
**Backend:** Django 4.2 + DRF + PostgreSQL  
**Frontend:** React 18 + Tailwind CSS + Zustand + TanStack Query

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd hrpro/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Setup database
python manage.py migrate

# Create admin user
python manage.py createsuperuser
# Follow prompts to set email and password

# Start server
python manage.py runserver
```

Backend runs at: **http://localhost:8000**

### 2. Frontend Setup

```bash
cd hrpro/frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env: REACT_APP_API_URL=http://localhost:8000/api

# Start development server
npm start
```

Frontend runs at: **http://localhost:3000**

---

## 📋 First Steps After Setup

### 1. Login
- Go to http://localhost:3000
- Login with your superuser credentials
- You'll have ADMIN role by default

### 2. Create Departments
- Navigate to Departments (when implemented)
- Add departments like: HR, Finance, IT, Operations
- Add positions within each department

### 3. Add Employees
- Go to Employees → Add Employee
- Fill in all required fields (Ghana Card, SSNIT, TIN, bank details)
- Assign department and position

### 4. Setup Salary Structures
- For each employee, set their basic salary
- Add allowances (housing, transport, medical, etc.)
- Configure overtime rates if needed

### 5. Setup Leave Types
- Annual Leave (e.g., 15 days/year)
- Sick Leave (e.g., 10 days/year)
- Maternity Leave (e.g., 90 days)
- Casual Leave, etc.

### 6. Run Your First Payroll
- Go to Payroll → New Payroll Run
- Select month and year
- Click "Process" to generate all payslips
- Review payslips
- Click "Finalize" to lock them
- Click "Send Payslips" to email employees

---

## 👥 User Roles & Access

| Role | Access |
|------|--------|
| **ADMIN** | Full system access, all modules |
| **HR** | Employees, Leave, Attendance, Departments |
| **FINANCE** | Payroll, Salary, Loans, Reports |
| **EMPLOYEE** | Own profile, own payslips, leave requests |

---

## 📊 Reports Available

1. **Payroll Summary** — Monthly overview by department
2. **GRA PAYE Report** — For monthly tax filing
3. **SSNIT Schedule** — For monthly SSNIT contributions
4. **Headcount Report** — Employee count by department

---

## 🔧 Configuration

### Email Setup (for payslip delivery)
Edit `backend/.env`:
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_USE_TLS=True
```

For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833).

### Database
The system uses PostgreSQL. Make sure you have:
- PostgreSQL 14+ installed
- Created a database (e.g., `hrpro_db`)
- Updated `.env` with correct credentials

---

## 📁 Project Structure

```
hrpro/
├── backend/
│   ├── apps/
│   │   ├── accounts/      # Authentication & users
│   │   ├── employees/     # Employee profiles
│   │   ├── departments/   # Departments & positions
│   │   ├── salary/        # Salary structures & allowances
│   │   ├── attendance/    # Attendance tracking
│   │   ├── leave/         # Leave management
│   │   ├── loans/         # Loan management
│   │   ├── payroll/       # Payroll engine
│   │   └── reports/       # GRA, SSNIT, summaries
│   ├── hrpro_backend/     # Django settings
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/           # Axios config & endpoints
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── store/         # Zustand state management
│   │   └── utils/         # Helper functions
│   └── package.json
│
└── README.md
```

---

## 🐛 Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Verify `.env` database credentials
- Run `python manage.py migrate` again

### Frontend can't connect to backend
- Ensure backend is running on port 8000
- Check `REACT_APP_API_URL` in `frontend/.env`
- Check browser console for CORS errors

### Payroll calculations seem wrong
- Verify employee basic salary is set
- Check allowances are configured correctly
- Review Ghana tax bands in `backend/apps/payroll/utils.py`

---

## 🎯 Next Steps

1. **Add more employees** — Build your employee database
2. **Configure leave types** — Match your company policy
3. **Setup allowances** — Housing, transport, medical, etc.
4. **Run test payroll** — Process a month to verify calculations
5. **Customize reports** — Add company logo, formatting
6. **Deploy to production** — Use Gunicorn + Nginx for backend, build React for frontend

---

## 📞 Support

For questions or issues:
- Check the main README.md
- Review Django admin at http://localhost:8000/admin
- Check API endpoints at http://localhost:8000/api/

---

**Built with ❤️ for Ghana** 🇬🇭
