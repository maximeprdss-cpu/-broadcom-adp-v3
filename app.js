// ── STATE ─────────────────────────────────────────────────────────────────────
var S = {
  montant: null, duree: '', abv: null,
  produit: '', type_deal: '', cores: null,
  dr: null, adp: null, ad: null, cpq: null,
  adpOk: false, step: 1
};

// ── UTILS ─────────────────────────────────────────────────────────────────────
function fmt(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}
function gv(id) { var el = document.getElementById(id); return el ? (el.value || '') : ''; }
function calcABV(m, d) { if (!m || !d) return null; return m / parseInt(d); }

// ── RÈGLES MÉTIER ─────────────────────────────────────────────────────────────
function calcRules(m, d, p, t, c) {
  var abv = calcABV(m, d);
  if (!abv || !p) return null;
  var r = {};
  var adOk = abv > 100000
    ? { s: 'warn', t: 'OUI — ABV > 100 000 € : approbation Broadcom AD requise avec script' }
    : { s: 'ok', t: 'Non requise — ABV ≤ 100 000 €' };

  if (abv < 10000) {
    r.dr  = { s: 'ko', t: 'No DR — ABV < 10 000 €' };
    r.adp = { s: 'ko', t: "Aucun plan d'adoption — ABV < 10 000 €" };
    r.ad  = { s: 'info', t: 'Non requise' };
    r.cpq = { s: 'ko', t: 'Pas de CPQ — ABV insuffisant' };
    return r;
  }
  if (p === 'ENT+' || p === 'VVS') {
    r.dr  = { s: 'warn', t: 'DR invalide — ' + p + ' 12 mois max (EOL 11 Oct 2027)' };
    r.adp = { s: 'ko', t: "Aucun plan d'adoption pour " + p };
    r.ad  = adOk;
    r.cpq = { s: 'info', t: 'CPQ approuvé — EOL 11 Oct 2027' };
    return r;
  }
  if (d === '1') {
    r.dr  = { s: 'ko', t: 'No DR — ' + p + ' 1 an non éligible' + (p === 'VCF' ? ' (suggérer VVF)' : '') };
    r.adp = { s: 'ko', t: 'NON — ' + p + ' 1 an non éligible' };
    r.ad  = adOk;
    r.cpq = { s: 'ok', t: 'CPQ prêt pour partenaire' };
    return r;
  }
  if (!t || !c) {
    r.dr  = { s: 'info', t: 'Sélectionnez type de deal et cores' };
    r.adp = { s: 'info', t: 'Sélectionnez type de deal et cores' };
    r.ad  = adOk;
    r.cpq = { s: 'info', t: '—' };
    return r;
  }
  var isR = t === 'Renewal Sub2Sub';
  var isN = (t === 'NEW' || t === 'Capacity' || t === 'Migration');
  var ok = false;
  if (p === 'VVF') ok = (isR && c > 300) || (isN && c > 200);
  if (p === 'VCF') ok = (isR && c > 190) || (isN && c > 120);
  r.dr  = ok ? { s: 'ok', t: 'DR YES — éligible' } : { s: 'ko', t: 'No DR — seuil de cores non atteint' };
  r.adp = ok ? { s: 'ok', t: "OUI — Plan d'adoption requis pour validation DR" } : { s: 'ko', t: 'NON — seuil cores non atteint' };
  r.ad  = adOk;
  r.cpq = ok ? { s: 'ok', t: 'CPQ prêt pour partenaire' } : { s: 'info', t: 'CPQ disponible — DR non éligible' };
  return r;
}

// ── PROGRESS ──────────────────────────────────────────────────────────────────
function updateProgress(step) {
  for (var i = 1; i <= 6; i++) {
    var pn = document.getElementById('p' + i);
    var pl = document.getElementById('pl' + i);
    if (!pn) continue;
    pn.className = 'pnum' + (i < step ? ' done' : i === step ? ' active' : '');
    pn.textContent = i < step ? '✓' : i;
    if (pl) pl.className = 'plabel' + (i === step ? ' active' : '');
    var ln = document.getElementById('l' + i);
    if (ln) ln.className = 'pline' + (i < step ? ' done' : '');
  }
}

function setCard(i, res) {
  var rc = document.getElementById('rc' + i);
  var rv = document.getElementById('rv' + i);
  if (!rc || !rv) return;
  rc.className = 'rcard ' + (res ? res.s : 'info');
  rv.textContent = res ? res.t : '—';
}

function showStep(id, show, locked) {
  var el = document.getElementById('s' + id);
  if (!el) return;
  if (!show) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  if (locked) el.classList.add('locked');
  else el.classList.remove('locked');
}

function setAlert(containerId, type, icon, text) {
  var el = document.getElementById(containerId);
  if (!el) return;
  if (!type) { el.innerHTML = ''; return; }
  el.innerHTML = '<div class="alert ' + type + ' fade"><span class="alert-icon">' + icon + '</span><span>' + text + '</span></div>';
}

