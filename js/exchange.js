// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Exchange & P2P Module
// Полностью подключён к GWTToken.sol контракту
// buyTokens, createSellOrder, buyFromOrder, cancelOrder, getActiveOrders
// v2.2 - February 15, 2026
// ═══════════════════════════════════════════════════════════════════

const exchangeModule = {
  state: {
    userAddress: null,
    gwtBalance: '0',
    bnbBalance: '0',
    gwtPrice: '0',
    tradingEnabled: false,
    userQualified: false,
    userRegistered: false,
    tokenStats: null,
    p2pOrders: [],
    orderCounter: 0,
    mode: 'swap',
    loading: false,
    _swapPair: { from: 'BNB', to: 'GWT' },
    _refreshTimer: null
  },

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('💱 Exchange module init');
    this.render();
    this.bindEvents();

    if (app?.state?.userAddress) {
      this.state.userAddress = app.state.userAddress;
      await this.loadAllData();
    }

    this.state._refreshTimer = setInterval(() => this.refreshPriceAndBalances(), 30000);
  },

  destroy() {
    if (this.state._refreshTimer) clearInterval(this.state._refreshTimer);
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА ВСЕХ ДАННЫХ
  // ═══════════════════════════════════════════════════════════════
  async loadAllData() {
    try {
      await Promise.all([
        this.loadBalances(),
        this.loadTokenStats(),
        this.checkTradingStatus(),
        this.checkUserQualification(),
        this.loadOnChainOrders()
      ]);
      this.updateFullUI();
    } catch (err) {
      console.error('❌ Exchange loadAllData error:', err);
    }
  },

  async refreshPriceAndBalances() {
    if (!this.state.userAddress) return;
    try {
      await Promise.all([this.loadBalances(), this.loadTokenStats()]);
      this.updateBalancesUI();
      this.updateStatsUI();
    } catch (e) { /* silent */ }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА БАЛАНСОВ
  // ═══════════════════════════════════════════════════════════════
  async loadBalances() {
    try {
      const gwtToken = await app?.getContract?.('GWTToken');
      if (gwtToken && this.state.userAddress) {
        const balance = await gwtToken.balanceOf(this.state.userAddress);
        this.state.gwtBalance = this.formatEther(balance);
      }
      if (window.web3Manager?.provider && this.state.userAddress) {
        const bnb = await window.web3Manager.provider.getBalance(this.state.userAddress);
        this.state.bnbBalance = this.formatEther(bnb);
      }
    } catch (err) {
      console.error('❌ Error loading balances:', err);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА СТАТИСТИКИ ТОКЕНА
  // ═══════════════════════════════════════════════════════════════
  async loadTokenStats() {
    try {
      const gwtToken = await app?.getContract?.('GWTToken');
      if (!gwtToken) return;

      const price = await gwtToken.currentPrice();
      this.state.gwtPrice = this.formatEther(price);

      try {
        const stats = await gwtToken.getTokenStats();
        this.state.tokenStats = {
          circulating: this.formatEther(stats.circulating || stats[0]),
          price: this.formatEther(stats.price || stats[1]),
          capitalization: this.formatEther(stats.cap || stats[2]),
          bought: this.formatEther(stats.bought || stats[3]),
          sold: this.formatEther(stats.sold || stats[4]),
          minted: this.formatEther(stats.minted || stats[5]),
          burned: this.formatEther(stats.burned || stats[6])
        };
      } catch (e) {
        console.log('Token stats unavailable, using price only');
      }
    } catch (err) {
      console.error('❌ Error loading token stats:', err);
    }
  },

  async checkTradingStatus() {
    try {
      const gwtToken = await app?.getContract?.('GWTToken');
      if (gwtToken) this.state.tradingEnabled = await gwtToken.tradingEnabled();
    } catch (e) { console.warn('Could not check trading status'); }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПРОВЕРКА КВАЛИФИКАЦИИ (Level 7+ для торговли)
  // ═══════════════════════════════════════════════════════════════
  async checkUserQualification() {
    try {
      if (!this.state.userAddress) return;
      const matrixRegistry = await app?.getContract?.('MatrixRegistry');
      if (!matrixRegistry) return;

      try {
        const userId = await matrixRegistry.getUserIdByAddress(this.state.userAddress);
        this.state.userRegistered = userId && userId.toString() !== '0';
      } catch (e) {
        this.state.userRegistered = false;
        return;
      }

      const globalWay = await app?.getContract?.('GlobalWay');
      if (globalWay) {
        try {
          for (let level = 7; level <= 12; level++) {
            const isActive = await globalWay.isLevelActive(this.state.userAddress, level);
            if (isActive) { this.state.userQualified = true; return; }
          }
          this.state.userQualified = false;
        } catch (e) {
          try {
            const uid = await matrixRegistry.getUserIdByAddress(this.state.userAddress);
            const userInfo = await matrixRegistry.getUserInfo(uid);
            const highest = parseInt(userInfo.highestLevel || userInfo[3] || 0);
            this.state.userQualified = highest >= 7;
          } catch (e2) { this.state.userQualified = false; }
        }
      }
    } catch (err) { console.error('❌ Qualification check error:', err); }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА ON-CHAIN ОРДЕРОВ
  // ═══════════════════════════════════════════════════════════════
  async loadOnChainOrders() {
    try {
      const gwtToken = await app?.getContract?.('GWTToken');
      if (!gwtToken) return;

      const counter = await gwtToken.orderCounter();
      this.state.orderCounter = parseInt(counter.toString());
      if (this.state.orderCounter === 0) { this.state.p2pOrders = []; return; }

      const startId = Math.max(1, this.state.orderCounter - 49);
      let activeIds = [];
      
      try {
        const result = await gwtToken.getActiveOrders(startId, 50);
        activeIds = result.filter(id => parseInt(id.toString()) > 0);
      } catch (e) {
        for (let i = this.state.orderCounter; i >= startId; i--) {
          try {
            const o = await gwtToken.getOrder(i);
            if (o.active || o[3]) activeIds.push(i);
          } catch (e2) { break; }
        }
      }

      const orders = [];
      for (const id of activeIds) {
        const idNum = parseInt(id.toString());
        if (idNum === 0) continue;
        try {
          const order = await gwtToken.getOrder(idNum);
          const seller = order.seller || order[0];
          const tokenAmount = order.tokenAmount || order[1];
          const pricePerToken = order.pricePerToken || order[2];
          const active = order.active ?? order[3];
          const createdAt = order.createdAt || order[4];
          if (!active) continue;

          const totalRaw = tokenAmount.mul(pricePerToken).div(
            window.ethers ? window.ethers.utils.parseEther('1') : BigInt(1e18)
          );

          orders.push({
            id: idNum,
            seller,
            sellerShort: seller.slice(0, 6) + '...' + seller.slice(-4),
            tokenAmount: this.formatEther(tokenAmount),
            tokenAmountRaw: tokenAmount,
            pricePerToken: this.formatEther(pricePerToken),
            pricePerTokenRaw: pricePerToken,
            totalBNB: this.formatEther(totalRaw),
            active,
            createdAt: parseInt(createdAt.toString()),
            isMine: seller.toLowerCase() === this.state.userAddress?.toLowerCase()
          });
        } catch (e) { console.warn(`Order ${idNum} fetch failed`); }
      }

      this.state.p2pOrders = orders.sort((a, b) => b.createdAt - a.createdAt);
    } catch (err) { console.error('❌ Error loading on-chain orders:', err); }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПОКУПКА GWT (buyTokens)
  // ═══════════════════════════════════════════════════════════════
  async executeBuyTokens() {
    if (this.state._swapPair.from === 'GWT') {
      app?.showNotification?.('Для продажи GWT создайте P2P ордер', 'info');
      this.switchMode('p2p');
      document.querySelectorAll('.exch-tab').forEach(t => t.classList.remove('active'));
      document.querySelector('.exch-tab[data-mode="p2p"]')?.classList.add('active');
      return;
    }

    if (!this.preflightCheck()) return;

    const fromAmount = parseFloat(document.getElementById('swapFromAmount')?.value || 0);
    if (!fromAmount || fromAmount <= 0) {
      app?.showNotification?.('Укажите сумму BNB', 'error');
      return;
    }

    this.setLoading(true, 'Покупка GWT...');

    try {
      const gwtToken = await app?.getContract?.('GWTToken');
      if (!gwtToken) throw new Error('GWTToken contract not available');
      const ethers = window.ethers;

      const price = await gwtToken.currentPrice();
      const bnbWei = ethers.utils.parseEther(fromAmount.toString());
      
      // baseCost = bnbSent / 1.10 (10% commission)
      const baseCost = bnbWei.mul(100).div(110);
      const tokenAmount = baseCost.mul(ethers.utils.parseEther('1')).div(price);

      if (tokenAmount.lte(0)) throw new Error('Сумма слишком мала');

      const maxPrice = price.mul(102).div(100); // +2% slippage
      
      const actualBaseCost = await gwtToken.calculatePurchaseCost(tokenAmount);
      const commission = actualBaseCost.mul(10).div(100);
      const totalCost = actualBaseCost.add(commission);
      const sendValue = totalCost.mul(103).div(100); // +3% buffer

      console.log(`Buying ${this.formatEther(tokenAmount)} GWT for ~${this.formatEther(sendValue)} BNB`);

      const tx = await gwtToken.buyTokens(tokenAmount, maxPrice, {
        value: sendValue,
        gasLimit: CONFIG.GAS.buyTokens
      });

      app?.showNotification?.('⏳ Транзакция отправлена...', 'info');
      await tx.wait();
      app?.showNotification?.(`✅ Куплено ${parseFloat(this.formatEther(tokenAmount)).toFixed(2)} GWT!`, 'success');
      await this.loadAllData();

    } catch (err) {
      console.error('❌ Buy tokens error:', err);
      app?.showNotification?.(`❌ ${this.parseError(err)}`, 'error');
    } finally {
      this.setLoading(false);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // СОЗДАНИЕ P2P ОРДЕРА НА ПРОДАЖУ (createSellOrder)
  // ═══════════════════════════════════════════════════════════════
  async executeCreateSellOrder() {
    if (!this.preflightCheck()) return;

    const amount = parseFloat(document.getElementById('p2pSellAmount')?.value || 0);
    const price = document.getElementById('p2pSellPrice')?.value?.trim();

    if (!amount || amount <= 0) { app?.showNotification?.('Укажите количество GWT', 'error'); return; }
    if (!price || parseFloat(price) <= 0) { app?.showNotification?.('Укажите цену', 'error'); return; }
    if (parseFloat(price) < 0.0001) { app?.showNotification?.('Мин. цена: 0.0001 BNB', 'error'); return; }
    if (amount > parseFloat(this.state.gwtBalance)) {
      app?.showNotification?.(`Недостаточно GWT. Баланс: ${parseFloat(this.state.gwtBalance).toFixed(2)}`, 'error');
      return;
    }

    this.setLoading(true, 'Создание ордера...');

    try {
      const gwtToken = await app?.getContract?.('GWTToken');
      const ethers = window.ethers;
      const tokenAmountWei = ethers.utils.parseEther(amount.toString());
      const pricePerTokenWei = ethers.utils.parseEther(price);

      // Check allowance
      const contractAddr = CONFIG.CONTRACTS.GWTToken;
      const allowance = await gwtToken.allowance(this.state.userAddress, contractAddr);
      
      if (allowance.lt(tokenAmountWei)) {
        app?.showNotification?.('⏳ Подтвердите approve...', 'info');
        const approveTx = await gwtToken.approve(contractAddr, tokenAmountWei, {
          gasLimit: CONFIG.GAS.approve
        });
        await approveTx.wait();
        app?.showNotification?.('✅ Approve подтверждён', 'success');
      }

      app?.showNotification?.('⏳ Подтвердите ордер...', 'info');
      const tx = await gwtToken.createSellOrder(tokenAmountWei, pricePerTokenWei, {
        gasLimit: CONFIG.GAS.createSellOrder
      });
      await tx.wait();
      app?.showNotification?.(`✅ Ордер создан: ${amount} GWT @ ${price} BNB`, 'success');

      document.getElementById('p2pSellAmount').value = '';
      document.getElementById('p2pSellPrice').value = '';
      await this.loadAllData();

    } catch (err) {
      console.error('❌ Create sell order error:', err);
      app?.showNotification?.(`❌ ${this.parseError(err)}`, 'error');
    } finally {
      this.setLoading(false);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПОКУПКА ИЗ P2P ОРДЕРА (buyFromOrder)
  // ═══════════════════════════════════════════════════════════════
  async executeBuyFromOrder(orderId) {
    if (!this.preflightCheck()) return;

    const order = this.state.p2pOrders.find(o => o.id === orderId);
    if (!order) { app?.showNotification?.('Ордер не найден', 'error'); return; }

    this.setLoading(true, `Покупка ${parseFloat(order.tokenAmount).toFixed(2)} GWT...`);

    try {
      const gwtToken = await app?.getContract?.('GWTToken');
      const ethers = window.ethers;

      const totalPrice = order.tokenAmountRaw.mul(order.pricePerTokenRaw).div(ethers.utils.parseEther('1'));
      const sendValue = totalPrice.mul(102).div(100); // +2% buffer
      const maxPrice = order.pricePerTokenRaw.mul(102).div(100);

      const tx = await gwtToken.buyFromOrder(orderId, maxPrice, {
        value: sendValue,
        gasLimit: CONFIG.GAS.buyFromOrder
      });

      app?.showNotification?.('⏳ Транзакция отправлена...', 'info');
      await tx.wait();
      app?.showNotification?.(`✅ Куплено ${parseFloat(order.tokenAmount).toFixed(2)} GWT!`, 'success');
      await this.loadAllData();

    } catch (err) {
      console.error('❌ Buy from order error:', err);
      app?.showNotification?.(`❌ ${this.parseError(err)}`, 'error');
    } finally {
      this.setLoading(false);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ОТМЕНА ОРДЕРА
  // ═══════════════════════════════════════════════════════════════
  async executeCancelOrder(orderId) {
    if (!this.state.userAddress) return;
    this.setLoading(true, 'Отмена ордера...');
    try {
      const gwtToken = await app?.getContract?.('GWTToken');
      const tx = await gwtToken.cancelOrder(orderId, { gasLimit: CONFIG.GAS.cancelOrder });
      app?.showNotification?.('⏳ Отмена...', 'info');
      await tx.wait();
      app?.showNotification?.('✅ Ордер отменён, GWT возвращены', 'success');
      await this.loadAllData();
    } catch (err) {
      console.error('❌ Cancel order error:', err);
      app?.showNotification?.(`❌ ${this.parseError(err)}`, 'error');
    } finally {
      this.setLoading(false);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // PREFLIGHT CHECK
  // ═══════════════════════════════════════════════════════════════
  preflightCheck() {
    if (!this.state.userAddress) { app?.showNotification?.('Подключите кошелёк', 'error'); return false; }
    if (!this.state.tradingEnabled) { app?.showNotification?.('Торговля не активирована владельцем контракта', 'error'); return false; }
    if (!this.state.userRegistered) { app?.showNotification?.('Необходима регистрация в GlobalWay', 'error'); return false; }
    if (!this.state.userQualified) { app?.showNotification?.('Для торговли нужен Level 7+', 'error'); return false; }
    if (this.state.loading) { app?.showNotification?.('Дождитесь завершения операции', 'info'); return false; }
    return true;
  },

  // ═══════════════════════════════════════════════════════════════
  // РЕНДЕР СТРАНИЦЫ
  // ═══════════════════════════════════════════════════════════════
  render() {
    const container = document.getElementById('exchange');
    if (!container) return;

    container.innerHTML = `
<div class="exchange-page">
  <div class="exch-header">
    <h2>💱 Обменник GWT</h2>
    <p class="exch-subtitle">Покупка GWT и P2P торговля на блокчейне</p>
  </div>

  <div class="exch-status-bar" id="exchStatusBar">
    <div class="exch-status-item">
      <span class="status-dot" id="exchTradingDot">●</span>
      <span id="exchTradingStatus">Проверка...</span>
    </div>
    <div class="exch-status-item">
      <span class="status-label">Квалификация:</span>
      <span id="exchQualStatus">—</span>
    </div>
  </div>

  <div class="exch-mode-tabs">
    <button class="exch-tab active" data-mode="swap"><span class="tab-icon">🔄</span> Купить GWT</button>
    <button class="exch-tab" data-mode="p2p"><span class="tab-icon">📋</span> P2P Ордера</button>
    <button class="exch-tab" data-mode="stats"><span class="tab-icon">📊</span> Статистика</button>
  </div>

  <!-- SWAP -->
  <div class="exch-section" id="exchSwapSection">
    <div class="exch-balances">
      <div class="exch-balance-card">
        <span class="bal-label">GWT</span>
        <span class="bal-value" id="exchGwtBalance">0.00</span>
        <span class="bal-usd">Token</span>
      </div>
      <div class="exch-balance-card">
        <span class="bal-label">BNB</span>
        <span class="bal-value" id="exchBnbBalance">0.000000</span>
        <span class="bal-usd">opBNB</span>
      </div>
      <div class="exch-balance-card exch-price-card">
        <span class="bal-label">Цена GWT</span>
        <span class="bal-value" id="exchGwtPrice">—</span>
        <span class="bal-usd">BNB</span>
      </div>
    </div>

    <div class="exch-swap-form">
      <div class="exch-swap-card">
        <div class="swap-from">
          <div class="swap-header">
            <span>Отдаёте</span>
            <span class="swap-max" id="swapMaxBtn">MAX</span>
          </div>
          <div class="swap-input-row">
            <input type="number" id="swapFromAmount" placeholder="0.00" class="swap-input" step="any" min="0">
            <div class="swap-token-select">
              <span class="token-icon" id="swapFromIcon">💎</span>
              <span class="token-name" id="swapFromName">BNB</span>
            </div>
          </div>
          <div class="swap-balance-hint">Баланс: <span id="swapFromBalance">0.00</span></div>
        </div>

        <div class="swap-switch-btn" id="swapSwitchBtn">⇅</div>

        <div class="swap-to">
          <div class="swap-header"><span>Получаете (примерно)</span></div>
          <div class="swap-input-row">
            <input type="number" id="swapToAmount" placeholder="0.00" class="swap-input" readonly>
            <div class="swap-token-select">
              <span class="token-icon" id="swapToIcon">🪙</span>
              <span class="token-name" id="swapToName">GWT</span>
            </div>
          </div>
          <div class="swap-rate-info">Курс: <span id="swapRateDisplay">—</span></div>
        </div>
      </div>

      <div class="swap-details">
        <div class="swap-detail-row"><span>Комиссия покупки:</span><span>10% → tokenomics</span></div>
        <div class="swap-detail-row"><span>Буфер slippage:</span><span>~3%</span></div>
        <div class="swap-detail-row" id="swapCostRow" style="display:none;">
          <span>Итого к оплате:</span><span id="swapTotalCost">—</span>
        </div>
      </div>

      <button class="exch-swap-btn" id="exchSwapBtn" disabled>⚠️ Подключите кошелёк</button>

      <div class="exch-info-note" id="exchSellNote" style="display:none;">
        <p>ℹ️ Прямая продажа GWT в контракт не предусмотрена. Создайте P2P ордер — другие участники купят ваши токены.</p>
      </div>
    </div>
  </div>

  <!-- P2P -->
  <div class="exch-section" id="exchP2PSection" style="display:none;">
    <div class="p2p-create">
      <h3>📝 Создать ордер на продажу GWT</h3>
      <p class="p2p-hint">Токены блокируются на контракте до покупки или отмены. Ордер действует 30 дней. Комиссия P2P: 2%.</p>
      <div class="p2p-form">
        <div class="p2p-form-row">
          <label>Количество GWT:</label>
          <div class="p2p-input-wrap">
            <input type="number" id="p2pSellAmount" placeholder="100" class="p2p-input" step="any" min="0">
            <button class="p2p-max-btn" id="p2pMaxSell">MAX</button>
          </div>
        </div>
        <div class="p2p-form-row">
          <label>Цена за 1 GWT (BNB):</label>
          <div class="p2p-input-wrap">
            <input type="number" id="p2pSellPrice" placeholder="0.001" class="p2p-input" step="any" min="0.0001">
            <button class="p2p-market-btn" id="p2pMarketPrice">Текущая</button>
          </div>
        </div>
        <div class="p2p-form-row p2p-total-row">
          <span>Итого получите:</span>
          <span id="p2pSellTotal">— BNB</span>
          <span class="p2p-commission-note">(минус 2% комиссия)</span>
        </div>
        <button class="p2p-create-btn" id="p2pCreateBtn">📢 Создать ордер (on-chain)</button>
      </div>
    </div>

    <div class="p2p-orders">
      <div class="p2p-orders-header">
        <h3>📊 Активные ордера</h3>
        <button class="p2p-refresh-btn" id="p2pRefreshBtn">🔄</button>
      </div>
      <div class="p2p-filter">
        <button class="p2p-filter-btn active" data-filter="all">Все</button>
        <button class="p2p-filter-btn" data-filter="my">Мои</button>
        <button class="p2p-filter-btn" data-filter="cheap">Дешёвые</button>
      </div>
      <div class="p2p-list" id="p2pOrdersList">
        <p class="p2p-empty">Загрузка ордеров...</p>
      </div>
    </div>
  </div>

  <!-- STATS -->
  <div class="exch-section" id="exchStatsSection" style="display:none;">
    <div class="exch-stats-grid" id="exchStatsGrid">
      <div class="stat-card"><span class="stat-label">Цена GWT</span><span class="stat-value" id="statPrice">—</span><span class="stat-sub">BNB</span></div>
      <div class="stat-card"><span class="stat-label">В обращении</span><span class="stat-value" id="statCirculating">—</span><span class="stat-sub">GWT</span></div>
      <div class="stat-card"><span class="stat-label">Капитализация</span><span class="stat-value" id="statCap">—</span><span class="stat-sub">BNB</span></div>
      <div class="stat-card"><span class="stat-label">Куплено</span><span class="stat-value" id="statBought">—</span><span class="stat-sub">GWT</span></div>
      <div class="stat-card"><span class="stat-label">Продано P2P</span><span class="stat-value" id="statSold">—</span><span class="stat-sub">GWT</span></div>
      <div class="stat-card"><span class="stat-label">Сожжено</span><span class="stat-value" id="statBurned">—</span><span class="stat-sub">GWT</span></div>
    </div>
    <div class="exch-info-note">
      <p>📈 Цена GWT растёт с каждой покупкой. Комиссия 10% → tokenomics.</p>
      <p>👥 P2P: торговля напрямую между участниками. Комиссия 2%.</p>
      <p>🔒 Для торговли необходим Level 7+ в GlobalWay.</p>
    </div>
  </div>

  <div class="exch-loading-overlay" id="exchLoadingOverlay" style="display:none;">
    <div class="exch-loading-spinner"></div>
    <p id="exchLoadingText">Обработка...</p>
  </div>
</div>`;
  },

  // ═══════════════════════════════════════════════════════════════
  // ПРИВЯЗКА СОБЫТИЙ
  // ═══════════════════════════════════════════════════════════════
  bindEvents() {
    document.querySelectorAll('.exch-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.exch-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.switchMode(tab.dataset.mode);
      });
    });

    document.getElementById('swapFromAmount')?.addEventListener('input', () => this.calculateSwap());
    document.getElementById('swapSwitchBtn')?.addEventListener('click', () => this.switchPair());
    document.getElementById('swapMaxBtn')?.addEventListener('click', () => this.setMaxAmount());
    document.getElementById('exchSwapBtn')?.addEventListener('click', () => this.executeBuyTokens());

    document.getElementById('p2pCreateBtn')?.addEventListener('click', () => this.executeCreateSellOrder());
    document.getElementById('p2pMaxSell')?.addEventListener('click', () => {
      const input = document.getElementById('p2pSellAmount');
      if (input) input.value = parseFloat(this.state.gwtBalance).toFixed(4);
      this.updateP2PTotal();
    });
    document.getElementById('p2pMarketPrice')?.addEventListener('click', () => {
      const input = document.getElementById('p2pSellPrice');
      if (input) input.value = this.state.gwtPrice;
      this.updateP2PTotal();
    });
    document.getElementById('p2pSellAmount')?.addEventListener('input', () => this.updateP2PTotal());
    document.getElementById('p2pSellPrice')?.addEventListener('input', () => this.updateP2PTotal());
    document.getElementById('p2pRefreshBtn')?.addEventListener('click', async () => {
      await this.loadOnChainOrders();
      this.renderP2POrders();
      app?.showNotification?.('✅ Обновлено', 'success');
    });

    document.querySelectorAll('.p2p-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.p2p-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderP2POrders(btn.dataset.filter);
      });
    });
  },

  switchMode(mode) {
    this.state.mode = mode;
    const map = { swap: 'exchSwapSection', p2p: 'exchP2PSection', stats: 'exchStatsSection' };
    Object.values(map).forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    const el = document.getElementById(map[mode]);
    if (el) el.style.display = 'block';
    if (mode === 'p2p') this.renderP2POrders();
    if (mode === 'stats') this.updateStatsUI();
  },

  // ═══════════════════════════════════════════════════════════════
  // SWAP КАЛЬКУЛЯТОР
  // ═══════════════════════════════════════════════════════════════
  calculateSwap() {
    const fromAmount = parseFloat(document.getElementById('swapFromAmount')?.value || 0);
    const toInput = document.getElementById('swapToAmount');
    const rateDisplay = document.getElementById('swapRateDisplay');
    const costRow = document.getElementById('swapCostRow');
    const costEl = document.getElementById('swapTotalCost');
    const sellNote = document.getElementById('exchSellNote');

    if (!fromAmount || fromAmount <= 0) {
      if (toInput) toInput.value = '';
      if (costRow) costRow.style.display = 'none';
      return;
    }

    const price = parseFloat(this.state.gwtPrice);
    if (!price || price <= 0) {
      if (rateDisplay) rateDisplay.textContent = 'Цена не загружена';
      return;
    }

    if (this.state._swapPair.from === 'BNB') {
      const baseBnb = fromAmount / 1.10;
      const tokensOut = baseBnb / price;
      if (toInput) toInput.value = tokensOut.toFixed(2);
      if (rateDisplay) rateDisplay.textContent = `1 GWT = ${price} BNB`;
      if (costRow) costRow.style.display = 'flex';
      if (costEl) costEl.textContent = `~${fromAmount.toFixed(6)} BNB (вкл. 10%)`;
      if (sellNote) sellNote.style.display = 'none';
    } else {
      const bnbOut = fromAmount * price;
      if (toInput) toInput.value = bnbOut.toFixed(8);
      if (rateDisplay) rateDisplay.textContent = `1 GWT = ${price} BNB`;
      if (costRow) costRow.style.display = 'none';
      if (sellNote) sellNote.style.display = 'block';
    }
  },

  switchPair() {
    const pair = this.state._swapPair;
    const temp = pair.from; pair.from = pair.to; pair.to = temp;
    const icons = { GWT: '🪙', BNB: '💎' };
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('swapFromName', pair.from); set('swapToName', pair.to);
    set('swapFromIcon', icons[pair.from]); set('swapToIcon', icons[pair.to]);
    this.updateSwapBalance();

    const btn = document.getElementById('exchSwapBtn');
    if (btn && this.state.userAddress && this.state.tradingEnabled && this.state.userQualified) {
      btn.textContent = pair.from === 'BNB' ? '🔄 Купить GWT' : '📋 Перейти к P2P';
      btn.disabled = false;
    }
    this.calculateSwap();
  },

  setMaxAmount() {
    const input = document.getElementById('swapFromAmount');
    if (!input) return;
    if (this.state._swapPair.from === 'BNB') {
      input.value = Math.max(0, parseFloat(this.state.bnbBalance) - 0.001).toFixed(6);
    } else {
      input.value = parseFloat(this.state.gwtBalance).toFixed(4);
    }
    this.calculateSwap();
  },

  updateSwapBalance() {
    const el = document.getElementById('swapFromBalance');
    if (el) {
      el.textContent = this.state._swapPair.from === 'BNB'
        ? parseFloat(this.state.bnbBalance).toFixed(6)
        : parseFloat(this.state.gwtBalance).toFixed(2);
    }
  },

  updateP2PTotal() {
    const amount = parseFloat(document.getElementById('p2pSellAmount')?.value || 0);
    const price = parseFloat(document.getElementById('p2pSellPrice')?.value || 0);
    const el = document.getElementById('p2pSellTotal');
    if (el) {
      el.textContent = (amount > 0 && price > 0) ? `~${(amount * price * 0.98).toFixed(6)} BNB` : '— BNB';
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // РЕНДЕР P2P ОРДЕРОВ
  // ═══════════════════════════════════════════════════════════════
  renderP2POrders(filter) {
    filter = filter || 'all';
    const container = document.getElementById('p2pOrdersList');
    if (!container) return;

    let orders = [...this.state.p2pOrders];
    if (filter === 'my') orders = orders.filter(o => o.isMine);
    else if (filter === 'cheap') orders = [...orders].sort((a, b) => parseFloat(a.pricePerToken) - parseFloat(b.pricePerToken));

    if (!orders.length) {
      container.innerHTML = filter === 'my'
        ? '<p class="p2p-empty">У вас нет активных ордеров</p>'
        : '<p class="p2p-empty">Нет активных ордеров на блокчейне</p>';
      return;
    }

    container.innerHTML = orders.map(order => {
      const daysLeft = Math.max(0, Math.ceil(((order.createdAt + 30*86400)*1000 - Date.now()) / 86400000));
      const created = new Date(order.createdAt * 1000).toLocaleDateString('ru-RU', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });
      return `
        <div class="p2p-order-card ${order.isMine ? 'my-order' : ''}">
          <div class="p2p-order-header">
            <span class="p2p-order-id">#${order.id}</span>
            <span class="p2p-order-seller">${order.sellerShort}${order.isMine ? ' (вы)' : ''}</span>
          </div>
          <div class="p2p-order-body">
            <div class="p2p-order-amount"><span class="p2p-big">${parseFloat(order.tokenAmount).toFixed(2)}</span> <span class="p2p-unit">GWT</span></div>
            <div class="p2p-order-price"><span class="p2p-label">Цена:</span> <span class="p2p-val">${parseFloat(order.pricePerToken).toFixed(6)} BNB</span></div>
            <div class="p2p-order-total"><span class="p2p-label">Итого:</span> <span class="p2p-val">${parseFloat(order.totalBNB).toFixed(6)} BNB</span></div>
          </div>
          <div class="p2p-order-footer">
            <span class="p2p-date">${created} · ${daysLeft}д</span>
            ${order.isMine
              ? `<button class="p2p-cancel-btn" data-oid="${order.id}">❌ Отменить</button>`
              : `<button class="p2p-buy-btn" data-oid="${order.id}">🛒 Купить</button>`}
          </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.p2p-buy-btn').forEach(btn => {
      btn.addEventListener('click', () => this.executeBuyFromOrder(parseInt(btn.dataset.oid)));
    });
    container.querySelectorAll('.p2p-cancel-btn').forEach(btn => {
      btn.addEventListener('click', () => this.executeCancelOrder(parseInt(btn.dataset.oid)));
    });
  },

  // ═══════════════════════════════════════════════════════════════
  // UI UPDATES
  // ═══════════════════════════════════════════════════════════════
  updateFullUI() {
    this.updateBalancesUI();
    this.updateStatusUI();
    this.updateSwapButton();
    this.updateStatsUI();
    this.renderP2POrders();
  },

  updateBalancesUI() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('exchGwtBalance', parseFloat(this.state.gwtBalance).toFixed(2));
    set('exchBnbBalance', parseFloat(this.state.bnbBalance).toFixed(6));
    set('exchGwtPrice', this.state.gwtPrice || '—');
    this.updateSwapBalance();
  },

  updateStatusUI() {
    const dot = document.getElementById('exchTradingDot');
    const status = document.getElementById('exchTradingStatus');
    const qual = document.getElementById('exchQualStatus');

    if (this.state.tradingEnabled) {
      if (dot) dot.style.color = '#00ff88';
      if (status) status.textContent = 'Торговля активна';
    } else {
      if (dot) dot.style.color = '#ff4444';
      if (status) status.textContent = 'Торговля не активна';
    }

    if (!this.state.userAddress) {
      if (qual) qual.textContent = 'Кошелёк не подключён';
    } else if (this.state.userQualified) {
      if (qual) { qual.textContent = '✅ Level 7+'; qual.style.color = '#00ff88'; }
    } else if (this.state.userRegistered) {
      if (qual) { qual.textContent = '❌ Нужен Level 7+'; qual.style.color = '#ffaa00'; }
    } else {
      if (qual) { qual.textContent = '❌ Не зарегистрирован'; qual.style.color = '#ff4444'; }
    }
  },

  updateSwapButton() {
    const btn = document.getElementById('exchSwapBtn');
    if (!btn) return;
    if (!this.state.userAddress) { btn.textContent = '⚠️ Подключите кошелёк'; btn.disabled = true; }
    else if (!this.state.tradingEnabled) { btn.textContent = '🔒 Торговля не активирована'; btn.disabled = true; }
    else if (!this.state.userQualified) { btn.textContent = '🔒 Нужен Level 7+'; btn.disabled = true; }
    else if (this.state._swapPair.from === 'BNB') { btn.textContent = '🔄 Купить GWT'; btn.disabled = false; }
    else { btn.textContent = '📋 Перейти к P2P'; btn.disabled = false; }
  },

  updateStatsUI() {
    if (!this.state.tokenStats) return;
    const s = this.state.tokenStats;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = parseFloat(val).toLocaleString('ru-RU', { maximumFractionDigits: 4 }); };
    set('statPrice', s.price); set('statCirculating', s.circulating); set('statCap', s.capitalization);
    set('statBought', s.bought); set('statSold', s.sold); set('statBurned', s.burned);
  },

  setLoading(on, text) {
    this.state.loading = on;
    const overlay = document.getElementById('exchLoadingOverlay');
    const textEl = document.getElementById('exchLoadingText');
    if (overlay) overlay.style.display = on ? 'flex' : 'none';
    if (textEl) textEl.textContent = text || 'Обработка...';
  },

  // ═══════════════════════════════════════════════════════════════
  // УТИЛИТЫ
  // ═══════════════════════════════════════════════════════════════
  formatEther(val) {
    try {
      if (window.ethers?.utils?.formatEther) return window.ethers.utils.formatEther(val);
      return (parseInt(val.toString()) / 1e18).toString();
    } catch (e) { return '0'; }
  },

  parseError(err) {
    const msg = err?.reason || err?.data?.message || err?.message || 'Неизвестная ошибка';
    const map = {
      'Trading not enabled': 'Торговля не активирована',
      'Not registered': 'Необходима регистрация',
      'Need level 7': 'Нужен Level 7+',
      'Insufficient reserve': 'Недостаточно токенов в резерве',
      'Insufficient payment': 'Недостаточно BNB',
      'Insufficient balance': 'Недостаточно GWT',
      'Price too high': 'Цена изменилась, попробуйте снова',
      'Price too low': 'Мин. цена: 0.0001 BNB',
      'Order not active': 'Ордер уже неактивен',
      'Order expired': 'Ордер просрочен (>30 дней)',
      'Not order owner': 'Вы не владелец ордера',
      'user rejected': 'Транзакция отменена',
      'denied': 'Транзакция отменена'
    };
    for (const [key, val] of Object.entries(map)) {
      if (msg.includes(key)) return val;
    }
    return msg.length > 100 ? msg.slice(0, 100) + '...' : msg;
  },

  async refresh() {
    if (app?.state?.userAddress) {
      this.state.userAddress = app.state.userAddress;
      await this.loadAllData();
    }
  }
};

window.exchangeModule = exchangeModule;
