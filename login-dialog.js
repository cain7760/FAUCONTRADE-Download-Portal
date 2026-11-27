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
      <div class="portal-login-art" aria-hidden="true">
        <img src="assets/portal-login-falcon.webp" width="1122" height="1402" alt="">
        <div class="portal-recovery-art">
          <div class="portal-recovery-falcon"></div>
          <div class="portal-recovery-water"></div>
        </div>
      </div>
      <section class="portal-login-access">
        <button class="portal-login-close" type="button" aria-label="${t.close}">${icon('close')}</button>
        <img class="portal-login-brand" src="assets/customer-brand-dark.svg" width="953" height="277" alt="FAUCON TRADE">
        <h2 id="portal-login-title" tabindex="-1">${t.title}</h2>
        <p class="portal-login-intro">${t.intro}</p>
        <form class="portal-login-form" method="dialog" aria-describedby="portal-login-demo" novalidate>
          <label class="portal-login-field">
            <span>${t.username}</span>
            <span class="portal-login-input">${icon('user')}
              <input name="username" placeholder="${t.enterUsername}" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="128" required autofocus>
            </span>
          </label>
          <p class="portal-login-message" id="portal-login-username-error" role="alert" hidden>${t.enterUsername}</p>
          <label class="portal-login-field" for="portal-login-password">${t.password}</label>
          <div class="portal-login-input">${icon('lock')}
            <input id="portal-login-password" name="password" type="password" placeholder="${t.enterPassword}" autocomplete="off" maxlength="256" required>
            <button class="portal-login-show" type="button" aria-label="${t.showPassword}" aria-pressed="false">${icon('eye')}</button>
          </div>
          <p class="portal-login-message" id="portal-login-password-error" role="alert" hidden>${t.enterPassword}</p>
          <div class="portal-login-options">
            <label><input type="checkbox" name="remember"> ${t.remember}</label>
            <button class="portal-login-help" type="button" aria-controls="portal-recovery-panel">${t.forgot}</button>
          </div>
          <p class="portal-login-message" id="portal-login-status" role="status" hidden>${t.recoverySuccess}</p>
          <p class="portal-login-message" id="portal-login-error" role="alert" hidden>${t.error}</p>
          <button class="portal-login-submit" type="submit">${t.submit}</button>
        </form>
        <p class="portal-login-note" id="portal-login-demo">${t.demo}</p>
        <section class="portal-recovery-panel" id="portal-recovery-panel" aria-labelledby="portal-login-title" hidden>
          <p class="portal-recovery-status" role="status" hidden></p>
          <div class="portal-recovery-form"></div>
          <button type="button" class="portal-login-submit portal-recovery-submit" disabled>${t.recoverySubmit}</button>
          <button type="button" class="portal-login-help portal-recovery-back">${t.recoveryBack}</button>
        </section>
      </section>
    </div>
  </dialog>`;
}

function showFieldError(input, message, invalid) {
  message.hidden = !invalid;
  if (invalid) {
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', message.id);
  } else {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }
}

export function bindLoginDialog(dialog, t, onLogin) {
  const form = dialog.querySelector('.portal-login-form');
  const username = form.elements.username;
  const password = form.elements.password;
  const remember = form.elements.remember;
  const visibility = form.querySelector('.portal-login-show');
  const help = form.querySelector('.portal-login-help');
  const loginStatus = form.querySelector('#portal-login-status');
  const usernameError = form.querySelector('#portal-login-username-error');
  const passwordError = form.querySelector('#portal-login-password-error');
  const error = form.querySelector('#portal-login-error');
  const access = dialog.querySelector('.portal-login-access');
  const title = access.querySelector('#portal-login-title');
  const brand = access.querySelector('.portal-login-brand');
  const intro = access.querySelector('.portal-login-intro');
  const demo = access.querySelector('#portal-login-demo');
  const recovery = access.querySelector('#portal-recovery-panel');
  const recoveryHost = recovery.querySelector('.portal-recovery-form');
  const recoveryStatus = recovery.querySelector('.portal-recovery-status');
  const confirmReset = recovery.querySelector('.portal-recovery-submit');
  let mountedRecovery;
  let recoveryRequest = 0;
  let opener;

  function showPassword(show) {
    password.type = show ? 'text' : 'password';
    visibility.setAttribute('aria-pressed', String(show));
    visibility.setAttribute('aria-label', show ? t.hidePassword : t.showPassword);
  }

  function showRecovery(active) {
    dialog.toggleAttribute('data-recovery', active);
    brand.hidden = active;
    title.textContent = active ? t.recoveryTitle : t.title;
    intro.hidden = active;
    form.hidden = active;
    demo.hidden = active;
    recovery.hidden = !active;
    access.scrollTop = 0;
  }

  function returnToLogin(focusTarget) {
    ++recoveryRequest;
    mountedRecovery?.dispose();
    mountedRecovery = undefined;
    showRecovery(false);
    focusTarget?.focus({preventScroll: true});
  }

  help.addEventListener('click', async () => {
    const request = ++recoveryRequest;
    loginStatus.hidden = true;
    confirmReset.disabled = true;
    recoveryStatus.textContent = t.recoveryLoading;
    recoveryStatus.hidden = false;
    showRecovery(true);
    title.focus({preventScroll: true});

    try {
      const { mountPasswordRecovery } = await import('./assets/portal-password-recovery.js');
      if (!dialog.open || request !== recoveryRequest) return;
      mountedRecovery = mountPasswordRecovery(recoveryHost, () => {
        password.value = '';
        showPassword(false);
        showFieldError(password, passwordError, false);
        loginStatus.hidden = false;
        returnToLogin(password);
      });
      recoveryStatus.hidden = true;
      confirmReset.disabled = false;
    } catch {
      if (!dialog.open || request !== recoveryRequest) return;
      recoveryStatus.textContent = t.recoveryError;
    }
  });
  confirmReset.addEventListener('click', () => mountedRecovery?.submit());
  recovery.querySelector('.portal-recovery-back').addEventListener('click', () => returnToLogin(help));
  dialog.addEventListener('cancel', event => {
    if (recovery.hidden) return;
    event.preventDefault();
    returnToLogin(help);
  });
  dialog.querySelector('.portal-login-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    returnToLogin();
    form.reset();
    showFieldError(username, usernameError, false);
    showFieldError(password, passwordError, false);
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
  form.addEventListener('submit', event => {
    event.preventDefault();
    const account = username.value.trim();
    const missingPassword = !password.value;
    error.hidden = true;
    showFieldError(username, usernameError, !account);
    showFieldError(password, passwordError, missingPassword);
    if (!account || missingPassword) {
      (account ? password : username).focus();
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
