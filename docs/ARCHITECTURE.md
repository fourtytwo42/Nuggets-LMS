# Architecture Documentation

System architecture overview for AI Microlearning LMS.

## System Overview

AI Microlearning LMS is built using a modern, scalable architecture with clear separation of concerns.

## Component Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  - Next.js App Router (React Server Components)              │
│  - Client Components (Learner Canvas, Admin Console)         │
│  - Tailwind CSS 4 + Heroicons                                │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    Application Layer                         │
│  - Next.js API Routes (REST endpoints)                       │
│  - WebSocket Server (Real-time communication)                │
│  - Authentication Middleware (JWT)                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    Business Logic Layer                      │
│  - Content Ingestion Service                                 │
│  - AI Authoring Engine                                       │
│  - Narrative Planning Service                                │
│  - Learning Delivery Service                                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    Data Access Layer                         │
│  - Prisma ORM (Database queries)                             │
│  - Vector Search (pgvector queries)                          │
│  - External API Clients (Google Gemini API)                  │
│  - Job Queue Client (BullMQ/Redis)                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    Data Storage Layer                        │
│  - PostgreSQL (Relational data, metadata)                    │
│  - pgvector (Vector embeddings)                              │
│  - Redis (Job queue, caching)                                │
│  - Filesystem (File storage)                                 │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend

- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS 4.0
- **Icons:** Heroicons v2
- **State Management:** Zustand
- **Forms:** React Hook Form + Zod

### Backend

- **Runtime:** Node.js 20+ LTS
- **Framework:** Next.js 15 API Routes
- **ORM:** Prisma
- **Database:** PostgreSQL 15+ with pgvector
- **Job Queue:** BullMQ + Redis

### AI Services

- **Primary AI:** Google Gemini 3 Pro
- **Cost-Effective AI:** Google Gemini 3 Flash
- **Embeddings:** Google Gemini Embeddings API
- **Voice:** Gemini Live API
- **Image Generation:** DALL-E (OpenAI)
- **TTS:** OpenAI TTS + ElevenLabs

## Project Structure

```
nuggets-lms/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth routes
│   │   ├── (learner)/         # Learner routes
│   │   ├── (admin)/           # Admin routes
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── ui/               # Reusable UI components
│   │   ├── learner/          # Learner-specific components
│   │   └── admin/            # Admin-specific components
│   ├── lib/                  # Utilities and helpers
│   ├── services/             # Business logic services
│   ├── stores/               # Zustand stores
│   ├── hooks/                # Custom React hooks
│   └── types/                # TypeScript types
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
├── storage/                  # File storage
├── tests/                    # Test files
└── docs/                     # Documentation
```

## Database Architecture

### Core Tables

- `organizations` - Multi-tenant support
- `users` - User accounts (admin, instructor, learner)
- `learners` - Learning profiles, mastery maps
- `nuggets` - Atomic learning units with embeddings
- `narrative_nodes` - Choose-your-own-adventure graph nodes
- `sessions` - Learning sessions
- `messages` - Conversation history
- `progress` - Concept mastery tracking

### Vector Storage

Embeddings stored using pgvector extension for semantic search.

## Service Architecture

### Content Ingestion Service

- File watching system
- URL monitoring
- Text extraction
- Semantic chunking
- Embedding generation
- Metadata extraction
- Image generation

### AI Authoring Engine

- Slide generation
- Audio script generation
- Audio file generation
- Learning package assembly

### Narrative Planning Service

- Narrative node generation
- Choice creation
- Path adaptation logic
- Narrative graph management

### Learning Delivery Service

- AI tutor implementation
- Tool execution system
- Session management
- Progress tracking

## Background Job Processing

Jobs processed using BullMQ with Redis:

- Content processing jobs
- Embedding generation
- Image generation
- Audio generation
- Slide generation

## Real-Time Communication

WebSocket-based real-time communication for:

- Learning sessions
- Progress updates
- Narrative navigation
- Message delivery

## Security

- JWT-based authentication
- Role-based access control (RBAC)
- Input validation with Zod
- SQL injection prevention (Prisma)
- XSS protection
- CSRF protection

## Performance Considerations

- Database indexing strategy
- Caching with Redis
- Background job processing
- Optimized vector queries
- Efficient embedding storage

## Scalability

- Horizontal scaling support
- Background job workers
- Database connection pooling
- Redis clustering support
- Stateless API design
