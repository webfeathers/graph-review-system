# Graph Review System

A Next.js application for managing and reviewing graphs.

## Key Components

### Layout Components
- `Layout.tsx` - Main application layout with navigation and common UI elements
- `AdminLayout.tsx` - Specialized layout for admin pages with additional controls

### Core Components
- `Button.tsx` - Reusable button component with variants (primary, secondary, danger, ghost)
- `ErrorDisplay.tsx` - Error handling and display component
- `LoadingState.tsx` - Loading indicator component
- `EmptyState.tsx` - Component for displaying empty states

### Feature Components
- `GraphReviewCard.tsx` - Card component for displaying graph reviews
- `commentSection.tsx` - Comment system for reviews
- `MentionAutocomplete.tsx` - Autocomplete component for user mentions in comments
- `ProjectLeadSelector.tsx` - Component for selecting project leads

### Authentication
- `AuthProvider.tsx` - Authentication context provider
- `AuthForm.tsx` - Authentication form component
- `GoogleLoginButton.tsx` - Google OAuth login button

### Admin Features
- `UserManagement.tsx` - User management interface
- `withRoleProtection.tsx` - HOC for protecting admin routes

### Utility Components
- `withErrorHandling.tsx` - HOC for error handling
- `Skeleton.tsx` - Loading skeleton component
- `ReviewCardSkeleton.tsx` - Skeleton for review cards
- `CommentSkeleton.tsx` - Skeleton for comments
- `StatusBadge.tsx` - Status indicator component

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   Create a `.env.local` file with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Project Structure

```
├── components/         # React components
├── pages/             # Next.js pages
├── public/            # Static assets
└── styles/            # Global styles
```

## Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Supabase Setup](#supabase-setup)
- [Deployment](#deployment)
- [Security and Vulnerabilities](#security-and-vulnerabilities)
- [Contributing](#contributing)
- [License](#license)

## Features

- User authentication with Google via Supabase
- Create, view, and manage graph reviews
- Admin dashboard with Kantata project validation
- Type-safe API routes and data transformations
- File upload support for user avatars
- Strict TypeScript checks and linting

## Prerequisites

- Node.js v16 or above (tested on v23.11.0)
- npm v7 or above
- A Supabase project with storage buckets and authentication enabled

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/webfeathers/graph-review-system.git
   cd graph-review-system
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the project root with the following variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_supabase_anon_key>
   SUPABASE_SERVICE_ROLE_KEY=<your_supabase_service_role_key>
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

The application requires the following environment variables:

| Variable                     | Description                                   |
| ---------------------------- | --------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`   | Your Supabase project URL                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase public anon key                |
| `SUPABASE_SERVICE_ROLE_KEY`  | Service role key for server-side operations  |

## Available Scripts

- `npm run dev` - Start Next.js in development mode with strict type checking
- `npm run build` - Build the Next.js application for production
- `npm start` - Start the production server after a build
- `npm run lint` - Run ESLint checks
- `npm run typecheck` - Run TypeScript compiler without emitting output

## Project Structure

```
├── components/       # React UI components
├── lib/              # Utility functions and API helpers
│   ├── apiHelpers.ts
│   ├── supabase.ts   # Supabase client setup
│   ├── supabaseUtils.ts
│   ├── validationSchemas.ts
│   └── validationUtils.ts
├── pages/            # Next.js pages and API routes
│   ├── api/
│   ├── dashboard.tsx
│   ├── login.tsx
│   └── register.tsx
├── types/            # TypeScript type definitions
├── constants/        # Application-wide constants and enums
├── public/           # Static assets
├── styles/           # Tailwind CSS configuration
├── .env.local        # Environment variables (not committed)
├── next.config.js
├── tsconfig.json
└── README.md         # This documentation
```

## Supabase Setup

1. In the Supabase dashboard, create a new project or use an existing one.
2. Under **Authentication**, enable Google sign-in.
3. Under **Storage**, create the following buckets:
   - `avatars` (for user avatars and logos)
   - `user-uploads` (for user-submitted files)
4. Copy the **URL** and **anon key** into your `.env.local` file.
5. Optionally, create service role keys for server-side operations.

## Deployment

This project is configured for automatic deploys on Vercel.

1. Push your changes to the `main` branch of the GitHub repository.
2. Vercel will detect the Next.js app and start a new deployment.
3. Set the same environment variables in the Vercel dashboard under **Project Settings**.

## Security and Vulnerabilities

- Dependencies have been updated to the latest versions to address known vulnerabilities.
- Run `npm audit` regularly to check for new advisories.
- Follow secure coding practices and review pull requests for potential risks.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## License

This project is licensed under the [MIT License](LICENSE). 