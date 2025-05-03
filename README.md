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
├── db/                  # Database migrations and seeds
│   ├── drizzle/         # Drizzle ORM migration files
│   │   └── meta/
│   └── schema.ts        # Database schema definitions
├── jobs/                # Background job processing
│   ├── consumers/       # RabbitMQ consumers (to be added)
│   ├── producers.ts     # Job producers (e.g., for seeding)
│   ├── rabbitmqClient.ts # RabbitMQ client setup (to be added)
│   └── mockPublisher.ts # Mock message publisher (to be added)
├── lib/                 # Core libraries/utilities
│   ├── neo4j.ts         # Neo4j driver setup
│   ├── openai.ts        # OpenAI client setup
│   └── schemas.ts     # Shared Zod schemas
├── scripts/             # Utility scripts
│   ├── seedPosts.ts     # Seed initial post data
│   └── test-connections.ts # Test external service connections
├── .editorconfig
├── .env.sample          # Environment variable template
├── .env                 # Local environment variables (ignored by git)
├── .gitignore
├── docker-compose.yml   # Docker services (Postgres, Neo4j, RabbitMQ)
├── drizzle.config.ts    # Drizzle ORM configuration
├── package.json
├── pnpm-lock.yaml
├── README.md            # This file
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- pnpm
- Docker & Docker Compose
- OpenAI API Key

### Running Locally

1.  **Setup Environment:**
    Copy `.env.sample` to `.env` and fill in your credentials (especially `OPENAI_API_KEY`, `NEO4J_URI`, `POSTGRES_URL`).

2.  **Install Dependencies:**
    ```bash
    pnpm install
    ```

3.  **Start Services:**
    ```bash
    docker-compose up -d # Starts postgres, neo4j, rabbitmq
    ```

4. **Start the Consumer Service:**
   ```bash
   pnpm tsx jobs/startConsumers.ts
   ```

5. **(Optional) Seed Data & Mock Events:**
   *   Seed initial posts:
       ```bash
       pnpm tsx scripts/seedPosts.ts
       ```
   *   Run the mock publisher to send events to RabbitMQ:
       ```bash
       pnpm tsx jobs/mockPublisher.ts
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