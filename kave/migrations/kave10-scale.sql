-- Faster People, search and Insights queries as the member count grows. Safe to run more than once.
create index if not exists profile_agecheck_idx on profile ("ageOk") where "ageOk";
create index if not exists profile_city_idx on profile (city);
create index if not exists swipe_from_idx on swipe ("fromId");
create index if not exists event_name_at_idx on event (name, at);
create index if not exists match_at_idx on match (at);
create index if not exists block_to_idx on block ("toId");
