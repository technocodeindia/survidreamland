/* ============================================================
   SURVIV INTERIORS — Frontend Logic (js/app.js)
   Works with the local data layer (js/data.js) which mirrors
   the original Google Apps Script backend API.
   ============================================================ */
var CONFIG = { businessName:'Surviv Interiors', tagline:'Full Home Interior Design', phone:'', whatsapp:'', email:'', address:'', mapLink:'', facebook:'', instagram:'', youtube:'', adminPassword:'' };
var MEDIA = [];
var FEEDBACK = [];
var ADMIN = sessionStorage.getItem('si_admin') === '1';
var fbRating = 5;

/* ---------- server bridge (local data layer) ---------- */
function callServer(fn) {
  var args = Array.prototype.slice.call(arguments, 1);
  var cb = args.pop();
  if (typeof Server === 'undefined' || !Server[fn]) { setTimeout(function () { cb({ message: 'Data layer not loaded' }, null); }, 30); return; }
  Server[fn].apply(null, args.concat([function (err, res) { cb(err || null, res); }]));
}

/* ---------- toast ---------- */
var toastTimer;
function toast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + (type || '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.className = 'toast' + (type ? ' ' + type : ''); }, 3400);
}

/* ---------- apply config ---------- */
function applyConfig(cfg) {
  CONFIG = Object.assign(CONFIG, cfg || {});
  document.title = CONFIG.businessName + ' | ' + CONFIG.tagline;
  document.querySelectorAll('[data-cfg]').forEach(function (el) {
    var k = el.getAttribute('data-cfg');
    if (CONFIG[k]) el.textContent = CONFIG[k];
  });
  if (CONFIG.phone) {
    document.getElementById('phoneInline').textContent = CONFIG.phone;
    document.getElementById('infoPhone').textContent = CONFIG.phone;
    document.getElementById('footPhone').textContent = CONFIG.phone;
  }
  if (CONFIG.email) {
    document.getElementById('infoEmail').textContent = CONFIG.email;
    document.getElementById('footEmail').textContent = CONFIG.email;
  }
  if (CONFIG.address) {
    document.getElementById('infoAddress').textContent = CONFIG.address;
    document.getElementById('footAddress').textContent = CONFIG.address;
  }
  var wa = CONFIG.whatsapp ? String(CONFIG.whatsapp).replace(/[^\d]/g, '') : '';
  var waUrl = wa ? 'https://wa.me/' + wa + '?text=' + encodeURIComponent('Hi ' + CONFIG.businessName + ', I need interior design consultation for my home.') : '#';
  document.getElementById('waFab').href = waUrl;
  document.getElementById('waLink').href = waUrl;
  var socialMap = { facebook: 'facebook', instagram: 'instagram', youtube: 'youtube' };
  document.querySelectorAll('[data-social]').forEach(function (a) {
    var k = socialMap[a.getAttribute('data-social')];
    if (CONFIG[k]) a.href = CONFIG[k];
  });
  document.getElementById('year').textContent = new Date().getFullYear();
}

/* ---------- init ---------- */
(function init() {
  callServer('getPublicData', function (err, res) {
    if (!err && res && res.ok) {
      applyConfig(res.config);
      MEDIA = res.media || [];
      FEEDBACK = res.feedback || [];
    } else {
      applyConfig({});
    }
    renderMedia();
    renderTestimonials();
  });
})();

/* ---------- header / nav ---------- */
var header = document.getElementById('siteHeader');
var toTop = document.getElementById('toTop');
window.addEventListener('scroll', function () {
  header.classList.toggle('scrolled', window.scrollY > 60);
  toTop.classList.toggle('show', window.scrollY > 500);
});
document.getElementById('burger').addEventListener('click', function () { document.getElementById('mainNav').classList.toggle('open'); });
document.querySelectorAll('#mainNav a').forEach(function (a) { a.addEventListener('click', function () { document.getElementById('mainNav').classList.remove('open'); }); });
toTop.addEventListener('click', function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });

