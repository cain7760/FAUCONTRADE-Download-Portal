const deviceSymbols = [
  '<path d="M2 3.5 10.2 2.3v8.8H2zm10-1.4L22 .7v10.4H12zM2 12.9h8.2v8.8L2 20.5zm10 0h10v10.4l-10-1.4z"/>',
  '<path fill-rule="evenodd" d="M4 3h16a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Zm.5 3.5a1 1 0 1 0 2 0 1 1 0 0 0-2 0Zm3.5 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0ZM3 9v1.8h18V9H3Z"/>',
  '<path fill-rule="evenodd" d="M8 1h8a3 3 0 0 1 3 3v16a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V4a3 3 0 0 1 3-3Zm2.5 2.5a1 1 0 0 0 0 2h3a1 1 0 0 0 0-2h-3Zm-.5 15a1 1 0 0 0 0 2h4a1 1 0 0 0 0-2h-4Z"/>',
];

const customerEntry = /\/portal\/design-v2\/(?:index\.html)?$/.test(location.pathname)
  ? '../../equity-variants.html?layout=classic'
  : 'https://cain7760.github.io/FAUCONTRADE-Customer-PC/equity-variants.html?layout=classic';

function terminalAction(index, label, guest) {
  const content = `<svg class="device-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${deviceSymbols[index]}</svg><span>${label}</span>`;
  if (guest) {
    return `<button class="terminal-action" type="button" data-portal-login aria-haspopup="dialog" aria-controls="portal-login-dialog">${content}</button>`;
  }
  if (index === 0) {
    return `<a class="terminal-action" href="assets/windows-download-test.txt" download="测试文件.txt">${content}</a>`;
  }
  return `<a class="terminal-action" href="${customerEntry}">${content}</a>`;
}

export function renderTerminals(t, { compact = false } = {}) {
  const actions = [compact ? t.download : t.downloadNow, t.customer, t.appEntry];
  return `
    <section class="access-band" id="terminals" aria-labelledby="terminals-title">
      <div class="wrap">
        <h2 class="${compact ? 'sr-only' : 'destination-title'}" id="terminals-title">${t.terminalTitle}</h2>
        ${compact ? '' : `<p class="destination-intro">${t.terminalText}</p>`}
        <div class="terminal-cards">
          ${t.terminalNames.map((name, index) => `
            <article class="terminal-card">
              ${compact ? '' : `<span class="terminal-platform">${t.terminalPlatforms[index]}</span>`}
              <h3>${name}</h3>
              ${compact ? '' : `<p>${t.terminalTexts[index]}</p>`}
              ${terminalAction(index, actions[index], compact)}
            </article>`).join('')}
        </div>
      </div>
    </section>`;
}

function renderHelp(t, faqDestinations) {
  return `
    <section class="support-band" id="help" aria-labelledby="help-title">
      <div class="wrap support-layout">
        <div class="support-intro">
          <h2 id="help-title" class="destination-title">${t.faqTitle}</h2>
          <p class="destination-intro">${t.faqText}</p>
          <a class="guide-link" href="#/manual/start">${t.manualOpen}<span aria-hidden="true">↗</span></a>
        </div>
        <div class="question-list">
          ${t.faqs.map(([question], index) => `
            <a class="question" href="#/manual/${faqDestinations[index].join('/')}">
              <span>${question}</span>
              <svg class="faq-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m7.5 4.5 5 5.5-5 5.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>`).join('')}
        </div>
      </div>
    </section>`;
}

function renderContact(t) {
  const title = t.contactTitle.replace('到', '<span class="contact-title-dao">到</span>');
  const phone = t.phonePending;
  const email = t.emailPending;
  return `
    <section class="contact-band" id="contact" aria-labelledby="contact-title">
      <div class="wrap contact-layout">
        <div class="support-intro">
          <h2 id="contact-title" class="destination-title">${title}</h2>
          <p class="destination-intro">${t.contactText}</p>
        </div>
        <dl class="contact-methods">
          <div><dt>${t.phone}</dt><dd><a href="tel:${phone.replace(/\s/g, '')}">${phone}</a></dd></div>
          <div><dt>${t.email}</dt><dd><a href="mailto:${email}">${email}</a></dd></div>
        </dl>
      </div>
    </section>`;
}

export function renderDestinations(t, faqDestinations) {
  return renderTerminals(t) + renderHelp(t, faqDestinations) + renderContact(t);
}
