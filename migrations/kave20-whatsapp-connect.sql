-- Optional mutual WhatsApp connect. Two NEW tables only; nothing existing is changed.
-- Numbers live ONLY here (never in profile) and are readable only through lib/whatsapp.js after BOTH people consent.
-- Safe to run more than once. Run before deploying the matching code.
create table if not exists member_phone (
  "userId" text primary key,
  phone text not null,
  "updatedAt" timestamp default now()
);
create table if not exists whatsapp_consent (
  "matchId" text not null,
  "userId" text not null,
  status text not null check (status in ('shared', 'withdrawn')),
  at timestamp default now(),
  primary key ("matchId", "userId")
);
