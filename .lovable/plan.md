

## Estratega Digital Autónomo (EDA) — MVP

### Phase 1: Foundation & UI Shell
- **App layout**: Sidebar navigation + main content area with dark professional theme
- **Pages**: Dashboard, Bóveda de Conocimiento, Mesa de Diálogo, Laboratorio de Contenido, Configuración
- **Auth**: Supabase auth (email/password) to protect the app

### Phase 2: Configuración de Modelos (Settings)
- UI to configure which AI model/provider powers each agent role:
  - **Agente Estratega** (proposes strategy)
  - **Agente Creativo** (writes copy/designs)
  - **Agente Crítico** (reviews against brand docs)
- Options per agent: Lovable AI (Gemini/GPT-5), Groq API key, DeepSeek API key
- API keys stored securely in Supabase

### Phase 3: Bóveda de Conocimiento (Knowledge Vault)
- Upload PDF/DOCX files (brand manual, buyer persona, tone of voice)
- Files stored in Supabase Storage
- Text extraction and chunking for RAG context
- Documents stored in a Supabase table with embeddings for retrieval
- UI to view, manage, and delete uploaded documents

### Phase 4: Mesa de Diálogo (Multi-Agent Dialog)
- When creating a new post, trigger a 3-step agent conversation:
  1. **Estratega** proposes topic + angle (using RAG context from vault)
  2. **Creativo** drafts the copy and suggests visual direction
  3. **Crítico** reviews against brand documents, approves or requests changes
- Full conversation displayed in a chat-like UI with agent avatars
- User can intervene, approve, or restart at any step
- Each agent calls the AI model configured in settings via Edge Functions

### Phase 5: Laboratorio de Contenido
- Upload photos/videos
- AI generates 3 strategic proposals for each upload (post ideas with copy)
- Uses brand context from the Knowledge Vault

### Phase 6: Dashboard
- Overview of generated content and approval status
- Pending approvals section
- Content calendar view (manual scheduling for MVP — automated publishing in a future phase)
- Basic stats placeholder (to be connected to Instagram API later)

### Phase 7: Image Generation
- AI-generated images for posts using Lovable AI image models
- Carousel/slide generation using HTML Canvas rendering
- Export as images ready for social media

### Tech Stack
- **Frontend**: React + Tailwind + shadcn/ui
- **Backend**: Supabase (auth, database, storage, edge functions)
- **AI**: Lovable AI Gateway as default, with configurable Groq/DeepSeek API keys per agent
- **Storage**: Supabase Storage for documents and media

### Deferred to Future Phases
- Instagram Graph API integration (publishing + metrics)
- Automated learning loop (KPI-based rule generation)
- Autonomous interaction management (auto-likes, auto-follows)
- Video generation
- Long-term autonomous scheduling

