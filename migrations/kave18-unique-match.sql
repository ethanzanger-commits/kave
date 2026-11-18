-- Stops two simultaneous "yes" swipes from creating two matches for the same pair. Safe to run more than once.
-- STEP 1 (read-only): if this returns rows, the pair already has duplicate matches and step 2 will skip itself:
--   select least(a,b) as p1, greatest(a,b) as p2, count(*) from match group by 1,2 having count(*) > 1;
-- STEP 2: creates the index only when there are no duplicates. Nothing is deleted or changed.
do $$ begin
  create unique index if not exists match_pair_uq on match (least(a, b), greatest(a, b));
exception when unique_violation then
  raise notice 'Duplicate matches exist, so the unique index was NOT created. Run the step 1 query, merge the duplicates, then run this script again.';
end $$;
