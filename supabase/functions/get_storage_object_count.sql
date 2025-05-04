-- Función para contar objetos en un bucket de almacenamiento
CREATE OR REPLACE FUNCTION get_storage_object_count(bucket_name TEXT)
RETURNS TABLE (total_archivos BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(*)::BIGINT as total_archivos
  FROM storage.objects
  WHERE bucket_id = bucket_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos para ejecutar la función
GRANT EXECUTE ON FUNCTION get_storage_object_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_storage_object_count TO service_role;
