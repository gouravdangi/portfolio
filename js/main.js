/* ── main.js — home page rendering only ─────────────────────── */
/* site.js handles theme, mobile-nav, scroll-reveal              */

/* ── Experience timeline ─────────────────────────────────────── */
var tlEl = document.getElementById('experienceTimeline');
if (tlEl) {
  EXPERIENCE.forEach(function(job, i) {
    var item = document.createElement('div');
    item.className = 'tl-item';
    item.innerHTML =
      '<div class="tl-dot" aria-hidden="true">' + job.icon + '</div>' +
      '<div class="tl-card">' +
        '<div class="tl-header">' +
          '<span class="tl-company">' + job.company + '</span>' +
          '<span class="tl-date">' + job.dates + '</span>' +
        '</div>' +
        '<p class="tl-role">' + job.role + '</p>' +
        '<ul class="tl-bullets">' +
          job.bullets.map(function(b) { return '<li>' + b + '</li>'; }).join('') +
        '</ul>' +
      '</div>';
    tlEl.appendChild(item);
  });
}

/* ── Projects carousel ───────────────────────────────────────── */
var carousel = document.getElementById('projCarousel');
if (carousel) {
  PROJECTS.forEach(function(p) {
    var card = document.createElement('a');
    card.href = p.href;
    card.className = 'project-card' + (p.interactive ? ' interactive' : '');

    var links = (p.links || []).map(function(l) {
      return '<span class="proj-ext-link" onclick="event.preventDefault();window.open(\'' + l.href + '\',\'_blank\')">' +
        '<svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' +
        l.label + '</span>';
    }).join('');

    var interactiveBadge = p.interactive
      ? '<span class="proj-live-dot" aria-hidden="true"></span>Interactive'
      : '';

    card.innerHTML =
      '<div class="proj-index">' + p.index + '</div>' +
      '<div class="proj-body">' +
        '<div class="proj-kicker">' + (p.interactive ? interactiveBadge : p.badge) + '</div>' +
        '<h3>' + p.title + '</h3>' +
        '<p class="proj-summary">' + p.summary + '</p>' +
        '<div class="project-tags">' +
          p.tags.map(function(t) { return '<span class="tag">' + t + '</span>'; }).join('') +
        '</div>' +
      '</div>' +
      '<div class="proj-footer">' +
        (links || '') +
        '<span class="proj-arrow">Open project &rarr;</span>' +
      '</div>';

    carousel.appendChild(card);
  });

  /* ── Carousel navigation ─────────────────────────────────── */
  var prevBtn  = document.getElementById('projPrev');
  var nextBtn  = document.getElementById('projNext');
  var dotsWrap = document.getElementById('projDots');

  /* Build dots */
  PROJECTS.forEach(function(_, i) {
    var dot = document.createElement('button');
    dot.className = 'proj-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', 'Go to project ' + (i + 1));
    dotsWrap.appendChild(dot);
  });

  function getCardWidth() {
    var first = carousel.querySelector('.project-card');
    if (!first) return 340;
    var gap = parseInt(getComputedStyle(carousel).gap || '0', 10) || 0;
    return first.offsetWidth + gap;
  }

  function updateDots() {
    var idx = Math.round(carousel.scrollLeft / getCardWidth());
    dotsWrap.querySelectorAll('.proj-dot').forEach(function(d, i) {
      d.classList.toggle('active', i === idx);
    });
  }

  if (prevBtn) prevBtn.addEventListener('click', function() {
    carousel.scrollBy({ left: -getCardWidth(), behavior: 'smooth' });
  });
  if (nextBtn) nextBtn.addEventListener('click', function() {
    carousel.scrollBy({ left: getCardWidth(), behavior: 'smooth' });
  });

  dotsWrap.querySelectorAll('.proj-dot').forEach(function(dot, i) {
    dot.addEventListener('click', function() {
      carousel.scrollTo({ left: i * getCardWidth(), behavior: 'smooth' });
    });
  });

  carousel.addEventListener('scroll', updateDots, { passive: true });
}

/* ── Skills ──────────────────────────────────────────────────── */
var skillsEl = document.getElementById('skillsGroups');
if (skillsEl) {
  SKILLS.forEach(function(group) {
    var div = document.createElement('div');
    div.className = 'skill-group';
    div.innerHTML =
      '<h4>' + group.group + '</h4>' +
      '<div class="skill-chips">' +
        group.items.map(function(s) { return '<span class="skill-chip">' + s + '</span>'; }).join('') +
      '</div>';
    skillsEl.appendChild(div);
  });
}

/* ── Achievements ────────────────────────────────────────────── */
var achEl = document.getElementById('achievementsList');
if (achEl) {
  ACHIEVEMENTS.forEach(function(a) {
    var item = document.createElement('div');
    item.className = 'ach-item';
    var title = a.link
      ? '<a href="' + a.link + '" target="_blank" rel="noopener">' + a.title + '</a>'
      : a.title;
    item.innerHTML =
      '<div class="ach-icon" aria-hidden="true">' + a.icon + '</div>' +
      '<div class="ach-info"><h5>' + title + '</h5><p>' + a.desc + '</p></div>';
    achEl.appendChild(item);
  });
}
