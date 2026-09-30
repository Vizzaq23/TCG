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
    is_for_trade boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
    unique(user_id,card_id));
  insert into public.profiles values ('${owner}'),('${other}'); insert into public.cards values ('${card}');`);
for (const file of ["20250811000000_shop_storefront.sql", "20250830000000_shop_launch_safety.sql",
  ...(await readdir("supabase/migrations"))
    .filter((name) => name.endsWith("_shop_atomic_collection_allocation.sql"))]) {
  await query(await readFile(path.join("supabase/migrations", file), "utf8"));
}
await query(`grant select,insert,update,delete on all tables in schema public to authenticated;
  alter table public.user_collections enable row level security;
  create policy owner_collection on public.user_collections to authenticated
    using(auth.uid()=user_id) with check(auth.uid()=user_id);`);

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
