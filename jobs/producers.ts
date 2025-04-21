import { tagQueue } from './tagQueue';

export async function enqueueTag(postId: number) {
  await tagQueue.add(`tag-post-${postId}`, { postId });
} 