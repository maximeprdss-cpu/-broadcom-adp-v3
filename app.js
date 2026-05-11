// ── STATE ─────────────────────────────────────────────────────────────────────
var S = {
  montant: null, duree: '', abv: null,
  produit: '', type_deal: '', cores: null,
  adpOk: false
};

// ── FORMAT ────────────────────────────────────────────────────────────────────
function fmt(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}
function gv(id) { var el = document.getElementById(id); return el ? (el.value || 'N/A') : 'N/A'; }
function gdv(id) { var el = document.getElementById(id + '-lbl'); return el ? el.textContent : (gv(id) !== 'N/A' ? gv(id) : 'N/A'); }
function calcABV(m, d) { if (!m || !d) return null; return m / parseInt(d); }

// ── RULES ─────────────────────────────────────────────────────────────────────
function rules(m, d, p, t, c) {
  var abv = calcABV(m, d);
  if (!abv || !p) return null;
  var r = {};
  var adR = abv > 100000
    ? { s: 'warn', t: 'OUI — ABV > 100 000 € : approbation requise' }
    : { s: 'ok',   t: 'Non requise — ABV ≤ 100 000 €' };

  if (abv < 10000) {
    r.dr  = { s: 'ko', t: 'No DR — ABV < 10 000 €' };
    r.adp = { s: 'ko', t: "Aucun plan d'adoption — ABV < 10 000 €" };
    r.ad  = { s: 'ok', t: 'Non requise' };
    r.cpq = { s: 'ko', t: 'Pas de CPQ — ABV insuffisant' };
    return r;
  }
  if (p === 'ENT+' || p === 'VVS') {
    r.dr  = { s: 'warn', t: 'DR invalide — ' + p + ' 12 mois max (EOL 11 Oct 2027)' };
    r.adp = { s: 'ko',   t: "Aucun plan d'adoption pour " + p };
    r.ad  = adR;
    r.cpq = { s: 'info', t: 'CPQ approuvé — EOL 11 Oct 2027' };
    return r;
  }
  if (d === '1') {
    r.dr  = { s: 'ko', t: 'No DR — ' + p + ' 1 an non éligible' + (p === 'VCF' ? ' (suggérer VVF)' : '') };
    r.adp = { s: 'ko', t: 'NON — ' + p + ' 1 an non éligible' };
    r.ad  = adR;
    r.cpq = { s: 'ok', t: 'CPQ prêt pour partenaire' };
    return r;
  }
  if (!t || !c) {
    r.dr  = { s: 'info', t: 'Sélectionnez type + cores' };
    r.adp = { s: 'info', t: 'Sélectionnez type + cores' };
    r.ad  = adR;
    r.cpq = { s: 'info', t: '—' };
    return r;
  }
  var isR = (t === 'Renewal Sub2Sub');
  var isN = (t === 'NEW' || t === 'Capacity' || t === 'Migration');
  var ok = false;
  if (p === 'VVF') ok = (isR && c > 300) || (isN && c > 200);
  if (p === 'VCF') ok = (isR && c > 190) || (isN && c > 120);
  r.dr  = ok ? { s: 'ok', t: 'DR YES — éligible' } : { s: 'ko', t: 'No DR — seuil de cores non atteint' };
  r.adp = ok ? { s: 'ok', t: "OUI — Plan d'adoption requis pour validation DR" } : { s: 'ko', t: 'NON — seuil cores non atteint' };
  r.ad  = adR;
  r.cpq = ok ? { s: 'ok', t: 'CPQ prêt pour partenaire' } : { s: 'info', t: 'CPQ disponible — DR non éligible' };
  return r;
}

// ── UI HELPERS ────────────────────────────────────────────────────────────────
function setRC(i, res) {
  var rc = document.getElementById('rc' + i);
  var rv = document.getElementById('rv' + i);
  if (!rc || !rv) return;
  rc.className = 'rcard ' + (res ? res.s : '');
  rv.textContent = res ? res.t : '—';
}

function setAlert(id, type, icon, text) {
  var el = document.getElementById(id);
  if (!el) return;
  if (!type) { el.innerHTML = ''; return; }
  el.innerHTML = '<div class="alert ' + type + '"><span class="alert-icon">' + icon + '</span><span>' + text + '</span></div>';
}

