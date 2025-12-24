# API Documentation

Complete API endpoint documentation for AI Microlearning LMS.

## Base URL

Development: `http://localhost:3000/api`

## Authentication

Most endpoints require authentication via JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### POST /api/auth/register

Register a new user.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name"
  },
  "token": "jwt-token"
}
```

#### POST /api/auth/login

Login user.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name"
  },
  "token": "jwt-token"
}
```

#### POST /api/auth/refresh

Refresh JWT token to extend session.

**Headers:**

- `Authorization: Bearer <token>`

**Response:**

```json
{
  "token": "new-jwt-token",
  "expiresAt": "2025-12-17T12:00:00Z"
}
```

#### POST /api/auth/logout

Logout user (client-side token removal, server verifies token validity).

**Headers:**

- `Authorization: Bearer <token>`

**Response:**

```json
{
  "success": true
}
```

#### GET /api/auth/me

Get current user information.

**Headers:**

- `Authorization: Bearer <token>`

**Response:**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "learner"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": {}
}
```

**HTTP Status Codes:**

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## WebSocket API

WebSocket endpoint: `ws://localhost:3000/api/ws`

### Authentication

Include token as query parameter:

```
ws://localhost:3000/api/ws?token=<jwt-token>
```

### Message Format

**Client to Server:**

```json
{
  "event": "session:message",
  "data": {
    "content": "Hello, AI tutor!"
  }
}
```

**Server to Client:**

```json
{
  "event": "session:response",
  "data": {
    "content": "Hello! How can I help you learn today?",
    "type": "assistant"
  }
}
```

### Learning Sessions

#### GET /api/learning/sessions/:id

Get session details including current node, nugget, and choices.

**Headers:**

- `Authorization: Bearer <token>`

**Response:**

```json
{
  "id": "uuid",
  "learnerId": "uuid",
  "currentNodeId": "uuid",
  "pathHistory": ["node-id-1", "node-id-2"],
  "mode": "text",
  "startedAt": "2025-12-10T12:00:00Z",
  "lastActivity": "2025-12-10T12:30:00Z",
  "currentNode": {
    "id": "uuid",
    "nugget": {
      "id": "uuid",
      "content": "Learning content...",
      "imageUrl": "/api/files/nugget-123/image.png",
      "audioUrl": "/api/files/nugget-123/audio.mp3"
    },
    "choices": [
      {
        "id": "choice-1",
        "text": "I want to learn more about X",
        "nextNodeId": "uuid"
      }
    ]
  }
}
```

#### POST /api/learning/sessions/:id/choices

Make a narrative choice and navigate to the next node.

**Headers:**

- `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "choiceId": "choice-1"
}
```

**Response:**

```json
{
  "nextNode": {
    "id": "uuid",
    "nugget": {
      "id": "uuid",
      "content": "Next learning content...",
      "imageUrl": "/api/files/nugget-456/image.png",
      "audioUrl": "/api/files/nugget-456/audio.mp3"
    },
    "choices": [
      {
        "id": "choice-2",
        "text": "Continue",
        "nextNodeId": "uuid"
      }
    ]
  },
  "masteryUpdates": [
    {
      "concept": "concept1",
      "masteryLevel": 75,
      "evidence": "Choice confirmed mastery"
    }
  ]
}
```

#### GET /api/learning/sessions/:id/progress

Get learner progress for a session.

**Headers:**

- `Authorization: Bearer <token>`

**Response:**

```json
{
  "concepts": [
    {
      "concept": "concept1",
      "masteryLevel": 75,
      "lastUpdated": "2025-12-10T12:30:00Z",
      "evidence": "Updated during session"
    }
  ],
  "knowledgeGaps": ["concept2"],
  "pathHistory": ["node-id-1", "node-id-2"],
  "sessionDuration": 1800,
  "nuggetsViewed": 5
}
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse. Limits will be specified per endpoint as implementation progresses.

## Cost Tracking

The system tracks API costs for all AI service calls:

- **Gemini API calls** - Token-based pricing (input/output tokens)
- **OpenAI TTS/STT** - Per character (TTS) or per minute (STT)
- **GPT Image generation** - Token-based pricing (text tokens + image tokens)
- **Costs stored in Analytics table** - Queryable via admin analytics endpoints
