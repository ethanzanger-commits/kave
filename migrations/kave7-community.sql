-- Homepage opt-in, public thank-yous, saved members, circles, phone notifications. Safe to run more than once.
alter table profile add column if not exists "showOnHome" boolean default false;
alter table thanks add column if not exists "isPublic" boolean default false, add column if not exists hidden boolean default false;
create table if not exists saved ("userId" text not null, "targetId" text not null, at timestamp default now(), primary key ("userId", "targetId"));
create table if not exists circle (slug text primary key, name text not null, blurb text, at timestamp default now());
create table if not exists circle_member ("circleSlug" text not null, "userId" text not null, at timestamp default now(), primary key ("circleSlug", "userId"));
create table if not exists push_sub (endpoint text primary key, "userId" text not null, p256dh text not null, auth text not null, at timestamp default now());
create index if not exists push_sub_user_idx on push_sub ("userId");
create index if not exists circle_member_user_idx on circle_member ("userId");
