alter table public.daily_challenges
  add column catalog_drawing_id text references public.catalog_drawings(id) on delete set null;

update public.daily_challenges as challenge
set catalog_drawing_id = schedule.drawing_id
from (values
  (date '2026-11-21', 'room'),
  (date '2026-11-22', 'fox'),
  (date '2026-11-23', 'sakura_temple'),
  (date '2026-11-24', 'farm'),
  (date '2026-11-25', 'lake'),
  (date '2026-11-26', 'tea_party'),
  (date '2026-11-27', 'owl'),
  (date '2026-11-28', 'castle'),
  (date '2026-11-29', 'roses'),
  (date '2026-11-30', 'treehouse')
) as schedule(challenge_date, drawing_id)
where challenge.challenge_date = schedule.challenge_date;

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
        'catalog_drawing_id', catalog_drawing_id,
        'size', size, 'palette', palette, 'gradients', gradients, 'regions', regions
      ) order by challenge_date)
      from public.daily_challenges
      where is_published
    ), '[]'::jsonb)
  );
$$;
