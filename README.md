# Async Tagging System

A learning project demonstrating asynchronous content tagging using AI, graph databases, and job queues. The system automatically processes and tags content using OpenAI, stores relationships in Neo4j, and provides recommendations based on graph relationships.

## Features

- **Async Task Processing:** Handles events via RabbitMQ for decoupling.
- **Tag Extraction:** Uses OpenAI API to extract relevant tags from post content.
- **Graph Storage:** Leverages Neo4j to store relationships between users, posts, and tags.
- **Database:** Uses PostgreSQL with Drizzle ORM for storing core post data.

## Tech Stack

- **Technology Stack:** Node.js, TypeScript, PostgreSQL (with Drizzle ORM), Neo4j, RabbitMQ, OpenAI API.

## Project Structure

```
my-tagger/
├── .github/             # GitHub Actions workflows
├── .vscode/             # VSCode settings
├── jobs/                # Background job processing
│   ├── consumers/       # RabbitMQ consumers for events
│   ├── rabbitmqClient.ts # RabbitMQ client setup
│   └── startConsumers.ts # Entry point to start all consumers
├── lib/                 # Core libraries/utilities
│   ├── neo4j.ts         # Neo4j driver setup
│   ├── openai.ts        # OpenAI client setup
│   ├── messageSchemas.ts # Zod schemas for RabbitMQ messages
│   └── schemas.ts       # Other shared Zod schemas (e.g., OpenAI response)
├── scripts/             # Utility scripts (e.g., connection tests)
│   └── test-connections.ts
├── simulation/          # Components for simulating a platform
│   ├── db/              # Postgres client and schema definitions
│   ├── drizzle/         # Drizzle ORM migration files
│   ├── drizzle.config.ts # Drizzle config for simulation DB
│   ├── mockPublisher.ts # Simulates publishing events to RabbitMQ
│   └── seedPosts.ts     # Seeds initial post data into Postgres
├── .editorconfig
├── .env.sample          # Environment variable template
├── .env                 # Local environment variables (ignored by git)
├── .gitignore
├── docker-compose.yml   # Docker services (Postgres, Neo4j, RabbitMQ)
├── package.json
├── pnpm-lock.yaml
├── README.md            # This file
└── tsconfig.json
```

**Simulation Directory (`simulation/`)**

The `simulation/` directory contains components used to *simulate* a social media platform generating events. This includes:
- A PostgreSQL database (`db/`, `drizzle/`, `drizzle.config.ts`) to store simulated posts.
- A script to seed this database (`seedPosts.ts`).
- A script (`mockPublisher.ts`) to publish `post.created` and `post.interacted` events to RabbitMQ, mimicking how a real platform might notify downstream services.

This separation allows the core tagging service (`jobs/consumers/`) to be decoupled from the data source. The consumers only care about the messages received via RabbitMQ, not how they were generated.

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- pnpm
- Docker & Docker Compose
- OpenAI API Key

### Running Locally

1.  **Setup Environment:**
    Copy `.env.sample` to `.env` and fill in your credentials (especially `OPENAI_API_KEY`, `NEO4J_URI`/`USERNAME`/`PASSWORD`, `RABBITMQ_URL`, and `PG_*` variables for the *simulation* database).

2.  **Install Dependencies:**
    ```bash
    pnpm install
    ```

3.  **Start Services:**
    ```bash
    docker-compose up -d # Starts postgres, neo4j, rabbitmq
    ```

4. **(Optional) Prepare Simulation Database:**
   If this is the first time or you need to reset the simulation database:
   ```bash
   # Ensure tables are empty and schema is up-to-date
   pnpm sim:db:reset
   
   # Generate SQL migration files (if schema changed)
   # pnpm sim:db:generate 
   # Apply migrations to the database
   # pnpm sim:db:migrate
   ```
   *(Note: `sim:db:reset` already includes running migrations)*

5. **(Optional) Reset Graph Database:**
   To clear existing graph data before testing:
   ```bash
   pnpm sim:graph:reset
   ```

6. **Start the Consumer Service:**
   This service listens for messages from RabbitMQ.
   ```bash
   pnpm start:consumers
   ```

7. **(Optional) Run Simulation (after optional resets):**
   These scripts interact with the simulation database and publish messages.
   *   Seed initial posts into the simulation database:
       ```bash
       pnpm sim:db:seed
       ```
   *   Run the mock publisher to send simulated events to RabbitMQ:
       ```bash
       pnpm sim:publish
       ```

### Monitoring

- **RabbitMQ Management:** Access the RabbitMQ Management UI (usually at `http://localhost:15672` with default credentials `guest`/`guest`).
- **Neo4j:** Neo4j Browser at `http://localhost:7474`
- **Postgres:** Connect using a tool like TablePlus or DBeaver.

## Environment Variables

### Core
- `NODE_ENV`: Application environment (`development`, `production`, etc.)

### OpenAI
- `OPENAI_API_KEY`: Your OpenAI API key.

### Postgres (Drizzle)
- `POSTGRES_URL`: Full database connection URL.
- `PG_HOST`: Hostname
- `PG_PORT`: Port
- `PG_USER`: Username
- `PG_PASSWORD`: Password
- `PG_DATABASE`: Database name

### RabbitMQ
- `RABBITMQ_URL`: RabbitMQ connection URL (e.g., `amqp://guest:guest@localhost:5672`)

### Neo4j
- `NEO4J_URI`: Neo4j connection URI (e.g., `neo4j://localhost:7687`)
- `NEO4J_USERNAME`: Neo4j username
- `NEO4J_PASSWORD`: Neo4j password

## Next Steps (Planned)
- [ ] User authentication
- [ ] Post creation and interaction UI
- [ ] Tag-based post recommendations
- [ ] Advanced graph visualizations
- [ ] API endpoints for post management

## Viewer App

A React-based viewer application is included to visualize posts and their tags. To use it:

1. Run the tagging system test cycle:
   ```
   pnpm test:cycle
   ```

2. Start the API server:
   ```
   pnpm viewer:server
   ```

3. In a separate terminal, start the React app:
   ```
   pnpm viewer
   ```

4. Open a browser and navigate to `http://localhost:3000`

The viewer displays posts from the mock data and shows the tags generated by OpenAI that are stored in Neo4j.