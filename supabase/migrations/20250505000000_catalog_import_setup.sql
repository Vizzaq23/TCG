-- Catalog import support: unique card_number for upserts, drop placeholder seeds.

-- Remove MVP placeholder cards (safe: only matches demo image URLs).
delete from public.cards
where image_url like '%placehold.co%';

-- Enforce one row per card ID (e.g. OP01-001, OP01-001_p1).
create unique index if not exists cards_card_number_unique_idx
  on public.cards (card_number)
  where card_number is not null;
