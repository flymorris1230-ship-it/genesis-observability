"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { formatDate, formatNumber } from "@/lib/utils";
import type { MetricsResponse } from "@/lib/api-client";

interface MetricsChartProps {
  data: MetricsResponse | undefined;
  isLoading: boolean;
}

export function MetricsChart({ data, isLoading }: MetricsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token Usage Over Time</CardTitle>
          <CardDescription>Loading metrics data...</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.metrics.dataPoints || data.metrics.dataPoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Token Usage Over Time</CardTitle>
          <CardDescription>No data available for the selected period</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="text-muted-foreground">No data to display</div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = data.metrics.dataPoints.map((point) => ({
    time: formatDate(point.timestamp),
    tokens: point.tokens,
    latency: point.latency,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Usage Over Time</CardTitle>
        <CardDescription>
          Showing {formatNumber(data.metrics.totalRequests)} requests with{" "}
          {formatNumber(data.metrics.totalTokens)} total tokens
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                yAxisId="left"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                label={{ value: "Tokens", angle: -90, position: "insideLeft" }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                label={{ value: "Latency (ms)", angle: 90, position: "insideRight" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                formatter={(value: number, name: string) => [
                  name === "tokens" ? formatNumber(value) : `${value}ms`,
                  name === "tokens" ? "Tokens" : "Latency",
                ]}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="tokens"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))" }}
                name="Tokens"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="latency"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--destructive))" }}
                name="Latency"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
          <div>
            <div className="text-sm text-muted-foreground">Total Requests</div>
            <div className="text-2xl font-bold">{formatNumber(data.metrics.totalRequests)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total Tokens</div>
            <div className="text-2xl font-bold">{formatNumber(data.metrics.totalTokens)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Avg Latency</div>
            <div className="text-2xl font-bold">{data.metrics.avgLatency}ms</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
