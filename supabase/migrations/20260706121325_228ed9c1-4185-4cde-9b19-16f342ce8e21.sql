-- Lock down responses SELECT: only service_role (server functions via supabaseAdmin) can read raw rows.
DROP POLICY IF EXISTS "anyone can read responses" ON public.responses;

REVOKE SELECT ON public.responses FROM anon, authenticated;
GRANT SELECT ON public.responses TO service_role;

-- Ensure INSERT still works for anonymous submissions (unchanged, restated for clarity).
-- Existing policy "anyone can insert responses" already covers this.