#!/usr/bin/env npx tsx

/**
 * Automatically ingest test data via Worker API
 * Uses the /ingest endpoint to insert LLM usage records
 */

const API_URL = 'https://obs-edge.flymorris1230.workers.dev';
const API_KEY = 'a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e';

// Test data records (42 total)
const testRecords = [
  // Day 7 (oldest)
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1200, output_tokens: 450, total_tokens: 1650, cost_usd: 0.0104, latency_ms: 1250, days_ago: 7, hours: 9 },
  { project_id: 'GAC_FactoryOS', model: 'gpt-4-0125-preview', provider: 'openai', input_tokens: 800, output_tokens: 320, total_tokens: 1120, cost_usd: 0.0176, latency_ms: 1890, days_ago: 7, hours: 11 },
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1500, output_tokens: 600, total_tokens: 2100, cost_usd: 0.0135, latency_ms: 1150, days_ago: 7, hours: 14 },
  { project_id: 'GAC_FactoryOS', model: 'gemini-pro-1.5', provider: 'google', input_tokens: 950, output_tokens: 380, total_tokens: 1330, cost_usd: 0.0031, latency_ms: 890, days_ago: 7, hours: 16 },

  // Day 6
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1350, output_tokens: 520, total_tokens: 1870, cost_usd: 0.0119, latency_ms: 1320, days_ago: 6, hours: 8 },
  { project_id: 'GAC_FactoryOS', model: 'gpt-4-0125-preview', provider: 'openai', input_tokens: 920, output_tokens: 410, total_tokens: 1330, cost_usd: 0.0215, latency_ms: 2100, days_ago: 6, hours: 10 },
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1100, output_tokens: 440, total_tokens: 1540, cost_usd: 0.0099, latency_ms: 1080, days_ago: 6, hours: 13 },
  { project_id: 'GAC_FactoryOS', model: 'gemini-pro-1.5', provider: 'google', input_tokens: 1100, output_tokens: 450, total_tokens: 1550, cost_usd: 0.0037, latency_ms: 920, days_ago: 6, hours: 15 },
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1600, output_tokens: 650, total_tokens: 2250, cost_usd: 0.0146, latency_ms: 1420, days_ago: 6, hours: 18 },

  // Day 5
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1280, output_tokens: 490, total_tokens: 1770, cost_usd: 0.0112, latency_ms: 1180, days_ago: 5, hours: 9 },
  { project_id: 'GAC_FactoryOS', model: 'gpt-4-0125-preview', provider: 'openai', input_tokens: 850, output_tokens: 360, total_tokens: 1210, cost_usd: 0.0193, latency_ms: 1950, days_ago: 5, hours: 11 },
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1450, output_tokens: 580, total_tokens: 2030, cost_usd: 0.0131, latency_ms: 1290, days_ago: 5, hours: 14 },
  { project_id: 'GAC_FactoryOS', model: 'gemini-pro-1.5', provider: 'google', input_tokens: 1020, output_tokens: 410, total_tokens: 1430, cost_usd: 0.0033, latency_ms: 870, days_ago: 5, hours: 16 },
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1380, output_tokens: 550, total_tokens: 1930, cost_usd: 0.0124, latency_ms: 1230, days_ago: 5, hours: 19 },

  // Day 4
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1420, output_tokens: 560, total_tokens: 1980, cost_usd: 0.0127, latency_ms: 1340, days_ago: 4, hours: 8 },
  { project_id: 'GAC_FactoryOS', model: 'gpt-4-0125-preview', provider: 'openai', input_tokens: 900, output_tokens: 390, total_tokens: 1290, cost_usd: 0.0207, latency_ms: 2050, days_ago: 4, hours: 10 },
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1250, output_tokens: 500, total_tokens: 1750, cost_usd: 0.0113, latency_ms: 1160, days_ago: 4, hours: 13 },
  { project_id: 'GAC_FactoryOS', model: 'gemini-pro-1.5', provider: 'google', input_tokens: 980, output_tokens: 390, total_tokens: 1370, cost_usd: 0.0032, latency_ms: 910, days_ago: 4, hours: 15 },
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1520, output_tokens: 610, total_tokens: 2130, cost_usd: 0.0138, latency_ms: 1380, days_ago: 4, hours: 17 },
  { project_id: 'GAC_FactoryOS', model: 'gpt-4-0125-preview', provider: 'openai', input_tokens: 1050, output_tokens: 480, total_tokens: 1530, cost_usd: 0.0249, latency_ms: 2200, days_ago: 4, hours: 20 },

  // Day 3
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1180, output_tokens: 470, total_tokens: 1650, cost_usd: 0.0106, latency_ms: 1100, days_ago: 3, hours: 9 },
  { project_id: 'GAC_FactoryOS', model: 'gpt-4-0125-preview', provider: 'openai', input_tokens: 880, output_tokens: 350, total_tokens: 1230, cost_usd: 0.0193, latency_ms: 1920, days_ago: 3, hours: 12 },
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1320, output_tokens: 530, total_tokens: 1850, cost_usd: 0.0119, latency_ms: 1250, days_ago: 3, hours: 15 },
  { project_id: 'GAC_FactoryOS', model: 'gemini-pro-1.5', provider: 'google', input_tokens: 1050, output_tokens: 420, total_tokens: 1470, cost_usd: 0.0034, latency_ms: 890, days_ago: 3, hours: 17 },
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1480, output_tokens: 590, total_tokens: 2070, cost_usd: 0.0133, latency_ms: 1310, days_ago: 3, hours: 19 },
  { project_id: 'GAC_FactoryOS', model: 'gpt-4-0125-preview', provider: 'openai', input_tokens: 970, output_tokens: 430, total_tokens: 1400, cost_usd: 0.0226, latency_ms: 2080, days_ago: 3, hours: 21 },

  // Day 2
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1230, output_tokens: 480, total_tokens: 1710, cost_usd: 0.0109, latency_ms: 1190, days_ago: 2, hours: 8 },
  { project_id: 'GAC_FactoryOS', model: 'gpt-4-0125-preview', provider: 'openai', input_tokens: 910, output_tokens: 380, total_tokens: 1290, cost_usd: 0.0205, latency_ms: 1980, days_ago: 2, hours: 11 },
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1410, output_tokens: 560, total_tokens: 1970, cost_usd: 0.0127, latency_ms: 1330, days_ago: 2, hours: 14 },
  { project_id: 'GAC_FactoryOS', model: 'gemini-pro-1.5', provider: 'google', input_tokens: 1010, output_tokens: 400, total_tokens: 1410, cost_usd: 0.0033, latency_ms: 920, days_ago: 2, hours: 16 },
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1550, output_tokens: 620, total_tokens: 2170, cost_usd: 0.0140, latency_ms: 1400, days_ago: 2, hours: 18 },
  { project_id: 'GAC_FactoryOS', model: 'gpt-4-0125-preview', provider: 'openai', input_tokens: 1020, output_tokens: 460, total_tokens: 1480, cost_usd: 0.0240, latency_ms: 2150, days_ago: 2, hours: 20 },

  // Day 1
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1270, output_tokens: 500, total_tokens: 1770, cost_usd: 0.0113, latency_ms: 1210, days_ago: 1, hours: 9 },
  { project_id: 'GAC_FactoryOS', model: 'gpt-4-0125-preview', provider: 'openai', input_tokens: 940, output_tokens: 400, total_tokens: 1340, cost_usd: 0.0214, latency_ms: 2020, days_ago: 1, hours: 12 },
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1360, output_tokens: 540, total_tokens: 1900, cost_usd: 0.0122, latency_ms: 1280, days_ago: 1, hours: 15 },
  { project_id: 'GAC_FactoryOS', model: 'gemini-pro-1.5', provider: 'google', input_tokens: 1080, output_tokens: 430, total_tokens: 1510, cost_usd: 0.0035, latency_ms: 900, days_ago: 1, hours: 17 },

  // Today
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1310, output_tokens: 520, total_tokens: 1830, cost_usd: 0.0117, latency_ms: 1240, days_ago: 0, hours: 8 },
  { project_id: 'GAC_FactoryOS', model: 'gpt-4-0125-preview', provider: 'openai', input_tokens: 960, output_tokens: 410, total_tokens: 1370, cost_usd: 0.0219, latency_ms: 2040, days_ago: 0, hours: 10 },
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1400, output_tokens: 550, total_tokens: 1950, cost_usd: 0.0125, latency_ms: 1300, days_ago: 0, hours: 12 },
  { project_id: 'GAC_FactoryOS', model: 'gemini-pro-1.5', provider: 'google', input_tokens: 1120, output_tokens: 450, total_tokens: 1570, cost_usd: 0.0037, latency_ms: 930, days_ago: 0, hours: 14 },
  { project_id: 'GAC_FactoryOS', model: 'claude-3-7-sonnet-20250219', provider: 'anthropic', input_tokens: 1590, output_tokens: 640, total_tokens: 2230, cost_usd: 0.0144, latency_ms: 1420, days_ago: 0, hours: 16 },
  { project_id: 'GAC_FactoryOS', model: 'gpt-4-0125-preview', provider: 'openai', input_tokens: 1080, output_tokens: 490, total_tokens: 1570, cost_usd: 0.0255, latency_ms: 2180, days_ago: 0, hours: 18 },
];

