/* ============================================================
   SURVIV INTERIORS — Client-side data layer (js/data.js)
   Drop-in replacement for the Google Apps Script backend.
   Mirrors the Code.gs API exactly so the frontend works
   unchanged: every method takes a callback cb(err, result)
   just like google.script.run.withSuccessHandler().

   Data is persisted in localStorage, so leads, feedback,
   media and settings work fully on GitHub Pages (static).
   ============================================================ */
(function () {
  'use strict';

  var KEYS = { config: 'si_config', leads: 'si_leads', feedback: 'si_feedback', media: 'si_media' };

  var DEFAULT_CONFIG = {
    businessName: 'Surviv Interiors',
    tagline: 'Full Home Interior Design & Best Interior Solution Ideas',
    phone: '+91 98765 43210',
    whatsapp: '919876543210',
    email: 'hello@survivinteriors.com',
    address: '123 Design Street, Your City, India',
    mapLink: 'https://maps.google.com/',
    facebook: 'https://facebook.com/',
    instagram: 'https://instagram.com/',
    youtube: 'https://youtube.com/',
    adminPassword: 'admin123'
  };

  var LEAD_HEADERS = ['ID', 'Timestamp', 'Name', 'Phone', 'Email', 'City', 'Budget', 'Service', 'Message', 'Status', 'Source'];

  /* ---------------- low-level helpers ---------------- */

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage full/blocked */ }
  }

  function uid() {
    var d = new Date();
    var p = function (n, l) { n = String(n); while (n.length < (l || 2)) n = '0' + n; return n; };
    return p(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) +
      Math.floor(Math.random() * 1000);
  }

  function nowStr() {
    var d = new Date();
    var p = function (n) { n = String(n); return n.length < 2 ? '0' + n : n; };
    var h = d.getHours();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return p(d.getDate()) + '-' + p(d.getMonth() + 1) + '-' + d.getFullYear() + ' ' + p(h) + ':' + p(d.getMinutes()) + ' ' + ampm;
  }

  function ytId(url) {
    var m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([\w-]{6,})/);
    return m ? m[1] : null;
  }

  function mediaObj(r) {
    var type = String(r.type || 'photo').toLowerCase();
    var url = String(r.url || '');
    var embed = null;
    if (type === 'video') {
      var yid = ytId(url);
      if (yid) embed = 'https://www.youtube.com/embed/' + yid;
    }
    return {
      id: r.id, ts: r.ts, title: r.title, type: type, category: r.category,
      url: url, thumb: url, embed: embed, mimeType: r.mimeType || 'link',
      published: !!r.published, driveId: r.driveId || ''
    };
  }

  function done(cb, err, res) {
    setTimeout(function () { if (typeof cb === 'function') cb(err || null, res); }, 120);
  }

  /* ---------------- seed data (first run only) ---------------- */

  function seed() {
    var has = read(KEYS.config, null);
    if (has) return;

    write(KEYS.config, Object.assign({}, DEFAULT_CONFIG));

    var leads = [
      { id: uid(), ts: nowStr(), name: 'Priya Sharma', phone: '+91 98111 22334', email: 'priya.sharma@gmail.com', city: 'Mumbai', budget: '₹5 - 10 Lakh', service: 'Full Home Interior', message: '3BHK apartment, 1650 sq ft in Powai. Want a modern warm-wood look for the whole house.', status: 'New', source: 'Website' },
      { id: uid(), ts: nowStr(), name: 'Rahul Verma', phone: '+91 99880 11223', email: 'rahul.verma@outlook.com', city: 'Pune', budget: '₹2 - 5 Lakh', service: 'Modular Kitchen', message: '2BHK in Hinjewadi. Need a matte-finish modular kitchen with island.', status: 'Contacted', source: 'Website' },
      { id: uid(), ts: nowStr(), name: 'Anita Desai', phone: '+91 97654 32109', email: 'anita.desai@yahoo.in', city: 'Ahmedabad', budget: '₹10 Lakh +', service: 'Full Home Interior', message: '4BHK duplex, 3200 sq ft. Complete home with premium finishes.', status: 'Site Visit Scheduled', source: 'Google Ads' },
      { id: uid(), ts: nowStr(), name: 'Vikram Patel', phone: '+91 90040 55667', email: 'vikram.patel@gmail.com', city: 'Surat', budget: '₹2 - 5 Lakh', service: 'Wardrobe & Storage', message: 'Need floor-to-ceiling wardrobes for 2 bedrooms.', status: 'Quotation Sent', source: 'Website' },
      { id: uid(), ts: nowStr(), name: 'Sneha Kulkarni', phone: '+91 98220 44331', email: 'sneha.k@rediffmail.com', city: 'Nashik', budget: 'Under ₹2 Lakh', service: 'Living Room', message: '1BHK makeover — living room TV unit and false ceiling.', status: 'Won', source: 'Instagram' },
      { id: uid(), ts: nowStr(), name: 'Arjun Nair', phone: '+91 97420 88776', email: 'arjun.nair@gmail.com', city: 'Kochi', budget: '₹5 - 10 Lakh', service: 'Bedroom', message: 'Master bedroom with upholstered headboard and walk-in closet.', status: 'Won', source: 'Website' },
      { id: uid(), ts: nowStr(), name: 'Meera Iyer', phone: '+91 96500 33445', email: 'meera.iyer@gmail.com', city: 'Chennai', budget: 'Not Sure', service: 'Kids Room', message: 'Kids room for 6-year-old girl, pink and white theme.', status: 'Lost', source: 'Referral' },
      { id: uid(), ts: nowStr(), name: 'Karan Singh', phone: '+91 98118 77665', email: 'karan.singh@gmail.com', city: 'Jaipur', budget: '₹5 - 10 Lakh', service: 'Home Office', message: 'Work-from-home setup with shelving and acoustic panels.', status: 'New', source: 'Website' }
    ];
    write(KEYS.leads, leads);

    var feedback = [
      { id: uid(), ts: nowStr(), name: 'Sneha Kulkarni', email: 'sneha.k@rediffmail.com', rating: 5, message: 'Surviv Interiors turned our 3BHK into a magazine-worthy home. The 3D designs were spot on and execution was flawless.', approved: true },
      { id: uid(), ts: nowStr(), name: 'Arjun Nair', email: 'arjun.nair@gmail.com', rating: 5, message: 'Transparent pricing, on-time delivery and the modular kitchen quality is outstanding. Highly recommended!', approved: true },
      { id: uid(), ts: nowStr(), name: 'Divya Menon', email: 'divya.menon@gmail.com', rating: 4, message: 'Great design ideas and the team handled everything from materials to installation. Very professional service.', approved: true },
      { id: uid(), ts: nowStr(), name: 'Rohit Gupta', email: 'rohit.g@gmail.com', rating: 5, message: 'The false ceiling and cove lighting in our living room exceeded expectations. Beautiful craftsmanship.', approved: false },
      { id: uid(), ts: nowStr(), name: 'Pooja Bhatt', email: 'pooja.bhatt@gmail.com', rating: 4, message: 'Loved the kids room design they created for our daughter. Will recommend to friends.', approved: false }
    ];
    write(KEYS.feedback, feedback);

    var media = [
      { id: uid(), ts: nowStr(), title: 'Walnut Wood Living Room', type: 'photo', category: 'Living', url: 'https://picsum.photos/seed/surviv-living1/900/700', mimeType: 'link', published: true, driveId: '' },
      { id: uid(), ts: nowStr(), title: '3BHK Design Walkthrough', type: 'video', category: 'Living', url: 'https://www.youtube.com/watch?v=z3xBToT-m4w', mimeType: 'link', published: true, driveId: '' },
      { id: uid(), ts: nowStr(), title: 'Matte Black Modular Kitchen', type: 'photo', category: 'Kitchen', url: 'https://picsum.photos/seed/surviv-kitchen1/900/1200', mimeType: 'link', published: true, driveId: '' },
      { id: uid(), ts: nowStr(), title: 'Serene Master Bedroom', type: 'photo', category: 'Bedroom', url: 'https://picsum.photos/seed/surviv-bed1/900/700', mimeType: 'link', published: true, driveId: '' },
      { id: uid(), ts: nowStr(), title: 'Scandinavian Kids Room', type: 'photo', category: 'Kids', url: 'https://picsum.photos/seed/surviv-kids1/900/700', mimeType: 'link', published: true, driveId: '' },
      { id: uid(), ts: nowStr(), title: 'Luxury Wardrobe Wall', type: 'photo', category: 'Bedroom', url: 'https://picsum.photos/seed/surviv-wardrobe1/900/1200', mimeType: 'link', published: true, driveId: '' },
      { id: uid(), ts: nowStr(), title: 'Georgia Cottage House Tour', type: 'video', category: 'Living', url: 'https://www.youtube.com/watch?v=pkeD8gsIdDU', mimeType: 'link', published: true, driveId: '' },
      { id: uid(), ts: nowStr(), title: 'Warm Cove Lighting Lounge', type: 'photo', category: 'Living', url: 'https://picsum.photos/seed/surviv-lounge1/900/700', mimeType: 'link', published: true, driveId: '' },
      { id: uid(), ts: nowStr(), title: 'Home Office Workstation', type: 'photo', category: 'Office', url: 'https://picsum.photos/seed/surviv-office1/900/700', mimeType: 'link', published: true, driveId: '' }
    ];
    write(KEYS.media, media);
  }

  function getLeadsRaw() { return read(KEYS.leads, []); }
  function getFeedbackRaw() { return read(KEYS.feedback, []); }
  function getMediaRaw() { return read(KEYS.media, []); }

  function findRow(arr, id) {
    for (var i = 0; i < arr.length; i++) if (String(arr[i].id) === String(id)) return i;
    return -1;
  }

  /* ---------------- public API (mirrors Code.gs) ---------------- */

  var Server = {

    /* ----- config ----- */
    getConfig: function (cb) {
      var stored = read(KEYS.config, {});
      var cfg = {};
      Object.keys(DEFAULT_CONFIG).forEach(function (k) {
        cfg[k] = (stored[k] !== undefined && String(stored[k]) !== '') ? String(stored[k]) : DEFAULT_CONFIG[k];
      });
      done(cb, null, cfg);
    },

    saveConfig: function (partial, cb) {
      partial = partial || {};
      var cfg = read(KEYS.config, {});
      Object.keys(DEFAULT_CONFIG).forEach(function (k) {
        if (partial[k] !== undefined && partial[k] !== null) cfg[k] = String(partial[k]);
      });
      write(KEYS.config, cfg);
      Server.getConfig(function (err2, fresh) {
        done(cb, err2, { ok: !err2, config: fresh });
      });
    },

    /* ----- public website data ----- */
    getPublicData: function (cb) {
      Server.getConfig(function (err, config) {
        if (err) return done(cb, err);
        var media = getMediaRaw().filter(function (r) { return !!r.published; }).map(mediaObj);
        var feedback = getFeedbackRaw().filter(function (r) { return !!r.approved; }).map(function (r) {
          return { id: r.id, ts: r.ts, name: r.name, email: r.email, rating: Number(r.rating) || 0, message: r.message, approved: !!r.approved };
        });
        done(cb, null, { ok: true, config: config, media: media, feedback: feedback });
      });
    },

    submitLead: function (data, cb) {
      data = data || {};
      var name = String(data.name || '').trim();
      var phone = String(data.phone || '').trim();
      if (!name) return done(cb, null, { ok: false, message: 'Please enter your name.' });
      if (phone.replace(/\D/g, '').length < 7) return done(cb, null, { ok: false, message: 'Please enter a valid phone number.' });
      var leads = getLeadsRaw();
      var row = {
        id: uid(), ts: nowStr(), name: name, phone: phone,
        email: String(data.email || '').trim(), city: String(data.city || '').trim(),
        budget: String(data.budget || '').trim(), service: String(data.service || '').trim(),
        message: String(data.message || '').trim(), status: 'New', source: String(data.source || 'Website')
      };
      leads.push(row);
      write(KEYS.leads, leads);
      done(cb, null, { ok: true, id: row.id, message: 'Thank you ' + name.split(' ')[0] + '! Our design team will call you within 24 hours.' });
    },

    submitFeedback: function (data, cb) {
      data = data || {};
      var name = String(data.name || '').trim();
      if (!name) return done(cb, null, { ok: false, message: 'Please enter your name.' });
      var rating = parseInt(data.rating, 10) || 5;
      var fb = getFeedbackRaw();
      var row = {
        id: uid(), ts: nowStr(), name: name,
        email: String(data.email || '').trim(), rating: rating,
        message: String(data.message || '').trim(), approved: false
      };
      fb.push(row);
      write(KEYS.feedback, fb);
      done(cb, null, { ok: true, id: row.id, message: 'Thank you for your valuable feedback! It will appear once approved.' });
    },

    /* ----- admin: auth & stats ----- */
    adminLogin: function (password, cb) {
      Server.getConfig(function (err, cfg) {
        done(cb, null, String(password) === String(cfg.adminPassword));
      });
    },

    getStats: function (cb) {
      var leads = getLeadsRaw();
      var feedback = getFeedbackRaw();
      var media = getMediaRaw();
      var ratings = feedback.map(function (r) { return Number(r.rating); }).filter(function (n) { return !isNaN(n); });
      var avg = ratings.length ? (ratings.reduce(function (a, b) { return a + b; }, 0) / ratings.length) : 0;
      done(cb, null, {
        ok: true,
        totalLeads: leads.length,
        newLeads: leads.filter(function (r) { return String(r.status) === 'New'; }).length,
        wonLeads: leads.filter(function (r) { return String(r.status) === 'Won'; }).length,
        totalFeedback: feedback.length,
        pendingFeedback: feedback.filter(function (r) { return !r.approved; }).length,
        avgRating: Math.round(avg * 10) / 10,
        totalMedia: media.length,
        publishedMedia: media.filter(function (r) { return !!r.published; }).length
      });
    },

    /* ----- admin: leads ----- */
    getLeads: function (cb) {
      var rows = getLeadsRaw().slice().reverse().map(function (r) {
        return { id: r.id, ts: r.ts, name: r.name, phone: r.phone, email: r.email, city: r.city, budget: r.budget, service: r.service, message: r.message, status: r.status, source: r.source };
      });
      done(cb, null, { ok: true, leads: rows });
    },

    updateLeadStatus: function (id, status, cb) {
      var rows = getLeadsRaw();
      var i = findRow(rows, id);
      if (i < 0) return done(cb, null, { ok: false, message: 'Lead not found.' });
      rows[i].status = String(status);
      write(KEYS.leads, rows);
      done(cb, null, { ok: true });
    },

    deleteLead: function (id, cb) {
      var rows = getLeadsRaw();
      var i = findRow(rows, id);
      if (i < 0) return done(cb, null, { ok: false, message: 'Lead not found.' });
      rows.splice(i, 1);
      write(KEYS.leads, rows);
      done(cb, null, { ok: true });
    },

    exportLeadsCsv: function (cb) {
      var rows = getLeadsRaw();
      var lines = [LEAD_HEADERS.join(',')];
      rows.forEach(function (r) {
        var cells = [r.id, r.ts, r.name, r.phone, r.email, r.city, r.budget, r.service, r.message, r.status, r.source];
        lines.push(cells.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','));
      });
      done(cb, null, { ok: true, csv: lines.join('\n') });
    },

    /* ----- admin: feedback ----- */
    getFeedback: function (cb) {
      var rows = getFeedbackRaw().slice().reverse().map(function (r) {
        return { id: r.id, ts: r.ts, name: r.name, email: r.email, rating: Number(r.rating) || 0, message: r.message, approved: !!r.approved };
      });
      done(cb, null, { ok: true, feedback: rows });
    },

    setFeedbackApproved: function (id, approved, cb) {
      var rows = getFeedbackRaw();
      var i = findRow(rows, id);
      if (i < 0) return done(cb, null, { ok: false, message: 'Feedback not found.' });
      rows[i].approved = !!approved;
      write(KEYS.feedback, rows);
      done(cb, null, { ok: true });
    },

    deleteFeedback: function (id, cb) {
      var rows = getFeedbackRaw();
      var i = findRow(rows, id);
      if (i < 0) return done(cb, null, { ok: false, message: 'Feedback not found.' });
      rows.splice(i, 1);
      write(KEYS.feedback, rows);
      done(cb, null, { ok: true });
    },

    /* ----- admin: media ----- */
    getMedia: function (cb) {
      var rows = getMediaRaw().slice().reverse().map(function (r) { return mediaObj(r); });
      done(cb, null, { ok: true, media: rows });
    },

    addImageUrl: function (url, title, category, cb) {
      url = String(url || '').trim();
      if (!/^https?:\/\//i.test(url)) return done(cb, null, { ok: false, message: 'Please paste a valid image URL.' });
      var rows = getMediaRaw();
      rows.push({ id: uid(), ts: nowStr(), title: String(title || 'Photo'), type: 'photo', category: String(category || 'General'), url: url, mimeType: 'link', published: true, driveId: '' });
      write(KEYS.media, rows);
      done(cb, null, { ok: true });
    },

    addVideoUrl: function (url, title, category, cb) {
      url = String(url || '').trim();
      if (!/^https?:\/\//i.test(url)) return done(cb, null, { ok: false, message: 'Please paste a valid video URL (YouTube, Vimeo or Drive link).' });
      var rows = getMediaRaw();
      rows.push({ id: uid(), ts: nowStr(), title: String(title || 'Video'), type: 'video', category: String(category || 'General'), url: url, mimeType: 'link', published: true, driveId: '' });
      write(KEYS.media, rows);
      done(cb, null, { ok: true });
    },

    toggleMediaPublished: function (id, cb) {
      var rows = getMediaRaw();
      var i = findRow(rows, id);
      if (i < 0) return done(cb, null, { ok: false, message: 'Media not found.' });
      rows[i].published = !rows[i].published;
      write(KEYS.media, rows);
      done(cb, null, { ok: true, published: rows[i].published ? 'Yes' : 'No' });
    },

    deleteMedia: function (id, cb) {
      var rows = getMediaRaw();
      var i = findRow(rows, id);
      if (i < 0) return done(cb, null, { ok: false, message: 'Media not found.' });
      rows.splice(i, 1);
      write(KEYS.media, rows);
      done(cb, null, { ok: true });
    }
  };

  seed();

  window.Server = Server;
})();
