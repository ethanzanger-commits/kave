-- Move everyone to preset cities and remove neighborhood detail. Safe to run more than once.
update profile p set city = x.c, neighborhood = x.c from (
  select "userId", case
    when c0 = 'Other in Israel' then 'Other in Israel'
    when s like '%jerusalem%' then 'Jerusalem'
    when s like '%tel aviv%' or s like '%yafo%' or s like '%jaffa%' then 'Tel Aviv-Yafo'
    when s like '%haifa%' then 'Haifa'
    when s like '%beer sheva%' or s like '%beersheba%' or s like '%be''er sheva%' then 'Beer Sheva'
    when s like '%rishon%' then 'Rishon LeZion'
    when s like '%petah tikva%' or s like '%petach tikva%' or s like '%petah tiqva%' then 'Petah Tikva'
    when s like '%netanya%' then 'Netanya'
    when s like '%ashdod%' then 'Ashdod'
    when s like '%ramat gan%' then 'Ramat Gan'
    when s like '%herzliya%' or s like '%herzlia%' then 'Herzliya'
    when s like '%ra''anana%' or s like '%raanana%' then 'Ra''anana'
    when s like '%kfar saba%' or s like '%kfar sava%' then 'Kfar Saba'
    when s like '%modi''in%' or s like '%modiin%' then 'Modi''in'
    when s like '%beit shemesh%' then 'Beit Shemesh'
    when s like '%rehovot%' then 'Rehovot'
    when s like '%holon%' then 'Holon'
    when s like '%bat yam%' then 'Bat Yam'
    when s like '%hod hasharon%' then 'Hod HaSharon'
    when s like '%givatayim%' then 'Givatayim'
    when s like '%nazareth%' then 'Nazareth'
    when s like '%tiberias%' then 'Tiberias'
    when s like '%eilat%' then 'Eilat'
    else null end as c
  from (select "userId", city as c0, lower(coalesce(city, '') || ' ' || coalesce(neighborhood, '')) as s from profile) y
) x where p."userId" = x."userId";
