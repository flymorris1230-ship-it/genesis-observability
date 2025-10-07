"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { FilterPanel, type FilterState } from "@/components/FilterPanel";
import { MetricsChart } from "@/components/MetricsChart";
import { CostTrend } from "@/components/CostTrend";
import { obsEdgeClient, apiKeys } from "@/lib/api-client";

export default function DashboardPage() {
  const [filters, setFilters] = useState<FilterState>({
    projectId: "GAC_FactoryOS",
    startDate: subDays(new Date(), 30).toISOString(),
    endDate: new Date().toISOString(),
  });

  // Fetch metrics data
  const {
    data: metricsData,
    isLoading: isLoadingMetrics,
    error: metricsError,
  } = useQuery({
    queryKey: apiKeys.metrics(filters.projectId, filters.startDate, filters.endDate),
    queryFn: () =>
      obsEdgeClient.getMetrics(filters.projectId, filters.startDate, filters.endDate),
    enabled: !!filters.projectId,
  });

  // Fetch cost data
  const {
    data: costData,
    isLoading: isLoadingCosts,
    error: costsError,
  } = useQuery({
    queryKey: apiKeys.costs(filters.projectId, filters.startDate, filters.endDate),
    queryFn: () =>
      obsEdgeClient.getCostSummary(filters.projectId, filters.startDate, filters.endDate),
    enabled: !!filters.projectId,
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Monitor your LLM usage, costs, and performance metrics
        </p>
      </div>

      {/* Error Messages */}
      {(metricsError || costsError) && (
        <div className="p-4 border border-destructive bg-destructive/10 rounded-md">
          <p className="font-medium text-destructive">Error Loading Data</p>
          <p className="text-sm text-muted-foreground">
            {metricsError?.message || costsError?.message}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Filter Panel - Sidebar */}
        <div className="lg:col-span-1">
          <FilterPanel filters={filters} onChange={setFilters} />
        </div>

        {/* Main Content */}
        <div className="space-y-6 lg:col-span-3">
          {/* Metrics Chart */}
          <MetricsChart data={metricsData} isLoading={isLoadingMetrics} />

          {/* Cost Trend & Breakdown */}
          <div className="grid gap-6 md:grid-cols-3">
            <CostTrend data={costData} isLoading={isLoadingCosts} />
          </div>
        </div>
      </div>
    </div>
  );
}