// ── STEP 1 — MONTANT & DURÉE ──────────────────────────────────────────────────
function updateStep1() {
  var m = parseFloat(document.getElementById('montant').value) || null;
  var d = document.getElementById('duree').value;
  var abv = calcABV(m, d);
  S.montant = m; S.duree = d; S.abv = abv;

  var abvEl = document.getElementById('abv-disp');
  if (abv) { abvEl.textContent = fmt(abv) + ' / an'; abvEl.className = 'abv-val'; }
  else { abvEl.textContent = '— saisissez montant et durée'; abvEl.className = 'abv-val empty'; }

  var sn1 = document.getElementById('sn1');
  var ss1 = document.getElementById('ss1');

  if (!m || !d) {
    setAlert('msg-abv', 'info', 'ℹ️', 'Saisissez le montant total et la durée du contrat.');
    showStep(2, false, true); showStep(3, false, true); showStep(4, false, true); showStep(5, false, true); showStep(6, false, true);
    sn1.className = 'snum'; ss1.textContent = '';
    updateProgress(1); return;
  }

  if (abv < 10000) {
    setAlert('msg-abv', 'stop', '🛑', 'ABV = ' + fmt(abv) + ' — Inférieur à 10 000 € : aucun DR ni plan d\'adoption possible. Processus arrêté.');
    showStep(2, false, true); showStep(3, false, true); showStep(4, false, true); showStep(5, false, true); showStep(6, false, true);
    sn1.className = 'snum warn'; ss1.textContent = 'ABV insuffisant';
    updateProgress(1); return;
  }

  setAlert('msg-abv', 'go', '✅', 'ABV = ' + fmt(abv) + ' — Suffisant. Passez à l\'étape suivante.');
  sn1.className = 'snum ok'; ss1.textContent = fmt(abv) + ' / an';
  showStep(2, true, false);
  updateProgress(2);
  updateStep2();
}

// ── STEP 2 — PRODUIT ──────────────────────────────────────────────────────────
function updateStep2() {
  var p = document.getElementById('produit').value;
  var t = document.getElementById('type_deal').value;
  var c = parseFloat(document.getElementById('cores').value) || null;
  S.produit = p; S.type_deal = t; S.cores = c;

  // Justif 5yr
  document.getElementById('justif-wrap').style.display = S.duree === '5' ? 'block' : 'none';

  // ENT+/VVS → lock durée à 1yr
  var ds = document.getElementById('duree');
  if (p === 'ENT+' || p === 'VVS') {
    if (ds.value !== '1') { ds.value = '1'; S.duree = '1'; S.abv = calcABV(S.montant, '1'); updateStep1(); return; }
    Array.from(ds.options).forEach(function(o) { o.disabled = o.value !== '' && o.value !== '1'; });
    setAlert('msg-eol', 'warn', '⚠️', p + ' — Produit en fin de vie (EOL 11 Oct 2027). Durée limitée à 1 an maximum.');
  } else {
    Array.from(ds.options).forEach(function(o) { o.disabled = false; });
    setAlert('msg-eol', null, '', '');
  }

  var sn2 = document.getElementById('sn2');
  var ss2 = document.getElementById('ss2');

  if (!p) {
    showStep(3, true, true); showStep(4, false, true); showStep(5, false, true); showStep(6, false, true);
    sn2.className = 'snum'; ss2.textContent = '';
    updateProgress(2); return;
  }

  // Pour ENT+/VVS on n'a pas besoin de type/cores pour aller à l'étape 3
  var needTypeAndCores = (p === 'VVF' || p === 'VCF') && S.duree !== '1';
  if (needTypeAndCores && (!t || !c)) {
    sn2.className = 'snum'; ss2.textContent = 'Sélectionnez type + cores';
    showStep(3, true, false); showStep(4, false, true); showStep(5, false, true); showStep(6, false, true);
    updateProgress(3); updateStep3(); return;
  }

  sn2.className = 'snum ok'; ss2.textContent = p + (t ? ' · ' + t : '') + (c ? ' · ' + c + ' cores' : '');
  showStep(3, true, false);
  updateProgress(3);
  updateStep3();
}

