/* ── site.js — shared chrome for every page ──────────────────── */
/* Theme, mobile nav, navbar scroll shadow                        */

/* ── Theme ───────────────────────────────────────────────────── */
var _html        = document.documentElement;
var _themeToggle = document.getElementById('themeToggle');

function applyTheme(t) {
  _html.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
  if (!_themeToggle) return;
  var sun  = _themeToggle.querySelector('.icon-sun');
  var moon = _themeToggle.querySelector('.icon-moon');
  if (sun)  sun.style.display  = t === 'dark'  ? 'none' : '';
  if (moon) moon.style.display = t === 'light' ? 'none' : '';
}

applyTheme(_html.getAttribute('data-theme') || 'light');

if (_themeToggle) {
  _themeToggle.addEventListener('click', function() {
    applyTheme(_html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
}

/* ── Navbar scroll shadow ────────────────────────────────────── */
var _navbar = document.getElementById('navbar');
if (_navbar) {
  window.addEventListener('scroll', function() {
    _navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

/* ── Mobile nav ──────────────────────────────────────────────── */
var _hamburger = document.getElementById('hamburger');
var _mobileNav = document.getElementById('mobileNav');

if (_hamburger && _mobileNav) {
  _hamburger.addEventListener('click', function() {
    var open = _mobileNav.classList.toggle('open');
    _hamburger.classList.toggle('open', open);
    _hamburger.setAttribute('aria-expanded', open);
  });
  _mobileNav.querySelectorAll('a').forEach(function(a) {
    a.addEventListener('click', function() {
      _mobileNav.classList.remove('open');
      _hamburger.classList.remove('open');
      _hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ── Active nav link (home page only) ───────────────────────── */
var _navLinks = document.querySelectorAll('.nav-links a[href^="#"], .nav-mobile a[href^="#"]');
if (_navLinks.length) {
  var _sections = document.querySelectorAll('section[id]');
  var _sectionObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        _navLinks.forEach(function(a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  _sections.forEach(function(s) { _sectionObs.observe(s); });
}
