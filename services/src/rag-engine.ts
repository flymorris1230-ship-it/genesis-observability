/**
 * RAG Engine - Retrieval-Augmented Generation System
 * Semantic search with hybrid approach (full-text + vector similarity)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { RetrievedDocument, SearchOptions, SecurityLevel } from './types.js';

export class RAGEngine {
  private supabase: SupabaseClient;
  private gemini: GoogleGenerativeAI;

  constructor(supabaseUrl: string, supabaseKey: string, geminiApiKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.gemini = new GoogleGenerativeAI(geminiApiKey);
  }

  /**
   * Semantic search with hybrid approach (text + vector)
   */
  async retrieve(query: string, options: SearchOptions = {}): Promise<RetrievedDocument[]> {
    const {
      topK = 5,
      minSimilarity = 0.7,
      filterTags,
      filterPhase,
      securityLevel = 'public',
    } = options;

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Hybrid search (text + vector)
    const { data, error } = await this.supabase.rpc('hybrid_search', {
      query_text: query,
      query_embedding: queryEmbedding,
      match_count: topK * 2, // Get more for filtering
    });

    if (error) {
      console.error('RAG retrieval failed:', error);
      return [];
    }

    // Filter by tags, phase, security level
    let results = data || [];

    if (filterTags && filterTags.length > 0) {
      results = results.filter((doc: any) =>
        filterTags.some((tag) => doc.tags?.includes(tag))
      );
    }

    if (filterPhase) {
      results = results.filter((doc: any) => doc.phase === filterPhase);
    }

    if (securityLevel) {
      const levels: SecurityLevel[] = ['public', 'internal', 'confidential', 'restricted'];
      const maxLevel = levels.indexOf(securityLevel);
      results = results.filter((doc: any) => levels.indexOf(doc.security_level) <= maxLevel);
    }

    // Filter by similarity threshold
    results = results.filter((doc: any) => doc.combined_score >= minSimilarity);

    // Limit to topK
    results = results.slice(0, topK);

    return results.map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      summary: doc.summary,
      score: doc.combined_score,
      type: doc.type,
      tags: doc.tags,
    }));
  }

  /**
   * Generate enhanced prompt with retrieved knowledge
   */
  async enhancePrompt(
    task: string,
    basePrompt: string
  ): Promise<{ prompt: string; sources: RetrievedDocument[] }> {
    // Retrieve relevant knowledge
    const knowledge = await this.retrieve(task, { topK: 3 });

    if (knowledge.length === 0) {
      return { prompt: basePrompt, sources: [] };
    }

    // Construct enhanced prompt
    const enhancedPrompt = `
${basePrompt}

## Relevant Knowledge Context

${knowledge
  .map(
    (k, i) => `
### ${i + 1}. ${k.title} (Relevance: ${(k.score * 100).toFixed(1)}%)

${k.summary || k.content.substring(0, 500)}...

`
  )
  .join('\n')}

## Task

${task}

**Instructions**: Please solve this task using the above knowledge context. Reference specific knowledge items if applicable.
    `.trim();

    return { prompt: enhancedPrompt, sources: knowledge };
  }

  /**
   * Full-text search only (no vector search)
   */
  async searchText(query: string, limit = 10): Promise<RetrievedDocument[]> {
    const { data, error } = await this.supabase.rpc('search_knowledge', {
      query_text: query,
      match_count: limit,
    });

    if (error) {
      console.error('Text search failed:', error);
      return [];
    }

    return (data || []).map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      summary: doc.summary,
      score: 1.0, // Text search doesn't provide similarity score
      type: doc.type,
      tags: doc.tags,
    }));
  }

  /**
   * Vector similarity search only (no full-text search)
   */
  async searchVector(
    query: string,
    threshold = 0.7,
    limit = 5
  ): Promise<RetrievedDocument[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    const { data, error } = await this.supabase.rpc('match_knowledge', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      console.error('Vector search failed:', error);
      return [];
    }

    return (data || []).map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      summary: null,
      score: doc.similarity,
      type: 'learning', // Default type, actual type not returned by function
      tags: [],
    }));
  }

  /**
   * Get knowledge by ID
   */
  async getById(id: string): Promise<RetrievedDocument | null> {
    const { data, error } = await this.supabase
      .from('knowledge_base')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      summary: data.summary,
      score: 1.0,
      type: data.type,
      tags: data.tags,
    };
  }

  /**
   * Get knowledge by tags
   */
  async getByTags(tags: string[], limit = 10): Promise<RetrievedDocument[]> {
    const { data, error } = await this.supabase
      .from('knowledge_base')
      .select('*')
      .contains('tags', tags)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Tag search failed:', error);
      return [];
    }

    return (data || []).map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      summary: doc.summary,
      score: 1.0,
      type: doc.type,
      tags: doc.tags,
    }));
  }

  /**
   * Generate embedding using Gemini text-embedding-004
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const model = this.gemini.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }
}
