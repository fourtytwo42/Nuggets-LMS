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

## Rate Limiting

API endpoints are rate-limited to prevent abuse. Limits will be specified per endpoint as implementation progresses.
