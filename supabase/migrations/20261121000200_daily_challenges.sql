create table public.daily_challenges (
  challenge_date date primary key,
  title text not null check (length(trim(title)) > 0),
  size integer not null default 300 check (size > 0),
  palette jsonb not null check (jsonb_typeof(palette) = 'array' and jsonb_array_length(palette) > 0),
  regions jsonb not null check (jsonb_typeof(regions) = 'array' and jsonb_array_length(regions) > 0),
  is_published boolean not null default true
);

alter table public.daily_challenges enable row level security;
revoke all on public.daily_challenges from public, anon, authenticated;
grant select on public.daily_challenges to anon, authenticated;
grant all on public.daily_challenges to service_role;

create policy "Read published daily challenges" on public.daily_challenges
  for select to anon, authenticated using (is_published);

create or replace function public.get_color_catalog()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'label', c.label, 'image_path', c.image_path
      ) order by c.sort_order, c.id)
      from public.catalog_categories c
      where c.is_published
    ), '[]'::jsonb),
    'drawings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id, 'title', d.title, 'category_id', d.category_id,
        'outline_path', d.outline_path, 'size', d.size, 'line_width', d.line_width,
        'palette', d.palette, 'regions', d.regions,
        'added_at', d.added_at, 'completed_count', d.completed_count,
        'extra_category_ids', coalesce((
          select jsonb_agg(link.category_id order by link.category_id)
          from public.catalog_drawing_categories link
          where link.drawing_id = d.id
        ), '[]'::jsonb)
      ) order by d.sort_order, d.id)
      from public.catalog_drawings d
      join public.catalog_categories c on c.id = d.category_id
      where d.is_published and c.is_published
    ), '[]'::jsonb),
    'daily_challenges', coalesce((
      select jsonb_agg(jsonb_build_object(
        'challenge_date', challenge_date, 'title', title,
        'size', size, 'palette', palette, 'regions', regions
      ) order by challenge_date)
      from public.daily_challenges
      where is_published
    ), '[]'::jsonb)
  );
$$;

