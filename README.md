# TaskFlow - Modern Project Management

A powerful, real-time Kanban board application for teams to collaborate, organize tasks, and boost productivity.

## ✨ Key Features

- 🔐 **Secure Authentication** - Email/password and OAuth (Google, GitHub)
- 🛡️ **Enterprise Security** - Row Level Security (RLS) for data protection
- ⚡ **Real-time Collaboration** - Instant sync across all connected users
- 🚀 **Smart Rate Limiting** - Edge Functions to prevent abuse
- 🎨 **Beautiful UI** - Modern design with Next.js 15, Tailwind CSS
- 📱 **Responsive** - Works perfectly on desktop and mobile

## Features

- Create and manage unlimited boards
- Organize tasks with customizable columns
- Drag-and-drop card management
- Real-time collaboration - changes sync instantly
- Due date reminders and smart notifications
- Multiple views: Kanban, Table, Calendar, Gantt
- Team management with role-based permissions
- Labels, checklists, and priority levels

## Getting Started

### 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your project URL and keys from Settings > API

### 2. Database Setup

Run the SQL migration in Supabase SQL Editor:

```bash
# Copy the contents of:
supabase/migrations/001_initial_schema.sql
```

This creates:
- `boards`, `columns`, `cards`, `notifications` tables
- Row Level Security policies
- Indexes for performance
- Triggers for auto-creating reminder notifications
- Realtime subscriptions

### 3. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_EDGE_URL=https://your-project.supabase.co/functions/v1
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Edge Functions Deployment (Optional)

If you want to use Supabase Edge Functions for rate limiting:

```bash
# Install Supabase CLI
npm i -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy create-card
supabase functions deploy send-reminders

# Set environment variables in Supabase Dashboard
# Functions > create-card > Settings > Environment Variables
```

## Project Structure

```
kanban-poc/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes (cards, reminders)
│   │   ├── auth/              # Auth pages
│   │   ├── boards/[id]/       # Board view page
│   │   └── dashboard/         # Dashboard page
│   ├── components/
│   │   ├── auth/              # Auth forms, protected routes
│   │   ├── boards/            # Board, column, card components
│   │   ├── layout/            # Header, navigation
│   │   └── notifications/     # Notification bell, list
│   ├── contexts/              # React contexts (Auth)
│   ├── lib/supabase/          # Supabase client config
│   └── types/                 # TypeScript types
├── supabase/
│   ├── functions/             # Edge Functions
│   │   ├── create-card/       # Rate-limited card creation
│   │   └── send-reminders/    # Process reminder notifications
│   └── migrations/            # SQL migrations
└── README.md
```

## RLS Policies

- **Boards**: Only owner can access
- **Columns**: Only if parent board is owned by user
- **Cards**: Owner, assignee, or creator can access
- **Notifications**: Only recipient can access

## Testing

1. **Auth**: Sign up with two different accounts
2. **RLS**: Verify users only see their own boards
3. **Rate Limit**: Try creating 101 cards - last should fail with 429
4. **Realtime**: Open board in two browsers, changes sync instantly
5. **Reminders**: Create card with due date, check notifications

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Realtime**: Supabase Realtime
- **Edge Functions**: Supabase Edge Functions (Deno)
- **Styling**: Tailwind CSS
- **Drag & Drop**: dnd-kit
- **Icons**: Lucide React

## Security Notes

- ⚠️ Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend
- RLS policies protect data at the database level
- Edge Functions validate JWT tokens server-side
- All user inputs are parameterized (SQL injection safe)

## License

MIT

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
