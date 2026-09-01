REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION private.is_admin(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION private.is_staff(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION private.can_operate(uuid) FROM authenticated;