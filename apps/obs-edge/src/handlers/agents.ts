/**
 * /agents Handler
 * Returns AI agent execution and performance data
 */

import { Context } from 'hono';
import type { Env } from '../index';
import { getSupabaseClient } from '../utils/supabase';

/**
 * GET /agents/executions
 * Get agent execution history
 */
export async function agentExecutionsHandler(c: Context<{ Bindings: Env }>) {
  try {
    const projectId = c.req.query('project_id') || 'GAC_FactoryOS';
    const agentName = c.req.query('agent_name'); // optional filter
    const status = c.req.query('status'); // optional filter: success, failed, timeout
    const limit = parseInt(c.req.query('limit') || '100');

    const supabase = getSupabaseClient(c.env);

    let query = supabase
      .from('agent_executions')
      .select('*')
      .eq('project_id', projectId);

    if (agentName) {
      query = query.eq('agent_name', agentName);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch agent executions: ${error.message}`);
    }

    // Calculate execution statistics
    const totalExecutions = data.length;
    const successfulExecutions = data.filter(e => e.status === 'completed' && e.success).length;
    const failedExecutions = data.filter(e => e.status === 'failed' || (e.status === 'completed' && !e.success)).length;
    const cancelledExecutions = data.filter(e => e.status === 'cancelled').length;

    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    const avgDuration = data.length > 0
      ? data.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / data.length
      : 0;

    const totalTokens = data.reduce((sum, e) => sum + (e.tokens_used || 0), 0);
    const totalCost = data.reduce((sum, e) => sum + (e.cost_usd || 0), 0);

    // Group by agent name
    const agentStats = data.reduce((acc: any, execution) => {
      const name = execution.agent_name;
      if (!acc[name]) {
        acc[name] = {
          agent_name: name,
          total: 0,
          success: 0,
          failed: 0,
          cancelled: 0,
          total_tokens: 0,
          total_cost: 0,
        };
      }
      acc[name].total++;
      if (execution.status === 'completed' && execution.success) acc[name].success++;
      if (execution.status === 'failed' || (execution.status === 'completed' && !execution.success)) acc[name].failed++;
      if (execution.status === 'cancelled') acc[name].cancelled++;
      acc[name].total_tokens += execution.tokens_used || 0;
      acc[name].total_cost += execution.cost_usd || 0;
      return acc;
    }, {});

    // Calculate success rates for each agent
    Object.values(agentStats).forEach((stat: any) => {
      stat.success_rate = stat.total > 0 ? Math.round((stat.success / stat.total) * 100) : 0;
      stat.total_cost = Math.round(stat.total_cost * 1000000) / 1000000; // 6 decimal places
    });

    return c.json({
      project_id: projectId,
      summary: {
        total_executions: totalExecutions,
        successful: successfulExecutions,
        failed: failedExecutions,
        cancelled: cancelledExecutions,
        success_rate: Math.round(successRate * 10) / 10,
        avg_duration_ms: Math.round(avgDuration),
        total_tokens: totalTokens,
        total_cost_usd: Math.round(totalCost * 1000000) / 1000000,
      },
      by_agent: Object.values(agentStats),
      executions: data.map(execution => ({
        id: execution.id,
        agent_name: execution.agent_name,
        task_id: execution.task_id,
        task_type: execution.task_type,
        status: execution.status,
        success: execution.success,
        started_at: execution.started_at,
        completed_at: execution.completed_at,
        duration_ms: execution.duration_ms,
        llm_calls_count: execution.llm_calls_count,
        tokens_used: execution.tokens_used,
        cost_usd: execution.cost_usd,
        metadata: execution.metadata,
      })),
    });
  } catch (error: any) {
    console.error('Agent executions error:', error);
    return c.json({
      error: 'Failed to fetch agent executions',
      message: error.message,
    }, 500);
  }
}

/**
 * GET /agents/performance
 * Get agent performance metrics over time
 */
export async function agentPerformanceHandler(c: Context<{ Bindings: Env }>) {
  try {
    const projectId = c.req.query('project_id') || 'GAC_FactoryOS';
    const agentName = c.req.query('agent_name'); // optional filter
    const period = c.req.query('period') || 'day'; // hour, day, week, month
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    const supabase = getSupabaseClient(c.env);

    let query = supabase
      .from('agent_performance')
      .select('*')
      .eq('project_id', projectId)
      .eq('period', period);

    if (agentName) {
      query = query.eq('agent_name', agentName);
    }

    if (startDate) {
      query = query.gte('timestamp', startDate);
    }

    if (endDate) {
      query = query.lte('timestamp', endDate);
    }

    const { data, error } = await query.order('timestamp', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch agent performance: ${error.message}`);
    }

    // Calculate overall performance metrics
    const totalExecutions = data.reduce((sum, p) => sum + (p.total_executions || 0), 0);
    const avgSuccessRate = data.length > 0
      ? data.reduce((sum, p) => sum + (p.success_rate || 0), 0) / data.length
      : 0;
    const avgDuration = data.length > 0
      ? data.reduce((sum, p) => sum + (p.avg_duration_ms || 0), 0) / data.length
      : 0;
    const totalTokens = data.reduce((sum, p) => sum + (p.total_tokens || 0), 0);
    const totalCost = data.reduce((sum, p) => sum + (p.total_cost_usd || 0), 0);

    // Group by agent for summary
    const agentSummary = data.reduce((acc: any, perf) => {
      const name = perf.agent_name;
      if (!acc[name]) {
        acc[name] = {
          agent_name: name,
          total_executions: 0,
          avg_success_rate: 0,
          avg_duration_ms: 0,
          total_tokens: 0,
          total_cost_usd: 0,
          data_points: 0,
        };
      }
      acc[name].total_executions += perf.total_executions || 0;
      acc[name].avg_success_rate += perf.success_rate || 0;
      acc[name].avg_duration_ms += perf.avg_duration_ms || 0;
      acc[name].total_tokens += perf.total_tokens || 0;
      acc[name].total_cost_usd += perf.total_cost_usd || 0;
      acc[name].data_points++;
      return acc;
    }, {});

    // Calculate averages
    Object.values(agentSummary).forEach((summary: any) => {
      if (summary.data_points > 0) {
        summary.avg_success_rate = Math.round((summary.avg_success_rate / summary.data_points) * 10) / 10;
        summary.avg_duration_ms = Math.round(summary.avg_duration_ms / summary.data_points);
      }
      summary.total_cost_usd = Math.round(summary.total_cost_usd * 1000000) / 1000000;
      delete summary.data_points;
    });

    return c.json({
      project_id: projectId,
      summary: {
        total_executions: totalExecutions,
        avg_success_rate: Math.round(avgSuccessRate * 10) / 10,
        avg_duration_ms: Math.round(avgDuration),
        total_tokens: totalTokens,
        total_cost_usd: Math.round(totalCost * 1000000) / 1000000,
        data_points: data.length,
      },
      by_agent: Object.values(agentSummary),
      performance: data.map(perf => ({
        id: perf.id,
        agent_name: perf.agent_name,
        period: perf.period,
        timestamp: perf.timestamp,
        total_executions: perf.total_executions,
        successful_executions: perf.successful_executions,
        failed_executions: perf.failed_executions,
        success_rate: perf.success_rate,
        avg_duration_ms: perf.avg_duration_ms,
        total_tokens: perf.total_tokens,
        total_cost_usd: perf.total_cost_usd,
      })),
    });
  } catch (error: any) {
    console.error('Agent performance error:', error);
    return c.json({
      error: 'Failed to fetch agent performance',
      message: error.message,
    }, 500);
  }
}

