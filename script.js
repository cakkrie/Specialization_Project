// Cornell Tech Design Tech Project Template
// Add any custom JavaScript functionality here

(function attachOntologyOverlayHandlers() {
  const openBtn = document.getElementById('open-ontology');
  const overlay = document.getElementById('ontology-overlay');
  const closeBtn = document.getElementById('close-ontology');

  if (!openBtn || !overlay || !closeBtn) return;

  const open = () => {
    overlay.setAttribute('data-open', 'true');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    overlay.removeAttribute('data-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  openBtn.addEventListener('click', open);
  // When clicking the ontology-close, instead of just closing, launch fullscreen Three.js
  closeBtn.addEventListener('click', () => {
    close();
    if (typeof enterFullscreen === 'function') {
      enterFullscreen();
    }
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
})();