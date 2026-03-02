import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateAdminRequest {
  email: string;
  password: string;
  full_name: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // ===== AUTHENTICATION CHECK =====
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - No token provided" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !callerUser) {
      console.error("Invalid token or user not found:", authError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - Invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ===== AUTHORIZATION CHECK - Verify caller is admin =====
    const { data: callerRoles, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin");

    if (roleError) {
      console.error("Error checking caller roles:", roleError);
      return new Response(
        JSON.stringify({ success: false, error: "Error verifying permissions" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!callerRoles || callerRoles.length === 0) {
      console.error("Caller is not an admin:", callerUser.id);
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden - Admin role required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ===== PROCESS REQUEST =====
    const { email, password, full_name }: CreateAdminRequest = await req.json();

    if (!email || !password || !full_name) {
      throw new Error("Missing required fields: email, password, full_name");
    }

    console.log(`Admin ${callerUser.email} creating new admin user: ${email}`);

    // Create the user with admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw createError;
    }

    if (!userData.user) {
      throw new Error("User creation failed - no user returned");
    }

    console.log(`User created with ID: ${userData.user.id}`);

    // Wait a moment for the trigger to create the profile
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Assign admin role
    const { error: assignRoleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userData.user.id,
        role: "super_admin",
      });

    if (assignRoleError) {
      console.error("Error assigning role:", assignRoleError);
      throw assignRoleError;
    }

    console.log(`Super admin role assigned successfully by ${callerUser.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin user created successfully",
        user_id: userData.user.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in create-admin function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
