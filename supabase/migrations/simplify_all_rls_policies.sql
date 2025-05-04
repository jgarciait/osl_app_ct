-- Script para actualizar todas las políticas RLS a "true" para usuarios autenticados

-- 1. Actualizar políticas para profiles
ALTER POLICY "Select Own Profile" ON "public"."profiles" TO authenticated USING (true);
ALTER POLICY "Delete Own Profile" ON "public"."profiles" TO authenticated USING (true);
ALTER POLICY "Update Own Profile" ON "public"."profiles" TO authenticated USING (true) WITH CHECK (true);
ALTER POLICY "Insert Own Profile" ON "public"."profiles" TO authenticated WITH CHECK (true);

-- 2. Actualizar políticas para user_groups
ALTER POLICY "Users can view their own groups" ON "public"."user_groups" TO authenticated USING (true);
ALTER POLICY "Users can insert their own groups" ON "public"."user_groups" TO authenticated WITH CHECK (true);
ALTER POLICY "Users can update their own groups" ON "public"."user_groups" TO authenticated USING (true) WITH CHECK (true);
ALTER POLICY "Users can delete their own groups" ON "public"."user_groups" TO authenticated USING (true);

-- 3. Actualizar políticas para groups
ALTER POLICY "Users can view groups" ON "public"."groups" TO authenticated USING (true);
ALTER POLICY "Users can insert groups" ON "public"."groups" TO authenticated WITH CHECK (true);
ALTER POLICY "Users can update groups" ON "public"."groups" TO authenticated USING (true) WITH CHECK (true);
ALTER POLICY "Users can delete groups" ON "public"."groups" TO authenticated USING (true);

-- 4. Actualizar políticas para permissions
ALTER POLICY "Users can view permissions" ON "public"."permissions" TO authenticated USING (true);
ALTER POLICY "Users can insert permissions" ON "public"."permissions" TO authenticated WITH CHECK (true);
ALTER POLICY "Users can update permissions" ON "public"."permissions" TO authenticated USING (true) WITH CHECK (true);
ALTER POLICY "Users can delete permissions" ON "public"."permissions" TO authenticated USING (true);

-- 5. Actualizar políticas para group_permissions
ALTER POLICY "Users can view group permissions" ON "public"."group_permissions" TO authenticated USING (true);
ALTER POLICY "Users can insert group permissions" ON "public"."group_permissions" TO authenticated WITH CHECK (true);
ALTER POLICY "Users can update group permissions" ON "public"."group_permissions" TO authenticated USING (true) WITH CHECK (true);
ALTER POLICY "Users can delete group permissions" ON "public"."group_permissions" TO authenticated USING (true);

-- 6. Actualizar políticas para expresiones
ALTER POLICY "Users can view expresiones" ON "public"."expresiones" TO authenticated USING (true);
ALTER POLICY "Users can insert expresiones" ON "public"."expresiones" TO authenticated WITH CHECK (true);
ALTER POLICY "Users can update expresiones" ON "public"."expresiones" TO authenticated USING (true) WITH CHECK (true);
ALTER POLICY "Users can delete expresiones" ON "public"."expresiones" TO authenticated USING (true);

-- 7. Actualizar políticas para expresion_comites
ALTER POLICY "Users can view expresion_comites" ON "public"."expresion_comites" TO authenticated USING (true);
ALTER POLICY "Users can insert expresion_comites" ON "public"."expresion_comites" TO authenticated WITH CHECK (true);
ALTER POLICY "Users can update expresion_comites" ON "public"."expresion_comites" TO authenticated USING (true) WITH CHECK (true);
ALTER POLICY "Users can delete expresion_comites" ON "public"."expresion_comites" TO authenticated USING (true);

-- 8. Actualizar políticas para documentos
ALTER POLICY "Users can view documentos" ON "public"."documentos" TO authenticated USING (true);
ALTER POLICY "Users can insert documentos" ON "public"."documentos" TO authenticated WITH CHECK (true);
ALTER POLICY "Users can update documentos" ON "public"."documentos" TO authenticated USING (true) WITH CHECK (true);
ALTER POLICY "Users can delete documentos" ON "public"."documentos" TO authenticated USING (true);

