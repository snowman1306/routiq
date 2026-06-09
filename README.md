# RoutiQ

RoutiQ is a high-performance, enterprise-grade behavioral optimization platform constructed as a database-driven ecosystem for tracking personal habits, cognitive fluctuations, and biological reflections. 

Stepping away from generalized performance trackers, RoutiQ leverages complex botanical modeling logic, Pearson-correlation behavioral mathematics, and an AI-powered stateful reflection core to drive meaningful sustainable growth.

---

## 1. Product Capability Index

The platform delivers an integrated suite of architectural primitives designed to translate daily behavior into durable assets:

*   **Dynamic Habit Structures:** Establishes deep contextual anchors including sequential timing, internal motivations, high-friction deterrents, and specified goal windows.
*   **Botanical Progression Modeling:** Translates integer-bound dataset completions directly into visual specimen growth stages, supporting collectible asset archiving within the Arboretum.
*   **Integrated High-Density Analytics:** Executes frequency heatmapping and stress-to-performance correlation parsing at runtime for instantaneous behavioral pattern recognition.
*   **Omnichannel State Synchronization:** Delivers persistent automated dark-mode rendering and glass-morphism UI optimization across all client contexts.

---

## 2. Technical Architecture

### 2.1 PostgreSQL Database Schema Specification

The underlying DBMS handles strict relational integrity, supporting cascaded operations and vectorized memory arrays.

```mermaid
erDiagram
    USERS {
        SERIAL id PK
        VARCHAR username "unique, not null"
        VARCHAR email "unique, not null"
        VARCHAR password_hash
        TIMESTAMP created_at
        TIME reminder_time
        BOOLEAN reminder_enabled
        INTEGER plants_fully_grown
        TEXT avatar "base64 custom profile image"
        VARCHAR coaching_personality "default: 'supportive'"
        INTEGER friction_threshold "default: 3"
    }
    HABITS {
        SERIAL id PK
        INTEGER user_id FK
        VARCHAR title
        VARCHAR description
        VARCHAR plant_type
        INTEGER current_stage
        TIMESTAMP created_at
    }
    LOGS {
        SERIAL id PK
        INTEGER habit_id FK
        DATE date "not null"
        INTEGER completion_status "0 to 3 completion scale"
        TIMESTAMP created_at
    }
    MOOD {
        SERIAL id PK
        INTEGER user_id FK
        DATE date "not null"
        INTEGER score "1 to 5 mood scale"
        TEXT note
        TIMESTAMP created_at
    }
    ORACLE_MEMORIES {
        SERIAL id PK
        INTEGER user_id FK
        TEXT content "semantic reflections"
        REAL_array embedding "vector coordinates"
        VARCHAR category "memory type"
        TIMESTAMP created_at
    }

    USERS ||--o{ HABITS : "curates"
    USERS ||--o{ MOOD : "logs"
    USERS ||--o{ ORACLE_MEMORIES : "retains"
    HABITS ||--o{ LOGS : "documents"
```

### 2.2 Architectural Flow & Security Design

Communication cycles between the presentation layer and persisted databases utilize standardized JWT verification and asynchronous dispatch modeling.

```mermaid
sequenceDiagram
    autonumber
    actor Curator as User/Curator
    participant Client as React Client (Vite)
    participant Server as Express Server
    participant Auth as Auth Middleware
    participant DB as PostgreSQL Database

    Curator->>Client: Clicks "Save Profile" / Password Edit
    Client->>Server: PUT /api/auth/profile or /change-password
    activate Server
    Server->>Auth: Validate JWT Session Token
    activate Auth
    Auth->>DB: Fetch User details (id, username, email, avatar)
    DB-->>Auth: Hydrated User Object
    deactivate Auth
    Server->>DB: Execute secure SQL Update
    DB-->>Server: Returning updated records
    Server-->>Client: 200 OK (Instant state update)
    deactivate Server
    Client-->>Curator: Update UI elements (Navbar & Chat)
```

---

## 3. Core Module Detail

### 3.1 The Oracle Companion Engine
The Oracle functions as a stateful, AI-powered reflection assistant using Groq API. It delivers real-time intervention tactics spanning custom inversion action plans, cue-anchoring tactics, and burnout prevention analytics.

