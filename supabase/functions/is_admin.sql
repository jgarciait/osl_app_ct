-- Función mejorada para verificar si un usuario es administrador
-- Esta versión evita la recursión infinita al no usar políticas RLS dentro de la función
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Importante: se ejecuta con los privilegios del creador
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Consulta directa a la tabla profiles sin pasar por RLS
  -- Esto evita la recursión infinita
  SELECT role INTO user_role
  FROM profiles
  WHERE id = user_id;
  
  -- Verificar si el rol es 'admin'
  RETURN user_role = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, devolver false por seguridad
    RETURN false;
END;
$$;

-- Asegurar que la función sea accesible para usuarios autenticados
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
