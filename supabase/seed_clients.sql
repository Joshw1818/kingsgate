-- seed_clients.sql — the 26-client agency ledger (June 2026 roster, CLAUDE.md).
-- Run AFTER 0004_kpi_tracker.sql against the KPI tracker's Supabase project.
--
-- Retainers are REAL → this alone unlocks Pillar 2.5 (MRR £9,375 · avg £360.58
-- · 26 active). offer_value / roas_target / meta_ad_account_id stay null until
-- each account is wired for ads (Pillar 1).
--
-- Pillar 2.6 (Client Tracker) additionally needs start_date + billing_type +
-- billing_anchor_day per client (and billing_schedule rows for payment-plan
-- clients). Those are Josh's to confirm — see the UPDATE template at the bottom.
-- Until they're filled, the tracker tab renders on the illustrative mock ledger.

insert into clients (name, retainer_monthly, billing_type, tracks_pipeline) values
  ('Carpet Care Services',      400, 'rolling',     true),
  ('E.M Pro Solutions',         350, 'rolling',     true),
  ('Cotswold Cleaning',         400, 'rolling',     true),
  ('Enviro Clean Stockport',    400, 'rolling',     true),
  ('Dri-Now Cheltenham',        320, 'rolling',     true),
  ('Dri-Now Shropshire',        225, 'advance_3mo', true),
  ('Enviro Clean Huddersfield', 400, 'rolling',     true),
  ('Mister Clean',              400, 'rolling',     true),
  ('Pro Clean Cardiff',         400, 'rolling',     true),
  ('Dri-Now Maidstone',         266, 'advance_3mo', true),
  ('Dri-Now Colwyn Bay',        266, 'advance_3mo', true),
  ('Aylco Cleaning',            266, 'advance_3mo', true),
  ('Dri-Now Glasgow',           266, 'advance_3mo', true),
  ('MKT',                       350, 'rolling',     true),
  ('HiFi',                      400, 'rolling',     true),
  ('Diamond',                   400, 'rolling',     true),
  ('RS Clean',                  400, 'rolling',     true),
  ('Pro Clean',                 400, 'rolling',     true),
  ('Breeze Cleaning',           400, 'rolling',     true),
  ('The Carpet Lab',            400, 'rolling',     true),
  ('Angus | Julian (referral)', 266, 'advance_3mo', true),
  ('Bishops Carpet Cleaning',   400, 'rolling',     true),
  ('Carpet Pride',              400, 'rolling',     true),
  ('Captiv8 Cleaning',          400, 'payment_plan',true),
  ('Clean Home Services',       400, 'rolling',     true),
  ('JK Carpet Clean',           400, 'payment_plan',true);

-- Sanity check — expect 26 | 9375 | 360.58 (Cotswold counted once; if The
-- Carpet Doctor is still active, add it back → 27 | 9775 | 362.04).
-- select count(*), sum(retainer_monthly),
--        round(avg(retainer_monthly), 2)
-- from clients where end_date is null;

-- ── Pillar 2.6 fields (fill per client, then the Client Tracker goes live) ──
-- update clients set start_date = '2025-07-15', billing_anchor_day = 15
--   where name = 'Diamond';
-- Payment-plan clients also need their installments, e.g.:
-- insert into billing_schedule (client_id, due_date, amount, kind, status)
-- select id, '2026-05-10', 250, 'installment', 'paid'   from clients where name = 'Captiv8 Cleaning'
-- union all
-- select id, '2026-06-09', 250, 'installment', 'scheduled' from clients where name = 'Captiv8 Cleaning';
