(function () {
  var tema = null;
  try {
    tema = localStorage.getItem('vite-ui-theme');
  } catch (e) {
  }
  if (tema !== 'light' && tema !== 'dark') {
    tema = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.classList.add(tema);
})();