/* ---------- hero slider ---------- */
var slides = Array.from(document.querySelectorAll('.slide'));
var dotsWrap = document.getElementById('heroDots');
var cur = 0, timer;
slides.forEach(function (_, i) {
  var d = document.createElement('button');
  d.addEventListener('click', function () { goSlide(i); restart(); });
  dotsWrap.appendChild(d);
});
function goSlide(i) {
  cur = (i + slides.length) % slides.length;
  slides.forEach(function (s, k) { s.classList.toggle('active', k === cur); });
  Array.from(dotsWrap.children).forEach(function (d, k) { d.classList.toggle('on', k === cur); });
}
function restart() { clearInterval(timer); timer = setInterval(function () { goSlide(cur + 1); }, 5500); }
document.getElementById('nextSlide').addEventListener('click', function () { goSlide(cur + 1); restart(); });
document.getElementById('prevSlide').addEventListener('click', function () { goSlide(cur - 1); restart(); });
goSlide(0); restart();

/* ---------- counters & reveal ---------- */
function animateCount(el) {
  var target = parseInt(el.getAttribute('data-count'), 10) || 0;
  var suffix = el.getAttribute('data-suffix') || '';
  var n = 0; var step = Math.max(1, Math.ceil(target / 45));
  var iv = setInterval(function () {
    n += step;
    if (n >= target) { n = target; clearInterval(iv); }
    el.textContent = n + suffix;
  }, 28);
}
var io = new IntersectionObserver(function (entries) {
  entries.forEach(function (en) {
    if (en.isIntersecting) {
      en.target.classList.add('visible');
      en.target.querySelectorAll('[data-count]').forEach(animateCount);
      io.unobserve(en.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal, .hero-stats').forEach(function (el) { io.observe(el); });
document.querySelectorAll('.hero-stats [data-count]').forEach(animateCount);

/* ---------- FAQ accordion ---------- */
document.querySelectorAll('.faq').forEach(function (f) {
  var q = f.querySelector('.faq-q');
  var a = f.querySelector('.faq-a');
  q.addEventListener('click', function () {
    var open = f.classList.contains('open');
    document.querySelectorAll('.faq.open').forEach(function (o) { o.classList.remove('open'); o.querySelector('.faq-a').style.maxHeight = null; });
    if (!open) { f.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
  });
});

/* ---------- media gallery ---------- */
function mediaTileBg(m) {
  if (m.thumb) return '';
  var h = m.hue !== undefined ? m.hue : (hashCode(m.title) % 360);
  return 'background:linear-gradient(135deg,hsl(' + h + ',42%,34%),hsl(' + ((h + 40) % 360) + ',48%,18%));';
}
function hashCode(s) { var h = 0; for (var i = 0; i < String(s).length; i++) { h = (h << 5) - h + String(s).charCodeAt(i); h |= 0; } return Math.abs(h); }

var filterType = 'all', filterCat = null;
document.getElementById('mediaFilters').addEventListener('click', function (e) {
  var btn = e.target.closest('.chip');
  if (!btn) return;
  if (btn.dataset.filter) {
    filterType = btn.dataset.filter;
    filterCat = null;
    document.querySelectorAll('#mediaFilters .chip').forEach(function (c) { c.classList.toggle('on', c === btn); });
  } else if (btn.dataset.cat) {
    filterCat = btn.dataset.cat;
    filterType = 'all';
    document.querySelectorAll('#mediaFilters .chip').forEach(function (c) { c.classList.toggle('on', c === btn); });
  }
  renderMedia();
});

function renderMedia() {
  var grid = document.getElementById('mediaGrid');
  var list = MEDIA.filter(function (m) {
    if (filterType !== 'all' && m.type !== filterType) return false;
    if (filterCat && m.category !== filterCat) return false;
    return true;
  });
  if (!list.length) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><span class="serif">No projects in this category yet</span>Check back soon for fresh designs.</div>';
    return;
  }
  grid.innerHTML = list.map(function (m) {
    var badge = m.type === 'video' ? '<span class="m-badge video">Video</span>' : '<span class="m-badge">Photo</span>';
    var play = m.type === 'video' ? '<span class="play-btn">&#9654;</span>' : '';
    var img = m.thumb ? '<img src="' + m.thumb + '" alt="' + esc(m.title) + '" loading="lazy">' : '<span class="tile" style="' + mediaTileBg(m) + '"><span class="serif">' + esc(m.category || 'Design') + '</span></span>';
    return '<div class="m-item" data-id="' + m.id + '" data-type="' + m.type + '">' + badge + play + img +
      '<span class="veil"><span><small>' + esc(m.category || 'Project') + '</small><b>' + esc(m.title) + '</b></span></span></div>';
  }).join('');
  grid.querySelectorAll('.m-item').forEach(function (item) {
    item.addEventListener('click', function () { openLightbox(item.getAttribute('data-id')); });
  });
}

function openLightbox(id) {
  var m = MEDIA.find(function (x) { return String(x.id) === String(id); });
  if (!m) return;
  var content = document.getElementById('lbContent');
  var cap = document.getElementById('lbCap');
  cap.textContent = m.title;
  if (m.type === 'photo') {
    if (m.thumb) content.innerHTML = '<img src="' + m.thumb + '" alt="' + esc(m.title) + '">';
    else {
      content.innerHTML = '';
      var div = document.createElement('div');
      div.style.cssText = 'height:60vh;border-radius:10px;' + mediaTileBg(m);
      div.innerHTML = '<span class="tile" style="height:100%"><span class="serif" style="font-size:1.8rem">' + esc(m.title) + '</span></span>';
      content.appendChild(div);
    }
  } else if (m.embed) {
    content.innerHTML = '<iframe src="' + m.embed + '?autoplay=1" allowfullscreen allow="autoplay"></iframe>';
  } else if (m.url) {
    content.innerHTML = '<div style="text-align:center;padding:40px"><p style="color:#fff;margin-bottom:20px">This video is hosted externally.</p><a href="' + m.url + '" target="_blank" rel="noopener" class="btn btn-gold">Open Video</a></div>';
  } else {
    content.innerHTML = '<div style="height:60vh;' + mediaTileBg(m) + ';border-radius:10px;display:grid;place-items:center"><span class="play-btn">&#9654;</span></div>';
  }
  document.getElementById('lightbox').classList.add('open');
}
document.getElementById('lbClose').addEventListener('click', closeLightbox);
document.getElementById('lightbox').addEventListener('click', function (e) { if (e.target.id === 'lightbox') closeLightbox(); });
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.getElementById('lbContent').innerHTML = '';
}
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeLightbox(); closeAdmin(); document.getElementById('loginModal').classList.remove('open'); } });

/* ---------- testimonials ---------- */
var testiIdx = 0;
function renderTestimonials() {
  var track = document.getElementById('testiTrack');
  var nav = document.getElementById('testiNav');
  if (!FEEDBACK.length) { track.innerHTML = ''; nav.innerHTML = ''; return; }
  track.innerHTML = FEEDBACK.map(function (f) {
    return '<div class="testi"><span class="q">&ldquo;</span><div class="stars">' + stars(f.rating) + '</div>' +
      '<p>' + esc(f.message) + '</p>' +
      '<div class="who"><b>' + esc(f.name) + '</b><span>Verified Homeowner</span></div></div>';
  }).join('');
  nav.innerHTML = FEEDBACK.map(function (_, i) { return '<button class="' + (i === 0 ? 'on' : '') + '" data-i="' + i + '"></button>'; }).join('');
  testiIdx = 0;
  track.style.transform = 'translateX(0)';
  nav.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { setTesti(parseInt(b.dataset.i, 10)); }); });
}
function setTesti(i) {
  testiIdx = i % FEEDBACK.length;
  document.getElementById('testiTrack').style.transform = 'translateX(-' + (testiIdx * 100) + '%)';
  document.querySelectorAll('#testiNav button').forEach(function (b, k) { b.classList.toggle('on', k === testiIdx); });
}
setInterval(function () { if (FEEDBACK.length && !document.querySelector('#testimonials:hover')) setTesti(testiIdx + 1); }, 6000);
function stars(r) {
  var s = '';
  for (var i = 1; i <= 5; i++) s += i <= r ? '&#9733;' : '&#9734;';
  return s;
}

