-- CareCompass — explicit EXECUTE grants on the RPC surface
-- Run order: 5
--
-- CREATE FUNCTION grants EXECUTE to PUBLIC by default, so the earlier
-- `GRANT ... TO authenticated` lines never actually narrowed anything: both
-- RPCs were reachable by anon through /rest/v1/rpc. Revoke first, then grant.

REVOKE EXECUTE ON FUNCTION public.booked_slots() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_access(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;

-- Deliberate: availability is public information. The function returns
-- doctor_slug + at and nothing else, and signed-out visitors need it so the
-- landing page and clinician profiles do not offer slots that are already gone.
GRANT EXECUTE ON FUNCTION public.booked_slots() TO anon, authenticated;

-- Writes auth.uid() into a NOT NULL column, so an anon call could only ever
-- error. No reason to leave it reachable.
GRANT EXECUTE ON FUNCTION public.log_access(TEXT, TEXT) TO authenticated;

-- handle_new_user() and set_updated_at() are trigger functions: they run as
-- the table owner and are never called over the API.
