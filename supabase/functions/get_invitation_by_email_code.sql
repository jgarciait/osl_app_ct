CREATE OR REPLACE FUNCTION get_invitation_by_email_code(p_email TEXT, p_code TEXT)
RETURNS SETOF invitations
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM invitations 
  WHERE email = p_email 
  AND invitation_code = p_code;
$$;
