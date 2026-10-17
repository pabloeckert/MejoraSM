# AUDITORÍA E2E EMPÍRICA, ANÁLISIS DE RESILIENCIA Y PLAN MAESTRO DE OPTIMIZACIÓN
## Módulo: MejoraSM — Edificio Comercial Autónomo
**Fecha:** 17 de Octubre de 2026  
**Auditor:** Antigravity (Lead SRE & Principal Software Engineer)  
**Marco de Referencia:** Directiva Universal Zero-Trust Principal SRE & Memoria Operativa  
**Estado General:** **PRODUCCIÓN VIABLE CON PLAN QUIRÚRGICO DE REFUERZO P0-P2**

---

## 1. Resumen Ejecutivo y Matriz de Hallazgos

Se realizó una auditoría empírica End-to-End (E2E) exhaustiva sobre toda la pila del módulo **MejoraSM**, abarcando:
1. **Capa de Persistencia Física:** Base SQLite local (`data/mejora_sm.db`), índices, integridad, concurrencia multiproceso y modo WAL.
2. **Capa de Red y Servicios HTTP:** Servidor nativo `node:http`, endpoints REST, seguridad (path traversal, CORS, límites de payload) y rendimiento de entrega.
3. **Capa de Servicio Frontend y Estado Local:** `localSMService.ts`, persistencia en `localStorage`, sincronización cliente-servidor y reactividad.
4. **Capa de Resiliencia e Integración Externa:** `ZernioCircuitBreaker`, Fast-Window timeouts, manejo de fallas de transporte y auto-posting daemon.
5. **Calidad de Código y Tipado:** TypeScript strict mode, suite de Vitest (141 tests) y auditoría estática ESLint.

### Matriz Consolidada de Pruebas Empíricas (14 Sondas SRE):

| ID | Sonda / Dimensión | Resultado | Métrica / Evidencia Cruda | Severidad |
| :--- | :--- | :---: | :--- | :---: |
| **SEC-01** | Path Traversal en Servidor Estático | **PASS** | HTTP 404 en `..%2f..%2fpackage.json`, 0 fugas de archivos fuera de `dist/` | Informativo |
| **SEC-02** | Guard de Payload > 5MB | **PASS** | HTTP 400 inmediato en payloads masivos (79.7 ms) | Informativo |
| **SEC-03** | Política CORS en Endpoints Mutantes | **FAIL** | `Access-Control-Allow-Origin: *` permisivo en mutaciones POST/PATCH | **P1 (Media)** |
| **PERF-01** | Compresión de Assets en Vuelo | **FAIL** | Bundle JS servido plano (305.9 kB) sin gzip/brotli (potencial: 70.8 kB br) | **P1 (Media)** |
| **PERF-02** | Payload `/api/posts` sin Paginación | **FAIL** | 367.3 kB transferidos en bloque para 78 piezas sin ETag | **P2 (Baja)** |
| **PERF-03** | Event Loop Lag bajo Estrés (100 req) | **PASS** | Lag p50: 33.4 ms, p99: 42.7 ms (< 50 ms umbral SRE) | Informativo |
| **DB-01** | Contención SQLite (busy_timeout=0) | **INFO** | Control negativo: 687 bloqueos `SQLITE_BUSY` de 800 ops paralelas | Informativo |
| **DB-02** | Blindaje Concurrencia (busy_timeout=5000) | **PASS** | 800/800 transacciones completadas, 0 bloqueos `SQLITE_BUSY` | Informativo |
| **DB-03** | Query Plan Ordenamiento de Propuestas | **FAIL** | `USE TEMP B-TREE FOR ORDER BY` por falta de índice `(estado, dia_programado)` | **P2 (Baja)** |
| **DOM-01** | Guardrail de Máquina de Estados (HTTP) | **FAIL** | Permite pasar de `publicado` a `aprobado` vía PATCH `/aprobar` | **P0 (Alta)** |
| **DOM-02** | Idempotencia en `/api/publish` | **FAIL** | Retorna 200 en re-publicaciones sin registrar conflicto (409) | **P1 (Media)** |
| **FE-01** | Persistencia de Edición en `localSMService` | **FAIL** | `useEditProposal` pasa `{hook, body, cta}` pero el servicio ignora los campos | **P0 (Alta)** |
| **FE-02** | Máquina de Estados en `localSMService` | **FAIL** | `approveLocalProposal` revierte propuestas ya publicadas | **P0 (Alta)** |
| **FE-04** | Resiliencia de Corrupción `localStorage` | **FAIL** | JSON truncado resetea la grilla completa sin backup de rescate | **P0 (Alta)** |
| **FE-05** | Observabilidad de Sincronización Backend | **FAIL** | `syncMutationToBackend` tiene `.catch(() => {})` vacío que traga caídas | **P1 (Media)** |
| **RES-01** | Métrica de Fallback en `postingDaemon` | **FAIL** | Despacho a fallback local se contabiliza como `publicadasExitosamente++` | **P0 (Alta)** |
| **INT-01** | Consistencia de Puertos Frontend/Backend | **FAIL** | Frontend hardcodea `localhost:4015` vs Backend por defecto `4002` | **P0 (Alta)** |

