/**
 * DevJournalLogger - Automatic Knowledge Capture System
 * Captures development logs, generates embeddings, and stores to Supabase Vector DB
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { DevLogEntry, KnowledgeBase, ADRDecision } from './types.js';

export class DevJournalLogger {
  private supabase: SupabaseClient;
  private gemini: GoogleGenerativeAI;
  private baseDir: string;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    geminiApiKey: string,
    baseDir = './knowledge'
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.gemini = new GoogleGenerativeAI(geminiApiKey);
    this.baseDir = baseDir;
  }

  /**
   * Log development knowledge with automatic embedding generation
   */
  async logDevelopment(entry: DevLogEntry): Promise<string> {
    // 1. Save to Markdown (local backup)
    const markdownPath = await this.saveToMarkdown(entry);

    // 2. Generate embedding
    const embedding = await this.generateEmbedding(entry.content);

    // 3. Extract summary
    const summary = await this.generateSummary(entry.content);

    // 4. Store to Supabase Vector
    const { data, error } = await this.supabase
      .from('knowledge_base')
      .insert({
        title: entry.title,
        content: entry.content,
        summary,
        type: entry.type,
        embedding,
        phase: entry.phase || 'Unknown',
        tags: entry.tags || [],
        author: process.env.USER || 'claude-code',
        complexity: entry.complexity || 5,
        security_level: entry.securityLevel || 'public',
        related_commits: entry.relatedCommits || [],
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to store knowledge:', error);
      throw new Error(`Failed to store knowledge: ${error.message}`);
    }

    console.log(`✅ Knowledge logged: ${entry.title} (${data.id})`);
    console.log(`📁 Markdown saved: ${markdownPath}`);

    return data.id;
  }

  /**
   * Save knowledge to local Markdown file for backup
   */
  private async saveToMarkdown(entry: DevLogEntry): Promise<string> {
    const date = new Date().toISOString().split('T')[0];
    const dirPath = join(this.baseDir, date);
    await mkdir(dirPath, { recursive: true });

    const filename = `${entry.title.toLowerCase().replace(/\s+/g, '-')}.md`;
    const filePath = join(dirPath, filename);

    const markdown = `# ${entry.title}

**Type**: ${entry.type}
**Phase**: ${entry.phase || 'Unknown'}
**Date**: ${new Date().toISOString()}
**Tags**: ${entry.tags?.join(', ') || 'None'}
**Complexity**: ${entry.complexity || 'N/A'}/10

---

${entry.content}

---

**Related Commits**: ${entry.relatedCommits?.join(', ') || 'None'}
`;

    await writeFile(filePath, markdown);
    return filePath;
  }

  /**
   * Generate embedding using Gemini text-embedding-004 (FREE, 768-dim)
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const model = this.gemini.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  /**
   * Generate concise summary using Gemini Pro (FREE for experimental use)
   */
  private async generateSummary(text: string): Promise<string> {
    // For very short content, return as-is
    if (text.length < 200) {
      return text;
    }

    const model = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `Summarize the following technical content in 2-3 sentences:\n\n${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  /**
   * Log Architecture Decision Record (ADR)
   */
  async logADR(decision: ADRDecision): Promise<string> {
    const content = `
## Context
${decision.context}

## Decision
${decision.decision}

## Consequences
${decision.consequences}

${decision.alternatives ? `## Alternatives Considered\n${decision.alternatives}` : ''}
    `.trim();

    return this.logDevelopment({
      title: `ADR: ${decision.title}`,
      content,
      type: 'adr',
      tags: ['architecture', 'decision-record'],
      complexity: 8,
    });
  }

  /**
   * Log Problem-Solution pair
   */
  async logSolution(problem: string, solution: string, tags?: string[]): Promise<string> {
    const content = `
## Problem
${problem}

## Solution
${solution}
    `.trim();

    return this.logDevelopment({
      title: `Solution: ${problem.substring(0, 50)}...`,
      content,
      type: 'solution',
      tags: tags || ['problem-solving'],
      complexity: 6,
    });
  }

  /**
   * Query recent knowledge entries
   */
  async queryRecent(limit = 10): Promise<KnowledgeBase[]> {
    const { data, error } = await this.supabase
      .from('knowledge_base')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to query knowledge: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Query knowledge by phase
   */
  async queryByPhase(phase: string): Promise<KnowledgeBase[]> {
    const { data, error } = await this.supabase
      .from('knowledge_base')
      .select('*')
      .eq('phase', phase)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to query knowledge by phase: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get total cost (sum of all knowledge items in a phase)
   * Note: This would typically track LLM API costs, placeholder for now
   */
  async getCostByPhase(phase: string): Promise<number> {
    const { data } = await this.supabase
      .from('knowledge_base')
      .select('id')
      .eq('phase', phase);

    // Placeholder: Each knowledge item costs ~$0.001 (embedding generation)
    return (data?.length || 0) * 0.001;
  }
}
