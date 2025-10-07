/**
 * /progress Handler
 * Returns project progress tracking data
 */

import { Context } from 'hono';
import type { Env } from '../index';
import { getSupabaseClient } from '../utils/supabase';

/**
 * GET /progress/modules
 * Get module progress for a project
 */
export async function modulesProgressHandler(c: Context<{ Bindings: Env }>) {
  try {
    const projectId = c.req.query('project_id') || 'GAC_FactoryOS';

    const supabase = getSupabaseClient(c.env);
    const { data, error } = await supabase
      .from('module_progress')
      .select('*')
      .eq('project_id', projectId)
      .order('module', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch module progress: ${error.message}`);
    }

    // Calculate overall progress
    const totalModules = data.length;
    const completedModules = data.filter(m => m.status === 'completed').length;
    const avgProgress = data.length > 0
      ? data.reduce((sum, m) => sum + m.progress_percentage, 0) / data.length
      : 0;

    const totalFeatures = data.reduce((sum, m) => sum + m.features_total, 0);
    const completedFeatures = data.reduce((sum, m) => sum + m.features_completed, 0);
    const inProgressFeatures = data.reduce((sum, m) => sum + m.features_in_progress, 0);
    const blockedFeatures = data.reduce((sum, m) => sum + m.features_blocked, 0);

    return c.json({
      project_id: projectId,
      summary: {
        total_modules: totalModules,
        completed_modules: completedModules,
        avg_progress: Math.round(avgProgress),
        total_features: totalFeatures,
        completed_features: completedFeatures,
        in_progress_features: inProgressFeatures,
        blocked_features: blockedFeatures,
      },
      modules: data.map(module => ({
        id: module.id,
        module: module.module,
        version: module.version,
        status: module.status,
        progress_percentage: module.progress_percentage,
        features: {
          total: module.features_total,
          completed: module.features_completed,
          in_progress: module.features_in_progress,
          blocked: module.features_blocked,
        },
        last_updated: module.last_updated,
        metadata: module.metadata,
      })),
    });
  } catch (error: any) {
    console.error('Module progress error:', error);
    return c.json({
      error: 'Failed to fetch module progress',
      message: error.message,
    }, 500);
  }
}

/**
 * GET /progress/sprint
 * Get sprint progress for a project
 */
export async function sprintProgressHandler(c: Context<{ Bindings: Env }>) {
  try {
    const projectId = c.req.query('project_id') || 'GAC_FactoryOS';
    const status = c.req.query('status'); // optional filter: active, completed, etc.

    const supabase = getSupabaseClient(c.env);

    let query = supabase
      .from('sprint_progress')
      .select('*')
      .eq('project_id', projectId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error} = await query.order('started_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch sprint progress: ${error.message}`);
    }

    // Calculate sprint statistics
    const activeSprints = data.filter(s => s.status === 'active').length;
    const completedSprints = data.filter(s => s.status === 'completed').length;
    const totalVelocity = data
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + (s.velocity || 0), 0);
    const avgVelocity = completedSprints > 0 ? totalVelocity / completedSprints : 0;

    return c.json({
      project_id: projectId,
      summary: {
        total_sprints: data.length,
        active_sprints: activeSprints,
        completed_sprints: completedSprints,
        avg_velocity: Math.round(avgVelocity * 10) / 10,
      },
      sprints: data.map(sprint => ({
        id: sprint.id,
        sprint_day: sprint.sprint_day,
        sprint_name: sprint.sprint_name,
        status: sprint.status,
        started_at: sprint.started_at,
        ended_at: sprint.ended_at,
        completed_tasks: sprint.completed_tasks,
        total_tasks: sprint.total_tasks,
        velocity: sprint.velocity,
        goals: sprint.goals,
        metadata: sprint.metadata,
      })),
    });
  } catch (error: any) {
    console.error('Sprint progress error:', error);
    return c.json({
      error: 'Failed to fetch sprint progress',
      message: error.message,
    }, 500);
  }
}

/**
 * GET /progress/tasks
 * Get task progress for a project
 */