---

## 2. Diagnóstico Quirúrgico en 5 Puntos (Hallazgos Críticos)

### 2.1. Hallazgo P0-1: Pérdida Silenciosa de Ediciones de Texto (`localSMService.ts`)
- **Causa Raíz:** En `src/services/localSMService.ts` (`updateLocalProposal`), la función acepta `{ title, hook, body, cta, copy_tres_pasos, ... }`. Sin embargo, dentro del mapeo del borrador seleccionado, solo sobreescribe `copy_tres_pasos` si se pasa el objeto estructurado. Si un componente (como el hook `useEditProposal` de `useProposals.ts`) pasa campos sueltos (`hook`, `body`, `cta`), estos campos son completamente ignorados y la mutación no se almacena en el borrador interno.
- **Riesgo:** El usuario edita el copy en la UI, ve éxito cosmético, pero al recargar o sincronizar con SQLite la edición ha desaparecido.
- **Solución:** Unificar el parser en `updateLocalProposal` para que si se envían `hook`, `body` o `cta` planos, reconstruya automáticamente el `CopyCalibradoTresPasos` canónico.

### 2.2. Hallazgo P0-2: Falso Positivo de Publicación en Fallback de Red (`postingDaemon.ts`)
- **Causa Raíz:** En `src/infrastructure/posting/postingDaemon.ts`, al producirse un fallo de red o timeout de Zernio, el Circuit Breaker ejecuta exitosamente el callback de fallback que preserva la pieza en SQLite con estado `aprobado` y un log en `motivo_rechazo`. No obstante, el flujo principal del bucle incrementa incondicionalmente `result.publicadasExitosamente++` basándose en que `postId` tiene un valor retornado.
- **Riesgo:** Violación directa del **Pilar 2 de Memoria Operativa SRE (Cero Tolerancia al Falso Positivo)**. El sistema reporta a la dirección que la pieza se publicó en redes cuando en realidad solo fue encolada localmente por falla de red externa.
- **Solución:** Discriminar `execution.fromFallback`: si provino de fallback, incrementar `result.fallidas++` o una nueva métrica `result.encoladasLocalmenteFallback++`.

### 2.3. Hallazgo P0-3: Reseteo Destructivo ante Corrupción de `localStorage` (`localSMService.ts`)
- **Causa Raíz:** En `getLocalProposals()`, el bloque `try/catch` captura errores de parseo (`SyntaxError: Unexpected token...`). Ante cualquier falla, registra un `console.warn` y ejecuta inmediatamente `saveLocalProposals(flatList)`, sobrescribiendo la clave `mejora_sm_local_proposals_v2` con la grilla inicial de 26 semanas limpia.
- **Riesgo:** Si ocurre un corte de energía, cuota excedida de navegador o corrupción de un byte en el storage local, todas las aprobaciones, borradores editados y fechas personalizadas se borran irreversiblemente.
- **Solución:** Implementar patrón de **Inmutabilidad Defensiva y Rescate**: antes de sobreescribir, respaldar el valor corrupto en `mejora_sm_proposals_corrupted_backup_<timestamp>` e intentar un parser tolerante a fallos antes de regenerar.

