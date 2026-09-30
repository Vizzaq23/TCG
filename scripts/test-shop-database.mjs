// Run only against a disposable loopback Postgres cluster, never a linked project.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const args = process.argv.slice(2);
const option = (name) => args[args.indexOf(name) + 1];
assert(args.includes("--psql") && args.includes("--port"), "Supply --psql and --port for a disposable local cluster");
const psql = path.resolve(option("--psql"));
const port = option("--port");
assert(/^\d{4,5}$/.test(port), "Invalid local port");
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith("PG")));
const database = "tcg_test_shop";
async function query(sql, db = database) {
  const { stdout } = await exec(psql, ["-X", "-h", "127.0.0.1", "-p", port, "-U", "tcg_test", "-d", db,
    "-v", "ON_ERROR_STOP=1", "-At", "-c", sql], { env, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  return stdout.trim();
}
async function fails(sql, message) {
  await assert.rejects(query(sql), (error) => error.stderr.includes(message), message);
}
const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const card = "00000000-0000-4000-8000-000000000003";
const collection = "00000000-0000-4000-8000-000000000004";
const listing = "00000000-0000-4000-8000-000000000005";
const order = "00000000-0000-4000-8000-000000000006";
const insert = (id = listing, quantity = 1, kind = "single", status = "active") =>
  `insert into public.shop_listings (id,owner_user_id,kind,title,quantity_available,price_cents,card_id,collection_id,status)
   values ('${id}','${owner}','${kind}','Synthetic card',${quantity},100,'${card}','${collection}','${status}');`;
async function reset(quantity = 1) {
  await query(`truncate public.sales_ledger, public.inventory_reservations, public.shop_order_items, public.shop_orders,
    public.shop_listing_items, public.shop_listings, public.user_collections cascade;
    insert into public.user_collections(id,user_id,card_id,quantity,condition) values ('${collection}','${owner}','${card}',${quantity},'Near Mint');`);
}
await query(`create database ${database}`, "postgres").catch(async (error) => {
  if (!error.stderr.includes("already exists")) throw error;
});
// This fixture mirrors the relevant baseline schema. Apply the real storefront
// and safety migrations below, so lock tests exercise their production functions.
await query(`drop schema public cascade; create schema public; drop schema if exists auth cascade; create schema auth;
  do $$ begin
    if not exists(select from pg_roles where rolname='anon') then create role anon; end if;
    if not exists(select from pg_roles where rolname='authenticated') then create role authenticated; end if;
    if not exists(select from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
  end $$;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
  grant usage on schema public,auth to anon,authenticated,service_role;
  create table public.profiles(id uuid primary key);
  create table public.cards(id uuid primary key, image_url text);
  create table public.user_collections(id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
    card_id uuid not null references public.cards(id), quantity integer not null check(quantity>=1), condition text, notes text,
    is_for_trade boolean not null default false, is_graded boolean not null default false, grading_company text,
    grade numeric, cert_number text, slab_image_url text, is_black_label boolean not null default false,
    showcase_slot integer, estimated_value_cents integer, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
    unique(user_id,card_id));
  insert into public.profiles values ('${owner}'),('${other}'); insert into public.cards values ('${card}');`);
for (const file of ["20250811000000_shop_storefront.sql", "20250830000000_shop_launch_safety.sql",
  ...(await readdir("supabase/migrations"))
    .filter((name) => name.endsWith("_shop_atomic_collection_allocation.sql") || name.endsWith("_shop_inventory_restoration.sql"))]) {
  await query(await readFile(path.join("supabase/migrations", file), "utf8"));
}
await query(`grant select,insert,update,delete on all tables in schema public to authenticated;
  alter table public.user_collections enable row level security;
  create policy owner_collection on public.user_collections to authenticated
    using(auth.uid()=user_id) with check(auth.uid()=user_id);
  insert into public.shop_settings(owner_user_id,is_live,launch_ready_at,shipping_cents,currency,support_email)
  values('${owner}',true,now(),0,'usd','synthetic@example.com');`);

const tests = [];
function test(name, run) { tests.push({ name, run }); }
test("single creation cannot overallocate collection copies", async () => {
  await reset(); await query(insert()); await fails(insert("00000000-0000-4000-8000-000000000007"), "insufficient_collection_stock");
});
test("playsets allocate four physical cards", async () => {
  await reset(5); await query(insert(listing, 1, "playset"));
  await query(insert("00000000-0000-4000-8000-000000000007"));
  await fails(insert("00000000-0000-4000-8000-000000000008"), "insufficient_collection_stock");
});
test("archive relist reactivate cannot allocate the same copy twice", async () => {
  await reset(); await query(insert()); await query(`update public.shop_listings set status='archived' where id='${listing}'`);
  await query(insert("00000000-0000-4000-8000-000000000007"));
  await fails(`update public.shop_listings set status='active' where id='${listing}'`, "insufficient_collection_stock");
});
test("draft and quantity increases enforce capacity", async () => {
  await reset(); await query(insert(listing, 1, "single", "draft"));
  await fails(`update public.shop_listings set quantity_available=2 where id='${listing}'`, "insufficient_collection_stock");
});
test("shelf reductions and deletion cannot orphan allocated copies", async () => {
  await reset(2); await query(insert(listing, 2));
  await fails(`update public.user_collections set quantity=1 where id='${collection}'`, "collection_stock_allocated");
  await fails(`delete from public.user_collections where id='${collection}'`, "collection_stock_allocated");
});
test("listing collection and card must belong to its owner", async () => {
  await reset(); await fails(insert().replace(`'${owner}','single'`, `'${other}','single'`), "listing_collection_mismatch");
});
test("collection-backed listing cannot detach while it has stock", async () => {
  await reset(); await query(insert());
  await fails(`update public.shop_listings set collection_id=null where id='${listing}'`, "listing_collection_required");
});
test("changing kind and backing collection cannot bypass capacity", async () => {
  await reset(2); await query(insert());
  await fails(`update public.shop_listings set kind='playset' where id='${listing}'`, "insufficient_collection_stock");
  await fails(`update public.user_collections set user_id='${other}' where id='${collection}'`, "collection_stock_allocated");
});
test("bundle contents and parent listing roll back together", async () => {
  await reset();
  const create = `set role authenticated; set request.jwt.claim.sub='${owner}'; select * from public.shop_create_listing(
    '{"owner_user_id":"${owner}","kind":"bulk_lot","title":"Synthetic bundle","quantity_available":1,"price_cents":100,"status":"active"}',
    '[{"card_id":"00000000-0000-4000-8000-000000000099","quantity":1}]');`;
  await fails(create, "violates foreign key constraint");
  assert.equal(await query("select count(*) from public.shop_listings"), "0");
  await query(create.replace("00000000-0000-4000-8000-000000000099", card));
  assert.equal(await query("select count(*) from public.shop_listings"), "1");
  assert.equal(await query("select count(*) from public.shop_listing_items"), "1");
});
test("RLS and RPC ownership remain enforced for another collector", async () => {
  await reset();
  await fails(`set role authenticated; set request.jwt.claim.sub='${other}'; ${insert()}`, "row-level security policy");
  await fails(`set role authenticated; set request.jwt.claim.sub='${other}'; select * from public.shop_create_listing(
    '{"owner_user_id":"${owner}","kind":"bulk_lot","title":"Synthetic","quantity_available":1,"price_cents":100}')`, "forbidden");
  assert.equal(await query("select has_function_privilege('anon','public.shop_create_listing(jsonb,jsonb)','execute')"), "f");
  assert.equal(await query("select has_function_privilege('authenticated','public.shop_guard_listing_allocation()','execute')"), "f");
});
test("archiving a held listing cannot free its physical copy for relisting", async () => {
  await reset(); await query(insert());
  await query(`insert into public.inventory_reservations(listing_id,quantity,expires_at) values('${listing}',1,now()+interval '1 hour')`);
  await fails(`update public.shop_listings set status='archived' where id='${listing}'`, "listing_has_pending_checkout");
});
test("held identity and stock cannot be changed before checkout resolution", async () => {
  await reset(); await query(insert());
  await query(`insert into public.inventory_reservations(listing_id,quantity,expires_at) values('${listing}',1,now()+interval '1 hour')`);
  await fails(`update public.shop_listings set kind='bulk_lot' where id='${listing}'`, "listing_has_pending_checkout");
  await fails(`update public.shop_listings set quantity_available=0 where id='${listing}'`, "listing_has_pending_checkout");
  await fails(`delete from public.shop_listings where id='${listing}'`, "listing_has_pending_checkout");
});
test("real pending checkout preserves physical identity through finalization", async () => {
  await reset(); await query(insert());
  const orderId = await query(`select order_id from public.shop_create_pending_order(
    '00000000-0000-4000-8000-000000000101','SYNTHETIC-CHECKOUT','${owner}','synthetic@example.com',null,
    '[{"listingId":"${listing}","quantity":1}]')`);
  await fails(`set role authenticated; set request.jwt.claim.sub='${owner}'; update public.shop_listings
    set kind='bulk_lot',card_id=null,collection_id=null where id='${listing}'`, "listing_has_pending_checkout");
  await fails(`set role authenticated; set request.jwt.claim.sub='${owner}'; update public.shop_listings
    set quantity_available=0,status='archived' where id='${listing}'`, "listing_has_pending_checkout");
  await fails(`set role authenticated; set request.jwt.claim.sub='${owner}'; delete from public.shop_listings
    where id='${listing}'`, "listing_has_pending_checkout");
  await fails(insert("00000000-0000-4000-8000-000000000007"), "insufficient_collection_stock");
  await query(`select public.shop_finalize_verified_order('${orderId}','cs_synthetic','pi_synthetic','synthetic@example.com',null,null,'usd',100,100,0)`);
  assert.equal(await query("select count(*) from public.user_collections"), "0");
  assert.equal(await query("select status from public.inventory_reservations"), "consumed");
});
test("held playset cannot become a single and still consumes four shelf cards", async () => {
  await reset(4); await query(insert(listing, 1, "playset"));
  const orderId = await query(`select order_id from public.shop_create_pending_order(
    '00000000-0000-4000-8000-000000000101','SYNTHETIC-CHECKOUT','${owner}','synthetic@example.com',null,
    '[{"listingId":"${listing}","quantity":1}]')`);
  await fails(`set role authenticated; set request.jwt.claim.sub='${owner}'; update public.shop_listings
    set kind='single' where id='${listing}'`, "listing_has_pending_checkout");
  await query(`select public.shop_finalize_verified_order('${orderId}','cs_synthetic','pi_synthetic','synthetic@example.com',null,null,'usd',100,100,0)`);
  assert.equal(await query("select count(*) from public.user_collections"), "0");
});
test("legacy detached order item cannot silently finalize as paid", async () => {
  await reset(); await query(insert());
  const orderId = await query(`select order_id from public.shop_create_pending_order(
    '00000000-0000-4000-8000-000000000101','SYNTHETIC-CHECKOUT','${owner}','synthetic@example.com',null,
    '[{"listingId":"${listing}","quantity":1}]')`);
  await query(`alter table public.shop_listings disable trigger shop_listings_guard_allocation;
    delete from public.shop_listings where id='${listing}';
    alter table public.shop_listings enable trigger shop_listings_guard_allocation;`);
  await fails(`select public.shop_finalize_verified_order('${orderId}','cs_synthetic','pi_synthetic','synthetic@example.com',null,null,'usd',100,100,0)`, "listing_missing");
  assert.equal(await query("select payment_status from public.shop_orders"), "unpaid");
});
test("a legacy understocked shelf rolls back paid finalization", async () => {
  await reset(2); await query(insert(listing, 2));
  await query(`alter table public.user_collections disable trigger user_collections_guard_shop_stock;
    update public.user_collections set quantity=1 where id='${collection}';
    alter table public.user_collections enable trigger user_collections_guard_shop_stock;
    insert into public.shop_orders(id,order_number,owner_user_id,buyer_email,subtotal_cents,shipping_cents,total_cents)
    values('${order}','SYNTHETIC-ORDER','${owner}','synthetic@example.com',200,0,200);
    insert into public.shop_order_items(order_id,listing_id,title,kind,quantity,unit_price_cents,card_id,collection_id)
    values('${order}','${listing}','Synthetic','single',2,100,'${card}','${collection}');`);
  await fails(`select public.shop_finalize_verified_order('${order}','cs_synthetic','pi_synthetic','synthetic@example.com',null,null,'usd',200,200,0)`, "insufficient_collection_stock");
  assert.equal(await query(`select payment_status from public.shop_orders where id='${order}'`), "unpaid");
  assert.equal(await query(`select quantity_available from public.shop_listings where id='${listing}'`), "2");
  assert.equal(await query(`select quantity from public.user_collections where id='${collection}'`), "1");
  assert.equal(await query("select count(*) from public.sales_ledger"), "0");
});
async function allocationRace(kind, quantity) {
  await reset(quantity);
  let firstCommitted = false;
  const first = query(`begin; ${insert(listing, 1, kind)} select pg_sleep(0.8); commit;`).then(() => { firstCommitted = true; });
  // Wait until the first connection owns the collection row lock before the second insert.
  for (let i = 0; i < 200; i++) {
    if (await query(`select exists(select from pg_stat_activity where datname='${database}' and query like '%select pg_sleep(0.8)%' and wait_event='PgSleep')`) === "t") break;
    if (i === 199) throw new Error("First allocation transaction did not reach its barrier");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const secondId = "00000000-0000-4000-8000-000000000007";
  const second = fails(insert(secondId, 1, kind), "insufficient_collection_stock");
  let sawLockWait = false;
  for (let i = 0; i < 100; i++) {
    if (await query(`select exists(select from pg_stat_activity where datname='${database}' and query like '%${secondId}%' and wait_event_type='Lock')`) === "t") {
      sawLockWait = true; break;
    }
    if (firstCommitted) break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert(sawLockWait, "Second allocator must actually wait on the first transaction's lock");
  await second;
  await first; assert.equal(await query("select count(*) from public.shop_listings"), "1");
}
test("simultaneous single insert waits then sees the committed allocation", async () => {
  await allocationRace("single", 1);
});
async function paidSale(shelfQuantity, soldQuantity, kind = "single") {
  await reset(shelfQuantity);
  await query(insert(listing, shelfQuantity / (kind === "playset" ? 4 : 1), kind));
  await query(`update public.user_collections set notes='Synthetic original note' where id='${collection}';
    insert into public.shop_orders(id,order_number,owner_user_id,buyer_email,subtotal_cents,shipping_cents,total_cents)
    values('${order}','SYNTHETIC-RETURN','${owner}','synthetic@example.com',${soldQuantity * 100},0,${soldQuantity * 100});
    insert into public.shop_order_items(order_id,listing_id,title,kind,quantity,unit_price_cents,card_id,collection_id)
    values('${order}','${listing}','Synthetic','${kind}',${soldQuantity},100,'${card}','${collection}');
    insert into public.inventory_reservations(order_id,listing_id,quantity,expires_at)
    values('${order}','${listing}',${soldQuantity},now()+interval '1 hour');
    select public.shop_finalize_verified_order('${order}','cs_synthetic','pi_synthetic','synthetic@example.com',null,null,'usd',${soldQuantity * 100},${soldQuantity * 100},0);
    select public.shop_mark_order_refunded('${order}');`);
}
test("partial return restores shelf and listing transactionally", async () => {
  await paidSale(5, 2);
  await query(`select public.shop_restock_refunded_order('${order}')`);
  assert.equal(await query(`select quantity from public.user_collections where id='${collection}'`), "5");
  assert.equal(await query(`select quantity_available from public.shop_listings where id='${listing}'`), "5");
});
test("full sellout return restores its original shelf identity and note", async () => {
  await paidSale(1, 1);
  await query(`select public.shop_restock_refunded_order('${order}')`);
  assert.equal(await query(`select quantity||':'||condition||':'||notes from public.user_collections where id='${collection}'`), "1:Near Mint:Synthetic original note");
  assert.equal(await query(`select collection_id||':'||quantity_available||':'||status from public.shop_listings where id='${listing}'`), `${collection}:1:active`);
});
test("missing catalog backing refuses automatic physical return", async () => {
  await paidSale(1, 1); await query(`delete from public.cards where id='${card}'`);
  await fails(`select public.shop_restock_refunded_order('${order}')`, "refund_collection_backing_missing");
  await query(`insert into public.cards(id) values('${card}')`);
});
test("playset return uses the immutable sold units and is idempotent", async () => {
  await paidSale(8, 1, "playset");
  await query(`select public.shop_restock_refunded_order('${order}'); select public.shop_restock_refunded_order('${order}')`);
  assert.equal(await query(`select quantity from public.user_collections where id='${collection}'`), "8");
  assert.equal(await query(`select quantity_available from public.shop_listings where id='${listing}'`), "2");
});
test("changed listing identity refuses automatic physical return", async () => {
  await paidSale(1, 1);
  await query(`update public.shop_listings set kind='bulk_lot' where id='${listing}'`);
  await fails(`select public.shop_restock_refunded_order('${order}')`, "refund_listing_backing_changed");
  assert.equal(await query(`select restocked_at is null from public.shop_orders where id='${order}'`), "t");
});
test("changed collector backing requires explicit reconciliation", async () => {
  await paidSale(2, 1);
  await query(`update public.user_collections set condition='Damaged' where id='${collection}'`);
  await fails(`select public.shop_restock_refunded_order('${order}')`, "refund_collection_backing_changed");
  assert.equal(await query(`select quantity from public.user_collections where id='${collection}'`), "1");
});
test("changed grading identity cannot absorb an incompatible returned copy", async () => {
  await paidSale(2, 1);
  await query(`update public.user_collections set is_graded=true,cert_number='SYNTHETIC-OTHER-CERT' where id='${collection}'`);
  await fails(`select public.shop_restock_refunded_order('${order}')`, "refund_collection_backing_changed");
});
test("legacy return without a physical snapshot fails closed", async () => {
  await paidSale(1, 1);
  await query(`update public.shop_order_items set collection_snapshot=null where order_id='${order}'`);
  await fails(`select public.shop_restock_refunded_order('${order}')`, "refund_collection_reconciliation_required");
});
test("reservation wins a race with owner delete and keeps its listing", async () => {
  await reset(); await query(insert());
  const reservation = query(`begin; select order_id from public.shop_create_pending_order(
    '00000000-0000-4000-8000-000000000101','SYNTHETIC-CHECKOUT','${owner}','synthetic@example.com',null,
    '[{"listingId":"${listing}","quantity":1}]'); select pg_sleep(0.8); commit;`);
  for (let i=0; i<100; i++) {
    if (await query(`select exists(select from pg_stat_activity where datname='${database}' and query like '%shop_create_pending_order%' and wait_event='PgSleep')`) === "t") break;
    if (i===99) throw new Error("Reservation did not reach its barrier");
    await new Promise((resolve) => setTimeout(resolve,10));
  }
  await fails(`set role authenticated; set request.jwt.claim.sub='${owner}'; delete from public.shop_listings where id='${listing}'`, "listing_has_pending_checkout");
  await reservation;
  assert.equal(await query("select count(*) from public.shop_listings"), "1");
  assert.equal(await query("select count(*) from public.inventory_reservations"), "1");
});
test("owner delete wins a race and reservation fails without a pending order", async () => {
  await reset(); await query(insert());
  const deletion = query(`begin; set role authenticated; set request.jwt.claim.sub='${owner}';
    delete from public.shop_listings where id='${listing}'; select pg_sleep(0.8); commit;`);
  for (let i=0; i<100; i++) {
    if (await query(`select exists(select from pg_stat_activity where datname='${database}' and query like '%delete from public.shop_listings%' and wait_event='PgSleep')`) === "t") break;
    if (i===99) throw new Error("Delete did not reach its barrier");
    await new Promise((resolve) => setTimeout(resolve,10));
  }
  await fails(`select order_id from public.shop_create_pending_order(
    '00000000-0000-4000-8000-000000000101','SYNTHETIC-CHECKOUT','${owner}','synthetic@example.com',null,
    '[{"listingId":"${listing}","quantity":1}]')`, "listing_unavailable");
  await deletion;
  assert.equal(await query("select count(*) from public.shop_orders"), "0");
});
test("simultaneous playset insert waits then sees the committed allocation", async () => {
  await allocationRace("playset", 4);
});
test("paid finalization consumes shelf and listing together, including sellout", async () => {
  await reset(2); await query(insert(listing, 2));
  await query(`insert into public.shop_orders(id,order_number,owner_user_id,buyer_email,subtotal_cents,shipping_cents,total_cents)
    values('${order}','SYNTHETIC-ORDER','${owner}','synthetic@example.com',200,0,200);
    insert into public.shop_order_items(order_id,listing_id,title,kind,quantity,unit_price_cents,card_id,collection_id)
    values('${order}','${listing}','Synthetic','single',2,100,'${card}','${collection}');
    select public.shop_finalize_verified_order('${order}','cs_synthetic','pi_synthetic','synthetic@example.com',null,null,'usd',200,200,0);`);
  assert.equal(await query("select count(*) from public.user_collections"), "0");
  assert.equal(await query(`select quantity_available||':'||status from public.shop_listings where id='${listing}'`), "0:archived");
  assert.equal(await query(`select payment_status from public.shop_orders where id='${order}'`), "paid");
});
let failures = 0;
for (const { name, run } of tests) {
  try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}\n${error.message}`); }
}
console.log(`${tests.length - failures}/${tests.length} database checks passed`);
process.exitCode = failures ? 1 : 0;
