const languages = { 'zh-CN': '简体中文', 'zh-TW': '繁體中文', en: 'English' };

export function resolveLanguage(requested) {
  return Object.keys(languages).includes(requested) ? requested : 'zh-CN';
}

export function renderLanguageMenu(language, label) {
  return `
    <button class="language" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="language-choices" aria-label="${label} · ${languages[language]}">${languages[language]}</button>
    <div class="language-menu" id="language-choices" role="menu" aria-label="${label}" hidden>
      ${Object.entries(languages).map(([id, name]) => `<button type="button" role="menuitemradio" aria-checked="${id === language}" tabindex="-1" lang="${id}" data-language="${id}">${name}</button>`).join('')}
    </div>`;
}

// Delegate from the document so rebuilding a translated header never duplicates handlers.
export function bindLanguageMenu(onSelect) {
  let openControl;

  function close(restoreFocus = false) {
    if (!openControl) return;
    const trigger = openControl.querySelector('.language');
    trigger.setAttribute('aria-expanded', 'false');
    openControl.querySelector('.language-menu').hidden = true;
    openControl = null;
    if (restoreFocus) trigger.focus({ preventScroll: true });
  }

  function open(control, target) {
    close();
    openControl = control;
    control.querySelector('.language-menu').hidden = false;
    control.querySelector('.language').setAttribute('aria-expanded', 'true');
    target.focus({ preventScroll: true });
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('.language');
    if (trigger) {
      const control = trigger.closest('.language-control');
      if (openControl === control) close(true);
      else open(control, control.querySelector('[aria-checked="true"]'));
      return;
    }
    const item = event.target.closest('.language-menu [data-language]');
    close(Boolean(item));
    if (item && item.getAttribute('aria-checked') === 'false') onSelect(item.dataset.language);
  });

  document.addEventListener('keydown', event => {
    const control = event.target.closest('.language-control');
    if (!control) return;
    const items = [...control.querySelectorAll('[role="menuitemradio"]')];
    if (event.target.matches('.language') && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      open(control, event.key === 'ArrowDown' ? items[0] : items[items.length - 1]);
      return;
    }
    if (control !== openControl) return;
    const index = items.indexOf(event.target);
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'Tab':
        close(true);
        break;
      case 'Home':
      case 'End':
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        let next = event.key === 'Home' ? 0 : items.length - 1;
        if (event.key === 'ArrowDown') next = (index + 1) % items.length;
        if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
        items[next].focus({ preventScroll: true });
        break;
      }
    }
  });

  document.addEventListener('focusin', event => {
    if (openControl && !openControl.contains(event.target)) close();
  });
  window.addEventListener('hashchange', () => close());
}
