import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Manejo automático de actualización de chunks dinámicos tras un nuevo despliegue.
// Vite emite 'vite:preloadError' cuando el hash de un módulo dinámico cambió en producción.
window.addEventListener("vite:preloadError", (event) => {
  console.warn("[Vite] Fallo de carga de módulo dinámico tras actualización. Recargando versión...", event);
  const storageKey = "vite_last_preload_reload";
  const lastReload = sessionStorage.getItem(storageKey);
  const now = Date.now();
  if (!lastReload || now - Number(lastReload) > 10000) {
    sessionStorage.setItem(storageKey, String(now));
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);