async function ingestRecord(record: any): Promise<boolean> {
  const now = new Date();
  const timestamp = new Date(
    now.getTime() - record.days_ago * 24 * 60 * 60 * 1000 + record.hours * 60 * 60 * 1000
  );

  const payload = {
    project_id: record.project_id,
    model: record.model,
    provider: record.provider,
    input_tokens: record.input_tokens,
    output_tokens: record.output_tokens,
    total_tokens: record.total_tokens,
    cost_usd: record.cost_usd,
    latency_ms: record.latency_ms,
    created_at: timestamp.toISOString(),
  };

  try {
    const response = await fetch(`${API_URL}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`  ❌ Failed: ${error}`);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║     🚀 自動匯入測試數據 via Worker API                       ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  console.log(`📊 準備插入 ${testRecords.length} 筆記錄...`);
  console.log('');

  let success = 0;
  let failed = 0;

  for (let i = 0; i < testRecords.length; i++) {
    const record = testRecords[i];
    process.stdout.write(`  [${i + 1}/${testRecords.length}] ${record.model.substring(0, 20).padEnd(20)} `);

    const result = await ingestRecord(record);
    if (result) {
      console.log('✅');
      success++;
    } else {
      console.log('❌');
      failed++;
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`✅ 成功: ${success} 筆`);
  console.log(`❌ 失敗: ${failed} 筆`);
  console.log('');

  if (success > 0) {
    console.log('🎉 測試數據已成功匯入！');
    console.log('');
    console.log('下一步: 運行部署腳本');
    console.log('  npm run deploy:production');
    console.log('');
  } else {
    console.log('❌ 匯入失敗，請檢查 Worker API 狀態');
    process.exit(1);
  }
}

main().catch(console.error);