### 2.4. Hallazgo P0-4: Desalineación de Puertos y Silent Failures (`INT-01`)
- **Causa Raíz:** `localSMService.ts` declara:
  ```typescript
  const LOCAL_HTTP_BASE = "http://localhost:4015";
  ```
  Mientras que `server.ts` declara:
  ```typescript
  const PORT = Number(process.env.MEJORA_SM_PORT) || 4002;
  ```
  Adicionalmente, `syncMutationToBackend` implementa:
  ```typescript
  fetch(`${LOCAL_HTTP_BASE}${endpoint}`, ...).catch(() => {});
  ```
- **Riesgo:** Si el servidor local se inicia con su puerto estándar (4002), el cliente React en el navegador envía peticiones de sincronización al puerto 4015. Las peticiones fallan por conexión rechazada, pero como el `catch` está vacío, el frontend no muestra ningún aviso y SQLite queda desincronizado con respecto al navegador.
- **Solución:** Parametrizar la URL base mediante `import.meta.env.VITE_LOCAL_API_URL || window.location.origin` (o fallback relativo `/api/...`), e implementar una cola de salida local (`outbox_queue`) cuando la red local no responda.

### 2.5. Hallazgo P1-1: Ausencia de Compresión de Assets en Vuelo (`PERF-01`)
- **Causa Raíz:** La función `serveStaticDistFile` en `src/interfaces/http/router.ts` lee directamente los archivos desde el disco y los entrega vía `res.end(content)` sin cabeceras `Content-Encoding: gzip` ni `br`.
- **Impacto:** El archivo JS principal pesa **305.9 kB** sin comprimir. Con compresión Brotli se reduce a **70.8 kB** (reducción del 76.8% en ancho de banda y tiempo de carga móvil).

---

## 3. Plan Maestro de Optimización y Mejoras

El plan se divide en 3 fases quirúrgicas:

```mermaid
graph TD
    subgraph Fase 1: Blindaje SRE y Cero Falsos Positivos [Inmediato P0]
        A1[Corregir updateLocalProposal en localSMService] --> A2[Métricas de Fallback en postingDaemon]
        A2 --> A3[Backup de Rescate ante Corrupción localStorage]
        A3 --> A4[Unificar Puertos y Eliminar Catch Vacíos]
    end

    subgraph Fase 2: Performance y Compresión [P1]
        B1[Middleware de Compresión Gzip/Deflate en router.ts] --> B2[Índice Compuesto SQLite estado + dia]
        B2 --> B3[CORS Configurable con Whitelist Local]
        B3 --> B4[Paginación y ETag en /api/posts]
    end

    subgraph Fase 3: Arquitectura y Tipado Limpio [P2]
        C1[Eliminar 56 Any/Unused en ESLint] --> C2[Outbox Queue Offline para localSMService]
        C2 --> C3[Singleton Persistente para ZernioCircuitBreaker]
    end

    Fase 1 --> Fase 2 --> Fase 3
```

---

## 4. Especificación Técnica de las Mejoras

### 4.1. Mejora 1: Blindaje de `updateLocalProposal` en `localSMService.ts`
Permitir que la UI actualice `hook`, `body` y `cta` directamente sin requerir obligatoriamente el objeto anidado:

