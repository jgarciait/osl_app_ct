-- Función para verificar si las políticas basadas en grupos están funcionando correctamente
CREATE OR REPLACE FUNCTION check_group_based_permissions(test_user_id UUID)
RETURNS TABLE (
  test_name TEXT,
  result BOOLEAN,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_groups TEXT[];
  user_permissions TEXT[];
BEGIN
  -- Obtener grupos del usuario
  SELECT array_agg(g.name)
  INTO user_groups
  FROM user_groups ug
  JOIN groups g ON ug.group_id = g.id
  WHERE ug.user_id = test_user_id;
  
  -- Obtener permisos del usuario
  SELECT array_agg(p.name || ' (' || p.resource || ':' || p.action || ')')
  INTO user_permissions
  FROM user_groups ug
  JOIN group_permissions gp ON ug.group_id = gp.group_id
  JOIN permissions p ON gp.permission_id = p.id
  WHERE ug.user_id = test_user_id;
  
  -- Devolver resultados
  RETURN QUERY
  
  -- Verificar si el usuario pertenece a algún grupo
  SELECT 
    'Usuario pertenece a grupos'::TEXT,
    CASE WHEN user_groups IS NOT NULL AND array_length(user_groups, 1) > 0 THEN TRUE ELSE FALSE END,
    CASE WHEN user_groups IS NOT NULL AND array_length(user_groups, 1) > 0 
         THEN 'El usuario pertenece a los grupos: ' || array_to_string(user_groups, ', ')
         ELSE 'El usuario no pertenece a ningún grupo' END;
  
  -- Verificar si el usuario tiene permisos
  RETURN QUERY
  SELECT 
    'Usuario tiene permisos'::TEXT,
    CASE WHEN user_permissions IS NOT NULL AND array_length(user_permissions, 1) > 0 THEN TRUE ELSE FALSE END,
    CASE WHEN user_permissions IS NOT NULL AND array_length(user_permissions, 1) > 0 
         THEN 'El usuario tiene los permisos: ' || array_to_string(user_permissions, ', ')
         ELSE 'El usuario no tiene permisos asignados' END;
  
  -- Verificar permisos específicos
  RETURN QUERY
  SELECT 
    'Permiso: Ver Expresiones'::TEXT,
    user_has_permission(test_user_id, 'expressions', 'view'),
    CASE WHEN user_has_permission(test_user_id, 'expressions', 'view') 
         THEN 'El usuario puede ver expresiones'
         ELSE 'El usuario NO puede ver expresiones' END;
  
  RETURN QUERY
  SELECT 
    'Permiso: Gestionar Expresiones'::TEXT,
    user_has_permission(test_user_id, 'expressions', 'manage'),
    CASE WHEN user_has_permission(test_user_id, 'expressions', 'manage') 
         THEN 'El usuario puede gestionar expresiones'
         ELSE 'El usuario NO puede gestionar expresiones' END;
  
  RETURN QUERY
  SELECT 
    'Permiso: Ver Usuarios'::TEXT,
    user_has_permission(test_user_id, 'users', 'view'),
    CASE WHEN user_has_permission(test_user_id, 'users', 'view') 
         THEN 'El usuario puede ver usuarios'
         ELSE 'El usuario NO puede ver usuarios' END;
  
  RETURN QUERY
  SELECT 
    'Permiso: Gestionar Usuarios'::TEXT,
    user_has_permission(test_user_id, 'users', 'manage'),
    CASE WHEN user_has_permission(test_user_id, 'users', 'manage') 
         THEN 'El usuario puede gestionar usuarios'
         ELSE 'El usuario NO puede gestionar usuarios' END;
  
  RETURN QUERY
  SELECT 
    'Es Administrador'::TEXT,
    is_admin(test_user_id),
    CASE WHEN is_admin(test_user_id) 
         THEN 'El usuario es administrador'
         ELSE 'El usuario NO es administrador' END;
END;
$$;

-- Asegurar que la función sea accesible para usuarios autenticados
GRANT EXECUTE ON FUNCTION check_group_based_permissions(UUID) TO authenticated;
