/**
 * SURVIV INTERIORS — Backend (Code.gs)
 * "Full Home Interior Design & Best Interior Solution Ideas"
 *
 * DEPLOYMENT:
 *  1. In Google Apps Script, create a new project and paste this file as Code.gs
 *  2. Create another file named "index.html" (the frontend) in the same project
 *  3. Run setupSheets() once from the editor (authorize permissions)
 *  4. Deploy > New deployment > Web app
 *       Execute as: Me
 *       Who has access: Anyone
 *  5. Open the web app URL. Change DEFAULT_CONFIG (especially adminPassword) before going live.
 */

const SHEETS = { LEADS: 'Leads', FEEDBACK: 'Feedback', MEDIA: 'Media' };
const MEDIA_FOLDER = 'SurvivInteriors_Media';

const LEAD_HEADERS = ['ID', 'Timestamp', 'Name', 'Phone', 'Email', 'City', 'Budget', 'Service', 'Message', 'Status', 'Source'];
const FEEDBACK_HEADERS = ['ID', 'Timestamp', 'Name', 'Email', 'Rating', 'Message', 'Approved'];
const MEDIA_HEADERS = ['ID', 'Timestamp', 'Title', 'Type', 'Category', 'URL', 'MimeType', 'Published', 'DriveFileId'];

const DEFAULT_CONFIG = {
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

/* ================= ENTRY POINT ================= */

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Surviv Interiors | Full Home Interior Design & Best Interior Solution Ideas')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Surviv Interiors')
    .addItem('Open Website', 'openWebsite')
    .addItem('Setup Sheets', 'setupSheets')
    .addToUi();
}

function openWebsite() {
  const url = ScriptApp.getService().getUrl();
  if (url) showModalLink_('Website', url);
}

function showModalLink_(title, url) {
  const ui = SpreadsheetApp.getUi();
  ui.alert(title + ' URL:\n\n' + url);
}

/* ================= CONFIG ================= */

function getConfig() {
  const stored = PropertiesService.getScriptProperties().getProperties();
  const cfg = Object.assign({}, DEFAULT_CONFIG);
  Object.keys(DEFAULT_CONFIG).forEach(k => {
    if (stored[k] !== undefined && String(stored[k]) !== '') cfg[k] = String(stored[k]);
  });
  return cfg;
}

