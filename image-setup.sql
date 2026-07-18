-- Image table setup for Supabase
-- 鋒兄圖庫表格設定

-- Create image table
CREATE TABLE IF NOT EXISTS public.image (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  file VARCHAR(150),
  filetype VARCHAR(20),
  note VARCHAR(100),
  ref VARCHAR(100),
  category VARCHAR(100),
  hash VARCHAR(300),
  cover VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_image_name ON public.image(name);
CREATE INDEX IF NOT EXISTS idx_image_category ON public.image(category);
CREATE INDEX IF NOT EXISTS idx_image_created_at ON public.image(created_at);
CREATE INDEX IF NOT EXISTS idx_image_hash ON public.image(hash);

-- Row Level Security：個人站允許 anon 讀寫（前端用 anon key）
ALTER TABLE public.image ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on image" ON public.image;
CREATE POLICY "Allow all operations on image" ON public.image
  FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- Verify table structure
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'image' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Insert sample data (optional)
INSERT INTO public.image (name, file, filetype, note, category) VALUES
('Sample Image 1', '/images/sample1.jpg', 'jpg', 'Test image', 'general'),
('Sample Image 2', '/images/sample2.png', 'png', 'Another test', 'general')
ON CONFLICT DO NOTHING;

-- Query the table
SELECT * FROM public.image ORDER BY created_at DESC;
