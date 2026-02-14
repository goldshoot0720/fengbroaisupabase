-- Music table setup for Supabase
-- 鋒兄音樂庫表格設定

-- Create music table
CREATE TABLE IF NOT EXISTS public.music (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  file VARCHAR(150),
  filetype VARCHAR(20),
  lyrics TEXT,
  note VARCHAR(100),
  ref VARCHAR(100),
  category VARCHAR(100),
  hash VARCHAR(300),
  language VARCHAR(100),
  cover VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_music_name ON public.music(name);
CREATE INDEX IF NOT EXISTS idx_music_category ON public.music(category);
CREATE INDEX IF NOT EXISTS idx_music_created_at ON public.music(created_at);
CREATE INDEX IF NOT EXISTS idx_music_hash ON public.music(hash);

-- Enable Row Level Security (optional - currently disabled for testing)
-- ALTER TABLE public.music ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (when RLS is enabled)
-- CREATE POLICY "Allow all operations on music" ON public.music
-- FOR ALL USING (true) WITH CHECK (true);

-- Verify table structure
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'music' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Insert sample data (optional)
INSERT INTO public.music (name, file, filetype, note, category) VALUES
('Sample Song 1', '/music/song1.mp3', 'mp3', 'Test music track', 'pop'),
('Sample Song 2', '/music/song2.mp3', 'mp3', 'Another track', 'rock')
ON CONFLICT DO NOTHING;

-- Query the table
SELECT * FROM public.music ORDER BY created_at DESC;