/* ---------- star input ---------- */
var starSpans = document.querySelectorAll('#starInput span');
function paintStars(n) { starSpans.forEach(function (s, i) { s.style.color = i < n ? '#b98846' : '#d8cfc2'; }); }
starSpans.forEach(function (s) {
  s.addEventListener('mouseenter', function () { paintStars(parseInt(s.dataset.v, 10)); });
  s.addEventListener('click', function () { fbRating = parseInt(s.dataset.v, 10); document.getElementById('ratingInput').value = fbRating; paintStars(fbRating); });
});
document.getElementById('starInput').addEventListener('mouseleave', function () { paintStars(fbRating); });
paintStars(5);

/* ---------- lead form ---------- */
document.getElementById('leadForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var f = e.target;
  var btn = document.getElementById('leadSubmit');
  btn.disabled = true;
  btn.textContent = 'Sending...';
  var payload = {
    name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(),
    city: f.city.value.trim(), service: f.service.value, budget: f.budget.value,
    message: f.message.value.trim(), source: 'Website'
  };
  callServer('submitLead', payload, function (err, res) {
    btn.disabled = false;
    btn.textContent = 'Submit Enquiry';
    if (!err && res && res.ok) {
      toast(res.message, 'ok');
      f.reset();
    } else {
      toast((res && res.message) || 'Failed to send. Please call us directly.', 'err');
    }
  });
});

