# Genesis Observability Dashboard - Design Specification

## Design Philosophy
"Monitor, understand, and optimize your LLM usage at a glance"

## Core Principles

### 1. Data Story & Hierarchy
- **Progressive disclosure**: Large to small, general to specific
- **Single-purpose sections**: Each panel answers a specific question
- **Reduce cognitive load**: Clear visual hierarchy, minimal clutter
- **Tell a story**: Usage → Cost → Performance → Insights

### 2. Visual Language

#### Color System
- **Blue**: Healthy metrics, normal operation
- **Red**: Critical issues, high costs, errors
- **Orange/Yellow**: Warnings, approaching limits
- **Green**: Success, optimization opportunities
- **Gray**: Neutral, baseline metrics

#### Typography
- **Headings**: Bold, clear hierarchy (3xl → 2xl → xl)
- **Metrics**: Large, prominent numbers for key values
- **Labels**: Subtle, descriptive, context-rich

### 3. Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Header: Project Info + Real-time Status                │
├─────────────┬───────────────────────────────────────────┤
│   Filters   │  Primary Metrics (Token Usage Over Time) │
│   Sidebar   │                                           │
│             ├───────────────────────────────────────────┤
│   - Project │  Secondary Metrics (Cost Analysis)        │
│   - Date    │                                           │
│   - Provider├───────────────────────────────────────────┤
│   - Model   │  Tertiary Insights (Model Breakdown)      │
│             │                                           │
└─────────────┴───────────────────────────────────────────┘
```

### 4. Key Metrics Display

#### Primary Panel: Token Usage Over Time
- **Chart Type**: Line chart with dual Y-axis
- **Metrics**: Tokens (left) + Latency (right)
- **Color**: Blue for tokens, Orange for latency
- **Context**: Show total requests and time range

#### Secondary Panel: Cost Analysis
- **Layout**: 3-column grid
  1. **Total Cost**: Large number with trend indicator
  2. **Daily Cost Trend**: Area chart showing progression
  3. **Cost by Provider**: Pie/bar chart with breakdown

#### Tertiary Panel: Model Performance
- **Model Breakdown Table**:
  - Model name
  - Request count
  - Total tokens
  - Average latency
  - Total cost
  - Cost per 1K tokens

#### Quaternary Panel: Real-time Insights
- **Recent Requests**: Live feed of latest 10 requests
- **Anomaly Alerts**: Unusual patterns (spikes, errors)
- **Optimization Tips**: Actionable recommendations

### 5. Interactive Elements

#### Filters
- **Project Selector**: Dropdown with search
- **Date Range**:
  - Quick select buttons (24h, 7d, 30d, 90d)
  - Custom date picker
  - Relative time support
- **Provider Filter**: Multi-select (OpenAI, Gemini, Anthropic)
- **Model Filter**: Multi-select, grouped by provider

#### Drill-down Capabilities
- Click on data points → Show detailed request info
- Click on model → Filter to that model's requests
- Click on time period → Zoom into that range

### 6. Performance Optimization

#### Data Loading
- **Initial Load**: Show skeleton loaders
- **Progressive Enhancement**: Load critical metrics first
- **Caching**: React Query with 5-minute stale time
- **Polling**: Optional real-time updates (30s interval)

#### Visual Performance
- **Chart Optimization**:
  - Limit data points (max 100 per chart)
  - Aggregate older data
  - Use canvas rendering for large datasets
- **Lazy Loading**: Load below-fold content on scroll

### 7. Mobile Responsiveness

#### Breakpoints
- **Desktop**: ≥1024px (4-column grid)
- **Tablet**: 768-1023px (2-column grid)
- **Mobile**: <768px (1-column stack)

#### Mobile Adaptations
- Collapsible filter sidebar → Bottom sheet
- Simplified charts (fewer data points)
- Touch-friendly controls (larger targets)
- Swipeable chart navigation

### 8. Accessibility

- **Color Contrast**: WCAG AA compliant
- **Keyboard Navigation**: Full tab support
- **Screen Readers**: Proper ARIA labels
- **Focus Indicators**: Visible focus states

## Design Patterns from Industry Leaders

### From Grafana
✓ Meaningful color usage (blue=good, red=bad)
✓ Normalized axes for easier comparison
✓ Template variables for dynamic views
✓ Documentation tooltips on panels

### From Datadog LLM Observability
✓ Unified dashboard with comprehensive metrics
✓ End-to-end trace exploration
✓ Cluster visualization for anomalies
✓ Real-time alerts configuration

### From Vercel
✓ Simplification and streamlining
✓ Consistent design system
✓ Mobile-first responsive design
✓ Performance-optimized rendering

## Implementation Priorities

### Phase 1: Core Improvements (Current Sprint)
1. ✅ Fix CORS and data loading
2. 🔄 Enhance metric cards with trend indicators
3. 🔄 Add model breakdown table
4. 🔄 Improve color system (meaningful colors)

### Phase 2: Advanced Features
1. Add provider/model filters
2. Implement drill-down capabilities
3. Add recent requests live feed
4. Create optimization recommendations panel

### Phase 3: Polish & Optimization
1. Mobile responsive refinements
2. Performance optimizations
3. Accessibility audit & fixes
4. User testing & iteration

## Component Library

### Shadcn/ui Components Used
- `Card`: Metric panels
- `Chart`: Token usage, cost trends
- `Table`: Model breakdown, recent requests
- `Select`: Filters (project, provider, model)
- `DatePicker`: Date range selection
- `Badge`: Status indicators, tags
- `Alert`: Error messages, warnings
- `Skeleton`: Loading states
- `Tabs`: View switching
- `Dialog`: Detailed request information

## Color Palette

### Theme Colors
```css
/* Light Mode */
--primary: 222.2 47.4% 11.2%     /* Dark blue-gray */
--secondary: 210 40% 96.1%       /* Light gray-blue */
--accent: 210 40% 96.1%          /* Accent blue */
--destructive: 0 84.2% 60.2%     /* Red for errors */
--success: 142.1 76.2% 36.3%     /* Green for success */
--warning: 32.6 94.8% 63.1%      /* Orange for warnings */