export async function tasksProgressHandler(c: Context<{ Bindings: Env }>) {
  try {
    const projectId = c.req.query('project_id') || 'GAC_FactoryOS';
    const status = c.req.query('status'); // optional filter
    const priority = c.req.query('priority'); // optional filter
    const assignedTo = c.req.query('assigned_to'); // optional filter

    const supabase = getSupabaseClient(c.env);

    let query = supabase
      .from('task_progress')
      .select('*')
      .eq('project_id', projectId);

    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch task progress: ${error.message}`);
    }

    // Calculate task statistics
    const statusCounts = {
      todo: data.filter(t => t.status === 'todo').length,
      in_progress: data.filter(t => t.status === 'in_progress').length,
      review: data.filter(t => t.status === 'review').length,
      done: data.filter(t => t.status === 'done').length,
      blocked: data.filter(t => t.status === 'blocked').length,
    };

    const priorityCounts = {
      critical: data.filter(t => t.priority === 'critical').length,
      high: data.filter(t => t.priority === 'high').length,
      medium: data.filter(t => t.priority === 'medium').length,
      low: data.filter(t => t.priority === 'low').length,
    };

    const totalEstimated = data.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
    const totalActual = data.reduce((sum, t) => sum + (t.actual_hours || 0), 0);

    return c.json({
      project_id: projectId,
      summary: {
        total_tasks: data.length,
        by_status: statusCounts,
        by_priority: priorityCounts,
        estimated_hours: totalEstimated,
        actual_hours: totalActual,
      },
      tasks: data.map(task => ({
        id: task.id,
        task_name: task.task_name,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigned_to: task.assigned_to,
        estimated_hours: task.estimated_hours,
        actual_hours: task.actual_hours,
        tags: task.tags,
        created_at: task.created_at,
        updated_at: task.updated_at,
        metadata: task.metadata,
      })),
    });
  } catch (error: any) {
    console.error('Task progress error:', error);
    return c.json({
      error: 'Failed to fetch task progress',
      message: error.message,
    }, 500);
  }
}

/**
 * GET /progress/overview
 * Get complete project overview
 */
export async function overviewProgressHandler(c: Context<{ Bindings: Env }>) {
  try {
    const projectId = c.req.query('project_id') || 'GAC_FactoryOS';

    const supabase = getSupabaseClient(c.env);

    // Fetch all progress data in parallel
    const [modulesResult, sprintsResult, tasksResult] = await Promise.all([
      supabase
        .from('module_progress')
        .select('*')
        .eq('project_id', projectId),
      supabase
        .from('sprint_progress')
        .select('*')
        .eq('project_id', projectId)
        .order('started_at', { ascending: false })
        .limit(1),
      supabase
        .from('task_progress')
        .select('*')
        .eq('project_id', projectId),
    ]);

    if (modulesResult.error) throw new Error(modulesResult.error.message);
    if (sprintsResult.error) throw new Error(sprintsResult.error.message);
    if (tasksResult.error) throw new Error(tasksResult.error.message);

    const modules = modulesResult.data;
    const currentSprint = sprintsResult.data[0];
    const tasks = tasksResult.data;

    // Calculate overall progress
    const avgModuleProgress = modules.length > 0
      ? modules.reduce((sum, m) => sum + m.progress_percentage, 0) / modules.length
      : 0;

    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const taskCompletionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

    return c.json({
      project_id: projectId,
      overview: {
        overall_progress: Math.round(avgModuleProgress),
        modules: {
          total: modules.length,
          completed: modules.filter(m => m.status === 'completed').length,
          in_progress: modules.filter(m => m.status === 'in_progress').length,
        },
        current_sprint: currentSprint ? {
          day: currentSprint.sprint_day,
          name: currentSprint.sprint_name,
          status: currentSprint.status,
          progress: currentSprint.total_tasks > 0
            ? Math.round((currentSprint.completed_tasks / currentSprint.total_tasks) * 100)
            : 0,
          completed_tasks: currentSprint.completed_tasks,
          total_tasks: currentSprint.total_tasks,
        } : null,
        tasks: {
          total: tasks.length,
          completed: completedTasks,
          in_progress: tasks.filter(t => t.status === 'in_progress').length,
          blocked: tasks.filter(t => t.status === 'blocked').length,
          completion_rate: Math.round(taskCompletionRate),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Overview progress error:', error);
    return c.json({
      error: 'Failed to fetch project overview',
      message: error.message,
    }, 500);
  }
}
