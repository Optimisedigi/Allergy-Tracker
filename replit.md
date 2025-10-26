# AllergyTrack - Food Allergy Tracking Application

## Overview

AllergyTrack is a mobile-first web application for parents to track potential food allergies in babies and toddlers. It helps log food trials, monitor reactions, and build confidence in safe foods through a visual "brick chart" system. The app aims to provide a calm, friendly, and trustworthy interface for systematic food introduction and reaction tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

*   **Frameworks**: React with TypeScript, Vite (build tool), Wouter (routing), TanStack Query (server state).
*   **UI**: Radix UI primitives, shadcn/ui (built on Radix UI and Tailwind CSS), Tailwind CSS (utility-first styling).
*   **State Management**: TanStack Query for server state, React hooks for local UI state, custom `useAuth` for authentication, React Hook Form for form state.
*   **Design**: Mobile-first, component co-location, path aliases, CSS variables for theming (light/dark mode), Australian timezone (Australia/Sydney).
*   **Navigation**: Automatic scroll-to-top on tab/route changes for improved UX.
*   **SEO**: Custom favicon, sitemap.xml with public pages only, robots.txt to guide search engines. SEO files located in client/public/ for automatic static file serving in both development and production.

### Backend

*   **Frameworks**: Express.js with Node.js (ES modules), TypeScript.
*   **Database**: PostgreSQL (via Neon serverless), Drizzle ORM (type-safe queries), Neon Serverless driver.
*   **Authentication**: Replit Auth (OpenID Connect), Passport.js, express-session with PostgreSQL session store.
*   **API**: RESTful endpoints (`/api`), JSON format, authentication middleware, centralized error handling.
*   **Background Services**: node-cron for scheduled tasks (e.g., reminder processing).

### Data Model

