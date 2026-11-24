import "server-only";
import { query, queryOne } from "@/lib/db";
import type { StaffSession } from "./session";

/**
 * Admin reads for the sales pipeline. Visibility mirrors the leads RLS policy:
 * leads.read_all sees everything; leads.read_assigned sees own + unassigned.
 */

const visibility = (session: StaffSession, params: unknown[]) => {
  if (session.can("leads", "read_all")) return "true";
  if (!session.can("leads", "read_assigned")) return "false";
  params.push(session.id);
  return `(l.assigned_to = $${params.length} or l.assigned_to is null)`;
};

export const leadRef = (n: number) => `YJ-${String(n).padStart(6, "0")}`;

export type LeadFilters = { stage?: string; assigned?: string; channel?: string; q?: string; type?: string; page?: number };
export const LEADS_PAGE = 50;

export async function listLeads(session: StaffSession, f: LeadFilters) {
  const params: unknown[] = [];
  const add = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  const where = [visibility(session, params)];
  if (f.stage) where.push(`s.code = ${add(f.stage)}`);
  else where.push(`s.kind not in ('spam')`);
  if (f.assigned === "me") where.push(`l.assigned_to = ${add(session.id)}`);
  else if (f.assigned === "none") where.push(`l.assigned_to is null`);
  if (f.channel) where.push(`ch.code = ${add(f.channel)}`);
  if (f.type) where.push(`l.enquiry_type = ${add(f.type)}`);
  if (f.q) {
    const like = add(`%${f.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    const num = /^(yj-?)?\d+$/i.test(f.q) ? Number(f.q.replace(/\D/g, "")) : null;
    where.push(`(c.full_name ilike ${like} or c.phone ilike ${like} or c.email ilike ${like}${num ? ` or l.lead_number = ${add(num)}` : ""})`);
  }
  const page = Math.max(1, f.page ?? 1);
  const from = `
    from public.leads l
    join public.contacts c on c.id = l.contact_id
    join public.lead_stages s on s.id = l.stage_id
    left join public.lead_touchpoints lt on lt.lead_id = l.id and lt.touch = 'last'
    left join public.marketing_channels ch on ch.id = lt.channel_id
    where ${where.join(" and ")}`;
  const [rows, total] = await Promise.all([
    query<{
      id: string;
      lead_number: number;
      name: string;
      phone: string | null;
      enquiry_type: string;
      trip: string | null;
      stage: string;
      stage_kind: string;
      assigned: string | null;
      channel: string | null;
      priority: string;
      next_follow_up_at: Date | null;
      created_at: Date;
    }>(
      `select l.id, l.lead_number, c.full_name as name, c.phone, l.enquiry_type,
              coalesce((select name from public.packages p where p.id = l.package_id), l.destination_text) as trip,
              s.name as stage, s.kind as stage_kind,
              (select full_name from public.profiles pr where pr.id = l.assigned_to) as assigned,
              ch.name as channel, l.priority, l.next_follow_up_at, l.created_at
       ${from} order by l.created_at desc limit ${LEADS_PAGE} offset ${(page - 1) * LEADS_PAGE}`,
      params,
    ),
    queryOne<{ n: number }>(`select count(*) as n ${from}`, params),
  ]);
  return { rows, total: total?.n ?? 0, page };
}

export async function getLead(session: StaffSession, id: string) {
  const params: unknown[] = [id];
  const vis = visibility(session, params);
  return queryOne<{
    id: string;
    lead_number: number;
    enquiry_type: string;
    stage_id: string;
    assigned_to: string | null;
    priority: "low" | "normal" | "high";
    next_follow_up_at: Date | null;
    lost_reason: string | null;
    destination_text: string | null;
    destination: string | null;
    package_name: string | null;
    package_slug: string | null;
    departure_city: string | null;
    travel_date: string | null;
    date_flexibility: string | null;
    duration_nights: number | null;
    adults: number | null;
    children: number | null;
    infants: number | null;
    budget_min: number | null;
    budget_max: number | null;
    message: string | null;
    form_path: string;
    created_at: Date;
    contact: { name: string; phone: string | null; whatsapp: string | null; email: string | null; city: string | null; marketing: boolean; whatsapp_opt_in: boolean; other_leads: number };
    touches: { touch: string; channel: string | null; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; utm_term: string | null; utm_content: string | null; gclid: string | null; fbclid: string | null; landing_path: string | null; referrer: string | null; device_type: string | null; occurred_at: string }[];
    activities: { id: string; type: string; body: string | null; metadata: Record<string, string | null>; actor: string | null; created_at: string }[];
  }>(
    `select l.*, d.name as destination, p.name as package_name, p.slug as package_slug,
            json_build_object('name', c.full_name, 'phone', c.phone, 'whatsapp', c.whatsapp, 'email', c.email, 'city', c.city,
                              'marketing', c.marketing_consent, 'whatsapp_opt_in', c.whatsapp_opt_in,
                              'other_leads', (select count(*) - 1 from public.leads x where x.contact_id = c.id)) as contact,
            (select coalesce(json_agg(json_build_object('touch', t.touch, 'channel', ch.name, 'utm_source', t.utm_source,
                     'utm_medium', t.utm_medium, 'utm_campaign', t.utm_campaign, 'utm_term', t.utm_term, 'utm_content', t.utm_content,
                     'gclid', t.gclid, 'fbclid', t.fbclid, 'landing_path', t.landing_path, 'referrer', t.referrer,
                     'device_type', t.device_type, 'occurred_at', t.occurred_at) order by t.touch), '[]'::json)
               from public.lead_touchpoints t left join public.marketing_channels ch on ch.id = t.channel_id where t.lead_id = l.id) as touches,
            (select coalesce(json_agg(json_build_object('id', a.id, 'type', a.type, 'body', a.body, 'metadata', a.metadata,
                     'actor', (select full_name from public.profiles pr where pr.id = a.actor_id), 'created_at', a.created_at)
                     order by a.created_at desc), '[]'::json)
               from public.lead_activities a where a.lead_id = l.id) as activities
       from public.leads l
       join public.contacts c on c.id = l.contact_id
       left join public.destinations d on d.id = l.destination_id
       left join public.packages p on p.id = l.package_id
      where l.id = $1 and ${vis}`,
    params,
  );
}

export async function leadFormOptions() {
  const [stages, staff, channels] = await Promise.all([
    query<{ id: string; code: string; name: string; kind: string }>(`select id, code, name, kind from public.lead_stages where is_active order by sort_order`),
    query<{ id: string; name: string }>(
      `select p.id, p.full_name as name from public.profiles p where p.is_active
          and exists (select 1 from public.user_roles r where r.user_id = p.id) order by p.full_name`,
    ),
    query<{ code: string; name: string }>(`select code, name from public.marketing_channels where is_active order by sort_order`),
  ]);
  return { stages, staff, channels };
}

export async function dashboardStats(session: StaffSession) {
  const params: unknown[] = [];
  const vis = visibility(session, params);
  const canLeads = session.can("leads", "read_all") || session.can("leads", "read_assigned");
  const [leads, byChannel, byStage, content, followUps] = await Promise.all([
    canLeads
      ? queryOne<{ today: number; week: number; month: number; open: number; won_month: number }>(
          `select count(*) filter (where l.created_at >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata') as today,
                  count(*) filter (where l.created_at >= now() - interval '7 days') as week,
                  count(*) filter (where l.created_at >= now() - interval '30 days') as month,
                  count(*) filter (where s.kind = 'open') as open,
                  count(*) filter (where s.kind = 'won' and l.updated_at >= now() - interval '30 days') as won_month
             from public.leads l join public.lead_stages s on s.id = l.stage_id where s.kind <> 'spam' and ${vis}`,
          params,
        )
      : null,
    canLeads
      ? query<{ channel: string; n: number; won: number }>(
          `select coalesce(ch.name, 'Unknown') as channel, count(*) as n, count(*) filter (where s.kind = 'won') as won
             from public.leads l
             join public.lead_stages s on s.id = l.stage_id
             left join public.lead_touchpoints t on t.lead_id = l.id and t.touch = 'first'
             left join public.marketing_channels ch on ch.id = t.channel_id
            where l.created_at >= now() - interval '30 days' and s.kind <> 'spam' and ${vis}
            group by 1 order by 2 desc`,
          params,
        )
      : [],
    canLeads
      ? query<{ stage: string; code: string; n: number }>(
          `select s.name as stage, s.code, count(l.id) as n from public.lead_stages s
             left join public.leads l on l.stage_id = s.id and ${vis}
            where s.kind = 'open' group by s.id order by s.sort_order`,
          params,
        )
      : [],
    queryOne<{ packages: number; drafts: number; destinations: number; posts: number; scheduled: number }>(
      `select (select count(*) from public.packages where status = 'published' and deleted_at is null) as packages,
              (select count(*) from public.packages where status = 'draft' and deleted_at is null) as drafts,
              (select count(*) from public.destinations where status = 'published' and deleted_at is null) as destinations,
              (select count(*) from public.blog_posts where status = 'published' and deleted_at is null) as posts,
              (select count(*) from public.packages where status = 'published' and published_at > now() and deleted_at is null)
            + (select count(*) from public.blog_posts where status = 'published' and published_at > now() and deleted_at is null) as scheduled`,
    ),
    canLeads
      ? query<{ id: string; lead_number: number; name: string; next_follow_up_at: Date }>(
          `select l.id, l.lead_number, c.full_name as name, l.next_follow_up_at
             from public.leads l join public.contacts c on c.id = l.contact_id join public.lead_stages s on s.id = l.stage_id
            where s.kind = 'open' and l.next_follow_up_at is not null and l.next_follow_up_at < now() + interval '1 day'
              and l.assigned_to = $1
            order by l.next_follow_up_at limit 8`,
          [session.id],
        )
      : [],
  ]);
  return { leads, byChannel, byStage, content, followUps };
}
