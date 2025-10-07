/**
 * Genesis Observability - OpenAI Integration Example (Node.js/TypeScript)
 *
 * This example shows how to integrate Genesis Observability with OpenAI
 * to track token usage, costs, and latency.
 */

import OpenAI from 'openai';
import fetch from 'node-fetch';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Observability configuration
const OBSERVABILITY_CONFIG = {
  apiUrl: 'https://obs-edge.flymorris1230.workers.dev/ingest',
  apiKey: 'a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e',
  projectId: 'my-app' // Change this to your project name
};

interface ObservabilityData {
  project_id: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  metadata?: Record<string, any>;
}

/**
 * Send usage data to observability system
 */
async function sendToObservability(data: ObservabilityData): Promise<void> {
  try {
    const response = await fetch(OBSERVABILITY_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OBSERVABILITY_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send observability data:', error);
    } else {
      const result = await response.json();
      console.log('✅ Observability data sent:', result);
    }
  } catch (error) {
    console.error('Error sending observability data:', error);
  }
}

/**
 * Chat with OpenAI and track usage
 */
async function chat(prompt: string, userId?: string): Promise<string> {
  const startTime = performance.now();

  try {
    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }]
    });

    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);

    // Send to observability (non-blocking)
    sendToObservability({
      project_id: OBSERVABILITY_CONFIG.projectId,
      model: response.model,
      provider: 'openai',
      input_tokens: response.usage!.prompt_tokens,
      output_tokens: response.usage!.completion_tokens,
      latency_ms: latency,
      metadata: {
        user_id: userId,
        feature: 'chat',
        environment: process.env.NODE_ENV || 'development'
      }
    }).catch(err => console.error('Observability error:', err));

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('OpenAI error:', error);
    throw error;
  }
}

/**
 * Example usage
 */
async function main() {
  console.log('🤖 OpenAI + Genesis Observability Example\n');

  // Example 1: Simple chat
  console.log('📝 Example 1: Simple chat');
  const response1 = await chat('What is the capital of France?', 'user-123');
  console.log('Response:', response1, '\n');

  // Example 2: Chat with context
  console.log('📝 Example 2: Chat with more context');
  const response2 = await chat(
    'Explain quantum computing in simple terms',
    'user-456'
  );
  console.log('Response:', response2.substring(0, 100) + '...', '\n');

  console.log('✅ All examples completed!');
  console.log('📊 Check your dashboard: https://genesis-observability-obs-dashboard.vercel.app');
}

// Run examples
main().catch(console.error);
