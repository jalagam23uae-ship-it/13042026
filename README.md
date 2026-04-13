# LMS — Offline Learning Management System

A full-stack offline LMS with Admin, Instructor, and Student portals.

## Tech Stack
| Layer    | Technology                       |
|----------|----------------------------------|
| Frontend | React 18 + React Router v6       |
| Backend  | Python 3.11 + FastAPI            |
| Database | PostgreSQL 15                    |
| Infra    | Docker + Docker Compose + Nginx  |

## Quick Start

### 1. Extract and start
```bash
unzip lms.zip && cd lms
cp .env.example .env
docker compose up --build
```

First boot auto-runs migrations and seeds demo data.

### 2. Access the app
| Service   | URL                        |
|-----------|----------------------------|
| Frontend  | http://localhost:3000       |
| API Docs  | http://localhost:8000/docs  |

## Seeding demo accounts

Seed passwords are now environment-driven. Before running the seed script, set
`SEED_ADMIN_PASSWORD`, `SEED_INSTRUCTOR_PASSWORD`, and `SEED_STUDENT_PASSWORD`
(each at least 12 characters) in your environment or `.env`. Optionally set
`SEED_ADMIN_EMAIL` (defaults to `admin@lms.local`). No credentials are
hardcoded in source.

```bash
SEED_ADMIN_PASSWORD=... SEED_INSTRUCTOR_PASSWORD=... SEED_STUDENT_PASSWORD=... \
  docker compose exec backend python seed.py
```

## Features

### Admin Portal
- Dashboard with student/session/pass-rate metrics
- Session Management (full CRUD with search & filters)
- User Management (add/edit/deactivate, 3 roles)
- Attendance viewing per user
- Reports with bar charts + CSV export (with full headers)
- All Test Results and Feedback overview
- Password reset for any user
- Send notifications to users

### Instructor Portal
- Session management for assigned sessions
- View test results and feedback
- Track student attendance

### Student Portal
- Personal Dashboard (hours, attendance rate, scores)
- Course Enrollment (browse & enroll in courses)
- Check In / Check Out to live sessions
- Monthly Attendance Heatmap + session log
- Progress Timeline (attended/missed sessions)
- Interactive Quiz Runner with timer & instant result
- Test Result History with grades (A+/A/B/C/F)
- Certificate generation for completed courses
- In-app Notifications
- Feedback submission with star ratings
- Dark mode toggle

### Security Features
- Rate limiting on login (5 attempts per 5 minutes)
- Input validation (password strength, rating bounds)
- JWT token refresh endpoint
- Password change for authenticated users
- Role-based access control (admin/instructor/student)

### UX Features
- Dark mode with full theme support
- Mobile responsive sidebar with hamburger menu
- Question randomization on each test attempt
- Quiz timer with auto-submit
- Real-time notification bell with unread count

## API Endpoints
See http://localhost:8000/docs after startup for full interactive API docs.

### New in v2
- `POST /auth/register` — Self-registration
- `POST /auth/refresh` — Token refresh
- `POST /auth/change-password` — Change own password
- `POST /auth/reset-password` — Admin reset user password
- `GET/POST /enrollments/` — Course enrollment
- `GET /notifications/my` — In-app notifications
- `GET /certificates/eligible` — Certificate eligibility
- `GET /certificates/generate/{id}` — Generate certificate
- `GET /sessions/?status=&search=` — Filtered sessions

## Development (without Docker)
```bash
# Backend
cd backend && pip install -r requirements.txt
alembic upgrade head && python seed.py
uvicorn app.main:app --reload

# Frontend
cd frontend && npm install
REACT_APP_API_URL=http://localhost:8000 npm start
```