function showCard(id, show, locked) {
  var el = document.getElementById('s' + id);
  if (!el) return;
  if (!show) { el.classList.add('hidden'); el.classList.add('locked'); return; }
  el.classList.remove('hidden');
  if (locked) el.classList.add('locked');
  else el.classList.remove('locked');
}

// ── SIDEBAR UPDATE ────────────────────────────────────────────────────────────
function setChk(id, ok) {
  var el = document.getElementById(id);
  if (!el) return;
  if (ok) { el.classList.add('ok'); el.textContent = '✓'; }
  else { el.classList.remove('ok'); el.textContent = ''; }
}

function setSBStep(step, state) {
  var num = document.getElementById('sb-n' + step);
  var lbl = document.getElementById('sb-l' + step);
  var fields = document.getElementById('sb-f' + step);
  if (!num) return;
  num.className = 'sb-step-num ' + state;
  if (lbl) lbl.className = 'sb-step-label ' + state;
  if (fields) {
    if (state === 'active' || state === 'done') fields.classList.add('show');
    else fields.classList.remove('show');
  }
  if (state === 'done') num.textContent = '✓';
  else num.textContent = step;
}

function updateSidebar() {
  var m = S.montant;
  var d = S.duree;
  var p = S.produit;
  var t = S.type_deal;
  var c = S.cores;
  var abv = S.abv;

  // Chks étape 1
  var mOk = m && m > 0;
  var dOk = d !== '';
  setChk('chk-montant', mOk);
  setChk('chk-duree', dOk);

  // Chks étape 2
  var pOk = p !== '';
  var tOk = t !== '';
  var cOk = c && c > 0;
  setChk('chk-prod', pOk);
  setChk('chk-type', tOk);
  setChk('chk-cores', cOk);

  // Nav états sidebar
  if (!mOk && !dOk) {
    setSBStep(1, 'active');
    setSBStep(2, '');
    setSBStep(3, '');
  } else if (mOk && dOk) {
    if (!pOk) {
      setSBStep(1, 'done');
      setSBStep(2, 'active');
      setSBStep(3, '');
    } else if (pOk && (!tOk || !cOk) && p !== 'ENT+' && p !== 'VVS' && d !== '1') {
      setSBStep(1, 'done');
      setSBStep(2, 'active');
      setSBStep(3, '');
    } else {
      setSBStep(1, 'done');
      setSBStep(2, 'done');
      setSBStep(3, 'active');
    }
  } else {
    setSBStep(1, 'active');
    setSBStep(2, '');
    setSBStep(3, '');
  }

  // Résultats sidebar
  var r = rules(m, d, p, t, c);
  if (r) {
    var sbr = [
      { id: 'sbr0', label: 'DR', res: r.dr },
      { id: 'sbr1', label: 'Plan', res: r.adp },
      { id: 'sbr2', label: 'AD', res: r.ad },
      { id: 'sbr3', label: 'CPQ', res: r.cpq }
    ];
    sbr.forEach(function(item) {
      var el = document.getElementById(item.id);
      if (!el) return;
      el.className = 'sb-result ' + (item.res ? item.res.s : '');
      var short = item.res ? item.res.t.split(' — ')[0] : '—';
      el.textContent = item.label + ' : ' + short;
    });
  }

  // Résumé deal
  var dl = d === '1' ? '1 an' : d === '3' ? '3 ans' : d === '5' ? '5 ans' : '—';
  document.getElementById('ds-prod').textContent  = p || '—';
  document.getElementById('ds-dur').textContent   = dl;
  document.getElementById('ds-type').textContent  = t || '—';
  document.getElementById('ds-cores').textContent = c ? c + ' cores' : '—';
  document.getElementById('ds-abv').textContent   = abv ? fmt(abv) : '—';
}

