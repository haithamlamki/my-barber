-- migration: 0010_public_location_read.sql
-- summary: Let the anonymous booking flow read an active shop's public profile
--   (name, address, working hours) so the guest slot picker can compute availability.
--   A barber shop's name/address/hours are inherently public; sensitive operations
--   stay behind the owner-manage policy. RLS policies are permissive (OR'd), so this
--   only widens SELECT for active rows and leaves the member/owner policies intact.
-- rollback: drop policy locations_select_public on public.locations;

create policy locations_select_public on public.locations
  for select
  using (status = 'active');
