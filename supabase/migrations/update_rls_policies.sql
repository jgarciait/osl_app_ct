-- Actualizar políticas RLS para usar la función is_admin correctamente

-- 1. Actualizar política para profiles
ALTER POLICY "Select Own Profile" 
ON "public"."profiles"
TO authenticated
USING ((id = auth.uid()) OR is_admin(auth.uid()));

-- 2. Actualizar política para user_groups
ALTER POLICY "Users can view their own groups" 
ON "public"."user_groups"
TO authenticated
USING ((user_id = auth.uid()) OR is_admin(auth.uid()));

-- 3. Actualizar política para groups
ALTER POLICY "Users can view groups" 
ON "public"."groups"
TO authenticated
USING (true);

-- 4. Actualizar política para permissions
ALTER POLICY "Users can view permissions" 
ON "public"."permissions"
TO authenticated
USING (true);

-- 5. Actualizar política para group_permissions
ALTER POLICY "Users can view group permissions" 
ON "public"."group_permissions"
TO authenticated
USING (true);

-- Política para que los administradores puedan modificar cualquier registro
ALTER POLICY "Admins can modify any record" 
ON "public"."profiles"
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
