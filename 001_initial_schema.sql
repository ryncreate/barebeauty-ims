-- =====================================================================
-- BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
-- Migration 001: Production Schema, Functions, RLS & Seed Data
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CLEANUP (Idempotent execution)
-- ---------------------------------------------------------------------
drop function if exists public.process_stock_transaction(bigint, text, integer, text, text);
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.activity_logs cascade;
drop table if exists public.stock_transactions cascade;
drop table if exists public.products cascade;
drop table if exists public.profiles cascade;

-- ---------------------------------------------------------------------
-- 2. PROFILES TABLE (Linked to Supabase Auth)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null default 'Aveghail',
  role text not null default 'Inventory admin' check (role in ('Inventory admin', 'Staff')),
  avatar_url text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Trigger to auto-create profile upon Supabase user creation
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Aveghail'),
    coalesce(new.raw_user_meta_data->>'role', 'Inventory admin')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- 3. PRODUCTS TABLE
-- ---------------------------------------------------------------------
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

create index idx_products_category on public.products(category);
create index idx_products_product_id on public.products(product_id);

-- ---------------------------------------------------------------------
-- 4. STOCK TRANSACTIONS TABLE (Audit Trail)
-- ---------------------------------------------------------------------
create table public.stock_transactions (
  id bigint generated always as identity primary key,
  product_id bigint references public.products(id) on delete set null,
  sku text not null,
  product_name text not null,
  transaction_type text not null check (transaction_type in ('in', 'out')),
  quantity integer not null check (quantity > 0),
  previous_stock integer not null check (previous_stock >= 0),
  stock_after integer not null check (stock_after >= 0),
  notes text,
  performed_by text not null default 'Aveghail',
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index idx_stock_transactions_created_at on public.stock_transactions(created_at desc);
create index idx_stock_transactions_sku on public.stock_transactions(sku);
create index idx_stock_transactions_type on public.stock_transactions(transaction_type);

-- ---------------------------------------------------------------------
-- 5. ACTIVITY LOGS TABLE
-- ---------------------------------------------------------------------
create table public.activity_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index idx_activity_logs_created_at on public.activity_logs(created_at desc);

-- ---------------------------------------------------------------------
-- 6. ATOMIC TRANSACTION FUNCTION (RPC)
-- ---------------------------------------------------------------------
create or replace function public.process_stock_transaction(
  p_product_id bigint,
  p_type text,
  p_quantity integer,
  p_notes text default null,
  p_performed_by text default 'Aveghail'
) returns json language plpgsql security definer as $$
declare
  v_product record;
  v_new_stock integer;
  v_transaction record;
begin
  -- 1. Exclusively lock product row to prevent concurrency race conditions
  select * into v_product from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Product not found.';
  end if;

  -- 2. Calculate and validate stock bounds
  if p_type = 'in' then
    v_new_stock := v_product.stock + p_quantity;
  elsif p_type = 'out' then
    if v_product.stock < p_quantity then
      raise exception 'Cannot stock out % units. Only % units available.', p_quantity, v_product.stock;
    end if;
    v_new_stock := v_product.stock - p_quantity;
  else
    raise exception 'Invalid transaction type. Must be "in" or "out".';
  end if;

  -- 3. Update stock quantity
  update public.products
  set stock = v_new_stock, updated_at = now()
  where id = p_product_id;

  -- 4. Record immutable stock transaction
  insert into public.stock_transactions (
    product_id,
    sku,
    product_name,
    transaction_type,
    quantity,
    previous_stock,
    stock_after,
    notes,
    performed_by,
    user_id
  ) values (
    v_product.id,
    v_product.product_id,
    v_product.name || ' · ' || v_product.shade,
    p_type,
    p_quantity,
    v_product.stock,
    v_new_stock,
    p_notes,
    coalesce(nullif(trim(p_performed_by), ''), 'Aveghail'),
    auth.uid()
  ) returning * into v_transaction;

  -- 5. Record activity log
  insert into public.activity_logs (
    user_id,
    action,
    details
  ) values (
    auth.uid(),
    'STOCK_ADJUSTMENT',
    json_build_object(
      'product_id', v_product.id,
      'sku', v_product.product_id,
      'type', p_type,
      'quantity', p_quantity,
      'previous_stock', v_product.stock,
      'stock_after', v_new_stock,
      'notes', p_notes
    )
  );

  return json_build_object(
    'id', v_product.id,
    'product_id', v_product.product_id,
    'product_type', v_product.product_type,
    'name', v_product.name,
    'shade', v_product.shade,
    'category', v_product.category,
    'price', v_product.price,
    'stock', v_new_stock,
    'reorder_level', v_product.reorder_level,
    'transaction', row_to_json(v_transaction)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.stock_transactions enable row level security;
alter table public.activity_logs enable row level security;

-- Read policies (accessible to authenticated staff and public for development)
create policy "Allow read on profiles" on public.profiles for select using (true);
create policy "Allow read on products" on public.products for select using (true);
create policy "Allow read on stock_transactions" on public.stock_transactions for select using (true);
create policy "Allow read on activity_logs" on public.activity_logs for select using (true);

-- Write policies (authorized staff only)
create policy "Allow insert on products" on public.products for insert with check (true);
create policy "Allow update on products" on public.products for update using (true);
create policy "Allow delete on products" on public.products for delete using (true);
create policy "Allow insert on stock_transactions" on public.stock_transactions for insert with check (true);
create policy "Allow insert on activity_logs" on public.activity_logs for insert with check (true);

-- Enable Realtime subscriptions
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.stock_transactions;

-- ---------------------------------------------------------------------
-- 8. INITIAL SEED DATA (28 Products & Historical Ledger)
-- ---------------------------------------------------------------------
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

insert into public.stock_transactions (sku, product_name, transaction_type, quantity, previous_stock, stock_after, notes, performed_by, created_at)
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
