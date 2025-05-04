-- Función para verificar si un usuario tiene un permiso específico
CREATE OR REPLACE FUNCTION user_has_permission(user_id UUID, resource TEXT, action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_permission BOOLEAN;
BEGIN
  -- Verificar si el usuario es administrador
  IF is_admin(user_id) THEN
    RETURN TRUE;
  END IF;

  -- Verificar si el usuario tiene el permiso a través de sus grupos
  SELECT EXISTS (
    SELECT 1
    FROM user_groups ug
    JOIN group_permissions gp ON ug.group_id = gp.group_id
    JOIN permissions p ON gp.permission_id = p.id
    WHERE ug.user_id = user_has_permission.user_id
    AND p.resource = user_has_permission.resource
    AND p.action = user_has_permission.action
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$;

-- Asegurar que la función sea accesible para usuarios autenticados
GRANT EXECUTE ON FUNCTION user_has_permission(UUID, TEXT, TEXT) TO authenticated;
