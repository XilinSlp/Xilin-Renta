(() => {
  const $carousel = document.querySelector('#tw-carousel');
  if (!$carousel) return;

  const $track   = $carousel.querySelector('ul');
  const $slides  = Array.from($track.children);
  const $prev    = $carousel.querySelector('[data-dir="prev"]');
  const $next    = $carousel.querySelector('[data-dir="next"]');
  const $dotsWrap= document.querySelector('#tw-dots');

  // Si solo hay 1 slide: ocultar flechas y dots y salir
  if ($slides.length <= 1) {
    if ($prev)   $prev.classList.add('hidden');
    if ($next)   $next.classList.add('hidden');
    if ($dotsWrap) $dotsWrap.parentElement?.classList.add('hidden'); // contenedor absoluto
    // Accesibilidad: deja marcado como seleccionado y evita foco extraño
    $track.setAttribute('tabindex','-1');
    $slides[0]?.setAttribute('aria-selected','true');
    return;
  }

  // ---- Construcción normal cuando hay 2+ slides ----
  // Crear bullets en base a slides
  const dots = $slides.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className =
      'w-5 h-5 mx-2 rounded-full bg-white/40 hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 transition';
    b.setAttribute('aria-label', `Ir a la diapositiva ${i + 1}`);
    b.addEventListener('click', () => goTo(i));
    $dotsWrap.appendChild(b);
    return b;
  });

  const slideWidth = () => $track.clientWidth;

  function currentIndex() {
    const idx = Math.round($track.scrollLeft / slideWidth());
    return Math.max(0, Math.min(idx, $slides.length - 1));
  }

  function updateARIA(idx) {
    $slides.forEach((li, i) => {
      li.setAttribute('aria-selected', i === idx ? 'true' : 'false');
    });
    dots.forEach((d, i) => {
      d.classList.toggle('bg-white',   i === idx);
      d.classList.toggle('bg-white/40',i !== idx);
    });
  }

  function goTo(i) {
    const x = i * slideWidth();
    $track.scrollTo({ left: x, behavior: 'smooth' });
    updateARIA(i);
  }

  function next() { goTo(Math.min(currentIndex() + 1, $slides.length - 1)); }
  function prev() { goTo(Math.max(currentIndex() - 1, 0)); }

  // Botones
  $next?.addEventListener('click', next);
  $prev?.addEventListener('click', prev);

  // Teclado
  $track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft')  prev();
  });

  // Sincroniza bullets al hacer swipe/scroll
  let raf = null;
  $track.addEventListener('scroll', () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => updateARIA(currentIndex()));
  });

  // Recalcular en resize
  new ResizeObserver(() => goTo(currentIndex())).observe($track);

  // Init
  updateARIA(0);
})();