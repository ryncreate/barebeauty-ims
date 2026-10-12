-- =====================================================================
-- BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
-- Supabase PostgreSQL Database Schema & Seed Data
-- =====================================================================

-- 1. CLEANUP (Optional / Idempotent setup)
drop function if exists public.record_stock_movement(bigint, text, integer, text, text);
drop table if exists public.stock_movements cascade;
drop table if exists public.products cascade;
drop table if exists public.profiles cascade;

-- 2. PROFILES TABLE (Linked with Supabase Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null default 'Aveghail',
  role text not null default 'Inventory admin',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 3. PRODUCTS TABLE
create table public.products (
  id bigint generated always as identity primary key,
  product_id text unique not null,
  product_type text not null,
  name text not null,
  shade text not null,
  category text not null check (category in ('Eyes', 'Lips', 'Face', 'Cheeks', 'Brows')),
  price numeric(10,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  reorder_level integer not null default 10 check (reorder_level >= 0),
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Index frequently filtered and sorted columns
create index idx_products_category on public.products(category);
create index idx_products_product_id on public.products(product_id);

-- 4. STOCK MOVEMENTS TABLE (Audit Trail)
create table public.stock_movements (
  id bigint generated always as identity primary key,
  product_ref_id bigint references public.products(id) on delete set null,
  product_id text not null,
  product_name text not null,
  type text not null check (type in ('in', 'out')),
  quantity integer not null check (quantity > 0),
  previous_stock integer not null,
  stock_after integer not null,
  note text,
  performed_by text not null default 'Aveghail',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Index history query filters
create index idx_stock_movements_created_at on public.stock_movements(created_at desc);
create index idx_stock_movements_product_id on public.stock_movements(product_id);
create index idx_stock_movements_type on public.stock_movements(type);

-- 5. ATOMIC STOCK MOVEMENT STORED PROCEDURE (RPC)
-- Handles stock adjustments and audit logging in a single atomic transaction
create or replace function public.record_stock_movement(
  p_product_id bigint,
  p_type text,
  p_quantity integer,
  p_note text default null,
  p_performed_by text default 'Aveghail'
) returns json language plpgsql security definer as $$
declare
  v_prod record;
  v_new_stock integer;
  v_entry record;
begin
  -- Lock row for update to prevent concurrent race conditions
  select * into v_prod from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Product not found.';
  end if;

  if p_type = 'in' then
    v_new_stock := v_prod.stock + p_quantity;
  elsif p_type = 'out' then
    if v_prod.stock < p_quantity then
      raise exception 'Only % units are in stock.', v_prod.stock;
    end if;
    v_new_stock := v_prod.stock - p_quantity;
  else
    raise exception 'Invalid movement type. Must be "in" or "out".';
  end if;

  -- Update product stock
  update public.products
  set stock = v_new_stock, updated_at = now()
  where id = p_product_id;

  -- Insert audit log record
  insert into public.stock_movements (
    product_ref_id,
    product_id,
    product_name,
    type,
    quantity,
    previous_stock,
    stock_after,
    note,
    performed_by
  ) values (
    v_prod.id,
    v_prod.product_id,
    v_prod.name || ' · ' || v_prod.shade,
    p_type,
    p_quantity,
    v_prod.stock,
    v_new_stock,
    p_note,
    coalesce(nullif(trim(p_performed_by), ''), 'Aveghail')
  ) returning * into v_entry;

  return json_build_object(
    'id', v_prod.id,
    'stock', v_new_stock,
    'product_id', v_prod.product_id,
    'name', v_prod.name,
    'shade', v_prod.shade,
    'category', v_prod.category,
    'price', v_prod.price,
    'reorder_level', v_prod.reorder_level,
    'movement', row_to_json(v_entry)
  );
end;
$$;

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.profiles enable row level security;

-- Policies allowing access (both authenticated staff and public anon for easy dev onboarding)
create policy "Allow all read on products" on public.products for select using (true);
create policy "Allow all insert on products" on public.products for insert with check (true);
create policy "Allow all update on products" on public.products for update using (true);
create policy "Allow all delete on products" on public.products for delete using (true);

create policy "Allow all read on stock_movements" on public.stock_movements for select using (true);
create policy "Allow all insert on stock_movements" on public.stock_movements for insert with check (true);

create policy "Allow all read on profiles" on public.profiles for select using (true);
create policy "Allow all insert on profiles" on public.profiles for insert with check (true);
create policy "Allow all update on profiles" on public.profiles for update using (true);

-- Enable Supabase Realtime for products and stock movements
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.stock_movements;

-- =====================================================================
-- 7. SEED DATA (Exact Bare Beauty Catalogue & History)
-- =====================================================================

insert into public.products (product_id, product_type, name, shade, category, price, stock, reorder_level)
values
  ('EYE-EL-001', 'Eyeliner', 'Liner', 'Black', 'Eyes', 199.00, 24, 10),
  ('EYE-MS-001', 'Mascara', 'Lash Up', 'Jet Black', 'Eyes', 249.00, 18, 10),
  ('EYE-ES-001', 'Eyeshadow', 'Eye Edit', 'Bingsu', 'Eyes', 399.00, 9, 10),
  ('EYE-ES-002', 'Eyeshadow', 'Eye Edit', 'Macaron', 'Eyes', 399.00, 15, 10),
  ('LIP-LG-001', 'Lip Gloss', 'Glass', 'Lychee', 'Lips', 150.00, 32, 10),
  ('LIP-LG-002', 'Lip Gloss', 'Glass', 'Coconut', 'Lips', 150.00, 0, 10),
  ('LIP-ML-001', 'Matte Lipstick', 'Plush', 'Brick', 'Lips', 199.00, 26, 10),
  ('LIP-ML-002', 'Matte Lipstick', 'Plush', 'Terracotta', 'Lips', 199.00, 7, 10),
  ('LIP-SL-001', 'Satin Lipstick', 'Satin', 'Mauve', 'Lips', 159.00, 20, 10),
  ('LIP-SL-002', 'Satin Lipstick', 'Satin', 'Berry', 'Lips', 159.00, 14, 10),
  ('FAC-ST-001', 'Skin Tint', 'Daily Tint', 'Pebble', 'Face', 399.00, 12, 10),
  ('FAC-ST-002', 'Skin Tint', 'Daily Tint', 'Sand', 'Face', 399.00, 16, 10),
  ('FAC-CN-001', 'Concealer', 'Base Cover', 'Beige', 'Face', 255.00, 22, 10),
  ('FAC-CN-002', 'Concealer', 'Base Cover', 'Almond', 'Face', 255.00, 5, 10),
  ('FAC-CT-001', 'Contour', 'Sculpt', 'Chestnut', 'Face', 299.00, 11, 10),
  ('FAC-CT-002', 'Contour', 'Sculpt', 'Cocoa', 'Face', 299.00, 19, 10),
  ('FAC-FP-001', 'Face Powder', 'Powder Rush', 'Translucent', 'Face', 275.00, 28, 10),
  ('FAC-FP-002', 'Face Powder', 'Powder Rush', 'Honey', 'Face', 275.00, 0, 10),
  ('CHK-BL-001', 'Blush', 'Milk Tint', 'Guava', 'Cheeks', 299.00, 30, 10),
  ('CHK-BL-002', 'Blush', 'Milk Tint', 'Strawberry', 'Cheeks', 299.00, 17, 10),
  ('CHK-PB-001', 'Powder Blush', 'Cheek Rush', 'Peach', 'Cheeks', 299.00, 8, 10),
  ('CHK-PB-002', 'Powder Blush', 'Cheek Rush', 'Apricot', 'Cheeks', 299.00, 21, 10),
  ('CHK-HL-001', 'Highlighter', 'Glow Rush', 'Champagne', 'Cheeks', 250.00, 13, 10),
  ('CHK-HL-002', 'Highlighter', 'Glow Rush', 'Opal', 'Cheeks', 250.00, 25, 10),
  ('BRW-EP-001', 'Eyebrow Pencil', 'Brow Pen', 'Espresso', 'Brows', 150.00, 34, 10),
  ('BRW-EP-002', 'Eyebrow Pencil', 'Brow Pen', 'Dark Brown', 'Brows', 150.00, 10, 10),
  ('BRW-BT-001', 'Brow Tint', 'Brow Tint', 'Taupe', 'Brows', 245.00, 15, 10),
  ('BRW-BL-001', 'Brow Laminator', 'Brow Set', 'Clear', 'Brows', 299.00, 6, 10);

-- Seed initial stock movements with past timestamps
insert into public.stock_movements (product_id, product_name, type, quantity, previous_stock, stock_after, note, performed_by, created_at)
values
  ('BRW-EP-001', 'Brow Pen · Espresso', 'in', 20, 0, 20, 'Initial stock', 'Aveghail', now() - interval '10 days'),
  ('CHK-PB-001', 'Cheek Rush · Peach', 'in', 15, 0, 15, 'Initial stock', 'Aveghail', now() - interval '10 days'),
  ('FAC-FP-002', 'Powder Rush · Honey', 'in', 9, 0, 9, 'Initial stock', 'Aveghail', now() - interval '9 days'),
  ('LIP-LG-002', 'Glass · Coconut', 'in', 12, 0, 12, 'Initial stock', 'Aveghail', now() - interval '8 days'),
  ('EYE-ES-001', 'Eye Edit · Bingsu', 'in', 15, 0, 15, 'Initial stock', 'Aveghail', now() - interval '7 days'),
  ('FAC-CN-002', 'Base Cover · Almond', 'in', 13, 0, 13, 'Initial stock', 'Aveghail', now() - interval '7 days'),
  ('CHK-PB-001', 'Cheek Rush · Peach', 'out', 7, 15, 8, null, 'Aveghail', now() - interval '5 days'),
  ('BRW-EP-001', 'Brow Pen · Espresso', 'in', 14, 20, 34, 'New shipment', 'Aveghail', now() - interval '4 days'),
  ('FAC-CN-002', 'Base Cover · Almond', 'out', 8, 13, 5, null, 'Aveghail', now() - interval '3 days'),
  ('FAC-FP-002', 'Powder Rush · Honey', 'out', 9, 9, 0, null, 'Aveghail', now() - interval '2 days'),
  ('LIP-LG-002', 'Glass · Coconut', 'out', 12, 12, 0, 'Sold out at pop-up', 'Aveghail', now() - interval '1 day'),
  ('EYE-ES-001', 'Eye Edit · Bingsu', 'out', 6, 15, 9, null, 'Aveghail', now());
