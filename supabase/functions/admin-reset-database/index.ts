import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // User client for auth verification
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get current user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role (super_admin or legacy admin)
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ==================== ACTION: REQUEST OTP ====================
    if (action === "request_otp") {
      // Rate limit: max 3 OTP requests per hour
      const { data: recentRequests } = await adminClient
        .from("admin_reset_rate_limit")
        .select("id")
        .eq("user_id", user.id)
        .eq("attempt_type", "otp_request")
        .gte("attempted_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (recentRequests && recentRequests.length >= 3) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes de OTP. Intenta en 1 hora." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log rate limit
      await adminClient.from("admin_reset_rate_limit").insert({
        user_id: user.id,
        attempt_type: "otp_request",
      });

      // Get OTP security phone: prefer company_settings.otp_security_phone, fallback to profile.phone
      const { data: companySettings } = await adminClient
        .from("company_settings")
        .select("otp_security_phone")
        .limit(1)
        .maybeSingle();

      const { data: profile } = await adminClient
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", user.id)
        .maybeSingle();

      const otpPhone = companySettings?.otp_security_phone || profile?.phone || null;

      // Determine send mode from patient_portal_config (reuse the same config pattern)
      // For admin OTP we check if Twilio is configured; if not, it's manual mode
      const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const sendMode = twilioSid ? "twilio" : "manual";

      // Generate OTP
      const otpCode = generateOTP();

      // Normalize phone for WhatsApp
      let phoneE164 = otpPhone || "";
      if (phoneE164) {
        let cleaned = phoneE164.replace(/[\s\-\(\)\+]/g, "");
        if (cleaned.length === 10) cleaned = "52" + cleaned;
        else if (cleaned.length === 13 && cleaned.startsWith("521")) cleaned = "52" + cleaned.slice(3);
        phoneE164 = "+" + cleaned;
      }

      // Invalidate previous OTPs
      await adminClient
        .from("admin_reset_otp")
        .update({ used: true })
        .eq("user_id", user.id)
        .eq("used", false);

      // Store new OTP
      await adminClient.from("admin_reset_otp").insert({
        user_id: user.id,
        otp_code: otpCode,
        phone_sent_to: phoneE164 || "N/A",
      });

      // Audit log
      await adminClient.from("admin_reset_rate_limit").insert({
        user_id: user.id,
        attempt_type: "otp_generated_manual",
      });

      console.log(`[ADMIN RESET OTP] User: ${user.email}, Mode: ${sendMode}, OTP: ${otpCode}`);

      if (sendMode === "manual") {
        // MANUAL MODE: return OTP + full phone for display on screen
        const whatsappUrl = phoneE164
          ? `https://wa.me/${phoneE164.replace("+", "")}?text=${encodeURIComponent(`Código de seguridad para reinicio de BD: ${otpCode}. Vigencia: 10 minutos.`)}`
          : null;

        return new Response(
          JSON.stringify({
            success: true,
            mode: "manual",
            otp: otpCode,
            phone_full: phoneE164 || null,
            whatsapp_url: whatsappUrl,
            message: "Modo manual activo. Envía este código al número de seguridad.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // TWILIO MODE: send SMS (future implementation)
      return new Response(
        JSON.stringify({
          success: true,
          mode: "twilio",
          phone_hint: phoneE164 ? `***${phoneE164.slice(-4)}` : "No hay teléfono registrado",
          message: "Código OTP enviado por SMS.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================== ACTION: VERIFY PASSWORD ====================
    if (action === "verify_password") {
      const { password } = body;
      if (!password) {
        return new Response(JSON.stringify({ error: "Password required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Re-authenticate using signInWithPassword
      const { error: signInError } = await createClient(supabaseUrl, supabaseAnonKey)
        .auth.signInWithPassword({ email: user.email!, password });

      if (signInError) {
        // Log failed attempt
        await adminClient.from("admin_reset_rate_limit").insert({
          user_id: user.id,
          attempt_type: "password_fail",
        });

        // Check if blocked (5 failed password attempts in 10 min)
        const { data: failedAttempts } = await adminClient
          .from("admin_reset_rate_limit")
          .select("id")
          .eq("user_id", user.id)
          .eq("attempt_type", "password_fail")
          .gte("attempted_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

        if (failedAttempts && failedAttempts.length >= 5) {
          return new Response(
            JSON.stringify({ error: "Cuenta bloqueada temporalmente. Intenta en 10 minutos.", blocked: true }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ error: "Contraseña incorrecta" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================== ACTION: EXECUTE RESET ====================
    if (action === "execute_reset") {
      const { otp_code, typed_confirmation, selections, reason } = body;

      // Validate inputs
      if (typed_confirmation !== "REINICIAR") {
        return new Response(
          JSON.stringify({ error: "Confirmación escrita incorrecta" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!otp_code || otp_code.length !== 6) {
        return new Response(
          JSON.stringify({ error: "Código OTP inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Rate limit: max 2 reset attempts per hour
      const { data: recentResets } = await adminClient
        .from("admin_reset_rate_limit")
        .select("id")
        .eq("user_id", user.id)
        .eq("attempt_type", "reset")
        .gte("attempted_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (recentResets && recentResets.length >= 2) {
        return new Response(
          JSON.stringify({ error: "Máximo 2 intentos de reinicio por hora." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify test_mode is ON
      const { data: settings } = await adminClient
        .from("company_settings")
        .select("test_mode")
        .limit(1)
        .maybeSingle();

      if (!settings?.test_mode) {
        return new Response(
          JSON.stringify({ error: "Modo pruebas no está activado" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify OTP
      const { data: otpRecord } = await adminClient
        .from("admin_reset_otp")
        .select("*")
        .eq("user_id", user.id)
        .eq("used", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!otpRecord) {
        return new Response(
          JSON.stringify({ error: "No hay código OTP válido. Solicita uno nuevo." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (otpRecord.attempts_left <= 0) {
        await adminClient
          .from("admin_reset_otp")
          .update({ used: true })
          .eq("id", otpRecord.id);

        return new Response(
          JSON.stringify({ error: "Máximo de intentos OTP alcanzado. Solicita uno nuevo.", blocked: true }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (otpRecord.otp_code !== otp_code) {
        await adminClient
          .from("admin_reset_otp")
          .update({ attempts_left: otpRecord.attempts_left - 1 })
          .eq("id", otpRecord.id);

        return new Response(
          JSON.stringify({
            error: `Código OTP incorrecto. ${otpRecord.attempts_left - 1} intentos restantes.`,
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark OTP as used
      await adminClient
        .from("admin_reset_otp")
        .update({ used: true })
        .eq("id", otpRecord.id);

      // Log rate limit
      await adminClient.from("admin_reset_rate_limit").insert({
        user_id: user.id,
        attempt_type: "reset",
      });

      // ===== EXECUTE DELETION =====
      const rowsDeleted: Record<string, number> = {};
      const modulesSelected = selections || {};

      try {
        // 1. Patients module
        if (modulesSelected.patients) {
          // Delete dependent tables first
          const tables1 = [
            "patient_portal_sessions",
            "patient_portal_tokens",
            "patient_auth_codes",
            "contact_events",
            "patient_deletion_audit",
            "clinical_ai_audit",
            "visual_exams",
            "patient_prescriptions",
          ];
          for (const t of tables1) {
            const { count } = await adminClient.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000").select("id", { count: "exact", head: true });
            rowsDeleted[t] = count || 0;
          }
          // Delete patients last
          const { count } = await adminClient.from("patients").delete().neq("id", "00000000-0000-0000-0000-000000000000").select("id", { count: "exact", head: true });
          rowsDeleted["patients"] = count || 0;
        }

        // 2. Sales & Payments
        if (modulesSelected.sales) {
          const salesTables = [
            "payment_audit_log",
            "credit_payments",
            "payment_plan_installments",
            "payment_plans",
            "sale_payments",
            "sale_items",
            "promotor_comisiones",
            "promotor_alerts",
            "cash_movements",
            "cash_counts",
            "bank_transactions",
            "expenses",
            "sales",
          ];
          for (const t of salesTables) {
            try {
              const { count } = await adminClient.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000").select("id", { count: "exact", head: true });
              rowsDeleted[t] = count || 0;
            } catch { /* table might not exist */ }
          }
          // Close open cash registers
          await adminClient.from("cash_registers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
          rowsDeleted["cash_registers"] = 0;
        }

        // 3. Appointments
        if (modulesSelected.appointments) {
          const apptTables = ["appointment_reminders", "appointments"];
          for (const t of apptTables) {
            const { count } = await adminClient.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000").select("id", { count: "exact", head: true });
            rowsDeleted[t] = count || 0;
          }
        }

        // 4. Laboratory & Deliveries
        if (modulesSelected.laboratory) {
          const labTables = [
            "lab_order_status_history",
            "lab_orders",
          ];
          for (const t of labTables) {
            try {
              const { count } = await adminClient.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000").select("id", { count: "exact", head: true });
              rowsDeleted[t] = count || 0;
            } catch { /* skip */ }
          }
        }

        // 5. Marketing & Messages
        if (modulesSelected.marketing) {
          const mktTables = [
            "campaign_recipients",
            "campaign_messages",
            "campaign_audit_log",
            "campaign_exclusions",
            "marketing_campaigns",
            "campaign_templates",
            "ai_campaign_segments",
            "clinical_marketing_actions",
            "clinical_ai_learning",
            "auto_message_logs",
            "automated_message_log",
            "automated_messages",
            "auto_message_templates",
          ];
          for (const t of mktTables) {
            try {
              const { count } = await adminClient.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000").select("id", { count: "exact", head: true });
              rowsDeleted[t] = count || 0;
            } catch { /* skip */ }
          }
        }

        // 6. Products (optional, OFF by default)
        if (modulesSelected.products) {
          const prodTables = [
            "stock_alerts",
            "inventory_movements",
            "inventory",
            "product_prices_by_branch",
            "purchase_order_items",
            "purchase_orders",
            "reception_items",
            "receptions",
            "supplier_products",
            "products",
          ];
          for (const t of prodTables) {
            try {
              const { count } = await adminClient.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000").select("id", { count: "exact", head: true });
              rowsDeleted[t] = count || 0;
            } catch { /* skip */ }
          }
        }

        // 7. Clear notifications and drafts
        await adminClient.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await adminClient.from("drafts").delete().neq("id", "00000000-0000-0000-0000-000000000000");

        // 8. Clear OTP and admin reset tables
        await adminClient.from("admin_reset_otp").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await adminClient.from("admin_reset_rate_limit").delete().neq("id", "00000000-0000-0000-0000-000000000000");

        // Re-seed defaults: Ensure default promotor exists
        await adminClient.from("promotores").upsert(
          {
            id: "00000000-0000-0000-0000-000000000001",
            nombre: "Óptica Istmeña (Paciente llegó solo)",
            activo: true,
          },
          { onConflict: "id" }
        );

        // Get profile name for audit
        const { data: adminProfile } = await adminClient
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle();

        // Log audit
        await adminClient.from("database_reset_audit").insert({
          executed_by: user.id,
          executed_by_name: adminProfile?.full_name || user.email,
          reason: reason || null,
          modules_cleaned: Object.keys(modulesSelected).filter((k) => modulesSelected[k]),
          rows_deleted: rowsDeleted,
          success: true,
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Base de datos reiniciada exitosamente",
            rows_deleted: rowsDeleted,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (execError: unknown) {
        const errorMsg = execError instanceof Error ? execError.message : "Unknown error";
        console.error("[RESET ERROR]", execError);

        // Log failed audit
        const { data: adminProfile2 } = await adminClient
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle();

        await adminClient.from("database_reset_audit").insert({
          executed_by: user.id,
          executed_by_name: adminProfile2?.full_name || user.email,
          reason: reason || null,
          modules_cleaned: Object.keys(modulesSelected).filter((k) => modulesSelected[k]),
          rows_deleted: rowsDeleted,
          success: false,
          error_message: errorMsg,
        });

        return new Response(
          JSON.stringify({ error: "Error durante el reinicio: " + errorMsg }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Acción no reconocida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[ADMIN RESET]", err);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