// ── STEP 1 ────────────────────────────────────────────────────────────────────
function step1() {
  var m = parseFloat(document.getElementById('montant').value) || null;
  var d = document.getElementById('duree').value;
  var abv = calcABV(m, d);
  S.montant = m; S.duree = d; S.abv = abv;

  var abvEl = document.getElementById('abv-disp');
  if (abv) { abvEl.textContent = fmt(abv) + ' / an'; abvEl.className = 'abv-val'; }
  else { abvEl.textContent = '— saisissez montant et durée'; abvEl.className = 'abv-val empty'; }

  if (!m || !d) {
    setAlert('msg-abv', 'info', 'ℹ', 'Saisissez le montant total et la durée du contrat.');
    document.getElementById('s1').className = 'step-card fade';
    document.getElementById('sn1').className = 'snum';
    showCard(2, false, true); showCard(3, false, true);
    showCard(4, false, true); showCard(5, false, true); showCard(6, false, true);
    updateSidebar(); return;
  }

  if (abv < 10000) {
    setAlert('msg-abv', 'stop', '🛑', 'ABV = ' + fmt(abv) + ' — Inférieur à 10 000 € : aucun DR ni plan d\'adoption possible. Processus arrêté.');
    document.getElementById('sn1').className = 'snum warn';
    document.getElementById('ss1').textContent = 'ABV insuffisant';
    showCard(2, false, true); showCard(3, false, true);
    showCard(4, false, true); showCard(5, false, true); showCard(6, false, true);
    updateSidebar(); return;
  }

  setAlert('msg-abv', 'go', '✅', 'ABV = ' + fmt(abv) + ' — Suffisant. Passez à l\'étape suivante.');
  document.getElementById('s1').className = 'step-card fade';
  document.getElementById('sn1').className = 'snum ok';
  document.getElementById('ss1').textContent = fmt(abv) + ' / an';
  showCard(2, true, false);
  document.getElementById('s2').className = 'step-card fade';
  document.getElementById('ss2').textContent = 'Étape en cours';
  updateSidebar();
  step2();
}

// ── STEP 2 ────────────────────────────────────────────────────────────────────
function step2() {
  var p = document.getElementById('produit').value;
  var t = document.getElementById('type_deal').value;
  var c = parseFloat(document.getElementById('cores').value) || null;
  S.produit = p; S.type_deal = t; S.cores = c;

  document.getElementById('justif-wrap').style.display = S.duree === '5' ? 'block' : 'none';

  if (p === 'ENT+' || p === 'VVS') {
    var ds = document.getElementById('duree');
    if (S.duree !== '1') {
      ds.value = '1'; S.duree = '1'; S.abv = calcABV(S.montant, '1');
      step1(); return;
    }
    Array.from(ds.options).forEach(function(o) { o.disabled = o.value !== '' && o.value !== '1'; });
    setAlert('msg-eol', 'warn', '⚠️', p + ' — Produit en fin de vie (EOL 11 Oct 2027). Durée limitée à 1 an maximum.');
  } else {
    Array.from(document.getElementById('duree').options).forEach(function(o) { o.disabled = false; });
    setAlert('msg-eol', null, '', '');
  }

  if (!p) {
    showCard(3, false, true);
    showCard(4, false, true); showCard(5, false, true); showCard(6, false, true);
    updateSidebar(); return;
  }

  showCard(3, true, false);
  document.getElementById('s3').className = 'step-card fade';
  document.getElementById('ss3').textContent = 'Résultats en temps réel';
  document.getElementById('sn3').className = 'snum ok';

  var r = rules(S.montant, S.duree, p, t, c);
  if (r) { setRC(0, r.dr); setRC(1, r.adp); setRC(2, r.ad); setRC(3, r.cpq); }

  S.adpOk = r && r.adp && r.adp.s === 'ok';

  if (S.adpOk) {
    setAlert('msg-res', 'go', '📋', "Plan d'adoption requis — complétez les étapes 4 et 5 pour générer le document.");
    showCard(4, true, false); showCard(5, true, false); showCard(6, true, false);
    document.getElementById('s4').className = 'step-card fade';
    document.getElementById('ss4').textContent = 'À compléter';
    document.getElementById('s5').className = 'step-card fade';
    document.getElementById('ss5').textContent = 'À compléter';
    // Pré-remplir auto
    var dl = S.duree === '1' ? '1 an' : S.duree === '3' ? '3 ans' : '5 ans + Special Reason';
    document.getElementById('a-prod').textContent  = p;
    document.getElementById('a-dur').textContent   = dl;
    document.getElementById('a-type').textContent  = t || '—';
    document.getElementById('a-cores').textContent = S.cores ? S.cores + ' cores' : '—';
    document.getElementById('a-abv').textContent   = S.abv ? fmt(S.abv) : '—';
    document.getElementById('a-ad').textContent    = S.abv && S.abv > 100000 ? '⚠️ OUI — Requise' : '✅ Non requise';
    var adw = document.getElementById('ad-warning');
    if (adw) adw.style.display = S.abv && S.abv > 100000 ? 'flex' : 'none';
  } else {
    setAlert('msg-res', 'info', 'ℹ', 'Aucun plan d\'adoption requis pour ce deal. Résultats disponibles ci-dessus.');
    showCard(4, false, true); showCard(5, false, true); showCard(6, false, true);
  }

  updateSidebar();
}

