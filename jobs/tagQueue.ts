import { Queue } from 'bullmq';
import { redis } from '../lib/redis';

export const tagQueue = new Queue('tag-post', {
  connection: redis
}); 