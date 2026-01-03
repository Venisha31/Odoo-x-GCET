# Dayflow - Human Resource Management System

Every workday, perfectly aligned. 🚀

A modern HRMS built with Next.js, Express.js, and PostgreSQL for the Odoo Hackathon.

## Features

- **Authentication** - Secure sign up/sign in with JWT
- **Role-based Access** - Admin (HR) vs Employee permissions
- **Employee Management** - Full profile management with personal and job details
- **Attendance Tracking** - Daily check-in/check-out with status tracking
- **Leave Management** - Apply, approve, and track leave requests
- **Payroll Visibility** - View salary breakdown and history

## Tech Stack

- **Frontend**: Next.js 15, React, Vanilla CSS (no Tailwind)
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Setup Database

1. Create a PostgreSQL database named `dayflow`
2. Update the `DATABASE_URL` in `backend/.env`:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/dayflow?schema=public"
```

### Install & Run Backend

```bash
cd backend
npm install
npx prisma db push
npm run dev
```

Backend will run on http://localhost:5000

### Install & Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on http://localhost:3000

## Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/dayflow?schema=public"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
PORT=5000
FRONTEND_URL="http://localhost:3000"
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Employees
- `GET /api/employees` - Get all employees (Admin)
- `GET /api/employees/:id` - Get employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee (Admin)

### Attendance
- `POST /api/attendance/check-in` - Check in
- `POST /api/attendance/check-out` - Check out
- `GET /api/attendance/today` - Get today's attendance
- `GET /api/attendance/my` - Get my attendance history
- `GET /api/attendance/all` - Get all attendance (Admin)

### Leave
- `POST /api/leave/apply` - Apply for leave
- `GET /api/leave/my` - Get my leave requests
- `GET /api/leave/all` - Get all leave requests (Admin)
- `PUT /api/leave/:id/approve` - Approve leave (Admin)
- `PUT /api/leave/:id/reject` - Reject leave (Admin)

### Payroll
- `GET /api/payroll/my` - Get my payroll
- `GET /api/payroll/all` - Get all payroll (Admin)
- `POST /api/payroll` - Create payroll (Admin)

## License

Built for Odoo Hackathon 
