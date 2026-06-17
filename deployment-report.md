# Deployment Report: Automated Weekly Website Report Service

## Product Name: Weekly Website Reports Pro

## Overview

This report details the deployment strategy for the 'Weekly Website Reports Pro' SaaS, including infrastructure, environment configuration, and steps for deploying the frontend and backend components. The target hosting is a $5/month VPS (e.g., Hetzner), and for services like Vercel/Railway mentioned in the prompt, these can be seen as ideal, managed alternatives or used for specific components. For a $5/month VPS, a more integrated deployment is assumed.

## I. Infrastructure & Services

### A. Core Hosting (VPS - e.g., Hetzner $5/month equivalent)
*   **Operating System:** Ubuntu Server (LTS recommended)
*   **Components to host:**
    *   Nginx (as a reverse proxy and static file server for frontend)
    *   Gunicorn (to serve the FastAPI backend application)
    *   PostgreSQL (database server)
    *   Redis (for Celery broker and cache)
    *   Celery Worker & Celery Beat (for scheduled tasks)

### B. External Services
*   **Stripe:** For payment processing and subscription management. Webhooks will be configured to point to the backend API.
*   **Resend (or similar SMTP service):** For sending weekly email reports.
*   **Google PageSpeed Insights API:** Requires an API key.

## II. Environment Variables

Both frontend and backend applications rely on environment variables. These must be securely configured on the deployment targets.

### A. Frontend (.env.example: frontend/.env.example)
*   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe public key for client-side payment initiation.
*   `NEXT_PUBLIC_BACKEND_URL`: The public URL of your deployed backend API (e.g., `https://api.weeklyreports.pro`).

### B. Backend (.env.example: backend/.env.example)
*   `DATABASE_URL`: Connection string for PostgreSQL (e.g., `postgresql://user:password@localhost:5432/weekly_reports_db`).
*   `STRIPE_SECRET_KEY`: Your Stripe secret key for server-side API calls.
*   `STRIPE_WEBHOOK_SECRET`: Secret for validating Stripe webhooks.
*   `RESEND_API_KEY`: API key for the Resend email service.
*   `GOOGLE_PAGESPEED_API_KEY`: API key for Google PageSpeed Insights.
*   (Optional, but recommended for production): `SECRET_KEY` for FastAPI/JWT, `DEBUG=False`.

## III. Deployment Steps

### A. VPS Setup (Initial Setup)

1.  **Provision VPS:** Obtain a $5/month VPS (e.g., from Hetzner, DigitalOcean, Vultr).
2.  **OS Configuration:** Update system, set up firewall (UFW) to allow SSH, HTTP(S).
3.  **Install Docker & Docker Compose:** Simplifies management of PostgreSQL, Redis, Gunicorn/FastAPI, Celery.
4.  **Install Nginx:** For reverse proxy.
5.  **DNS Configuration:** Point your domain (e.g., `weeklyreports.pro` for frontend, `api.weeklyreports.pro` for backend) to the VPS IP address.
6.  **SSL Certificates:** Obtain SSL certificates for your domain using Certbot with Nginx (Let's Encrypt).

### B. Database Setup (PostgreSQL)

1.  **Docker Compose:** Set up PostgreSQL via Docker Compose.
2.  **Initial Migration/Database Creation:**
    *   Connect to the PostgreSQL instance.
    *   Ensure the database (`weekly_reports_db`) and user are created as specified in `DATABASE_URL`.
    *   The `backend/main.py` script's `Base.metadata.create_all(bind=Engine)` will create tables on application start if they don't exist. For production, consider Alembic for proper migrations.
    *   Command (conceptual, via Docker/SSH into container): `python -c "from main import Base, Engine; Base.metadata.create_all(bind=Engine)"`

### C. Backend Deployment (Python/FastAPI)

1.  **Clone Repository:** Clone the backend repository to the VPS.
2.  **Environment Variables:** Create a `.env` file in the `backend/` directory with production values.
3.  **Build Docker Image:** Create a `Dockerfile` for the FastAPI application, installing dependencies from `requirements.txt` and running `gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000`.
4.  **Docker Compose:** Integrate the backend service into `docker-compose.yml` along with PostgreSQL, Redis, Celery.
5.  **Nginx Configuration:** Configure Nginx to proxy requests from `api.weeklyreports.pro` to the Gunicorn service (e.g., `http://localhost:8000`).
6.  **Celery Worker & Beat:**
    *   Add Celery worker and Celery beat services to `docker-compose.yml`.
    *   Celery Beat will be configured to run the `generate_weekly_report` task every Monday morning.

### D. Frontend Deployment (Next.js)

1.  **Build Frontend:** On a build server or locally, run `npm install` then `npm run build` within `frontend/`. This generates static assets and optimized JS bundles.
2.  **Transfer Assets:** Copy the `frontend/.next` and `frontend/public` directories to the VPS (e.g., `/var/www/weeklyreports.pro/html`).
3.  **Nginx Configuration:** Configure Nginx to serve these static assets for `weeklyreports.pro`.
    *   Example:
        ```nginx
        server {
            listen 80;
            server_name weeklyreports.pro www.weeklyreports.pro;
            return 301 https://$host$request_uri;
        }

        server {
            listen 443 ssl http2;
            server_name weeklyreports.pro www.weeklyreports.pro;

            ssl_certificate /etc/letsencrypt/live/weeklyreports.pro/fullchain.pem;
            ssl_certificate_key /etc/letsencrypt/live/weeklyreports.pro/privkey.pem;

            root /var/www/weeklyreports.pro/html; # Path to your frontend build output

            index index.html;

            location /_next/static {
                alias /var/www/weeklyreports.pro/html/.next/static;
                expires 1y;
                access_log off;
            }

            location / {
                try_files $uri $uri/ /index.html;
            }
        }
        ```

### E. Webhook Configuration

*   **Stripe:** Configure a webhook endpoint in your Stripe Dashboard to `https://api.weeklyreports.pro/stripe-webhook`. Ensure it listens for `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted` events.

## IV. Post-Deployment Checks

*   Verify both frontend and backend are accessible via their respective domains.
*   Test user registration and Stripe checkout flow.
*   Monitor backend logs for any errors.
*   Verify Celery tasks are scheduled and running correctly.

## V. Open Issues / Further Improvements

*   **Robust Error Handling:** Enhance error logging and reporting in both frontend and backend.
*   **Authentication:** Implement proper user authentication (e.g., JWT) for protected backend endpoints.
*   **Database Migrations:** Implement Alembic for managing database schema changes for production readiness.
*   **Testing:** Comprehensive unit and integration tests for all components.
*   **Dashboard:** Develop a simple user dashboard where users can view past reports, manage their website URL, and update billing info.
*   **Admin Panel:** Basic admin panel for managing users and subscriptions.
*   **Scalability:** For future growth, consider managed services (AWS RDS, Elastic Beanstalk, Azure App Service, Google Cloud Run) or Kubernetes.
*   **More detailed broken link reporting:** The current implementation just counts. A dashboard to show the actual broken links and their source pages would be valuable.
*   **Advanced Uptime Monitoring:** Integrate with a more robust uptime service if simple pings are insufficient.
*   **Payment Provider Choice:** Confirmed Stripe for now.