/**
 * GET /agents/summary
 * Get agent performance summary
 * Falls back to configured agents if database tables don't exist
 */
export async function agentSummaryHandler(c: Context<{ Bindings: Env }>) {
  try {
    const projectId = c.req.query('project_id') || 'GAC_FactoryOS';

    const supabase = getSupabaseClient(c.env);

    // Define configured agents for GAC_FactoryOS project
    const configuredAgents = projectId === 'GAC_FactoryOS' ? [
      'BackendDeveloper',
      'Coordinator',
      'DataAnalyst',
      'DevOpsEngineer',
      'FinOpsGuardian',
      'FrontendDeveloper',
      'KnowledgeManager',
      'ProductManager',
      'QAEngineer',
      'SaaSFullStackDeveloper',
      'SecurityGuardian',
      'SolutionArchitect',
      'UIUXDesigner',
    ] : [];

    // Try to fetch from agent_registry first
    let registeredAgents: string[] = [];
    try {
      const registryResult = await supabase
        .from('agent_registry')
        .select('agent_name, current_status')
        .eq('project_id', projectId)
        .eq('is_active', true);
      
      if (!registryResult.error && registryResult.data) {
        registeredAgents = registryResult.data.map(a => a.agent_name);
      }
    } catch (err) {
      console.log('agent_registry table not found, using configured agents');
    }

    // Use registered agents if available, otherwise use configured list
    const allAgents = registeredAgents.length > 0 ? registeredAgents : configuredAgents;

    // Try to fetch executions data
    let executions: any[] = [];
    let executionsError = null;
    try {
      const executionsResult = await supabase
        .from('agent_executions')
        .select('*')
        .eq('project_id', projectId)
        .order('started_at', { ascending: false })
        .limit(100);
      
      if (!executionsResult.error) {
        executions = executionsResult.data || [];
      } else {
        executionsError = executionsResult.error.message;
      }
    } catch (err: any) {
      executionsError = err.message;
      console.log('agent_executions table not found');
    }

    // Try to fetch performance data
    let performance: any[] = [];
    try {
      const performanceResult = await supabase
        .from('agent_performance')
        .select('*')
        .eq('project_id', projectId)
        .eq('period', 'day')
        .order('timestamp', { ascending: false })
        .limit(30);
      
      if (!performanceResult.error) {
        performance = performanceResult.data || [];
      }
    } catch (err) {
      console.log('agent_performance table not found');
    }

    // Calculate quick stats from executions
    const successRate = executions.length > 0
      ? (executions.filter(e => e.status === 'completed' && e.success).length / executions.length) * 100
      : 0;

    const avgDuration = executions.length > 0
      ? executions.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / executions.length
      : 0;

    const totalCost = executions.reduce((sum, e) => sum + (e.cost_usd || 0), 0);

    // Get unique agents from executions
    const executionAgents = new Set(executions.map(e => e.agent_name));
    
    // Combine with all configured agents
    const totalAgents = allAgents.length;

    // Calculate trend from performance data (last 7 days vs previous 7 days)
    const last7Days = performance.slice(0, 7);
    const prev7Days = performance.slice(7, 14);

    const last7SuccessRate = last7Days.length > 0
      ? last7Days.reduce((sum, p) => sum + (p.success_rate || 0), 0) / last7Days.length
      : 0;

    const prev7SuccessRate = prev7Days.length > 0
      ? prev7Days.reduce((sum, p) => sum + (p.success_rate || 0), 0) / prev7Days.length
      : 0;

    const successRateTrend = prev7SuccessRate > 0
      ? ((last7SuccessRate - prev7SuccessRate) / prev7SuccessRate) * 100
      : 0;

    // Build agent list with execution stats
    const agentsList = allAgents.map(agentName => {
      const agentExecutions = executions.filter(e => e.agent_name === agentName);
      const agentSuccessRate = agentExecutions.length > 0
        ? (agentExecutions.filter(e => e.status === 'completed' && e.success).length / agentExecutions.length) * 100
        : 0;
      return {
        agent_name: agentName,
        executions: agentExecutions.length,
        success_rate: agentExecutions.length > 0 ? Math.round(agentSuccessRate) : null,
        status: agentExecutions.length > 0 ? 'active' : 'idle',
      };
    });

    return c.json({
      project_id: projectId,
      summary: {
        total_agents: totalAgents,
        recent_executions: executions.length,
        success_rate: executions.length > 0 ? Math.round(successRate * 10) / 10 : null,
        success_rate_trend: Math.round(successRateTrend * 10) / 10,
        avg_duration_ms: executions.length > 0 ? Math.round(avgDuration) : null,
        total_cost_last_100: Math.round(totalCost * 1000000) / 1000000,
      },
      agents: agentsList,
      timestamp: new Date().toISOString(),
      _meta: {
        data_source: registeredAgents.length > 0 ? 'agent_registry' : 'configured_list',
        has_executions: executions.length > 0,
        tables_available: {
          agent_registry: registeredAgents.length > 0,
          agent_executions: executionsError === null,
          agent_performance: performance.length > 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Agent summary error:', error);
    return c.json({
      error: 'Failed to fetch agent summary',
      message: error.message,
    }, 500);
  }
}
