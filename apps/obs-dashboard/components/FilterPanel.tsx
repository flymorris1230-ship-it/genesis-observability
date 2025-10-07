"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { subDays, format } from "date-fns";

export interface FilterState {
  projectId: string;
  startDate: string;
  endDate: string;
}

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const PRESET_RANGES = [
  { label: "Last 24 hours", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const handlePresetClick = (days: number) => {
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    onChange({
      ...filters,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, projectId: e.target.value });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, startDate: new Date(e.target.value).toISOString() });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, endDate: new Date(e.target.value).toISOString() });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>Filter metrics by project and date range</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project ID */}
        <div>
          <label htmlFor="project-id" className="block text-sm font-medium mb-2">
            Project ID
          </label>
          <input
            id="project-id"
            type="text"
            value={filters.projectId}
            onChange={handleProjectChange}
            placeholder="Enter project ID"
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
          />
        </div>

        {/* Quick presets */}
        <div>
          <label className="block text-sm font-medium mb-2">Quick Select</label>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_RANGES.map((preset) => (
              <button
                key={preset.days}
                onClick={() => handlePresetClick(preset.days)}
                className="px-3 py-2 text-sm border border-input rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date range */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Custom Range</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="start-date" className="block text-xs text-muted-foreground mb-1">
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={format(new Date(filters.startDate), 'yyyy-MM-dd')}
                onChange={handleStartDateChange}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-xs text-muted-foreground mb-1">
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                value={format(new Date(filters.endDate), 'yyyy-MM-dd')}
                onChange={handleEndDateChange}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
              />
            </div>
          </div>
        </div>

        {/* Current selection summary */}
        <div className="pt-2 border-t text-sm text-muted-foreground">
          <p>
            Showing data from{" "}
            <span className="font-medium text-foreground">
              {format(new Date(filters.startDate), 'MMM d, yyyy')}
            </span>{" "}
            to{" "}
            <span className="font-medium text-foreground">
              {format(new Date(filters.endDate), 'MMM d, yyyy')}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
