// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - SafeVault Module
// Автоматическая переадресация доходов на холодный кошелёк
// 3 режима: полная, процентная, пороговая
// PIN-защита (challenge-response), Guardian, 48ч задержки
// v1.0 - February 15, 2026
// ═══════════════════════════════════════════════════════════════════

const safevaultModule = {
  state: {
    userAddress: null,
    configured: false,
    config: null,       // { mode, coldWallet, splitPercentBP, thresholdAmount, hotBalance }
    security: null,     // { hasPin, hasGuardian, locked, failedAttempts, lockUntil, pendingCold, ... }
    stats: null,        // { totalReceived, totalToCold, totalToHot }
    loading: false
  },

  MODE_NAMES: {
    0: { name: 'Выключено', icon: '⚪', desc: 'Переадресация не настроена' },
    1: { name: 'Полная', icon: '🔒', desc: '100% доходов → холодный кошелёк' },
    2: { name: 'Процентная', icon: '📊', desc: 'X% на холодный, остальное на горячий' },
    3: { name: 'Пороговая', icon: '📏', desc: 'До порога на горячий, выше — на холодный' }
  },

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('🔒 SafeVault module init');
    this.render();
    this.bindEvents();

    if (app?.state?.userAddress) {
      this.state.userAddress = app.state.userAddress;
      await this.loadData();
    }
  },

  async loadData() {
    try {
      const sv = await app?.getContract?.('SafeVaultGW');
      if (!sv || !this.state.userAddress) return;

      // getUserConfig
      try {
        const cfg = await sv.getUserConfig(this.state.userAddress);
        this.state.config = {
          mode: parseInt((cfg.mode ?? cfg[0]).toString()),
          coldWallet: cfg.coldWallet || cfg[1],
          splitPercentBP: parseInt((cfg.splitPercentBP ?? cfg[2]).toString()),
          thresholdAmount: cfg.thresholdAmount || cfg[3],
          hotBalance: cfg.hotBalance || cfg[4],
          configured: cfg.configured ?? cfg[5]
        };
        this.state.configured = this.state.config.configured;
      } catch (e) {
        // Try fallback via configs mapping
        try {
          const c = await sv.configs(this.state.userAddress);
          this.state.config = {
            mode: parseInt((c.mode ?? c[0]).toString()),
            coldWallet: c.coldWallet || c[1],
            splitPercentBP: parseInt((c.splitPercentBP ?? c[2]).toString()),
            thresholdAmount: c.thresholdAmount || c[3],
            hotBalance: c.hotBalance || c[4],
            configured: c.configured ?? c[5]
          };
          this.state.configured = this.state.config.configured;
        } catch (e2) {
          this.state.configured = false;
        }
      }

      // getSecurityStatus
      try {
        const sec = await sv.getSecurityStatus(this.state.userAddress);
        this.state.security = {
          hasPin: sec.hasPin ?? sec[0],
          hasGuardian: sec.hasGuardian ?? sec[1],
          guardian: sec.guardian || sec[2],
          locked: sec.locked ?? sec[3],
          failedAttempts: parseInt((sec.failedAttempts ?? sec[4]).toString()),
          lockUntil: parseInt((sec.lockUntil ?? sec[5]).toString()),
          pendingDisable: parseInt((sec.disableRequestTime ?? sec[6]).toString()) > 0,
          pendingColdChange: parseInt((sec.coldChangeTime ?? sec[7]).toString()) > 0,
          pendingColdWallet: sec.pendingColdWallet || sec[8]
        };
      } catch (e) {
        this.state.security = null;
      }

      // getUserStats
      try {
        const stats = await sv.getUserStats(this.state.userAddress);
        this.state.stats = {
          totalReceivedBNB: this.fmt(stats.totalReceivedBNB || stats[0]),
          totalToColdBNB: this.fmt(stats.totalToColdBNB || stats[1]),
          totalToHotBNB: this.fmt(stats.totalToHotBNB || stats[2])
        };
      } catch (e) {
        // Fallback: individual mappings
        try {
          const r = await sv.totalReceivedBNB(this.state.userAddress);
          const c = await sv.totalToColdBNB(this.state.userAddress);
          const h = await sv.totalToHotBNB(this.state.userAddress);
          this.state.stats = {
            totalReceivedBNB: this.fmt(r),
            totalToColdBNB: this.fmt(c),
            totalToHotBNB: this.fmt(h)
          };
        } catch (e2) {
          this.state.stats = { totalReceivedBNB: '0', totalToColdBNB: '0', totalToHotBNB: '0' };
        }
      }

      this.updateUI();
    } catch (err) {
      console.error('❌ SafeVault loadData error:', err);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ГЕНЕРАЦИЯ PIN PROOF
  // ═══════════════════════════════════════════════════════════════
  async generateProof(pin) {
    const ethers = window.ethers;
    const pinHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(pin));

    const sv = await app?.getContract?.('SafeVaultGW');
    const nonce = await sv.getNonce(this.state.userAddress);

    const proof = ethers.utils.keccak256(
      ethers.utils.solidityPack(['bytes32', 'uint256'], [pinHash, nonce])
    );
    return { proof, pinHash };
  },

  // ═══════════════════════════════════════════════════════════════
  // НАЧАЛЬНАЯ НАСТРОЙКА (initialSetup)
  // ═══════════════════════════════════════════════════════════════
  async doInitialSetup() {
    if (!this.state.userAddress) { app?.showNotification?.('Подключите кошелёк', 'error'); return; }

    const pin = document.getElementById('svSetupPin')?.value?.trim();
    const pinConfirm = document.getElementById('svSetupPinConfirm')?.value?.trim();
    const coldWallet = document.getElementById('svSetupCold')?.value?.trim();
    const mode = parseInt(document.getElementById('svSetupMode')?.value || '1');
    const param = document.getElementById('svSetupParam')?.value?.trim();

    if (!pin || pin.length < 4) { app?.showNotification?.('PIN минимум 4 символа', 'error'); return; }
    if (pin !== pinConfirm) { app?.showNotification?.('PIN не совпадает', 'error'); return; }
    if (!coldWallet || !coldWallet.startsWith('0x') || coldWallet.length !== 42) {
      app?.showNotification?.('Неверный адрес холодного кошелька', 'error'); return;
    }
    if (coldWallet.toLowerCase() === this.state.userAddress.toLowerCase()) {
      app?.showNotification?.('Холодный кошелёк должен отличаться от горячего!', 'error'); return;
    }

    let splitOrThreshold = 0;
    if (mode === 2) {
      const pct = parseInt(param);
      if (!pct || pct < 1 || pct > 99) { app?.showNotification?.('Процент: от 1 до 99', 'error'); return; }
      splitOrThreshold = pct * 100; // в basis points
    } else if (mode === 3) {
      const thresh = parseFloat(param);
      if (!thresh || thresh <= 0) { app?.showNotification?.('Укажите порог в BNB', 'error'); return; }
      splitOrThreshold = window.ethers.utils.parseEther(thresh.toString());
    }

    this.setLoading(true, 'Настройка SafeVault...');
    try {
      const ethers = window.ethers;
      const pinHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(pin));

      const sv = await app?.getSignedContract?.('SafeVaultGW');
      if (!sv) throw new Error('SafeVaultGW contract not available');

      const tx = await sv.initialSetup(pinHash, coldWallet, mode, splitOrThreshold, {
        gasLimit: 500000
      });
      app?.showNotification?.('⏳ Транзакция отправлена...', 'info');
      await tx.wait();
      app?.showNotification?.('✅ SafeVault настроен! Запомните свой PIN!', 'success');

      // Clear form
      document.getElementById('svSetupPin').value = '';
      document.getElementById('svSetupPinConfirm').value = '';

      await this.loadData();
    } catch (err) {
      console.error('❌ SafeVault setup error:', err);
      app?.showNotification?.(`❌ ${this.parseError(err)}`, 'error');
    } finally {
      this.setLoading(false);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // СМЕНА РЕЖИМА (changeMode)
  // ═══════════════════════════════════════════════════════════════
  async doChangeMode() {
    const pin = await this.askPin();
    if (!pin) return;

    const mode = parseInt(document.getElementById('svChangeMode')?.value || '1');
    const param = document.getElementById('svChangeModeParam')?.value?.trim();

    let splitOrThreshold = 0;
    if (mode === 2) {
      const pct = parseInt(param);
      if (!pct || pct < 1 || pct > 99) { app?.showNotification?.('Процент: 1-99', 'error'); return; }
      splitOrThreshold = pct * 100;
    } else if (mode === 3) {
      const thresh = parseFloat(param);
      if (!thresh || thresh <= 0) { app?.showNotification?.('Укажите порог', 'error'); return; }
      splitOrThreshold = window.ethers.utils.parseEther(thresh.toString());
    }

    this.setLoading(true, 'Смена режима...');
    try {
      const { proof } = await this.generateProof(pin);
      const sv = await app?.getSignedContract?.('SafeVaultGW');
      const tx = await sv.changeMode(proof, mode, splitOrThreshold, { gasLimit: 300000 });
      await tx.wait();
      app?.showNotification?.(`✅ Режим изменён: ${this.MODE_NAMES[mode].name}`, 'success');
      await this.loadData();
    } catch (err) {
      app?.showNotification?.(`❌ ${this.parseError(err)}`, 'error');
    } finally {
      this.setLoading(false);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАПРОС СМЕНЫ ХОЛОДНОГО КОШЕЛЬКА (48ч задержка)
  // ═══════════════════════════════════════════════════════════════
  async doRequestColdChange() {
    const pin = await this.askPin();
    if (!pin) return;

    const newCold = document.getElementById('svNewColdWallet')?.value?.trim();
    if (!newCold || !newCold.startsWith('0x') || newCold.length !== 42) {
      app?.showNotification?.('Неверный адрес', 'error'); return;
    }

    this.setLoading(true, 'Запрос смены...');
    try {
      const { proof } = await this.generateProof(pin);
      const sv = await app?.getSignedContract?.('SafeVaultGW');
      const tx = await sv.requestColdWalletChange(proof, newCold, { gasLimit: 300000 });
      await tx.wait();
      app?.showNotification?.('✅ Запрос принят! Подтверждение возможно через 48 часов.', 'success');
      await this.loadData();
    } catch (err) {
      app?.showNotification?.(`❌ ${this.parseError(err)}`, 'error');
    } finally {
      this.setLoading(false);
    }
  },

  async doConfirmColdChange() {
    const pin = await this.askPin();
    if (!pin) return;
    this.setLoading(true, 'Подтверждение...');
    try {
      const { proof } = await this.generateProof(pin);
      const sv = await app?.getSignedContract?.('SafeVaultGW');
      const tx = await sv.confirmColdWalletChange(proof, { gasLimit: 300000 });
      await tx.wait();
      app?.showNotification?.('✅ Холодный кошелёк изменён!', 'success');
      await this.loadData();
    } catch (err) {
      app?.showNotification?.(`❌ ${this.parseError(err)}`, 'error');
    } finally {
      this.setLoading(false);
    }
  },

  async doCancelColdChange() {
    const pin = await this.askPin();
    if (!pin) return;
    this.setLoading(true, 'Отмена...');
    try {
      const { proof } = await this.generateProof(pin);
      const sv = await app?.getSignedContract?.('SafeVaultGW');
      const tx = await sv.cancelColdWalletChange(proof, { gasLimit: 200000 });
      await tx.wait();
      app?.showNotification?.('✅ Смена отменена', 'success');
      await this.loadData();
    } catch (err) {
      app?.showNotification?.(`❌ ${this.parseError(err)}`, 'error');
    } finally {
      this.setLoading(false);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ОТКЛЮЧЕНИЕ / GUARDIAN
  // ═══════════════════════════════════════════════════════════════
  async doRequestDisable() {
    const pin = await this.askPin();
    if (!pin) return;
    this.setLoading(true, 'Запрос отключения...');
    try {
      const { proof } = await this.generateProof(pin);
      const sv = await app?.getSignedContract?.('SafeVaultGW');
      const tx = await sv.requestDisable(proof, { gasLimit: 300000 });
      await tx.wait();
      app?.showNotification?.('✅ Запрос принят. Отключение через 48ч.', 'success');
      await this.loadData();
    } catch (err) {
      app?.showNotification?.(`❌ ${this.parseError(err)}`, 'error');
    } finally {
      this.setLoading(false);
    }
  },

  async doSetGuardian() {
    const pin = await this.askPin();
    if (!pin) return;
    const guardian = document.getElementById('svGuardianAddr')?.value?.trim();
    if (!guardian || guardian.length !== 42) { app?.showNotification?.('Неверный адрес', 'error'); return; }

    this.setLoading(true, 'Установка guardian...');
    try {
      const { proof } = await this.generateProof(pin);
      const sv = await app?.getSignedContract?.('SafeVaultGW');
      const tx = await sv.setGuardian(proof, guardian, { gasLimit: 300000 });
      await tx.wait();
      app?.showNotification?.('✅ Guardian установлен!', 'success');
      await this.loadData();
    } catch (err) {
      app?.showNotification?.(`❌ ${this.parseError(err)}`, 'error');
    } finally {
      this.setLoading(false);
    }
  },

  async doChangePIN() {
    const pin = await this.askPin();
    if (!pin) return;
    const newPin = prompt('Введите НОВЫЙ PIN:');
    if (!newPin || newPin.length < 4) { app?.showNotification?.('PIN мин. 4 символа', 'error'); return; }
    const newPin2 = prompt('Повторите НОВЫЙ PIN:');
    if (newPin !== newPin2) { app?.showNotification?.('PIN не совпадает', 'error'); return; }

    this.setLoading(true, 'Смена PIN...');
    try {
      const { proof } = await this.generateProof(pin);
      const ethers = window.ethers;
      const newPinHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(newPin));
      const sv = await app?.getSignedContract?.('SafeVaultGW');
      const tx = await sv.changePIN(proof, newPinHash, { gasLimit: 200000 });
      await tx.wait();
      app?.showNotification?.('✅ PIN изменён! Запомните новый PIN!', 'success');
    } catch (err) {
      app?.showNotification?.(`❌ ${this.parseError(err)}`, 'error');
    } finally {
      this.setLoading(false);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // PROMPT PIN
  // ═══════════════════════════════════════════════════════════════
  async askPin() {
    const pin = prompt('Введите ваш SafeVault PIN:');
    if (!pin) { app?.showNotification?.('Операция отменена', 'info'); return null; }
    return pin;
  },

  // ═══════════════════════════════════════════════════════════════
  // РЕНДЕР
  // ═══════════════════════════════════════════════════════════════
  render() {
    const container = document.getElementById('safevault');
    if (!container) return;

    container.innerHTML = `
<div class="sv-page">
  <div class="sv-header">
    <h2>🔒 SafeVault — Защита доходов</h2>
    <p class="sv-subtitle">Автоматическая переадресация на холодный кошелёк с PIN-защитой</p>
  </div>

  <!-- СТАТУС -->
  <div class="sv-status-card" id="svStatusCard">
    <div class="sv-status-row">
      <span>Статус:</span>
      <span id="svStatusText">Не настроен</span>
    </div>
    <div class="sv-status-row">
      <span>Режим:</span>
      <span id="svModeText">—</span>
    </div>
    <div class="sv-status-row">
      <span>Холодный кошелёк:</span>
      <span id="svColdAddr">—</span>
    </div>
    <div class="sv-status-row">
      <span>Guardian:</span>
      <span id="svGuardianText">Не установлен</span>
    </div>
  </div>

  <!-- СТАТИСТИКА -->
  <div class="sv-stats" id="svStats" style="display:none;">
    <div class="sv-stat"><span class="sv-stat-label">Всего получено</span><span class="sv-stat-val" id="svTotalReceived">0</span><span class="sv-stat-unit">BNB</span></div>
    <div class="sv-stat"><span class="sv-stat-label">На холодный</span><span class="sv-stat-val" id="svTotalCold">0</span><span class="sv-stat-unit">BNB</span></div>
    <div class="sv-stat"><span class="sv-stat-label">На горячий</span><span class="sv-stat-val" id="svTotalHot">0</span><span class="sv-stat-unit">BNB</span></div>
  </div>

  <!-- PENDING ACTIONS -->
  <div class="sv-pending" id="svPending" style="display:none;">
    <h3>⏳ Ожидающие действия</h3>
    <div id="svPendingContent"></div>
  </div>

  <!-- SETUP (если не настроен) -->
  <div class="sv-setup" id="svSetupSection">
    <h3>⚡ Первоначальная настройка</h3>
    <p class="sv-hint">Установите PIN-код и выберите режим переадресации. PIN используется для всех операций с настройками.</p>
    
    <div class="sv-form">
      <div class="sv-form-row">
        <label>PIN-код (мин. 4 символа):</label>
        <input type="password" id="svSetupPin" placeholder="Ваш PIN" class="sv-input" autocomplete="off">
      </div>
      <div class="sv-form-row">
        <label>Повторите PIN:</label>
        <input type="password" id="svSetupPinConfirm" placeholder="Повторите PIN" class="sv-input" autocomplete="off">
      </div>
      <div class="sv-form-row">
        <label>Адрес холодного кошелька:</label>
        <input type="text" id="svSetupCold" placeholder="0x..." class="sv-input" autocomplete="off">
      </div>
      <div class="sv-form-row">
        <label>Режим:</label>
        <select id="svSetupMode" class="sv-select">
          <option value="1">🔒 Полная переадресация (100%)</option>
          <option value="2">📊 Процентная (X% на холодный)</option>
          <option value="3">📏 Пороговая (свыше N BNB)</option>
        </select>
      </div>
      <div class="sv-form-row" id="svSetupParamRow" style="display:none;">
        <label id="svSetupParamLabel">Параметр:</label>
        <input type="number" id="svSetupParam" placeholder="" class="sv-input" step="any">
      </div>
      <button class="sv-btn sv-btn-primary" id="svSetupBtn">🔒 Настроить SafeVault</button>
    </div>
  </div>

  <!-- УПРАВЛЕНИЕ (если настроен) -->
  <div class="sv-manage" id="svManageSection" style="display:none;">
    <h3>⚙️ Управление</h3>

    <!-- Смена режима -->
    <div class="sv-card">
      <h4>📊 Сменить режим</h4>
      <div class="sv-form-row">
        <select id="svChangeMode" class="sv-select">
          <option value="1">🔒 Полная (100%)</option>
          <option value="2">📊 Процентная</option>
          <option value="3">📏 Пороговая</option>
        </select>
      </div>
      <div class="sv-form-row" id="svChangeModeParamRow" style="display:none;">
        <input type="number" id="svChangeModeParam" placeholder="" class="sv-input" step="any">
      </div>
      <button class="sv-btn" id="svChangeModeBtn">Сменить режим</button>
    </div>

    <!-- Смена холодного кошелька -->
    <div class="sv-card">
      <h4>🔄 Сменить холодный кошелёк</h4>
      <p class="sv-hint">Задержка 48 часов для безопасности</p>
      <div class="sv-form-row">
        <input type="text" id="svNewColdWallet" placeholder="0x новый адрес" class="sv-input">
      </div>
      <button class="sv-btn" id="svRequestColdBtn">Запросить смену</button>
      <button class="sv-btn sv-btn-confirm" id="svConfirmColdBtn" style="display:none;">✅ Подтвердить смену</button>
      <button class="sv-btn sv-btn-cancel" id="svCancelColdBtn" style="display:none;">❌ Отменить смену</button>
    </div>

    <!-- Guardian -->
    <div class="sv-card">
      <h4>🛡️ Guardian (доверенное лицо)</h4>
      <p class="sv-hint">Guardian может заблокировать аккаунт если ваш телефон украден</p>
      <div class="sv-form-row">
        <input type="text" id="svGuardianAddr" placeholder="0x адрес guardian" class="sv-input">
      </div>
      <button class="sv-btn" id="svSetGuardianBtn">Установить Guardian</button>
    </div>

    <!-- Безопасность -->
    <div class="sv-card">
      <h4>🔑 Безопасность</h4>
      <button class="sv-btn" id="svChangePinBtn">Сменить PIN</button>
      <button class="sv-btn sv-btn-danger" id="svDisableBtn">Отключить SafeVault (48ч)</button>
    </div>
  </div>

  <!-- LOCKED -->
  <div class="sv-locked" id="svLockedSection" style="display:none;">
    <h3>🚫 Аккаунт заблокирован</h3>
    <p>Ваш SafeVault заблокирован Guardian'ом. Все доходы продолжают поступать на холодный кошелёк. Свяжитесь с вашим Guardian для разблокировки.</p>
  </div>

  <div class="sv-loading" id="svLoading" style="display:none;">
    <div class="exch-loading-spinner"></div>
    <p id="svLoadingText">Обработка...</p>
  </div>
</div>`;
  },

  // ═══════════════════════════════════════════════════════════════
  // ПРИВЯЗКА СОБЫТИЙ
  // ═══════════════════════════════════════════════════════════════
  bindEvents() {
    document.getElementById('svSetupBtn')?.addEventListener('click', () => this.doInitialSetup());
    document.getElementById('svChangeModeBtn')?.addEventListener('click', () => this.doChangeMode());
    document.getElementById('svRequestColdBtn')?.addEventListener('click', () => this.doRequestColdChange());
    document.getElementById('svConfirmColdBtn')?.addEventListener('click', () => this.doConfirmColdChange());
    document.getElementById('svCancelColdBtn')?.addEventListener('click', () => this.doCancelColdChange());
    document.getElementById('svSetGuardianBtn')?.addEventListener('click', () => this.doSetGuardian());
    document.getElementById('svChangePinBtn')?.addEventListener('click', () => this.doChangePIN());
    document.getElementById('svDisableBtn')?.addEventListener('click', () => this.doRequestDisable());

    // Mode param visibility
    const setupModeChange = () => {
      const mode = document.getElementById('svSetupMode')?.value;
      const row = document.getElementById('svSetupParamRow');
      const label = document.getElementById('svSetupParamLabel');
      const input = document.getElementById('svSetupParam');
      if (mode === '2') {
        if (row) row.style.display = 'block';
        if (label) label.textContent = 'Процент на холодный (1-99):';
        if (input) input.placeholder = '80';
      } else if (mode === '3') {
        if (row) row.style.display = 'block';
        if (label) label.textContent = 'Порог (BNB) на горячем:';
        if (input) input.placeholder = '0.1';
      } else {
        if (row) row.style.display = 'none';
      }
    };
    document.getElementById('svSetupMode')?.addEventListener('change', setupModeChange);

    const manageModeChange = () => {
      const mode = document.getElementById('svChangeMode')?.value;
      const row = document.getElementById('svChangeModeParamRow');
      const input = document.getElementById('svChangeModeParam');
      if (mode === '2') {
        if (row) row.style.display = 'block';
        if (input) input.placeholder = 'Процент (1-99)';
      } else if (mode === '3') {
        if (row) row.style.display = 'block';
        if (input) input.placeholder = 'Порог в BNB';
      } else {
        if (row) row.style.display = 'none';
      }
    };
    document.getElementById('svChangeMode')?.addEventListener('change', manageModeChange);
  },

  // ═══════════════════════════════════════════════════════════════
  // UPDATE UI
  // ═══════════════════════════════════════════════════════════════
  updateUI() {
    const cfg = this.state.config;
    const sec = this.state.security;
    const stats = this.state.stats;

    // Status card
    const statusText = document.getElementById('svStatusText');
    const modeText = document.getElementById('svModeText');
    const coldAddr = document.getElementById('svColdAddr');
    const guardianText = document.getElementById('svGuardianText');

    if (this.state.configured && cfg) {
      const modeInfo = this.MODE_NAMES[cfg.mode] || this.MODE_NAMES[0];
      if (statusText) { statusText.textContent = '✅ Активен'; statusText.style.color = '#00ff88'; }
      
      let modeDesc = modeInfo.icon + ' ' + modeInfo.name;
      if (cfg.mode === 2) modeDesc += ` (${cfg.splitPercentBP / 100}% → холодный)`;
      if (cfg.mode === 3) modeDesc += ` (порог: ${this.fmt(cfg.thresholdAmount)} BNB)`;
      if (modeText) modeText.textContent = modeDesc;

      if (coldAddr) {
        const addr = cfg.coldWallet;
        coldAddr.textContent = addr ? (addr.slice(0, 8) + '...' + addr.slice(-6)) : '—';
      }

      // Show manage, hide setup
      const setup = document.getElementById('svSetupSection');
      const manage = document.getElementById('svManageSection');
      if (setup) setup.style.display = 'none';
      if (manage) manage.style.display = 'block';

    } else {
      if (statusText) { statusText.textContent = '⚪ Не настроен'; statusText.style.color = '#888'; }
      if (modeText) modeText.textContent = '—';
      if (coldAddr) coldAddr.textContent = '—';

      const setup = document.getElementById('svSetupSection');
      const manage = document.getElementById('svManageSection');
      if (setup) setup.style.display = 'block';
      if (manage) manage.style.display = 'none';
    }

    // Security
    if (sec) {
      if (guardianText) {
        guardianText.textContent = sec.hasGuardian
          ? '✅ ' + (sec.guardian?.slice(0, 8) + '...' + sec.guardian?.slice(-4))
          : 'Не установлен';
      }

      // Locked
      const locked = document.getElementById('svLockedSection');
      if (sec.locked && locked) locked.style.display = 'block';

      // Pending cold change
      if (sec.pendingColdChange) {
        const confirm = document.getElementById('svConfirmColdBtn');
        const cancel = document.getElementById('svCancelColdBtn');
        if (confirm) confirm.style.display = 'inline-block';
        if (cancel) cancel.style.display = 'inline-block';
      }
    }

    // Stats
    if (stats) {
      const statsEl = document.getElementById('svStats');
      if (statsEl) statsEl.style.display = 'flex';
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = parseFloat(val).toFixed(6); };
      set('svTotalReceived', stats.totalReceivedBNB);
      set('svTotalCold', stats.totalToColdBNB);
      set('svTotalHot', stats.totalToHotBNB);
    }
  },

  setLoading(on, text) {
    this.state.loading = on;
    const el = document.getElementById('svLoading');
    const t = document.getElementById('svLoadingText');
    if (el) el.style.display = on ? 'flex' : 'none';
    if (t) t.textContent = text || 'Обработка...';
  },

  fmt(val) {
    try {
      if (window.ethers?.utils?.formatEther) return window.ethers.utils.formatEther(val);
      return (parseInt(val.toString()) / 1e18).toString();
    } catch (e) { return '0'; }
  },

  parseError(err) {
    const msg = err?.reason || err?.data?.message || err?.message || 'Ошибка';
    if (msg.includes('Invalid proof')) return 'Неверный PIN';
    if (msg.includes('Account locked')) return 'Аккаунт заблокирован';
    if (msg.includes('Too many attempts')) return 'Слишком много попыток. Блокировка 24ч.';
    if (msg.includes('Delay not passed')) return 'Ещё не прошло 48 часов';
    if (msg.includes('Already configured')) return 'SafeVault уже настроен';
    if (msg.includes('Not configured')) return 'SafeVault не настроен';
    if (msg.includes('user rejected') || msg.includes('denied')) return 'Отменено';
    return msg.length > 80 ? msg.slice(0, 80) + '...' : msg;
  },

  async refresh() {
    if (app?.state?.userAddress) {
      this.state.userAddress = app.state.userAddress;
      await this.loadData();
    }
  }
};

window.safevaultModule = safevaultModule;
