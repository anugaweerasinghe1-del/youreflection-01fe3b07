CREATE TABLE public.responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  age_group text NOT NULL CHECK (age_group IN ('13-17','18-24','25-34','35-44','45+')),
  answers jsonb NOT NULL
);

GRANT SELECT, INSERT ON public.responses TO anon, authenticated;
GRANT ALL ON public.responses TO service_role;

ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read responses"
  ON public.responses FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "anyone can insert responses"
  ON public.responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (age_group IN ('13-17','18-24','25-34','35-44','45+'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.responses;

CREATE INDEX responses_created_at_idx ON public.responses (created_at DESC);