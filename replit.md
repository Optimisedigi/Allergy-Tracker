# Allergy Tracker for Bubs - Food Allergy Tracking Application

## Overview

Allergy Tracker for Bubs is a mobile-first web application for parents to track potential food allergies in babies and toddlers. It helps log food trials, monitor reactions, and build confidence in safe foods through a visual "brick chart" system. The app aims to provide a calm, friendly, and trustworthy interface for systematic food introduction and reaction tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

*   **Frameworks**: React with TypeScript, Vite (build tool), Wouter (routing), TanStack Query (server state).
*   **UI**: Radix UI primitives, shadcn/ui (built on Radix UI and Tailwind CSS), Tailwind CSS (utility-first styling).
*   **State Management**: TanStack Query for server state, React hooks for local UI state, custom `useAuth` for authentication, React Hook Form for form state.
*   **Design**: Mobile-first, component co-location, path aliases, CSS variables for theming (light/dark mode), Australian timezone (Australia/Sydney).

### Backend

*   **Frameworks**: Express.js with Node.js (ES modules), TypeScript.
*   **Database**: PostgreSQL (via Neon serverless), Drizzle ORM (type-safe queries), Neon Serverless driver.
*   **Authentication**: Replit Auth (OpenID Connect), Passport.js, express-session with PostgreSQL session store.
*   **API**: RESTful endpoints (`/api`), JSON format, authentication middleware, centralized error handling.
*   **Background Services**: node-cron for scheduled tasks (e.g., reminder processing).

### Data Model

*   **Core Entities**: Users, Babies, Foods, Trials, Reactions, Brick Logs, Notifications, User Settings.
*   **Relationships**: Many-to-many (Users ↔ Babies), One-to-many (Babies → Trials, Trials → Reactions).

### Key Architectural Patterns

*   **Separation of Concerns**: `/client` (frontend), `/server` (backend), `/shared` (common types/schemas).
*   **Type Safety**: Drizzle ORM, Zod for runtime validation, TypeScript strict mode.
*   **Data Fetching**: Custom `apiRequest` with authentication, handling 401 responses.
*   **Error Handling**: Toast notifications for users, server logs, re-authentication for unauthorized access.

### UI/UX Decisions

*   **Visualizations**: Unique "brick chart" system (green for safe, orange for warning, red for reaction).
*   **Food Status**: 9-state logic (e.g., "Passed once", "Building confidence", "Safe food", "Confirmed allergy").
*   **Notifications**: Intelligent warning system for food trials based on reaction history and severity.
*   **Layouts**: Dashboard with recent activity, Reports page with a table-based layout showing food trials, results, visual bricks, and status.
*   **Modals**: Food Detail Modal displaying complete trial history, notes, and reactions.
*   **Consistency**: Consistent header "Allergy Tracker for Bubs For [Name]" with "Days without reaction" across relevant pages.

### Feature Specifications

*   **Food Trial Tracking**: Logging food introductions, observation periods (default 3 days), and reactions.
*   **Reaction Tracking**: Detailed tracking of reaction types, severity, and duration.
*   **Allergy Detection Logic**:
    *   **Confirmed Allergy**: Defined by 3+ consecutive red bricks, or one amber followed by 3+ consecutive red bricks, or any moderate/severe reaction. Consecutive requirement for red bricks is strict.
    *   **Likely Allergy**: Based on multiple reactions without meeting "confirmed" criteria.
*   **Notification System**: Provides warnings for reintroducing foods with mild reactions or confirmed/likely allergies.
*   **Reporting**: Detailed reports with visual progression and status updates for each food.
*   **Dashboard**: Overview of recent activity, summary statistics.

## External Dependencies

*   **Database**: Neon PostgreSQL (serverless database, WebSocket connection).
*   **Authentication**: Replit OIDC (OpenID Connect).
*   **Development Tools**: Drizzle Kit (database migrations).
*   **Third-Party Libraries**: date-fns & date-fns-tz (date manipulation), zod (schema validation), memoizee (caching), nanoid (ID generation).