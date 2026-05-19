# 🔒 Política de Privacidad — MejoraSM (EDA)

**Última actualización:** 29/04/2026
**Versión:** Draft — Requiere revisión legal antes de publicar

---

## 1. Responsable

**MejoraOK** — mejoraok.com
Contacto: [completar]

---

## 2. Datos que recopilamos

### 2.1 Datos de uso de la extensión Chrome
- Páginas de Instagram visitadas (URL, no contenido)
- Interacciones con la extensión (clicks, apertura de panel)
- Buyer persona detectado (generado localmente, no enviado)

### 2.2 Datos del sistema EDA (Dashboard)
- Documentos subidos a la Bóveda de Conocimiento
- Sesiones de diálogo y mensajes con agentes IA
- Propuestas de contenido generadas
- Configuración de agentes (proveedor, modelo, temperatura)
- Métricas de Instagram (si el usuario conecta su cuenta)

### 2.3 Datos técnicos
- Logs de Edge Functions (errores, tiempos de respuesta)
- IP del usuario (no almacenada, solo en tránsito)

---

## 3. Cómo usamos los datos

| Datos | Propósito | Base legal |
|---|---|---|
| Documentos de marca | Alimentar el contexto de los agentes IA (RAG) | Consentimiento |
| Sesiones de diálogo | Generar propuestas de contenido | Ejecución de contrato |
| Configuración | Personalizar la experiencia del usuario | Consentimiento |
| Métricas | Generar reglas de éxito y sugerencias | Consentimiento |
| Logs técnicos | Diagnosticar errores y mejorar el servicio | Interés legítimo |

---

## 4. Con quién compartimos los datos

| Proveedor | Datos compartidos | Propósito |
|---|---|---|
| **Supabase** (BaaS) | Todos los datos almacenados | Hosting y procesamiento |
| **Groq** | Textos de prompts | Generación de contenido IA |
| **DeepSeek** | Textos de prompts | Evaluación de contenido |
| **Google Gemini** | Textos de prompts | Backup de generación |
| **HuggingFace** | Textos de documentos | Generación de embeddings |

**No vendemos datos a terceros.**

---

## 5. Retención de datos

| Datos | Período |
|---|---|
| Documentos | Hasta que el usuario los elimine |
| Sesiones de diálogo | 90 días (configurable) |
| Propuestas | 1 año |
| Métricas | 1 año |
| Logs técnicos | 30 días |

---

## 6. Derechos del usuario

El usuario puede:
- **Acceder** a todos sus datos desde el Dashboard
- **Eliminar** documentos individuales o todos
- **Exportar** sus datos (propuesta: implementar en ETAPA 7)
- **Revocar consentimiento** eliminando su cuenta

---

## 7. Seguridad

- Datos en tránsito: HTTPS/TLS
- Datos en reposo: Cifrado en Supabase (AES-256)
- API keys: Almacenadas como secrets en Supabase (no en código)
- RLS: Row Level Security habilitado en todas las tablas
- Backups: Supabase gestiona backups automáticos

---

## 8. Cookies y tracking

- La extensión Chrome NO usa cookies
- El Dashboard usa localStorage para preferencias de UI
- No usamos Google Analytics ni tracking de terceros

---

## 9. Menores de edad

El servicio está dirigido a profesionales y emprendedores (18+).
No recopilamos conscientemente datos de menores.

---

## 10. Cambios en esta política

Notificaremos cambios significativos vía el Dashboard o por email.

---

## 11. Contacto

Para consultas sobre privacidad: [completar email]
Para ejercer derechos: [completar proceso]

---

*⚠️ Este es un draft. Requiere revisión por un abogado antes de publicar.*
*Considerar: Ley 25.326 (Protección de Datos Personales, Argentina), GDPR si hay usuarios europeos.*
