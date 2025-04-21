import { z } from 'zod';

// Validate that a string is in snake_case format
const snakeCase = z.string().regex(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/, 'Must be snake_case');

// Schema for OpenAI response validation
export const OpenAITagResponse = z.object({
  extract_tags: z.array(z.string())
});

// Schema for post-processing validation
export const TagResponse = z.object({
  extract_tags: z.array(snakeCase)
}); 