-- Función para obtener todos los grupos a los que pertenece un usuario
CREATE OR REPLACE FUNCTION get_user_groups(user_id UUID)
RETURNS TABLE (
  group_id UUID,
  group_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT g.id, g.name
  FROM user_groups ug
  JOIN groups g ON ug.group_id = g.id
  WHERE ug.user_id = get_user_groups.user_id;
END;
$$;

-- Asegurar que la función sea accesible para usuarios autenticados
GRANT EXECUTE ON FUNCTION get_user_groups(UUID) TO authenticated;