-- 9. Actualizar políticas para documento_etiquetas
ALTER POLICY "Users can view documento_etiquetas" ON "public"."documento_etiquetas" TO authenticated USING (true);
ALTER POLICY "Users can insert documento_etiquetas" ON "public"."documento_etiquetas" TO authenticated WITH CHECK (true);
ALTER POLICY "Users can update documento_etiquetas" ON "public"."documento_etiquetas" TO authenticated USING (true) WITH CHECK (true);
ALTER POLICY "Users can delete documento_etiquetas" ON "public"."documento_etiquetas" TO authenticated USING (true);

-- 10. Actualizar políticas para etiquetas
ALTER POLICY "Users can view etiquetas" ON "public"."etiquetas" TO authenticated USING (true);
ALTER POLICY "Users can insert etiquetas" ON "public"."etiquetas" TO authenticated WITH CHECK (true);
ALTER POLICY "Users can update etiquetas" ON "public"."etiquetas" TO authenticated USING (true) WITH CHECK (true);
ALTER POLICY "Users can delete etiquetas" ON "public"."etiquetas" TO authenticated USING (true);

-- 11. Actualizar políticas para invitations
ALTER POLICY "Users can view invitations" ON "public"."invitations" TO authenticated USING (true);
ALTER POLICY "Users can insert invitations" ON "public"."invitations" TO authenticated WITH CHECK (true);
ALTER POLICY "Users can update invitations" ON "public"."invitations" TO authenticated USING (true) WITH CHECK (true);
ALTER POLICY "Users can delete invitations" ON "public"."invitations" TO authenticated USING (true);

-- 12. Actualizar políticas para temas
ALTER POLICY "Users can view temas" ON "public"."temas" TO authenticated USING (true);
ALTER POLICY "Users can insert temas" ON "public"."temas" TO authenticated WITH CHECK (true);
ALTER POLICY "Users can update temas" ON "public"."temas" TO authenticated USING (true) WITH CHECK (true);
ALTER POLICY "Users can delete temas" ON "public"."temas" TO authenticated USING (true);

-- 13. Actualizar políticas para comites
ALTER POLICY "Users can view comites" ON "public"."comites" TO authenticated USING (true);
ALTER POLICY "Users can insert comites" ON "public"."comites" TO authenticated WITH CHECK (true);
ALTER POLICY "Users can update comites" ON "public"."comites" TO authenticated USING (true) WITH CHECK (true);
ALTER POLICY "Users can delete comites" ON "public"."comites" TO authenticated USING (true);

-- 14. Actualizar políticas para clasificaciones
ALTER POLICY "Users can view clasificaciones" ON "public"."clasificaciones" TO authenticated USING (true);
ALTER POLICY "Users can insert clasificaciones" ON "public"."clasificaciones" TO authenticated WITH CHECK (true);
ALTER POLICY "Users can update clasificaciones" ON "public"."clasificaciones" TO authenticated USING (true) WITH CHECK (true);
ALTER POLICY "Users can delete clasificaciones" ON "public"."clasificaciones" TO authenticated USING (true);

-- 15. Actualizar políticas para expresion_clasificaciones
ALTER POLICY "Users can view expresion_clasificaciones" ON "public"."expresion_clasificaciones" TO authenticated USING (true);
ALTER POLICY "Users can insert expresion_clasificaciones" ON "public"."expresion_clasificaciones" TO authenticated WITH CHECK (true);
ALTER POLICY "Users can update expresion_clasificaciones" ON "public"."expresion_clasificaciones" TO authenticated USING (true) WITH CHECK (true);
ALTER POLICY "Users can delete expresion_clasificaciones" ON "public"."expresion_clasificaciones" TO authenticated USING (true);

-- 16. Actualizar políticas para secuencia
ALTER POLICY "Users can view secuencia" ON "public"."secuencia" TO authenticated USING (true);
ALTER POLICY "Users can update secuencia" ON "public"."secuencia" TO authenticated USING (true) WITH CHECK (true);

-- Script para verificar si alguna política falta o da error
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT 
            schemaname, 
            tablename, 
            policyname
        FROM 
            pg_policies 
        WHERE 
            schemaname = 'public'
        ORDER BY 
            tablename, policyname
    LOOP
        RAISE NOTICE 'Política: %.%.%', 
            policy_record.schemaname, 
            policy_record.tablename, 
            policy_record.policyname;
    END LOOP;
END $$;
