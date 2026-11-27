/**
 * @OnlyCurrentDoc
 *
 * Porra electoral 29-N — backend en Google Apps Script.
 *
 * Garda as porras nunha folla de Google Sheets e sérveas á web.
 * - Pestana "Porras": unha fila por xogador (créase soa).
 * - Pestana "Resultado": mete aquí o resultado (fila 2: PP, PSOE, VOX, BNG, FA) cando o saibas.
 *
 * Instrucións no README.md do repositorio.
 */

// Sábado 28/11/2026 ás 23:59:59, hora peninsular (UTC+1)
const DEADLINE = new Date('2026-11-28T23:59:59+01:00');
const PARTIES = ['pp', 'psoe', 'vox', 'bng', 'fa'];
const VERSION = 2;
const MAX_PORRAS = 300; // tope contra envíos masivos
const HEADERS = ['id', 'token', 'nome', 'conselleria', 'pp', 'psoe', 'vox', 'bng', 'creado', 'actualizado', 'fa'];

function setup() {
  porrasSheet_();
  resultadoSheet_();
}

function porrasSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Porras');
  if (!sh) {
    sh = ss.insertSheet('Porras');
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange('B:B').setFontColor('#aaaaaa'); // o token non é para ler
  }
  // Follas creadas antes de engadir Frente Amplio: engade a cabeceira da columna K
  if (sh.getRange(1, HEADERS.length).getValue() !== 'fa') sh.getRange(1, HEADERS.length).setValue('fa');
  return sh;
}

function resultadoSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Resultado');
  if (!sh) {
    sh = ss.insertSheet('Resultado');
    sh.getRange('A1:E1').setValues([['PP', 'PSOE', 'VOX', 'BNG', 'FA']]).setFontWeight('bold');
    sh.getRange('A3').setValue('Mete o resultado na fila 2 (os cinco partidos). Déixaa baleira ata entón.');
  }
  if (sh.getRange('E1').getValue() !== 'FA') {
    sh.getRange('E1').setValue('FA').setFontWeight('bold');
    sh.getRange('A3').setValue('Mete o resultado na fila 2 (os cinco partidos). Déixaa baleira ata entón.');
  }
  return sh;
}

/** Texto seguro para a folla: sen caracteres de control e sen que poida interpretarse como fórmula. */
function cleanText_(v, max) {
  let s = String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function readPorras_() {
  const sh = porrasSheet_();
  const values = sh.getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (!r[0]) continue;
    const o = {};
    HEADERS.forEach((h, j) => (o[h] = r[j]));
    o.row = i + 1;
    rows.push(o);
  }
  return rows;
}

function readResultado_() {
  const v = resultadoSheet_().getRange('A2:E2').getValues()[0];
  if (v.some(x => x === '' || x === null || isNaN(Number(x)))) return null;
  const r = {};
  PARTIES.forEach((p, i) => (r[p] = Number(v[i])));
  return r;
}

function publicRow_(o) {
  return {
    id: o.id, nome: o.nome, conselleria: o.conselleria,
    pp: Number(o.pp), psoe: Number(o.psoe), vox: Number(o.vox), bng: Number(o.bng),
    fa: o.fa === '' || o.fa == null ? null : Number(o.fa),
    creado: Number(o.creado) || 0,
    actualizado: Number(o.actualizado) || Number(o.creado) || 0,
  };
}

/** GET: devolve o estado. Antes do peche só o número de porras. */
function doGet() {
  const closed = Date.now() > DEADLINE.getTime();
  const porras = readPorras_();
  return json_({
    ok: true,
    v: VERSION,
    closed: closed,
    deadline: DEADLINE.getTime(),
    count: porras.length,
    porras: closed ? porras.map(publicRow_) : [],
    resultado: readResultado_(),
  });
}

/** POST (text/plain con JSON): crea ou actualiza a porra dun xogador. */
function doPost(e) {
  if (Date.now() > DEADLINE.getTime()) return json_({ ok: false, error: 'closed' });
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad_request' }); }

  const id = String(d.id || '');
  const token = String(d.token || '');
  const nome = cleanText_(d.nome, 40);
  const conselleria = cleanText_(d.conselleria, 60);
  if (!/^[a-f0-9]{16,64}$/.test(id) || !/^[a-f0-9]{32,128}$/.test(token) || !nome || !conselleria) {
    return json_({ ok: false, error: 'bad_request' });
  }
  const vals = PARTIES.map(p => (typeof d[p] === 'number' ? d[p] : NaN));
  if (vals.some(v => !Number.isInteger(v) || v < 0 || v > 350) || vals.reduce((a, b) => a + b, 0) > 350) {
    return json_({ ok: false, error: 'bad_numbers' });
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json_({ ok: false, error: 'busy' });
  try {
    const sh = porrasSheet_();
    const porras = readPorras_();
    const existing = porras.find(o => o.id === id);
    const now = Date.now();
    if (existing) {
      if (String(existing.token) !== token) return json_({ ok: false, error: 'forbidden' });
      sh.getRange(existing.row, 3, 1, 9).setValues([[nome, conselleria, ...vals.slice(0, 4), existing.creado, now, vals[4]]]);
      return json_({ ok: true, v: VERSION, creado: Number(existing.creado), actualizado: now, updated: true });
    }
    if (porras.length >= MAX_PORRAS) return json_({ ok: false, error: 'full' });
    sh.appendRow([id, token, nome, conselleria, ...vals.slice(0, 4), now, now, vals[4]]);
    return json_({ ok: true, v: VERSION, creado: now, actualizado: now, updated: false });
  } finally {
    lock.releaseLock();
  }
}