/* ---------- feedback form ---------- */
document.getElementById('feedbackForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var f = e.target;
  var btn = document.getElementById('fbSubmit');
  btn.disabled = true;
  btn.textContent = 'Submitting...';
  callServer('submitFeedback', { name: f.name.value.trim(), email: f.email.value.trim(), rating: fbRating, message: f.message.value.trim() }, function (err, res) {
    btn.disabled = false;
    btn.textContent = 'Submit Feedback';
    if (!err && res && res.ok) {
      toast(res.message, 'ok');
      f.reset();
      fbRating = 5;
      document.getElementById('ratingInput').value = 5;
      paintStars(5);
    } else {
      toast((res && res.message) || 'Failed to submit feedback.', 'err');
    }
  });
});

/* ================= ADMIN PANEL ================= */
document.getElementById('adminOpenBtn').addEventListener('click', function () {
  if (ADMIN) { openAdmin(); } else { document.getElementById('loginModal').classList.add('open'); document.getElementById('loginPassword').focus(); }
});
document.getElementById('loginForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var pw = document.getElementById('loginPassword').value;
  callServer('adminLogin', pw, function (err, res) {
    if (!err && res === true) {
      ADMIN = true;
      sessionStorage.setItem('si_admin', '1');
      document.getElementById('loginModal').classList.remove('open');
      document.getElementById('loginPassword').value = '';
      openAdmin();
      loadDashboard();
    } else {
      toast('Incorrect password. Please try again.', 'err');
    }
  });
});
document.getElementById('adLogout').addEventListener('click', function () {
  ADMIN = false;
  sessionStorage.removeItem('si_admin');
  closeAdmin();
  toast('Logged out of admin panel.');
});
function openAdmin() {
  document.getElementById('adminPanel').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeAdmin() {
  document.getElementById('adminPanel').classList.remove('open');
  document.body.style.overflow = '';
}
document.getElementById('adTabs').addEventListener('click', function (e) {
  var btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  switchTab(btn.dataset.tab);
});
document.querySelectorAll('[data-goto]').forEach(function (b) { b.addEventListener('click', function () { switchTab(b.dataset.goto); }); });
function switchTab(tab) {
  document.querySelectorAll('#adTabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
  document.querySelectorAll('.ad-pane').forEach(function (p) { p.classList.toggle('on', p.dataset.pane === tab); });
  if (tab === 'dashboard') loadDashboard();
  if (tab === 'leads') loadLeads();
  if (tab === 'feedback') loadFeedback();
  if (tab === 'media') loadMedia();
  if (tab === 'settings') loadSettings();
}

/* ---------- dashboard ---------- */
function loadDashboard() {
  callServer('getStats', function (err, res) {
    if (err || !res || !res.ok) return;
    document.getElementById('statGrid').innerHTML = [
      ['Total Leads', res.totalLeads], ['New Leads', res.newLeads], ['Projects Won', res.wonLeads],
      ['Total Feedback', res.totalFeedback], ['Avg. Rating', res.avgRating + ' / 5'], ['Published Media', res.publishedMedia + ' / ' + res.totalMedia]
    ].map(function (s) { return '<div class="stat-card"><b>' + s[1] + '</b><span>' + s[0] + '</span></div>'; }).join('');
  });
  callServer('getLeads', function (err, res) {
    if (err || !res || !res.ok) return;
    var rows = res.leads.slice(0, 6);
    document.getElementById('dashLeads').innerHTML = rows.length ? rows.map(function (l) {
      return '<tr><td>' + esc(l.ts) + '</td><td><b>' + esc(l.name) + '</b></td><td>' + esc(l.phone) + '</td><td>' + esc(l.service) + '</td><td>' + esc(l.budget || '-') + '</td><td><span class="status-pill st-' + l.status.replace(/\s/g, '') + '">' + esc(l.status) + '</span></td></tr>';
    }).join('') : '<tr><td colspan="6" class="empty">No leads yet.</td></tr>';
  });
  callServer('getFeedback', function (err, res) {
    if (err || !res || !res.ok) return;
    var rows = res.feedback.slice(0, 6);
    document.getElementById('dashFeedback').innerHTML = rows.length ? rows.map(function (f) {
      return '<tr><td>' + esc(f.ts) + '</td><td><b>' + esc(f.name) + '</b></td><td class="stars" style="margin:0">' + stars(f.rating) + '</td><td>' + esc(truncate(f.message, 60)) + '</td><td>' + (f.approved ? '<span class="status-pill st-Won">Yes</span>' : '<span class="status-pill st-New">Pending</span>') + '</td></tr>';
    }).join('') : '<tr><td colspan="5" class="empty">No feedback yet.</td></tr>';
  });
}
function truncate(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) + '...' : s; }

/* ---------- leads ---------- */
var LEAD_STATUSES = ['New', 'Contacted', 'Site Visit Scheduled', 'Quotation Sent', 'Won', 'Lost'];
function loadLeads() {
  var tb = document.getElementById('leadsTable');
  tb.innerHTML = '<tr><td colspan="12" class="empty"><span class="serif">Loading leads...</span></td></tr>';
  callServer('getLeads', function (err, res) {
    if (err || !res || !res.ok) { tb.innerHTML = '<tr><td colspan="12" class="empty">Failed to load leads.</td></tr>'; return; }
    if (!res.leads.length) { tb.innerHTML = '<tr><td colspan="12" class="empty"><span class="serif">No leads yet</span>Share your website link to start receiving enquiries.</td></tr>'; return; }
    tb.innerHTML = res.leads.map(function (l) {
      return '<tr>' +
        '<td style="font-size:.72rem;color:var(--muted)">' + esc(l.id) + '</td>' +
        '<td style="white-space:nowrap">' + esc(l.ts) + '</td>' +
        '<td><b>' + esc(l.name) + '</b></td>' +
        '<td><a href="tel:' + esc(l.phone) + '" style="color:var(--gold);font-weight:600">' + esc(l.phone) + '</a></td>' +
        '<td>' + esc(l.email || '-') + '</td>' +
        '<td>' + esc(l.city || '-') + '</td>' +
        '<td>' + esc(l.service) + '</td>' +
        '<td>' + esc(l.budget || '-') + '</td>' +
        '<td style="max-width:220px">' + esc(truncate(l.message, 80)) + '</td>' +
        '<td>' + esc(l.source) + '</td>' +
        '<td><select class="st-sel" data-id="' + l.id + '">' + LEAD_STATUSES.map(function (s) { return '<option ' + (s === l.status ? 'selected' : '') + ' value="' + s + '">' + s + '</option>'; }).join('') + '</select></td>' +
        '<td style="white-space:nowrap"><button class="icon-btn" title="Call" data-call="' + esc(l.phone) + '">&#9742;</button><button class="icon-btn danger" title="Delete" data-del-lead="' + l.id + '">&#10005;</button></td>' +
        '</tr>';
    }).join('');
    tb.querySelectorAll('.st-sel').forEach(function (sel) {
      sel.addEventListener('change', function () {
        callServer('updateLeadStatus', sel.dataset.id, sel.value, function (e2, r2) {
          if (!e2 && r2 && r2.ok) toast('Lead status updated to "' + sel.value + '".', 'ok');
          else toast('Failed to update status.', 'err');
        });
      });
    });
    tb.querySelectorAll('[data-call]').forEach(function (b) { b.addEventListener('click', function () { location.href = 'tel:' + b.dataset.call; }); });
    tb.querySelectorAll('[data-del-lead]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!confirm('Delete this lead permanently?')) return;
        callServer('deleteLead', b.dataset.delLead, function (e3, r3) {
          if (!e3 && r3 && r3.ok) { toast('Lead deleted.', 'ok'); loadLeads(); loadDashboard(); }
          else toast('Failed to delete lead.', 'err');
        });
      });
    });
  });
}
document.getElementById('refreshLeadsBtn').addEventListener('click', loadLeads);
document.getElementById('exportCsvBtn').addEventListener('click', function () {
  callServer('exportLeadsCsv', function (err, res) {
    if (err || !res || !res.ok) { toast('Export failed.', 'err'); return; }
    var csv = res.csv;
    var uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    var a = document.createElement('a');
    a.href = uri;
    a.download = 'surviv-interiors-leads-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast('Leads exported to CSV.', 'ok');
  });
});

