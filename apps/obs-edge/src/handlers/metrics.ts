/**
 * /metrics Handler
 * Returns aggregated metrics for a project
 */

import { Context } from 'hono';
import type { Env } from '../index';
import { getSupabaseClient, getMetrics } from '../utils/supabase';

export async function metricsHandler(c: Context<{ Bindings: Env }>) {
  try {
    const projectId = c.req.query('project_id');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    // Validate required parameters
    if (!projectId) {
      return c.json({ error: 'Missing project_id parameter' }, 400);
    }

    // Default to last 7 days if not specified
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return c.json({ error: 'Invalid date format' }, 400);
    }

    // Get metrics from Supabase
    const supabase = getSupabaseClient(c.env);
    const metrics = await getMetrics(
      supabase,
      projectId,
      start.toISOString(),
      end.toISOString()
    );

    return c.json({
      project_id: projectId,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      metrics,
    });
  } catch (error: any) {
    console.error('Metrics error:', error);
    return c.json({
      error: 'Failed to fetch metrics',
      message: error.message,
    }, 500);
  }
}
