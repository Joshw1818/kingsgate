"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";

const ClientSchema = z.object({
  name: z.string().min(1),
  fb_ad_account_id: z.string().min(1),
  ghl_location_id: z.string().min(1),
  target_cpl: z.coerce.number().positive().optional().nullable(),
  target_cost_per_booking: z.coerce.number().positive().optional().nullable(),
  monthly_budget: z.coerce.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function normalizeFbAccountId(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith("act_") ? trimmed : `act_${trimmed}`;
}

export async function createClientAction(formData: FormData) {
  if (isDemoMode()) {
    // Can't write in demo mode — just bounce back to the list.
    redirect("/dashboard/clients?demo=1");
  }

  const parsed = ClientSchema.parse({
    name: formData.get("name"),
    fb_ad_account_id: formData.get("fb_ad_account_id"),
    ghl_location_id: formData.get("ghl_location_id"),
    target_cpl: formData.get("target_cpl") || null,
    target_cost_per_booking: formData.get("target_cost_per_booking") || null,
    monthly_budget: formData.get("monthly_budget") || null,
    notes: formData.get("notes") || null,
  });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("clients").insert({
    ...parsed,
    fb_ad_account_id: normalizeFbAccountId(parsed.fb_ad_account_id),
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients");
}

export async function updateClientAction(id: string, formData: FormData) {
  const parsed = ClientSchema.partial().parse({
    name: formData.get("name"),
    fb_ad_account_id: formData.get("fb_ad_account_id"),
    ghl_location_id: formData.get("ghl_location_id"),
    target_cpl: formData.get("target_cpl") || null,
    target_cost_per_booking: formData.get("target_cost_per_booking") || null,
    monthly_budget: formData.get("monthly_budget") || null,
    notes: formData.get("notes") || null,
  });

  const supabase = await createSupabaseServerClient();
  const patch = {
    ...parsed,
    ...(parsed.fb_ad_account_id
      ? { fb_ad_account_id: normalizeFbAccountId(parsed.fb_ad_account_id) }
      : {}),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("clients").update(patch).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/clients/${id}`);
}

export async function toggleClientActiveAction(id: string, active: boolean) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("clients")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
}
