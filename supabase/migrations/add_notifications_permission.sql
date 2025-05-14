-- Añadir el permiso de gestión de notificaciones si no existe
INSERT INTO public.permissions (name, description)
SELECT 'notifications.manage', 'Permite gestionar las notificaciones del sistema'
WHERE NOT EXISTS (
    SELECT 1 FROM public.permissions WHERE name = 'notifications.manage'
);

-- Asignar el permiso al grupo de administradores
INSERT INTO public.group_permissions (group_id, permission_id)
SELECT 
    g.id, 
    p.id
FROM 
    public.groups g,
    public.permissions p
WHERE 
    g.name = 'Administradores' 
    AND p.name = 'notifications.manage'
    AND NOT EXISTS (
        SELECT 1 
        FROM public.group_permissions 
        WHERE group_id = g.id AND permission_id = p.id
    );
