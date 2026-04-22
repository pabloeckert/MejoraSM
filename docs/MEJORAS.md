# 🔍 Análisis y Mejoras — MejoraSM

## Estado del proyecto al 22/04/2026

### Componentes
1. **Extensión Chrome (MejoraINSSIST)** — v1.1.0, funcional
   - Manifest V2 (deprecado, Chrome eliminará soporte)
   - Buyer Personas (8 perfiles argentinos)
   - Hashtag Packs (6 packs por engagement)
   - Quick Replies de ventas (24 respuestas)
   - Base INSSIST: dark mode, multi-cuenta, post later

2. **Dashboard Web (EDA)** — en desarrollo, shell vacío
   - React + Tailwind + shadcn/ui (Lovable)
   - Supabase como backend
   - 5 páginas: Dashboard, Bóveda, Mesa de Diálogo, Laboratorio, Configuración
   - Stats hardcodeados en "0", sin conexión a Supabase

3. **Backend EDA** — pendiente (Fase 2)
   - Multi-agente: Groq + Ollama + DeepSeek + Gemini
   - RAG con Bóveda de Conocimiento
   - Mesa de Diálogo multi-agente

## Problemas encontrados

### Críticos
1. `.env` commiteado al repo (Supabase anon key público)
2. Dashboard sin conexión real a datos
3. index.html tenía metadatos de Lovable genéricos (ya fixeado)

### Importantes
4. Manifest V2 deprecado — migrar a V3 antes de que Chrome lo elimine
5. CSP permite `unsafe-eval` en extensión — riesgo de seguridad
6. Legacy files en repo (caption-helper.js, hashtag-packs.js, sales-quick-replies.js)
7. `lovable-tagger` innecesario en production
8. `noImplicitAny: false` y `strictNullChecks: false` — pierde beneficios de TypeScript

### Menores
9. No hay `.env.example` (ya creado)
10. Browserslist desactualizado (10 meses)
11. No hay tests reales
12. `components.json` de shadcn sin uso real

## Mejoras sugeridas

### Alta prioridad
- Conectar Dashboard a Supabase (datos reales)
- Implementar Mesa de Diálogo con Groq (IA real)
- Activar `strictNullChecks` en tsconfig
- Crear `.env.example` (✅ hecho)

### Media prioridad
- Migrar extensión a Manifest V3
- Limpiar archivos legacy
- Sacar `unsafe-eval` del CSP
- Quitar `lovable-tagger`

### Baja prioridad
- Actualizar browserslist
- Agregar tests reales
- Soporte de temas en extensión

## IAs gratuitas disponibles para el proyecto

| Proveedor | Modelo | Free tier | Uso en EDA |
|---|---|---|---|
| **Groq** ⭐ | Llama 4 Scout 8B | ~30 req/min | Agente Creativo |
| **Ollama** | Llama 4 Scout (local) | Gratis total | Agente Estratega (RAG) |
| **DeepSeek** | DeepSeek V3 | Con registro | Agente Crítico |
| **Gemini** | Gemini 1.5 Flash | 60 req/min | Análisis de imágenes |
| **Hugging Face** | Varios open-source | Rate limit generoso | Embeddings |
