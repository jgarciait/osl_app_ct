CREATE OR REPLACE FUNCTION list_storage_objects(bucket_name TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  owner UUID,
  bucket_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  metadata JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.owner,
    o.bucket_id,
    o.created_at,
    o.updated_at,
    o.last_accessed_at,
    o.metadata
  FROM 
    storage.objects o
  WHERE 
    o.bucket_id = bucket_name;
END;
$$;

-- Asegurar que la función es accesible para los usuarios autenticados
GRANT EXECUTE ON FUNCTION list_storage_objects(TEXT) TO authenticated;
