// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Exchange & P2P Module
// Обменник GWT токенов + P2P площадка
// v2.1 - February 13, 2026
// ═══════════════════════════════════════════════════════════════════

const exchangeModule = {
  state: {
    userAddress: null,
    gwtBalance: '0',
    bnbBalance: '0',
    gwtPrice: '0.0001', // Стартовая цена GWT в BNB
    mode: 'swap',  // 'swap' | 'p2p'
    p2pOrders: [],
    myOrders: []
  },

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('💱 Exchange module init');
    this.render();
    
    if (window.GWApp?.state?.address) {
      this.state.userAddress = window.GWApp.state.address;
      await this.loadBalances();
    }
    
    this.bindEvents();
    this.loadP2POrders();
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА БАЛАНСОВ
  // ═══════════════════════════════════════════════════════════════
  async loadBalances() {
    try {
      // GWT баланс
      const gwtToken = await window.GWApp?.getContract?.('GWTToken');
      if (gwtToken) {
        const balance = await gwtToken.balanceOf(this.state.userAddress);
        this.state.gwtBalance = window.ethers 
          ? window.ethers.utils.formatEther(balance) 
          : (parseInt(balance) / 1e18).toFixed(4);
      }

      // BNB баланс
      if (window.GWApp?.state?.provider) {
        const bnb = await window.GWApp.state.provider.getBalance(this.state.userAddress);
        this.state.bnbBalance = window.ethers
          ? window.ethers.utils.formatEther(bnb)
          : (parseInt(bnb) / 1e18).toFixed(6);
      }

      // Цена GWT (из контракта если доступно)
      try {
        const gwtContract = await window.GWApp?.getContract?.('GWTToken');
        if (gwtContract?.tokenPrice) {
          const price = await gwtContract.tokenPrice();
          this.state.gwtPrice = window.ethers
            ? window.ethers.utils.formatEther(price)
            : (parseInt(price) / 1e18).toString();
        }
      } catch (e) {
        console.log('Using default GWT price');
      }

      this.updateBalancesUI();
    } catch (err) {
      console.error('❌ Error loading balances:', err);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // РЕНДЕР СТРАНИЦЫ
  // ═══════════════════════════════════════════════════════════════
  render() {
    const container = document.getElementById('exchange');
    if (!container) return;

    container.innerHTML = `
<div class="exchange-page">

  <!-- ЗАГОЛОВОК -->
  <div class="exch-header">
    <h2>💱 Обменник & P2P</h2>
    <p class="exch-subtitle">Обмен GWT токенов и P2P торговля</p>
  </div>

  <!-- ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМОВ -->
  <div class="exch-mode-tabs">
    <button class="exch-tab active" data-mode="swap">
      <span class="tab-icon">🔄</span> Обмен
    </button>
    <button class="exch-tab" data-mode="p2p">
      <span class="tab-icon">👥</span> P2P Торговля
    </button>
    <button class="exch-tab" data-mode="history">
      <span class="tab-icon">📊</span> История
    </button>
  </div>

  <!-- ═══ SWAP РЕЖИМ ═══ -->
  <div class="exch-section" id="exchSwapSection">
    
    <!-- БАЛАНСЫ -->
    <div class="exch-balances">
      <div class="exch-balance-card">
        <span class="bal-label">GWT</span>
        <span class="bal-value" id="exchGwtBalance">0.00</span>
        <span class="bal-usd">Token</span>
      </div>
      <div class="exch-balance-card">
        <span class="bal-label">BNB</span>
        <span class="bal-value" id="exchBnbBalance">0.00</span>
        <span class="bal-usd">opBNB</span>
      </div>
      <div class="exch-balance-card exch-price-card">
        <span class="bal-label">Цена GWT</span>
        <span class="bal-value" id="exchGwtPrice">—</span>
        <span class="bal-usd">BNB</span>
      </div>
    </div>

    <!-- SWAP ФОРМА -->
    <div class="exch-swap-form">
      <div class="exch-swap-card">
        <!-- ОТ -->
        <div class="swap-from">
          <div class="swap-header">
            <span>Отдаёте</span>
            <span class="swap-max" id="swapMaxBtn">MAX</span>
          </div>
          <div class="swap-input-row">
            <input type="number" id="swapFromAmount" placeholder="0.00" class="swap-input" step="any">
            <div class="swap-token-select" id="swapFromToken">
              <span class="token-icon">🪙</span>
              <span class="token-name" id="swapFromName">GWT</span>
              <span class="token-arrow">▼</span>
            </div>
          </div>
          <div class="swap-balance-hint">
            Баланс: <span id="swapFromBalance">0.00</span>
          </div>
        </div>

        <!-- СТРЕЛКА ПЕРЕКЛЮЧЕНИЯ -->
        <div class="swap-switch-btn" id="swapSwitchBtn">
          <span>⇅</span>
        </div>

        <!-- К -->
        <div class="swap-to">
          <div class="swap-header">
            <span>Получаете</span>
          </div>
          <div class="swap-input-row">
            <input type="number" id="swapToAmount" placeholder="0.00" class="swap-input" readonly>
            <div class="swap-token-select" id="swapToToken">
              <span class="token-icon">💎</span>
              <span class="token-name" id="swapToName">BNB</span>
              <span class="token-arrow">▼</span>
            </div>
          </div>
          <div class="swap-rate-info">
            Курс: <span id="swapRateDisplay">—</span>
          </div>
        </div>
      </div>

      <!-- ДЕТАЛИ -->
      <div class="swap-details">
        <div class="swap-detail-row">
          <span>Комиссия сети:</span>
          <span>~0.0001 BNB</span>
        </div>
        <div class="swap-detail-row">
          <span>Slippage:</span>
          <span>0.5%</span>
        </div>
      </div>

      <!-- КНОПКА -->
      <button class="exch-swap-btn" id="exchSwapBtn" disabled>
        ⚠️ Подключите кошелёк
      </button>

      <!-- ИНФО -->
      <div class="exch-swap-info">
        <p>💡 Обмен GWT токенов будет доступен после подключения контракта SwapHelper.</p>
        <p>Сейчас вы можете создавать P2P объявления для торговли напрямую.</p>
      </div>
    </div>
  </div>

  <!-- ═══ P2P РЕЖИМ ═══ -->
  <div class="exch-section" id="exchP2PSection" style="display:none;">
    
    <!-- СОЗДАТЬ ОРДЕР -->
    <div class="p2p-create">
      <h3>📝 Создать объявление</h3>
      <div class="p2p-form">
        <div class="p2p-form-row">
          <div class="p2p-type-selector">
            <button class="p2p-type-btn active" data-type="sell">Продаю GWT</button>
            <button class="p2p-type-btn" data-type="buy">Покупаю GWT</button>
          </div>
        </div>
        <div class="p2p-form-row">
          <label>Количество GWT:</label>
          <input type="number" id="p2pAmount" placeholder="100" class="p2p-input">
        </div>
        <div class="p2p-form-row">
          <label>Цена за 1 GWT (BNB):</label>
          <input type="number" id="p2pPrice" placeholder="0.0001" class="p2p-input" step="any">
        </div>
        <div class="p2p-form-row">
          <label>Контакт (Telegram):</label>
          <input type="text" id="p2pContact" placeholder="@username" class="p2p-input">
        </div>
        <button class="p2p-create-btn" id="p2pCreateBtn">
          📢 Разместить объявление
        </button>
      </div>
    </div>

    <!-- СПИСОК ОРДЕРОВ -->
    <div class="p2p-orders">
      <h3>📊 Активные объявления</h3>
      <div class="p2p-filter">
        <button class="p2p-filter-btn active" data-filter="all">Все</button>
        <button class="p2p-filter-btn" data-filter="sell">Продажа</button>
        <button class="p2p-filter-btn" data-filter="buy">Покупка</button>
        <button class="p2p-filter-btn" data-filter="my">Мои</button>
      </div>
      <div class="p2p-list" id="p2pOrdersList">
        <p class="p2p-empty">Пока нет объявлений. Будьте первым! 🚀</p>
      </div>
    </div>
  </div>

  <!-- ═══ ИСТОРИЯ ═══ -->
  <div class="exch-section" id="exchHistorySection" style="display:none;">
    <div class="exch-history-empty">
      <p>📋 История обменов будет доступна после проведения первых транзакций</p>
    </div>
  </div>

</div>`;
  },

  // ═══════════════════════════════════════════════════════════════
  // ПРИВЯЗКА СОБЫТИЙ
  // ═══════════════════════════════════════════════════════════════
  bindEvents() {
    // Переключение режимов
    document.querySelectorAll('.exch-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.exch-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.switchMode(tab.dataset.mode);
      });
    });

    // Swap: ввод суммы → пересчёт
    const fromInput = document.getElementById('swapFromAmount');
    if (fromInput) {
      fromInput.addEventListener('input', () => this.calculateSwap());
    }

    // Swap: переключение пар
    const switchBtn = document.getElementById('swapSwitchBtn');
    if (switchBtn) switchBtn.addEventListener('click', () => this.switchPair());

    // Swap: MAX
    const maxBtn = document.getElementById('swapMaxBtn');
    if (maxBtn) maxBtn.addEventListener('click', () => this.setMaxAmount());

    // P2P: тип ордера
    document.querySelectorAll('.p2p-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.p2p-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // P2P: создание ордера
    const createBtn = document.getElementById('p2pCreateBtn');
    if (createBtn) createBtn.addEventListener('click', () => this.createP2POrder());

    // P2P: фильтры
    document.querySelectorAll('.p2p-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.p2p-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterP2POrders(btn.dataset.filter);
      });
    });
  },

  // ═══════════════════════════════════════════════════════════════
  // ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ
  // ═══════════════════════════════════════════════════════════════
  switchMode(mode) {
    this.state.mode = mode;
    const sections = {
      swap: 'exchSwapSection',
      p2p: 'exchP2PSection',
      history: 'exchHistorySection'
    };

    Object.values(sections).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    const active = document.getElementById(sections[mode]);
    if (active) active.style.display = 'block';
  },

  // ═══════════════════════════════════════════════════════════════
  // ОБНОВЛЕНИЕ БАЛАНСОВ UI
  // ═══════════════════════════════════════════════════════════════
  updateBalancesUI() {
    const gwtEl = document.getElementById('exchGwtBalance');
    const bnbEl = document.getElementById('exchBnbBalance');
    const priceEl = document.getElementById('exchGwtPrice');
    
    if (gwtEl) gwtEl.textContent = parseFloat(this.state.gwtBalance).toFixed(2);
    if (bnbEl) bnbEl.textContent = parseFloat(this.state.bnbBalance).toFixed(6);
    if (priceEl) priceEl.textContent = this.state.gwtPrice;

    // Обновляем баланс в swap
    const fromBal = document.getElementById('swapFromBalance');
    if (fromBal) fromBal.textContent = parseFloat(this.state.gwtBalance).toFixed(2);

    // Кнопка swap
    const swapBtn = document.getElementById('exchSwapBtn');
    if (swapBtn) {
      if (this.state.userAddress) {
        swapBtn.textContent = '🔄 Обменять';
        swapBtn.disabled = false;
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // SWAP КАЛЬКУЛЯЦИЯ
  // ═══════════════════════════════════════════════════════════════
  _swapPair: { from: 'GWT', to: 'BNB' },

  calculateSwap() {
    const fromAmount = parseFloat(document.getElementById('swapFromAmount')?.value || 0);
    const toInput = document.getElementById('swapToAmount');
    const rateDisplay = document.getElementById('swapRateDisplay');

    if (!fromAmount || fromAmount <= 0) {
      if (toInput) toInput.value = '';
      return;
    }

    const price = parseFloat(this.state.gwtPrice);
    let result;

    if (this._swapPair.from === 'GWT') {
      result = fromAmount * price;
      if (rateDisplay) rateDisplay.textContent = `1 GWT = ${price} BNB`;
    } else {
      result = price > 0 ? fromAmount / price : 0;
      if (rateDisplay) rateDisplay.textContent = `1 BNB = ${(1/price).toFixed(0)} GWT`;
    }

    if (toInput) toInput.value = result.toFixed(8);
  },

  switchPair() {
    const temp = this._swapPair.from;
    this._swapPair.from = this._swapPair.to;
    this._swapPair.to = temp;

    const fromName = document.getElementById('swapFromName');
    const toName = document.getElementById('swapToName');
    const fromIcon = document.querySelector('#swapFromToken .token-icon');
    const toIcon = document.querySelector('#swapToToken .token-icon');

    if (fromName && toName) {
      fromName.textContent = this._swapPair.from;
      toName.textContent = this._swapPair.to;
    }
    if (fromIcon && toIcon) {
      const icons = { GWT: '🪙', BNB: '💎' };
      fromIcon.textContent = icons[this._swapPair.from];
      toIcon.textContent = icons[this._swapPair.to];
    }

    // Обновляем баланс
    const fromBal = document.getElementById('swapFromBalance');
    if (fromBal) {
      fromBal.textContent = this._swapPair.from === 'GWT' 
        ? parseFloat(this.state.gwtBalance).toFixed(2)
        : parseFloat(this.state.bnbBalance).toFixed(6);
    }

    // Пересчёт
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

  // ═══════════════════════════════════════════════════════════════
  // P2P ОРДЕРА (localStorage пока нет контракта)
  // ═══════════════════════════════════════════════════════════════
  createP2POrder() {
    if (!this.state.userAddress) {
      window.GWApp?.showNotification?.('Подключите кошелёк!', 'error');
      return;
    }

    const type = document.querySelector('.p2p-type-btn.active')?.dataset.type || 'sell';
    const amount = parseFloat(document.getElementById('p2pAmount')?.value || 0);
    const price = parseFloat(document.getElementById('p2pPrice')?.value || 0);
    const contact = document.getElementById('p2pContact')?.value?.trim() || '';

    if (!amount || amount <= 0) {
      window.GWApp?.showNotification?.('Укажите количество GWT', 'error');
      return;
    }
    if (!price || price <= 0) {
      window.GWApp?.showNotification?.('Укажите цену', 'error');
      return;
    }
    if (!contact) {
      window.GWApp?.showNotification?.('Укажите контакт для связи', 'error');
      return;
    }

    const order = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      type,
      amount,
      price,
      total: (amount * price).toFixed(8),
      contact,
      wallet: this.state.userAddress.slice(0, 6) + '...' + this.state.userAddress.slice(-4),
      fullWallet: this.state.userAddress,
      timestamp: Date.now(),
      status: 'active'
    };

    this.state.p2pOrders.unshift(order);
    this.saveP2POrders();
    this.renderP2POrders();

    // Очищаем форму
    document.getElementById('p2pAmount').value = '';
    document.getElementById('p2pPrice').value = '';
    document.getElementById('p2pContact').value = '';

    window.GWApp?.showNotification?.('✅ Объявление создано!', 'success');
  },

  loadP2POrders() {
    try {
      this.state.p2pOrders = JSON.parse(localStorage.getItem('gw_p2p_orders') || '[]');
      // Убираем просроченные (старше 7 дней)
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      this.state.p2pOrders = this.state.p2pOrders.filter(o => o.timestamp > weekAgo);
      this.renderP2POrders();
    } catch (e) {
      console.warn('P2P orders load error:', e);
    }
  },

  saveP2POrders() {
    try {
      localStorage.setItem('gw_p2p_orders', JSON.stringify(this.state.p2pOrders));
    } catch (e) {
      console.warn('P2P save error:', e);
    }
  },

  filterP2POrders(filter) {
    this.renderP2POrders(filter);
  },

  renderP2POrders(filter = 'all') {
    const container = document.getElementById('p2pOrdersList');
    if (!container) return;

    let orders = this.state.p2pOrders.filter(o => o.status === 'active');
    
    if (filter === 'sell') orders = orders.filter(o => o.type === 'sell');
    if (filter === 'buy') orders = orders.filter(o => o.type === 'buy');
    if (filter === 'my') orders = orders.filter(o => o.fullWallet === this.state.userAddress);

    if (!orders.length) {
      container.innerHTML = '<p class="p2p-empty">Нет объявлений по данному фильтру</p>';
      return;
    }

    container.innerHTML = orders.map(order => {
      const isMine = order.fullWallet === this.state.userAddress;
      const date = new Date(order.timestamp).toLocaleDateString('ru-RU', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });
      return `
        <div class="p2p-order-card ${order.type}">
          <div class="p2p-order-type ${order.type}">
            ${order.type === 'sell' ? '🔴 ПРОДАЖА' : '🟢 ПОКУПКА'}
          </div>
          <div class="p2p-order-details">
            <div class="p2p-order-amount">
              <span class="p2p-amount">${order.amount} GWT</span>
              <span class="p2p-price">@ ${order.price} BNB</span>
            </div>
            <div class="p2p-order-total">
              Итого: <strong>${order.total} BNB</strong>
            </div>
            <div class="p2p-order-meta">
              <span class="p2p-wallet">${order.wallet}</span>
              <span class="p2p-date">${date}</span>
            </div>
          </div>
          <div class="p2p-order-actions">
            ${isMine 
              ? `<button class="p2p-cancel-btn" onclick="exchangeModule.cancelOrder('${order.id}')">❌ Отменить</button>`
              : `<a href="https://t.me/${order.contact.replace('@', '')}" target="_blank" class="p2p-contact-btn">💬 Связаться</a>`
            }
          </div>
        </div>
      `;
    }).join('');
  },

  cancelOrder(orderId) {
    const idx = this.state.p2pOrders.findIndex(o => o.id === orderId);
    if (idx >= 0) {
      this.state.p2pOrders[idx].status = 'cancelled';
      this.saveP2POrders();
      this.renderP2POrders();
      window.GWApp?.showNotification?.('❌ Объявление отменено', 'info');
    }
  }
};

// Экспорт
window.exchangeModule = exchangeModule;
