import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PrescriptionData {
  od_sphere: number | null;
  od_cylinder: number | null;
  od_axis: number | null;
  od_add: number | null;
  oi_sphere: number | null;
  oi_cylinder: number | null;
  oi_axis: number | null;
  oi_add: number | null;
}

interface Finding {
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  message: string;
  recommendation: string;
  eye?: "OD" | "OI" | "BOTH";
}

interface HistoryPrescription extends PrescriptionData {
  exam_date: string;
}

// ADD validation constants
const ADD_MIN = 0.50;
const ADD_MAX = 3.50;

// Clinical validation rules
function analyzePrescription(
  current: PrescriptionData,
  history: HistoryPrescription[]
): Finding[] {
  const findings: Finding[] = [];
  const lastRx = history.length > 0 ? history[0] : null;

  // Helper functions
  const hasValue = (v: number | null) => v !== null && v !== 0;
  const getSign = (v: number | null) => (v === null ? null : v >= 0 ? "+" : "-");

  // 1. Extreme sphere values
  const checkExtremeSphere = (value: number | null, eye: "OD" | "OI") => {
    if (value !== null && Math.abs(value) > 12) {
      findings.push({
        type: "EXTREME_SPHERE",
        severity: "HIGH",
        message: `Esfera ${eye} muy alta (${value >= 0 ? "+" : ""}${value.toFixed(2)})`,
        recommendation: "Verificar si el valor es correcto. Graduaciones mayores a ±12.00 son poco comunes.",
        eye,
      });
    } else if (value !== null && Math.abs(value) > 8) {
      findings.push({
        type: "HIGH_SPHERE",
        severity: "MEDIUM",
        message: `Esfera ${eye} elevada (${value >= 0 ? "+" : ""}${value.toFixed(2)})`,
        recommendation: "Confirmar graduación con el paciente.",
        eye,
      });
    }
  };

  checkExtremeSphere(current.od_sphere, "OD");
  checkExtremeSphere(current.oi_sphere, "OI");

  // 2. Extreme cylinder values
  const checkExtremeCylinder = (value: number | null, eye: "OD" | "OI") => {
    if (value !== null && Math.abs(value) > 6) {
      findings.push({
        type: "EXTREME_CYLINDER",
        severity: "HIGH",
        message: `Cilindro ${eye} muy alto (${value >= 0 ? "+" : ""}${value.toFixed(2)})`,
        recommendation: "Cilindros mayores a ±6.00 requieren verificación cuidadosa.",
        eye,
      });
    } else if (value !== null && Math.abs(value) > 4) {
      findings.push({
        type: "HIGH_CYLINDER",
        severity: "MEDIUM",
        message: `Cilindro ${eye} elevado (${value >= 0 ? "+" : ""}${value.toFixed(2)})`,
        recommendation: "Confirmar astigmatismo con el paciente.",
        eye,
      });
    }
  };

  checkExtremeCylinder(current.od_cylinder, "OD");
  checkExtremeCylinder(current.oi_cylinder, "OI");

  // 3. Cylinder without axis
  if (hasValue(current.od_cylinder) && !current.od_axis) {
    findings.push({
      type: "MISSING_AXIS",
      severity: "HIGH",
      message: "Cilindro OD sin eje",
      recommendation: "El eje es obligatorio cuando hay cilindro. Verificar antes de guardar.",
      eye: "OD",
    });
  }
  if (hasValue(current.oi_cylinder) && !current.oi_axis) {
    findings.push({
      type: "MISSING_AXIS",
      severity: "HIGH",
      message: "Cilindro OI sin eje",
      recommendation: "El eje es obligatorio cuando hay cilindro. Verificar antes de guardar.",
      eye: "OI",
    });
  }

  // 4. Axis out of range
  if (current.od_axis !== null && (current.od_axis < 1 || current.od_axis > 180)) {
    findings.push({
      type: "INVALID_AXIS",
      severity: "HIGH",
      message: `Eje OD fuera de rango (${current.od_axis}°)`,
      recommendation: "El eje debe estar entre 1° y 180°.",
      eye: "OD",
    });
  }
  if (current.oi_axis !== null && (current.oi_axis < 1 || current.oi_axis > 180)) {
    findings.push({
      type: "INVALID_AXIS",
      severity: "HIGH",
      message: `Eje OI fuera de rango (${current.oi_axis}°)`,
      recommendation: "El eje debe estar entre 1° y 180°.",
      eye: "OI",
    });
  }

  // 5. ADD validation - must be positive and within range
  const checkAddValue = (value: number | null, eye: "OD" | "OI") => {
    if (value === null) return;
    
    // ADD must be positive
    if (value < 0) {
      findings.push({
        type: "INVALID_ADD",
        severity: "HIGH",
        message: `ADD ${eye} negativo (${value.toFixed(2)})`,
        recommendation: "ADD siempre debe ser positivo (+). Corregir antes de guardar.",
        eye,
      });
      return; // Don't check other rules if negative
    }
    
    // ADD minimum check
    if (value > 0 && value < ADD_MIN) {
      findings.push({
        type: "LOW_ADD",
        severity: "MEDIUM",
        message: `ADD ${eye} muy bajo (+${value.toFixed(2)})`,
        recommendation: `Valores de ADD menores a +${ADD_MIN.toFixed(2)} son poco comunes. Verificar.`,
        eye,
      });
    }
    
    // ADD maximum check
    if (value > ADD_MAX) {
      findings.push({
        type: "HIGH_ADD",
        severity: "MEDIUM",
        message: `ADD ${eye} muy alto (+${value.toFixed(2)})`,
        recommendation: `Valores de ADD mayores a +${ADD_MAX.toFixed(2)} son poco comunes. Verificar.`,
        eye,
      });
    }
  };

  checkAddValue(current.od_add, "OD");
  checkAddValue(current.oi_add, "OI");

  // 6. ADD without sphere (clinical warning)
  const checkAddWithoutSphere = (addVal: number | null, sphereVal: number | null, eye: "OD" | "OI") => {
    if (addVal !== null && addVal > 0 && sphereVal === null) {
      findings.push({
        type: "ADD_WITHOUT_SPHERE",
        severity: "LOW",
        message: `ADD ${eye} presente sin valor de Esfera`,
        recommendation: "Es recomendable tener un valor de Esfera cuando se prescribe ADD.",
        eye,
      });
    }
  };

  checkAddWithoutSphere(current.od_add, current.od_sphere, "OD");
  checkAddWithoutSphere(current.oi_add, current.oi_sphere, "OI");

  // 7. Large difference between eyes (sphere)
  if (current.od_sphere !== null && current.oi_sphere !== null) {
    const sphereDiff = Math.abs(current.od_sphere - current.oi_sphere);
    if (sphereDiff > 3) {
      findings.push({
        type: "ANISOMETROPIA",
        severity: "MEDIUM",
        message: `Gran diferencia de esfera entre ojos (${sphereDiff.toFixed(2)} D)`,
        recommendation: "Diferencias mayores a 3.00 D pueden indicar anisometropía significativa. Verificar valores.",
        eye: "BOTH",
      });
    }
  }

  // 8. Large difference between eyes (ADD)
  if (current.od_add !== null && current.oi_add !== null) {
    const addDiff = Math.abs(current.od_add - current.oi_add);
    if (addDiff > 0.50) {
      findings.push({
        type: "ADD_ASYMMETRY",
        severity: "MEDIUM",
        message: `Diferencia de ADD entre ojos (+${addDiff.toFixed(2)})`,
        recommendation: "Es inusual que el ADD difiera más de +0.50 entre ambos ojos. Verificar valores.",
        eye: "BOTH",
      });
    }
  }

  // Compare with history
  if (lastRx) {
    // 6. Sign change in sphere
    const checkSignChange = (
      currVal: number | null,
      prevVal: number | null,
      eye: "OD" | "OI",
      field: string
    ) => {
      const currSign = getSign(currVal);
      const prevSign = getSign(prevVal);
      if (
        currSign &&
        prevSign &&
        currSign !== prevSign &&
        hasValue(currVal) &&
        hasValue(prevVal)
      ) {
        findings.push({
          type: "SIGN_CHANGE",
          severity: "MEDIUM",
          message: `Cambio de signo en ${field} ${eye}: de ${prevSign} a ${currSign}`,
          recommendation: "Verificar si el cambio de signo es correcto comparando con la graduación anterior.",
          eye,
        });
      }
    };

    checkSignChange(current.od_sphere, lastRx.od_sphere, "OD", "Esfera");
    checkSignChange(current.oi_sphere, lastRx.oi_sphere, "OI", "Esfera");
    checkSignChange(current.od_cylinder, lastRx.od_cylinder, "OD", "Cilindro");
    checkSignChange(current.oi_cylinder, lastRx.oi_cylinder, "OI", "Cilindro");

    // 7. Large changes from previous
    const checkLargeChange = (
      currVal: number | null,
      prevVal: number | null,
      eye: "OD" | "OI",
      field: string,
      threshold: number
    ) => {
      if (currVal !== null && prevVal !== null) {
        const change = Math.abs(currVal - prevVal);
        if (change > threshold) {
          findings.push({
            type: "LARGE_CHANGE",
            severity: change > threshold * 1.5 ? "HIGH" : "MEDIUM",
            message: `Cambio significativo en ${field} ${eye}: ${change.toFixed(2)} D`,
            recommendation: `Un cambio mayor a ${threshold.toFixed(2)} D es inusual. Comparar con la graduación anterior del ${new Date(lastRx.exam_date).toLocaleDateString("es-MX")}.`,
            eye,
          });
        }
      }
    };

    checkLargeChange(current.od_sphere, lastRx.od_sphere, "OD", "Esfera", 2);
    checkLargeChange(current.oi_sphere, lastRx.oi_sphere, "OI", "Esfera", 2);
    checkLargeChange(current.od_cylinder, lastRx.od_cylinder, "OD", "Cilindro", 1.5);
    checkLargeChange(current.oi_cylinder, lastRx.oi_cylinder, "OI", "Cilindro", 1.5);

    // 8. Large axis change (if cylinder present)
    if (hasValue(current.od_cylinder) && hasValue(lastRx.od_cylinder)) {
      if (current.od_axis !== null && lastRx.od_axis !== null) {
        const axisDiff = Math.min(
          Math.abs(current.od_axis - lastRx.od_axis),
          180 - Math.abs(current.od_axis - lastRx.od_axis)
        );
        if (axisDiff > 20) {
          findings.push({
            type: "AXIS_CHANGE",
            severity: "MEDIUM",
            message: `Cambio de eje OD: de ${lastRx.od_axis}° a ${current.od_axis}° (${axisDiff}°)`,
            recommendation: "Cambios de eje mayores a 20° son inusuales. Verificar la medición.",
            eye: "OD",
          });
        }
      }
    }
    if (hasValue(current.oi_cylinder) && hasValue(lastRx.oi_cylinder)) {
      if (current.oi_axis !== null && lastRx.oi_axis !== null) {
        const axisDiff = Math.min(
          Math.abs(current.oi_axis - lastRx.oi_axis),
          180 - Math.abs(current.oi_axis - lastRx.oi_axis)
        );
        if (axisDiff > 20) {
          findings.push({
            type: "AXIS_CHANGE",
            severity: "MEDIUM",
            message: `Cambio de eje OI: de ${lastRx.oi_axis}° a ${current.oi_axis}° (${axisDiff}°)`,
            recommendation: "Cambios de eje mayores a 20° son inusuales. Verificar la medición.",
            eye: "OI",
          });
        }
      }
    }

    // 9. Add change
    const checkAddChange = (
      currVal: number | null,
      prevVal: number | null,
      eye: "OD" | "OI"
    ) => {
      if (currVal !== null && prevVal !== null) {
        const change = Math.abs(currVal - prevVal);
        if (change > 0.75) {
          findings.push({
            type: "ADD_CHANGE",
            severity: "MEDIUM",
            message: `Cambio en adición ${eye}: ${change.toFixed(2)} D`,
            recommendation: "Cambios de adición mayores a +0.75 son poco comunes entre revisiones.",
            eye,
          });
        }
      }
    };

    checkAddChange(current.od_add, lastRx.od_add, "OD");
    checkAddChange(current.oi_add, lastRx.oi_add, "OI");
  }

  return findings;
}

