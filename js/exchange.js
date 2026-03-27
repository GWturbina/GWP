// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Exchange & P2P Module v3.0
// On-chain P2P через P2PEscrow контракт
// Order book, история, рейтинг пользователей
// February 15, 2026
// ═══════════════════════════════════════════════════════════════════

const exchangeModule = {
  state: {
    userAddress: null,
    gwtBalance: '0',
    bnbBalance: '0',
    gwtPrice: '0.001',
    mode: 'swap',
    orders: [],
    myOrders: [],
    history: [],
    nextOrderId: 1,
    feeBP: 50,
    totalOrders: 0,
    totalCompleted: 0,
    totalVolumeBNB: '0',
    userRating: { completed: 0, cancelled: 0 },
    loading: false,
    GWT_ADDRESS: null
  },

  _swapPair: { from: 'BNB', to: 'GWT' },

  // ═══════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('💱 Exchange module v3.0 init');
    this.state.GWT_ADDRESS = window.CONFIG?.CONTRACTS?.GWTToken || null;
    this.render();
    this.bindEvents();
    if (app?.state?.userAddress) {
      this.state.userAddress = app.state.userAddress;
      await this.loadAll();
    }
  },

  async loadAll() {
    await Promise.all([
      this.loadBalances(),
      this.loadContractStats(),
      this.loadOrders(),
      this.loadUserRating()
    ]);
    this.updateBalancesUI();
    this.renderOrderBook();
    this.renderMyOrders();
  },

  // ═══════════════════════════════════════════════════════════════
  // БАЛАНСЫ
  // ═══════════════════════════════════════════════════════════════
  async loadBalances() {
    try {
      const gwtToken = await app?.getContract?.('GWTToken');
      if (gwtToken && this.state.userAddress) {
        const bal = await gwtToken.balanceOf(this.state.userAddress);
        this.state.gwtBalance = this.fmt(bal);
      }
      if (window.web3Manager?.provider && this.state.userAddress) {
        const bnb = await window.web3Manager.provider.getBalance(this.state.userAddress);
        this.state.bnbBalance = this.fmt(bnb);
      }
    } catch (e) { console.warn('Balance load error:', e); }
  },

  // ═══════════════════════════════════════════════════════════════
  // СТАТИСТИКА КОНТРАКТА
  // ═══════════════════════════════════════════════════════════════
  async loadContractStats() {
    try {
      const p2p = await app?.getContract?.('P2PEscrow');
      if (!p2p) return;
      const [nextId, feeBP, total, completed, volume] = await Promise.all([
        p2p.nextOrderId(), p2p.feeBP(), p2p.totalOrders(),
        p2p.totalCompleted(), p2p.totalVolumeBNB()
      ]);
      this.state.nextOrderId = parseInt(nextId.toString());
      this.state.feeBP = parseInt(feeBP.toString());
      this.state.totalOrders = parseInt(total.toString());
      this.state.totalCompleted = parseInt(completed.toString());
      this.state.totalVolumeBNB = this.fmt(volume);
    } catch (e) { console.warn('Stats load error:', e); }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА ОРДЕРОВ ИЗ КОНТРАКТА
  // ═══════════════════════════════════════════════════════════════
  async loadOrders() {
    try {
      const p2p = await app?.getContract?.('P2PEscrow');
      if (!p2p) return;
      const nextId = this.state.nextOrderId;
      const orders = [];
      // Загружаем последние 50 ордеров (или все если меньше)
      const startId = Math.max(1, nextId - 50);
      const promises = [];
      for (let i = startId; i < nextId; i++) {
        promises.push(this._fetchOrder(p2p, i));
      }
      const results = await Promise.all(promises);
      results.forEach(o => { if (o) orders.push(o); });

      this.state.orders = orders.filter(o => o.status === 0); // Active only
      this.state.history = orders.filter(o => o.status !== 0);
      this.state.myOrders = orders.filter(o =>
        o.seller?.toLowerCase() === this.state.userAddress?.toLowerCase() ||
        o.buyer?.toLowerCase() === this.state.userAddress?.toLowerCase()
      );

      // Вычисляем цену GWT из ордеров
      this._calcPriceFromOrders();
    } catch (e) { console.warn('Orders load error:', e); }
  },

  async _fetchOrder(p2p, orderId) {
    try {
      const o = await p2p.getOrder(orderId);
      return {
        id: orderId,
        seller: o.seller || o[0],
        buyer: o.buyer || o[1],
        sellToken: o.sellToken || o[2],
        sellAmount: o.sellAmount || o[3],
        buyToken: o.buyToken || o[4],
        buyAmount: o.buyAmount || o[5],
        status: parseInt((o.status ?? o[6]).toString()),
        createdAt: parseInt((o.createdAt ?? o[7]).toString()),
        expiresAt: parseInt((o.expiresAt ?? o[8]).toString())
      };
    } catch (e) { return null; }
  },

  _calcPriceFromOrders() {
    const gwtAddr = this.state.GWT_ADDRESS?.toLowerCase();
    if (!gwtAddr) return;
    const ZERO = '0x0000000000000000000000000000000000000000';
    const sellOrders = this.state.orders.filter(o => {
      const st = (o.sellToken || '').toLowerCase();
      const bt = (o.buyToken || '').toLowerCase();
      return st === gwtAddr && (bt === ZERO || bt === '0x0000000000000000000000000000000000000000');
    });
    if (sellOrders.length > 0) {
      // Лучшая цена (самая низкая) = sellAmount GWT / buyAmount BNB
      let bestPrice = Infinity;
      sellOrders.forEach(o => {
        const gwt = parseFloat(this.fmt(o.sellAmount));
        const bnb = parseFloat(this.fmt(o.buyAmount));
        if (gwt > 0 && bnb > 0) {
          const price = bnb / gwt;
          if (price < bestPrice) bestPrice = price;
        }
      });
      if (bestPrice < Infinity) this.state.gwtPrice = bestPrice.toFixed(6);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // РЕЙТИНГ ПОЛЬЗОВАТЕЛЯ
  // ═══════════════════════════════════════════════════════════════
  async loadUserRating() {
    try {
      const p2p = await app?.getContract?.('P2PEscrow');
      if (!p2p || !this.state.userAddress) return;
      const r = await p2p.getUserRating(this.state.userAddress);
      this.state.userRating = {
        completed: parseInt((r.completed ?? r[0]).toString()),
        cancelled: parseInt((r.cancelled ?? r[1]).toString())
      };
    } catch (e) {}
  },

  // ═══════════════════════════════════════════════════════════════
  // СОЗДАНИЕ ОРДЕРА: ПРОДАЖА GWT за BNB
  // ═══════════════════════════════════════════════════════════════
  async createSellGWT() {
    if (!this.state.userAddress) { app?.showNotification?.('Подключите кошелёк', 'error'); return; }
    const amountInput = document.getElementById('p2pAmount');
    const priceInput = document.getElementById('p2pPrice');
    const gwtAmount = parseFloat(amountInput?.value || 0);
    const pricePerGWT = parseFloat(priceInput?.value || 0);
    if (!gwtAmount || gwtAmount <= 0) { app?.showNotification?.('Укажите количество GWT', 'error'); return; }
    if (!pricePerGWT || pricePerGWT <= 0) { app?.showNotification?.('Укажите цену', 'error'); return; }
    if (gwtAmount > parseFloat(this.state.gwtBalance)) { app?.showNotification?.('Недостаточно GWT', 'error'); return; }

    const ethers = window.ethers;
    const gwtWei = ethers.utils.parseEther(gwtAmount.toString());
    const bnbTotal = gwtAmount * pricePerGWT;
    const bnbWei = ethers.utils.parseEther(bnbTotal.toFixed(18));
    const gwtAddr = this.state.GWT_ADDRESS;
    const ZERO = '0x0000000000000000000000000000000000000000';

    this.setLoading(true, 'Approve GWT...');
    try {
      // 1. Approve GWT
      const gwtToken = await app?.getSignedContract?.('GWTToken');
      const p2pAddr = window.CONFIG?.CONTRACTS?.P2PEscrow;
      const allowance = await gwtToken.allowance(this.state.userAddress, p2pAddr);
      if (allowance.lt(gwtWei)) {
        this.setLoading(true, 'Подтвердите approve в кошельке...');
        const approveTx = await gwtToken.approve(p2pAddr, ethers.constants.MaxUint256, { gasLimit: 100000 });
        await approveTx.wait();
      }

      // 2. Create order
      this.setLoading(true, 'Создание ордера...');
      const p2p = await app?.getSignedContract?.('P2PEscrow');
      const tx = await p2p.createOrderSellToken(gwtAddr, gwtWei, ZERO, bnbWei, { gasLimit: 300000 });
      await tx.wait();

      app?.showNotification?.(`✅ Ордер создан: ${gwtAmount} GWT → ${bnbTotal.toFixed(6)} BNB`, 'success');
      if (amountInput) amountInput.value = '';
      if (priceInput) priceInput.value = '';
      await this.loadAll();
    } catch (err) {
      app?.showNotification?.('❌ ' + this.parseError(err), 'error');
    } finally { this.setLoading(false); }
  },

  // ═══════════════════════════════════════════════════════════════
  // СОЗДАНИЕ ОРДЕРА: ПОКУПКА GWT за BNB
  // ═══════════════════════════════════════════════════════════════
  async createBuyGWT() {
    if (!this.state.userAddress) { app?.showNotification?.('Подключите кошелёк', 'error'); return; }
    const amountInput = document.getElementById('p2pAmount');
    const priceInput = document.getElementById('p2pPrice');
    const gwtAmount = parseFloat(amountInput?.value || 0);
    const pricePerGWT = parseFloat(priceInput?.value || 0);
    if (!gwtAmount || gwtAmount <= 0) { app?.showNotification?.('Укажите количество GWT', 'error'); return; }
    if (!pricePerGWT || pricePerGWT <= 0) { app?.showNotification?.('Укажите цену', 'error'); return; }

    const bnbTotal = gwtAmount * pricePerGWT;
    if (bnbTotal > parseFloat(this.state.bnbBalance)) { app?.showNotification?.('Недостаточно BNB', 'error'); return; }

    const ethers = window.ethers;
    const gwtWei = ethers.utils.parseEther(gwtAmount.toString());
    const bnbWei = ethers.utils.parseEther(bnbTotal.toFixed(18));
    const gwtAddr = this.state.GWT_ADDRESS;

    this.setLoading(true, 'Создание ордера...');
    try {
      const p2p = await app?.getSignedContract?.('P2PEscrow');
      const tx = await p2p.createOrderSellBNB(gwtAddr, gwtWei, { value: bnbWei, gasLimit: 300000 });
      await tx.wait();

      app?.showNotification?.(`✅ Ордер создан: покупка ${gwtAmount} GWT за ${bnbTotal.toFixed(6)} BNB`, 'success');
      if (amountInput) amountInput.value = '';
      if (priceInput) priceInput.value = '';
      await this.loadAll();
    } catch (err) {
      app?.showNotification?.('❌ ' + this.parseError(err), 'error');
    } finally { this.setLoading(false); }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПРИНЯТИЕ ОРДЕРА
  // ═══════════════════════════════════════════════════════════════
  async acceptOrder(orderId) {
    if (!this.state.userAddress) { app?.showNotification?.('Подключите кошелёк', 'error'); return; }
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) { app?.showNotification?.('Ордер не найден', 'error'); return; }

    const ZERO = '0x0000000000000000000000000000000000000000';
    const ethers = window.ethers;
    this.setLoading(true, 'Исполнение ордера...');

    try {
      const p2p = await app?.getSignedContract?.('P2PEscrow');

      if ((order.buyToken || '').toLowerCase() === ZERO ||
          order.buyToken === '0x0000000000000000000000000000000000000000') {
        // Ордер хочет BNB — платим BNB
        const tx = await p2p.acceptOrderWithBNB(orderId, {
          value: order.buyAmount,
          gasLimit: 350000
        });
        await tx.wait();
      } else {
        // Ордер хочет токен — approve + pay token
        const gwtToken = await app?.getSignedContract?.('GWTToken');
        const p2pAddr = window.CONFIG?.CONTRACTS?.P2PEscrow;
        const allowance = await gwtToken.allowance(this.state.userAddress, p2pAddr);
        if (allowance.lt(order.buyAmount)) {
          this.setLoading(true, 'Approve GWT...');
          const appTx = await gwtToken.approve(p2pAddr, ethers.constants.MaxUint256, { gasLimit: 100000 });
          await appTx.wait();
        }
        this.setLoading(true, 'Исполнение...');
        const tx = await p2p.acceptOrderWithToken(orderId, { gasLimit: 350000 });
        await tx.wait();
      }

      app?.showNotification?.('✅ Ордер исполнен!', 'success');
      await this.loadAll();
    } catch (err) {
      app?.showNotification?.('❌ ' + this.parseError(err), 'error');
    } finally { this.setLoading(false); }
  },

  // ═══════════════════════════════════════════════════════════════
  // ОТМЕНА ОРДЕРА
  // ═══════════════════════════════════════════════════════════════
  async cancelOrder(orderId) {
    if (!confirm('Отменить ордер #' + orderId + '?')) return;
    this.setLoading(true, 'Отмена ордера...');
    try {
      const p2p = await app?.getSignedContract?.('P2PEscrow');
      const tx = await p2p.cancelOrder(orderId, { gasLimit: 200000 });
      await tx.wait();
      app?.showNotification?.('✅ Ордер отменён', 'success');
      await this.loadAll();
    } catch (err) {
      app?.showNotification?.('❌ ' + this.parseError(err), 'error');
    } finally { this.setLoading(false); }
  },

  // ═══════════════════════════════════════════════════════════════
  // SWAP (быстрый обмен — исполняет лучший ордер)
  // ═══════════════════════════════════════════════════════════════
  async executeSwap() {
    if (!this.state.userAddress) { app?.showNotification?.('Подключите кошелёк', 'error'); return; }
    const fromAmount = parseFloat(document.getElementById('swapFromAmount')?.value || 0);
    if (!fromAmount || fromAmount <= 0) { app?.showNotification?.('Укажите сумму', 'error'); return; }

    const ZERO = '0x0000000000000000000000000000000000000000';
    const gwtAddr = this.state.GWT_ADDRESS?.toLowerCase();

    if (this._swapPair.from === 'BNB') {
      // Покупаем GWT — ищем ордер продажи GWT (sellToken = GWT, buyToken = 0x0)
      const sellOrders = this.state.orders
        .filter(o => (o.sellToken || '').toLowerCase() === gwtAddr &&
                     ((o.buyToken || '').toLowerCase() === ZERO))
        .sort((a, b) => {
          const priceA = parseFloat(this.fmt(a.buyAmount)) / parseFloat(this.fmt(a.sellAmount));
          const priceB = parseFloat(this.fmt(b.buyAmount)) / parseFloat(this.fmt(b.sellAmount));
          return priceA - priceB; // Лучшая цена первая
        });

      if (!sellOrders.length) { app?.showNotification?.('Нет ордеров на продажу GWT', 'warning'); return; }

      // Берём первый подходящий
      const best = sellOrders[0];
      const needed = parseFloat(this.fmt(best.buyAmount));
      if (fromAmount < needed) { app?.showNotification?.(`Минимум ${needed.toFixed(6)} BNB для этого ордера`, 'warning'); return; }

      await this.acceptOrder(best.id);
    } else {
      // Продаём GWT — ищем ордер покупки GWT (sellToken = 0x0/BNB, buyToken = GWT)
      const buyOrders = this.state.orders
        .filter(o => (o.buyToken || '').toLowerCase() === gwtAddr &&
                     ((o.sellToken || '').toLowerCase() === ZERO))
        .sort((a, b) => {
          const priceA = parseFloat(this.fmt(a.sellAmount)) / parseFloat(this.fmt(a.buyAmount));
          const priceB = parseFloat(this.fmt(b.sellAmount)) / parseFloat(this.fmt(b.buyAmount));
          return priceB - priceA; // Лучшая цена первая
        });

      if (!buyOrders.length) { app?.showNotification?.('Нет ордеров на покупку GWT', 'warning'); return; }

      const best = buyOrders[0];
      await this.acceptOrder(best.id);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  render() {
    const container = document.getElementById('exchange');
    if (!container) return;

    container.innerHTML = `
<div class="exchange-page">
  <div class="exch-header">
    <h2 data-translate="exchange.title">💱 Обменник & P2P</h2>
    <p class="exch-subtitle" data-translate="exchange.subtitle">On-chain P2P торговля GWT токенами</p>
  </div>

  <!-- Статистика -->
  <div class="exch-stats">
    <div class="exch-stat-card">
      <span class="exch-stat-val" id="exchStatOrders">0</span>
      <span class="exch-stat-label" data-translate="exchange.totalOrders">Ордеров</span>
    </div>
    <div class="exch-stat-card">
      <span class="exch-stat-val" id="exchStatCompleted">0</span>
      <span class="exch-stat-label" data-translate="exchange.completed">Завершено</span>
    </div>
    <div class="exch-stat-card">
      <span class="exch-stat-val" id="exchStatVolume">0</span>
      <span class="exch-stat-label" data-translate="exchange.volume">Объём BNB</span>
    </div>
    <div class="exch-stat-card">
      <span class="exch-stat-val" id="exchStatFee">0.5%</span>
      <span class="exch-stat-label" data-translate="exchange.fee">Комиссия</span>
    </div>
  </div>

  <!-- Табы -->
  <div class="exch-mode-tabs">
    <button class="exch-tab active" data-mode="swap">🔄 Быстрый обмен</button>
    <button class="exch-tab" data-mode="buy">💳 Купить с карты</button>
    <button class="exch-tab" data-mode="p2p">📋 Стакан ордеров</button>
    <button class="exch-tab" data-mode="create">➕ Создать ордер</button>
    <button class="exch-tab" data-mode="my">👤 Мои ордера</button>
  </div>

  <!-- ═══ SWAP ═══ -->
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
        <span class="bal-label" data-translate="exchange.gwtPrice">Цена GWT</span>
        <span class="bal-value" id="exchGwtPrice">0.001</span>
        <span class="bal-usd">BNB</span>
      </div>
    </div>

    <div class="exch-swap-form">
      <div class="exch-swap-card">
        <div class="swap-from">
          <div class="swap-header">
            <span data-translate="exchange.youPay">Отдаёте</span>
            <span class="swap-max" id="swapMaxBtn">MAX</span>
          </div>
          <div class="swap-input-row">
            <input type="number" id="swapFromAmount" placeholder="0.00" class="swap-input" step="any">
            <div class="swap-token-select" id="swapFromToken">
              <span class="token-icon">💎</span>
              <span class="token-name" id="swapFromName">BNB</span>
            </div>
          </div>
          <div class="swap-balance-hint">Balance: <span id="swapFromBalance">0.00</span></div>
        </div>
        <div class="swap-switch-btn" id="swapSwitchBtn"><span>⇅</span></div>
        <div class="swap-to">
          <div class="swap-header"><span data-translate="exchange.youGet">Получаете (примерно)</span></div>
          <div class="swap-input-row">
            <input type="number" id="swapToAmount" placeholder="0.00" class="swap-input" readonly>
            <div class="swap-token-select" id="swapToToken">
              <span class="token-icon">🪙</span>
              <span class="token-name" id="swapToName">GWT</span>
            </div>
          </div>
          <div class="swap-rate-info">Курс: <span id="swapRateDisplay">—</span></div>
        </div>
      </div>
      <div class="swap-details">
        <div class="swap-detail-row"><span data-translate="exchange.buyCommission">Комиссия:</span><span>${this.state.feeBP / 100}% с каждой стороны</span></div>
        <div class="swap-detail-row"><span data-translate="exchange.slippage">Исполнение:</span><span>Через лучший ордер в стакане</span></div>
      </div>
      <button class="exch-swap-btn" id="exchSwapBtn">🔄 Обменять</button>
      <div class="exch-swap-info">
        <p>Быстрый обмен автоматически находит лучший ордер в стакане и исполняет его.</p>
      </div>
    </div>
  </div>

  <!-- ═══ BUY WITH CARD (Fiat On-Ramp) ═══ -->
  <div class="exch-section" id="exchBuySection" style="display:none;">
    <div class="exch-buy-card-container">
      <div class="exch-buy-header">
        <h3>💳 Купить BNB с банковской карты</h3>
        <p class="exch-hint">Оплатите картой Visa/Mastercard, Apple Pay или Google Pay. BNB поступит на ваш кошелёк в течение 1-5 минут.</p>
      </div>

      <div class="exch-buy-options">
        <div class="exch-buy-amounts">
          <span class="exch-buy-label">Сумма (USD):</span>
          <div class="exch-buy-presets">
            <button class="exch-preset-btn" data-amount="10">$10</button>
            <button class="exch-preset-btn" data-amount="25">$25</button>
            <button class="exch-preset-btn active" data-amount="50">$50</button>
            <button class="exch-preset-btn" data-amount="100">$100</button>
          </div>
          <div class="exch-buy-custom">
            <input type="number" id="buyFiatAmount" value="50" min="10" max="5000" step="1" class="exch-buy-input" placeholder="Сумма в USD">
            <span class="exch-buy-currency">USD</span>
          </div>
        </div>

        <div class="exch-buy-info">
          <div class="exch-buy-info-row"><span>Вы получите:</span><strong>BNB на ваш кошелёк</strong></div>
          <div class="exch-buy-info-row"><span>Сеть:</span><strong>opBNB (Chain ID: 204)</strong></div>
          <div class="exch-buy-info-row"><span>Кошелёк:</span><strong id="buyWalletAddr">Не подключён</strong></div>
          <div class="exch-buy-info-row"><span>Комиссия провайдера:</span><strong>~1-3%</strong></div>
          <div class="exch-buy-info-row"><span>Время:</span><strong>1-5 минут</strong></div>
        </div>

        <button class="exch-buy-main-btn" id="buyWithCardBtn">
          <span class="buy-btn-icon">💳</span>
          <span class="buy-btn-text">Купить BNB с карты</span>
        </button>

        <div class="exch-buy-methods">
          <span>Принимаем:</span>
          <span class="pay-method">Visa</span>
          <span class="pay-method">Mastercard</span>
          <span class="pay-method">Apple Pay</span>
          <span class="pay-method">Google Pay</span>
          <span class="pay-method">SEPA</span>
        </div>
      </div>

      <!-- Transak widget container -->
      <div id="transakWidgetContainer" style="display:none;">
        <div class="exch-buy-widget-header">
          <span>Оформление покупки</span>
          <button class="exch-buy-close" id="buyCloseWidget">✕</button>
        </div>
        <div id="transakWidget" class="exch-buy-widget"></div>
      </div>

      <div class="exch-buy-footer">
        <p>🔒 Безопасно. Ваши данные карты обрабатывает лицензированный платёжный провайдер. GlobalWay не хранит и не видит данные вашей карты.</p>
        <p>Guardarian · ChangeNOW · MoonPay — лицензированные провайдеры</p>
      </div>
    </div>
  </div>

  <!-- ═══ ORDER BOOK ═══ -->
  <div class="exch-section" id="exchP2PSection" style="display:none;">
    <div class="orderbook">
      <div class="orderbook-side orderbook-sells">
        <h4 class="orderbook-title sell-title">🔴 Продажа GWT (Ask)</h4>
        <div class="orderbook-header">
          <span>Цена (BNB)</span><span>Кол-во GWT</span><span>Итого BNB</span><span></span>
        </div>
        <div class="orderbook-list" id="orderbookSells">
          <div class="orderbook-empty">Нет ордеров на продажу</div>
        </div>
      </div>
      <div class="orderbook-spread">
        <span class="spread-price" id="spreadPrice">—</span>
        <span class="spread-label">Средняя цена</span>
      </div>
      <div class="orderbook-side orderbook-buys">
        <h4 class="orderbook-title buy-title">🟢 Покупка GWT (Bid)</h4>
        <div class="orderbook-header">
          <span>Цена (BNB)</span><span>Кол-во GWT</span><span>Итого BNB</span><span></span>
        </div>
        <div class="orderbook-list" id="orderbookBuys">
          <div class="orderbook-empty">Нет ордеров на покупку</div>
        </div>
      </div>
    </div>
    <button class="exch-refresh-btn" id="refreshOrderbook">🔄 Обновить</button>
  </div>

  <!-- ═══ CREATE ORDER ═══ -->
  <div class="exch-section" id="exchCreateSection" style="display:none;">
    <div class="p2p-create">
      <h3 data-translate="exchange.createOrder">📝 Создать ордер (on-chain)</h3>
      <p class="exch-hint">Токены блокируются на контракте до покупки или отмены. Комиссия P2P: ${this.state.feeBP / 100}%.</p>
      <div class="p2p-form">
        <div class="p2p-type-selector">
          <button class="p2p-type-btn active" data-type="sell">🔴 Продаю GWT</button>
          <button class="p2p-type-btn" data-type="buy">🟢 Покупаю GWT</button>
        </div>
        <div class="p2p-form-row">
          <label data-translate="exchange.amountGWT">Количество GWT</label>
          <input type="number" id="p2pAmount" placeholder="100" class="p2p-input" step="any">
          <button class="p2p-max-btn" id="p2pMaxBtn">MAX</button>
        </div>
        <div class="p2p-form-row">
          <label data-translate="exchange.pricePerGWT">Цена за 1 GWT (BNB)</label>
          <input type="number" id="p2pPrice" placeholder="0.001" class="p2p-input" step="any">
          <button class="p2p-cur-btn" id="p2pCurBtn" data-translate="exchange.current">Текущая</button>
        </div>
        <div class="p2p-total-info">
          <span data-translate="exchange.total">Итого получите</span> — <strong id="p2pTotalCalc">0</strong> <span>BNB</span>
          <span class="p2p-fee-hint">(минус ${this.state.feeBP / 100}% комиссия)</span>
        </div>
        <button class="p2p-create-btn" id="p2pCreateBtn" data-translate="exchange.createOnChain">Создать ордер (on-chain)</button>
      </div>
    </div>
    <div class="p2p-user-rating" id="p2pUserRating">
      <span>Ваш рейтинг: </span>
      <span class="rating-good" id="ratingCompleted">0</span> завершено /
      <span class="rating-bad" id="ratingCancelled">0</span> отменено
    </div>
  </div>

  <!-- ═══ MY ORDERS ═══ -->
  <div class="exch-section" id="exchMySection" style="display:none;">
    <h3 data-translate="exchange.myOrders">👤 Мои ордера</h3>
    <div id="myOrdersList" class="my-orders-list">
      <div class="orderbook-empty">Нет ордеров</div>
    </div>
  </div>

  <!-- Loading -->
  <div class="exch-loading" id="exchLoading" style="display:none;">
    <div class="exch-loading-spinner"></div>
    <p id="exchLoadingText">Загрузка...</p>
  </div>
</div>`;

    if (window.i18n?.translatePage) window.i18n.translatePage();
  },

  // ═══════════════════════════════════════════════════════════════
  // BIND EVENTS
  // ═══════════════════════════════════════════════════════════════
  bindEvents() {
    // Табы
    document.querySelectorAll('.exch-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchMode(tab.dataset.mode));
    });

    // Swap
    document.getElementById('swapFromAmount')?.addEventListener('input', () => this.calculateSwap());
    document.getElementById('swapMaxBtn')?.addEventListener('click', () => this.setMaxAmount());
    document.getElementById('swapSwitchBtn')?.addEventListener('click', () => this.switchPair());
    document.getElementById('exchSwapBtn')?.addEventListener('click', () => this.executeSwap());

    // P2P type toggle
    document.querySelectorAll('.p2p-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.p2p-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._updateCreateTotal();
      });
    });

    // P2P inputs
    document.getElementById('p2pAmount')?.addEventListener('input', () => this._updateCreateTotal());
    document.getElementById('p2pPrice')?.addEventListener('input', () => this._updateCreateTotal());
    document.getElementById('p2pMaxBtn')?.addEventListener('click', () => {
      const input = document.getElementById('p2pAmount');
      if (input) { input.value = parseFloat(this.state.gwtBalance).toFixed(2); this._updateCreateTotal(); }
    });
    document.getElementById('p2pCurBtn')?.addEventListener('click', () => {
      const input = document.getElementById('p2pPrice');
      if (input) { input.value = this.state.gwtPrice; this._updateCreateTotal(); }
    });

    // Create button
    document.getElementById('p2pCreateBtn')?.addEventListener('click', () => {
      const type = document.querySelector('.p2p-type-btn.active')?.dataset.type || 'sell';
      if (type === 'sell') this.createSellGWT();
      else this.createBuyGWT();
    });

    // Refresh
    document.getElementById('refreshOrderbook')?.addEventListener('click', () => this.loadAll());

    // Buy with card
    document.getElementById('buyWithCardBtn')?.addEventListener('click', () => this.openTransakWidget());
    document.getElementById('buyCloseWidget')?.addEventListener('click', () => this.closeTransakWidget());
    document.querySelectorAll('.exch-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.exch-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const input = document.getElementById('buyFiatAmount');
        if (input) input.value = btn.dataset.amount;
      });
    });
    document.getElementById('buyFiatAmount')?.addEventListener('input', () => {
      document.querySelectorAll('.exch-preset-btn').forEach(b => b.classList.remove('active'));
    });
  },

  // ═══════════════════════════════════════════════════════════════
  // UI HELPERS
  // ═══════════════════════════════════════════════════════════════
  switchMode(mode) {
    this.state.mode = mode;
    document.querySelectorAll('.exch-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
    ['exchSwapSection', 'exchBuySection', 'exchP2PSection', 'exchCreateSection', 'exchMySection'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const map = { swap: 'exchSwapSection', buy: 'exchBuySection', p2p: 'exchP2PSection', create: 'exchCreateSection', my: 'exchMySection' };
    const el = document.getElementById(map[mode]);
    if (el) el.style.display = 'block';
    // Обновляем адрес кошелька при открытии Buy
    if (mode === 'buy') this._updateBuyWallet();
  },

  updateBalancesUI() {
    const s = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    s('exchGwtBalance', parseFloat(this.state.gwtBalance).toFixed(2));
    s('exchBnbBalance', parseFloat(this.state.bnbBalance).toFixed(6));
    s('exchGwtPrice', this.state.gwtPrice);
    s('exchStatOrders', this.state.totalOrders);
    s('exchStatCompleted', this.state.totalCompleted);
    s('exchStatVolume', parseFloat(this.state.totalVolumeBNB).toFixed(4));
    s('exchStatFee', (this.state.feeBP / 100) + '%');
    s('ratingCompleted', this.state.userRating.completed);
    s('ratingCancelled', this.state.userRating.cancelled);

    // Swap balance
    const fromBal = document.getElementById('swapFromBalance');
    if (fromBal) {
      fromBal.textContent = this._swapPair.from === 'GWT'
        ? parseFloat(this.state.gwtBalance).toFixed(2)
        : parseFloat(this.state.bnbBalance).toFixed(6);
    }
  },

  calculateSwap() {
    const fromVal = parseFloat(document.getElementById('swapFromAmount')?.value || 0);
    const toEl = document.getElementById('swapToAmount');
    const rateEl = document.getElementById('swapRateDisplay');
    const price = parseFloat(this.state.gwtPrice) || 0.001;

    if (!fromVal || fromVal <= 0) {
      if (toEl) toEl.value = '';
      if (rateEl) rateEl.textContent = '—';
      return;
    }
    let result;
    if (this._swapPair.from === 'BNB') {
      result = fromVal / price;
      if (rateEl) rateEl.textContent = `1 GWT = ${price} BNB`;
    } else {
      result = fromVal * price;
      if (rateEl) rateEl.textContent = `1 GWT = ${price} BNB`;
    }
    if (toEl) toEl.value = result.toFixed(4);
  },

  switchPair() {
    const t = this._swapPair.from;
    this._swapPair.from = this._swapPair.to;
    this._swapPair.to = t;
    const fn = document.getElementById('swapFromName');
    const tn = document.getElementById('swapToName');
    const fi = document.querySelector('#swapFromToken .token-icon');
    const ti = document.querySelector('#swapToToken .token-icon');
    const icons = { GWT: '🪙', BNB: '💎' };
    if (fn) fn.textContent = this._swapPair.from;
    if (tn) tn.textContent = this._swapPair.to;
    if (fi) fi.textContent = icons[this._swapPair.from];
    if (ti) ti.textContent = icons[this._swapPair.to];
    this.updateBalancesUI();
    this.calculateSwap();
  },

  setMaxAmount() {
    const input = document.getElementById('swapFromAmount');
    if (!input) return;
    input.value = this._swapPair.from === 'GWT'
      ? parseFloat(this.state.gwtBalance).toFixed(4)
      : parseFloat(this.state.bnbBalance).toFixed(6);
    this.calculateSwap();
  },

  _updateCreateTotal() {
    const amt = parseFloat(document.getElementById('p2pAmount')?.value || 0);
    const price = parseFloat(document.getElementById('p2pPrice')?.value || 0);
    const total = (amt * price);
    const fee = total * this.state.feeBP / 10000;
    const el = document.getElementById('p2pTotalCalc');
    if (el) el.textContent = total > 0 ? (total - fee).toFixed(6) : '0';
  },

  // ═══════════════════════════════════════════════════════════════
  // ORDER BOOK RENDER
  // ═══════════════════════════════════════════════════════════════
  renderOrderBook() {
    const ZERO = '0x0000000000000000000000000000000000000000';
    const gwtAddr = this.state.GWT_ADDRESS?.toLowerCase();
    if (!gwtAddr) return;

    // Sell orders: sellToken=GWT, buyToken=BNB(0x0)
    const sells = this.state.orders.filter(o =>
      (o.sellToken || '').toLowerCase() === gwtAddr &&
      ((o.buyToken || '').toLowerCase() === ZERO)
    ).map(o => ({
      ...o,
      gwtAmount: parseFloat(this.fmt(o.sellAmount)),
      bnbAmount: parseFloat(this.fmt(o.buyAmount)),
      price: parseFloat(this.fmt(o.buyAmount)) / parseFloat(this.fmt(o.sellAmount))
    })).sort((a, b) => a.price - b.price);

    // Buy orders: sellToken=BNB(0x0), buyToken=GWT
    const buys = this.state.orders.filter(o =>
      ((o.sellToken || '').toLowerCase() === ZERO) &&
      (o.buyToken || '').toLowerCase() === gwtAddr
    ).map(o => ({
      ...o,
      bnbAmount: parseFloat(this.fmt(o.sellAmount)),
      gwtAmount: parseFloat(this.fmt(o.buyAmount)),
      price: parseFloat(this.fmt(o.sellAmount)) / parseFloat(this.fmt(o.buyAmount))
    })).sort((a, b) => b.price - a.price);

    // Render sells
    const sellsEl = document.getElementById('orderbookSells');
    if (sellsEl) {
      if (!sells.length) { sellsEl.innerHTML = '<div class="orderbook-empty">Нет ордеров на продажу</div>'; }
      else {
        sellsEl.innerHTML = sells.map(o => {
          const isMine = o.seller?.toLowerCase() === this.state.userAddress?.toLowerCase();
          return `<div class="orderbook-row sell-row">
            <span class="ob-price">${o.price.toFixed(6)}</span>
            <span class="ob-amount">${o.gwtAmount.toFixed(2)}</span>
            <span class="ob-total">${o.bnbAmount.toFixed(6)}</span>
            <span class="ob-action">${isMine
              ? `<button class="ob-cancel-btn" onclick="exchangeModule.cancelOrder(${o.id})">✕</button>`
              : `<button class="ob-buy-btn" onclick="exchangeModule.acceptOrder(${o.id})">Купить</button>`
            }</span>
          </div>`;
        }).join('');
      }
    }

    // Render buys
    const buysEl = document.getElementById('orderbookBuys');
    if (buysEl) {
      if (!buys.length) { buysEl.innerHTML = '<div class="orderbook-empty">Нет ордеров на покупку</div>'; }
      else {
        buysEl.innerHTML = buys.map(o => {
          const isMine = o.seller?.toLowerCase() === this.state.userAddress?.toLowerCase();
          return `<div class="orderbook-row buy-row">
            <span class="ob-price">${o.price.toFixed(6)}</span>
            <span class="ob-amount">${o.gwtAmount.toFixed(2)}</span>
            <span class="ob-total">${o.bnbAmount.toFixed(6)}</span>
            <span class="ob-action">${isMine
              ? `<button class="ob-cancel-btn" onclick="exchangeModule.cancelOrder(${o.id})">✕</button>`
              : `<button class="ob-sell-btn" onclick="exchangeModule.acceptOrder(${o.id})">Продать</button>`
            }</span>
          </div>`;
        }).join('');
      }
    }

    // Spread
    const spreadEl = document.getElementById('spreadPrice');
    if (spreadEl) {
      if (sells.length && buys.length) {
        const mid = ((sells[0].price + buys[0].price) / 2).toFixed(6);
        spreadEl.textContent = mid + ' BNB';
      } else if (sells.length) { spreadEl.textContent = sells[0].price.toFixed(6) + ' BNB'; }
      else { spreadEl.textContent = this.state.gwtPrice + ' BNB'; }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // MY ORDERS RENDER
  // ═══════════════════════════════════════════════════════════════
  renderMyOrders() {
    const el = document.getElementById('myOrdersList');
    if (!el) return;
    const gwtAddr = this.state.GWT_ADDRESS?.toLowerCase();
    const ZERO = '0x0000000000000000000000000000000000000000';
    const STATUS = ['🟢 Активный', '🔗 Matched', '✅ Завершён', '❌ Отменён', '⚠️ Спор', '✅ Решён'];

    const my = this.state.myOrders.sort((a, b) => b.createdAt - a.createdAt);
    if (!my.length) { el.innerHTML = '<div class="orderbook-empty">У вас нет ордеров</div>'; return; }

    el.innerHTML = my.map(o => {
      const isSeller = o.seller?.toLowerCase() === this.state.userAddress?.toLowerCase();
      const isGWTSell = (o.sellToken || '').toLowerCase() === gwtAddr;
      const gwtAmt = isGWTSell ? this.fmt(o.sellAmount) : this.fmt(o.buyAmount);
      const bnbAmt = isGWTSell ? this.fmt(o.buyAmount) : this.fmt(o.sellAmount);
      const type = (isSeller && isGWTSell) || (!isSeller && !isGWTSell) ? 'sell' : 'buy';
      const date = new Date(o.createdAt * 1000).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const canCancel = isSeller && o.status === 0;

      return `<div class="my-order-card ${type}">
        <div class="my-order-header">
          <span class="my-order-id">#${o.id}</span>
          <span class="my-order-status">${STATUS[o.status] || '?'}</span>
        </div>
        <div class="my-order-body">
          <span class="my-order-type ${type}">${type === 'sell' ? '🔴 Продажа' : '🟢 Покупка'}</span>
          <span class="my-order-amount">${parseFloat(gwtAmt).toFixed(2)} GWT</span>
          <span class="my-order-price">${parseFloat(bnbAmt).toFixed(6)} BNB</span>
          <span class="my-order-date">${date}</span>
        </div>
        ${canCancel ? `<button class="my-order-cancel" onclick="exchangeModule.cancelOrder(${o.id})">❌ Отменить</button>` : ''}
      </div>`;
    }).join('');
  },

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════
  setLoading(on, text) {
    const el = document.getElementById('exchLoading');
    const txt = document.getElementById('exchLoadingText');
    if (el) el.style.display = on ? 'flex' : 'none';
    if (txt && text) txt.textContent = text;
  },

  fmt(val) {
    try {
      if (window.ethers?.utils?.formatEther) return window.ethers.utils.formatEther(val);
      return (parseInt(val.toString()) / 1e18).toString();
    } catch (e) { return '0'; }
  },

  parseError(err) {
    const msg = err?.reason || err?.data?.message || err?.message || 'Error';
    if (msg.includes('Token not allowed')) return 'Токен не разрешён на P2P';
    if (msg.includes('Invalid')) return 'Неверные параметры';
    if (msg.includes('Cannot cancel')) return 'Нельзя отменить';
    if (msg.includes('Not expired')) return 'Ордер ещё активен';
    if (msg.includes('user rejected') || msg.includes('denied')) return 'Отменено';
    if (msg.includes('insufficient')) return 'Недостаточно средств';
    return msg.length > 80 ? msg.slice(0, 80) + '...' : msg;
  },

  async refresh() {
    if (app?.state?.userAddress) {
      this.state.userAddress = app.state.userAddress;
      await this.loadAll();
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // FIAT ON-RAMP — несколько провайдеров на выбор
  // ═══════════════════════════════════════════════════════════════

  _updateBuyWallet() {
    const el = document.getElementById('buyWalletAddr');
    if (!el) return;
    if (this.state.userAddress) {
      el.textContent = this.state.userAddress.slice(0, 8) + '...' + this.state.userAddress.slice(-6);
      el.style.color = '#00ff88';
    } else {
      el.textContent = 'Не подключён';
      el.style.color = '#ff4444';
    }
  },

  openTransakWidget() {
    if (!this.state.userAddress) {
      app?.showNotification?.('Сначала подключите кошелёк', 'error');
      return;
    }

    const amount = document.getElementById('buyFiatAmount')?.value || '50';
    if (parseFloat(amount) < 10) {
      app?.showNotification?.('Минимальная сумма: $10', 'error');
      return;
    }

    // Показываем модал выбора провайдера
    this._showProviderModal(amount);
  },

  _showProviderModal(amount) {
    const addr = this.state.userAddress;
    const old = document.getElementById('buyProviderModal');
    if (old) old.remove();

    const providers = [
      {
        name: 'Guardarian',
        desc: 'Visa/MC, без регистрации, 400+ криптовалют',
        icon: '🛡️',
        color: '#6c5ce7',
        url: `https://guardarian.com/calculator?partner_api_token=free&default_fiat_currency=USD&default_crypto_currency=BNB&fiat_amount=${amount}&crypto_currency=BNB&wallet_address=${addr}`
      },
      {
        name: 'ChangeNOW',
        desc: 'Карты, банковский перевод, 900+ криптовалют',
        icon: '⚡',
        color: '#00c853',
        url: `https://changenow.io/exchange?to=bnb&toAddress=${addr}&amount=${amount}&fiatMode=true&fiatCurrency=usd`
      },
      {
        name: 'MoonPay',
        desc: 'Apple Pay, Google Pay, карты',
        icon: '🌙',
        color: '#7c3aed',
        url: `https://www.moonpay.com/buy/bnb?walletAddress=${addr}&currencyCode=bnb&baseCurrencyAmount=${amount}&baseCurrencyCode=usd`
      }
    ];

    const modal = document.createElement('div');
    modal.id = 'buyProviderModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';

    modal.innerHTML = `
      <div style="background:linear-gradient(135deg,#0d1117,#1a1f2e);border:1px solid #ffd70044;border-radius:16px;padding:24px 20px;max-width:400px;width:100%;max-height:90vh;overflow-y:auto;">
        <div style="text-align:center;margin-bottom:16px;">
          <h3 style="color:#ffd700;margin:0 0 6px;font-size:18px;">💳 Выберите провайдер</h3>
          <p style="color:#888;margin:0;font-size:13px;">Покупка ${amount} USD → BNB на ваш кошелёк</p>
        </div>
        ${providers.map(p => `
          <div class="buy-provider-card" data-url="${p.url}" style="
            background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;
            padding:16px;margin-bottom:10px;cursor:pointer;display:flex;align-items:center;gap:14px;
            transition:border-color 0.2s;
          ">
            <div style="font-size:28px;flex-shrink:0;">${p.icon}</div>
            <div style="flex:1;min-width:0;">
              <div style="color:#fff;font-weight:600;font-size:15px;">${p.name}</div>
              <div style="color:#888;font-size:12px;margin-top:2px;">${p.desc}</div>
            </div>
            <div style="color:#ffd700;font-size:18px;flex-shrink:0;">→</div>
          </div>
        `).join('')}
        <button id="buyProviderClose" style="
          width:100%;margin-top:12px;padding:12px;border:1px solid #555;border-radius:10px;
          background:transparent;color:#aaa;font-size:14px;cursor:pointer;
        ">Отмена</button>
        <p style="color:#555;font-size:11px;text-align:center;margin:12px 0 0;">
          🔒 Ваши данные карты обрабатывает выбранный провайдер. GlobalWay не хранит данные карт.
        </p>
      </div>
    `;

    document.body.appendChild(modal);

    // Обработчики
    modal.querySelectorAll('.buy-provider-card').forEach(card => {
      card.onmouseenter = () => card.style.borderColor = '#ffd700';
      card.onmouseleave = () => card.style.borderColor = 'rgba(255,255,255,0.1)';
      card.onclick = () => {
        window.open(card.dataset.url, '_blank');
        modal.remove();
        app?.showNotification?.('Окно покупки открыто. BNB придёт на ваш кошелёк после оплаты.', 'success');
      };
    });

    document.getElementById('buyProviderClose').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  },

  closeTransakWidget() {
    const modal = document.getElementById('buyProviderModal');
    if (modal) modal.remove();
  }
};

window.exchangeModule = exchangeModule;