/* ---------- feedback admin ---------- */
function loadFeedback() {
  var tb = document.getElementById('fbTable');
  tb.innerHTML = '<tr><td colspan="8" class="empty"><span class="serif">Loading feedback...</span></td></tr>';
  callServer('getFeedback', function (err, res) {
    if (err || !res || !res.ok) { tb.innerHTML = '<tr><td colspan="8" class="empty">Failed to load feedback.</td></tr>'; return; }
    if (!res.feedback.length) { tb.innerHTML = '<tr><td colspan="8" class="empty"><span class="serif">No feedback yet</span></td></tr>'; return; }
    tb.innerHTML = res.feedback.map(function (f) {
      return '<tr>' +
        '<td style="font-size:.72rem;color:var(--muted)">' + esc(f.id) + '</td>' +
        '<td style="white-space:nowrap">' + esc(f.ts) + '</td>' +
        '<td><b>' + esc(f.name) + '</b></td>' +
        '<td>' + esc(f.email || '-') + '</td>' +
        '<td class="stars" style="margin:0">' + stars(f.rating) + '</td>' +
        '<td style="max-width:260px">' + esc(truncate(f.message, 90)) + '</td>' +
        '<td><button class="toggle ' + (f.approved ? 'on' : '') + '" data-fb="' + f.id + '" aria-label="Toggle visibility"></button></td>' +
        '<td style="white-space:nowrap"><button class="icon-btn danger" data-del-fb="' + f.id + '">&#10005;</button></td>' +
        '</tr>';
    }).join('');
    tb.querySelectorAll('[data-fb]').forEach(function (t) {
      t.addEventListener('click', function () {
        var id = t.dataset.fb;
        var next = !t.classList.contains('on');
        callServer('setFeedbackApproved', id, next, function (e2, r2) {
          if (!e2 && r2 && r2.ok) {
            t.classList.toggle('on', next);
            toast(next ? 'Feedback is now visible on the website.' : 'Feedback hidden from website.', 'ok');
          } else toast('Failed to update feedback.', 'err');
        });
      });
    });
    tb.querySelectorAll('[data-del-fb]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!confirm('Delete this feedback permanently?')) return;
        callServer('deleteFeedback', b.dataset.delFb, function (e3, r3) {
          if (!e3 && r3 && r3.ok) { toast('Feedback deleted.', 'ok'); loadFeedback(); }
          else toast('Failed to delete feedback.', 'err');
        });
      });
    });
  });
}
document.getElementById('refreshFbBtn').addEventListener('click', loadFeedback);

