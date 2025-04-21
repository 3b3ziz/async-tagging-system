import { Redis } from 'ioredis';

// Configure Redis with BullMQ-compatible options
export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    if (times > 3) {
      return null; // stop retrying after 3 attempts
    }
    return Math.min(times * 100, 3000); // exponential backoff
  }
}); 