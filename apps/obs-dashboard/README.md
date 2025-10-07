# obs-dashboard

**Genesis Observability Dashboard** - Real-time LLM usage monitoring and analytics

## 🚀 Features

- **Real-time Metrics**: Monitor LLM API calls, token usage, and latency
- **Cost Tracking**: Track costs across multiple providers (OpenAI, Anthropic, Google)
- **Interactive Charts**: Visualize trends with Recharts
- **Flexible Filtering**: Filter by project, date range, and more
- **Responsive Design**: Works on desktop and mobile

## 📦 Tech Stack

- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **TanStack Query** (React Query)
- **Recharts** (Data visualization)
- **date-fns** (Date utilities)

## 🛠️ Getting Started

### Prerequisites

- Node.js 20+
- pnpm (or npm/yarn)
- Running `obs-edge` Cloudflare Worker

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Configure obs-edge API URL and key
# Edit .env:
# NEXT_PUBLIC_OBS_EDGE_URL=http://localhost:8787
# NEXT_PUBLIC_OBS_EDGE_API_KEY=your-api-key
```

### Development

```bash
# Run development server
pnpm dev

# Open http://localhost:3001
```

### Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## 📊 Dashboard Components

### FilterPanel
- Project ID selection
- Quick date range presets (24h, 7d, 30d, 90d)
- Custom date range picker

### MetricsChart
- Line chart showing token usage over time
- Dual Y-axis for tokens and latency
- Summary statistics (requests, tokens, avg latency)

### CostTrend
- Daily cost bar chart
- Provider cost breakdown (pie chart)
- Total cost summary

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_OBS_EDGE_URL` | obs-edge Worker URL | `http://localhost:8787` |
| `NEXT_PUBLIC_OBS_EDGE_API_KEY` | API key for authentication | (empty) |

### API Client

The dashboard uses `@/lib/api-client.ts` to communicate with obs-edge:

```typescript
import { obsEdgeClient } from "@/lib/api-client";

// Fetch metrics
const metrics = await obsEdgeClient.getMetrics(
  "project-id",
  "2025-01-01",
  "2025-01-07"
);

// Fetch costs
const costs = await obsEdgeClient.getCostSummary(
  "project-id",
  "2025-01-01",
  "2025-01-31"
);
```

## 📁 Project Structure

```
apps/obs-dashboard/
├── app/
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Dashboard main page
│   └── providers.tsx        # React Query provider
├── components/
│   ├── ui/
│   │   └── card.tsx         # Card UI component
│   ├── FilterPanel.tsx      # Filter controls
│   ├── MetricsChart.tsx     # Token/latency chart
│   └── CostTrend.tsx        # Cost visualization
├── lib/
│   ├── api-client.ts        # obs-edge API client
│   └── utils.ts             # Utility functions
├── next.config.ts           # Next.js config
├── tailwind.config.ts       # Tailwind config
└── package.json
```

## 🎨 Customization

### Theming

The dashboard uses CSS variables for theming. Modify `app/globals.css` to customize colors:

```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  /* ... */
}
```

### Date Ranges

Add custom presets in `components/FilterPanel.tsx`:

```typescript
const PRESET_RANGES = [
  { label: "Last 24 hours", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  // Add your custom presets
];
```

## 🐛 Troubleshooting

### CORS Errors

Make sure `obs-edge` Worker has proper CORS configuration:

```typescript
// In obs-edge/src/index.ts
app.use('*', cors({
  origin: ['http://localhost:3001', 'https://your-dashboard.com']
}));
```

### API Connection Errors

1. Check that obs-edge is running (`wrangler dev` in obs-edge directory)
2. Verify `NEXT_PUBLIC_OBS_EDGE_URL` matches your Worker URL
3. Ensure `NEXT_PUBLIC_OBS_EDGE_API_KEY` is correct

### No Data Displayed

1. Verify project ID exists in database
2. Check date range has data
3. Inspect browser console for API errors

## 📝 License

Part of Genesis Observability monorepo.

---

**Built with ❤️ using Next.js 15 and TanStack Query**
