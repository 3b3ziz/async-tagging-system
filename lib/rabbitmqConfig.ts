/**
 * Centralized RabbitMQ configuration values.
 * This file follows the "Refactor by Domain" principle by isolating all RabbitMQ
 * configuration in one place, making it easier to maintain and update.
 */

// Main exchange settings
export const EXCHANGE = {
  NAME: 'app_events',
  TYPE: 'topic',
  OPTIONS: { durable: true },
};

// Queue configurations
export const QUEUES = {
  POST_CREATED: {
    NAME: 'post_created_queue',
    ROUTING_KEY: 'post.created',
    OPTIONS: { 
      durable: true,
      // Could add dead letter settings here in the future:
      // deadLetterExchange: 'dlx.app_events',
      // deadLetterRoutingKey: 'dl.post.created'
    },
    PREFETCH: 1, // Process one message at a time
  },
  POST_INTERACTED: {
    NAME: 'post_interacted_queue',
    ROUTING_KEY: 'post.interacted',
    OPTIONS: { 
      durable: true, 
      // Could add dead letter settings here in the future:
      // deadLetterExchange: 'dlx.app_events', 
      // deadLetterRoutingKey: 'dl.post.interacted'
    },
    PREFETCH: 5, // Process up to 5 interaction messages concurrently
  },
};

// Publisher options
export const PUBLISHER_OPTIONS = {
  DEFAULT: {
    persistent: true,
    contentType: 'application/json',
  },
};

// Consumer options
export const CONSUMER_OPTIONS = {
  DEFAULT: {
    noAck: false, // Use manual acknowledgments
  },
}; 