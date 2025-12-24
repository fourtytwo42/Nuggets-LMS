# Development Guide

Development workflow and guidelines for AI Microlearning LMS.

## Development Setup

See [SETUP.md](SETUP.md) for complete setup instructions.

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/feature-name
```

### 2. Make Changes

- Write code following project patterns
- Write tests as you implement
- Follow coding conventions

### 3. Run Tests

```bash
# Unit/Integration tests
npm test

# Test coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

### 4. Code Quality Checks

```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Formatting
npm run format:check
```

### 5. Commit Changes

```bash
git add .
git commit -m "feat(scope): description"
```

### 6. Push and Create PR

```bash
git push origin feature/feature-name
```

## Code Patterns

### Service Pattern

Business logic goes in service files:

```typescript
// src/services/example-service/index.ts
export class ExampleService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async doSomething(input: InputType): Promise<OutputType> {
    // Implementation
  }
}
```

### API Route Pattern

API routes are thin controllers:

```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { ExampleService } from '@/services/example-service';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request);
    const service = new ExampleService(prisma);
    const result = await service.doSomething();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
```

### Component Pattern

Use Server Components by default, Client Components when needed:

```typescript
// Server Component (default)
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}

// Client Component (when needed)
'use client';
import { useState } from 'react';

export function InteractiveComponent() {
  const [state, setState] = useState();
  return <button onClick={() => setState(...)}>Click</button>;
}
```

## Testing Guidelines

### Test-Driven Development (TDD)

1. Write failing test
2. Implement code to pass test
3. Refactor while keeping tests green

### Test Coverage

- **Minimum:** 90% coverage required
- **Test Types:** Unit, Integration, E2E
- **Run tests frequently** during development

### Writing Tests

```typescript
// Unit test example
describe('ExampleService', () => {
  it('should do something', async () => {
    const service = new ExampleService(prisma);
    const result = await service.doSomething(input);
    expect(result).toBeDefined();
  });
});
```

## Code Quality

### Linting

ESLint configured with TypeScript support. Run before committing:

```bash
npm run lint
```

### Formatting

Prettier configured. Auto-format before committing:

```bash
npm run format
```

### Type Checking

TypeScript strict mode enabled. Check types:

```bash
npm run type-check
```

## Git Workflow

### Commit Message Format

```
type(scope): description
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `test`: Adding tests
- `refactor`: Code refactoring
- `docs`: Documentation
- `chore`: Maintenance
- `build`: Build system changes

### Pre-commit Hooks

Husky runs lint-staged on pre-commit:

- Lints staged files
- Formats staged files
- Runs type checking

## Database Development

### Schema Changes

1. Edit `prisma/schema.prisma`
2. Create migration: `npm run db:migrate`
3. Generate Prisma Client: `npm run db:generate`

### Database Studio

View/edit database data:

```bash
npm run db:studio
```

## Background Jobs

### Job Processing

Start worker process:

```bash
# Development
npm run worker:dev

# Production
npm run worker
```

### Creating Jobs

```typescript
import { ingestionQueue } from '@/services/jobs/queues';

await ingestionQueue.add('process-file', {
  filePath: '/path/to/file',
  organizationId: orgId,
});
```

## Troubleshooting

### Common Issues

**Build Errors:**

- Clear `.next` directory
- Reinstall dependencies

**Database Issues:**

- Check connection string
- Verify PostgreSQL is running
- Check migrations

**Test Failures:**

- Check test database connection
- Verify test data setup
- Review error messages

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more help.
