import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up the access link
    const { data: link, error: linkError } = await supabase
      .from("contractor_access_links")
      .select("id, property_id, is_active, expires_at, label")
      .eq("token", token)
      .single();

    if (linkError || !link) {
      return new Response(
        JSON.stringify({ error: "This link is no longer active. Please contact the homeowner for a new link." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!link.is_active) {
      return new Response(
        JSON.stringify({ error: "This link has been deactivated. Please contact the homeowner for a new link." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This link has expired. Please contact the homeowner for a new link." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get property address only (no owner PII)
    const { data: property, error: propError } = await supabase
      .from("properties")
      .select("address, city, state, zip")
      .eq("id", link.property_id)
      .single();

    if (propError || !property) {
      return new Response(
        JSON.stringify({ error: "Property not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fullAddress = [property.address, property.city, property.state, property.zip]
      .filter(Boolean)
      .join(", ");

    return new Response(
      JSON.stringify({
        link_id: link.id,
        property_id: link.property_id,
        property_address: fullAddress,
        label: link.label,
        categories: [
          "HVAC", "Plumbing", "Electrical", "Roofing", "Landscaping",
          "General Maintenance", "Appliance Repair", "Painting", "Pest Control", "Other"
        ],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