**Personality Modes:**
The Oracle offers three calibrated coaching personalities:
- **Supportive**: Empathetic and validating, focused on self-compassion and gentle recovery. Ideal for users who need encouragement and hope.
- **Strict**: Direct and tough-love accountability. Gives facts straight about what needs to change. Ideal for users who need clear, no-excuses guidance.
- **Calm**: Peaceful and mindful guidance that helps users see reason. Ideal for users who feel anxious or impatient about results.

**Response Structure:**
All Oracle responses follow a two-paragraph structure:
1. **Analytical Paragraph**: Detailed statistics, metrics, and data-driven insights including completion rates, stress correlations, growth stages, milestone progress (12 growth points = fully grown plant), and behavioral analytics.
2. **Personality-based Paragraph**: Humanized, simple guidance according to the selected personality mode.

**Features:**
- **Habit Suggestions**: Users can ask the Oracle to generate pre-filled habit field suggestions for new habits, personalized to their context and personality.
- **Milestone Awareness**: The Oracle tracks and celebrates progress toward the 12-growth-point milestone system for plant growth.

| System Topic | Vector Directives | Operational Focus |
| :--- | :--- | :--- |
| Burnout Thresholds | stress, overwhelmed | Analyzes load variables to trigger recovery warnings. |
| Volatility Timing | peak, dip, window | Determines optimal throughput windows within the cycle. |
| Headspace Correlation | mood, emotion | Maps internal states against raw habit completions. |
| Loop Optimization | loop, craving, reward | Architecting sequential cues for friction minimization. |
| Friction Engineering | harder, easy | Adjusting variables to reduce starting resistance. |

### 3.2 Statistical Reporting Matrix
*   **Mastery Bloom:** An SVG functional render translating fractional consistency directly into radial floral path geometry.
*   **Stress Curve Overlay:** A dual-axis path overlaying average daily completions against internal reported stress integers.
*   **Qualitative Reflective Aggregation:** Extracts inline unstructured text inputs to feed the unified notes database view.

---

## 4. Developer Stack

### Presentation & Engine
*   React 18
*   Vite Compiler
*   Node.js runtime
*   Express API Controller
*   PostgreSQL
*   Axios Networking

### Utility & Security
*   Lucide vector engine
*   JSON Web Token Auth
*   BCrypt Salt Verification
*   Date-FNS chronological manipulation

---

## 5. Repository Topography

```text
routiq-dbms-project/
├── client/
│   ├── src/
│   │   ├── components/  (Re-usable UI assets)
│   │   ├── pages/       (Dynamic container routes)
│   │   ├── services/    (API integration layer)
│   │   └── index.css    (Standard design tokens)
├── server/
│   ├── database/        (Persistence and schemas)
│   ├── middleware/      (Security & session hooks)
│   ├── routes/          (REST API declarations)
│   ├── services/        (Back-end computation engines)
│   └── index.js         (Server initialization)
└── package.json
```

---

## 6. Installation Protocols

> [!IMPORTANT]
> **STORAGE OPTIMIZATION NOTICE:**
> To keep the backup zipped archive ultra-lightweight (saving over 169 MB), all `node_modules` folders have been omitted. Before attempting to run the project locally, you **MUST** restore these dependencies.

### Prerequisites
*   Node.js (18+)
*   PostgreSQL Database Cluster

### 1. Restore & Install Dependencies
Run the unified installer script from the **root directory** of the project to automatically install dependencies for the Root package, the Express Server, and the React Client:
```bash
npm run install-all
```


### 2. Database Initialization
Execute external pool commands to initialize raw clusters:
```bash
createdb habit_tracker
```
Deploy standard database procedures from root:
```bash
cd server && node -e "require('./database/init').initDatabase().then(() => process.exit(0))"
```

### 3. Operational Execution
Initiate unified dual-threaded local clusters:
```bash
npm run dev
```
Default standard execution:
*   Client Endpoint: `http://localhost:3000`
*   API Controller: `http://localhost:5600`

---

## 7. Environment Variables Configuration

Manual environment configuration requires a `server/.env` declaration. Create a file named `.env` inside the `server/` directory and populate it with your local credentials:

```env
# PostgreSQL connection string
DATABASE_URL=postgresql://[USER]:[PASS]@localhost:5432/habit_tracker

# JWT Signing Secret (used for sessions)
JWT_SECRET=[YOUR_JWT_SECRET_HERE]

# Express Server Port
PORT=5600

# Groq API Key (required for The Oracle AI reflection feature)
GROQ_API_KEY=[YOUR_GROQ_API_KEY_HERE]
```

