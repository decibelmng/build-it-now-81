import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all active templates that are due (next_due_date <= today)
    const today = new Date().toISOString().split("T")[0];
    const { data: dueTemplates, error: fetchError } = await supabase
      .from("recurring_templates")
      .select("*")
      .eq("active", true)
      .lte("next_due_date", today);

    if (fetchError) throw fetchError;

    let created = 0;
    let errors = 0;

    for (const template of dueTemplates || []) {
      // Create maintenance log
      const { error: logError } = await supabase
        .from("maintenance_logs")
        .insert({
          user_id: template.user_id,
          property_id: template.property_id,
          title: template.title,
          description: template.description,
          category: template.category,
          cost: template.estimated_cost,
          scheduled_date: template.next_due_date,
          contact_id: template.contact_id || null,
        });

      if (logError) {
        console.error(`Failed to create log for template ${template.id}:`, logError);
        errors++;
        continue;
      }

      // Advance the next_due_date
      const currentDue = new Date(template.next_due_date);
      const nextDue = new Date(currentDue);
      nextDue.setMonth(nextDue.getMonth() + template.interval_months);
      const nextDueStr = nextDue.toISOString().split("T")[0];

      const { error: updateError } = await supabase
        .from("recurring_templates")
        .update({
          next_due_date: nextDueStr,
          last_created_at: new Date().toISOString(),
        })
        .eq("id", template.id);

      if (updateError) {
        console.error(`Failed to update template ${template.id}:`, updateError);
        errors++;
        continue;
      }

      created++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: dueTemplates?.length ?? 0,
        created,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-recurring error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
