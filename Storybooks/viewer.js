function setupBookViewer() {
  const pageButtons = Array.from(document.querySelectorAll('[data-book-page]'));
  const modal = document.querySelector('[data-book-modal]');
  const modalImage = document.querySelector('[data-book-modal-image]');
  const closeButtons = Array.from(document.querySelectorAll('[data-book-modal-close]'));
  const prevButton = document.querySelector('[data-book-modal-prev]');
  const nextButton = document.querySelector('[data-book-modal-next]');

  if (!pageButtons.length || !modal || !modalImage || !prevButton || !nextButton) {
    return;
  }

  const pages = pageButtons.map((button) => ({
    src: button.dataset.bookSrc || '',
    title: button.dataset.bookTitle || '',
    page: Number(button.dataset.bookPage || '1'),
  }));

  let currentIndex = 0;
  let lastActiveElement = null;

  function preload(index) {
    const page = pages[index];
    if (!page || !page.src) {
      return;
    }

    const image = new Image();
    image.src = page.src;
  }

  function render() {
    const page = pages[currentIndex];
    if (!page) {
      return;
    }

    modalImage.src = page.src;
    modalImage.alt = page.page === 1
      ? `Cover von ${page.title}`
      : `Seite ${page.page} von ${page.title}`;

    preload((currentIndex + 1) % pages.length);
    preload((currentIndex - 1 + pages.length) % pages.length);
  }

  function openViewer(index) {
    currentIndex = index;
    lastActiveElement = document.activeElement;
    render();
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('book-viewer-body');
    document.body.style.overflow = 'hidden';
    closeButtons[0]?.focus();
  }

  function closeViewer() {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('book-viewer-body');
    document.body.style.overflow = '';
    if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
      lastActiveElement.focus();
    }
  }

  function step(direction) {
    currentIndex = (currentIndex + direction + pages.length) % pages.length;
    render();
  }

  pageButtons.forEach((button, index) => {
    button.addEventListener('click', () => openViewer(index));
  });

  prevButton.addEventListener('click', () => step(-1));
  nextButton.addEventListener('click', () => step(1));

  closeButtons.forEach((button) => {
    button.addEventListener('click', closeViewer);
  });

  document.addEventListener('keydown', (event) => {
    if (modal.hidden) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeViewer();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    }
  });

  render();
}

document.addEventListener('DOMContentLoaded', setupBookViewer);
