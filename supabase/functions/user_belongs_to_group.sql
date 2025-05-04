-- Función para verificar si un usuario pertenece a un grupo específico
CREATE OR REPLACE FUNCTION user_belongs_to_group(user_id UUID, group_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  belongs BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_groups ug
    JOIN groups g ON ug.group_id = g.id
    WHERE ug.user_id = user_belongs_to_group.user_id
    AND g.name = user_belongs_to_group.group_name
  ) INTO belongs;
  
  RETURN belongs;
END;
$$;

-- Asegurar que la función sea accesible para usuarios autenticados
GRANT EXECUTE ON FUNCTION user_belongs_to_group(UUID, TEXT) TO authenticated;
