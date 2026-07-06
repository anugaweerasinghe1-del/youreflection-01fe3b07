CREATE OR REPLACE FUNCTION public.get_response_aggregates()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH per_answer AS (
    SELECT
      k AS qid,
      (v #>> '{}') AS ans
    FROM public.responses r, jsonb_each(r.answers) AS je(k, v)
  ),
  q_counts AS (
    SELECT qid, ans, count(*)::int AS cnt
    FROM per_answer
    GROUP BY qid, ans
  ),
  q_json AS (
    SELECT qid, jsonb_object_agg(ans, cnt) AS counts
    FROM q_counts
    GROUP BY qid
  )
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
    'by_question', COALESCE(
      (SELECT jsonb_object_agg(qid, counts) FROM q_json),
      '{}'::jsonb
    ),
    'updated_at', now()
  );
$$;

REVOKE ALL ON FUNCTION public.get_response_aggregates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_response_aggregates() TO anon, authenticated, service_role;