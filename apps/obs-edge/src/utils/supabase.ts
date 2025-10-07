/**
 * Supabase Client Utility
 * Creates Supabase client with service key for Worker
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../index';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(env: Env): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseClient;
}

/**
 * LLM Usage Data Interface
 */
export interface LLMUsageData {
  project_id: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  latency_ms: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Insert LLM usage data into Supabase
 */
export async function insertLLMUsage(
  supabase: SupabaseClient,
  data: LLMUsageData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data: result, error } = await supabase
      .from('llm_usage')
      .insert(data)
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: result.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get metrics for a project and time range
 */
export async function getMetrics(
  supabase: SupabaseClient,
  projectId: string,
  startDate: string,
  endDate: string
): Promise<any> {
  const { data, error } = await supabase
    .from('llm_usage')
    .select('*')
    .eq('project_id', projectId)
    .gte('timestamp', startDate)
    .lte('timestamp', endDate)
    .order('timestamp', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch metrics: ${error.message}`);
  }

  // Aggregate metrics
  const totalTokens = data.reduce((sum, row) => sum + row.total_tokens, 0);
  const totalCost = data.reduce((sum, row) => sum + row.cost_usd, 0);
  const avgLatency = data.length > 0
    ? data.reduce((sum, row) => sum + row.latency_ms, 0) / data.length
    : 0;

  const modelBreakdown = data.reduce((acc: any, row) => {
    if (!acc[row.model]) {
      acc[row.model] = { count: 0, tokens: 0, cost: 0 };
    }
    acc[row.model].count += 1;
    acc[row.model].tokens += row.total_tokens;
    acc[row.model].cost += row.cost_usd;
    return acc;
  }, {});

  return {
    totalRequests: data.length,
    totalTokens,
    totalCost: Math.round(totalCost * 100) / 100,
    avgLatency: Math.round(avgLatency),
    modelBreakdown,
    dataPoints: data.map(row => ({
      timestamp: row.timestamp,
      tokens: row.total_tokens,
      cost: row.cost_usd,
      latency: row.latency_ms,
    })),
  };
}

/**
 * Get cost summary for a project and time range
 */
export async function getCostSummary(
  supabase: SupabaseClient,
  projectId: string,
  startDate: string,
  endDate: string
): Promise<any> {
  const { data, error } = await supabase
    .from('llm_usage')
    .select('timestamp, cost_usd, model, provider')
    .eq('project_id', projectId)
    .gte('timestamp', startDate)
    .lte('timestamp', endDate)
    .order('timestamp', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch cost summary: ${error.message}`);
  }

  const totalCost = data.reduce((sum, row) => sum + row.cost_usd, 0);

  // Group by day
  const dailyCosts: Record<string, number> = {};
  data.forEach(row => {
    const date = row.timestamp.split('T')[0];
    dailyCosts[date] = (dailyCosts[date] || 0) + row.cost_usd;
  });

  // Group by provider
  const providerCosts: Record<string, number> = {};
  data.forEach(row => {
    providerCosts[row.provider] = (providerCosts[row.provider] || 0) + row.cost_usd;
  });

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    dailyCosts: Object.entries(dailyCosts).map(([date, cost]) => ({
      date,
      cost: Math.round(cost * 100) / 100,
    })),
    providerCosts: Object.entries(providerCosts).map(([provider, cost]) => ({
      provider,
      cost: Math.round(cost * 100) / 100,
    })),
  };
}
