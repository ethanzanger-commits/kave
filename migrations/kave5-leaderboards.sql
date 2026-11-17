-- Who's new + monthly leaderboards. Safe to run more than once.
alter table profile add column if not exists "completedAt" timestamp;
update profile set "completedAt" = "updatedAt" where "ageOk" and "completedAt" is null;
create table if not exists monthly_winner (month text not null, category text not null, "userId" text not null, count int not null, at timestamp default now(), primary key (month, category));
create index if not exists profile_completed_idx on profile ("completedAt");
