import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://homelogapp.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let indexed = 0;
    let skipped = 0;

    // Helper: check if document already exists for file_path
    const exists = async (filePath: string): Promise<boolean> => {
      const { data } = await supabase
        .from("documents")
        .select("id")
        .eq("file_path", filePath)
        .maybeSingle();
      return !!data;
    };

    // Helper: classify file
    const classify = (
      filePath: string,
      context: "maintenance" | "contractor" | "inventory"
    ) => {
      const ext = filePath.split(".").pop()?.toLowerCase() || "";
      const isImage = ["jpg", "jpeg", "png", "gif", "webp", "heic"].includes(ext);
      const isPdf = ext === "pdf";

      if (context === "maintenance") {
        if (isImage) return { category: "maintenance_photo", display_type: "photo", file_type: `image/${ext === "jpg" ? "jpeg" : ext}` };
        if (isPdf) return { category: "maintenance_receipt", display_type: "receipt", file_type: "application/pdf" };
        return { category: "maintenance_document", display_type: "other", file_type: "application/octet-stream" };
      }
      if (context === "contractor") {
        if (isImage) return { category: "maintenance_photo", display_type: "photo", file_type: `image/${ext === "jpg" ? "jpeg" : ext}` };
        if (isPdf) return { category: "maintenance_receipt", display_type: "receipt", file_type: "application/pdf" };
        return { category: "maintenance_document", display_type: "other", file_type: "application/octet-stream" };
      }
      // inventory
      if (isImage) return { category: "inventory_photo", display_type: "photo", file_type: `image/${ext === "jpg" ? "jpeg" : ext}` };
      if (isPdf) return { category: "inventory_document", display_type: "manual", file_type: "application/pdf" };
      return { category: "inventory_document", display_type: "other", file_type: "application/octet-stream" };
    };

    // 1. Backfill from maintenance_logs (image_url contains signed URLs)
    const { data: logs } = await supabase
      .from("maintenance_logs")
      .select("id, property_id, user_id, title, scheduled_date, image_url")
      .not("image_url", "is", null);

    if (logs) {
      for (const log of logs) {
        if (!log.image_url) continue;
        // Extract storage path from signed URL
        const match = log.image_url.match(/maintenance-photos\/([^?]+)/);
        if (!match) continue;
        const filePath = decodeURIComponent(match[1]);
        if (await exists(filePath)) { skipped++; continue; }

        const fileName = filePath.split("/").pop() || filePath;
        const { category, display_type, file_type } = classify(filePath, "maintenance");
        const dateStr = log.scheduled_date
          ? new Date(log.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

        const { error } = await supabase.from("documents").insert({
          file_path: filePath,
          file_name: fileName,
          name: `${log.title} — ${dateStr}`,
          title: `${log.title} — ${dateStr}`,
          file_type,
          property_id: log.property_id,
          user_id: log.user_id,
          category,
          display_type,
          maintenance_log_id: log.id,
        });
        if (!error) indexed++;
      }
    }

    // 2. Backfill from contractor_submissions
    const { data: submissions } = await supabase
      .from("contractor_submissions")
      .select("id, property_id, contractor_company_name, service_category, service_date, photos, receipt_files, access_link_id, contractor_access_links!inner(user_id)");

    if (submissions) {
      for (const sub of submissions) {
        const userId = (sub as any).contractor_access_links?.user_id;
        if (!userId) continue;

        const dateStr = new Date(sub.service_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const title = `${sub.contractor_company_name} — ${sub.service_category} — ${dateStr}`;

        const allPaths = [
          ...(sub.photos || []),
          ...(sub.receipt_files || []),
        ];

        for (const filePath of allPaths) {
          if (await exists(filePath)) { skipped++; continue; }
          const fileName = filePath.split("/").pop() || filePath;
          const { category, display_type, file_type } = classify(filePath, "contractor");

          const { error } = await supabase.from("documents").insert({
            file_path: filePath,
            file_name: fileName,
            name: title,
            title,
            file_type,
            property_id: sub.property_id,
            user_id: userId,
            category,
            display_type,
            contractor_submission_id: sub.id,
          });
          if (!error) indexed++;
        }
      }
    }

    // 3. Backfill from home_item_attachments
    const { data: attachments } = await supabase
      .from("home_item_attachments")
      .select("id, home_item_id, user_id, file_path, file_name, file_type, file_size, home_items!inner(name, property_id)");

    if (attachments) {
      for (const att of attachments) {
        if (await exists(att.file_path)) { skipped++; continue; }
        const itemName = (att as any).home_items?.name || "Inventory Item";
        const propertyId = (att as any).home_items?.property_id;
        if (!propertyId) continue;

        const { category, display_type, file_type } = classify(att.file_path, "inventory");

        const { error } = await supabase.from("documents").insert({
          file_path: att.file_path,
          file_name: att.file_name,
          name: itemName,
          title: itemName,
          file_type: att.file_type || file_type,
          file_size: att.file_size,
          property_id: propertyId,
          user_id: att.user_id,
          category,
          display_type,
          home_item_id: att.home_item_id,
        });
        if (!error) indexed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, indexed, skipped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Backfill error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
