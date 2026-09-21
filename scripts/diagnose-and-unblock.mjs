import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Faltan variables de entorno: VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log("==================================================");
  console.log("1. CONSULTA Y DESBLOQUEO EN BASE DE DATOS");
  console.log("==================================================");

  const { data: sessions, error: fetchErr } = await supabase
    .from('dialogue_sessions')
    .select('id, topic, status, created_at, metadata')
    .order('created_at', { ascending: false })
    .limit(5);

  if (fetchErr) {
    console.error("❌ Error al consultar dialogue_sessions:", fetchErr);
  } else {
    console.log(`📋 Últimas ${sessions.length} sesiones en dialogue_sessions:`);
    sessions.forEach((s, idx) => {
      console.log(`  [${idx + 1}] ID: ${s.id} | Status: ${s.status} | Creada: ${s.created_at}`);
      console.log(`      Tema: ${s.topic}`);
      if (s.metadata) {
        console.log(`      Metadata: ${JSON.stringify(s.metadata)}`);
      }
    });

    const activeSessions = sessions.filter(s => s.status === 'active');
    if (activeSessions.length > 0) {
      console.log(`\n⚠️ Se encontraron ${activeSessions.length} sesión(es) en estado 'active'. Procediendo a desbloquear...`);
      for (const s of activeSessions) {
        const newMetadata = {
          ...(typeof s.metadata === 'object' && s.metadata !== null ? s.metadata : {}),
          unblocked_at: new Date().toISOString(),
          error: 'Desbloqueo administrativo tras deploy: liberado bloqueo de concurrencia'
        };

        const { data: updated, error: updErr } = await supabase
          .from('dialogue_sessions')
          .update({
            status: 'error',
            metadata: newMetadata
          })
          .eq('id', s.id)
          .select();

        if (updErr) {
          console.error(`❌ Error actualizando sesión ${s.id}:`, updErr);
        } else {
          console.log(`✅ Sesión ${s.id} cambiada exitosamente a status: 'error'.`);
        }
      }
    } else {
      console.log("\n✅ No hay sesiones en estado 'active'. El frontend no está bloqueado por concurrencia.");
    }
  }

  console.log("\n==================================================");
  console.log("2. VERIFICACIÓN DE INVOCACIÓN DIRECTA DE LA EDGE FUNCTION");
  console.log("==================================================");

  const functionUrl = `${supabaseUrl}/functions/v1/orchestrator`;

  // Test 1: Payload solicitado con action: "startSession"
  console.log(`\n[Prueba A] Invocación con payload exacto solicitado:`);
  console.log(`URL: ${functionUrl}`);
  const payloadA = { action: "startSession", topic: "Fricción Operativa Real" };
  console.log(`Payload: ${JSON.stringify(payloadA)}`);
  
  const startA = Date.now();
  try {
    const resA = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify(payloadA)
    });
    const durA = Date.now() - startA;
    const bodyA = await resA.text();
    console.log(`⏱️ Latencia: ${durA} ms (${(durA / 1000).toFixed(2)}s)`);
    console.log(`📊 HTTP Status: ${resA.status} ${resA.statusText}`);
    console.log(`📄 Respuesta:\n${bodyA}`);
  } catch (errA) {
    console.error(`❌ Error en fetch A:`, errA.message);
  }

  // Test 2: Payload con action estándar: "start"
  console.log(`\n[Prueba B] Invocación con acción estándar aceptada por el orchestrator (action: "start"):`);
  const payloadB = { action: "start", topic: "Fricción Operativa Real" };
  console.log(`Payload: ${JSON.stringify(payloadB)}`);

  const startB = Date.now();
  try {
    const resB = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify(payloadB)
    });
    const durB = Date.now() - startB;
    const bodyB = await resB.text();
    console.log(`⏱️ Latencia: ${durB} ms (${(durB / 1000).toFixed(2)}s)`);
    console.log(`📊 HTTP Status: ${resB.status} ${resB.statusText}`);
    try {
      const parsedB = JSON.parse(bodyB);
      console.log(`📄 Respuesta JSON formateada:\n`, JSON.stringify(parsedB, null, 2));
    } catch {
      console.log(`📄 Respuesta cruda:\n${bodyB}`);
    }
  } catch (errB) {
    console.error(`❌ Error en fetch B:`, errB.message);
  }

  console.log("\n==================================================");
  console.log("3. ESTADO POSTERIOR DE SESIONES TRAS PRUEBA");
  console.log("==================================================");
  const { data: finalSessions } = await supabase
    .from('dialogue_sessions')
    .select('id, topic, status, created_at, metadata')
    .order('created_at', { ascending: false })
    .limit(3);

  if (finalSessions) {
    console.log(`📋 Sesiones más recientes:`);
    finalSessions.forEach((s, idx) => {
      console.log(`  [${idx + 1}] ID: ${s.id} | Status: ${s.status} | Creada: ${s.created_at} | Tema: ${s.topic}`);
    });
  }
}

run().catch(console.error);
