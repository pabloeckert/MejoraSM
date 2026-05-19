# 🤖 Catálogo de IAs Gratuitas

Recursos de IA disponibles sin costo (o con free tier generoso) para el proyecto EDA.

---

## Proveedores de LLM

### 1. Groq ⭐ Recomendado
- **Modelo:** Llama 4 Scout 8B, Llama 3, Mixtral
- **Free tier:** ~30 req/min, sin límite diario conocido
- **Ventaja:** Ultra rápido (inference en LPU), baja latencia
- **Uso en EDA:** Agente Creativo — redacción rápida de copys
- **API:** `https://api.groq.com/openai/v1/chat/completions`
- **Docs:** https://console.groq.com/docs

```javascript
// Ejemplo de uso
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${GROQ_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'llama-4-scout-8b-instruct',
    messages: [{ role: 'user', content: 'Genera un hook para emprendedores saturados' }]
  })
});
```

### 2. Ollama (Local) ⭐ Para RAG
- **Modelos:** Llama 4 Scout, Llama 3, Mistral, Phi-3
- **Free tier:** Totalmente gratis (corre local)
- **Ventaja:** Sin límites, privacidad total, contexto largo
- **Uso en EDA:** Agente Estratega — procesamiento de documentos (RAG)
- **Requisito:** GPU decente (8GB+ VRAM recomendado)
- **Instalación:** https://ollama.ai

```bash
# Instalar y correr
ollama pull llama4-scout
ollama serve
# API disponible en http://localhost:11434
```

### 3. DeepSeek
- **Modelo:** DeepSeek V3, DeepSeek Coder
- **Free tier:** Disponible con registro
- **Ventaja:** Bueno en razonamiento lógico y código
- **Uso en EDA:** Agente Crítico — análisis de KPIs, lógica estratégica
- **API:** `https://api.deepseek.com/v1/chat/completions`
- **Docs:** https://platform.deepseek.com/api-docs

### 4. Google Gemini
- **Modelo:** Gemini 1.5 Flash, Gemini Pro
- **Free tier:** 60 req/min, 1M tokens/min
- **Ventaja:** Multimodal (texto + imagen + audio)
- **Uso en EDA:** Análisis de imágenes, generación de descripciones
- **API:** `https://generativelanguage.googleapis.com/v1beta`
- **Docs:** https://ai.google.dev/docs

### 5. Hugging Face Inference
- **Modelos:** Miles de modelos open-source
- **Free tier:** Rate limit generoso
- **Ventaja:** Acceso a modelos especializados
- **Uso en EDA:** Embeddings, clasificación, análisis de sentimiento
- **API:** `https://api-inference.huggingface.com/models/{model}`
- **Docs:** https://huggingface.co/docs/api-inference

### 6. Together AI
- **Modelos:** Llama 3, Mistral, CodeLlama
- **Free tier:** $25 crédito inicial
- **Ventaja:** Buena calidad, varios modelos
- **API:** `https://api.together.xyz/v1/chat/completions`

---

## Embeddings (para RAG)

### 1. Hugging Face Sentence Transformers
- **Modelo:** `all-MiniLM-L6-v2` (384 dims)
- **Costo:** Gratis (inference API)
- **Uso:** Vectorizar documentos de la Bóveda

### 2. Ollama Embeddings
- **Modelo:** `nomic-embed-text`
- **Costo:** Gratis (local)
- **Uso:** Alternativa local a HF

### 3. Cohere Embed
- **Free tier:** 100 llamadas/min
- **Ventaja:** Buena calidad multilingüe

---

## Generación de imágenes

### 1. Hugging Face Stable Diffusion
- **Modelo:** `stable-diffusion-xl-base-1.0`
- **Free tier:** Disponible (con cola)
- **Uso:** Generar imágenes para posts

### 2. Pollinations.ai
- **Costo:** Totalmente gratis, sin registro
- **API:** `https://image.pollinations.ai/prompt/{prompt}`
- **Uso:** Imágenes rápidas para carruseles

### 3. Unsplash API
- **Free tier:** 50 llamadas/hora
- **Uso:** Fotos de stock profesionales
- **API:** `https://api.unsplash.com/search/photos`

---

## Análisis de texto

### 1. Hugging Face Sentiment Analysis
- **Modelo:** `cardiffnlp/twitter-roberta-base-sentiment-latest`
- **Costo:** Gratis
- **Uso:** Analizar sentimiento de comentarios

### 2. LanguageTool API
- **Free tier:** 20 llamadas/min
- **Uso:** Corrección ortográfica/gramatical de copys

### 3. Perspective API (Google)
- **Costo:** Gratis
- **Uso:** Detectar toxicidad en comentarios

---

## APIs de Instagram (limitadas)

### Instagram Graph API (oficial)
- **Requisito:** Facebook Developer account + Instagram Business
- **Free tier:** Sí (con límites)
- **Funciones:** Publicar, leer métricas, gestionar comentarios
- **Limitación:** Solo cuentas Business/Creator
- **Docs:** https://developers.facebook.com/docs/instagram-api

### Instagram Basic Display API (deprecada)
- **Estado:** Meta la deprecó, migrar a Graph API

---

## Stack recomendado para EDA

```
┌─────────────────────────────────────────┐
│           STACK IA GRATUITO             │
├─────────────────────────────────────────┤
│                                         │
│  Estratega:  Ollama (Llama 4 Scout)     │
│  Creativo:   Groq (Llama 4 Scout 8B)    │
│  Crítico:    DeepSeek V3 o Gemini Flash │
│  Embeddings: HF Sentence Transformers   │
│  Imágenes:   Pollinations.ai / Unsplash │
│  Sentiment:  HF RoBERTa                 │
│  Gramática:  LanguageTool               │
│                                         │
│  Costo total estimado: $0/mes          │
│  (con rate limits aceptables)           │
└─────────────────────────────────────────┘
```

---

## Notas sobre rate limits

| Proveedor | Límite free | Estrategia |
|---|---|---|
| Groq | ~30 req/min | Cache + debounce |
| Ollama | Sin límite | Solo requiere GPU |
| DeepSeek | Variable | Usar como fallback |
| Gemini | 60 req/min | Ideal para multimodal |
| HF Inference | Variable | Para tareas batch |

**Estrategia general:** Usar Groq como principal (rápido), Ollama como backup (ilimitado), Gemini para multimodal, y DeepSeek para análisis lógico.
