-- Podcast table setup for Supabase
-- 鋒兄播客庫表格設定

-- Create podcast table
CREATE TABLE IF NOT EXISTS public.podcast (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  file VARCHAR(150),
  filetype VARCHAR(20),
  note VARCHAR(20),
  ref VARCHAR(100),
  category VARCHAR(100),
  hash VARCHAR(300),
  cover VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_podcast_name ON public.podcast(name);
CREATE INDEX IF NOT EXISTS idx_podcast_category ON public.podcast(category);
CREATE INDEX IF NOT EXISTS idx_podcast_created_at ON public.podcast(created_at);
CREATE INDEX IF NOT EXISTS idx_podcast_hash ON public.podcast(hash);

-- Enable Row Level Security (optional - currently disabled for testing)
-- ALTER TABLE public.podcast ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (when RLS is enabled)
-- CREATE POLICY "Allow all operations on podcast" ON public.podcast
-- FOR ALL USING (true) WITH CHECK (true);

-- Verify table structure
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'podcast' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Insert sample data (optional)
INSERT INTO public.podcast (name, file, filetype, note, category) VALUES
('Sample Podcast 1', '/podcasts/episode1.mp3', 'mp3', 'Test podcast episode', 'technology'),
('Sample Podcast 2', '/podcasts/episode2.mp3', 'mp3', 'Another episode', 'education')
ON CONFLICT DO NOTHING;

-- Query the table
SELECT * FROM public.podcast ORDER BY created_at DESC;
