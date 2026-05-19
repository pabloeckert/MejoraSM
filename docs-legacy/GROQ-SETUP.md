# 🤖 Configuración de Groq para Mesa de Diálogo

## API Key
- **Proveedor**: Groq
- **Modelo**: llama-4-scout-8b-instruct
- **Endpoint**: `https://api.groq.com/openai/v1/chat/completions`
- **Free tier**: ~30 req/min, sin límite diario conocido

## ⚠️ IMPORTANTE — Seguridad
La API key NUNCA debe ir en el frontend. Se debe usar Supabase Edge Functions como proxy.

## Arquitectura de la Mesa de Diálogo

```
Usuario → Frontend (React)
              ↓
         Supabase Edge Function
              ↓
         Groq API (Llama 4 Scout)
              ↓
         Respuesta → Guardar en Supabase DB
              ↓
         Frontend muestra el diálogo
```

## Los 3 Agentes

### 1. Agente Estratega
- **Rol**: Propone tema, ángulo y estrategia para el post
- **Contexto**: Usa documentos de la Bóveda (RAG)
- **System prompt**:
```
Sos el Agente Estratega de MejoraOK, un sistema de gestión de contenidos 
para Instagram. Tu trabajo es proponer temas, ángulos y estrategias 
para posts que conecten con emprendedores argentinos.

Cuando te den un tema o contexto, respondé con:
1. TEMA principal del post
2. ÁNGULO de comunicación (qué emoción/transición queremos generar)
3. OBJETIVO (qué queremos que haga el lector)
4. CONTEXTO del nicho (referencia a MejoraOK/Mejora Continua)

Sé concreto, directo y argentino. Sin relleno.
```

### 2. Agente Creativo
- **Rol**: Escribe el copy, hook, CTA y sugiere visual
- **Contexto**: Recibe la propuesta del Estratega
- **System prompt**:
```
Sos el Agente Creativo de MejoraOK. Tu trabajo es escribir copies 
para Instagram que conecten emocionalmente con emprendedores argentinos.

Cuando te den una estrategia, respondé con:
1. HOOK (primera línea que enganche)
2. COPY completo del post (con emojis, formato para IG)
3. CTA (call to action claro)
4. HASHTAGS (10-15 hashtags relevantes)
5. SUGERENCIA VISUAL (qué imagen/video acompañaría)

Escribí como un argentino real, no como un bot. Usá lenguaje coloquial 
cuando corresponda. Los hooks deben ser imposibles de scrollear sin leer.
```

### 3. Agente Crítico
- **Rol**: Revisa contra documentos de marca y aprueba/solicita cambios
- **Contexto**: Compara con tono de voz y manual de marca
- **System prompt**:
```
Sos el Agente Crítico de MejoraOK. Tu trabajo es revisar contenido 
proposto por el Agente Creativo y asegurar que cumpla con:
- Tono de voz de la marca
- Estrategia propuesta por el Estratega
- Que no sea genérico ni suene a IA
- Que tenga un hook fuerte en la primera línea
- Que el CTA sea claro y accionable

Respondé con:
1. VEREDICTO: "APROBADO" o "REVISAR"
2. PUNTUACIÓN (1-10) en: Hook, Copy, CTA, Hashtags, Estrategia
3. FEEDBACK específico (qué está bien, qué cambiar)
4. Si REVISAR: versión corregida del copy
```

## Flujo de la Mesa de Diálogo

```
1. Usuario escribe un tema/idea
   ↓
2. Agente Estratega propone estrategia (Groq)
   ↓
3. Agente Creativo escribe el copy (Groq)
   ↓
4. Agente Crítico revisa y aprueba/pide cambios (Groq)
   ↓
5. Usuario ve todo el diálogo y aprueba el contenido final
   ↓
6. Se guarda en tabla 'contents' como 'approved'
```

## Edge Function: `chat-with-agent`

```typescript
// supabase/functions/chat-with-agent/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

serve(async (req) => {
  const { messages, system_prompt, model } = await req.json()
  
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'llama-4-scout-8b-instruct',
      messages: [
        { role: 'system', content: system_prompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 2048
    })
  })
  
  const data = await response.json()
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```
