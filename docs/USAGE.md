# Usage Guide

How to use the AI Microlearning LMS application.

## Getting Started

### Accessing the Application

1. **Landing Page:** Visit `http://localhost:3000` (or your deployed URL)
   - View platform overview and features
   - Click "Try Demo" to access the login page
   - Click "Contact Sales" to reach out to Studio42.dev

2. **Login Page:** Visit `http://localhost:3000/login`
   - Enter credentials manually, or
   - Click demo account buttons for quick access

### Demo Accounts

After running `npm run seed:demo`, use these accounts:

- **Learner Account:**
  - Email: `learner@demo.com`
  - Password: `demo123`
  - Access: Learning canvas, interactive sessions

- **Admin Account:**
  - Email: `admin@demo.com`
  - Password: `demo123`
  - Access: Admin console, content management

## User Roles

### Learner

Learners interact with the AI tutor through multimodal conversation (text or voice) to learn from atomic learning nuggets.

**Features:**

- Interactive learning sessions
- Text chat with AI tutor
- 2-way voice conversation
- Adaptive learning paths
- Progress tracking
- Knowledge gap identification

### Admin

Admins manage content ingestion, view nuggets, configure settings, and monitor system analytics.

**Features:**

- Content ingestion management
- Nugget store and management
- System settings
- Analytics dashboard
- Job monitoring

## Learner Features

### Starting a Learning Session

1. Log in with a learner account
2. Navigate to the learner canvas (`/canvas`)
3. The system will create or resume your learning session
4. Choose interaction mode: Text or Voice
5. Begin conversation with AI tutor

### Learning Interface

The learner canvas includes:

- **Chat Interface:** Text-based conversation with AI tutor
  - Type questions and responses
  - View conversation history
  - Navigate through learning content

- **Media Widget:** Displays learning content
  - **Slides:** Presentation slides for nuggets
  - **Images:** Visual content
  - **Audio:** Audio narration for nuggets

- **Progress Panel:** Shows learning progress
  - Mastery scores for concepts
  - Knowledge gaps identified
  - Learning path visualization

- **Narrative Tree:** Visualizes learning path
  - Available choices and paths
  - Prerequisites and dependencies
  - Adaptive navigation

### Voice Mode

1. Click the voice mode button in the interface
2. Grant microphone permissions when prompted
3. Speak naturally - AI responds with voice
4. Switch back to text mode anytime
5. Voice conversation uses Gemini Live API for 2-way communication

### Text Chat Mode

1. Type your questions or responses in the chat input
2. Press Enter or click Send
3. AI tutor responds with text
4. View conversation history
5. Navigate through learning content as suggested

## Admin Features

### Content Ingestion

#### File Watching

1. Navigate to Admin Console → Ingestion Management (`/console/ingestion`)
2. Click "Add Watched Folder"
3. Specify folder path on the server
4. Files in folder are automatically processed when added or modified
5. View processing status and results

**Supported File Types:**

- PDF files (`.pdf`)
- Word documents (`.docx`)
- Text files (`.txt`)
- HTML files (`.html`)

#### URL Monitoring

1. Navigate to Admin Console → Ingestion Management
2. Click "Add Monitored URL"
3. Enter URL to monitor
4. System checks for changes periodically
5. New or updated content is automatically ingested
6. Manually trigger checks if needed

### Nugget Management

1. Navigate to Nugget Store (`/console/nuggets`)
2. Browse or search nuggets
3. Click nugget to view details:
   - Content and metadata
   - Generated slides and images
   - Audio narration
   - Embeddings and similarity scores
4. Edit content if needed
5. Regenerate slides/audio if desired
6. Delete nuggets if necessary

### Settings

1. Navigate to Settings (`/console/settings`)
2. Configure system settings:
   - API keys (Gemini, OpenAI, ElevenLabs)
   - Storage paths
   - Upload limits
   - System preferences
3. Save changes

### Analytics

1. Navigate to Analytics Dashboard (`/console/analytics`)
2. View usage metrics:
   - Learner engagement
   - Content statistics
   - API usage and costs
   - System performance
3. Monitor trends and insights

## Best Practices

### For Learners

- **Engage Naturally:** Have conversations with the AI tutor as you would with a human instructor
- **Ask Questions:** Don't hesitate to ask for clarification or examples
- **Review Progress:** Check your progress panel regularly to see mastery levels
- **Explore Paths:** Try different narrative choices to explore various learning paths
- **Use Voice Mode:** For a more natural learning experience, try voice conversation

### For Admins

- **Monitor Ingestion:** Regularly check ingestion jobs to ensure content is being processed
- **Review Nuggets:** Review generated nuggets for quality and accuracy
- **Optimize Costs:** Monitor API usage and costs, use Gemini Flash for cost-effective operations
- **Manage Content:** Keep nugget store organized and up-to-date
- **Track Analytics:** Use analytics dashboard to understand learner engagement

## Common Tasks

### Adding New Content

1. **Via File Watching:**
   - Place files in a watched folder
   - System automatically processes them

2. **Via URL Monitoring:**
   - Add URL to monitored list
   - System checks and processes updates

3. **Manual Upload:**
   - Use admin console to upload files directly (if implemented)

### Creating Learning Sessions

1. Log in as a learner
2. Navigate to canvas
3. System automatically creates a session
4. Start interacting with AI tutor

### Monitoring System Health

1. Check PM2 status: `pm2 status`
2. View application logs: `pm2 logs nuggets-lms`
3. View worker logs: `pm2 logs nuggets-lms-worker`
4. Check database: `npm run db:studio`
5. View analytics dashboard in admin console

## Troubleshooting

### Login Issues

- Verify demo accounts exist: `npm run seed:demo`
- Check database connection
- Verify JWT_SECRET is set in `.env`

### Content Not Processing

- Check worker logs: `pm2 logs nuggets-lms-worker`
- Verify Redis is running
- Check job queue status
- Verify API keys are set

### Learning Session Issues

- Check WebSocket connection
- Verify session is created in database
- Check AI API keys (Gemini)
- Review application logs

For more help, see [Setup Guide](SETUP.md) or [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
