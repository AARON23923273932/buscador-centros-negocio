// Página puente de MSAL v5: recibe la respuesta de Microsoft y se la entrega a la app.
import { broadcastResponseToMainFrame } from '@azure/msal-browser/redirect-bridge';

broadcastResponseToMainFrame().catch((error) => {
  console.error('No se pudo procesar la respuesta de Microsoft:', error);
  const mensaje = document.getElementById('mensaje');
  if (mensaje) {
    mensaje.textContent = 'No se pudo completar el inicio de sesión. ';
    const enlace = document.createElement('a');
    enlace.href = './';
    enlace.textContent = 'Volver a la aplicación';
    mensaje.append(enlace);
  }
});