function determineSeverity(findings: Finding[]): "LOW" | "MEDIUM" | "HIGH" {
  if (findings.some((f) => f.severity === "HIGH")) return "HIGH";
  if (findings.some((f) => f.severity === "MEDIUM")) return "MEDIUM";
  return "LOW";
}

serve(async (req) => {
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
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { patientId, currentPrescription } = body;

    if (!patientId || !currentPrescription) {
      return new Response(
        JSON.stringify({ error: "Missing patientId or currentPrescription" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch prescription history (last 5 vigentes)
    const { data: history, error: historyError } = await supabase
      .from("patient_prescriptions")
      .select("exam_date, od_sphere, od_cylinder, od_axis, od_add, oi_sphere, oi_cylinder, oi_axis, oi_add")
      .eq("patient_id", patientId)
      .eq("status", "VIGENTE")
      .order("exam_date", { ascending: false })
      .limit(5);

    if (historyError) {
      console.error("Error fetching history:", historyError);
    }

    const findings = analyzePrescription(
      currentPrescription,
      (history || []) as HistoryPrescription[]
    );
    const severity = findings.length > 0 ? determineSeverity(findings) : "LOW";

    return new Response(
      JSON.stringify({
        findings,
        findingsCount: findings.length,
        severity,
        hasHistory: (history?.length || 0) > 0,
        historyCount: history?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in prescription-ai-validator:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
