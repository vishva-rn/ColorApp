alter table public.catalog_drawings
  add column added_at timestamptz,
  add column completed_count integer not null default 0 check (completed_count >= 0);

-- The original catalog was seeded as a batch. Its Storage import records the batch date.
update public.catalog_drawings
set added_at = coalesce((
  select min(created_at) from storage.objects where bucket_id = 'color-catalog'
), now());

alter table public.catalog_drawings
  alter column added_at set default now(),
  alter column added_at set not null;

create table public.catalog_drawing_completions (
  drawing_id text not null references public.catalog_drawings (id) on delete cascade,
  installation_id uuid not null,
  completed_at timestamptz not null default now(),
  primary key (drawing_id, installation_id)
);

alter table public.catalog_drawing_completions enable row level security;
revoke all on public.catalog_drawing_completions from public, anon, authenticated;

create function public.record_catalog_completions(p_installation_id uuid, p_drawing_ids text[])
returns text[]
language sql
security definer
set search_path = ''
as $$
  with eligible as materialized (
    select d.id
    from public.catalog_drawings d
    join public.catalog_categories c on c.id = d.category_id
    where p_installation_id is not null
      and cardinality(p_drawing_ids) between 1 and 100
      and d.id = any(p_drawing_ids)
      and d.is_published and c.is_published
    order by d.id
    for no key update of d
  ),
  inserted as (
    insert into public.catalog_drawing_completions (drawing_id, installation_id)
    select id, p_installation_id from eligible
    on conflict do nothing
    returning drawing_id
  ),
  counted as (
    update public.catalog_drawings d
    set completed_count = d.completed_count + 1
    from inserted i
    where d.id = i.drawing_id
  )
  select coalesce(array_agg(id order by id), array[]::text[]) from eligible;
$$;

revoke execute on function public.record_catalog_completions(uuid, text[]) from public;
grant execute on function public.record_catalog_completions(uuid, text[]) to anon, authenticated;

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
    ), '[]'::jsonb)
  );
$$;

