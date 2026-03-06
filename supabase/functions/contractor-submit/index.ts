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

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const formData = await req.formData();
    const token = formData.get("token") as string;

    if (!token) {
      return new Response(JSON.stringify({ error: "Token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate token
    const { data: link, error: linkError } = await supabase
      .from("contractor_access_links")
      .select("id, property_id, is_active, expires_at")
      .eq("token", token)
      .single();

    if (linkError || !link) {
      return new Response(JSON.stringify({ error: "Invalid link" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!link.is_active) {
      return new Response(JSON.stringify({ error: "This link has been deactivated" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "This link has expired" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract form fields
    const companyName = formData.get("contractor_company_name") as string;
    const contactName = formData.get("contractor_contact_name") as string;
    const email = formData.get("contractor_email") as string | null;
    const phone = formData.get("contractor_phone") as string | null;
    const serviceDate = formData.get("service_date") as string;
    const serviceCategory = formData.get("service_category") as string;
    const serviceDescription = formData.get("service_description") as string;
    const costStr = formData.get("cost") as string | null;
    const warrantyInfo = formData.get("warranty_info") as string | null;
    const notes = formData.get("notes") as string | null;
    const addToContacts = formData.get("add_to_contacts") === "true";

    // Validate required fields
    if (!companyName || !contactName || !serviceDate || !serviceCategory || !serviceDescription) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a submission ID for file organization
    const submissionId = crypto.randomUUID();

    // Upload photos
    const photoPaths: string[] = [];
    const photoFiles = formData.getAll("photos") as File[];
    for (const file of photoFiles) {
      if (file.size > 0 && file.name) {
        const ext = file.name.split(".").pop();
        const path = `${link.property_id}/${submissionId}/photos/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("contractor-uploads")
          .upload(path, file, { contentType: file.type });
        if (!uploadError) photoPaths.push(path);
      }
    }

    // Upload receipts
    const receiptPaths: string[] = [];
    const receiptFiles = formData.getAll("receipts") as File[];
    for (const file of receiptFiles) {
      if (file.size > 0 && file.name) {
        const ext = file.name.split(".").pop();
        const path = `${link.property_id}/${submissionId}/receipts/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("contractor-uploads")
          .upload(path, file, { contentType: file.type });
        if (!uploadError) receiptPaths.push(path);
      }
    }

    // Insert submission using service role (bypasses RLS)
    const { error: insertError } = await supabase
      .from("contractor_submissions")
      .insert({
        id: submissionId,
        access_link_id: link.id,
        property_id: link.property_id,
        contractor_company_name: companyName,
        contractor_contact_name: contactName,
        contractor_email: email || null,
        contractor_phone: phone || null,
        service_date: serviceDate,
        service_category: serviceCategory,
        service_description: serviceDescription,
        cost: costStr ? parseFloat(costStr) : null,
        warranty_info: warrantyInfo || null,
        notes: notes || null,
        photos: photoPaths,
        receipt_files: receiptPaths,
        add_to_contacts: addToContacts,
        status: "pending",
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to submit service log" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Service log submitted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
