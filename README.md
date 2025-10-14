# AllergyTrack 🍼

A mobile-first web application designed to help parents track their baby or toddler's potential food allergies during the critical food introduction phase.

## 📋 Table of Contents
- [Overview](#overview)
- [Core Features](#core-features)
- [The Brick System](#the-brick-system)
- [Status Logic](#status-logic)
- [How to Use](#how-to-use)
- [Technical Architecture](#technical-architecture)

---

## Overview

**AllergyTrack** helps parents systematically track food introductions and reactions, building confidence in safe foods through a visual "brick chart" system. Each successful allergy-free trial adds a brick to your child's progress, creating a clear visual history of their food journey.

### Target Users
Parents and caregivers of babies and toddlers (typically 6-24 months) who are introducing solid foods and monitoring for potential allergic reactions.

### Core Purpose
- Track food trials with observation periods (default: 3 days)
- Log allergic reactions with detailed symptoms
- Visualize food safety progress through color-coded bricks
- Identify safe foods vs. potential allergens
- Share detailed reports with healthcare providers

---

## Core Features

### 🏠 Home Screen (Dashboard)
- **Quick view** of all foods being tracked
- **Brick chart visualization** showing trial history at a glance
- **Status indicators** for each food (Safe, Caution, Likely allergy, etc.)
- **Trial counter** showing passes vs. reactions
- **Quick actions** to complete trials or log reactions

### 🍽️ Trial Tracking
- Start new food trials with automatic observation periods
- Default 3-day observation period (customizable per user)
- Track trial dates and completion status
- Complete trials early or wait for observation period to end

### ⚠️ Reaction Logging
- Detailed reaction tracking with multiple symptom types:
  - Skin reactions (rash, hives, eczema)
  - Digestive issues (vomiting, diarrhea, constipation)
  - Respiratory symptoms (coughing, wheezing, runny nose)
  - Behavioral changes (fussiness, sleep issues)
  - Other symptoms
- Severity levels: Mild, Moderate, Severe
- Duration tracking: minutes to days
- Notes for additional context

### 📊 Reports Page
- **Summary statistics**: Total foods tested, safe foods, reactions logged
- **Detailed food history table** with:
  - Trial column: Food name with emoji (shown once per food)
  - Visual column: Progressive brick display
  - Status column: Current safety assessment
- **Email reports** to doctors with comprehensive trial data

### 🔔 Reminders (Coming Soon)
- Automated notifications for:
  - Observation period ending
  - Trial completion reminders
  - Follow-up trial suggestions

---

## The Brick System

The brick chart is the heart of AllergyTrack's visual tracking system. Each trial creates a brick that tells the story of your child's food journey.

### Three Brick Types

#### 🟢 **Green Brick (Safe)**
- **When created**: Trial completed successfully with no reaction
- **Meaning**: This trial passed safely
- **Visual**: Green gradient background

#### 🟠 **Amber/Orange Brick (Warning)**
- **When created**: First reaction occurs AFTER food previously passed safely (1+ green bricks exist)
- **Meaning**: Caution - this food was safe before but now caused a reaction
- **Visual**: Amber/orange gradient background
- **Why it matters**: Indicates tolerance may be fluctuating; proceed with medical guidance

#### 🔴 **Red Brick (Reaction)**
- **When created**: 
  - First trial of a food results in a reaction (no green bricks yet)
  - Second+ reaction occurs after a warning brick
- **Meaning**: Confirmed allergic reaction
- **Visual**: Red gradient background

### Brick Logic Examples

**Example 1: Introducing Peanut Butter**
- Trial 1: Pass → 🟢 Green brick
- Trial 2: Pass → 🟢 Green brick
- Trial 3: Reaction → 🟠 Amber brick (WARNING: was safe, now reacted!)
- Trial 4: Reaction → 🔴 Red brick

**Example 2: Introducing Egg**
- Trial 1: Reaction → 🔴 Red brick (immediate reaction, no safe history)
- Trial 2: Reaction → 🔴 Red brick

**Example 3: Building Confidence with Carrot**
- Trial 1: Pass → 🟢 Green brick
- Trial 2: Pass → 🟢 Green brick
- Trial 3: Pass → 🟢 Green brick
- Status: "Safe food" ✅

### Why the Warning System Matters

The amber/orange warning brick is crucial because:
1. **Tolerance can change**: A food that was safe can later cause reactions
2. **Important medical signal**: Helps doctors identify developing sensitivities
3. **Prevents false confidence**: Even "safe" foods need continued monitoring
4. **Data preservation**: Keeps full history instead of overwriting past successes

---

## Status Logic

AllergyTrack uses a sophisticated 9-state status system that evaluates cumulative passes and reactions:

### Status Progression

| Passes | Reactions | Status | Icon | Meaning |
|--------|-----------|--------|------|---------|
| 0 | 0 | Not tested | ⚪ | No trials yet |
| 1 | 0 | Passed once | ✓ | First successful trial |
| 2 | 0 | Building confidence | ↗️ | Making progress |
| 3+ | 0 | Safe food | ✅ | High confidence - safe |
| 1+ | 1 | Caution | ⚠️ | Mixed results - be careful |
| 0 | 1 | Possible allergy | 🔶 | First trial reacted |
| 0 | 2 | Likely allergy | ⚠️ | Two reactions, no passes |
| 0 | 3+ | Confirmed allergy | 🚫 | Strong evidence of allergy |
| Any | 2+ | Likely allergy | ⚠️ | Multiple reactions detected |

### Priority-Based Evaluation

The status logic follows this priority order:
1. **Check reaction count first**: 3+ reactions = "Confirmed allergy"
2. **Check for mixed results**: Reactions + Passes = "Caution" or "Likely allergy"
3. **Check pass count**: 3+ passes = "Safe food", 2 passes = "Building confidence", 1 pass = "Passed once"
4. **Default**: No trials = "Not tested"

### Visual Representation

**Home Screen**: Each food card shows:
- Status text with appropriate icon
- Brick chart showing full history
- Pass/Reaction counter (e.g., "2 passes, 1 reaction")

**Reports Page**: Table format shows:
- Progressive brick display (builds up row by row)
- Status shown only on final row or when significant status is reached

---

## How to Use

### Getting Started

1. **Create an account** using Replit authentication
2. **Add your baby's profile** (optional but recommended for multi-child families)
3. **Start tracking foods** from the dashboard

### Starting a Food Trial

1. Tap the **"+ Start New Trial"** button on the Home screen
2. Select a food from the common allergens list
3. The trial begins with a 3-day observation period
4. Monitor your baby for any reactions during this time

### Completing a Trial (No Reaction)

1. After the observation period, tap **"Complete Trial"** on the food card
2. A **green brick** is added to the chart
3. The food's status updates based on total passes
4. You can start another trial of the same food to build confidence

### Logging a Reaction

1. If your baby has a reaction, tap **"Log Reaction"** immediately
2. Select all applicable symptoms:
   - Skin reactions
   - Digestive issues  
   - Respiratory symptoms
   - Behavioral changes
   - Other
3. Choose severity level (Mild, Moderate, Severe)
4. Enter duration (e.g., "30 minutes", "2 hours", "1 day")
5. Add notes with specific details
6. Tap **"Log Reaction"** to save

**Important**: The app automatically creates the appropriate brick:
- **Amber brick** if this food passed before
- **Red brick** if it's a new reaction or repeat reaction

### Viewing Reports

1. Navigate to the **Reports** tab
2. View summary statistics at the top
3. Scroll through the detailed food history table
4. See progressive brick charts for each food
5. Check status assessments

### Sharing with Your Doctor

1. Go to the **Reports** tab
2. Scroll to the "Email Report to Doctor" section
3. Enter your doctor's email address
4. Tap **"Send Report"** to email a comprehensive summary

---

## Technical Architecture

### Frontend
- **React** with TypeScript for type safety
- **Vite** for fast development and building
- **Wouter** for lightweight routing
- **TanStack Query (React Query)** for server state management
- **shadcn/ui** components with Tailwind CSS
- **Mobile-first responsive design**

### Backend
- **Express.js** REST API
- **PostgreSQL** database (Neon serverless)
- **Drizzle ORM** for type-safe queries
- **Passport.js** with Replit OIDC authentication
- **Session-based auth** with PostgreSQL store

### Data Model

**Core Entities**:
- `users` - Parent/caregiver accounts
- `babies` - Baby profiles (many-to-many with users)
- `foods` - Common allergen database with emojis
- `trials` - Food introduction attempts
- `reactions` - Detailed reaction records
- `brick_logs` - Historical brick data (safe/warning/reaction)
- `notifications` - Reminders and alerts
- `user_settings` - Personalized preferences

**Key Relationships**:
- Users ↔ Babies (many-to-many via `user_babies`)
- Babies → Trials (one-to-many)
- Trials → Reactions (one-to-many)
- Foods ← Brick Logs (one-to-many)

### Timezone & Dates
- Default timezone: **Australia/Sydney**
- Uses `date-fns` and `date-fns-tz` for date manipulation
- All dates stored in UTC, displayed in user's timezone

---

## Development

### Running Locally
```bash
npm install
npm run dev
```

### Database Migrations
```bash
npm run db:push
```

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `REPL_ID` - Replit workspace ID
- `REPLIT_DOMAINS` - Allowed domains for CORS
- `ISSUER_URL` - OIDC provider URL

---

## Future Enhancements

- **Reminder notifications** for observation periods
- **Export reports** as PDF
- **Multi-language support**
- **Custom food database** (add your own foods)
- **Photo upload** for visible reactions
- **Growth tracking integration**
- **Healthcare provider dashboard**

---

## Support

For questions, issues, or feature requests, please contact the development team or file an issue in the repository.

---

## License

Proprietary - AllergyTrack © 2025

---

**Remember**: AllergyTrack is a tracking tool to support your discussions with healthcare providers. Always consult your pediatrician or allergist before introducing potential allergens, especially for high-risk foods or if your child has a family history of allergies.
