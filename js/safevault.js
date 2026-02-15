// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - SafeVault Module v1.1
// i18n: data-translate keys → safevault.*
// February 15, 2026
// ═══════════════════════════════════════════════════════════════════

const safevaultModule = {
  state: { userAddress: null, configured: false, config: null, security: null, stats: null, loading: false },

  MODE_NAMES: {
    0: { key: 'disabled', icon: '⚪' },
    1: { key: 'modeFull', icon: '🔒' },
    2: { key: 'modeSplit', icon: '📊' },
    3: { key: 'modeThreshold', icon: '📏' }
  },

  async init() {
    console.log('🔒 SafeVault module init');
    this.render();
    this.bindEvents();
    if (app?.state?.userAddress) { this.state.userAddress = app.state.userAddress; await this.loadData(); }
  },

  async loadData() {
    try {
      const sv = await app?.getContract?.('SafeVaultGW');
      if (!sv || !this.state.userAddress) return;
      try {
        const cfg = await sv.getUserConfig(this.state.userAddress);
        this.state.config = { mode: parseInt((cfg.mode ?? cfg[0]).toString()), coldWallet: cfg.coldWallet || cfg[1], splitPercentBP: parseInt((cfg.splitPercentBP ?? cfg[2]).toString()), thresholdAmount: cfg.thresholdAmount || cfg[3], hotBalance: cfg.hotBalance || cfg[4], configured: cfg.configured ?? cfg[5] };
        this.state.configured = this.state.config.configured;
      } catch (e) {
        try {
          const c = await sv.configs(this.state.userAddress);
          this.state.config = { mode: parseInt((c.mode ?? c[0]).toString()), coldWallet: c.coldWallet || c[1], splitPercentBP: parseInt((c.splitPercentBP ?? c[2]).toString()), thresholdAmount: c.thresholdAmount || c[3], hotBalance: c.hotBalance || c[4], configured: c.configured ?? c[5] };
          this.state.configured = this.state.config.configured;
        } catch (e2) { this.state.configured = false; }
      }
      try {
        const sec = await sv.getSecurityStatus(this.state.userAddress);
        this.state.security = { hasPin: sec.hasPin ?? sec[0], hasGuardian: sec.hasGuardian ?? sec[1], guardian: sec.guardian || sec[2], locked: sec.locked ?? sec[3], failedAttempts: parseInt((sec.failedAttempts ?? sec[4]).toString()), lockUntil: parseInt((sec.lockUntil ?? sec[5]).toString()), pendingDisable: parseInt((sec.disableRequestTime ?? sec[6]).toString()) > 0, pendingColdChange: parseInt((sec.coldChangeTime ?? sec[7]).toString()) > 0, pendingColdWallet: sec.pendingColdWallet || sec[8] };
      } catch (e) { this.state.security = null; }
      try {
        const stats = await sv.getUserStats(this.state.userAddress);
        this.state.stats = { totalReceivedBNB: this.fmt(stats.totalReceivedBNB || stats[0]), totalToColdBNB: this.fmt(stats.totalToColdBNB || stats[1]), totalToHotBNB: this.fmt(stats.totalToHotBNB || stats[2]) };
      } catch (e) {
        try {
          const r = await sv.totalReceivedBNB(this.state.userAddress); const c = await sv.totalToColdBNB(this.state.userAddress); const h = await sv.totalToHotBNB(this.state.userAddress);
          this.state.stats = { totalReceivedBNB: this.fmt(r), totalToColdBNB: this.fmt(c), totalToHotBNB: this.fmt(h) };
        } catch (e2) { this.state.stats = { totalReceivedBNB: '0', totalToColdBNB: '0', totalToHotBNB: '0' }; }
      }
      this.updateUI();
    } catch (err) { console.error('❌ SafeVault loadData error:', err); }
  },

  async generateProof(pin) {
    const ethers = window.ethers;
    const pinHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(pin));
    const sv = await app?.getContract?.('SafeVaultGW');
    const nonce = await sv.getNonce(this.state.userAddress);
    return { proof: ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32', 'uint256'], [pinHash, nonce])), pinHash };
  },

  async doInitialSetup() {
    if (!this.state.userAddress) return;
    const pin = document.getElementById('svSetupPin')?.value?.trim();
    const pinConfirm = document.getElementById('svSetupPinConfirm')?.value?.trim();
    const coldWallet = document.getElementById('svSetupCold')?.value?.trim();
    const mode = parseInt(document.getElementById('svSetupMode')?.value || '1');
    const param = document.getElementById('svSetupParam')?.value?.trim();
    if (!pin || pin.length < 4) { app?.showNotification?.('PIN: min 4', 'error'); return; }
    if (pin !== pinConfirm) { app?.showNotification?.('PIN mismatch', 'error'); return; }
    if (!coldWallet || !coldWallet.startsWith('0x') || coldWallet.length !== 42) { app?.showNotification?.('Invalid address', 'error'); return; }
    if (coldWallet.toLowerCase() === this.state.userAddress.toLowerCase()) { app?.showNotification?.('Cold ≠ Hot', 'error'); return; }
    let splitOrThreshold = 0;
    if (mode === 2) { const pct = parseInt(param); if (!pct || pct < 1 || pct > 99) { app?.showNotification?.('1-99%', 'error'); return; } splitOrThreshold = pct * 100; }
    else if (mode === 3) { const thresh = parseFloat(param); if (!thresh || thresh <= 0) return; splitOrThreshold = window.ethers.utils.parseEther(thresh.toString()); }
    this.setLoading(true);
    try {
      const pinHash = window.ethers.utils.keccak256(window.ethers.utils.toUtf8Bytes(pin));
      const sv = await app?.getSignedContract?.('SafeVaultGW');
      const tx = await sv.initialSetup(pinHash, coldWallet, mode, splitOrThreshold, { gasLimit: 500000 });
      await tx.wait();
      app?.showNotification?.('✅ SafeVault OK!', 'success');
      document.getElementById('svSetupPin').value = '';
      document.getElementById('svSetupPinConfirm').value = '';
      await this.loadData();
    } catch (err) { app?.showNotification?.('❌ ' + this.parseError(err), 'error'); }
    finally { this.setLoading(false); }
  },

  async doChangeMode() {
    const pin = await this.askPin(); if (!pin) return;
    const mode = parseInt(document.getElementById('svChangeMode')?.value || '1');
    const param = document.getElementById('svChangeModeParam')?.value?.trim();
    let splitOrThreshold = 0;
    if (mode === 2) { const pct = parseInt(param); if (!pct || pct < 1 || pct > 99) return; splitOrThreshold = pct * 100; }
    else if (mode === 3) { const thresh = parseFloat(param); if (!thresh || thresh <= 0) return; splitOrThreshold = window.ethers.utils.parseEther(thresh.toString()); }
    this.setLoading(true);
    try { const { proof } = await this.generateProof(pin); const sv = await app?.getSignedContract?.('SafeVaultGW'); const tx = await sv.changeMode(proof, mode, splitOrThreshold, { gasLimit: 300000 }); await tx.wait(); app?.showNotification?.('✅', 'success'); await this.loadData(); }
    catch (err) { app?.showNotification?.('❌ ' + this.parseError(err), 'error'); }
    finally { this.setLoading(false); }
  },

  async doRequestColdChange() {
    const pin = await this.askPin(); if (!pin) return;
    const newCold = document.getElementById('svNewColdWallet')?.value?.trim();
    if (!newCold || !newCold.startsWith('0x') || newCold.length !== 42) return;
    this.setLoading(true);
    try { const { proof } = await this.generateProof(pin); const sv = await app?.getSignedContract?.('SafeVaultGW'); const tx = await sv.requestColdWalletChange(proof, newCold, { gasLimit: 300000 }); await tx.wait(); app?.showNotification?.('✅ 48h...', 'success'); await this.loadData(); }
    catch (err) { app?.showNotification?.('❌ ' + this.parseError(err), 'error'); } finally { this.setLoading(false); }
  },
  async doConfirmColdChange() {
    const pin = await this.askPin(); if (!pin) return;
    this.setLoading(true);
    try { const { proof } = await this.generateProof(pin); const sv = await app?.getSignedContract?.('SafeVaultGW'); const tx = await sv.confirmColdWalletChange(proof, { gasLimit: 300000 }); await tx.wait(); app?.showNotification?.('✅', 'success'); await this.loadData(); }
    catch (err) { app?.showNotification?.('❌ ' + this.parseError(err), 'error'); } finally { this.setLoading(false); }
  },
  async doCancelColdChange() {
    const pin = await this.askPin(); if (!pin) return;
    this.setLoading(true);
    try { const { proof } = await this.generateProof(pin); const sv = await app?.getSignedContract?.('SafeVaultGW'); const tx = await sv.cancelColdWalletChange(proof, { gasLimit: 200000 }); await tx.wait(); app?.showNotification?.('✅', 'success'); await this.loadData(); }
    catch (err) { app?.showNotification?.('❌ ' + this.parseError(err), 'error'); } finally { this.setLoading(false); }
  },
  async doRequestDisable() {
    const pin = await this.askPin(); if (!pin) return;
    this.setLoading(true);
    try { const { proof } = await this.generateProof(pin); const sv = await app?.getSignedContract?.('SafeVaultGW'); const tx = await sv.requestDisable(proof, { gasLimit: 300000 }); await tx.wait(); app?.showNotification?.('✅ 48h...', 'success'); await this.loadData(); }
    catch (err) { app?.showNotification?.('❌ ' + this.parseError(err), 'error'); } finally { this.setLoading(false); }
  },
  async doSetGuardian() {
    const pin = await this.askPin(); if (!pin) return;
    const guardian = document.getElementById('svGuardianAddr')?.value?.trim();
    if (!guardian || guardian.length !== 42) return;
    this.setLoading(true);
    try { const { proof } = await this.generateProof(pin); const sv = await app?.getSignedContract?.('SafeVaultGW'); const tx = await sv.setGuardian(proof, guardian, { gasLimit: 300000 }); await tx.wait(); app?.showNotification?.('✅', 'success'); await this.loadData(); }
    catch (err) { app?.showNotification?.('❌ ' + this.parseError(err), 'error'); } finally { this.setLoading(false); }
  },
  async doChangePIN() {
    const pin = await this.askPin(); if (!pin) return;
    const newPin = prompt('New PIN:'); if (!newPin || newPin.length < 4) return;
    const newPin2 = prompt('Confirm:'); if (newPin !== newPin2) return;
    this.setLoading(true);
    try { const { proof } = await this.generateProof(pin); const newPinHash = window.ethers.utils.keccak256(window.ethers.utils.toUtf8Bytes(newPin)); const sv = await app?.getSignedContract?.('SafeVaultGW'); const tx = await sv.changePIN(proof, newPinHash, { gasLimit: 200000 }); await tx.wait(); app?.showNotification?.('✅ PIN OK', 'success'); }
    catch (err) { app?.showNotification?.('❌ ' + this.parseError(err), 'error'); } finally { this.setLoading(false); }
  },
  async askPin() { const pin = prompt('SafeVault PIN:'); return pin || null; },

  render() {
    const container = document.getElementById('safevault');
    if (!container) return;
    container.innerHTML = `
<div class="sv-page">
  <div class="sv-header">
    <h2 data-translate="safevault.title">🔒 SafeVault — Income Protection</h2>
    <p class="sv-subtitle" data-translate="safevault.subtitle">Auto-redirect to cold wallet with PIN protection</p>
  </div>
  <div class="sv-status-card" id="svStatusCard">
    <div class="sv-status-row"><span data-translate="safevault.status">Status</span><span id="svStatusText" data-translate="safevault.notConfigured">Not configured</span></div>
    <div class="sv-status-row"><span data-translate="safevault.mode">Mode</span><span id="svModeText">—</span></div>
    <div class="sv-status-row"><span data-translate="safevault.coldWallet">Cold wallet</span><span id="svColdAddr">—</span></div>
    <div class="sv-status-row"><span data-translate="safevault.guardian">Guardian</span><span id="svGuardianText" data-translate="safevault.guardianNotSet">Not set</span></div>
  </div>
  <div class="sv-stats" id="svStats" style="display:none;">
    <div class="sv-stat"><span class="sv-stat-label" data-translate="safevault.totalReceived">Total received</span><span class="sv-stat-val" id="svTotalReceived">0</span><span class="sv-stat-unit">BNB</span></div>
    <div class="sv-stat"><span class="sv-stat-label" data-translate="safevault.toCold">To cold</span><span class="sv-stat-val" id="svTotalCold">0</span><span class="sv-stat-unit">BNB</span></div>
    <div class="sv-stat"><span class="sv-stat-label" data-translate="safevault.toHot">To hot</span><span class="sv-stat-val" id="svTotalHot">0</span><span class="sv-stat-unit">BNB</span></div>
  </div>
  <div class="sv-pending" id="svPending" style="display:none;"><h3>⏳ Pending</h3><div id="svPendingContent"></div></div>
  <div class="sv-setup" id="svSetupSection">
    <h3 data-translate="safevault.setupTitle">⚡ Initial Setup</h3>
    <p class="sv-hint" data-translate="safevault.setupHint">Set a PIN code and choose redirect mode.</p>
    <div class="sv-form">
      <div class="sv-form-row"><label data-translate="safevault.pinLabel">PIN code (min 4 chars)</label><input type="password" id="svSetupPin" placeholder="PIN" class="sv-input" autocomplete="off"></div>
      <div class="sv-form-row"><label data-translate="safevault.pinConfirm">Confirm PIN</label><input type="password" id="svSetupPinConfirm" placeholder="PIN" class="sv-input" autocomplete="off"></div>
      <div class="sv-form-row"><label data-translate="safevault.coldLabel">Cold wallet address</label><input type="text" id="svSetupCold" placeholder="0x..." class="sv-input" autocomplete="off"></div>
      <div class="sv-form-row"><label data-translate="safevault.modeLabel">Mode</label>
        <select id="svSetupMode" class="sv-select">
          <option value="1" data-translate="safevault.modeFull">🔒 Full redirect (100%)</option>
          <option value="2" data-translate="safevault.modeSplit">📊 Percentage (X% to cold)</option>
          <option value="3" data-translate="safevault.modeThreshold">📏 Threshold (above N BNB)</option>
        </select>
      </div>
      <div class="sv-form-row" id="svSetupParamRow" style="display:none;"><label id="svSetupParamLabel" data-translate="safevault.paramPercent">Percent to cold (1-99)</label><input type="number" id="svSetupParam" placeholder="" class="sv-input" step="any"></div>
      <button class="sv-btn sv-btn-primary" id="svSetupBtn"><span>🔒</span> <span data-translate="safevault.setupBtn">Configure SafeVault</span></button>
    </div>
  </div>
  <div class="sv-manage" id="svManageSection" style="display:none;">
    <h3 data-translate="safevault.manageTitle">⚙️ Management</h3>
    <div class="sv-card"><h4 data-translate="safevault.changeMode">📊 Change mode</h4>
      <div class="sv-form-row"><select id="svChangeMode" class="sv-select"><option value="1" data-translate="safevault.modeFull">🔒 Full (100%)</option><option value="2" data-translate="safevault.modeSplit">📊 Percentage</option><option value="3" data-translate="safevault.modeThreshold">📏 Threshold</option></select></div>
      <div class="sv-form-row" id="svChangeModeParamRow" style="display:none;"><input type="number" id="svChangeModeParam" placeholder="" class="sv-input" step="any"></div>
      <button class="sv-btn" id="svChangeModeBtn" data-translate="safevault.changeMode">Change mode</button>
    </div>
    <div class="sv-card"><h4 data-translate="safevault.changeCold">🔄 Change cold wallet</h4><p class="sv-hint" data-translate="safevault.changeColdHint">48 hour delay for security</p>
      <div class="sv-form-row"><input type="text" id="svNewColdWallet" placeholder="0x..." class="sv-input"></div>
      <button class="sv-btn" id="svRequestColdBtn" data-translate="safevault.requestChange">Request change</button>
      <button class="sv-btn sv-btn-confirm" id="svConfirmColdBtn" style="display:none;" data-translate="safevault.confirmChange">✅ Confirm</button>
      <button class="sv-btn sv-btn-cancel" id="svCancelColdBtn" style="display:none;" data-translate="safevault.cancelChange">❌ Cancel</button>
    </div>
    <div class="sv-card"><h4 data-translate="safevault.guardianTitle">🛡️ Guardian</h4><p class="sv-hint" data-translate="safevault.guardianHint">Guardian can lock your account if phone is stolen</p>
      <div class="sv-form-row"><input type="text" id="svGuardianAddr" placeholder="0x..." class="sv-input"></div>
      <button class="sv-btn" id="svSetGuardianBtn" data-translate="safevault.setGuardian">Set Guardian</button>
    </div>
    <div class="sv-card"><h4 data-translate="safevault.securityTitle">🔑 Security</h4>
      <button class="sv-btn" id="svChangePinBtn" data-translate="safevault.changePin">Change PIN</button>
      <button class="sv-btn sv-btn-danger" id="svDisableBtn" data-translate="safevault.disableVault">Disable SafeVault (48h)</button>
    </div>
  </div>
  <div class="sv-locked" id="svLockedSection" style="display:none;"><h3 data-translate="safevault.lockedTitle">🚫 Account Locked</h3><p data-translate="safevault.lockedDesc">SafeVault locked by Guardian.</p></div>
  <div class="sv-loading" id="svLoading" style="display:none;"><div class="exch-loading-spinner"></div><p id="svLoadingText">...</p></div>
</div>`;
    if (window.i18n?.translatePage) window.i18n.translatePage();
  },

  bindEvents() {
    document.getElementById('svSetupBtn')?.addEventListener('click', () => this.doInitialSetup());
    document.getElementById('svChangeModeBtn')?.addEventListener('click', () => this.doChangeMode());
    document.getElementById('svRequestColdBtn')?.addEventListener('click', () => this.doRequestColdChange());
    document.getElementById('svConfirmColdBtn')?.addEventListener('click', () => this.doConfirmColdChange());
    document.getElementById('svCancelColdBtn')?.addEventListener('click', () => this.doCancelColdChange());
    document.getElementById('svSetGuardianBtn')?.addEventListener('click', () => this.doSetGuardian());
    document.getElementById('svChangePinBtn')?.addEventListener('click', () => this.doChangePIN());
    document.getElementById('svDisableBtn')?.addEventListener('click', () => this.doRequestDisable());
    document.getElementById('svSetupMode')?.addEventListener('change', () => {
      const mode = document.getElementById('svSetupMode')?.value;
      const row = document.getElementById('svSetupParamRow');
      const label = document.getElementById('svSetupParamLabel');
      const input = document.getElementById('svSetupParam');
      if (mode === '2') { if (row) row.style.display = 'block'; if (label) label.setAttribute('data-translate', 'safevault.paramPercent'); if (input) input.placeholder = '80'; }
      else if (mode === '3') { if (row) row.style.display = 'block'; if (label) label.setAttribute('data-translate', 'safevault.paramThreshold'); if (input) input.placeholder = '0.1'; }
      else { if (row) row.style.display = 'none'; }
      if (window.i18n?.translatePage) window.i18n.translatePage();
    });
    document.getElementById('svChangeMode')?.addEventListener('change', () => {
      const mode = document.getElementById('svChangeMode')?.value;
      const row = document.getElementById('svChangeModeParamRow');
      const input = document.getElementById('svChangeModeParam');
      if (mode === '2') { if (row) row.style.display = 'block'; if (input) input.placeholder = '80'; }
      else if (mode === '3') { if (row) row.style.display = 'block'; if (input) input.placeholder = '0.1 BNB'; }
      else { if (row) row.style.display = 'none'; }
    });
  },

  updateUI() {
    const cfg = this.state.config; const sec = this.state.security; const stats = this.state.stats;
    const statusText = document.getElementById('svStatusText');
    const modeText = document.getElementById('svModeText');
    const coldAddr = document.getElementById('svColdAddr');
    const guardianText = document.getElementById('svGuardianText');
    if (this.state.configured && cfg) {
      const modeInfo = this.MODE_NAMES[cfg.mode] || this.MODE_NAMES[0];
      if (statusText) { statusText.textContent = '✅ ' + this.t('safevault.active'); statusText.removeAttribute('data-translate'); statusText.style.color = '#00ff88'; }
      let modeDesc = modeInfo.icon + ' ' + this.t('safevault.' + modeInfo.key);
      if (cfg.mode === 2) modeDesc += ' (' + (cfg.splitPercentBP / 100) + '%)';
      if (cfg.mode === 3) modeDesc += ' (' + this.fmt(cfg.thresholdAmount) + ' BNB)';
      if (modeText) modeText.textContent = modeDesc;
      if (coldAddr) { const addr = cfg.coldWallet; coldAddr.textContent = addr ? (addr.slice(0, 8) + '...' + addr.slice(-6)) : '—'; }
      const setup = document.getElementById('svSetupSection');
      const manage = document.getElementById('svManageSection');
      if (setup) setup.style.display = 'none';
      if (manage) manage.style.display = 'block';
    } else {
      if (statusText) statusText.style.color = '#888';
      const setup = document.getElementById('svSetupSection');
      const manage = document.getElementById('svManageSection');
      if (setup) setup.style.display = 'block';
      if (manage) manage.style.display = 'none';
    }
    if (sec) {
      if (guardianText && sec.hasGuardian) { guardianText.textContent = '✅ ' + (sec.guardian?.slice(0, 8) + '...' + sec.guardian?.slice(-4)); guardianText.removeAttribute('data-translate'); }
      if (sec.locked) { const locked = document.getElementById('svLockedSection'); if (locked) locked.style.display = 'block'; }
      if (sec.pendingColdChange) { const c = document.getElementById('svConfirmColdBtn'); const x = document.getElementById('svCancelColdBtn'); if (c) c.style.display = 'inline-block'; if (x) x.style.display = 'inline-block'; }
    }
    if (stats) {
      const el = document.getElementById('svStats'); if (el) el.style.display = 'flex';
      const s = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = parseFloat(v).toFixed(6); };
      s('svTotalReceived', stats.totalReceivedBNB); s('svTotalCold', stats.totalToColdBNB); s('svTotalHot', stats.totalToHotBNB);
    }
  },

  setLoading(on) { const el = document.getElementById('svLoading'); if (el) el.style.display = on ? 'flex' : 'none'; },
  t(key) { if (window.i18n?.t) return window.i18n.t(key); const parts = key.split('.'); let val = (window.translations || {})[window.currentLang || 'en']; for (const p of parts) { val = val?.[p]; } return val || key; },
  fmt(val) { try { if (window.ethers?.utils?.formatEther) return window.ethers.utils.formatEther(val); return (parseInt(val.toString()) / 1e18).toString(); } catch (e) { return '0'; } },
  parseError(err) { const msg = err?.reason || err?.data?.message || err?.message || 'Error'; if (msg.includes('Invalid proof')) return 'Invalid PIN'; if (msg.includes('Account locked')) return 'Locked'; if (msg.includes('Too many')) return '24h lockout'; if (msg.includes('Delay not')) return '48h wait'; if (msg.includes('user rejected') || msg.includes('denied')) return 'Cancelled'; return msg.length > 80 ? msg.slice(0, 80) + '...' : msg; },
  async refresh() { if (app?.state?.userAddress) { this.state.userAddress = app.state.userAddress; await this.loadData(); } }
};
window.safevaultModule = safevaultModule;
