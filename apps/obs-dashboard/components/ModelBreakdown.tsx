"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { MetricsResponse } from "@/lib/api-client";

interface ModelBreakdownProps {
  data: MetricsResponse | undefined;
  isLoading: boolean;
}

// Provider color mapping based on design spec
const PROVIDER_COLORS: Record<string, string> = {
  openai: "hsl(210 100% 50%)",     // Blue
  gemini: "hsl(32.6 94.8% 63.1%)", // Orange
  anthropic: "hsl(220 14% 20%)",   // Dark
};

function getProviderFromModel(model: string): string {
  if (model.includes("gpt") || model.includes("openai")) return "openai";
  if (model.includes("gemini") || model.includes("google")) return "gemini";
  if (model.includes("claude") || model.includes("anthropic")) return "anthropic";
  return "unknown";
}

export function ModelBreakdown({ data, isLoading }: ModelBreakdownProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Model Performance</CardTitle>
          <CardDescription>Loading model breakdown...</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.metrics.modelBreakdown || Object.keys(data.metrics.modelBreakdown).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Model Performance</CardTitle>
          <CardDescription>No model data available for the selected period</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="text-muted-foreground">No data to display</div>
        </CardContent>
      </Card>
    );
  }

  // Transform modelBreakdown object into sorted array
  const models = Object.entries(data.metrics.modelBreakdown)
    .map(([model, stats]) => {
      const costPer1k = stats.tokens > 0 ? (stats.cost / stats.tokens) * 1000 : 0;
      return {
        model,
        provider: getProviderFromModel(model),
        count: stats.count,
        tokens: stats.tokens,
        cost: stats.cost,
        costPer1k,
      };
    })
    .sort((a, b) => b.cost - a.cost); // Sort by cost descending

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Model Performance</CardTitle>
        <CardDescription>
          Detailed breakdown by model ({models.length} models used)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Total Tokens</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">Cost / 1K Tokens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((model) => (
                <TableRow key={model.model} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">{model.model}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="font-medium"
                      style={{
                        borderColor: PROVIDER_COLORS[model.provider] || "hsl(var(--border))",
                        color: PROVIDER_COLORS[model.provider] || "hsl(var(--foreground))",
                      }}
                    >
                      {model.provider}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(model.count)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(model.tokens)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(model.cost)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatCurrency(model.costPer1k)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary Footer */}
        <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm">
          <div className="text-muted-foreground">
            Total across all models
          </div>
          <div className="flex gap-6 font-medium">
            <div>
              <span className="text-muted-foreground mr-2">Requests:</span>
              <span className="font-mono">{formatNumber(data.metrics.totalRequests)}</span>
            </div>
            <div>
              <span className="text-muted-foreground mr-2">Tokens:</span>
              <span className="font-mono">{formatNumber(data.metrics.totalTokens)}</span>
            </div>
            <div>
              <span className="text-muted-foreground mr-2">Cost:</span>
              <span className="font-mono">{formatCurrency(data.metrics.totalCost)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