/* Chart Colors */
--chart-tokens: 210 100% 50%     /* Blue */
--chart-latency: 32.6 94.8% 63.1% /* Orange */
--chart-cost: 142.1 76.2% 36.3%  /* Green */
--chart-openai: 210 100% 50%     /* OpenAI Blue */
--chart-gemini: 32.6 94.8% 63.1% /* Gemini Orange */
--chart-anthropic: 220 14% 20%   /* Anthropic Dark */
```

## Key Metrics & Calculations

### Token Usage
- **Total Tokens**: input_tokens + output_tokens
- **Tokens/Request**: total_tokens / request_count
- **Token Growth**: (current_period - previous_period) / previous_period * 100

### Cost Metrics
- **Total Cost**: Σ(input_tokens * input_rate + output_tokens * output_rate)
- **Cost/Request**: total_cost / request_count
- **Cost/1K Tokens**: (total_cost / total_tokens) * 1000
- **Cost Trend**: Daily aggregation with 7-day moving average

### Performance Metrics
- **Average Latency**: Σlatency_ms / request_count
- **P95 Latency**: 95th percentile of latency_ms
- **Error Rate**: error_count / total_request_count * 100

## Future Enhancements

1. **Comparative Analysis**: Compare multiple projects side-by-side
2. **Budget Alerts**: Set cost thresholds, get notified
3. **Custom Dashboards**: User-defined metric layouts
4. **Export & Reports**: PDF/CSV export, scheduled reports
5. **Team Collaboration**: Share dashboards, annotations
6. **AI Insights**: ML-powered usage predictions and recommendations

---

**Last Updated**: 2025-10-07
**Version**: 1.0
**Status**: Active Development
