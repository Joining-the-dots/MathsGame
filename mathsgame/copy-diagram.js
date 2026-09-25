/* Copy a same-origin PNG to the clipboard without changing the Word-copy controls. */
(function () {
  'use strict';

  const UNAVAILABLE = 'Image copying is unavailable. Use Download image, then insert it into Word.';
  let busy = false;

  function status(message) {
    const region = document.getElementById('copy-status');
    if (!region) return;
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.dataset.active = 'true';
    region.textContent = message;
  }

  document.addEventListener('click', async function (event) {
    const button = event.target && typeof event.target.closest === 'function'
      ? event.target.closest('button.copy-diagram') : null;
    if (!button || event.isTrusted !== true || button.disabled || busy) return;
    event.preventDefault();

    busy = true;
    const previousBusy = button.getAttribute('aria-busy');
    const previousDisabled = button.disabled;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    let controller = null;

    try {
      if (!window.isSecureContext || !navigator.clipboard ||
          typeof navigator.clipboard.write !== 'function' ||
          typeof window.ClipboardItem !== 'function' ||
          (typeof window.ClipboardItem.supports === 'function' &&
           !window.ClipboardItem.supports('image/png'))) {
        throw new Error('Clipboard image support unavailable');
      }

      if (!button.dataset.image) throw new Error('Image unavailable');
      const url = new URL(button.dataset.image, document.baseURI);
      if (url.origin !== window.location.origin || !/^https?:$/.test(url.protocol)) {
        throw new Error('Image unavailable');
      }

      const label = (button.dataset.label || 'Diagram').trim() || 'Diagram';
      status('Copying image…');
      controller = new AbortController();
      const png = fetch(url.href, {
        mode: 'same-origin', credentials: 'omit', redirect: 'error', signal: controller.signal
      }).then(function (response) {
        const mime = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        if (!response.ok || mime !== 'image/png') throw new Error('Image unavailable');
        return response.blob();
      }).then(function (blob) {
        if (blob.type.toLowerCase() !== 'image/png' || blob.size === 0) {
          throw new Error('Image unavailable');
        }
        return blob;
      });

      // Observe fetch failures even if constructing/writing the item fails first.
      png.catch(function () {});
      // Pass the pending PNG straight to write while trusted-click activation is live.
      const item = new window.ClipboardItem({ 'image/png': png });
      await navigator.clipboard.write([item]);
      status('Image copied: ' + label + '. Paste it into Word.');
    } catch (_) {
      status(UNAVAILABLE);
    } finally {
      if (controller) controller.abort();
      button.disabled = previousDisabled;
      if (previousBusy === null) button.removeAttribute('aria-busy');
      else button.setAttribute('aria-busy', previousBusy);
      busy = false;
    }
  });
})();
