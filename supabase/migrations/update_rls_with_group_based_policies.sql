-- Actualizar políticas RLS para usar la clasificación por grupos

-- Función auxiliar para verificar si un usuario puede acceder a un recurso
CREATE OR REPLACE FUNCTION can_access_resource(resource_name TEXT, action_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  -- Los administradores siempre tienen acceso
  IF is_admin(auth.uid()) THEN
    RETURN TRUE;
  END IF;

  -- Verificar si el usuario tiene el permiso específico
  RETURN user_has_permission(auth.uid(), resource_name, action_name);
END;
$$;

-- Asegurar que la función sea accesible para usuarios autenticados
GRANT EXECUTE ON FUNCTION can_access_resource(TEXT, TEXT) TO authenticated;

-- 1. Actualizar políticas para profiles
DROP POLICY IF EXISTS "Select Own Profile" ON "public"."profiles";
CREATE POLICY "Select Own Profile" ON "public"."profiles"
  TO authenticated
  USING (
    id = auth.uid() OR 
    can_access_resource('users', 'view')
  );

DROP POLICY IF EXISTS "Update Own Profile" ON "public"."profiles";
CREATE POLICY "Update Own Profile" ON "public"."profiles"
  TO authenticated
  USING (
    id = auth.uid() OR 
    can_access_resource('users', 'manage')
  )
  WITH CHECK (
    id = auth.uid() OR 
    can_access_resource('users', 'manage')
  );

DROP POLICY IF EXISTS "Delete Own Profile" ON "public"."profiles";
CREATE POLICY "Delete Own Profile" ON "public"."profiles"
  TO authenticated
  USING (
    can_access_resource('users', 'manage')
  );

DROP POLICY IF EXISTS "Insert Own Profile" ON "public"."profiles";
CREATE POLICY "Insert Own Profile" ON "public"."profiles"
  TO authenticated
  WITH CHECK (
    can_access_resource('users', 'manage')
  );

-- 2. Actualizar políticas para expresiones
DROP POLICY IF EXISTS "Users can view expresiones" ON "public"."expresiones";
CREATE POLICY "Users can view expresiones" ON "public"."expresiones"
  TO authenticated
  USING (
    can_access_resource('expressions', 'view')
  );

DROP POLICY IF EXISTS "Users can insert expresiones" ON "public"."expresiones";
CREATE POLICY "Users can insert expresiones" ON "public"."expresiones"
  TO authenticated
  WITH CHECK (
    can_access_resource('expressions', 'manage')
  );

DROP POLICY IF EXISTS "Users can update expresiones" ON "public"."expresiones";
CREATE POLICY "Users can update expresiones" ON "public"."expresiones"
  TO authenticated
  USING (
    can_access_resource('expressions', 'manage')
  )
  WITH CHECK (
    can_access_resource('expressions', 'manage')
  );

DROP POLICY IF EXISTS "Users can delete expresiones" ON "public"."expresiones";
CREATE POLICY "Users can delete expresiones" ON "public"."expresiones"
  TO authenticated
  USING (
    can_access_resource('expressions', 'manage')
  );

-- 3. Actualizar políticas para grupos y permisos
DROP POLICY IF EXISTS "Users can view groups" ON "public"."groups";
CREATE POLICY "Users can view groups" ON "public"."groups"
  TO authenticated
  USING (
    can_access_resource('groups', 'view')
  );

DROP POLICY IF EXISTS "Users can manage groups" ON "public"."groups";
CREATE POLICY "Users can manage groups" ON "public"."groups"
  TO authenticated
  USING (
    can_access_resource('groups', 'manage')
  )
  WITH CHECK (
    can_access_resource('groups', 'manage')
  );

DROP POLICY IF EXISTS "Users can view permissions" ON "public"."permissions";
CREATE POLICY "Users can view permissions" ON "public"."permissions"
  TO authenticated
  USING (
    can_access_resource('permissions', 'view')
  );

DROP POLICY IF EXISTS "Users can manage permissions" ON "public"."permissions";
CREATE POLICY "Users can manage permissions" ON "public"."permissions"
  TO authenticated
  USING (
    can_access_resource('permissions', 'manage')
  )
  WITH CHECK (
    can_access_resource('permissions', 'manage')
  );

-- 4. Actualizar políticas para user_groups
DROP POLICY IF EXISTS "Users can view user_groups" ON "public"."user_groups";
CREATE POLICY "Users can view user_groups" ON "public"."user_groups"
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    can_access_resource('groups', 'view')
  );

