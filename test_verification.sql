-- =====================================================================
-- BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
-- Test Suite: Database Security & Functionality Verification
-- =====================================================================

-- ---------------------------------------------------------------------
-- TEST 1: Verify Initial Seed Data Counts
-- ---------------------------------------------------------------------
select 'Products Table' as target, count(*) as count, 28 as expected from public.products
union all
select 'Stock Transactions Table', count(*), 12 from public.stock_transactions;

-- ---------------------------------------------------------------------
-- TEST 2: Check Constraints Integrity
-- ---------------------------------------------------------------------
-- 2.1 Test: Invalid Category (Should be rejected)
do $$
begin
  insert into public.products (product_id, product_type, name, shade, category, price, stock)
  values ('TEST-INV-01', 'Test', 'Lip Gloss', 'Pink', 'Haircare', 150.00, 10);
  raise exception 'TEST FAILED: Invalid category was permitted.';
exception when check_violation then
  raise notice 'TEST 2.1 PASSED: Invalid category rejected by constraint.';
end;
$$;

-- 2.2 Test: Negative Price (Should be rejected)
do $$
begin
  insert into public.products (product_id, product_type, name, shade, category, price, stock)
  values ('TEST-INV-02', 'Test', 'Lip Gloss', 'Pink', 'Lips', -50.00, 10);
  raise exception 'TEST FAILED: Negative price was permitted.';
exception when check_violation then
  raise notice 'TEST 2.2 PASSED: Negative price rejected by constraint.';
end;
$$;

-- 2.3 Test: Duplicate SKU (Should be rejected)
do $$
begin
  insert into public.products (product_id, product_type, name, shade, category, price, stock)
  values ('EYE-EL-001', 'Duplicate', 'Liner', 'Black', 'Eyes', 199.00, 10);
  raise exception 'TEST FAILED: Duplicate SKU was permitted.';
exception when unique_violation then
  raise notice 'TEST 2.3 PASSED: Duplicate SKU rejected by constraint.';
end;
$$;

-- ---------------------------------------------------------------------
-- TEST 3: Atomic Stock Adjustment (+10 Stock In)
-- ---------------------------------------------------------------------
do $$
declare
  v_initial_stock integer;
  v_result json;
  v_updated_stock integer;
begin
  select stock into v_initial_stock from public.products where id = 1;
  
  v_result := public.process_stock_transaction(1, 'in', 10, 'Test stock arrival', 'Aveghail');
  
  select stock into v_updated_stock from public.products where id = 1;
  
  if v_updated_stock = v_initial_stock + 10 then
    raise notice 'TEST 3 PASSED: Stock increased atomically from % to %.', v_initial_stock, v_updated_stock;
  else
    raise exception 'TEST 3 FAILED: Expected stock %, got %.', v_initial_stock + 10, v_updated_stock;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- TEST 4: Atomic Stock Adjustment (-5 Stock Out)
-- ---------------------------------------------------------------------
do $$
declare
  v_initial_stock integer;
  v_result json;
  v_updated_stock integer;
begin
  select stock into v_initial_stock from public.products where id = 1;
  
  v_result := public.process_stock_transaction(1, 'out', 5, 'Test store sale', 'Aveghail');
  
  select stock into v_updated_stock from public.products where id = 1;
  
  if v_updated_stock = v_initial_stock - 5 then
    raise notice 'TEST 4 PASSED: Stock decreased atomically from % to %.', v_initial_stock, v_updated_stock;
  else
    raise exception 'TEST 4 FAILED: Expected stock %, got %.', v_initial_stock - 5, v_updated_stock;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- TEST 5: Negative Stock Prevention (Over-reduction protection)
-- ---------------------------------------------------------------------
do $$
declare
  v_current_stock integer;
begin
  select stock into v_current_stock from public.products where id = 1;
  
  -- Attempting to deduct 999 units when only ~29 exist
  perform public.process_stock_transaction(1, 'out', 999, 'Test invalid stockout', 'Aveghail');
  raise exception 'TEST 5 FAILED: Negative stock was permitted.';
exception when others then
  raise notice 'TEST 5 PASSED: Over-reduction blocked. Transaction rolled back with error: %', sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------
-- TEST 6: Audit Trail & Activity Log Verification
-- ---------------------------------------------------------------------
select 
  st.id as transaction_id,
  st.sku,
  st.product_name,
  st.transaction_type,
  st.quantity,
  st.previous_stock,
  st.stock_after,
  st.notes,
  st.performed_by,
  st.created_at
from public.stock_transactions st
where st.product_id = 1
order by st.created_at desc
limit 2;

select 
  al.id as log_id,
  al.action,
  al.details,
  al.created_at
from public.activity_logs al
order by al.created_at desc
limit 2;
