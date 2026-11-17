-- One definition of a finished profile, used everywhere: photo, city, headline, about me, at least one skill, 18+ box, real (non-demo) account.
-- Same as the view from kave8-growth.sql. Safe to run more than once.
create or replace view complete_member as
select u.id, u.name, u.email, u.source, u."referredBy", u."createdAt", p."completedAt", p."invitedBy", p.city, p.headline
from "user" u join profile p on p."userId" = u.id
where p."ageOk" and not coalesce(p."isDemo", false) and u.id not like 'demo-%' and coalesce(p.about, '') <> '' and coalesce(p.headline, '') <> '' and coalesce(p.city, '') <> '' and u.image is not null and jsonb_array_length(coalesce(p.skills, '[]'::jsonb)) > 0;
