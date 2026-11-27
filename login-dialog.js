const icons = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
};

function icon(name) {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
}

export const demoAccountKey = 'faucon-demo-login-account';

export function renderLoginDialog(t) {
  return `<dialog class="portal-login-dialog" id="portal-login-dialog" aria-labelledby="portal-login-title">
    <div class="portal-login-layout">
      <div class="portal-login-art"><img src="assets/portal-login-falcon.webp" width="1122" height="1402" alt=""></div>
      <section class="portal-login-access">
        <button class="portal-login-close" type="button" aria-label="${t.close}">${icon('close')}</button>
        <img class="portal-login-brand" src="assets/customer-brand-dark.svg" width="953" height="277" alt="FAUCON TRADE">
        <h2 id="portal-login-title">${t.title}</h2>
        <p class="portal-login-intro">${t.intro}</p>
        <form method="dialog" aria-describedby="portal-login-demo">
          <label class="portal-login-field">
            <span>${t.username}</span>
            <span class="portal-login-input">${icon('user')}
              <input name="username" placeholder="${t.enterUsername}" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="128" required autofocus>
            </span>
          </label>
          <label class="portal-login-field" for="portal-login-password">${t.password}</label>
          <div class="portal-login-input">${icon('lock')}
            <input id="portal-login-password" name="password" type="password" placeholder="${t.enterPassword}" autocomplete="off" maxlength="256" required>
            <button class="portal-login-show" type="button" aria-label="${t.showPassword}" aria-pressed="false">${icon('eye')}</button>
          </div>
          <div class="portal-login-options">
            <label><input type="checkbox" name="remember"> ${t.remember}</label>
            <button class="portal-login-help" type="button" aria-haspopup="dialog" aria-controls="portal-recovery-dialog">${t.forgot}</button>
          </div>
          <p class="portal-login-message" id="portal-login-status" role="status" hidden>${t.recoverySuccess}</p>
          <p class="portal-login-message" role="alert" hidden>${t.error}</p>
          <button class="portal-login-submit" type="submit">${t.submit}</button>
        </form>
        <p class="portal-login-note" id="portal-login-demo">${t.demo}</p>
      </section>
    </div>
    <dialog class="portal-recovery-dialog" id="portal-recovery-dialog" aria-labelledby="portal-recovery-title">
      <header class="portal-recovery-header">
        <h2 id="portal-recovery-title">${t.recoveryTitle}</h2>
        <button class="portal-recovery-close" type="button" aria-label="${t.recoveryClose}">${icon('close')}</button>
      </header>
      <div class="portal-recovery-content">
        <p class="portal-recovery-status" role="status" hidden></p>
        <div class="portal-recovery-form"></div>
      </div>
      <footer class="portal-recovery-actions">
        <button type="button" class="portal-recovery-cancel">${t.recoveryCancel}</button>
        <button type="button" class="portal-recovery-submit" disabled>${t.recoverySubmit}</button>
      </footer>
    </dialog>
  </dialog>`;
}

function bindPasswordRecovery(panel, trigger, t, onSuccess) {
  const host = panel.querySelector('.portal-recovery-form');
  const status = panel.querySelector('.portal-recovery-status');
  const confirm = panel.querySelector('.portal-recovery-submit');
  let form;
  let request = 0;

  function clear() {
    form?.dispose();
    form = undefined;
    confirm.disabled = true;
  }

  trigger.addEventListener('click', async () => {
    if (panel.open) return;
    const pending = ++request;
    clear();
    status.textContent = t.recoveryLoading;
    status.hidden = false;
    panel.showModal();

    try {
      const { mountPasswordRecovery } = await import('./assets/portal-password-recovery.js');
      if (!panel.open || pending !== request) return;
      form = mountPasswordRecovery(host, () => {
        panel.close();
        onSuccess();
      });
      status.hidden = true;
      confirm.disabled = false;
      host.querySelector('input').focus();
    } catch {
      if (!panel.open || pending !== request) return;
      status.textContent = t.recoveryError;
      status.hidden = false;
    }
  });
  for (const button of panel.querySelectorAll('.portal-recovery-close, .portal-recovery-cancel')) {
    button.addEventListener('click', () => panel.close());
  }
  panel.addEventListener('close', () => {
    if (!panel.open) clear();
  });
  confirm.addEventListener('click', () => form?.submit());
}

export function bindLoginDialog(dialog, t, onLogin) {
  const form = dialog.querySelector('form');
  const username = form.elements.username;
  const password = form.elements.password;
  const remember = form.elements.remember;
  const visibility = form.querySelector('.portal-login-show');
  const help = form.querySelector('.portal-login-help');
  const loginStatus = form.querySelector('#portal-login-status');
  const error = form.querySelector('[role="alert"]');
  let opener;

  function showPassword(show) {
    password.type = show ? 'text' : 'password';
    visibility.setAttribute('aria-pressed', String(show));
    visibility.setAttribute('aria-label', show ? t.hidePassword : t.showPassword);
  }

  dialog.querySelector('.portal-login-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    form.reset();
    username.setCustomValidity('');
    password.autocomplete = 'off';
    showPassword(false);
    loginStatus.hidden = true;
    error.hidden = true;
    opener?.focus({preventScroll: true});
  });

  visibility.addEventListener('click', () => showPassword(password.type === 'password'));
  remember.addEventListener('change', () => {
    password.autocomplete = remember.checked ? 'current-password' : 'off';
  });
  bindPasswordRecovery(dialog.querySelector('#portal-recovery-dialog'), help, t, () => {
    password.value = '';
    showPassword(false);
    loginStatus.hidden = false;
    password.focus();
  });
  username.addEventListener('input', () => username.setCustomValidity(''));

  form.addEventListener('submit', event => {
    event.preventDefault();
    const account = username.value.trim();
    if (!account) {
      username.setCustomValidity(t.enterUsername);
      username.reportValidity();
      return;
    }

    try {
      sessionStorage.setItem(demoAccountKey, account);
    } catch {
      error.hidden = false;
      return;
    }

    if (remember.checked && window.PasswordCredential && navigator.credentials?.store) {
      try {
        navigator.credentials.store(new PasswordCredential({id: account, password: password.value})).catch(() => {});
      } catch { /* The demo session does not depend on password manager support. */ }
    }
    dialog.close();
    onLogin();
  });

  return trigger => {
    if (dialog.open) return;
    opener = trigger;
    dialog.showModal();
  };
}
