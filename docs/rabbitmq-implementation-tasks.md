# RabbitMQ Implementation Tasks

## Overview
This document outlines the implementation tasks for our RabbitMQ-based messaging architecture. We've chosen a direct routing model (using a topic exchange for now) with complete post content in messages to maintain a decoupled, efficient tagging service.

## 1. Direct Routing Implementation Tasks (Using Topic Exchange)

- [x] Use a topic exchange named `app_events` (acting as direct routing for now)
- [x] Set up a dedicated queue `post.created` bound to `app_events` with routing key `post.created`
- [x] Set up a dedicated queue `post.interacted` bound to `app_events` with routing key `post.interacted`
- [x] Configure the queues to be durable to prevent message loss during restarts
- [x] Ensure proper message routing using the routing keys (`post.created`, `post.interacted`)
- [x] Implement consumers for the tagger service (`postCreatedConsumer`, `postInteractedConsumer`)
- [ ] Add appropriate error handling and dead-letter queue configuration for robust failure management

## 2. Message Content Implementation Tasks

- [x] Define message structure to include complete post content:
  ```typescript
  // For post.created
  interface PostCreatedMessage {
    postId: string;
    userId: string; // Identifier for the user who created the post
    text: string;   // The actual content of the post
    createdAt: string; // ISO timestamp of creation
    metadata?: Record<string, any>; // Optional additional context
  }

  // For post.interacted (Example)
  interface PostInteractedMessage {
      postId: string;
      userId: string;
      interactionType: string; // e.g., 'like', 'view'
      createdAt: string; // ISO date format
  }
  ```
  *(Note: `postCreatedConsumer` now relies on `text` directly. Publishers like `mockPublisher` and `seedPosts` have been updated to include this.)*
- [ ] Ensure message size limits are considered (RabbitMQ defaults are high, but keep messages lean)
- [ ] Implement message validation schema on both publisher and consumer sides (e.g., using Zod)
- [x] Add appropriate content-type headers (`application/json`)

## 3. Consumer Implementation Tasks

- [x] Create consumers that process messages relatively statelessly (dependencies injected)
- [x] Implement proper acknowledgment patterns (ack on success, nack on failure/error)
- [x] Set up prefetch count to control concurrency (`prefetch=1` currently set)
- [x] Add graceful shutdown handling for clean connection termination
- [ ] Implement robust error handling with appropriate retry policy (beyond simple nack)
- [ ] Set up structured logging for message processing events (received, completed, failed, retried)

## 4. Publisher Implementation Tasks (For Production Publisher)

- [ ] Create a publisher service with connection pooling/management
- [ ] Implement publisher confirms to ensure message delivery guarantees
- [ ] Add circuit breaker pattern for RabbitMQ connection failures
- [ ] Set up retry logic for failed publish attempts
- [ ] Implement proper connection management (reuse connections where possible)

## 5. Monitoring and Operational Tasks

- [ ] Set up basic monitoring for queue depth and message rates (e.g., via RabbitMQ Management UI or Prometheus exporter)
- [ ] Configure alerting for queue build-up or persistent consumer failures
- [ ] Create operational documentation for common RabbitMQ management tasks (purging queues, inspecting messages)
- [ ] Implement health checks for RabbitMQ connection status within the service
- [ ] Set up structured logging for connection events (connected, disconnected, reconnected)

## 6. Testing Tasks

- [ ] Create unit tests for message serialization/deserialization and validation logic
- [ ] Implement integration tests using test queues/exchanges (e.g., using Testcontainers)
- [ ] Create end-to-end tests for the complete message flow (publisher -> exchange -> queue -> consumer -> side effects)
- [ ] Set up test doubles/mocks for RabbitMQ in CI/CD pipeline unit/integration tests
- [ ] Create load tests to verify system behavior under high message volumes

## Architecture Notes

### Why Direct Routing Behavior (Using Topic Exchange)?
We're currently using a topic exchange (`app_events`) but binding specific queues with exact routing keys (`post.created`, `post.interacted`), effectively achieving direct routing behavior because:
- Only specific services (our tagger consumers) need to process these distinct message types currently.
- It keeps the initial setup simpler than managing complex routing patterns.
- We retain the flexibility of the topic exchange to easily add pattern-based subscriptions or fanout behavior later if other services need to react to these (or related) events, without changing the exchange type.

### Why Include Necessary Content?
We're including the necessary identifiers (like `postId`) in messages because:
- It decouples the tagger service from needing direct synchronous access to the main application's database *during initial event reception*.
- It makes the worker relatively stateless regarding the *triggering* event.
- It improves fault tolerance (worker can queue and process later even if the main DB had temporary issues *at the time of publishing*).
- It avoids building complex APIs solely for the worker to fetch initial data immediately upon receiving a message. *(Note: Our current consumer *does* fetch data, but the principle holds - the *trigger* itself is self-contained).*

### Message Design Principles
Our messages should follow these principles:
- Include all data *identifiers* needed for the consumer to fetch the necessary context (e.g., `postId`).
- Include event-specific metadata useful for processing, debugging, and analytics (e.g., `interactionType`, `createdAt`).
- Avoid unnecessary coupling to the publisher's internal data structures.
- Keep messages well-structured, versioned (implicitly or explicitly), and validated. 