DROP POLICY IF EXISTS "Users can manage user_groups" ON "public"."user_groups";
CREATE POLICY "Users can manage user_groups" ON "public"."user_groups"
  TO authenticated
  USING (
    can_access_resource('groups', 'manage')
  )
  WITH CHECK (
    can_access_resource('groups', 'manage')
  );

-- 5. Actualizar políticas para group_permissions
DROP POLICY IF EXISTS "Users can view group_permissions" ON "public"."group_permissions";
CREATE POLICY "Users can view group_permissions" ON "public"."group_permissions"
  TO authenticated
  USING (
    can_access_resource('permissions', 'view')
  );

DROP POLICY IF EXISTS "Users can manage group_permissions" ON "public"."group_permissions";
CREATE POLICY "Users can manage group_permissions" ON "public"."group_permissions"
  TO authenticated
  USING (
    can_access_resource('permissions', 'manage')
  )
  WITH CHECK (
    can_access_resource('permissions', 'manage')
  );

-- 6. Actualizar políticas para documentos
DROP POLICY IF EXISTS "Users can view documentos" ON "public"."documentos";
CREATE POLICY "Users can view documentos" ON "public"."documentos"
  TO authenticated
  USING (
    can_access_resource('expressions', 'view')
  );

DROP POLICY IF EXISTS "Users can manage documentos" ON "public"."documentos";
CREATE POLICY "Users can manage documentos" ON "public"."documentos"
  TO authenticated
  USING (
    can_access_resource('expressions', 'manage')
  )
  WITH CHECK (
    can_access_resource('expressions', 'manage')
  );

-- 7. Actualizar políticas para otras tablas relacionadas con expresiones
-- Expresion_comites
DROP POLICY IF EXISTS "Users can view expresion_comites" ON "public"."expresion_comites";
CREATE POLICY "Users can view expresion_comites" ON "public"."expresion_comites"
  TO authenticated
  USING (
    can_access_resource('expressions', 'view')
  );

DROP POLICY IF EXISTS "Users can manage expresion_comites" ON "public"."expresion_comites";
CREATE POLICY "Users can manage expresion_comites" ON "public"."expresion_comites"
  TO authenticated
  USING (
    can_access_resource('expressions', 'manage')
  )
  WITH CHECK (
    can_access_resource('expressions', 'manage')
  );

-- Comites
DROP POLICY IF EXISTS "Users can view comites" ON "public"."comites";
CREATE POLICY "Users can view comites" ON "public"."comites"
  TO authenticated
  USING (
    can_access_resource('expressions', 'view')
  );

DROP POLICY IF EXISTS "Users can manage comites" ON "public"."comites";
CREATE POLICY "Users can manage comites" ON "public"."comites"
  TO authenticated
  USING (
    can_access_resource('expressions', 'manage')
  )
  WITH CHECK (
    can_access_resource('expressions', 'manage')
  );

-- Temas
DROP POLICY IF EXISTS "Users can view temas" ON "public"."temas";
CREATE POLICY "Users can view temas" ON "public"."temas"
  TO authenticated
  USING (
    can_access_resource('expressions', 'view')
  );

DROP POLICY IF EXISTS "Users can manage temas" ON "public"."temas";
CREATE POLICY "Users can manage temas" ON "public"."temas"
  TO authenticated
  USING (
    can_access_resource('expressions', 'manage')
  )
  WITH CHECK (
    can_access_resource('expressions', 'manage')
  );

