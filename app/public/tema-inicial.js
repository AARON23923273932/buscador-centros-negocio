// Se ejecuta antes de pintar la página: aplica el modo claro/oscuro que la persona eligió
// (guardado por src/tema.js). Si nunca eligió, no hace nada y se sigue el modo del sistema.
(function () {
  try {
    var tema = localStorage.getItem('buscador-cn.tema');
    if (tema === 'claro' || tema === 'oscuro') document.documentElement.setAttribute('data-tema', tema);
  } catch (e) {
    /* Sin acceso a localStorage (modo privado estricto): se usa el modo del sistema. */
  }
})();
