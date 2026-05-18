import { z } from 'zod';
import type { CloudflareBindings } from '../types';

const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';

type AiMessage = { role: 'system' | 'user' | 'assistant'; content: string };

function extractResponseText(response: unknown): string {
  if (typeof response === 'string') return response;
  if (response && typeof response === 'object') {
    const r = response as Record<string, unknown>;
    if (typeof r.response === 'string') return r.response;
    const choice = (r.choices as Array<{ message?: { content?: string } }>)?.[0];
    if (choice?.message?.content) return choice.message.content;
  }
  return JSON.stringify(response);
}

export function getLlmModel(env: Pick<CloudflareBindings, 'ANALYSIS_LLM_MODEL'>) {
  return env.ANALYSIS_LLM_MODEL || '@cf/meta/llama-3.1-8b-instruct-fp8-fast';
}

export async function runJsonCompletion<T>(
  env: Pick<CloudflareBindings, 'AI' | 'ANALYSIS_LLM_MODEL'>,
  messages: AiMessage[],
  schema: z.ZodType<T>,
  schemaName: string,
): Promise<T> {
  const model = getLlmModel(env);
  const jsonSchema = z.toJSONSchema(schema, { target: 'draft-7' });

  const response = await env.AI.run(model, {
    messages,
    max_tokens: 4096,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: schemaName,
        schema: jsonSchema,
      },
    },
  });

  const raw = extractResponseText(response);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('LLM did not return valid JSON');
    parsed = JSON.parse(match[0]);
  }

  const result = schema.safeParse(parsed);
  if (result.success) return result.data;

  const repair = await env.AI.run(model, {
    messages: [
      {
        role: 'system',
        content:
          'Fix the JSON to match the required schema. Return JSON only, no markdown.',
      },
      {
        role: 'user',
        content: `Invalid JSON:\n${raw}\n\nErrors:\n${result.error.message}`,
      },
    ],
    max_tokens: 4096,
    response_format: {
      type: 'json_schema',
      json_schema: { name: schemaName, schema: jsonSchema },
    },
  });

  const repaired = JSON.parse(extractResponseText(repair));
  const repairedResult = schema.safeParse(repaired);
  if (!repairedResult.success) {
    throw new Error(`LLM JSON validation failed: ${repairedResult.error.message}`);
  }
  return repairedResult.data;
}

export async function embedTexts(
  env: Pick<CloudflareBindings, 'AI'>,
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const response = await env.AI.run(EMBEDDING_MODEL, { text: texts });
  const data = response as { data?: number[][]; shape?: number[] };
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(response)) return response as number[][];
  throw new Error('Unexpected embedding response shape');
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
