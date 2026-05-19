# 🚀 Guía de Deployment

---

## 1. Instalación de la extensión en Chrome (desarrollo)

```bash
# Clonar el repo
git clone https://github.com/pabloeckert/MejoraINSSIST.git
cd MejoraINSSIST
```

1. Abrir `chrome://extensions/`
2. Activar **"Modo desarrollador"** (toggle arriba a la derecha)
3. Click en **"Cargar descomprimida"**
4. Seleccionar la carpeta `MejoraINSSIST`
5. El icono 🎯 aparece en la barra de Chrome
6. Ir a `instagram.com` → aparece el botón flotante

---

## 2. Deploy Landing Page al subdominio

**Objetivo:** `util.mejoraok.com/MejoraSM/index.html`

### Datos FTP

```
Host:     [CONFIGURADO EN GITHUB SECRETS]
Port:     21
User:     [CONFIGURADO EN GITHUB SECRETS]
Pass:     [CONFIGURADO EN GITHUB SECRETS]
Path:     [CONFIGURADO EN GITHUB SECRETS]
```

### Método A: File Manager de Hostinger (recomendado)

1. Entrar a [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Ir a **Archivos → File Manager**
3. Navegar a `domains/mejoraok.com/public_html/util/`
4. Crear carpeta `MejoraSM` si no existe
5. Subir `landing/index.html` como `index.html`
6. Verificar en `https://util.mejoraok.com/MejoraSM/`

### Método B: FileZilla o cliente FTP

Usar credenciales del chat privado. Modo Active si PASV falla.

Subir estos archivos:

```
util/MejoraSM/
├── index.html                    ← Landing page
├── manifest.json                 ← Para descarga directa (opcional)
└── MejoraINSSIST-v1.1.0.zip     ← ZIP de la extensión (opcional)
```

### Método C: cPanel File Manager

1. Entrar a cPanel desde Hostinger
2. Abrir **File Manager**
3. Navegar a `public_html/util/`
4. Crear directorio `MejoraSM`
5. Subir archivos

### ⚠️ Nota sobre FTP

El FTP data connection puede fallar desde ciertos servidores debido a restricciones de firewall en puertos pasivos. Si curl/ftplib falla con timeout:

```bash
# Probar con passive mode deshabilitado
curl --disable-epsv -T archivo.html \
  "ftp://HOST/util/MejoraSM/archivo.html" \
  --user "USER:PASS"
```

---

## 3. Deploy del ZIP de la extensión (para descarga)

Si querés que los usuarios descarguen la extensión desde la landing page:

```bash
# Crear ZIP (desde la raíz del repo)
cd MejoraINSSIST
zip -r ../MejoraINSSIST-v1.1.0.zip . \
  -x ".git/*" \
  -x "node_modules/*" \
  -x ".github/*" \
  -x "documents/*" \
  -x "landing/*"
```

Subir el ZIP a `util/MejoraSM/` y agregar link en el landing page.

---

## 4. Deploy del Backend EDA (futuro)

### Opción A: Railway.app (recomendado para MVP)

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
cd eda-backend
railway init
railway up
```

### Opción B: Fly.io

```bash
# Instalar Fly CLI
curl -L https://fly.io/install.sh | sh

# Deploy
cd eda-backend
fly launch
fly deploy
```

### Opción C: Hostinger (Node.js)

1. Activar Node.js en hPanel
2. Subir archivos por FTP a `util/MejoraSM/api/`
3. Configurar `package.json` con start script
4. Configurar `.htaccess` para proxy a Node.js

---

## 5. Deploy del Dashboard (futuro)

### Build estático

```bash
cd eda-dashboard
npm run build
# Output en dist/
```

### Subir a Hostinger

Subir el contenido de `dist/` a `util/MejoraSM/dashboard/`

### Configurar SPA routing

Agregar a `.htaccess` en `util/MejoraSM/dashboard/`:

```apache
RewriteEngine On
RewriteBase /util/MejoraSM/dashboard/
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /util/MejoraSM/dashboard/index.html [L]
```

---

## 6. Variables de entorno (Backend futuro)

```env
# .env

# Server
PORT=3000
NODE_ENV=production
API_URL=https://util.mejoraok.com/MejoraSM/api

# Database
DATABASE_URL=./data/eda.db

# AI Providers
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama4-scout

GROQ_API_KEY=gsk_xxxxx
GROQ_MODEL=llama-4-scout-8b-instruct

DEEPSEEK_API_KEY=sk_xxxxx
DEEPSEEK_MODEL=deepseek-v3

GEMINI_API_KEY=AIzaSyxxxxx
GEMINI_MODEL=gemini-1.5-flash

# Instagram
INSTAGRAM_APP_ID=xxxxx
INSTAGRAM_APP_SECRET=xxxxx
INSTAGRAM_ACCESS_TOKEN=xxxxx

# Auth
JWT_SECRET=xxxxx
```
