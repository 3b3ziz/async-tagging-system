# Simulation Logic Refactoring Tasks

## Overview
This document outlines the tasks required to refactor the project structure by isolating the social media platform simulation logic (Postgres database, seeding, mock publisher) into a dedicated `simulation/` directory. The goal is to decouple the core tagging service (RabbitMQ consumers, OpenAI/Neo4j logic) from the simulation code, allowing the core service to function independently and receive messages from any compliant source.

## Tasks

- [x] **Create Directory Structure:**
    - [x] Create a new top-level directory named `simulation`.

- [x] **Move Simulation Components:**
    - [x] Move the `db/` directory to `simulation/db/`.
    - [x] Move the `drizzle/` directory to `simulation/drizzle/`.
    - [x] Move the `drizzle.config.ts` file to `simulation/drizzle.config.ts`.
    - [x] Move the `scripts/seedPosts.ts` file to `simulation/seedPosts.ts`.
    - [x] Move the `jobs/mockPublisher.ts` file to `simulation/mockPublisher.ts`.

- [x] **Refactor `postCreatedConsumer.ts`:**
    - [x] Remove imports related to Postgres (`db/client`, `db/schema`, `drizzle-orm/eq`).
    - [x] Remove the database fetch logic (`await db.select()...`).
    - [x] Update the OpenAI call to use `messageData.text` directly from the validated message, instead of `post.body`.

- [x] **Update Paths and Configuration:**
    - [x] Update `import` paths within the moved files (`simulation/db/*`, `simulation/drizzle/*`, `simulation/seedPosts.ts`, `simulation/mockPublisher.ts`) to reflect their new locations relative to other project files (e.g., `../lib/messageSchemas`).
    - [x] Update paths in `simulation/drizzle.config.ts` (e.g., `schema`, `out`).
    - [x] Check `package.json` scripts (`scripts` section) and update any paths that might reference the moved files (e.g., scripts for running seed, mock publisher, drizzle commands).
    - [x] Update `.gitignore` if necessary to ensure simulation-specific generated files (like Drizzle migrations) are ignored correctly within the `simulation/` directory.

- [x] **Update Documentation:**
    - [x] Update `README.md` to reflect the new structure. Explain the purpose of the `simulation/` directory and how to run the simulation scripts vs. the core consumers.
    - [x] Update `docs/rabbitmq-implementation-tasks.md` notes if needed, reinforcing that the consumer now relies solely on message content.

- [ ] **Testing:**
    - [ ] Run the simulation (`seedPosts`, `mockPublisher`) to ensure paths are correct and it still functions.
    - [ ] Run the core consumers (`startConsumers`) and the simulation together to ensure the end-to-end flow works with the refactored consumer. 