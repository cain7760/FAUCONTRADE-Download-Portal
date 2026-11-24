export function renderManual(t, chapterId, faqDestinations) {
  const [id, title, subtitle, steps] = t.chapters.find(chapter => chapter[0] === chapterId) || t.chapters[0];
  const questions = t.faqs.map(([question, answer], index) => {
    const [topic, entry] = faqDestinations[index];
    if (topic !== id) return '';
    return `<section class="manual-faq" aria-labelledby="${entry}">
      <h3 id="${entry}" tabindex="-1">${question}</h3><p>${answer}</p>
    </section>`;
  }).join('');
  return `<main id="main-content" class="reading-room" tabindex="-1">
    <div class="manual-head">
      <div class="manual-wrap">
        <div class="manual-breadcrumb"><a href="#home">${t.home}</a><span aria-hidden="true"> / </span><span>${t.manualTitle}</span></div>
        <h1>${t.manualTitle}</h1><p>${t.manualIntro}</p>
      </div>
    </div>
    <div class="manual-wrap manual-grid">
      <aside class="manual-sidebar" aria-label="${t.manualTitle}">
        <input type="search" id="manual-search" aria-label="${t.search}" placeholder="${t.search}">
        <nav class="chapter-list" aria-label="${t.manualTitle}">
          ${t.chapters.map(([topic, label]) => `<a href="#/manual/${topic}"${topic === id ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
        </nav>
        <p id="no-result" role="status" hidden>${t.noResult}</p>
      </aside>
      <article class="manual-content">
        <h2>${title}</h2><h3>${subtitle}</h3>
        <ol>${steps.map(step => `<li>${step}</li>`).join('')}</ol>
        ${questions}
        <div class="manual-actions">
          <a href="#home"><span aria-hidden="true">← </span>${t.backHome}</a>
          <button type="button" data-action="print">${t.print}</button>
        </div>
      </article>
    </div>
  </main>`;
}
