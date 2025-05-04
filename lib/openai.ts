import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { OpenAITagResponse, TagResponse } from './schemas'; // Import schemas
import 'dotenv/config';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Gets 3-5 relevant tags for a given text using OpenAI.
 * Uses structured output (Zod) for reliable parsing and validation.
 * @param text The input text to analyze.
 * @returns A promise that resolves to an array of 3-5 validated tags.
 * @throws Throws an error if OpenAI refuses, fails to parse, or validation fails.
 */
export async function getTagsFromOpenAI(text: string): Promise<string[]> {
  console.log('[OpenAI] Fetching tags for text starting with:', text.substring(0, 50) + '...');
  try {
    const completion = await openai.beta.chat.completions.parse({
      messages: [
        {
          role: 'system',
          content:
            'Extract exactly 3-5 relevant tags from the given text. Return them in lowercase snake_case format (e.g. machine_learning). Do not return more than 5 tags or fewer than 3 tags.',
        },
        { role: 'user', content: text },
      ],
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini', // Use env var or default
      response_format: zodResponseFormat(OpenAITagResponse, 'extract_tags'),
    });

    const message = completion.choices[0]?.message;

    if (!message) {
      throw new Error('[OpenAI] No message received in the completion response.');
    }

    if (message.refusal) {
      throw new Error(`[OpenAI] refused to process: ${message.refusal}`);
    }

    if (!message.parsed) {
      throw new Error('[OpenAI] Failed to parse response.');
    }

    // Validate the parsed structure and tag format again using the standalone schema
    // Although zodResponseFormat does validation, this adds an explicit check
    const validationResult = TagResponse.parse(message.parsed);
    const tags = validationResult.extract_tags;

    console.log('[OpenAI] Successfully generated tags:', tags);
    return tags;
  } catch (error: any) {
    console.error('[OpenAI] Error getting tags:', error.message);
    // Log the full error for debugging if needed
    // console.error('Full OpenAI Error:', error);
    // Rethrow the error to be handled by the caller
    throw new Error(`[OpenAI] Failed to get tags: ${error.message}`);
  }
} 