/* ---------- media admin ---------- */
function loadMedia() {
  var lib = document.getElementById('mediaLib');
  lib.innerHTML = '<div class="empty" style="grid-column:1/-1"><span class="serif">Loading media...</span></div>';
  callServer('getMedia', function (err, res) {
    if (err || !res || !res.ok) { lib.innerHTML = '<div class="empty" style="grid-column:1/-1">Failed to load media.</div>'; return; }
    if (!res.media.length) { lib.innerHTML = '<div class="empty" style="grid-column:1/-1"><span class="serif">Media library is empty</span>Upload photos or add video links — they appear on the website once published.</div>'; return; }
    lib.innerHTML = res.media.map(function (m) {
      var thumbHtml = m.thumb ? '<img src="' + m.thumb + '" alt="' + esc(m.title) + '">' : (m.type === 'video' ? '<span class="play-btn">&#9654;</span>' : '<span style="font-size:2rem">&#9634;</span>');
      return '<div class="med-card">' +
        '<div class="med-thumb">' + thumbHtml + '</div>' +
        '<div class="med-body"><b>' + esc(m.title) + '</b><small>' + esc(m.type) + ' &middot; ' + esc(m.category || 'General') + '</small></div>' +
        '<div class="med-actions">' +
        '<button class="toggle ' + (m.published ? 'on' : '') + '" data-pub="' + m.id + '" title="Show on website"></button>' +
        '<button class="icon-btn danger" data-del-media="' + m.id + '" title="Delete">&#10005;</button>' +
        '</div></div>';
    }).join('');
    lib.querySelectorAll('[data-pub]').forEach(function (t) {
      t.addEventListener('click', function () {
        callServer('toggleMediaPublished', t.dataset.pub, function (e2, r2) {
          if (!e2 && r2 && r2.ok) { t.classList.toggle('on', r2.published === 'Yes'); toast(r2.published === 'Yes' ? 'Published on website.' : 'Unpublished.', 'ok'); }
          else toast('Failed to update media.', 'err');
        });
      });
    });
    lib.querySelectorAll('[data-del-media]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!confirm('Delete this media file permanently?')) return;
        callServer('deleteMedia', b.dataset.delMedia, function (e3, r3) {
          if (!e3 && r3 && r3.ok) { toast('Media deleted.', 'ok'); loadMedia(); }
          else toast('Failed to delete media.', 'err');
        });
      });
    });
  });
}
document.getElementById('refreshMediaBtn').addEventListener('click', loadMedia);

