# 📋 Especificación EDA — Estrategia Digital Autónoma

Documento original del proyecto EDA provisto por el usuario.

---

## OBJETIVO GENERAL

Construir una aplicación de gestión estratégica de contenidos que funcione mediante la interacción de múltiples Agentes de IA. El sistema debe ser capaz de procesar la identidad de marca localmente, debatir estrategias y ejecutar publicaciones automáticas aprendiendo de los resultados.

---

## 1. ARQUITECTURA DE MODELOS (STACK HÍBRIDO)

Configurar el backend para conectar con los siguientes motores según la tarea:

| Motor | Modelo | Uso |
|---|---|---|
| **Cerebro Estratégico (Local/RAG)** | Llama 4 Scout (vía Ollama/Local) | Procesar manuales, documentos de Buyer Persona y Tono de Voz. Manejar contextos largos sin pérdida de datos. |
| **Motor de Generación (Velocidad)** | Groq (Llama 4 Scout 8B) vía API | Diálogo rápido entre agentes y redacción de copys. |
| **Analista de KPIs (Lógica)** | DeepSeek V3.2 | Procesar métricas de interacción y sugerir ajustes lógicos en la estrategia. |

---

## 2. MÓDULOS DEL SISTEMA

### 2.1 Bóveda de Conocimiento
- Interfaz para cargar archivos (PDF/Doc) que definen el "Manual de Criterio Comercial"
- Este conocimiento debe ser la base innegociable de cada post
- Implementación: RAG (Retrieval Augmented Generation)

### 2.2 Mesa de Diálogo (Multi-Agente)
Antes de cada publicación, el sistema ejecuta un flujo:
1. **Agente Estratega** propone tema/ángulo
2. **Agente Creativo** redacta/diseña
3. **Agente Crítico** (basado en documentos) aprueba o rechaza

### 2.3 Generador Multiformato
Integración con APIs de imagen y video para crear:
- **Carruseles educativos** — automatización de slides
- **Historias interactivas** — a partir de fotos subidas
- **Infografías** — basadas en tendencias del mercado

### 2.4 Publicador y Calendario
- Sistema de posteo recurrente
- Capacidad de operar de forma autónoma durante años
- Parámetros de días y horas específicos

---

## 3. BUCLE DE APRENDIZAJE Y REACCIÓN

### 3.1 Monitor de Métricas
- Lectura de KPIs de Instagram
- Identificar qué publicaciones tienen mejor rendimiento

### 3.2 Actualización de Reglas
- Crear nuevas "reglas de éxito" automáticamente basándose en lo aprendido
- Sugerir temas nuevos de manera proactiva

### 3.3 Gestor de Interacciones
- Reaccionar ante nuevos seguidores y likes de forma autónoma
- Mantener la cuenta viva

---

## 4. INTERFAZ Y CONTROL (UX/UI)

### 4.1 Dashboard de Director
- Panel central donde supervisar los KPIs y las sugerencias de la IA

### 4.2 Modo Supervisión
- Sección de "Aprobación Pendiente"
- Validar contenido generado antes de que se publique (opcional)

### 4.3 Laboratorio de Contenido
- Espacio para subir fotos/videos sueltos
- La IA ofrece 3 propuestas estratégicas de uso inmediato

---

## Mapeo a implementación

| Spec EDA | Implementación | Fase |
|---|---|---|
| Cerebro Estratégico (Ollama) | `agents/strategist.js` | Fase 2 |
| Motor de Generación (Groq) | `agents/creative.js` | Fase 2 |
| Analista de KPIs (DeepSeek) | `agents/critic.js` | Fase 2 |
| Bóveda de Conocimiento | `knowledge/vault.js` + `rag.js` | Fase 2 |
| Mesa de Diálogo | `agents/orchestrator.js` | Fase 2 |
| Generador Multiformato | `generator/` (futuro) | Fase 6 |
| Publicador y Calendario | `publisher/calendar.js` | Fase 3 |
| Monitor de Métricas | `monitor/kpi.js` | Fase 4 |
| Bucle de Aprendizaje | `monitor/rules.js` | Fase 6 |
| Gestor de Interacciones | `interactions/engager.js` | Fase 6 |
| Dashboard de Director | `eda-dashboard/` | Fase 5 |
| Modo Supervisión | `pages/Approval.jsx` | Fase 5 |
| Laboratorio de Contenido | `pages/Laboratory.jsx` | Fase 5 |
