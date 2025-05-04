-- Insertar el permiso para ver la auditoría si no existe
INSERT INTO permissions (resource, action, name, description)
VALUES 
    ('audit_trail', 'view', 'Ver Auditoría', 'Permite ver los registros de auditoría del sistema'),
    ('audit_trail', 'manage', 'Administrar Auditoría', 'Permite administrar los registros de auditoría del sistema')
ON CONFLICT (resource, action) DO NOTHING;

-- Asignar el permiso al grupo de administradores
INSERT INTO group_permissions (group_id, permission_id)
SELECT 
    g.id, 
    p.id
FROM 
    groups g, 
    permissions p
WHERE 
    g.name = 'admin' AND 
    p.resource = 'audit_trail' AND 
    p.action IN ('view', 'manage') AND
    NOT EXISTS (
        SELECT 1 
        FROM group_permissions gp 
        WHERE gp.group_id = g.id AND gp.permission_id = p.id
    );
