// Página puente de MSAL v5 (redirect.html, sin React ni React Router): recibe la respuesta de Microsoft,
// se la entrega a la app y la vuelve a abrir en la misma dirección desde donde se inició sesión.
import { broadcastResponseToMainFrame } from '@azure/msal-browser/redirect-bridge';

broadcastResponseToMainFrame().catch((error: unknown) => {
  console.error('No se pudo procesar la respuesta de Microsoft:', error);
  const mensaje = document.getElementById('mensaje');
  if (mensaje) {
    mensaje.textContent = 'No se pudo completar el inicio de sesión. ';
    const enlace = document.createElement('a');
    // La carpeta de la app ("/" en Netlify): desde ahí la app lleva al buscador.
    enlace.href = import.meta.env.BASE_URL;
    enlace.textContent = 'Volver a la aplicación';
    mensaje.append(enlace);
  }
});
