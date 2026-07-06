CREATE OR REPLACE FUNCTION public.submit_wall_entry(
  _message text,
  _status wall_status,
  _reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _clean text := trim(both from coalesce(_message, ''));
  _new_id uuid;
BEGIN
  IF length(_clean) < 4 THEN
    RAISE EXCEPTION 'message too short';
  END IF;
  IF length(_clean) > 240 THEN
    _clean := left(_clean, 240);
  END IF;

  INSERT INTO public.wall_entries (message, status, moderation_reason)
  VALUES (_clean, coalesce(_status, 'pending'::wall_status), left(coalesce(_reason, ''), 500))
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_wall_entry(text, wall_status, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_wall_entry(text, wall_status, text) TO anon, authenticated, service_role;