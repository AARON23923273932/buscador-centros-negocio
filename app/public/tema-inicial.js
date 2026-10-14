// Se ejecuta antes de pintar la página: aplica el modo claro/oscuro que la persona eligió
// (guardado por src/hooks/useTema.ts; reglas en src/logica/tema.ts). Si nunca eligió, se sigue el modo del sistema.
// También marca <html data-tema-efectivo> (el modo que se ve): así el botón ☀️/🌙 de index.html muestra el
// ícono correcto desde el primer momento, antes de que cargue React (que después lo mantiene al día).
(function () {
  var raiz = document.documentElement;
  var tema = null;
  try {
    tema = localStorage.getItem('buscador-cn.tema');
  } catch (e) {
    /* Sin acceso a localStorage (modo privado estricto): se usa el modo del sistema. */
  }
  if (tema === 'claro' || tema === 'oscuro') {
    raiz.setAttribute('data-tema', tema);
  } else {
    tema = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  }
  raiz.setAttribute('data-tema-efectivo', tema);
})();