/* photo url */
document.getElementById('addPhotoBtn').addEventListener('click', function () {
  var url = document.getElementById('photoUrl').value.trim();
  var title = document.getElementById('photoTitle').value.trim();
  var cat = document.getElementById('photoCat').value;
  if (!url) { toast('Please paste an image URL.', 'err'); return; }
  var btn = document.getElementById('addPhotoBtn');
  btn.disabled = true;
  btn.textContent = 'Adding...';
  callServer('addImageUrl', url, title, cat, function (err, res) {
    btn.disabled = false;
    btn.textContent = 'Add Photo';
    if (!err && res && res.ok) {
      toast('Photo added and published on the site.', 'ok');
      document.getElementById('photoUrl').value = '';
      document.getElementById('photoTitle').value = '';
      loadMedia();
    } else {
      toast((res && res.message) || 'Failed to add photo.', 'err');
    }
  });
});

/* video url */
document.getElementById('addVideoBtn').addEventListener('click', function () {
  var url = document.getElementById('videoUrl').value.trim();
  var title = document.getElementById('videoTitle').value.trim();
  var cat = document.getElementById('videoCat').value;
  if (!url) { toast('Please paste a video URL.', 'err'); return; }
  var btn = document.getElementById('addVideoBtn');
  btn.disabled = true;
  btn.textContent = 'Adding...';
  callServer('addVideoUrl', url, title, cat, function (err, res) {
    btn.disabled = false;
    btn.textContent = 'Add Video';
    if (!err && res && res.ok) {
      toast('Video added and published on the site.', 'ok');
      document.getElementById('videoUrl').value = '';
      document.getElementById('videoTitle').value = '';
      loadMedia();
    } else {
      toast((res && res.message) || 'Failed to add video.', 'err');
    }
  });
});

