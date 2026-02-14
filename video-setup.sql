-- Video table setup for Supabase
-- 鋒兄影片庫表格設定

-- Create video table
CREATE TABLE IF NOT EXISTS public.video (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT UNIQUE,
  file TEXT,
  filetype VARCHAR(20),
  note TEXT,
  ref TEXT,
  category TEXT,
  hash TEXT,
  cover TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_video_name ON public.video(name);
CREATE INDEX IF NOT EXISTS idx_video_category ON public.video(category);
CREATE INDEX IF NOT EXISTS idx_video_created_at ON public.video(created_at);
CREATE INDEX IF NOT EXISTS idx_video_hash ON public.video(hash);

-- Enable Row Level Security (optional - currently disabled for testing)
-- ALTER TABLE public.video ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (when RLS is enabled)
-- CREATE POLICY "Allow all operations on video" ON public.video
-- FOR ALL USING (true) WITH CHECK (true);

-- Verify table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'video' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Insert sample data (optional)
INSERT INTO public.video (name, file, filetype, note, category) VALUES
('Sample Video 1', '/videos/sample1.mp4', 'mp4', 'Test video', 'general'),
('Sample Video 2', '/videos/sample2.mp4', 'mp4', 'Another test', 'general')
ON CONFLICT (name) DO NOTHING;

-- Query the table
SELECT * FROM public.video ORDER BY created_at DESC;
