# MNK Chat - Realtime Communication Platform

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
[![Live Demo](https://img.shields.io/badge/demo-online-orange.svg)](https://chat.mnaveedk.com/)

A modern, full-featured real-time chat application built to demonstrate the power of **Django Channels** and **React** working in perfect harmony. Experience instant messaging, crystal-clear voice huddles, and smart offline-first notifications.

> **🔴 Live Demo:** [https://chat.mnaveedk.com/](https://chat.mnaveedk.com/)
> *(Running on free-tier resources, please allow a minute for cold starts)*

## 🚀 Features

- **Real-time Messaging**: Instant delivery using WebSockets and Redis.
- **Voice Huddles**: Low-latency voice chat powered by WebRTC (with STUN/TURN support).
- **Smart Notifications**: Intelligent coalescing engine that handles offline notifications and syncs instantly upon reconnection.
- **Presence System**: Real-time online/offline status tracking.
- **Modern UI/UX**: Built with React, Tailwind CSS, and Framer Motion for smooth interactions.
- **Secure Authentication**: JWT-based auth with secure HTTP-only cookies.
- **Scalable Architecture**: Dockerized services managed by Nx monorepo tooling.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Redux Toolkit, RTK Query, Vite.
- **Backend**: Django, Django REST Framework, Django Channels (ASGI).
- **Database**: PostgreSQL.
- **Real-time Engine**: Redis (Channel Layers).
- **Infrastructure**: Docker, Nginx, Nx (Monorepo Management).
- **Package Management**: npm (Frontend), uv (Backend).

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18+) & npm
- [Python](https://www.python.org/) (v3.10+)
- [uv](https://github.com/astral-sh/uv) (Fast Python package installer)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## ⚡ Quick Start

Follow these steps to get the application running locally.

### 1. Clone the Repository

```bash
git clone https://github.com/naveedkhan1998/realtime-chat-app.git
cd realtime-chat-app
```

### 2. Configure Environment Variables

**Backend Secrets:**
Copy the example environment file in the `.envs` directory.

```bash
# Windows (PowerShell)
Copy-Item .envs/.env.example .envs/.env

# Linux/Mac
cp .envs/.env.example .envs/.env
```

*Open `.envs/.env` and update any secrets if necessary (defaults work for local dev).*

**Frontend Secrets:**
Navigate to the frontend directory and configure the local environment.

```bash
cd frontend
# Windows (PowerShell)
Copy-Item .env.example .env.local

# Linux/Mac
cp .env.example .env.local
cd ..
```

*Open `frontend/.env.local` and add your configuration (e.g., Google OAuth Client ID).*

### 3. Install Dependencies

Install project dependencies from the root directory. This handles both frontend and backend setup via Nx.

```bash
npm install
```

### 4. Start the Development Environment

Launch the entire stack. This command uses Nx to spin up the Docker Compose stack (Django API, Redis, Postgres) and the local Vite development server.

```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend Admin**: [http://localhost:8000/admin](http://localhost:8000/admin)
- **API Root**: [http://localhost:8000/api/v1/](http://localhost:8000/api/v1/)

## 🐳 Docker Commands

The project includes helper scripts in `package.json` for managing the Docker environment:

- `npm run docker:up` - Start backend services (API, DB, Redis).
- `npm run docker:down` - Stop services.
- `npm run docker:clean` - Stop services and remove volumes (resets DB).
- `npm run migrate` - Apply Django database migrations inside the container.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

### Naveed Khan

- GitHub: [@naveedkhan1998](https://github.com/naveedkhan1998)