*   **Core Entities**: Users, Babies, Foods, Trials, Reactions, Brick Logs, Notifications, User Settings, Pending Invitations.
*   **Relationships**: 
    *   Many-to-many (Users ↔ Babies via user_babies table)
    *   One-to-many (Babies → Trials, Trials → Reactions, Babies → Pending Invitations)
    *   One-to-many (Users → Pending Invitations as inviter)

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
*   **Consistency**: Consistent header "Baby Allergy Tracker For [Name]" with "Days without reaction" across relevant pages.
*   **Landing Page**: Unauthenticated users see cream background (#fff9eb) with simplified messaging: "Each brick adds more to your baby's food story."

### Feature Specifications

*   **Food Trial Tracking**: Logging food introductions, observation periods (default 3 days), and reactions.
    *   **Custom Foods**: User-created foods display with 🍽️ (plate) emoji.
    *   **DOB Validation**: Onboarding prevents selecting future dates for baby's date of birth.
*   **Reaction Tracking**: Detailed tracking of reaction types, severity, and duration.
    *   **Available Reaction Types**: itchiness, hives, swelling, rash, vomiting, irritability (updated from diarrhea on Oct 26, 2025).
*   **Allergy Detection Logic**:
    *   **Confirmed Allergy**: Defined by 3+ consecutive red bricks, or one amber followed by 3+ consecutive red bricks, or any moderate/severe reaction. Consecutive requirement for red bricks is strict.
    *   **Likely Allergy**: Based on multiple reactions without meeting "confirmed" criteria.
*   **Notification System**: Provides warnings for reintroducing foods with mild reactions or confirmed/likely allergies.
*   **Reporting**: Detailed reports with visual progression and status updates for each food.
*   **Dashboard**: Overview of recent activity, summary statistics.
*   **Multi-Caregiver Collaboration**:
    *   **Email Invitations**: Parents can invite partners or other caregivers by email to share access to their baby's data.
    *   **Immediate Access**: If invited user already has an account, they get immediate access to the baby.
    *   **Pending Invitations**: If invited user doesn't exist yet, invitation is stored and auto-accepted when they sign up.
    *   **Caregiver Management**: View all caregivers with access, remove caregivers (cannot remove yourself as sole caregiver).
    *   **Settings UI**: "Manage Caregivers" section in Settings page with invite form, caregiver list, and pending invitations.

## External Dependencies

*   **Database**: Neon PostgreSQL (serverless database, WebSocket connection).
*   **Authentication**: Replit OIDC (OpenID Connect).
*   **Email Service**: Resend API for transactional emails (invitations, food reports).
    *   **Verified Domain**: babyallergytracker.com
    *   **Configuration**: Uses `RESEND_FROM_EMAIL` environment variable for sender address
    *   **Email Types**: Partner invitations with embedded logo, food allergy reports
*   **Development Tools**: Drizzle Kit (database migrations).
*   **Third-Party Libraries**: date-fns & date-fns-tz (date manipulation), zod (schema validation), memoizee (caching), nanoid (ID generation).

## Security & Privacy

### Authentication & Session Management

*   **Replit Auth (OIDC)**: Secure authentication using OpenID Connect protocol
*   **Passport.js**: Authentication middleware with Replit OIDC strategy
*   **Session Management**: 
    *   PostgreSQL-backed sessions via `connect-pg-simple`
    *   Session TTL: 7 days
    *   HTTP-only, secure cookies
    *   Automatic token refresh using refresh tokens
*   **Middleware Protection**: `isAuthenticated` middleware validates all protected routes
*   **Session Security**: Sessions stored in PostgreSQL with automatic expiration

### Authorization & Data Privacy

*   **User Isolation**: Each user can only access their own data
*   **Baby Ownership Verification**: All API routes verify user has access to requested baby data
*   **Authorization Checks**: 
    *   `getBabiesByUser(userId)` used to verify baby ownership
    *   403 Forbidden responses for unauthorized access attempts
    *   All baby-related operations require ownership verification
*   **No Direct ID Access**: User IDs extracted from authenticated session claims

### Input Validation & SQL Injection Prevention

*   **Drizzle ORM**: Type-safe queries with automatic parameterization
*   **Zod Schemas**: Runtime validation for all API inputs
    *   Email format validation (`z.string().email()`)
    *   Numeric constraints (`z.number().min().max()`)
    *   Enum validation for severity levels
    *   Date transformation and validation
*   **Schema Validation Examples**:
    *   `createTrialSchema`: Validates trial data before database insert
    *   `createReactionSchema`: Validates reaction types, severity, dates
    *   `createSteroidCreamSchema`: Validates steroid cream treatment data
*   **No Raw SQL**: All queries use Drizzle's query builder with safe operators (`eq`, `and`, `inArray`, `sql`)

### Data Protection

*   **HTTPS Enforcement**: All traffic encrypted (Replit automatic)
*   **Environment Secrets**: Sensitive credentials in `.env` files
    *   `DATABASE_URL`: PostgreSQL connection string
    *   `SESSION_SECRET`: Session encryption key
    *   `REPL_ID`: Replit application identifier
*   **No Password Storage**: Authentication managed by Replit OIDC (no passwords stored)
*   **UUID-based IDs**: Non-sequential identifiers prevent enumeration attacks

### User Data Management

*   **Data Export**: Users can export all their data as CSV
*   **Account Deletion**: Complete data removal functionality
    *   Deletes all user data: babies, trials, reactions, brick logs, notifications, settings
    *   Cascading deletes ensure no orphaned records
    *   Session destruction upon account deletion
    *   Confirmation required (type "DELETE")
*   **Privacy Policy**: In-app privacy policy accessible from Settings

### Security Best Practices Implemented

*   ✅ All API routes protected with authentication middleware
*   ✅ Authorization checks on all baby-related operations
*   ✅ Input validation using Zod schemas
*   ✅ SQL injection prevention via Drizzle ORM
*   ✅ Secure session management with PostgreSQL storage
*   ✅ HTTP-only, secure cookies
*   ✅ Automatic token refresh
*   ✅ HTTPS enforcement
*   ✅ Environment variable secrets
*   ✅ User data isolation
*   ✅ Complete data deletion capability
*   ✅ Privacy policy disclosure