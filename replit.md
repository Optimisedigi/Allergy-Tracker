# AllergyTrack - Food Allergy Tracking Application

## Overview

AllergyTrack is a mobile-first web application designed to help parents track their baby or toddler's potential food allergies. The app provides a calm, friendly, and trustworthy interface for logging food trials, monitoring allergic reactions, and building confidence in safe foods through a unique brick chart visualization system.

**Core Purpose**: Enable parents to systematically track food introductions and reactions, with each successful allergy-free trial represented as a "brick" in a visual progress chart, building trust in safe foods over time.

**Target Users**: Parents and caregivers of babies and toddlers introducing solid foods.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**October 16, 2025** - UX Improvements and Enhanced Activity Feed
- Fixed emergency notification visibility: changed text color from destructive-foreground to black in light mode for better readability
- Enhanced "Ends on" field in reaction modal: now auto-populates with current date/time (rounded to nearest 5 minutes), removed "(Optional)" label for seamless UX
- Improved recent activity feed with intelligent descriptions:
  - Shows "Confirmed allergy to [food]" for reactions with moderate/severe severity OR 3+ red bricks
  - Shows "Likely allergy to [food]" for reactions with 3+ red bricks (mild severity only)
  - Regular reactions display "Reaction to [food] logged"
  - Uses same `getFoodHistory` logic as notification system
- Updated Food Trial Notification Logic documentation with refined Given-When-Then scenarios

**October 16, 2025** - Food Trial Notification System
- Implemented intelligent notification system when adding food trials
- Scenario 1 (Recent Mild Reaction): Shows gentle warning for foods with 1+ reaction in last 3 trials, not confirmed allergy
- Scenario 2 (Confirmed/Likely Allergy): Shows strong warning for foods with 3+ red bricks OR moderate/severe reactions
- Created `/api/babies/:babyId/foods/:foodId/history` endpoint providing redBrickCount, reactionsInLastThreeTrials, highestSeverity
- Frontend uses this data to display appropriate notification with dynamic severity text

**October 16, 2025** - UI Text Updates
- Changed "Days without reaction" header: now hidden on Settings page, visible on Home/Reports/How it works pages
- Updated Reports page: "Safe Foods" → "Food test passed" in summary statistics
- Updated Home page: "Safe Foods" → "Foods that are safe" in statistics box

**October 13, 2025** - Reports Page Table Layout Redesign
- Completely redesigned Reports tab from card-based to table-based layout
- Table columns: Trial (food name), Result (Pass/Reaction), Visual (progressive bricks), Status
- Food name with emoji appears only in first row of each food section
- Implemented comprehensive 9-state status logic with priority-based evaluation
- Status progression: "Passed once" → "Building confidence" → "Safe food" → "Caution" → "Likely allergy"
- Visual brick representation: green (safe), orange (warning), red (reaction)
- Fixed React Query caching issues by adding `staleTime: 0` and `refetchOnMount: true` for fresh data
- Compact table spacing (py-2 px-3) for mobile-friendly display
- Warning brick system: first reaction after safe foods creates warning (amber), subsequent reactions create red bricks

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React** with TypeScript for type-safe component development
- **Vite** as the build tool and development server
- **Wouter** for lightweight client-side routing
- **TanStack Query (React Query)** for server state management and data fetching

**UI Component System**
- **Radix UI primitives** providing accessible, unstyled component foundations
- **shadcn/ui** component library built on Radix UI with Tailwind CSS styling
- **Tailwind CSS** for utility-first styling with custom theme variables
- Mobile-first responsive design approach

**State Management Strategy**
- Server state managed through React Query with aggressive caching (staleTime: Infinity)
- Local UI state managed with React hooks
- Authentication state provided through custom `useAuth` hook
- Form state managed with React Hook Form

**Design Decisions**
- Component co-location pattern: related components live near their usage
- Path aliases (@/, @shared/) for clean imports
- CSS variables for theming with light/dark mode support
- Australian timezone (Australia/Sydney) as default for date/time formatting

### Backend Architecture

**Server Framework & Runtime**
- **Express.js** for HTTP server and API routing
- **Node.js** with ES modules (type: "module")
- **TypeScript** for type safety across backend code

**Database Layer**
- **PostgreSQL** as the primary database (via Neon serverless)
- **Drizzle ORM** for type-safe database queries and schema management
- **Neon Serverless** driver with WebSocket support for serverless compatibility

**Authentication & Session Management**
- **Replit Auth** using OpenID Connect (OIDC) protocol
- **Passport.js** with OpenID Client strategy
- **express-session** for session management with PostgreSQL session store
- Sessions stored in database for persistence and scalability

**API Design**
- RESTful API endpoints under `/api` namespace
- Authentication middleware protecting all routes except login
- JSON request/response format
- Centralized error handling with proper HTTP status codes

