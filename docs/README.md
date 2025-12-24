# AI Microlearning LMS - Documentation

Welcome to the AI Microlearning LMS documentation. This directory contains comprehensive documentation for the project.

## Documentation Index

- [Setup Guide](SETUP.md) - Complete setup instructions including database, environment, and deployment
- [Architecture](ARCHITECTURE.md) - System architecture overview
- [API Documentation](API.md) - API endpoints and specifications
- [Usage Guide](USAGE.md) - How to use the application, including demo accounts
- [Development Guide](DEVELOPMENT.md) - Development workflow and guidelines
- [Deployment Guide](DEPLOYMENT.md) - Deployment instructions

## Quick Start

1. **Setup:** See [Setup Guide](SETUP.md) for installation and configuration
   - Install dependencies
   - Configure environment variables
   - Set up database
   - Seed demo accounts

2. **Access:**
   - Landing page: `http://localhost:3000`
   - Login page: `http://localhost:3000/login`
   - Demo accounts: `learner@demo.com` / `demo123` or `admin@demo.com` / `demo123`

3. **Development:** See [Development Guide](DEVELOPMENT.md) for development workflow

4. **Usage:** See [Usage Guide](USAGE.md) for how to use the application

## Project Overview

AI Microlearning LMS is a zero-human-authoring adaptive microlearning platform. Background agents ingest raw content (PDFs, DOCX, TXT, URLs) and transform it into atomic learning nuggets. Learners interact with Gemini 3 through multimodal conversation (text chat or 2-way voice) for adaptive learning experiences.

### Key Features

- **Zero-Human Authoring:** Automatically convert any content into learning nuggets
- **AI-Powered:** Uses Google Gemini 3 Pro/Flash for intelligent content processing and tutoring
- **Adaptive Learning:** Personalized learning paths that adapt to each learner
- **Multimodal Interaction:** Text chat and 2-way voice conversation
- **Real-Time Progress:** Track mastery levels and identify knowledge gaps
- **Content Ingestion:** Automatic processing of files and URLs

## Technology Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS 4.0
- **Backend:** Node.js 20+, Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL 15+ (or 17+) with pgvector extension
- **Queue:** BullMQ with Redis
- **AI:** Google Gemini 3 Pro/Flash, OpenAI TTS, DALL-E
- **Process Management:** PM2
- **Testing:** Jest, Playwright (90%+ coverage requirement)

## Landing Page and Demo

### Landing Page

The root URL (`/`) displays a professional SaaS landing page with:

- Hero section describing the platform
- Features overview (AI-Powered Authoring, Adaptive Learning, Real-Time Progress)
- Call-to-action buttons:
  - **Try Demo** → Links to `/login`
  - **Contact Sales** → Links to `https://studio42.dev/contact?source=nuggets-lms`

### Demo Accounts

After running `npm run seed:demo`, you can access:

- **Learner Account:**
  - Email: `learner@demo.com`
  - Password: `demo123`
  - Access: Learning canvas, interactive sessions, progress tracking

- **Admin Account:**
  - Email: `admin@demo.com`
  - Password: `demo123`
  - Access: Admin console, content ingestion, nugget management, analytics

The login page includes demo account buttons that auto-fill and submit credentials for easy testing.

## Getting Help

- **Setup Issues:** See [Setup Guide](SETUP.md) troubleshooting section
- **Usage Questions:** See [Usage Guide](USAGE.md)
- **Development:** See [Development Guide](DEVELOPMENT.md)
- **API Reference:** See [API Documentation](API.md)
- **Architecture:** See [Architecture](ARCHITECTURE.md)

## Project Status

This project is in active development. Current status:

- ✅ Project foundation and setup
- ✅ Authentication system
- ✅ Content ingestion infrastructure
- ✅ AI integration (Gemini)
- ✅ Background job processing
- ✅ Landing page and login page
- ✅ Demo accounts
- 🚧 Learning delivery (in progress)
- 🚧 Admin console (in progress)
- 🚧 Analytics and monitoring (in progress)

## Contributing

See [Development Guide](DEVELOPMENT.md) for:

- Development workflow
- Code quality standards
- Testing requirements (90%+ coverage)
- Git workflow
- Contribution guidelines
