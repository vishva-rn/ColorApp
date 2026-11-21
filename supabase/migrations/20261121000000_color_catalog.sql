create table public.catalog_categories (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_-]*$'),
  label text not null unique check (length(trim(label)) > 0),
  image_path text,
  sort_order integer not null default 0,
  is_published boolean not null default true
);

create table public.catalog_drawings (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_-]*$'),
  title text not null check (length(trim(title)) > 0),
  category_id text not null references public.catalog_categories (id),
  outline_path text,
  size numeric check (size > 0),
  line_width numeric check (line_width > 0),
  palette jsonb not null check (jsonb_typeof(palette) = 'array' and jsonb_array_length(palette) > 0),
  regions jsonb not null check (jsonb_typeof(regions) = 'array' and jsonb_array_length(regions) > 0),
  sort_order integer not null default 0,
  is_published boolean not null default true
);

create table public.catalog_drawing_categories (
  drawing_id text not null references public.catalog_drawings (id) on delete cascade,
  category_id text not null references public.catalog_categories (id) on delete cascade,
  primary key (drawing_id, category_id)
);

alter table public.catalog_categories enable row level security;
alter table public.catalog_drawings enable row level security;
alter table public.catalog_drawing_categories enable row level security;

revoke all on public.catalog_categories, public.catalog_drawings, public.catalog_drawing_categories
  from public, anon, authenticated;
grant select on public.catalog_categories, public.catalog_drawings, public.catalog_drawing_categories
  to anon, authenticated;
grant all on public.catalog_categories, public.catalog_drawings, public.catalog_drawing_categories
  to service_role;

create policy "Read published categories" on public.catalog_categories
  for select to anon, authenticated using (is_published);
create policy "Read published drawings" on public.catalog_drawings
  for select to anon, authenticated using (
    is_published and exists (select 1 from public.catalog_categories c where c.id = category_id)
  );
create policy "Read published drawing categories" on public.catalog_drawing_categories
  for select to anon, authenticated using (
    exists (select 1 from public.catalog_drawings d where d.id = drawing_id)
    and exists (select 1 from public.catalog_categories c where c.id = category_id)
  );

create function public.get_color_catalog()
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

revoke execute on function public.get_color_catalog() from public;
grant execute on function public.get_color_catalog() to anon, authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('color-catalog', 'color-catalog', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']);