**Background Services**
- **node-cron** for scheduled tasks (reminder processing)
- Reminder service for observation period notifications

### Data Model

**Core Entities**
- **Users**: Authentication and profile information
- **Babies**: Baby profiles with multi-parent access via user-baby relationships
- **Foods**: Common allergen database with emojis and categories
- **Trials**: Food introduction attempts with observation periods (default: 3 days)
- **Reactions**: Detailed reaction tracking with types, severity, and duration
- **Brick Logs**: Historical record of trial outcomes for visualization
- **Notifications**: Scheduled reminders and alerts
- **User Settings**: Personalized preferences including observation periods

**Key Relationships**
- Many-to-many: Users ↔ Babies (supporting multiple caregivers per baby)
- One-to-many: Babies → Trials, Trials → Reactions
- Lookup table: Foods (seeded with common allergens)

### External Dependencies

**Database**
- **Neon PostgreSQL**: Serverless PostgreSQL database
- Connection via DATABASE_URL environment variable
- WebSocket-based connection pooling for serverless environments

**Authentication Provider**
- **Replit OIDC**: OpenID Connect authentication service
- Required environment variables: REPL_ID, ISSUER_URL, SESSION_SECRET, REPLIT_DOMAINS

**Development Tools**
- **Replit-specific plugins**: cartographer, dev-banner, runtime-error-modal for development experience
- **Drizzle Kit**: Database migration and schema management

**Third-Party Libraries**
- **date-fns & date-fns-tz**: Date manipulation and timezone handling
- **zod**: Runtime schema validation
- **memoizee**: Function result caching
- **nanoid**: Unique ID generation

### Build & Deployment

**Development Workflow**
- Development: `tsx` for TypeScript execution with hot reload
- Type checking: Standalone TypeScript compiler check
- Database migrations: Drizzle Kit push command

**Production Build**
- Client: Vite builds to `dist/public`
- Server: esbuild bundles Express app to `dist/index.js`
- Single-process deployment serving static files and API

**Environment Configuration**
- Required: DATABASE_URL, SESSION_SECRET, REPL_ID, REPLIT_DOMAINS
- Optional: ISSUER_URL (defaults to https://replit.com/oidc)
- NODE_ENV for environment detection

### Key Architectural Patterns

**Separation of Concerns**
- `/client`: All frontend React code
- `/server`: Backend Express server and services
- `/shared`: Shared types and schemas between client/server

**Type Safety**
- Shared schema definitions using Drizzle ORM
- Zod schemas for runtime validation
- TypeScript strict mode enabled

**Data Fetching Pattern**
- Custom `apiRequest` utility for authenticated requests
- Query functions handle 401 responses (unauthorized) specially
- Automatic credential inclusion for cookie-based auth

**Error Handling Philosophy**
- Unauthorized errors trigger re-authentication flow
- Toast notifications for user-facing errors
- Server logs all API requests with timing and response data

## Business Logic

### Food Trial Notification Logic

The system provides intelligent warnings when users attempt to start a new trial for foods with a reaction history. This helps parents make informed decisions about food reintroduction while maintaining safety.

#### Scenario 1: Food with a Recent Mild Reaction

**Given** the user is adding a new trial for a food  
**And** that food has had at least one reaction within the past three trials  
**And** the food does not have three red bricks (confirmed allergy)  
**When** the user attempts to start a new trial  
**Then** display the following notification:

> ⚠️ **Note**: [Food] previously caused a mild reaction.
> 
> You can reintroduce this food, but keep an eye out for any symptoms.  
> If you're unsure, check in with your paediatrician for guidance.
> 
> Are you happy to continue with this food?

**And** allow the user to either:
- **Proceed** (continue to trial creation), or
- **Cancel** (return to the food list)

#### Scenario 2: Food with a Confirmed or Likely Allergy (with Dynamic Severity)

**Given** the user is adding a new trial for a food  
**And** that food has accumulated three or more red bricks at any point in its history  
**Or** the system has recorded a moderate or severe reaction for that food  
**When** the user attempts to start a new trial  
**Then** display the following notification:

> 🚫 **Important**: [Food] has previously caused a [severity] allergic reaction.
> 
> Re-introducing this food could trigger another reaction. Please monitor your child carefully for any signs of allergy.  
> If the past reaction was moderate or severe, consider reintroducing this food under the guidance or supervision of your paediatrician or allergist.
> 
> Do you still wish to continue?

**Where**:
- `[Food]` dynamically inserts the food name
- `[severity]` dynamically inserts the highest recorded reaction severity (moderate or severe)

**And** allow the user to either:
- **Proceed with caution** (if they explicitly confirm), or
- **Cancel** (recommended default)

**Implementation Note**: The app should always use the highest recorded severity for that food when deciding which message to display.