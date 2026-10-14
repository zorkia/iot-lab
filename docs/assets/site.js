(() => {
  const blocks = document.querySelectorAll('.content pre:not(.language-text):not(.language-diagram) > code');
  if (!blocks.length) return;

  const status = document.createElement('div');
  status.className = 'sr-only';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  document.body.append(status);

  function fallbackCopy(text) {
    const activeElement = document.activeElement;
    const selection = window.getSelection();
    const ranges = [];
    for (let index = 0; selection && index < selection.rangeCount; index += 1) {
      ranges.push(selection.getRangeAt(index).cloneRange());
    }

    const field = document.createElement('textarea');
    field.value = text;
    field.readOnly = true;
    field.className = 'clipboard-field';
    document.body.append(field);

    try {
      field.focus({ preventScroll: true });
      field.select();
      field.setSelectionRange(0, text.length);
      if (!document.execCommand('copy')) throw new Error('Copy failed');
    } finally {
      field.remove();
      activeElement?.focus({ preventScroll: true });
      if (selection) {
        selection.removeAllRanges();
        ranges.forEach((range) => selection.addRange(range));
      }
    }
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // Local files and denied clipboard permissions can use the selection API.
      }
    }
    fallbackCopy(text);
  }

  blocks.forEach((code) => {
    const pre = code.parentElement;
    const block = document.createElement('div');
    block.className = 'code-block';
    pre.before(block);
    block.append(pre);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-button';
    const icon = document.createElement('span');
    icon.className = 'copy-icon';
    icon.setAttribute('aria-hidden', 'true');
    button.append(icon);
    const tooltip = document.createElement('span');
    tooltip.className = 'copy-tooltip';
    tooltip.setAttribute('aria-hidden', 'true');

    function setState(state, label) {
      button.dataset.state = state;
      button.setAttribute('aria-label', label);
      tooltip.textContent = label;
    }

    setState('idle', 'คัดลอกข้อความ');
    let resetTimer;
    let copying = false;

    button.addEventListener('click', async () => {
      if (copying) return;
      copying = true;
      window.clearTimeout(resetTimer);
      button.setAttribute('aria-busy', 'true');
      try {
        await copyText(code.textContent);
        setState('copied', 'คัดลอกแล้ว');
        status.textContent = 'คัดลอกข้อความแล้ว';
      } catch {
        setState('error', 'คัดลอกไม่สำเร็จ');
        status.textContent = 'คัดลอกไม่สำเร็จ กรุณาเลือกข้อความเพื่อคัดลอก';
      } finally {
        copying = false;
        button.removeAttribute('aria-busy');
        resetTimer = window.setTimeout(() => {
          setState('idle', 'คัดลอกข้อความ');
        }, 2000);
      }
    });

    block.append(button, tooltip);
  });
})();
