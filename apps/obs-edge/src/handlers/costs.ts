/**
 * /costs Handler
 * Returns cost summary for a project
 */

import { Context } from 'hono';
import type { Env } from '../index';
import { getSupabaseClient, getCostSummary } from '../utils/supabase';

export async function costsHandler(c: Context<{ Bindings: Env }>) {
  try {
    const projectId = c.req.query('project_id');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    // Validate required parameters
    if (!projectId) {
      return c.json({ error: 'Missing project_id parameter' }, 400);
    }

    // Default to last 30 days if not specified
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return c.json({ error: 'Invalid date format' }, 400);
    }

    // Get cost summary from Supabase
    const supabase = getSupabaseClient(c.env);
    const costSummary = await getCostSummary(
      supabase,
      projectId,
      start.toISOString(),
      end.toISOString()
    );

    return c.json({
      project_id: projectId,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      summary: costSummary,
    });
  } catch (error: any) {
    console.error('Costs error:', error);
    return c.json({
      error: 'Failed to fetch costs',
      message: error.message,
    }, 500);
  }
}
