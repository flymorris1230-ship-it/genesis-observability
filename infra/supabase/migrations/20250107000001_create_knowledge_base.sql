-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Knowledge Base Table
CREATE TABLE IF NOT EXISTS knowledge_base (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  type VARCHAR(50) NOT NULL,

  -- Vector Embedding (Gemini text-embedding-004: 768 dimensions)
  embedding VECTOR(768),

  -- Metadata
  phase VARCHAR(20),
  tags TEXT[],
  author VARCHAR(100),
  complexity INT CHECK (complexity BETWEEN 1 AND 10),
  security_level VARCHAR(20) DEFAULT 'public',

  -- Relations
  parent_id UUID REFERENCES knowledge_base(id),
  related_commits TEXT[],
  related_docs TEXT[],

  -- Usage Statistics
  usage_count INT DEFAULT 0,
  avg_rating FLOAT DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Lifecycle
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  retention_days INT DEFAULT 180,

  -- Constraints
  CONSTRAINT knowledge_base_type_check CHECK (
    type IN ('dev_log', 'adr', 'solution', 'learning', 'prompt_template')
  ),
  CONSTRAINT knowledge_base_security_check CHECK (
    security_level IN ('public', 'internal', 'confidential', 'restricted')
  )
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx
  ON knowledge_base
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS knowledge_base_content_idx
  ON knowledge_base
  USING gin(to_tsvector('english', content));

CREATE INDEX IF NOT EXISTS knowledge_base_tags_idx
  ON knowledge_base
  USING gin(tags);

CREATE INDEX IF NOT EXISTS knowledge_base_created_idx
  ON knowledge_base (created_at DESC);

CREATE INDEX IF NOT EXISTS knowledge_base_type_idx
  ON knowledge_base (type);

CREATE INDEX IF NOT EXISTS knowledge_base_phase_idx
  ON knowledge_base (phase);

CREATE INDEX IF NOT EXISTS knowledge_base_security_idx
  ON knowledge_base (security_level);

-- Full-Text Search Function
CREATE OR REPLACE FUNCTION search_knowledge(
  query_text TEXT,
  match_count INT DEFAULT 10
)
RETURNS SETOF knowledge_base
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM knowledge_base
  WHERE to_tsvector('english', content) @@ plainto_tsquery('english', query_text)
    AND NOT is_archived
  ORDER BY ts_rank(to_tsvector('english', content), plainto_tsquery('english', query_text)) DESC
  LIMIT match_count;
END;
$$;

-- Vector Similarity Search Function
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.content,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  WHERE 1 - (kb.embedding <=> query_embedding) > match_threshold
    AND NOT kb.is_archived
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Hybrid Search (Full-Text + Vector)
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text TEXT,
  query_embedding VECTOR(768),
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  summary TEXT,
  type VARCHAR(50),
  tags TEXT[],
  phase VARCHAR(20),
  security_level VARCHAR(20),
  text_score FLOAT,
  vector_score FLOAT,
  combined_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH text_search AS (
    SELECT
      kb.id,
      ts_rank(to_tsvector('english', kb.content), plainto_tsquery('english', query_text)) AS score
    FROM knowledge_base kb
    WHERE to_tsvector('english', kb.content) @@ plainto_tsquery('english', query_text)
      AND NOT kb.is_archived
  ),
  vector_search AS (
    SELECT
      kb.id,
      1 - (kb.embedding <=> query_embedding) AS score
    FROM knowledge_base kb
    WHERE NOT kb.is_archived
  )
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.summary,
    kb.type,
    kb.tags,
    kb.phase,
    kb.security_level,
    COALESCE(ts.score, 0) AS text_score,
    COALESCE(vs.score, 0) AS vector_score,
    (COALESCE(ts.score, 0) * 0.3 + COALESCE(vs.score, 0) * 0.7) AS combined_score
  FROM knowledge_base kb
  LEFT JOIN text_search ts ON kb.id = ts.id
  LEFT JOIN vector_search vs ON kb.id = vs.id
  WHERE (ts.score IS NOT NULL OR vs.score IS NOT NULL)
    AND NOT kb.is_archived
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- Auto-Update Timestamp Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-archive old knowledge (scheduled function)
CREATE OR REPLACE FUNCTION archive_old_knowledge()
RETURNS TABLE (archived_count INT, compressed_count INT) AS $$
DECLARE
  v_archived_count INT := 0;
  v_compressed_count INT := 0;
BEGIN
  -- Archive non-ADR knowledge older than 180 days
  WITH archived AS (
    UPDATE knowledge_base
    SET
      is_archived = TRUE,
      archived_at = NOW()
    WHERE
      updated_at < NOW() - INTERVAL '180 days'
      AND type != 'adr'  -- Keep ADRs forever
      AND NOT is_archived
    RETURNING *
  )
  SELECT COUNT(*)::INT INTO v_archived_count FROM archived;

  -- Compress rarely-used knowledge (usage_count < 3, older than 90 days)
  WITH compressed AS (
    UPDATE knowledge_base
    SET
      content = LEFT(content, 500) || '... [Compressed]',  -- Keep only first 500 chars
      embedding = NULL  -- Remove embedding to save space
    WHERE
      updated_at < NOW() - INTERVAL '90 days'
      AND (usage_count < 3 OR usage_count IS NULL)
      AND NOT is_archived
      AND embedding IS NOT NULL
    RETURNING *
  )
  SELECT COUNT(*)::INT INTO v_compressed_count FROM compressed;

  RETURN QUERY SELECT v_archived_count, v_compressed_count;
END;
$$ LANGUAGE plpgsql;

-- Manual cleanup function
CREATE OR REPLACE FUNCTION cleanup_knowledge_now()
RETURNS TEXT AS $$
DECLARE
  result RECORD;
BEGIN
  SELECT * INTO result FROM archive_old_knowledge();

  RETURN format(
    'Knowledge cleanup completed: %s items archived, %s items compressed',
    result.archived_count,
    result.compressed_count
  );
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS)
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Public: Anyone can read public knowledge
CREATE POLICY "Public knowledge is viewable by everyone"
  ON knowledge_base
  FOR SELECT
  USING (security_level = 'public' AND NOT is_archived);

-- Internal: Authenticated users can read internal knowledge
CREATE POLICY "Internal knowledge for authenticated users"
  ON knowledge_base
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND security_level IN ('public', 'internal')
    AND NOT is_archived
  );

-- Confidential: Only specific roles can access
CREATE POLICY "Confidential knowledge for admins"
  ON knowledge_base
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'tech_lead')
    AND NOT is_archived
  );

-- Insert: Only authenticated users can insert
CREATE POLICY "Authenticated users can insert knowledge"
  ON knowledge_base
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Update: Only owners or admins can update
CREATE POLICY "Owners and admins can update knowledge"
  ON knowledge_base
  FOR UPDATE
  USING (
    author = auth.jwt() ->> 'email'
    OR auth.jwt() ->> 'role' = 'admin'
  );

-- Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON knowledge_base TO postgres, service_role;
GRANT SELECT ON knowledge_base TO anon, authenticated;
GRANT INSERT, UPDATE ON knowledge_base TO authenticated;