-- Clasificaciones
DROP POLICY IF EXISTS "Users can view clasificaciones" ON "public"."clasificaciones";
CREATE POLICY "Users can view clasificaciones" ON "public"."clasificaciones"
  TO authenticated
  USING (
    can_access_resource('expressions', 'view')
  );

DROP POLICY IF EXISTS "Users can manage clasificaciones" ON "public"."clasificaciones";
CREATE POLICY "Users can manage clasificaciones" ON "public"."clasificaciones"
  TO authenticated
  USING (
    can_access_resource('expressions', 'manage')
  )
  WITH CHECK (
    can_access_resource('expressions', 'manage')
  );

-- Expresion_clasificaciones
DROP POLICY IF EXISTS "Users can view expresion_clasificaciones" ON "public"."expresion_clasificaciones";
CREATE POLICY "Users can view expresion_clasificaciones" ON "public"."expresion_clasificaciones"
  TO authenticated
  USING (
    can_access_resource('expressions', 'view')
  );

DROP POLICY IF EXISTS "Users can manage expresion_clasificaciones" ON "public"."expresion_clasificaciones";
CREATE POLICY "Users can manage expresion_clasificaciones" ON "public"."expresion_clasificaciones"
  TO authenticated
  USING (
    can_access_resource('expressions', 'manage')
  )
  WITH CHECK (
    can_access_resource('expressions', 'manage')
  );

-- Etiquetas y documento_etiquetas
DROP POLICY IF EXISTS "Users can view etiquetas" ON "public"."etiquetas";
CREATE POLICY "Users can view etiquetas" ON "public"."etiquetas"
  TO authenticated
  USING (
    can_access_resource('expressions', 'view')
  );

DROP POLICY IF EXISTS "Users can manage etiquetas" ON "public"."etiquetas";
CREATE POLICY "Users can manage etiquetas" ON "public"."etiquetas"
  TO authenticated
  USING (
    can_access_resource('expressions', 'manage')
  )
  WITH CHECK (
    can_access_resource('expressions', 'manage')
  );

DROP POLICY IF EXISTS "Users can view documento_etiquetas" ON "public"."documento_etiquetas";
CREATE POLICY "Users can view documento_etiquetas" ON "public"."documento_etiquetas"
  TO authenticated
  USING (
    can_access_resource('expressions', 'view')
  );

DROP POLICY IF EXISTS "Users can manage documento_etiquetas" ON "public"."documento_etiquetas";
CREATE POLICY "Users can manage documento_etiquetas" ON "public"."documento_etiquetas"
  TO authenticated
  USING (
    can_access_resource('expressions', 'manage')
  )
  WITH CHECK (
    can_access_resource('expressions', 'manage')
  );

-- Invitaciones
DROP POLICY IF EXISTS "Users can view invitations" ON "public"."invitations";
CREATE POLICY "Users can view invitations" ON "public"."invitations"
  TO authenticated
  USING (
    can_access_resource('users', 'view')
  );

DROP POLICY IF EXISTS "Users can manage invitations" ON "public"."invitations";
CREATE POLICY "Users can manage invitations" ON "public"."invitations"
  TO authenticated
  USING (
    can_access_resource('users', 'manage')
  )
  WITH CHECK (
    can_access_resource('users', 'manage')
  );

-- Secuencia
DROP POLICY IF EXISTS "Users can view secuencia" ON "public"."secuencia";
CREATE POLICY "Users can view secuencia" ON "public"."secuencia"
  TO authenticated
  USING (
    can_access_resource('expressions', 'view')
  );

DROP POLICY IF EXISTS "Users can manage secuencia" ON "public"."secuencia";
CREATE POLICY "Users can manage secuencia" ON "public"."secuencia"
  TO authenticated
  USING (
    can_access_resource('expressions', 'manage')
  )
  WITH CHECK (
    can_access_resource('expressions', 'manage')
  );
