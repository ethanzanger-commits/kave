-- "What I'm working on" prompt. Safe to run more than once.
alter table profile add column if not exists "workingOn" text;
