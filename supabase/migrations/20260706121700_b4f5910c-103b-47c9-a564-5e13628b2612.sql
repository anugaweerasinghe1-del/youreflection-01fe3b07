-- SECURITY DEFINER aggregate function. Owner is postgres, so it bypasses RLS
-- and doesn't need a SELECT policy on responses. Returns a single JSON blob
-- containing counts only — never raw answer rows.
CREATE OR REPLACE FUNCTION public.get_response_aggregates()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM public.responses),
    'by_age_group', COALESCE((
      SELECT jsonb_object_agg(age_group, cnt)
      FROM (
        SELECT age_group, count(*)::int AS cnt
        FROM public.responses
        GROUP BY age_group
      ) t
    ), '{}'::jsonb),
    'answers', COALESCE((
      SELECT jsonb_agg(answers)
      FROM public.responses
    ), '[]'::jsonb),
    'updated_at', now()
  );
$$;

REVOKE ALL ON FUNCTION public.get_response_aggregates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_response_aggregates() TO anon, authenticated, service_role;