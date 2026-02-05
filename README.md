# Nexus Dashboard

A comprehensive personal productivity dashboard built with Next.js 16, React 19, and Prisma. The Nexus Dashboard provides a centralized hub for managing various aspects of your academic and professional life.

## Features

### Overview Dashboard
- Real-time situational awareness with key metrics
- Smart deadline detection and prioritization
- Quick access to urgent tasks and upcoming events

### Calendar & Deadlines
- Integrated calendar with manual event creation
- Project and hackathon deadline tracking
- Academic and personal event management
- Smart categorization by event type

### Attendance Tracking
- Subject-wise attendance monitoring
- Statistical insights and trends
- Easy attendance logging and management

### Project Management
- Track personal and academic projects
- Status-based project organization
- Linked notes and documentation
- Progress monitoring and deadlines

### Hackathon Tracker
- Comprehensive hackathon management
- Registration status tracking
- Team formation and contact management
- Prize and achievement recording

### Task Management
- Priority-based task organization
- Status tracking and completion monitoring
- Quick task creation and updates

### Job Applications
- Application status tracking
- Company and role management
- Interview scheduling and follow-ups
- Comprehensive application lifecycle

### Notes System
- Rich text note-taking
- Linking notes to projects and events
- Search and organization features
- Markdown support

## Tech Stack

- **Frontend**: Next.js 16.1.6 with React 19.2.3
- **Build Tool**: Turbopack (experimental)
- **Database**: SQLite with Prisma ORM 5.22.0
- **Styling**: Tailwind CSS 4 with PostCSS
- **TypeScript**: Full type safety with strict mode
- **Validation**: Zod 4.3.6 for schema validation
- **Icons**: Lucide React for consistent iconography

## Getting Started

### Prerequisites
- Node.js 18.2 or higher
- npm, yarn, pnpm, or bun package manager

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/positromen/Personal_Dashboard.git
   cd Personal_Dashboard/nexus-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. Set up the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. (Optional) Seed the database with sample data:
   ```bash
   npx prisma db seed
   ```

### Development

Start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the dashboard.

### Building for Production

```bash
npm run build
npm start
```

## Database Schema

The application uses a SQLite database with the following main entities:

- **Projects**: Track personal and academic projects
- **Hackathons**: Manage hackathon registrations and outcomes
- **CalendarEvents**: Store deadlines and academic events
- **Tasks**: Manage todo items and priority tasks
- **Applications**: Track job applications and interviews
- **Notes**: Store rich text documentation
- **AttendanceRecords**: Log and track attendance data

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── api/            # API routes
│   ├── applications/   # Job applications management
│   ├── attendance/     # Attendance tracking
│   ├── calendar/       # Calendar and events
│   ├── hackathons/     # Hackathon management
│   ├── notes/          # Note-taking system
│   ├── projects/       # Project management
│   ├── system/         # System utilities
│   └── todo/           # Task management
├── components/         # Reusable UI components
│   ├── layout/        # Layout components
│   └── ui/            # Base UI components
├── lib/               # Utility functions and types
└── server/            # Server-side logic and queries
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database managed with [Prisma](https://prisma.io/)
- Icons by [Lucide](https://lucide.dev/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
