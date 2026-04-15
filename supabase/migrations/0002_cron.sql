-- Schedule sync + flag edge functions via pg_cron.
-- Replace {PROJECT_REF} and {SERVICE_ROLE_KEY} when applying to your project,
-- or run this after deploying edge functions.
--
-- These call the Supabase Edge Functions over HTTP using pg_net.

-- sync facebook ads every 30 minutes
select cron.schedule(
    'kingsgate-sync-fb',
    '*/30 * * * *',
    $$
    select net.http_post(
        url := current_setting('app.edge_base_url') || '/sync-fb',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- sync GHL every 15 minutes (leads/bookings are higher priority)
select cron.schedule(
    'kingsgate-sync-ghl',
    '*/15 * * * *',
    $$
    select net.http_post(
        url := current_setting('app.edge_base_url') || '/sync-ghl',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- run flag engine every 30 minutes (offset by 5 min so syncs finish first)
select cron.schedule(
    'kingsgate-run-flags',
    '5,35 * * * *',
    $$
    select net.http_post(
        url := current_setting('app.edge_base_url') || '/run-flags',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- After running this file, set the two GUCs on the database:
--   alter database postgres set app.edge_base_url = 'https://{PROJECT_REF}.functions.supabase.co';
--   alter database postgres set app.service_role_key = '{SERVICE_ROLE_KEY}';
