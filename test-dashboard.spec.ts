/**
 * Playwright Test for Genesis Observability Dashboard
 * Diagnose loading issues and capture errors
 */

import { test, expect } from '@playwright/test';

test.describe('Genesis Observability Dashboard', () => {
  test('should load and display data without errors', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for network failures
    const failedRequests: string[] = [];
    page.on('requestfailed', (request) => {
      failedRequests.push(`${request.url()} - ${request.failure()?.errorText}`);
    });

    // Navigate to dashboard
    console.log('🌐 Navigating to Dashboard...');
    await page.goto('https://genesis-observability-obs-dashboard.vercel.app/', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Check for error messages
    const errorMessage = await page.locator('text=/Error Loading Data|Failed to fetch/').count();
    if (errorMessage > 0) {
      const errorText = await page.locator('text=/Error Loading Data|Failed to fetch/').first().textContent();
      console.log('❌ Error Message Found:', errorText);
    }

    // Check if data is still loading
    const loadingElements = await page.locator('text=/Loading/').count();
    console.log(`⏳ Loading Elements: ${loadingElements}`);

    // Check project ID input
    const projectIdInput = await page.locator('#project-id').inputValue();
    console.log(`📋 Project ID: ${projectIdInput}`);

    // Take screenshot
    await page.screenshot({ path: '/Users/morrislin/Desktop/genesis-observability/dashboard-screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved');

    // Log console errors
    if (consoleErrors.length > 0) {
      console.log('❌ Console Errors:', consoleErrors);
    }

    // Log failed requests
    if (failedRequests.length > 0) {
      console.log('❌ Failed Requests:', failedRequests);
    }

    // Check API responses
    const apiRequests = await page.evaluate(() => {
      return (window as any).__API_CALLS__ || [];
    });
    console.log('📡 API Calls:', apiRequests);

    // Assert no critical errors
    expect(consoleErrors.filter(e => e.includes('CORS') || e.includes('401') || e.includes('403'))).toHaveLength(0);
  });

  test('should make API requests correctly', async ({ page }) => {
    // Intercept API requests
    const apiCalls: any[] = [];

    page.on('request', (request) => {
      if (request.url().includes('obs-edge.flymorris1230.workers.dev')) {
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
        });
      }
    });

    page.on('response', async (response) => {
      if (response.url().includes('obs-edge.flymorris1230.workers.dev')) {
        console.log(`📡 API Response: ${response.url()}`);
        console.log(`   Status: ${response.status()}`);
        try {
          const body = await response.json();
          console.log(`   Body:`, JSON.stringify(body, null, 2));
        } catch (e) {
          console.log(`   Body: (not JSON)`);
        }
      }
    });

    await page.goto('https://genesis-observability-obs-dashboard.vercel.app/', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForTimeout(5000);

    console.log(`\n📊 Total API Calls: ${apiCalls.length}`);
    apiCalls.forEach((call, i) => {
      console.log(`\nAPI Call ${i + 1}:`);
      console.log(`  URL: ${call.url}`);
      console.log(`  Method: ${call.method}`);
      console.log(`  Has Authorization: ${!!call.headers.authorization}`);
    });
  });
});
