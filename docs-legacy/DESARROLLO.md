# 🚀 Plan de Desarrollo — MejoraSM (Sistema EDA)

**Última actualización:** 22/04/2026
**Arquitectura:** Frontend Lovable (React) + Supabase (DB + Edge Functions + Storage)

---

## Decisión Arquitectónica Clave

**No necesitamos un servidor separado.** Supabase Edge Functions (Deno) nos da:
- Backend serverless GRATIS (500K invocaciones/mes)
- PostgreSQL con pgvector para RAG
- Storage para documentos
- Auth si la necesitamos

**Stack final: $0/mes**

```
┌──────────────────────────────────────────────────┐
│  FRONTEND (Lovable/React)                        │
│  src/pages/ → 5 páginas ya construidas           │
│  src/services/ → cliente API a Edge Functions    │
└──────────────────────┬───────────────────────────┘
                       │ fetch()
┌──────────────────────▼───────────────────────────┐
│  SUPABASE EDGE FUNCTIONS (Deno)                  │
│                                                  │
│  /ai-gateway    → Router universal de IA         │
│  /orchestrator  → Mesa de Diálogo multi-agente   │
│  /vault-process → Procesa docs → embeddings     │
│  /publish       → Publicador + calendario        │
│  /analyze-kpi   → Analiza métricas IG            │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────┐
│  SUPABASE POSTGRES + pgvector                    │
│                                                  │
│  documents       → PDFs/Docs procesados          │
│  doc_chunks      → Fragmentos con embeddings     │
│  agent_config    → Config de los 3 agentes       │
│  proposals       → Contenido generado            │
│  calendar_events → Calendario editorial          │
│  metrics         → KPIs de Instagram             │
│  success_rules   → Reglas aprendidas             │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  PROVEEDORES DE IA (Free Tier)                   │
│                                                  │
│  Groq      → Llama 4 Scout 8B (principal)        │
│  DeepSeek  → V3.2 (análisis lógico)              │
│  Gemini    → 1.5 Flash (backup + multimodal)     │
│  HF        → Sentence Transformers (embeddings)  │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  EXTENSIÓN CHROME (MejoraINSSIST)                │
│  extension/ → Ya funciona (v1.1.0)               │
│  Conectará al backend via API para features v2   │
└──────────────────────────────────────────────────┘
```

---

## Fase 1: Base de Datos + Storage ✅ EN CURSO

### Tablas SQL

```sql
-- Habilitar pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Documentos de la Bóveda
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chunks con embeddings para RAG
CREATE TABLE doc_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(384), -- all-MiniLM-L6-v2 = 384 dimensions
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuración de agentes
CREATE TABLE agent_config (
  id TEXT PRIMARY KEY, -- 'estratega', 'creativo', 'critico'
  provider TEXT NOT NULL DEFAULT 'groq',
  model TEXT NOT NULL,
  system_prompt TEXT,
  temperature REAL DEFAULT 0.7,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sesiones de Mesa de Diálogo
CREATE TABLE dialogue_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT,
  status TEXT DEFAULT 'active', -- active, completed, approved
  final_proposal TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mensajes de una sesión
CREATE TABLE dialogue_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES dialogue_sessions(id) ON DELETE CASCADE,
  agent TEXT NOT NULL, -- 'estratega', 'creativo', 'critico', 'user'
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Propuestas de contenido
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES dialogue_sessions(id),
  format TEXT NOT NULL, -- 'carrusel', 'historia', 'infografia', 'post'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  hashtags TEXT[],
  hook TEXT,
  cta TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, published
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Eventos del calendario editorial
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id),
  title TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  format TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Métricas de Instagram
CREATE TABLE metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id),
  post_id TEXT,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  saves INT DEFAULT 0,
  reach INT DEFAULT 0,
  impressions INT DEFAULT 0,
  engagement_rate REAL,
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reglas de éxito aprendidas
CREATE TABLE success_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL, -- 'hook', 'timing', 'format', 'hashtag', 'topic'
  condition JSONB NOT NULL,
  action JSONB NOT NULL,
  confidence REAL DEFAULT 0.5,
  times_applied INT DEFAULT 0,
  success_rate REAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice de búsqueda vectorial
CREATE INDEX ON doc_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

## Fase 2: Edge Functions

### 2.1 ai-gateway (Router universal)

```typescript
// supabase/functions/ai-gateway/index.ts
// Recibe: { provider, model, messages, system?, temperature? }
// Retorna: { content, usage }
```

### 2.2 orchestrator (Mesa de Diálogo)

Flujo:
1. Recibe tema/ángulo del usuario
2. Invoca Estratega → propone ángulo + hooks
3. Invoca Creativo → redacta copy completo
4. Invoca Crítico → evalúa contra documentos RAG
5. Retorna propuesta o pide revisión

### 2.3 vault-process (Bóveda RAG)

1. Recibe archivo (PDF/Doc)
2. Extrae texto
3. Chunks de ~500 tokens con overlap
4. Genera embeddings (HF API)
5. Guarda en doc_chunks

### 2.4 analyze-kpi (Monitor)

1. Lee métricas de Instagram (futuro: Graph API)
2. Invoca DeepSeek para análisis
3. Genera reglas de éxito
4. Sugiere ajustes

---

## Fase 3: Frontend (Conexión)

Cada página ya tiene el UI. Falta conectar con:
- `src/services/ai.ts` → cliente para Edge Functions
- `src/hooks/useVault.ts` → upload + list docs
- `src/hooks/useDialogue.ts` → sessions + messages
- `src/hooks/useProposals.ts` → CRUD proposals
- `src/hooks/useMetrics.ts` → KPIs

---

## Fase 4: Publicador

- Instagram Graph API para publicar
- Cron job (Supabase pg_cron) para publicación recurrente
- Modo supervisión: aprobación antes de publicar

---

## Fase 5: Bucle de Aprendizaje

- Tracking de métricas por post
- Correlación contenido → rendimiento
- Generación de reglas de éxito
- Sugerencias proactivas

---

## Timeline Realista

| Semana | Fase | Entregable |
|---|---|---|
| 1 | DB + Storage + ai-gateway | Backend funcional |
| 2 | orchestrator + vault-process | Mesa de Diálogo viva |
| 3 | Frontend conectado | Todo el UI funcional |
| 4 | Publicador + Calendario | Posts automáticos |
| 5-6 | KPIs + Bucle de aprendizaje | Sistema completo |

---

## Costo Estimado

| Servicio | Free Tier | Costo |
|---|---|---|
| Supabase | 500K func, 500MB DB, 1GB storage | $0 |
| Groq | 30 req/min, sin límite diario | $0 |
| DeepSeek | Free tier disponible | $0 |
| Gemini | 60 req/min, 1M tokens/min | $0 |
| HF Embeddings | Rate limit generoso | $0 |
| **Total** | | **$0/mes** |
