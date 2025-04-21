# My Tagger

A standalone post tagging and recommendation system that uses AI to automatically tag posts and builds a graph of relationships between posts, tags, and user interactions.

## Features (Milestone 1)
- Automatic post tagging using OpenAI's GPT models
- Dual database system:
  - PostgreSQL for posts and user data
  - Neo4j for tag relationships and graph queries
- Background job processing with Redis and BullMQ
- Environment-based configuration
- Database visualization support

## Tech Stack
- TypeScript
- PostgreSQL with Drizzle ORM
- Neo4j for graph database
- Redis + BullMQ for job queue
- OpenAI API for AI tagging
- Docker for local development

## Getting Started

### Prerequisites
- Node.js (v18+)
- Docker and Docker Compose
- pnpm (recommended) or npm

### Setup

1. Clone the repository
```bash
git clone <repository-url>
cd my-tagger
```

2. Install dependencies
```bash
pnpm install
```

3. Set up environment variables
```bash
cp .env.sample .env
# Edit .env with your configuration
```

4. Start the databases
```bash
docker-compose up -d
```

5. Run database migrations
```bash
pnpm drizzle-kit generate:pg
pnpm drizzle-kit push:pg
```

### Development

1. Test database connections
```bash
pnpm test:connections
```

2. Start the tagging worker
```bash
pnpm tsx jobs/worker.ts
```

### Database Visualization

1. PostgreSQL (Drizzle Studio)
```bash
npx drizzle-kit studio --port 4984
```

2. Neo4j Browser
Access http://localhost:7474 with default credentials:
- Username: neo4j
- Password: password

## Environment Variables

### PostgreSQL
- `PG_HOST`: Database host
- `PG_PORT`: Database port
- `PG_USER`: Database user
- `PG_PASSWORD`: Database password
- `PG_DATABASE`: Database name

### Redis
- `REDIS_URL`: Redis connection URL

### Neo4j
- `NEO4J_URI`: Neo4j connection URI
- `NEO4J_USER`: Neo4j username
- `NEO4J_PASS`: Neo4j password

### OpenAI
- `OPENAI_API_KEY`: Your OpenAI API key

### Application
- `NODE_ENV`: Environment (development/production)
- `PORT`: Application port

## Project Structure
```
.
├── db/                 # Database related code
│   ├── client.ts      # Database client configuration
│   └── schema.ts      # Database schema definitions
├── jobs/              # Background jobs
│   └── worker.ts      # Post tagging worker
├── lib/               # Shared utilities
│   ├── redis.ts       # Redis client
│   ├── openai.ts      # OpenAI client
│   └── schemas.ts     # Shared schemas
├── scripts/           # Utility scripts
└── docker-compose.yml # Local development services
```

## Next Steps (Planned)
- [ ] User authentication
- [ ] Post creation and interaction UI
- [ ] Tag-based post recommendations
- [ ] Advanced graph visualizations
- [ ] API endpoints for post management