// ── STEP 3 — RÉSULTATS ────────────────────────────────────────────────────────
function updateStep3() {
  var r = calcRules(S.montant, S.duree, S.produit, S.type_deal, S.cores);
  S.dr = r ? r.dr : null; S.adp = r ? r.adp : null; S.ad = r ? r.ad : null; S.cpq = r ? r.cpq : null;
  S.adpOk = r && r.adp && r.adp.s === 'ok';

  if (r) { setCard(0, r.dr); setCard(1, r.adp); setCard(2, r.ad); setCard(3, r.cpq); }

  var sn3 = document.getElementById('sn3');
  var ss3 = document.getElementById('ss3');

  if (S.adpOk) {
    sn3.className = 'snum ok'; ss3.textContent = 'Plan d\'adoption requis';
    setAlert('msg-res', 'go', '📋', 'Un plan d\'adoption est requis. Complétez les étapes suivantes pour générer le document.');
    showStep(4, true, false); showStep(5, true, false); showStep(6, true, false);
    document.getElementById('s4').classList.remove('hidden');
    document.getElementById('s5').classList.remove('hidden');
    document.getElementById('s6').classList.remove('hidden');
    updateProgress(4);
    updateAutoFields();
  } else if (r && r.adp && r.adp.s === 'ko') {
    sn3.className = 'snum warn'; ss3.textContent = 'Pas d\'ADP requis';
    setAlert('msg-res', 'info', 'ℹ️', 'Aucun plan d\'adoption requis pour ce deal. Les résultats sont disponibles ci-dessus.');
    showStep(4, false, true); showStep(5, false, true); showStep(6, false, true);
    updateProgress(3);
  } else {
    sn3.className = 'snum'; ss3.textContent = '';
    setAlert('msg-res', null, '', '');
    showStep(4, false, true); showStep(5, false, true); showStep(6, false, true);
  }
}

// ── AUTO FIELDS ───────────────────────────────────────────────────────────────
function updateAutoFields() {
  var dl = S.duree === '1' ? '1 an' : S.duree === '3' ? '3 ans' : '5 ans + Special Reason';
  document.getElementById('a-prod').textContent  = S.produit;
  document.getElementById('a-dur').textContent   = dl;
  document.getElementById('a-type').textContent  = S.type_deal || '—';
  document.getElementById('a-cores').textContent = S.cores ? S.cores + ' cores' : '—';
  document.getElementById('a-abv').textContent   = S.abv ? fmt(S.abv) : '—';
  document.getElementById('a-ad').textContent    = S.abv && S.abv > 100000 ? '⚠️ OUI — Requise' : '✅ Non requise';
  // AD warning sur étape 6
  var adw = document.getElementById('ad-warning');
  if (adw) adw.style.display = S.abv && S.abv > 100000 ? 'flex' : 'none';
}

// ── EVENT LISTENERS ───────────────────────────────────────────────────────────
document.getElementById('montant').addEventListener('input', updateStep1);
document.getElementById('duree').addEventListener('change', updateStep1);
document.getElementById('produit').addEventListener('change', updateStep2);
document.getElementById('type_deal').addEventListener('change', updateStep2);
document.getElementById('cores').addEventListener('input', updateStep2);

// ── GENERATE DOCX ─────────────────────────────────────────────────────────────
function generateDoc() {
  var btn = document.getElementById('btn-gen');
  var txt = document.getElementById('btn-txt');
  var spin = document.getElementById('spin');
  btn.disabled = true;
  txt.textContent = 'Génération en cours...';
  spin.classList.add('show');

  var dl = S.duree === '1' ? '1 an' : S.duree === '3' ? '3 ans' : '5 ans + Special Reason';
  var data = {
    produit: S.produit,
    accountName: gv('acc') || 'N/A',
    erpNumber: gv('erp') || 'N/A',
    customerContact: gv('cc') || 'N/A',
    partnerName: gv('pn') || 'N/A',
    partnerContact: gv('cp') || 'N/A',
    partnerEscalation: gv('esc') || 'N/A',
    broadcomContact1: gv('bc1') || 'N/A',
    broadcomContact2: gv('bc2') || 'N/A',
    licenses: gv('lic') || 'N/A',
    duree: dl,
    cores: S.cores ? String(S.cores) : 'N/A',
    abv: S.abv ? fmt(S.abv) : 'N/A',
    adApproval: S.abv && S.abv > 100000 ? 'OUI — Requise (ABV > 100 000 €)' : 'Non requise',
    vsphere: gv('vs') || 'N/A',
    vsan: gv('vsan') || 'N/A',
    vcfops: gv('vcfo') || 'N/A',
    nsx: gv('nsx') || 'N/A',
    vcfauto: gv('vcfa') || 'N/A',
    container: gv('crt') || 'N/A',
    vdefend: gv('vdf') || 'N/A',
    cp1: gv('cp1') || 'Not started',
    cp2: gv('cp2') || 'Not started',
    cp3: gv('cp3') || 'Not started',
  };

  // Appel API Vercel
  fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(function(res) {
    if (!res.ok) throw new Error('Erreur serveur');
    return res.blob();
  })
  .then(function(blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (S.produit || 'ADP') + '_Adoption_Plan_' + (data.accountName || 'Document').replace(/[^a-zA-Z0-9]/g, '_') + '.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    btn.disabled = false;
    txt.textContent = '✅ Téléchargé ! Générer un autre';
    spin.classList.remove('show');
  })
  .catch(function(err) {
    console.error(err);
    btn.disabled = false;
    txt.textContent = '⚡ Générer le document Word (.docx)';
    spin.classList.remove('show');
    alert('Erreur lors de la génération. Vérifiez votre connexion.');
  });
}

// Init
updateStep1();