/* ---------- settings ---------- */
function loadSettings() {
  callServer('getConfig', function (err, res) {
    if (err || !res) return;
    var cfg = res;
    var map = { cfgBusinessName: 'businessName', cfgTagline: 'tagline', cfgPhone: 'phone', cfgWhatsapp: 'whatsapp', cfgEmail: 'email', cfgAddress: 'address', cfgMapLink: 'mapLink', cfgFacebook: 'facebook', cfgInstagram: 'instagram', cfgYoutube: 'youtube' };
    Object.keys(map).forEach(function (id) { document.getElementById(id).value = cfg[map[id]] || ''; });
  });
}
document.getElementById('saveCfgBtn').addEventListener('click', function () {
  var payload = {
    businessName: document.getElementById('cfgBusinessName').value.trim(),
    tagline: document.getElementById('cfgTagline').value.trim(),
    phone: document.getElementById('cfgPhone').value.trim(),
    whatsapp: document.getElementById('cfgWhatsapp').value.trim(),
    email: document.getElementById('cfgEmail').value.trim(),
    address: document.getElementById('cfgAddress').value.trim(),
    mapLink: document.getElementById('cfgMapLink').value.trim(),
    facebook: document.getElementById('cfgFacebook').value.trim(),
    instagram: document.getElementById('cfgInstagram').value.trim(),
    youtube: document.getElementById('cfgYoutube').value.trim()
  };
  callServer('saveConfig', payload, function (err, res) {
    if (!err && res && res.ok) {
      applyConfig(res.config);
      toast('Business settings saved.', 'ok');
    } else toast('Failed to save settings.', 'err');
  });
});
document.getElementById('savePassBtn').addEventListener('click', function () {
  var p1 = document.getElementById('cfgNewPass').value;
  var p2 = document.getElementById('cfgNewPass2').value;
  if (!p1) { toast('Enter a new password.', 'err'); return; }
  if (p1.length < 4) { toast('Password must be at least 4 characters.', 'err'); return; }
  if (p1 !== p2) { toast('Passwords do not match.', 'err'); return; }
  callServer('saveConfig', { adminPassword: p1 }, function (err, res) {
    if (!err && res && res.ok) {
      CONFIG.adminPassword = p1;
      document.getElementById('cfgNewPass').value = '';
      document.getElementById('cfgNewPass2').value = '';
      toast('Admin password updated.', 'ok');
    } else toast('Failed to update password.', 'err');
  });
});

/* ---------- esc helper ---------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