// ── RESET ─────────────────────────────────────────────────────────────────────
function resetAll() {
  if (!confirm('Réinitialiser tous les champs ?')) return;
  var fields = ['montant','duree','produit','type_deal','cores','justif','acc','erp','cc','pn','cp','esc','bc1','bc2','bc3','lic','vs','vsan','nsx','vcfo','vcfa','crt','vdf','cp1','cp2','cp3','txt-csa','txt-comp','txt-init','txt-coll','txt-time','txt-comm','txt-rem'];
  fields.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  // Reset selects to first option
  ['duree','produit','type_deal','vs','vsan','nsx','vcfo','vcfa','crt','vdf'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });
  ['cp1','cp2','cp3'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });
  Array.from(document.getElementById('duree').options).forEach(function(o) { o.disabled = false; });
  S = { montant: null, duree: '', abv: null, produit: '', type_deal: '', cores: null, adpOk: false };
  step1();
}

// ── GENERATE ──────────────────────────────────────────────────────────────────
function generateDoc() {
  // Validation
  var accVal = document.getElementById('acc').value;
  if (!accVal) {
    document.getElementById('acc').classList.add('invalid');
    document.getElementById('acc').focus();
    alert('Le nom du compte client est obligatoire.');
    return;
  }
  document.getElementById('acc').classList.remove('invalid');

  var btn = document.getElementById('btn-gen');
  var txt = document.getElementById('btn-txt');
  var spin = document.getElementById('spin');
  btn.disabled = true;
  txt.textContent = 'Génération en cours...';
  spin.classList.add('show');

  var dl = S.duree === '1' ? '1 an' : S.duree === '3' ? '3 ans' : '5 ans + Special Reason';

  var data = {
    produit:           S.produit,
    accountName:       gv('acc'),
    erpNumber:         gv('erp'),
    customerContact:   gv('cc'),
    partnerName:       gv('pn'),
    partnerContact:    gv('cp'),
    partnerEscalation: gv('esc'),
    broadcomContact1:  gv('bc1'),
    broadcomContact2:  gv('bc2'),
    broadcomContact3:  gv('bc3'),
    licenses:          gv('lic'),
    duree:             dl,
    cores:             S.cores ? String(S.cores) : 'N/A',
    abv:               S.abv ? fmt(S.abv) : 'N/A',
    adApproval:        S.abv && S.abv > 100000 ? 'OUI — Requise (ABV > 100 000 €)' : 'Non requise',
    vsphere:           gv('vs'),
    vsan:              gv('vsan'),
    nsx:               gv('nsx'),
    vcfops:            gv('vcfo'),
    vcfauto:           gv('vcfa'),
    container:         gv('crt'),
    vdefend:           gv('vdf'),
    cp1:               gv('cp1'),
    cp2:               gv('cp2'),
    cp3:               gv('cp3'),
    txtCSA:            gv('txt-csa'),
    txtComp:           gv('txt-comp'),
    txtInit:           gv('txt-init'),
    txtColl:           gv('txt-coll'),
    txtTime:           gv('txt-time'),
    txtComm:           gv('txt-comm'),
    txtRem:            gv('txt-rem'),
  };

  fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(function(res) {
    if (!res.ok) throw new Error('Erreur serveur ' + res.status);
    return res.blob();
  })
  .then(function(blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = S.produit + '_Adoption_Plan_' + gv('acc').replace(/[^a-zA-Z0-9]/g, '_') + '.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    btn.disabled = false;
    txt.textContent = '✅ Téléchargé — Générer un autre document';
    spin.classList.remove('show');
  })
  .catch(function(err) {
    console.error(err);
    btn.disabled = false;
    txt.textContent = '⚡ Générer le document Word (.docx)';
    spin.classList.remove('show');
    alert('Erreur lors de la génération : ' + err.message);
  });
}

// ── EVENTS ────────────────────────────────────────────────────────────────────
document.getElementById('montant').addEventListener('input', step1);
document.getElementById('duree').addEventListener('change', step1);
document.getElementById('produit').addEventListener('change', step2);
document.getElementById('type_deal').addEventListener('change', step2);
document.getElementById('cores').addEventListener('input', step2);

// ── INIT ──────────────────────────────────────────────────────────────────────
step1();
