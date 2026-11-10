-- IDLY database schema. Run this in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  code text not null unique,
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio text check (bio is null or char_length(bio) <= 500),
  avatar_url text,
  is_public boolean not null default true,
  allow_messages boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_code text not null,
  body text not null check (char_length(body) between 1 and 3000),
  status text not null default 'request' check (status in ('request','accepted','blocked')),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  profile_code text not null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;

create policy "Public profiles visible, owners see own" on public.profiles for select using (is_public or auth.uid() = user_id);
create policy "Users create own profile" on public.profiles for insert with check (auth.uid() = user_id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own profile" on public.profiles for delete using (auth.uid() = user_id);

create policy "Follow relationships visible to participants" on public.follows for select using (auth.uid() = follower_id or auth.uid() = following_id);
create policy "Users follow others" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users unfollow" on public.follows for delete using (auth.uid() = follower_id);

create policy "Sender can create message request" on public.messages for insert with check (auth.uid() = sender_id);
create policy "Participants can read messages" on public.messages for select using (
  auth.uid() = sender_id or exists (
    select 1 from public.profiles p where p.code = recipient_code and p.user_id = auth.uid()
  )
);
create policy "Recipient can update request status" on public.messages for update using (
  exists (select 1 from public.profiles p where p.code = recipient_code and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.profiles p where p.code = recipient_code and p.user_id = auth.uid())
);

create policy "Users read own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications" on public.notifications for update using (auth.uid() = user_id);
create policy "Users submit reports" on public.reports for insert with check (auth.uid() = reporter_id);
create policy "Users read own reports" on public.reports for select using (auth.uid() = reporter_id);

-- IMPORTANT: Admin moderation should use a server-side service role or a dedicated
-- database function. Never expose SUPABASE_SERVICE_ROLE_KEY in browser code.