function saveConfig(partial) {
  try {
    const cfg = getConfig();
    Object.keys(DEFAULT_CONFIG).forEach(k => {
      if (partial && partial[k] !== undefined && partial[k] !== null) cfg[k] = String(partial[k]);
    });
    PropertiesService.getScriptProperties().setProperties(cfg);
    return { ok: true, config: getConfig() };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

/* ================= SHEET SETUP ================= */

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  _ensureSheet(ss, SHEETS.LEADS, LEAD_HEADERS);
  _ensureSheet(ss, SHEETS.FEEDBACK, FEEDBACK_HEADERS);
  _ensureSheet(ss, SHEETS.MEDIA, MEDIA_HEADERS);
  return 'Sheets ready: Leads, Feedback, Media';
}

function _ensureSheet(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

/* ================= PUBLIC (WEBSITE) ================= */

function getPublicData() {
  try {
    return {
      ok: true,
      config: getConfig(),
      media: _rows(SHEETS.MEDIA).filter(r => String(r[7]) === 'Yes').map(_mediaObj),
      feedback: _rows(SHEETS.FEEDBACK).filter(r => String(r[6]) === 'Yes').map(_feedbackObj)
    };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

function submitLead(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    data = data || {};
    const name = String(data.name || '').trim();
    const phone = String(data.phone || '').trim();
    if (!name) return { ok: false, message: 'Please enter your name.' };
    if (phone.replace(/\D/g, '').length < 7) return { ok: false, message: 'Please enter a valid phone number.' };
    const id = _uid();
    _append(SHEETS.LEADS, [
      id, _nowStr(), name, phone,
      String(data.email || '').trim(),
      String(data.city || '').trim(),
      String(data.budget || '').trim(),
      String(data.service || '').trim(),
      String(data.message || '').trim(),
      'New',
      String(data.source || 'Website')
    ]);
    return { ok: true, id: id, message: 'Thank you ' + name.split(' ')[0] + '! Our design team will call you within 24 hours.' };
  } catch (e) {
    return { ok: false, message: 'Something went wrong. Please try again later.' };
  } finally {
    lock.releaseLock();
  }
}

function submitFeedback(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    data = data || {};
    const name = String(data.name || '').trim();
    if (!name) return { ok: false, message: 'Please enter your name.' };
    const rating = parseInt(data.rating, 10) || 5;
    const id = _uid();
    _append(SHEETS.FEEDBACK, [
      id, _nowStr(), name,
      String(data.email || '').trim(),
      rating,
      String(data.message || '').trim(),
      'No'
    ]);
    return { ok: true, id: id, message: 'Thank you for your valuable feedback! It will appear once approved.' };
  } catch (e) {
    return { ok: false, message: 'Something went wrong. Please try again later.' };
  } finally {
    lock.releaseLock();
  }
}

/* ================= ADMIN: AUTH & STATS ================= */

function adminLogin(password) {
  return String(password) === getConfig().adminPassword;
}

function getStats() {
  try {
    const leads = _rows(SHEETS.LEADS);
    const feedback = _rows(SHEETS.FEEDBACK);
    const media = _rows(SHEETS.MEDIA);
    const ratings = feedback.map(r => Number(r[4])).filter(n => !isNaN(n));
    const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0;
    return {
      ok: true,
      totalLeads: leads.length,
      newLeads: leads.filter(r => String(r[9]) === 'New').length,
      wonLeads: leads.filter(r => String(r[9]) === 'Won').length,
      totalFeedback: feedback.length,
      pendingFeedback: feedback.filter(r => String(r[6]) !== 'Yes').length,
      avgRating: Math.round(avg * 10) / 10,
      totalMedia: media.length,
      publishedMedia: media.filter(r => String(r[7]) === 'Yes').length
    };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

/* ================= ADMIN: LEADS ================= */

function getLeads() {
  try {
    const rows = _rows(SHEETS.LEADS).slice().reverse();
    return { ok: true, leads: rows.map(_leadObj) };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

function updateLeadStatus(id, status) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const sh = _getSheet(SHEETS.LEADS);
    const row = _findRow(sh, id);
    if (row < 0) return { ok: false, message: 'Lead not found.' };
    sh.getRange(row, 10).setValue(String(status));
    return { ok: true };
  } catch (e) {
    return { ok: false, message: String(e) };
  } finally {
    lock.releaseLock();
  }
}

function deleteLead(id) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const sh = _getSheet(SHEETS.LEADS);
    const row = _findRow(sh, id);
    if (row < 0) return { ok: false, message: 'Lead not found.' };
    sh.deleteRow(row);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: String(e) };
  } finally {
    lock.releaseLock();
  }
}

function exportLeadsCsv() {
  try {
    const rows = _rows(SHEETS.LEADS);
    const lines = [LEAD_HEADERS.join(',')];
    rows.forEach(r => {
      lines.push(r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(','));
    });
    return { ok: true, csv: lines.join('\n') };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

/* ================= ADMIN: FEEDBACK ================= */

function getFeedback() {
  try {
    const rows = _rows(SHEETS.FEEDBACK).slice().reverse();
    return { ok: true, feedback: rows.map(_feedbackObj) };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

function setFeedbackApproved(id, approved) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const sh = _getSheet(SHEETS.FEEDBACK);
    const row = _findRow(sh, id);
    if (row < 0) return { ok: false, message: 'Feedback not found.' };
    sh.getRange(row, 7).setValue(approved ? 'Yes' : 'No');
    return { ok: true };
  } catch (e) {
    return { ok: false, message: String(e) };
  } finally {
    lock.releaseLock();
  }
}

function deleteFeedback(id) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const sh = _getSheet(SHEETS.FEEDBACK);
    const row = _findRow(sh, id);
    if (row < 0) return { ok: false, message: 'Feedback not found.' };
    sh.deleteRow(row);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: String(e) };
  } finally {
    lock.releaseLock();
  }
}

/* ================= ADMIN: MEDIA (PHOTOS & VIDEOS) ================= */

