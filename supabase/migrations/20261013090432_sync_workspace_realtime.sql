-- Atomically merge the set-like workspace collections and publish changes for
-- authenticated clients. Keep the function SECURITY INVOKER so table RLS remains
-- in force and derive the user identity only from the verified JWT.
CREATE OR REPLACE FUNCTION public.merge_workspace_array(
  p_existing jsonb,
  p_incoming jsonb,
  p_key text,
  p_limit integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    jsonb_agg(item ORDER BY source_priority DESC, ordinal DESC),
    '[]'::jsonb
  )
  FROM (
    SELECT item, source_priority, ordinal
    FROM (
      SELECT DISTINCT ON (item ->> p_key)
        item,
        source_priority,
        ordinal
      FROM (
        SELECT value AS item, 1 AS source_priority, ordinality AS ordinal
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(p_existing) = 'array' THEN p_existing ELSE '[]'::jsonb END
        ) WITH ORDINALITY
        UNION ALL
        SELECT value AS item, 2 AS source_priority, ordinality AS ordinal
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(p_incoming) = 'array' THEN p_incoming ELSE '[]'::jsonb END
        ) WITH ORDINALITY
      ) AS all_items
      WHERE NULLIF(item ->> p_key, '') IS NOT NULL
      ORDER BY item ->> p_key, source_priority DESC, ordinal DESC
    ) AS deduplicated
    ORDER BY source_priority DESC, ordinal DESC
    LIMIT p_limit
  ) AS limited;
$$;

REVOKE ALL ON FUNCTION public.merge_workspace_array(jsonb, jsonb, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_workspace_array(jsonb, jsonb, text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_user_workspace_data(p_workspace jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_workspace jsonb := COALESCE(p_workspace, '{}'::jsonb);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(v_workspace) <> 'object' THEN
    RAISE EXCEPTION 'Workspace must be a JSON object' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_workspace_data AS current_row (user_id, workspace, updated_at)
  VALUES (v_user_id, v_workspace, now())
  ON CONFLICT (user_id) DO UPDATE
  SET workspace =
    jsonb_set(
      jsonb_set(
        jsonb_set(
          COALESCE(current_row.workspace, '{}'::jsonb) || EXCLUDED.workspace,
          '{applications}',
          public.merge_workspace_array(
            current_row.workspace -> 'applications',
            EXCLUDED.workspace -> 'applications',
            'jobId',
            NULL
          )
        ),
        '{activity}',
        public.merge_workspace_array(
          current_row.workspace -> 'activity',
          EXCLUDED.workspace -> 'activity',
          'id',
          60
        )
      ),
      '{feedback}',
      public.merge_workspace_array(
        current_row.workspace -> 'feedback',
        EXCLUDED.workspace -> 'feedback',
        'id',
        120
      )
    ),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.sync_user_workspace_data(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_user_workspace_data(jsonb) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_publication WHERE pubname = 'supabase_realtime') THEN
    EXECUTE 'CREATE PUBLICATION supabase_realtime';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_workspace_data'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.user_workspace_data';
  END IF;
END;
$$;
