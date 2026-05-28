# NeuroHire

NeuroHire is a production-ready AI recruitment SaaS platform for recruiters and hiring teams. It combines resume upload, AI screening, job-wise rankings, candidate pipeline management, interview question generation, analytics, email notifications, and operational settings in one full-stack workspace.

## Tech Stack

- Frontend: React 18, Vite, Tailwind CSS
- Backend API: Node.js, Express, PostgreSQL, MongoDB
- AI Service: FastAPI, LangGraph, Gemini, ChromaDB
- Auth: JWT-based middleware with company tenant isolation
- Deployment: Docker Compose with production override

## Major Features

- Candidate AI score page with circular progress scoring, strengths, missing skills, risk level, recommendation, and screening timestamp.
- Job-wise candidate rankings with pagination, score bars, recommendation badges, status display, and links to score pages.
- Candidate status pipeline with New, Shortlisted, Interview, Rejected, and Hired stages.
- Kanban pipeline view with optimistic status updates.
- Resume parser preview before save/screening.
- AI interview question generator with technical, HR, situational, and red-flag sections.
- Admin analytics dashboard with overview metrics, score distribution, job trends, funnel, and recent activity.
- Branded HTML email notifications for shortlisted, rejected, interview, and scheduled interview events.
- Settings page with company profile, API config, team placeholder, and system status.
- Health check endpoint for PostgreSQL, MongoDB, ChromaDB, and AI service.
- Environment validation warnings on startup.
- Global React error boundary and toast provider.

## Repository Layout

```text
.
├── ai-service/              # FastAPI AI service and Gemini workflows
├── backend/                 # Express API, PostgreSQL schema, routes, services
├── frontend/                # React + Vite recruiter application
├── docker-compose.yml       # Local multi-service stack
├── docker-compose.prod.yml  # Production override
└── .env.example             # Placeholder environment template
```

## Prerequisites

- Docker Desktop 4.x or newer
- Node.js 18 or newer
- Python 3.10 or newer
- PostgreSQL, MongoDB, and ChromaDB if running without Docker
- Gemini API key
- SMTP credentials for email notifications

## Environment Setup

Copy the example environment file and fill in real values:

```bash
cp .env.example .env
```

Important variables:

- `JWT_SECRET`
- `DATABASE_URL` or `PG_HOST`, `PG_USER`, `PG_PASSWORD`, `PG_DB`
- `MONGODB_URI` or `MONGO_URI`
- `AI_SERVICE_URL`
- `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- `CHROMA_HOST`, `CHROMA_PORT`, or `CHROMA_URL`
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`
- `FRONTEND_URL`

Never commit `.env`; it is intentionally ignored.

## Run With Docker

Start the full local stack:

```bash
docker compose up --build
```

Open the app:

```text
http://localhost:3000
```

Backend health check:

```text
http://localhost:5000/health
```

## Run For Local Development

Backend:

```bash
cd backend
npm install
node src/index.js
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

AI service:

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Production Compose

Use the production override with the base compose file:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

The production override adds:

- `restart: always`
- 512 MB memory limits
- JSON file logging with rotation
- `NODE_ENV=production` for the backend

## API Overview

Core backend endpoints include:

- `GET /health`
- `GET /api/screening-results/:candidateId/:jobId`
- `GET /api/jobs/:jobId/ranking`
- `GET /api/jobs/:jobId/pipeline`
- `PATCH /api/applications/:applicationId/status`
- `POST /api/resume/parse`
- `POST /api/interview-questions/generate`
- `GET /api/interview-questions/:candidateId/:jobId`
- `POST /api/interviews/schedule`
- `GET /api/interviews/:candidateId`
- `GET /api/analytics/overview`
- `GET /api/analytics/score-distribution`
- `GET /api/analytics/jobs-over-time`
- `GET /api/analytics/recent-activity`
- `GET /api/settings/company`
- `PUT /api/settings/company`

AI service endpoints include:

- `GET /health`
- `POST /analyze`
- `POST /parse-resume`
- `POST /generate-interview-questions`
- `GET /similarity/:candidate_id`
- `DELETE /embeddings/:candidate_id`

## Database Notes

PostgreSQL stores companies, users, jobs, candidates, applications, settings, audit logs, API keys, feedback, subscriptions, integrations, consent logs, and GDPR deletion requests.

MongoDB stores AI-oriented documents such as saved screening/interview question outputs and scheduled interview records where applicable.

ChromaDB stores resume and candidate embeddings for semantic similarity and retrieval.

## Email Notifications

NeuroHire uses Nodemailer with environment-driven SMTP configuration.

Supported notification flows:

- Candidate shortlisted
- Candidate rejected
- Candidate moved to interview
- Interview scheduled

If SMTP credentials are missing, the backend logs a warning and avoids crashing user-facing flows.

## Health And Settings

The root `/health` endpoint returns:

```json
{
  "status": "healthy",
  "services": {
    "postgres": "up",
    "mongo": "up",
    "chroma": "up",
    "aiService": "up"
  },
  "uptime": 123.45,
  "timestamp": "2026-05-29T00:00:00.000Z"
}
```

The admin settings page includes:

- Company profile management
- API configuration visibility
- Team placeholder
- Live system status polling

## Testing

Existing project tests are available through the service-specific test commands:

```bash
cd backend
npm test
```

```bash
cd ai-service
python -m pytest
```

## Security Notes

- Do not commit `.env` or real secrets.
- Use strong `JWT_SECRET` values in production.
- Keep SMTP and Gemini credentials in environment variables only.
- Review admin-only routes before exposing new dashboard or settings capabilities.

## License

Private project repository. Add a license file if this project will be distributed publicly.