function getMedia() {
  try {
    const rows = _rows(SHEETS.MEDIA).slice().reverse();
    return { ok: true, media: rows.map(_mediaObj) };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}

function uploadPhoto(base64Data, fileName, mimeType, title, category) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const bytes = Utilities.base64Decode(_stripDataUri(base64Data));
    const blob = Utilities.newBlob(bytes, mimeType || 'image/jpeg', fileName || 'photo.jpg');
    const file = _mediaFolder().createFile(blob);
    const id = _uid();
    _append(SHEETS.MEDIA, [id, _nowStr(), String(title || fileName || 'Photo'), 'photo', String(category || 'General'), file.getUrl(), mimeType || 'image/jpeg', 'No', file.getId()]);
    return { ok: true, id: id, url: file.getUrl(), driveId: file.getId() };
  } catch (e) {
    return { ok: false, message: 'Upload failed: ' + String(e) };
  } finally {
    lock.releaseLock();
  }
}

function addVideoUrl(url, title, category) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    url = String(url || '').trim();
    if (!/^https?:\/\//i.test(url)) return { ok: false, message: 'Please paste a valid video URL (YouTube, Vimeo or Drive link).' };
    const id = _uid();
    _append(SHEETS.MEDIA, [id, _nowStr(), String(title || 'Video'), 'video', String(category || 'General'), url, 'link', 'No', '']);
    return { ok: true, id: id };
  } catch (e) {
    return { ok: false, message: String(e) };
  } finally {
    lock.releaseLock();
  }
}

function toggleMediaPublished(id) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const sh = _getSheet(SHEETS.MEDIA);
    const row = _findRow(sh, id);
    if (row < 0) return { ok: false, message: 'Media not found.' };
    const cur = String(sh.getRange(row, 8).getValue());
    const next = cur === 'Yes' ? 'No' : 'Yes';
    sh.getRange(row, 8).setValue(next);
    return { ok: true, published: next };
  } catch (e) {
    return { ok: false, message: String(e) };
  } finally {
    lock.releaseLock();
  }
}

function deleteMedia(id) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const sh = _getSheet(SHEETS.MEDIA);
    const row = _findRow(sh, id);
    if (row < 0) return { ok: false, message: 'Media not found.' };
    const driveId = String(sh.getRange(row, 9).getValue() || '');
    if (driveId) {
      try { DriveApp.getFileById(driveId).setTrashed(true); } catch (ignore) {}
    }
    sh.deleteRow(row);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: String(e) };
  } finally {
    lock.releaseLock();
  }
}

/* ================= HELPERS ================= */

function _getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    const headers = name === SHEETS.LEADS ? LEAD_HEADERS : name === SHEETS.FEEDBACK ? FEEDBACK_HEADERS : MEDIA_HEADERS;
    sh = _ensureSheet(ss, name, headers);
  }
  return sh;
}

function _append(name, values) {
  _getSheet(name).appendRow(values);
}

function _rows(name) {
  const sh = _getSheet(name);
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
}

function _findRow(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function _mediaFolder() {
  const folders = DriveApp.getFoldersByName(MEDIA_FOLDER);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(MEDIA_FOLDER);
}

function _uid() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyMMddHHmmss') + Math.floor(Math.random() * 1000);
}

function _nowStr() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy hh:mm a');
}

function _stripDataUri(s) {
  const str = String(s || '');
  const i = str.indexOf(',');
  return i > -1 ? str.slice(i + 1) : str;
}

function _ytId(url) {
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? m[1] : null;
}

function _leadObj(r) {
  return {
    id: r[0], ts: r[1], name: r[2], phone: r[3], email: r[4], city: r[5],
    budget: r[6], service: r[7], message: r[8], status: r[9], source: r[10]
  };
}

function _feedbackObj(r) {
  return { id: r[0], ts: r[1], name: r[2], email: r[3], rating: Number(r[4]) || 0, message: r[5], approved: String(r[6]) === 'Yes' };
}

function _mediaObj(r) {
  const type = String(r[3] || 'photo').toLowerCase();
  const driveId = String(r[8] || '');
  let url = String(r[5] || '');
  let thumb = url;
  let embed = null;
  if (type === 'photo' && driveId) {
    thumb = 'https://drive.google.com/uc?export=view&id=' + driveId;
    url = thumb;
  } else if (type === 'video') {
    const yid = _ytId(url);
    if (yid) embed = 'https://www.youtube.com/embed/' + yid;
  }
  return {
    id: r[0], ts: r[1], title: r[2], type: type, category: r[4],
    url: url, thumb: thumb, embed: embed, mimeType: r[6],
    published: String(r[7]) === 'Yes', driveId: driveId
  };
}
