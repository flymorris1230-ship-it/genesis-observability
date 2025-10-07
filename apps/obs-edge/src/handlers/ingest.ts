/**
 * /ingest Handler
 * Receives and stores LLM usage data
 */

import { Context } from 'hono';
import type { Env } from '../index';
import { getSupabaseClient, insertLLMUsage, LLMUsageData } from '../utils/supabase';

interface IngestRequest {
  project_id: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd?: number;
  latency_ms?: number;
  metadata?: Record<string, any>;
}

export async function ingestHandler(c: Context<{ Bindings: Env }>) {
  try {
    const body: IngestRequest = await c.req.json();

    // Validate required fields
    if (!body.project_id || !body.model || !body.provider) {
      return c.json({
        error: 'Missing required fields: project_id, model, provider',
      }, 400);
    }

    if (typeof body.input_tokens !== 'number' || typeof body.output_tokens !== 'number') {
      return c.json({
        error: 'input_tokens and output_tokens must be numbers',
      }, 400);
    }

    // Calculate total tokens
    const total_tokens = body.input_tokens + body.output_tokens;

    // Estimate cost if not provided (rough estimates)
    let cost_usd = body.cost_usd || 0;
    if (!cost_usd) {
      // Simple cost estimation (adjust based on actual pricing)
      const costPerMToken = getCostPerMToken(body.provider, body.model);
      cost_usd = (total_tokens / 1_000_000) * costPerMToken;
    }

    // Prepare data for insertion
    const usageData: LLMUsageData = {
      project_id: body.project_id,
      model: body.model,
      provider: body.provider,
      input_tokens: body.input_tokens,
      output_tokens: body.output_tokens,
      total_tokens,
      cost_usd: Math.round(cost_usd * 10000) / 10000, // 4 decimal places
      latency_ms: body.latency_ms || 0,
      timestamp: new Date().toISOString(),
      metadata: body.metadata || {},
    };

    // Insert into Supabase
    const supabase = getSupabaseClient(c.env);
    const result = await insertLLMUsage(supabase, usageData);

    if (!result.success) {
      return c.json({
        error: 'Failed to insert data',
        message: result.error,
      }, 500);
    }

    return c.json({
      success: true,
      id: result.id,
      tokens: total_tokens,
      cost_usd: usageData.cost_usd,
    }, 201);
  } catch (error: any) {
    console.error('Ingest error:', error);
    return c.json({
      error: 'Invalid request',
      message: error.message,
    }, 400);
  }
}

/**
 * Get estimated cost per million tokens
 */
function getCostPerMToken(provider: string, model: string): number {
  const pricing: Record<string, Record<string, number>> = {
    openai: {
      'gpt-4': 30,
      'gpt-4-turbo': 10,
      'gpt-3.5-turbo': 1,
    },
    anthropic: {
      'claude-3-opus': 15,
      'claude-3-sonnet': 3,
      'claude-3-haiku': 0.25,
    },
    google: {
      'gemini-pro': 0.5,
      'gemini-pro-vision': 1,
    },
  };

  return pricing[provider]?.[model] || 1; // Default to $1/M tokens
}
