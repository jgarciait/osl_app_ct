CREATE OR REPLACE FUNCTION get_groups_by_department(department_id_param BIGINT)
RETURNS TABLE (id UUID) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT g.id
  FROM groups g
  JOIN departments_group dg ON g.id = dg.group_id
  WHERE dg.department_id = department_id_param;
END;
$$;
