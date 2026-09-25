/* Copy editable research HTML and text to Word. No network requests or dependencies. */
(function () {
  'use strict';
  if (window.ResearchCopy) return;

  const OMIT = '.no-copy,.copy-document,.copy-section,#copy-status,button,nav,[role="navigation"],script,style,link,template,noscript,input,select,textarea';
  const BODY_STYLE = 'font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.25;color:#202832;background-color:#ffffff;';
  let busy = false;
  let cancelManualCopy = null;

  function status(message) {
    let region = document.getElementById('copy-status');
    if (!region) {
      region = document.createElement('p');
      region.id = 'copy-status';
      document.body.appendChild(region);
    }
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.dataset.active = 'true';
    region.textContent = message;
  }

  function absolute(value) {
    try { return new URL(value, document.baseURI).href; }
    catch (_) { return value; }
  }

  function plainText(node) {
    if (node.nodeType === 3) return node.nodeValue;
    if (node.nodeType !== 1) return '';
    const tag = node.tagName.toLowerCase();
    if (tag === 'br') return '\n';
    if (tag === 'img') return node.alt ? '[' + node.alt + ']\n' : '';
    if (tag === 'table') {
      return '\n' + Array.from(node.rows, function (row) {
        return Array.from(row.cells, function (cell) {
          return Array.from(cell.childNodes, plainText).join('').replace(/\s+/g, ' ').trim();
        }).join('\t');
      }).join('\n') + '\n\n';
    }
    if (tag === 'ol' || tag === 'ul') {
      let index = Number(node.getAttribute('start')) || 1;
      return '\n' + Array.from(node.children, function (item) {
        if (item.tagName.toLowerCase() !== 'li') return plainText(item);
        if (item.hasAttribute('value')) index = Number(item.getAttribute('value'));
        const prefix = tag === 'ol' ? index++ + '. ' : '• ';
        return prefix + Array.from(item.childNodes, plainText).join('').trim() + '\n';
      }).join('') + '\n';
    }
    let value = Array.from(node.childNodes, plainText).join('');
    if (tag === 'a' && node.hasAttribute('href') && value.trim() !== node.getAttribute('href')) {
      value += ' (' + node.getAttribute('href') + ')';
    }
    return /^(p|div|section|article|main|h[1-6]|blockquote|figure|figcaption|tr|details|summary)$/.test(tag)
      ? value + '\n\n' : value;
  }

  function prepare(target) {
    if (!target || !target.cloneNode) throw new Error('Research content is unavailable.');
    const clone = target.cloneNode(true);
    clone.querySelectorAll(OMIT).forEach(function (node) { node.remove(); });
    const originals = Array.from(target.querySelectorAll('img'));

    [clone].concat(Array.from(clone.querySelectorAll('*'))).forEach(function (node) {
      node.removeAttribute('id');
      node.removeAttribute('class');
      node.removeAttribute('contenteditable');
      node.removeAttribute('tabindex');
      Array.from(node.attributes).forEach(function (attribute) {
        if (/^on/i.test(attribute.name)) node.removeAttribute(attribute.name);
      });
      const tag = node.tagName.toLowerCase();
      if (!node.style) return;
      // Remove website positioning while retaining deliberate inline emphasis.
      ['position', 'inset', 'top', 'right', 'bottom', 'left', 'transform', 'float', 'overflow',
        'max-height', 'min-height', 'height', 'box-shadow', 'border-radius', 'columns', 'column-count',
        'grid-template-columns', 'gap'].forEach(function (name) { node.style.removeProperty(name); });
      if (/^(div|section|article|main|figure|figcaption|header|footer|aside|details|summary)$/.test(tag)) {
        node.style.display = 'block';
        node.style.width = 'auto';
        node.style.maxWidth = 'none';
        node.style.margin = '0 0 8pt 0';
        node.style.padding = '0';
        node.style.background = 'transparent';
      }
      if (/^h[1-6]$/.test(tag)) {
        node.style.cssText = BODY_STYLE + 'font-size:' + ({h1:22,h2:17,h3:14,h4:12,h5:11,h6:11})[tag] +
          'pt;font-weight:bold;margin:16pt 0 8pt 0;page-break-after:avoid;';
      }
      if (tag === 'p') node.style.margin = '0 0 8pt 0';
      if (tag === 'ul' || tag === 'ol') {
        node.style.margin = '0 0 8pt 0';
        node.style.paddingLeft = '22pt';
      }
      if (tag === 'li') node.style.marginBottom = '4pt';
      if (tag === 'strong' || tag === 'b') node.style.fontWeight = 'bold';
      if (tag === 'em' || tag === 'i') node.style.fontStyle = 'italic';
      if (tag === 'table') {
        node.style.cssText = BODY_STYLE + 'width:100%;border-collapse:collapse;table-layout:auto;margin:8pt 0 12pt 0;';
        node.setAttribute('border', '1');
        node.setAttribute('cellspacing', '0');
        node.setAttribute('cellpadding', '6');
      }
      if (tag === 'thead') node.style.display = 'table-header-group';
      if (tag === 'tr') node.style.pageBreakInside = 'avoid';
      if (tag === 'td' || tag === 'th') {
        node.style.cssText = 'border:1px solid #bac7cd;padding:6pt;vertical-align:top;font-family:Calibri,Arial,sans-serif;font-size:10pt;line-height:1.2;color:#202832;';
        if (tag === 'th') {
          node.style.backgroundColor = '#dce6ea';
          node.style.fontWeight = 'bold';
          node.style.textAlign = 'left';
        }
      }
      if (tag === 'a' && node.hasAttribute('href')) {
        node.setAttribute('href', absolute(node.getAttribute('href')));
        node.style.color = '#175b7a';
        node.style.textDecoration = 'underline';
      }
      if (tag === 'img') {
        const original = originals.find(function (image) {
          return image.getAttribute('src') === node.getAttribute('src');
        });
        const src = original && original.currentSrc || node.getAttribute('src');
        if (src) node.setAttribute('src', absolute(src));
        node.removeAttribute('srcset');
        node.removeAttribute('sizes');
        node.removeAttribute('loading');
        node.removeAttribute('height');
        node.style.maxWidth = '100%';
        node.style.height = 'auto';
        const width = original && (original.naturalWidth || Number(original.getAttribute('width')));
        if (width) {
          node.setAttribute('width', String(Math.min(width, 624)));
          node.style.width = Math.min(width, 624) + 'px';
        }
      }
      if (tag === 'details') node.setAttribute('open', '');
    });

    const wrapper = document.createElement('div');
    wrapper.setAttribute('style', BODY_STYLE);
    wrapper.appendChild(clone);
    const fragment = wrapper.outerHTML;
    return {
      html: '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><!--StartFragment-->' +
        fragment + '<!--EndFragment--></body></html>',
      fragment: fragment,
      text: plainText(wrapper).replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    };
  }

  function saveSelection() {
    const selection = window.getSelection();
    const ranges = [];
    if (selection) for (let i = 0; i < selection.rangeCount; i++) ranges.push(selection.getRangeAt(i).cloneRange());
    const active = document.activeElement;
    let inputRange = null;
    try {
      if (active && typeof active.selectionStart === 'number') {
        inputRange = [active.selectionStart, active.selectionEnd, active.selectionDirection];
      }
    } catch (_) { /* Some input types do not expose text selection. */ }
    return {active: active, ranges: ranges, inputRange: inputRange, x: window.scrollX, y: window.scrollY};
  }

  function restoreSelection(saved) {
    if (saved.active && saved.active.isConnected && saved.active.focus) {
      try { saved.active.focus({preventScroll: true}); } catch (_) { saved.active.focus(); }
    }
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      saved.ranges.forEach(function (range) {
        try { selection.addRange(range); } catch (_) { /* The original node may have been removed. */ }
      });
    }
    if (saved.inputRange && saved.active && saved.active.setSelectionRange) {
      try { saved.active.setSelectionRange.apply(saved.active, saved.inputRange); } catch (_) { /* Input changed. */ }
    }
    if (window.scrollX !== saved.x || window.scrollY !== saved.y) window.scrollTo(saved.x, saved.y);
  }

  function legacyCopy(payload) {
    if (typeof document.execCommand !== 'function') return false;
    const saved = saveSelection();
    const staging = document.createElement('div');
    staging.setAttribute('contenteditable', 'true');
    staging.setAttribute('aria-hidden', 'true');
    staging.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;pointer-events:none;';
    staging.innerHTML = payload.fragment;
    document.body.appendChild(staging);
    let handled = false;
    function onCopy(event) {
      if (!event.clipboardData) return;
      try {
        event.clipboardData.setData('text/html', payload.html);
        event.clipboardData.setData('text/plain', payload.text);
        event.preventDefault();
        event.stopImmediatePropagation();
        handled = true;
      } catch (_) { handled = false; }
    }
    document.addEventListener('copy', onCopy, true);
    try {
      staging.focus({preventScroll: true});
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(staging);
      selection.removeAllRanges();
      selection.addRange(range);
      // A true return without an HTML clipboard event is not a verified rich copy.
      return document.execCommand('copy') === true && handled;
    } catch (_) {
      return false;
    } finally {
      document.removeEventListener('copy', onCopy, true);
      staging.remove();
      restoreSelection(saved);
    }
  }

  function selectForManualCopy(target) {
    try {
      const selection = window.getSelection();
      if (!selection) return false;
      const previousTabIndex = target.getAttribute('tabindex');
      target.setAttribute('tabindex', '-1');
      target.focus({preventScroll: true});
      if (previousTabIndex === null) target.removeAttribute('tabindex');
      else target.setAttribute('tabindex', previousTabIndex);
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
      return selection.rangeCount > 0 && !selection.isCollapsed;
    } catch (_) { return false; }
  }

  function prepareManualCopy(target, payload) {
    function isSelected() {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount !== 1) return false;
      const range = selection.getRangeAt(0);
      return range.startContainer === target && range.startOffset === 0 &&
        range.endContainer === target && range.endOffset === target.childNodes.length;
    }
    function cleanup() {
      document.removeEventListener('copy', onCopy, true);
      document.removeEventListener('selectionchange', onSelectionChange);
      window.removeEventListener('pagehide', cleanup);
      if (cancelManualCopy === cleanup) cancelManualCopy = null;
    }
    function onSelectionChange() { if (!isSelected()) cleanup(); }
    function onCopy(event) {
      try {
        // Handle only the full range selected for this explicit manual fallback.
        // A later selection or unrelated copy must retain normal browser behavior.
        if (!isSelected() || !event.clipboardData) return;
        event.clipboardData.setData('text/html', payload.html);
        event.clipboardData.setData('text/plain', payload.text);
        event.preventDefault();
        event.stopImmediatePropagation();
        // A copy event exposes no OS completion result; do not claim success here.
      } catch (_) { /* Leave the browser's normal copy behavior available. */ }
      finally { cleanup(); }
    }
    cancelManualCopy = cleanup;
    document.addEventListener('copy', onCopy, true);
    document.addEventListener('selectionchange', onSelectionChange);
    window.addEventListener('pagehide', cleanup);
  }

  async function copy(target) {
    if (cancelManualCopy) cancelManualCopy();
    let payload;
    try { payload = prepare(target); }
    catch (_) {
      status('Research content could not be found. Please reload the page and try again.');
      return {ok: false, method: 'unavailable'};
    }
    if (!payload.text) {
      status('There is no research text to copy.');
      return {ok: false, method: 'empty'};
    }
    status('Copying formatted research…');
    if (window.isSecureContext && navigator.clipboard && typeof navigator.clipboard.write === 'function' && typeof window.ClipboardItem === 'function') {
      try {
        await navigator.clipboard.write([new window.ClipboardItem({
          'text/html': new Blob([payload.html], {type: 'text/html'}),
          'text/plain': new Blob([payload.text], {type: 'text/plain'})
        })]);
        status('Copied formatted research. Paste into Word and choose Keep Source Formatting.');
        return {ok: true, method: 'clipboard'};
      } catch (_) { /* Permission or format support may block modern copying. */ }
    }
    if (legacyCopy(payload)) {
      status('Copied formatted research. Paste into Word and choose Keep Source Formatting.');
      return {ok: true, method: 'execCommand'};
    }
    if (selectForManualCopy(target)) {
      prepareManualCopy(target, payload);
      status('Automatic copying was blocked. Research is selected: press Ctrl+C (or ⌘C on Mac), then paste into Word and choose Keep Source Formatting.');
      return {ok: false, method: 'manual-selection'};
    }
    status('Automatic copying is unavailable. Select the research text and copy it, or use the Word download.');
    return {ok: false, method: 'manual'};
  }

  document.addEventListener('click', async function (event) {
    const element = event.target && event.target.nodeType === 1 ? event.target : event.target && event.target.parentElement;
    const button = element && element.closest('.copy-document,.copy-section');
    if (!button) return;
    event.preventDefault();
    if (busy) return;
    const article = document.getElementById('research-document');
    const target = button.classList.contains('copy-document') ? article : document.getElementById(button.dataset.target || '');
    if (!article || !target || !article.contains(target)) {
      status('Research content could not be found. Please reload the page and try again.');
      return;
    }
    busy = true;
    button.setAttribute('aria-busy', 'true');
    try { await copy(target); }
    finally { busy = false; button.removeAttribute('aria-busy'); }
  });

  const region = document.getElementById('copy-status');
  if (region) {
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
  }
  window.ResearchCopy = Object.freeze({copy: copy, prepare: prepare});
})();
