// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Admin Extensions v1.0
// Расширение админки: P2PEscrow + SafeVault управление
// Загружается ПОСЛЕ admin.js — патчит adminModule
// February 15, 2026
// ═══════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // Ждём загрузки adminModule
  const originalInit = adminModule.init.bind(adminModule);

  adminModule.init = async function() {
    await originalInit();
    // После основного рендера — добавляем новые секции
    if (this.access.isOwner || this.access.isGuardian) {
      this._renderExtensions();
      this._bindExtensionEvents();
      this._injectExtensionStyles();
      await this._loadExtensionData();
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER — новые секции
  // ═══════════════════════════════════════════════════════════════
  adminModule._renderExtensions = function() {
    const container = document.querySelector('.admin-container');
    if (!container) return;

    const ownerOnly = this.access.isOwner ? '' : 'admin-hidden';

    // Вставляем перед "Опасная зона"
    const dangerZone = container.querySelector('.admin-danger-zone');
    const insertBefore = dangerZone || null;

    // ═══ P2P ESCROW SECTION ═══
    const p2pSection = document.createElement('section');
    p2pSection.className = `admin-section admin-ext-section ${ownerOnly}`;
    p2pSection.innerHTML = `
      <h3 class="admin-section-title">💱 P2P Escrow</h3>
      <p class="admin-desc">Управление P2P контрактом — комиссии, токены, пауза</p>

      <!-- P2P Stats -->
      <div class="ext-stats-row">
        <div class="ext-stat"><span class="ext-stat-val" id="p2pStatOrders">—</span><span class="ext-stat-lbl">Ордеров</span></div>
        <div class="ext-stat"><span class="ext-stat-val" id="p2pStatCompleted">—</span><span class="ext-stat-lbl">Завершено</span></div>
        <div class="ext-stat"><span class="ext-stat-val" id="p2pStatVolume">—</span><span class="ext-stat-lbl">Объём BNB</span></div>
        <div class="ext-stat"><span class="ext-stat-val" id="p2pStatFee">—</span><span class="ext-stat-lbl">Комиссия</span></div>
        <div class="ext-stat"><span class="ext-stat-val" id="p2pStatExpiry">—</span><span class="ext-stat-lbl">Экспирация</span></div>
        <div class="ext-stat"><span class="ext-stat-val" id="p2pStatBalance">—</span><span class="ext-stat-lbl">Баланс BNB</span></div>
      </div>

      <!-- Комиссия -->
      <div class="ext-panel">
        <h4 class="ext-panel-title">💰 Комиссия</h4>
        <div class="ext-inline">
          <input type="number" id="p2pNewFee" class="admin-input ext-input" placeholder="50 (= 0.5%)" step="1" min="0" max="300">
          <span class="ext-hint">BP (50 = 0.5%, макс 300 = 3%)</span>
          <button class="admin-btn admin-btn-warning ext-btn" id="p2pSetFeeBtn">Установить</button>
        </div>
      </div>

      <!-- Fee wallet -->
      <div class="ext-panel">
        <h4 class="ext-panel-title">🏦 Fee wallet</h4>
        <div class="ext-inline">
          <span class="ext-addr" id="p2pFeeWallet">—</span>
        </div>
        <div class="ext-inline">
          <input type="text" id="p2pNewFeeWallet" class="admin-input ext-input" placeholder="0x... новый адрес">
          <button class="admin-btn admin-btn-warning ext-btn" id="p2pSetFeeWalletBtn">Изменить</button>
        </div>
      </div>

      <!-- Expiry -->
      <div class="ext-panel">
        <h4 class="ext-panel-title">⏱️ Время жизни ордера</h4>
        <div class="ext-inline">
          <input type="number" id="p2pNewExpiry" class="admin-input ext-input" placeholder="24" step="1" min="1" max="168">
          <span class="ext-hint">часов (мин 1ч, макс 168ч = 7 дней)</span>
          <button class="admin-btn admin-btn-warning ext-btn" id="p2pSetExpiryBtn">Установить</button>
        </div>
      </div>

      <!-- Allowed tokens -->
      <div class="ext-panel">
        <h4 class="ext-panel-title">🪙 Разрешённые токены</h4>
        <div class="ext-inline">
          <input type="text" id="p2pTokenCheck" class="admin-input ext-input" placeholder="0x... адрес токена">
          <button class="admin-btn admin-btn-secondary ext-btn" id="p2pCheckTokenBtn">Проверить</button>
          <span id="p2pTokenStatus" class="ext-status"></span>
        </div>
        <div class="ext-inline" style="margin-top:8px;">
          <input type="text" id="p2pTokenAddr" class="admin-input ext-input" placeholder="0x... адрес токена">
          <button class="admin-btn admin-btn-success ext-btn" id="p2pAddTokenBtn">➕ Добавить</button>
          <button class="admin-btn admin-btn-danger ext-btn" id="p2pRemoveTokenBtn">➖ Удалить</button>
        </div>
      </div>

      <!-- Pause -->
      <div class="ext-panel">
        <h4 class="ext-panel-title">⏸️ Пауза контракта</h4>
        <div class="ext-btn-row">
          <button class="admin-btn admin-btn-warning" id="p2pPauseBtn">⏸️ Приостановить P2P</button>
          <button class="admin-btn admin-btn-success" id="p2pUnpauseBtn">▶️ Возобновить P2P</button>
        </div>
      </div>

      <!-- Emergency -->
      <div class="ext-panel ext-danger-panel">
        <h4 class="ext-panel-title">🚨 Экстренный вывод P2P</h4>
        <div class="ext-btn-row">
          <button class="admin-btn admin-btn-danger" id="p2pEmergencyBNBBtn">🚨 Вывести BNB</button>
        </div>
        <div class="ext-inline" style="margin-top:8px;">
          <input type="text" id="p2pEmergencyTokenAddr" class="admin-input ext-input" placeholder="0x... адрес токена">
          <button class="admin-btn admin-btn-danger ext-btn" id="p2pEmergencyTokenBtn">🚨 Вывести токен</button>
        </div>
      </div>
    `;

    // ═══ SAFEVAULT SECTION ═══
    const svSection = document.createElement('section');
    svSection.className = `admin-section admin-ext-section ${ownerOnly}`;
    svSection.innerHTML = `
      <h3 class="admin-section-title">🔒 SafeVault</h3>
      <p class="admin-desc">Мониторинг SafeVault — просмотр настроек контракта</p>

      <div class="ext-stats-row">
        <div class="ext-stat"><span class="ext-stat-val" id="svStatOwner">—</span><span class="ext-stat-lbl">Owner</span></div>
        <div class="ext-stat"><span class="ext-stat-val" id="svStatBalance">—</span><span class="ext-stat-lbl">Баланс BNB</span></div>
      </div>

      <!-- Поиск пользователя SafeVault -->
      <div class="ext-panel">
        <h4 class="ext-panel-title">🔍 Проверить настройки пользователя</h4>
        <div class="ext-inline">
          <input type="text" id="svLookupAddr" class="admin-input ext-input" placeholder="0x... адрес пользователя">
          <button class="admin-btn admin-btn-primary ext-btn" id="svLookupBtn">Проверить</button>
        </div>
        <div id="svLookupResult" class="ext-result" style="display:none;"></div>
      </div>
    `;

    // Вставляем
    if (insertBefore) {
      container.insertBefore(p2pSection, insertBefore);
      container.insertBefore(svSection, insertBefore);
    } else {
      container.appendChild(p2pSection);
      container.appendChild(svSection);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // LOAD DATA
  // ═══════════════════════════════════════════════════════════════
  adminModule._loadExtensionData = async function() {
    await Promise.all([
      this._loadP2PStats(),
      this._loadSVStats()
    ]);
  };

  adminModule._loadP2PStats = async function() {
    try {
      const p2p = await app?.getContract?.('P2PEscrow');
      if (!p2p) { this._setP2PStatus('Контракт не подключён'); return; }

      const [nextId, feeBP, total, completed, volume, expiry, feeW] = await Promise.all([
        p2p.nextOrderId(), p2p.feeBP(), p2p.totalOrders(),
        p2p.totalCompleted(), p2p.totalVolumeBNB(), p2p.orderExpiry(), p2p.feeWallet()
      ]);

      const s = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
      s('p2pStatOrders', total.toString());
      s('p2pStatCompleted', completed.toString());
      s('p2pStatVolume', this._fmtEth(volume));
      s('p2pStatFee', (parseInt(feeBP.toString()) / 100) + '%');
      s('p2pStatExpiry', (parseInt(expiry.toString()) / 3600) + 'ч');
      s('p2pFeeWallet', feeW.slice(0, 8) + '...' + feeW.slice(-6));

      // Баланс контракта
      if (window.web3Manager?.provider) {
        const p2pAddr = window.CONFIG?.CONTRACTS?.P2PEscrow;
        const bal = await window.web3Manager.provider.getBalance(p2pAddr);
        s('p2pStatBalance', this._fmtEth(bal));
      }
    } catch (e) { console.warn('P2P stats error:', e); }
  };

  adminModule._loadSVStats = async function() {
    try {
      const sv = await app?.getContract?.('SafeVaultGW');
      if (!sv) return;
      const s = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
      
      try {
        const owner = await sv.owner();
        s('svStatOwner', owner.slice(0, 8) + '...' + owner.slice(-6));
      } catch(e) {}

      if (window.web3Manager?.provider) {
        const svAddr = window.CONFIG?.CONTRACTS?.SafeVaultGW;
        const bal = await window.web3Manager.provider.getBalance(svAddr);
        s('svStatBalance', this._fmtEth(bal));
      }
    } catch (e) { console.warn('SV stats error:', e); }
  };

  // ═══════════════════════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════════════════════
  adminModule._bindExtensionEvents = function() {
    const bind = (id, fn) => document.getElementById(id)?.addEventListener('click', fn.bind(this));

    // P2P — Fee
    bind('p2pSetFeeBtn', async function() {
      const val = parseInt(document.getElementById('p2pNewFee')?.value);
      if (isNaN(val) || val < 0 || val > 300) { app?.showNotification?.('Fee: 0-300 BP', 'error'); return; }
      await this._p2pTx('setFee', [val], `Комиссия → ${val/100}%`);
    });

    // P2P — Fee wallet
    bind('p2pSetFeeWalletBtn', async function() {
      const addr = document.getElementById('p2pNewFeeWallet')?.value?.trim();
      if (!addr || !addr.startsWith('0x')) { app?.showNotification?.('Введите адрес', 'error'); return; }
      await this._p2pTx('setFeeWallet', [addr], 'Fee wallet обновлён');
    });

    // P2P — Expiry
    bind('p2pSetExpiryBtn', async function() {
      const hours = parseInt(document.getElementById('p2pNewExpiry')?.value);
      if (isNaN(hours) || hours < 1 || hours > 168) { app?.showNotification?.('1-168 часов', 'error'); return; }
      await this._p2pTx('setOrderExpiry', [hours * 3600], `Экспирация → ${hours}ч`);
    });

    // P2P — Check token
    bind('p2pCheckTokenBtn', async function() {
      const addr = document.getElementById('p2pTokenCheck')?.value?.trim();
      if (!addr) return;
      try {
        const p2p = await app?.getContract?.('P2PEscrow');
        const allowed = await p2p.allowedTokens(addr);
        const el = document.getElementById('p2pTokenStatus');
        if (el) {
          el.textContent = allowed ? '✅ Разрешён' : '❌ Не разрешён';
          el.className = 'ext-status ' + (allowed ? 'ext-status-ok' : 'ext-status-bad');
        }
      } catch (e) { app?.showNotification?.('Ошибка: ' + e.message, 'error'); }
    });

    // P2P — Add token
    bind('p2pAddTokenBtn', async function() {
      const addr = document.getElementById('p2pTokenAddr')?.value?.trim();
      if (!addr || !addr.startsWith('0x')) return;
      await this._p2pTx('addAllowedToken', [addr], 'Токен добавлен');
    });

    // P2P — Remove token
    bind('p2pRemoveTokenBtn', async function() {
      const addr = document.getElementById('p2pTokenAddr')?.value?.trim();
      if (!addr || !addr.startsWith('0x')) return;
      if (!(await app.confirmAction('Удалить токен из разрешённых?'))) return;
      await this._p2pTx('removeAllowedToken', [addr], 'Токен удалён');
    });

    // P2P — Pause/Unpause
    bind('p2pPauseBtn', async function() {
      if (!(await app.confirmAction('Приостановить P2P контракт?'))) return;
      await this._p2pTx('pause', [], '⏸️ P2P приостановлен');
    });
    bind('p2pUnpauseBtn', async function() {
      await this._p2pTx('unpause', [], '▶️ P2P возобновлён');
    });

    // P2P — Emergency
    bind('p2pEmergencyBNBBtn', async function() {
      if (!(await app.confirmAction('⚠️ ЭКСТРЕННЫЙ ВЫВОД всех BNB из P2P?'))) return;
      await this._p2pTx('emergencyWithdraw', [], '🚨 BNB выведены');
    });
    bind('p2pEmergencyTokenBtn', async function() {
      const addr = document.getElementById('p2pEmergencyTokenAddr')?.value?.trim();
      if (!addr) return;
      if (!(await app.confirmAction('⚠️ ЭКСТРЕННЫЙ ВЫВОД токена из P2P?'))) return;
      await this._p2pTx('emergencyWithdrawToken', [addr], '🚨 Токен выведен');
    });

    // SafeVault — Lookup
    bind('svLookupBtn', async function() {
      const addr = document.getElementById('svLookupAddr')?.value?.trim();
      if (!addr) return;
      const el = document.getElementById('svLookupResult');
      if (!el) return;
      try {
        const sv = await app?.getContract?.('SafeVaultGW');
        if (!sv) { el.innerHTML = '<p>Контракт не подключён</p>'; el.style.display = 'block'; return; }

        // Пытаемся получить данные пользователя
        let html = `<div class="ext-lookup-card"><strong>${addr.slice(0,8)}...${addr.slice(-6)}</strong>`;
        try {
          const config = await sv.getVaultConfig(addr);
          html += `<div class="ext-lookup-row"><span>Mode:</span><span>${['Off', 'Full', 'Split', 'Threshold'][config.mode] || config.mode}</span></div>`;
          html += `<div class="ext-lookup-row"><span>Active:</span><span>${config.isActive ? '✅' : '❌'}</span></div>`;
          html += `<div class="ext-lookup-row"><span>Cold wallet:</span><span>${config.coldWallet ? config.coldWallet.slice(0,8) + '...' : 'N/A'}</span></div>`;
        } catch (e) {
          html += '<p style="color:#888;">Не удалось получить данные (возможно нет настроек)</p>';
        }
        html += '</div>';
        el.innerHTML = html;
        el.style.display = 'block';
      } catch (e) {
        el.innerHTML = `<p style="color:#ff4444;">Ошибка: ${e.message}</p>`;
        el.style.display = 'block';
      }
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // P2P TRANSACTION HELPER
  // ═══════════════════════════════════════════════════════════════
  adminModule._p2pTx = async function(method, args, successMsg) {
    try {
      const p2p = await app?.getSignedContract?.('P2PEscrow');
      if (!p2p) { app?.showNotification?.('P2P контракт не подключён', 'error'); return; }
      app?.showNotification?.('Подтвердите транзакцию...', 'info');
      const tx = await p2p[method](...args, { gasLimit: 200000 });
      await tx.wait();
      app?.showNotification?.('✅ ' + successMsg, 'success');
      await this._loadP2PStats();
    } catch (e) {
      const msg = e?.reason || e?.data?.message || e?.message || 'Error';
      app?.showNotification?.('❌ ' + (msg.length > 80 ? msg.slice(0, 80) : msg), 'error');
    }
  };

  adminModule._fmtEth = function(val) {
    try {
      if (window.ethers?.utils?.formatEther) return parseFloat(window.ethers.utils.formatEther(val)).toFixed(6);
      return (parseInt(val.toString()) / 1e18).toFixed(6);
    } catch (e) { return '0'; }
  };

  adminModule._setP2PStatus = function(text) {
    ['p2pStatOrders', 'p2pStatCompleted', 'p2pStatVolume', 'p2pStatFee', 'p2pStatExpiry', 'p2pStatBalance'].forEach(id => {
      const el = document.getElementById(id); if (el) el.textContent = '—';
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // STYLES
  // ═══════════════════════════════════════════════════════════════
  adminModule._injectExtensionStyles = function() {
    if (document.getElementById('admin-ext-styles')) return;
    const s = document.createElement('style');
    s.id = 'admin-ext-styles';
    s.textContent = `
      /* ═══ Extension Sections ═══ */
      .admin-ext-section {
        background: linear-gradient(145deg, #0d1b2a 0%, #1b2838 100%) !important;
        border: 1px solid rgba(255, 215, 0, 0.15) !important;
      }

      /* Stats row */
      .ext-stats-row {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 8px;
        margin-bottom: 16px;
      }
      .ext-stat {
        background: rgba(0, 20, 45, 0.8);
        border: 1px solid rgba(255, 215, 0, 0.1);
        border-radius: 10px;
        padding: 10px;
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .ext-stat-val {
        color: #ffd700;
        font-size: 16px;
        font-weight: 700;
        font-family: monospace;
      }
      .ext-stat-lbl {
        color: rgba(255, 255, 255, 0.5);
        font-size: 10px;
      }

      /* Panels */
      .ext-panel {
        background: rgba(0, 15, 35, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        padding: 12px;
        margin-bottom: 10px;
      }
      .ext-panel-title {
        color: #ccc;
        font-size: 12px;
        margin: 0 0 8px 0;
        font-weight: 600;
      }
      .ext-danger-panel {
        border-color: rgba(255, 68, 68, 0.2) !important;
        background: rgba(255, 0, 0, 0.03) !important;
      }

      /* Inline form */
      .ext-inline {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .ext-input {
        flex: 1;
        min-width: 120px;
      }
      .ext-hint {
        color: rgba(255, 255, 255, 0.35);
        font-size: 11px;
        white-space: nowrap;
      }
      .ext-btn {
        white-space: nowrap;
        flex-shrink: 0;
      }
      .ext-btn-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .ext-addr {
        color: #ffd700;
        font-family: monospace;
        font-size: 12px;
        background: rgba(255, 215, 0, 0.05);
        padding: 4px 8px;
        border-radius: 6px;
      }

      /* Status */
      .ext-status {
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
      }
      .ext-status-ok { color: #00cc66; }
      .ext-status-bad { color: #ff4444; }

      /* Lookup result */
      .ext-result {
        margin-top: 10px;
      }
      .ext-lookup-card {
        background: rgba(0, 20, 45, 0.8);
        border: 1px solid rgba(255, 215, 0, 0.1);
        border-radius: 10px;
        padding: 12px;
      }
      .ext-lookup-card strong {
        color: #ffd700;
        display: block;
        margin-bottom: 8px;
        font-family: monospace;
      }
      .ext-lookup-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        font-size: 12px;
      }
      .ext-lookup-row span:first-child { color: rgba(255, 255, 255, 0.5); }
      .ext-lookup-row span:last-child { color: #fff; font-family: monospace; }

      @media (max-width: 600px) {
        .ext-stats-row { grid-template-columns: repeat(3, 1fr); }
        .ext-inline { flex-direction: column; align-items: stretch; }
        .ext-input { min-width: 100%; }
        .ext-btn-row { flex-direction: column; }
      }
    `;
    document.head.appendChild(s);
  };

  console.log('✅ Admin Extensions v1.0 loaded');
})();
