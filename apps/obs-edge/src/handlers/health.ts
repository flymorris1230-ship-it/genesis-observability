/**
 * /health Handler
 * Returns system health monitoring data
 */

import { Context } from 'hono';
import type { Env } from '../index';
import { getSupabaseClient } from '../utils/supabase';

/**
 * GET /health/system
 * Get overall system health
 */
export async function systemHealthHandler(c: Context<{ Bindings: Env }>) {
  try {
    const projectId = c.req.query('project_id') || 'GAC_FactoryOS';

    const supabase = getSupabaseClient(c.env);

    // Fetch all health data in parallel
    const [apiResult, dbResult, integrationResult] = await Promise.all([
      supabase
        .from('api_health')
        .select('*')
        .eq('project_id', projectId)
        .order('checked_at', { ascending: false })
        .limit(100),
      supabase
        .from('database_health')
        .select('*')
        .eq('project_id', projectId)
        .order('checked_at', { ascending: false })
        .limit(10),
      supabase
        .from('integration_health')
        .select('*')
        .eq('project_id', projectId)
        .order('last_check_at', { ascending: false }),
    ]);

    if (apiResult.error) throw new Error(apiResult.error.message);
    if (dbResult.error) throw new Error(dbResult.error.message);
    if (integrationResult.error) throw new Error(integrationResult.error.message);

    const apis = apiResult.data;
    const databases = dbResult.data;
    const integrations = integrationResult.data;

    // Calculate API health summary
    const healthyApis = apis.filter(a => a.is_healthy).length;
    const totalApis = apis.length;
    const avgResponseTime = apis.length > 0
      ? apis.reduce((sum, a) => sum + (a.response_time_ms || 0), 0) / apis.length
      : 0;
    const avgSuccessRate = apis.length > 0
      ? apis.reduce((sum, a) => sum + (a.success_rate || 0), 0) / apis.length
      : 0;

    // Calculate database health summary
    const healthyDbs = databases.filter(d => d.is_healthy).length;
    const totalDbs = databases.length;

    // Calculate integration health summary
    const healthyIntegrations = integrations.filter(i => i.status === 'healthy').length;
    const totalIntegrations = integrations.length;
    const avgUptime = integrations.length > 0
      ? integrations.reduce((sum, i) => sum + (i.uptime_percentage || 0), 0) / integrations.length
      : 0;

    // Determine overall health status
    const overallHealthy = (
      (totalApis === 0 || healthyApis / totalApis >= 0.8) &&
      (totalDbs === 0 || healthyDbs / totalDbs >= 0.8) &&
      (totalIntegrations === 0 || healthyIntegrations / totalIntegrations >= 0.8)
    );

    return c.json({
      project_id: projectId,
      overall_status: overallHealthy ? 'healthy' : 'degraded',
      summary: {
        api: {
          healthy: healthyApis,
          total: totalApis,
          health_rate: totalApis > 0 ? Math.round((healthyApis / totalApis) * 100) : 100,
          avg_response_time_ms: Math.round(avgResponseTime),
          avg_success_rate: Math.round(avgSuccessRate * 100) / 100,
        },
        database: {
          healthy: healthyDbs,
          total: totalDbs,
          health_rate: totalDbs > 0 ? Math.round((healthyDbs / totalDbs) * 100) : 100,
        },
        integrations: {
          healthy: healthyIntegrations,
          total: totalIntegrations,
          health_rate: totalIntegrations > 0 ? Math.round((healthyIntegrations / totalIntegrations) * 100) : 100,
          avg_uptime: Math.round(avgUptime * 100) / 100,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('System health error:', error);
    return c.json({
      error: 'Failed to fetch system health',
      message: error.message,
    }, 500);
  }
}

/**
 * GET /health/api
 * Get API endpoint health details
 */
export async function apiHealthHandler(c: Context<{ Bindings: Env }>) {
  try {
    const projectId = c.req.query('project_id') || 'GAC_FactoryOS';
    const endpoint = c.req.query('endpoint'); // optional filter
    const limit = parseInt(c.req.query('limit') || '50');

    const supabase = getSupabaseClient(c.env);

    let query = supabase
      .from('api_health')
      .select('*')
      .eq('project_id', projectId);

    if (endpoint) {
      query = query.eq('endpoint', endpoint);
    }

    const { data, error } = await query
      .order('checked_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch API health: ${error.message}`);
    }

    // Group by endpoint and calculate stats
    const endpointStats = data.reduce((acc: any, record) => {
      const key = `${record.method} ${record.endpoint}`;
      if (!acc[key]) {
        acc[key] = {
          endpoint: record.endpoint,
          method: record.method,
          checks: [],
          healthy_count: 0,
          total_count: 0,
          avg_response_time: 0,
          success_rate: 0,
        };
      }
      acc[key].checks.push(record);
      acc[key].total_count++;
      if (record.is_healthy) acc[key].healthy_count++;
      return acc;
    }, {});

    // Calculate averages
    Object.values(endpointStats).forEach((stat: any) => {
      const checks = stat.checks;
      stat.avg_response_time = Math.round(
        checks.reduce((sum: number, c: any) => sum + (c.response_time_ms || 0), 0) / checks.length
      );
      stat.success_rate = Math.round((stat.healthy_count / stat.total_count) * 100);
      stat.last_check = checks[0].checked_at;
      delete stat.checks; // Remove raw data
    });

    return c.json({
      project_id: projectId,
      endpoints: Object.values(endpointStats),
      total_checks: data.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('API health error:', error);
    return c.json({
      error: 'Failed to fetch API health',
      message: error.message,
    }, 500);
  }
}

/**
 * GET /health/database
 * Get database health details
 */
export async function databaseHealthHandler(c: Context<{ Bindings: Env }>) {
  try {
    const projectId = c.req.query('project_id') || 'GAC_FactoryOS';
    const limit = parseInt(c.req.query('limit') || '20');

    const supabase = getSupabaseClient(c.env);

    const { data, error } = await supabase
      .from('database_health')
      .select('*')
      .eq('project_id', projectId)
      .order('checked_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch database health: ${error.message}`);
    }

    // Calculate statistics
    const healthyChecks = data.filter(d => d.is_healthy).length;
    const avgConnections = data.length > 0
      ? data.reduce((sum, d) => sum + (d.active_connections || 0), 0) / data.length
      : 0;
    const avgSlowQueries = data.length > 0
      ? data.reduce((sum, d) => sum + (d.slow_queries || 0), 0) / data.length
      : 0;

    return c.json({
      project_id: projectId,
      summary: {
        total_checks: data.length,
        healthy_checks: healthyChecks,
        health_rate: data.length > 0 ? Math.round((healthyChecks / data.length) * 100) : 100,
        avg_active_connections: Math.round(avgConnections),
        avg_slow_queries: Math.round(avgSlowQueries * 10) / 10,
      },
      checks: data.map(db => ({
        id: db.id,
        database_name: db.database_name,
        connection_pool_size: db.connection_pool_size,
        active_connections: db.active_connections,
        slow_queries: db.slow_queries,
        disk_usage_gb: db.disk_usage_gb,
        is_healthy: db.is_healthy,
        checked_at: db.checked_at,
        metadata: db.metadata,
      })),
    });
  } catch (error: any) {
    console.error('Database health error:', error);
    return c.json({
      error: 'Failed to fetch database health',
      message: error.message,
    }, 500);
  }
}

/**
 * GET /health/integrations
 * Get integration health details
 */
export async function integrationsHealthHandler(c: Context<{ Bindings: Env }>) {
  try {
    const projectId = c.req.query('project_id') || 'GAC_FactoryOS';
    const status = c.req.query('status'); // optional filter: healthy, degraded, down

    const supabase = getSupabaseClient(c.env);

    let query = supabase
      .from('integration_health')
      .select('*')
      .eq('project_id', projectId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('last_check_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch integration health: ${error.message}`);
    }

    // Calculate statistics
    const statusCounts = {
      healthy: data.filter(i => i.status === 'healthy').length,
      degraded: data.filter(i => i.status === 'degraded').length,
      down: data.filter(i => i.status === 'down').length,
    };

    const avgUptime = data.length > 0
      ? data.reduce((sum, i) => sum + (i.uptime_percentage || 0), 0) / data.length
      : 0;

    return c.json({
      project_id: projectId,
      summary: {
        total_integrations: data.length,
        by_status: statusCounts,
        avg_uptime: Math.round(avgUptime * 100) / 100,
      },
      integrations: data.map(integration => ({
        id: integration.id,
        integration_name: integration.integration_name,
        integration_type: integration.integration_type,
        status: integration.status,
        uptime_percentage: integration.uptime_percentage,
        last_error: integration.last_error,
        last_check_at: integration.last_check_at,
        metadata: integration.metadata,
      })),
    });
  } catch (error: any) {
    console.error('Integration health error:', error);
    return c.json({
      error: 'Failed to fetch integration health',
      message: error.message,
    }, 500);
  }
}
