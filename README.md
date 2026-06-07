# 🧠 Promptov.ru — Open Source Prompt Marketplace

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-green)](https://flask.palletsprojects.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)](https://www.postgresql.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

> **Share, discover, and rate prompts for neural networks. Publish your prompts, get feedback, and climb the leaderboard.**

[Demo](https://promptov.ru) · [Report Bug](https://github.com/slyfrs/promptov-ru/issues) · [Request Feature](https://github.com/slyfrs/promptov-ru/issues)

---

## ✨ Features

### For Users
- 🔐 **Authentication** — JWT with httpOnly cookies, email verification
- 📝 **Create & Manage Prompts** — Drafts, publishing, moderation
- ❤️ **Likes & Favorites** — Save and collect favorite prompts
- 💬 **Comment System** — Moderation for quality control
- 👤 **User Profiles** — Customizable privacy settings
- 🏆 **Leaderboard** — Top authors by prompts and likes
- 🔔 **Notifications** — Real-time with SSE
- 🌍 **i18n** — Russian and English support

### For Admins
- 📊 **Moderation Panel** — Approve/reject prompts and comments
- 👥 **User Management** — Roles (admin/moderator/user), block/unblock
- 🏷️ **Tag Management** — Create/edit/delete categories and AI models
- 📈 **Analytics** — Platform statistics

### Technical Highlights
- ⚡ **SSR** — Server-side rendering for SEO on homepage
- 📱 **Responsive** — Mobile-first design with Tailwind CSS
- 🗄️ **Optimized** — Database indexes, N+1 query elimination
- 🔒 **Secure** — Rate limiting, input validation, XSS protection
- 🐳 **Dockerized** — Full containerization for easy deployment

---

## 🖼️ Screenshots

| Homepage | Prompt Page | Dashboard |
|----------|-------------|-----------|
| ![Homepage](/public/screenshots/screenshot_homepage.png) | ![Prompt](/public/screenshots/screenshot_prompt.png) | ![Dashboard](/public/screenshots/screenshot_dashboard.png) |

| Admin Panel | Leaderboard | User Profile |
|-------------|-------------|--------------|
| ![Admin](/public/screenshots/screenshot_admin.png) | ![Leaderboard](/public/screenshots/screenshot_leaderboard.png) | ![Profile](/public/screenshots/screenshot_profile.png) |

---
## 👥 Demo Accounts

You can test the platform with these demo credentials:

| Role | Email | Password |
|------|-------|----------|
| 👤 **User** | `alex@example.com` | `test123` |
| 👤 **User** | `marina@example.com` | `test123` |
| 👑 **Moderator** | `ivan@example.com` | `test123` |

> 💡 All demo passwords are `test123`. The Moderator account has access to the moderation panel at `/admin`.

### Test Data
The database includes:
- 15+ test users
- 100+ sample prompts across all categories
- Various neural network tags (ChatGPT, DeepSeek, Midjourney, etc.)
- Comments, likes, and favorites for realistic testing

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| Flask 3.x | REST API |
| SQLAlchemy | ORM |
| PostgreSQL 15 | Database |
| JWT | Authentication |
| Celery + Redis | Background tasks |
| Flask-Limiter | Rate limiting |

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 15 | React framework, SSR |
| TailwindCSS + shadcn/ui | Styling |
| Zustand + TanStack Query | State management |
| next-intl | Internationalization |

### Deployment
| Technology | Purpose |
|------------|---------|
| Docker + Compose | Container orchestration |
| Nginx + Let's Encrypt | Reverse proxy + SSL |
| Gunicorn | WSGI server |

---

## 🐳 Production Deployment with Docker

### Prerequisites
- Docker & Docker Compose
- Domain name (for HTTPS)
- Let's Encrypt (for SSL)
- 2GB RAM minimum (4GB recommended)

### Quick Deploy

```bash
# Clone repository
git clone https://github.com/slyfrs/promptov-ru.git
cd promptov-ru

# Copy environment variables
cp .env.example .env
# Edit .env with your values (see below)

# Start all services
docker-compose up -d --build

# Wait for containers to be ready (30 seconds)
sleep 30

# Initialize database tables
docker exec -it promptov-backend sh -c "python -c \"from app import app; from models.user import db; with app.app_context(): db.create_all()\""

# Generate test data (optional)
docker exec -it promptov-backend python generate_test_data.py
```


## Environment Variables (.env)

```env
DOMAIN=promptov.ru
DB_PASSWORD=db_pass
JWT_SECRET_KEY=your_super_secret_jwt_key
FRONTEND_URL=https://${DOMAIN}

# Email (Yandex recommended)
MAIL_SERVER=your.mail.com
MAIL_PORT=465
MAIL_USE_SSL=True
MAIL_USERNAME=your_email@mail.com
MAIL_PASSWORD=your_app_password
MAIL_DEFAULT_SENDER=your_email@mail.com
```
## SSL Setup with Let's Encrypt

```bash
# Stop nginx container temporarily
docker-compose stop nginx

# Obtain certificate
sudo certbot certonly --standalone -d your-domain.ru -d www.your-domain.ru

# Copy certificates to project
mkdir -p ssl
sudo cp /etc/letsencrypt/live/your-domain.ru/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/your-domain.ru/privkey.pem ./ssl/
sudo chown -R $USER:$USER ./ssl

# Start nginx with HTTPS
docker-compose up -d nginx
```

## Useful Commands

```bash
# Check container status
docker ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# Restart all services
docker-compose restart

# Stop all services
docker-compose down

# Rebuild after changes
docker-compose up -d --build

# Access database
docker exec -it promptov-postgres psql -U promptov_user -d promptov_prod

```
---

## 🚀 Local Development 

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis (optional, for caching)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
cp .env.example .env  # Configure your environment
python app.py
```
### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local  # Configure your environment
npm run dev
```
## Environment Variables
### Backend (.env):
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/promptov_dev
JWT_SECRET_KEY=your-super-secret-key
MAIL_SERVER=your.mail.com
MAIL_USERNAME=your-email@mail.com
MAIL_PASSWORD=your-app-password
FRONTEND_URL=http://localhost:3000
```
### Frontend (.env.local):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
## 📁 Project Structure
```text
promptov-ru/
├── backend/
│   ├── api/          # Flask blueprints/routes
│   ├── models/       # SQLAlchemy models
│   ├── schemas/      # Marshmallow validation
│   ├── scripts/      # DB init scripts
│   └── utils/        # Helpers (email, roles, rate_limit)
├── frontend/
│   ├── app/          # Next.js App Router pages
│   ├── components/   # React components
│   ├── lib/          # API clients, auth
│   ├── messages/     # i18n translations
│   └── types/        # TypeScript definitions
├── nginx/
│   └── default.conf  # Nginx configuration
├── ssl/              # SSL certificates (gitignored)
├── docker-compose.yml
└── .env
```
### 🧪 Testing
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm run test  # Cypress
```
## 🤝 Contributing
1. Fork the repository

2. Create your feature branch (git checkout -b feature/amazing-feature)

3. Commit your changes (git commit -m 'feat: add amazing feature')

4. Push to the branch (git push origin feature/amazing-feature)

5. Open a Pull Request

### Commit Convention
**We use Conventional Commits:**

- feat: new feature

- fix: bug fix

- docs: documentation

- perf: performance improvement

- refactor: code refactoring

- style: code style (formatting, missing semicolons, etc.)

- test: adding tests

- chore: maintenance

## 📄 License
**Distributed under the MIT License. See LICENSE for more information.**

## 🙏 Acknowledgements

- Next.js

- Flask

- Tailwind CSS

- shadcn/ui

- DeepSeek


## 📞 Contact
Project Link: https://github.com/slyfrs/promptov-ru

---
## ⭐ Star this repository if you find it useful!