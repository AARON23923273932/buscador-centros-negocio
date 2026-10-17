import { broadcastResponseToMainFrame } from '@azure/msal-browser/redirect-bridge';

broadcastResponseToMainFrame().catch((error: unknown) => {
  console.error('No se pudo procesar la respuesta de Microsoft:', error);
  const mensaje = document.getElementById('mensaje');
  if (mensaje) {
    mensaje.textContent = 'No se pudo completar el inicio de sesión. ';
    const enlace = document.createElement('a');
    enlace.href = import.meta.env.BASE_URL;
    enlace.textContent = 'Volver a la aplicación';
    mensaje.append(enlace);
  }
});
