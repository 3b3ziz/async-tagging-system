import { z } from 'zod';

// Common fields that might be shared between message types
const baseMessageSchema = z.object({
  postId: z.string(),
  createdAt: z.string().datetime({ offset: true }), // ISO date with timezone
});

// Schema for post.created messages
export const PostCreatedMessageSchema = baseMessageSchema.extend({
  userId: z.string(),
  text: z.string().min(1),
  metadata: z.object({
    language: z.string().optional(),
    source: z.string().optional(),
  }).optional(),
});

// Schema for post.interacted messages
export const PostInteractedMessageSchema = baseMessageSchema.extend({
  userId: z.string(),
  interactionType: z.enum(['like', 'view', 'share', 'comment']),
});

// Type inferred from the schema
export type PostCreatedMessage = z.infer<typeof PostCreatedMessageSchema>;
export type PostInteractedMessage = z.infer<typeof PostInteractedMessageSchema>;

// Validation function for post.created messages
export function validatePostCreatedMessage(jsonData: string): PostCreatedMessage | null {
  console.log('[validatePostCreatedMessage] Received data (type):', typeof jsonData);
  console.log('[validatePostCreatedMessage] Received data (start):', jsonData.substring(0, 100));
  try {
    const parsedData = JSON.parse(jsonData); 
    // Add diagnostic log here:
    console.log('[validatePostCreatedMessage] Parsed data type:', typeof parsedData);
    console.log('[validatePostCreatedMessage] Attempting to validate with Zod...');
    const result = PostCreatedMessageSchema.parse(parsedData);
    console.log('[validatePostCreatedMessage] Zod validation successful.');
    return result;
  } catch (error: any) {
    console.error('Post Created Message Validation Error:', {
        error: error instanceof z.ZodError ? error.flatten() : error.message,
        receivedData: jsonData
    });
    // Also log if the error came from JSON.parse vs Zod
    if (!(error instanceof z.ZodError)) {
        console.error('[validatePostCreatedMessage] Error likely occurred during JSON.parse.');
    }
    return null;
  }
}

// Validation function for post.interacted messages
export function validatePostInteractedMessage(jsonData: string): PostInteractedMessage | null {
  try {
    const parsedData = JSON.parse(jsonData); // Parse the JSON string first
    return PostInteractedMessageSchema.parse(parsedData);
  } catch (error: any) {
    console.error('Post Interacted Message Validation Error:', {
        error: error instanceof z.ZodError ? error.flatten() : error.message,
        receivedData: jsonData // Log the original string data for debugging
    });
    return null;
  }
} 