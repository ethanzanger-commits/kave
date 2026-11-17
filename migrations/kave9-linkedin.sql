-- Safe to run more than once. Probably already exists; this just makes sure.
alter table profile add column if not exists "linkedinUrl" text;
