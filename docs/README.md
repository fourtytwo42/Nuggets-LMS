# AI Microlearning LMS - Documentation

Welcome to the AI Microlearning LMS documentation. This directory contains comprehensive documentation for the project.

## Documentation Index

- [Setup Guide](SETUP.md) - Complete setup instructions
- [Architecture](ARCHITECTURE.md) - System architecture overview
- [API Documentation](API.md) - API endpoints and specifications
- [Usage Guide](USAGE.md) - How to use the application
- [Development Guide](DEVELOPMENT.md) - Development workflow and guidelines
- [Deployment Guide](DEPLOYMENT.md) - Deployment instructions

## Quick Start

1. See [Setup Guide](SETUP.md) for installation and configuration
2. See [Development Guide](DEVELOPMENT.md) for development workflow
3. See [Usage Guide](USAGE.md) for how to use the application

## Project Overview

AI Microlearning LMS is a zero-human-authoring adaptive microlearning platform. Background agents ingest raw content (PDFs, DOCX, TXT, URLs) and transform it into atomic learning nuggets. Learners interact with Gemini 3 through multimodal conversation (text chat or 2-way voice) for adaptive learning experiences.

## Technology Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS 4.0
- **Backend:** Node.js 20+, Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL 15+ with pgvector extension
- **Queue:** BullMQ with Redis
- **AI:** Google Gemini 3 Pro/Flash, OpenAI TTS, DALL-E