```typescript
// Implementación propuesta:
export function updateLocalProposal(
  id: string,
  fields: {
    title?: string;
    hook?: string;
    body?: string;
    cta?: string;
    copy_tres_pasos?: CopyCalibradoTresPasos;
    imagen_boveda_vinculada?: { id: string; ruta_archivo_local: string; titulo?: string };
    borrador_seleccionado?: OpcionBorrador;
  }
): PropuestaMejoraSMDTO[] {
  const all = getLocalProposals();
  const updated = all.map((p) => {
    if (p.propuesta_id === id || (p as any).id === id) {
      const borradorActivo = fields.borrador_seleccionado || p.borrador_seleccionado || "A";
      const nuevosBorradores = p.borradores.map((b) => {
        if (b.opcion === borradorActivo) {
          const nuevoHook = fields.hook ?? fields.copy_tres_pasos?.paso1_dolor ?? b.copy_tres_pasos.paso1_dolor;
          const nuevoReencuadre = fields.body ?? fields.copy_tres_pasos?.paso2_reencuadre ?? b.copy_tres_pasos.paso2_reencuadre;
          const nuevoCta = fields.cta ?? fields.copy_tres_pasos?.paso3_direccion_web ?? b.copy_tres_pasos.paso3_direccion_web;

          return {
            ...b,
            titulo_portada: fields.title ?? b.titulo_portada,
            copy_tres_pasos: {
              paso1_dolor: nuevoHook,
              paso2_reencuadre: nuevoReencuadre,
              paso3_direccion_web: nuevoCta,
            },
            cuerpo_texto: `${nuevoHook}\n\n${nuevoReencuadre}`,
            cta_texto: nuevoCta,
          };
        }
        return b;
      }) as [BorradorPropuestaDTO, BorradorPropuestaDTO, BorradorPropuestaDTO];

      return {
        ...p,
        borradores: nuevosBorradores,
        borrador_seleccionado: borradorActivo,
        imagen_boveda_vinculada: fields.imagen_boveda_vinculada ?? p.imagen_boveda_vinculada,
      };
    }
    return p;
  });

  saveLocalProposals(updated);
  return updated;
}
```

---

### 4.2. Mejora 2: Eliminación de Falsos Positivos en `postingDaemon.ts`
Discriminar rigurosamente si la pieza fue despachada a la red real o retenida en SQLite:

```typescript
export interface PostingCycleResult {
  propuestasProcesadas: number;
  publicadasExitosamente: number;
  encoladasFallbackLocal: number; // NUEVA MÉTRICA SRE
  fallidas: number;
  detalles: Array<{
    propuestaId: string;
    canal: CanalDestino;
    postId?: string;
    fromFallback?: boolean;
    error?: string;
    payload?: ZernioPostPayload;
  }>;
}

// Dentro del bucle de runPostingCycle:
if (execution.fromFallback) {
  result.encoladasFallbackLocal++;
  // NO incrementar publicadasExitosamente
} else {
  result.publicadasExitosamente++;
  repository.actualizarEstadoPropuesta(propuesta.propuesta_id, "publicado");
}
```

---

### 4.3. Mejora 3: Compresión en Vuelo (`router.ts`)
Integrar compresión con `node:zlib` para archivos estáticos mayores a 1 kB:

```typescript
import * as zlib from "node:zlib";

// En serveStaticDistFile:
const acceptEncoding = req.headers["accept-encoding"] || "";
if (ext !== ".html" && content.length > 1024) {
  if (acceptEncoding.includes("br")) {
    const compressed = zlib.brotliCompressSync(content);
    res.writeHead(200, {
      ...headers,
      "Content-Encoding": "br",
      "Content-Length": compressed.length,
    });
    res.end(compressed);
    return true;
  } else if (acceptEncoding.includes("gzip")) {
    const compressed = zlib.gzipSync(content);
    res.writeHead(200, {
      ...headers,
      "Content-Encoding": "gzip",
      "Content-Length": compressed.length,
    });
    res.end(compressed);
    return true;
  }
}
```

---

### 4.4. Mejora 4: Optimización del Esquema SQLite (`schema.ts`)
Añadir el índice compuesto para eliminar el `TEMP B-TREE` en las consultas de publicación:

```sql
CREATE INDEX IF NOT EXISTS idx_propuestas_estado_dia 
ON propuestas_sm(estado, dia_programado ASC);
```

---

## 5. Pre-Flight Checklist de Implementación
- [ ] Ejecutar prueba de regresión `npm test` antes de cualquier edición.
- [ ] Aplicar corrección P0 en `src/services/localSMService.ts`.
- [ ] Aplicar corrección P0 en `src/infrastructure/posting/postingDaemon.ts`.
- [ ] Aplicar compresión Brotli/Gzip en `src/interfaces/http/router.ts`.
- [ ] Inyectar índice compuesto en `src/infrastructure/sqlite/schema.ts`.
- [ ] Validar con `npx tsc -b` (0 errores).
- [ ] Verificar que las 14 sondas pasen en modo verde en `scratch/e2e-probes.ts`.
- [ ] Sincronizar espejos con `sync-suite-mirrors.ps1`.
