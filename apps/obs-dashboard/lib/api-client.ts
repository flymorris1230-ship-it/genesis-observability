/**
 * API Client for obs-edge Cloudflare Worker
 */

const API_URL = process.env.NEXT_PUBLIC_OBS_EDGE_URL || 'http://localhost:8787';
const API_KEY = process.env.NEXT_PUBLIC_OBS_EDGE_API_KEY || '';

// Types matching obs-edge API responses
export interface MetricsResponse {
  project_id: string;
  start_date: string;
  end_date: string;
  metrics: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    avgLatency: number;
    modelBreakdown: Record<string, { count: number; tokens: number; cost: number }>;
    dataPoints: Array<{
      timestamp: string;
      tokens: number;
      cost: number;
      latency: number;
    }>;
  };
}

export interface CostSummaryResponse {
  project_id: string;
  start_date: string;
  end_date: string;
  summary: {
    totalCost: number;
    dailyCosts: Array<{ date: string; cost: number }>;
    providerCosts: Array<{ provider: string; cost: number }>;
  };
}

export interface IngestRequest {
  project_id: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd?: number;
  latency_ms?: number;
  metadata?: Record<string, any>;
}

export interface IngestResponse {
  success: boolean;
  id?: string;
  tokens?: number;
  cost_usd?: number;
  error?: string;
}

class ObsEdgeClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string = API_URL, apiKey: string = API_KEY) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Fetch metrics for a project
   */
  async getMetrics(
    projectId: string,
    startDate?: string,
    endDate?: string
  ): Promise<MetricsResponse> {
    const params = new URLSearchParams({ project_id: projectId });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    return this.request<MetricsResponse>(`/metrics?${params.toString()}`);
  }

  /**
   * Fetch cost summary for a project
   */
  async getCostSummary(
    projectId: string,
    startDate?: string,
    endDate?: string
  ): Promise<CostSummaryResponse> {
    const params = new URLSearchParams({ project_id: projectId });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    return this.request<CostSummaryResponse>(`/costs?${params.toString()}`);
  }

  /**
   * Ingest LLM usage data
   */
  async ingestUsage(data: IngestRequest): Promise<IngestResponse> {
    return this.request<IngestResponse>('/ingest', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Export singleton instance
export const obsEdgeClient = new ObsEdgeClient();

// Export hooks for React Query
export const apiKeys = {
  metrics: (projectId: string, startDate?: string, endDate?: string) =>
    ['metrics', projectId, startDate, endDate] as const,
  costs: (projectId: string, startDate?: string, endDate?: string) =>
    ['costs', projectId, startDate, endDate] as const,
};
