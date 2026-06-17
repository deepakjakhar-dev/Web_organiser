# Weekly Website Reports Pro - Backend

This directory contains the Python backend application, responsible for user management, subscription handling, scheduled reports, and API integrations.

**Tech Stack:** Python, FastAPI, SQLAlchemy (for ORM), PostgreSQL (database), Celery (for background tasks/scheduling), Redis (for Celery broker).

**Key Features:**
- User authentication and management
- Website URL storage per user
- Stripe webhook handling for subscription lifecycle
- Scheduled cron job (via Celery Beat) to:
    - Perform uptime checks
    - Fetch Google PageSpeed scores
    - Detect broken links
    - Generate HTML email reports
- Email sending via Resend API

**API Endpoints (examples):**
- `POST /register`: User signup with initial website URL.
- `POST /stripe-webhook`: Stripe event listener.
- `GET /`: Basic API health check.

**To run locally:**
1. Ensure Python 3.9+ and pip are installed.
2. Ensure PostgreSQL and Redis are running (e.g., via Docker).
3. `pip install -r requirements.txt`
4. Set environment variables (DATABASE_URL, STRIPE_SECRET_KEY, RESEND_API_KEY, GOOGLE_PAGESPEED_API_KEY, STRIPE_WEBHOOK_SECRET).
5. Run the FastAPI app: `uvicorn main:app --host 0.0.0.0 --port 8000`
6. Run Celery worker and beat for scheduled tasks (if implemented).

**Built by:** The Backend Agent (simulated)