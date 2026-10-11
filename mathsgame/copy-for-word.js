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
    if (!target) throw new Error('Presentation is unavailable.');
    const sections = JSON.parse(document.getElementById('word-content').textContent);
    const ids = target.id === 'research-document' ? Object.keys(sections) : [target.id];
    if (ids.some(id => !sections[id])) throw new Error('Section is unavailable.');
    const fragment = '<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;">' +
      ids.map(id => sections[id]).join('<p style="page-break-before:always;"></p>') + '</div>';
    const wrapper = document.createElement('div'); wrapper.innerHTML = fragment;
    return {html:'<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><!--StartFragment-->'+fragment+'<!--EndFragment--></body></html>',
      fragment:fragment,text:plainText(wrapper).replace(/\n{3,}/g,'\n\n').trim()};
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
      status('Presentation content could not be found. Please reload the page and try again.');
      return {ok: false, method: 'unavailable'};
    }
    if (!payload.text) {
      status('There is no presentation text to copy.');
      return {ok: false, method: 'empty'};
    }
    status('Copying formatted presentation…');
    if (window.isSecureContext && navigator.clipboard && typeof navigator.clipboard.write === 'function' && typeof window.ClipboardItem === 'function') {
      try {
        await navigator.clipboard.write([new window.ClipboardItem({
          'text/html': new Blob([payload.html], {type: 'text/html'}),
          'text/plain': new Blob([payload.text], {type: 'text/plain'})
        })]);
        status('Copied formatted presentation. Paste into Word and choose Keep Source Formatting.');
        return {ok: true, method: 'clipboard'};
      } catch (_) { /* Permission or format support may block modern copying. */ }
    }
    if (legacyCopy(payload)) {
      status('Copied formatted presentation. Paste into Word and choose Keep Source Formatting.');
      return {ok: true, method: 'execCommand'};
    }
    if (selectForManualCopy(target)) {
      prepareManualCopy(target, payload);
      status('Automatic copying was blocked. Presentation is selected: press Ctrl+C (or ⌘C on Mac), then paste into Word and choose Keep Source Formatting.');
      return {ok: false, method: 'manual-selection'};
    }
    status('Automatic copying is unavailable. Select the presentation text and copy it, or use the PDF download.');
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
      status('Presentation content could not be found. Please reload the page and try again.');
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
