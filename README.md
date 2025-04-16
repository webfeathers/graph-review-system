# Graph Review System

A comprehensive web application for managing the review and approval of graph submissions for onboarding specialists.

## Features

- **Role-based access control**:
  - Admin: Full access to all features and settings
  - Reviewer: Can review submissions and change statuses
  - Submitter: Can create submissions and respond to feedback
  - Viewer: Read-only access

- **Submission Management**:
  - Create submissions with title, customer name, and organization ID
  - Track submission status (Submitted, Under Review, Partially Approved, Approved)
  - Threaded commenting system with @mentions
  - Status history tracking

- **SLA Tracking**:
  - Configurable SLA timeframes for each status transition
  - Visual indicators for approaching or exceeded deadlines
  - Email notifications for SLA events

- **Reporting & Analytics**:
  - Submission status distribution
  - User activity metrics
  - Response time analysis
  - Approval rate tracking
  - CSV export functionality

- **Integration Capabilities**:
  - Salesforce status synchronization
  - Email notifications
  - Slack integration for real-time alerts
  - Audit logging for compliance

## Tech Stack

- **Frontend**:
  - React with Next.js
  - Tailwind CSS for styling
  - Recharts for data visualization
  - Lucide React for icons

- **Backend**:
  - Next.js API routes
  - Prisma ORM
  - SQLite database (can be upgraded to PostgreSQL)

- **Authentication**:
  - NextAuth.js with Google OAuth

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

1. Clone the repository
   ```
   git clone https://github.com/your-org/graph-review-system.git
   cd graph-review-system
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   ```
   cp .env.example .env.local
   ```
   Edit `.env.local` with your configuration values.

4. Set up the database
   ```
   npx prisma migrate dev
   ```

5. Start the development server
   ```
   npm run dev
   ```

### Environment Variables

Create a `.env.local` file with the following variables:

```
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Email
EMAIL_SERVER_HOST="smtp.example.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="user@example.com"
EMAIL_SERVER_PASSWORD="password"
EMAIL_FROM="noreply@example.com"

# Slack
SLACK_BOT_TOKEN="xoxb-your-slack-bot-token"

# Salesforce
SF_INSTANCE_URL="https://yourinstance.salesforce.com"
SF_API_TOKEN="your-salesforce-api-token"
```

## Deployment

The application can be easily deployed to Vercel:

1. Push your code to a GitHub repository
2. Connect the repository to Vercel
3. Configure the environment variables
4. Deploy

## Customization

### Adding New Fields

To add new fields to submissions:

1. Update the Prisma schema in `prisma/schema.prisma`
2. Generate a migration: `npx prisma migrate dev --name add_new_field`
3. Update the submission form component
4. Update the submission detail page

## License

This project is licensed under the MIT License.