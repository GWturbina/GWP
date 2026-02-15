// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Tokens Module - ИСПРАВЛЕННАЯ ВЕРСИЯ
// Токены GWT: баланс, торговля, статистика, награды
// Date: 2025-01-19 - FIXED
// ═══════════════════════════════════════════════════════════════════

const tokensModule = {
  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  contracts: {},
  
  state: {
    balance: '0',
    price: '0',
    totalValue: '0',
    tradingEnabled: false,
    stats: {
      totalSupply: '0',
      circulating: '0',
      burned: '0',
      marketCap: '0'
    },
    rewards: {
      levels: [],
      total: 0
    },
    history: []
  },

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('💎 Initializing Tokens...');
    
    try {
      if (!app.state.userAddress) {
        console.log('⚠️ No user address');
        return;
      }

      await this.loadContracts();
      await this.loadAllData();
      this.initUI();

      console.log('✅ Tokens loaded');
    } catch (error) {
      console.error('❌ Tokens init error:', error);
      app.showNotification(_t('notifications.tokensError'), 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА КОНТРАКТОВ
  // ═══════════════════════════════════════════════════════════════
  async loadContracts() {
    console.log('📥 Loading contracts for tokens...');
    
    this.contracts.token = await app.getContract('GWTToken');
    this.contracts.globalWay = await app.getContract('GlobalWay');
    this.contracts.matrixRegistry = await app.getContract('MatrixRegistry');
    
    console.log('✅ All token contracts loaded');
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА ВСЕХ ДАННЫХ
  // ═══════════════════════════════════════════════════════════════
  async loadAllData() {
    await Promise.all([
      this.loadBalance(),
      this.loadPrice(),
      this.loadStatistics(),
      this.loadRewards(),
      this.loadHistory()
    ]);
  },

  // ═══════════════════════════════════════════════════════════════
  // БАЛАНС ТОКЕНОВ
  // ═══════════════════════════════════════════════════════════════
  async loadBalance() {
    try {
      console.log('💰 Loading token balance...');
      
      const address = app.state.userAddress;
      const balance = await this.contracts.token.balanceOf(address);
      this.state.balance = ethers.utils.formatEther(balance);

      console.log('✅ Balance:', this.state.balance, 'GWT');
      
      this.updateBalanceUI();
      
    } catch (error) {
      console.error('❌ Error loading balance:', error);
      this.state.balance = '0';
      this.updateBalanceUI();
    }
  },

  updateBalanceUI() {
    const balanceEl = document.getElementById('totalTokens');
    if (balanceEl) {
      balanceEl.textContent = `${app.formatNumber(this.state.balance, 2)} GWT`;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЦЕНА ТОКЕНА
  // ═══════════════════════════════════════════════════════════════
  async loadPrice() {
    try {
      console.log('💵 Loading token price...');
      
      // Пытаемся получить цену из контракта
      try {
        const price = await this.contracts.token.currentPrice();
        this.state.price = ethers.utils.formatEther(price);
      } catch (e) {
        // Если функция currentPrice не существует, используем фиксированную цену
        this.state.price = '0.001';
      }

      // Общая стоимость
      this.state.totalValue = (
        parseFloat(this.state.balance) * parseFloat(this.state.price)
      ).toFixed(2);

      // Проверяем торговлю (активна при цене >= $0.01)
      const minPrice = 0.01;
      this.state.tradingEnabled = parseFloat(this.state.price) >= minPrice;

      console.log('✅ Price:', this.state.price);
      
      this.updatePriceUI();
      this.updateTradingUI();
      
    } catch (error) {
      console.error('❌ Error loading price:', error);
      this.state.price = '0.001';
      this.state.totalValue = '0';
      this.updatePriceUI();
    }
  },

  updatePriceUI() {
    const priceEl = document.getElementById('currentPrice');
    const valueEl = document.getElementById('totalValue');

    if (priceEl) {
      priceEl.textContent = `$${this.state.price}`;
    }
    
    if (valueEl) {
      valueEl.textContent = `$${this.state.totalValue}`;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // СТАТИСТИКА ТОКЕНОВ
  // ═══════════════════════════════════════════════════════════════
  async loadStatistics() {
    try {
      console.log('📊 Loading token statistics...');

      // Total Supply
      const totalSupply = await this.contracts.token.totalSupply();
      this.state.stats.totalSupply = ethers.utils.formatEther(totalSupply);

      // Burned tokens
      try {
        const burnedBalance = await this.contracts.token.balanceOf(
          ethers.constants.AddressZero
        );
        this.state.stats.burned = ethers.utils.formatEther(burnedBalance);
      } catch (e) {
        this.state.stats.burned = '0';
      }

      // Circulating supply (можно рассчитать через события Transfer)
      // Пока используем 0, потом можно добавить точный подсчет
      this.state.stats.circulating = '0';

      // Market Cap
      this.state.stats.marketCap = (
        parseFloat(this.state.stats.circulating) * parseFloat(this.state.price)
      ).toFixed(0);

      console.log('✅ Statistics loaded');
      
      this.updateStatisticsUI();
      
    } catch (error) {
      console.error('❌ Error loading statistics:', error);
      this.updateStatisticsUI();
    }
  },

  updateStatisticsUI() {
    const { totalSupply, circulating, burned, marketCap } = this.state.stats;

    // Общий запас
    const totalEl = document.getElementById('tokenTotalSupply');
    if (totalEl) {
      const totalM = (parseFloat(totalSupply) / 1000000).toFixed(0);
      totalEl.textContent = `${totalM}M GWT`;
    }

    // В обороте
    const circEl = document.getElementById('tokenCirculating');
    if (circEl) {
      const circM = (parseFloat(circulating) / 1000000).toFixed(0);
      circEl.textContent = `${circM}M GWT`;
    }

    // Сожжено
    const burnedEl = document.getElementById('tokenBurned');
    if (burnedEl) {
      burnedEl.textContent = `${app.formatNumber(burned, 0)} GWT`;
    }

    // Капитализация
    const capEl = document.getElementById('tokenMarketCap');
    if (capEl) {
      capEl.textContent = `$${marketCap}`;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // НАГРАДЫ ПО УРОВНЯМ
  // ═══════════════════════════════════════════════════════════════
  async loadRewards() {
    try {
      console.log('🎁 Loading rewards...');

      const address = app.state.userAddress;
      const rewards = [];
      let totalPossible = 0;

      // Получаем максимальный уровень пользователя
      const maxLevel = await this.contracts.globalWay.getUserMaxLevel(address);

      // Загружаем награды для всех 12 уровней
      for (let level = 1; level <= 12; level++) {
        const rewardAmount = CONFIG.TOKEN_REWARDS[level - 1];
        totalPossible += rewardAmount;

        // Проверяем активен ли уровень
        let isUnlocked = false;
        try {
          isUnlocked = await this.contracts.globalWay.isLevelActive(address, level);
        } catch (e) {
          // Если функция не существует, проверяем через maxLevel
          isUnlocked = level <= maxLevel;
        }

        rewards.push({
          level,
          amount: rewardAmount,
          unlocked: isUnlocked
        });
      }

      this.state.rewards = {
        levels: rewards,
        total: totalPossible
      };

      console.log('✅ Rewards loaded');
      
      this.renderRewards();
      
    } catch (error) {
      console.error('❌ Error loading rewards:', error);
      this.renderRewards();
    }
  },

  renderRewards() {
    const container = document.getElementById('tokenRewards');
    if (!container) return;

    const { levels, total } = this.state.rewards;

    if (!levels || levels.length === 0) {
      // Если нет данных, показываем дефолтные
      const defaultRewards = CONFIG.TOKEN_REWARDS.map((amount, index) => ({
        level: index + 1,
        amount,
        unlocked: false
      }));

      container.innerHTML = defaultRewards.map(r => `
        <div class="reward-card ${r.unlocked ? 'unlocked' : ''}">
          <div class="reward-level">Level ${r.level}</div>
          <div class="reward-amount">${r.amount} GWT</div>
          ${r.unlocked ? '<div class="reward-check">✓</div>' : ''}
          <div class="reward-status">${r.unlocked ? 'UNLOCKED' : 'LOCKED'}</div>
        </div>
      `).join('');

      const totalEl = document.getElementById('totalPossibleRewards');
      if (totalEl) {
        const defaultTotal = CONFIG.TOKEN_REWARDS.reduce((a, b) => a + b, 0);
        totalEl.textContent = `${app.formatNumber(defaultTotal, 0)} GWT`;
      }
      
      return;
    }

    // Рендерим награды
    container.innerHTML = levels.map(r => `
      <div class="reward-card ${r.unlocked ? 'unlocked' : ''}">
        <div class="reward-level">Level ${r.level}</div>
        <div class="reward-amount">${r.amount} GWT</div>
        ${r.unlocked ? '<div class="reward-check">✓</div>' : ''}
        <div class="reward-status">${r.unlocked ? 'UNLOCKED' : 'LOCKED'}</div>
      </div>
    `).join('');

    // Total Possible Rewards
    const totalEl = document.getElementById('totalPossibleRewards');
    if (totalEl) {
      totalEl.textContent = `${app.formatNumber(total, 0)} GWT`;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ИСТОРИЯ ТОКЕНОВ
  // ═══════════════════════════════════════════════════════════════
  async loadHistory() {
    try {
      console.log('📜 Loading token history...');

      const address = app.state.userAddress;
      const events = await this.getTokenEvents(address);
      
      this.state.history = events;
      
      this.renderHistory();
      
    } catch (error) {
      console.error('❌ Error loading history:', error);
      this.renderHistory();
    }
  },

  async getTokenEvents(address) {
    try {
      // Получаем события Transfer (входящие и исходящие)
      const filterFrom = this.contracts.token.filters.Transfer(address, null);
      const filterTo = this.contracts.token.filters.Transfer(null, address);

      const eventsFrom = await this.contracts.token.queryFilter(filterFrom, -10000);
      const eventsTo = await this.contracts.token.queryFilter(filterTo, -10000);

      const allEvents = [...eventsFrom, ...eventsTo];
      const events = [];

      for (const event of allEvents) {
        const block = await event.getBlock();
        const amount = ethers.utils.formatEther(event.args.value);
        
        // Определяем тип: награда или покупка/продажа
        const isReward = CONFIG.TOKEN_REWARDS.includes(Math.round(parseFloat(amount)));

        events.push({
          date: new Date(block.timestamp * 1000).toLocaleDateString(),
          type: isReward ? 'reward' : 'transfer',
          typeLabel: isReward ? 'Reward' : 'Transfer',
          level: isReward ? this.getLevelByReward(amount) : '-',
          amount: `${app.formatNumber(amount, 2)} GWT`,
          status: 'success',
          statusLabel: 'Completed'
        });
      }

      // Сортируем по дате
      events.sort((a, b) => new Date(b.date) - new Date(a.date));

      return events.slice(0, 50);
      
    } catch (error) {
      console.error('Error getting token events:', error);
      return [];
    }
  },

  renderHistory() {
    const tableBody = document.getElementById('tokenHistoryTable');
    if (!tableBody) return;

    if (!this.state.history || this.state.history.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" class="no-data">No transactions</td></tr>';
      return;
    }

    tableBody.innerHTML = this.state.history.map(h => `
      <tr>
        <td>${h.date}</td>
        <td><span class="badge badge-${h.type}">${h.typeLabel}</span></td>
        <td>${h.level}</td>
        <td>${h.amount}</td>
        <td><span class="badge badge-${h.status}">${h.statusLabel}</span></td>
      </tr>
    `).join('');
  },

  // ═══════════════════════════════════════════════════════════════
  // ТОРГОВЛЯ ТОКЕНАМИ
  // ═══════════════════════════════════════════════════════════════
  async buyTokens() {
    if (!await app.checkNetwork()) return;
    
    if (!this.state.tradingEnabled) {
      app.showNotification('Trading not active yet. Price must reach $0.01', 'error');
      return;
    }

    const amountInput = document.getElementById('tradeAmount');
    if (!amountInput || !amountInput.value) {
      app.showNotification('Enter token amount', 'error');
      return;
    }

    const amount = parseFloat(amountInput.value);
    if (amount <= 0) {
      app.showNotification('Invalid amount', 'error');
      return;
    }

    try {
      app.showNotification('Buying tokens...', 'info');

      // Расчет стоимости
      const cost = (amount * parseFloat(this.state.price)).toFixed(6);

      const contract = await app.getSignedContract('GWTToken');
      
      // Проверяем существует ли функция buyTokens
      let tx;
      try {
        tx = await contract.buyTokens({
          value: ethers.utils.parseEther(cost),
          gasLimit: CONFIG.GAS.transaction
        });
      } catch (e) {
        app.showNotification('Buy function not available', 'error');
        return;
      }

      app.showNotification('Waiting for confirmation...', 'info');
      await tx.wait();

      app.showNotification('Tokens bought! 🎉', 'success');
      
      await this.refresh();
      
    } catch (error) {
      console.error('Buy tokens error:', error);
      if (error.code === 4001) {
        app.showNotification(_t ? _t('notifications.txRejected') : 'Transaction rejected', 'error');
      } else {
        app.showNotification(_t ? _t('notifications.buyError') : 'Purchase error', 'error');
      }
    }
  },

  async sellTokens() {
    if (!await app.checkNetwork()) return;
    
    if (!this.state.tradingEnabled) {
      app.showNotification('Trading not active yet. Price must reach $0.01', 'error');
      return;
    }

    const amountInput = document.getElementById('tradeAmount');
    if (!amountInput || !amountInput.value) {
      app.showNotification('Enter token amount', 'error');
      return;
    }

    const amount = parseFloat(amountInput.value);
    if (amount <= 0) {
      app.showNotification('Invalid amount', 'error');
      return;
    }

    if (amount > parseFloat(this.state.balance)) {
      app.showNotification('Insufficient tokens', 'error');
      return;
    }

    try {
      app.showNotification('Selling tokens...', 'info');

      const contract = await app.getSignedContract('GWTToken');
      
      // Проверяем существует ли функция sellTokens
      let tx;
      try {
        tx = await contract.sellTokens(
          ethers.utils.parseEther(amount.toString()),
          { gasLimit: CONFIG.GAS.transaction }
        );
      } catch (e) {
        app.showNotification('Sell function not available', 'error');
        return;
      }

      app.showNotification('Waiting for confirmation...', 'info');
      await tx.wait();

      app.showNotification('Tokens sold! 🎉', 'success');
      
      await this.refresh();
      
    } catch (error) {
      console.error('Sell tokens error:', error);
      if (error.code === 4001) {
        app.showNotification(_t ? _t('notifications.txRejected') : 'Transaction rejected', 'error');
      } else {
        app.showNotification('Sell error', 'error');
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // UI ОБНОВЛЕНИЕ
  // ═══════════════════════════════════════════════════════════════
  updateTradingUI() {
    const statusEl = document.getElementById('tradingStatus');
    const statusTextEl = document.getElementById('tradingStatusText');
    const buyBtn = document.getElementById('buyBtn');
    const sellBtn = document.getElementById('sellBtn');
    const amountInput = document.getElementById('tradeAmount');

    if (this.state.tradingEnabled) {
      if (statusEl) {
        statusEl.classList.remove('status-inactive');
        statusEl.classList.add('status-active');
      }
      
      if (statusTextEl) {
        statusTextEl.textContent = 'Active';
      }
      
      if (buyBtn) buyBtn.disabled = false;
      if (sellBtn) sellBtn.disabled = false;
      if (amountInput) amountInput.disabled = false;
      
    } else {
      if (statusEl) {
        statusEl.classList.remove('status-active');
        statusEl.classList.add('status-inactive');
      }
      
      if (statusTextEl) {
        statusTextEl.textContent = 'Inactive';
      }
      
      if (buyBtn) buyBtn.disabled = true;
      if (sellBtn) sellBtn.disabled = true;
      if (amountInput) amountInput.disabled = true;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // UI ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  initUI() {
    console.log('🎨 Initializing Tokens UI...');

    // Кнопки торговли
    const buyBtn = document.getElementById('buyBtn');
    const sellBtn = document.getElementById('sellBtn');
    
    if (buyBtn) {
      buyBtn.onclick = () => this.buyTokens();
    }
    
    if (sellBtn) {
      sellBtn.onclick = () => this.sellTokens();
    }

    // Input для торговли
    const amountInput = document.getElementById('tradeAmount');
    if (amountInput) {
      amountInput.addEventListener('input', () => this.calculateTradeCost());
    }

    // Фильтр истории
    const filterEl = document.getElementById('tokenHistoryFilter');
    if (filterEl) {
      filterEl.onchange = () => this.filterHistory();
    }

    // Кнопка обновления
    const refreshBtn = document.getElementById('refreshTokenHistory');
    if (refreshBtn) {
      refreshBtn.onclick = () => this.loadHistory();
    }

    // Кнопка добавления токена в кошелек
    const addTokenBtn = document.getElementById('addTokenToWallet');
    if (addTokenBtn) {
      addTokenBtn.onclick = () => this.addTokenToWallet();
    }

    // Пулы токенов
    this.renderPools();

    // Статус торговли
    this.updateTradingUI();
  },

  // ═══════════════════════════════════════════════════════════════
  // ПУЛЫ ТОКЕНОВ
  // ═══════════════════════════════════════════════════════════════
  renderPools() {
    const container = document.getElementById('tokenPools');
    if (!container) return;

    container.innerHTML = `
      <div class="pool-item">
        <span class="pool-name">Tokenomics Pool 80% (800M GWT)</span>
        <span class="pool-status status-soon">Soon</span>
      </div>
      
      <div class="pool-item">
        <span class="pool-name">Distribution Pool 10% (100M GWT)</span>
        <span class="pool-status status-soon">Soon</span>
      </div>
      
      <div class="pool-item">
        <span class="pool-name">Team Pool 5% (50M GWT)</span>
        <span class="pool-status status-locked">Locked</span>
      </div>
      
      <div class="pool-item">
        <span class="pool-name">Reserve Pool 5% (50M GWT)</span>
        <span class="pool-status status-soon">Soon</span>
      </div>
    `;
  },

  // ═══════════════════════════════════════════════════════════════
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ═══════════════════════════════════════════════════════════════
  calculateTradeCost() {
    const amountInput = document.getElementById('tradeAmount');
    const costDisplay = document.getElementById('tradeCost');
    const newPriceDisplay = document.getElementById('newPrice');

    if (!amountInput || !costDisplay) return;

    const amount = parseFloat(amountInput.value) || 0;
    const cost = (amount * parseFloat(this.state.price)).toFixed(6);
    
    costDisplay.textContent = `${cost} BNB`;
    
    if (newPriceDisplay) {
      newPriceDisplay.textContent = `$${this.state.price}`;
    }
  },

  async addTokenToWallet() {
    try {
      if (!window.ethereum) {
        app.showNotification('Wallet not found', 'error');
        return;
      }

      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: CONFIG.CONTRACTS.GWTToken,
            symbol: 'GWT',
            decimals: 18,
            image: `${window.location.origin}/assets/icons/logo-32x32.png`
          }
        }
      });

      app.showNotification('Token added to wallet! ✓', 'success');
      
    } catch (error) {
      console.error('Error adding token:', error);
      app.showNotification('Error adding token', 'error');
    }
  },

  filterHistory() {
    const filterValue = document.getElementById('tokenHistoryFilter')?.value;
    if (!filterValue) return;

    const rows = document.querySelectorAll('#tokenHistoryTable tr');

    rows.forEach(row => {
      if (filterValue === 'all') {
        row.style.display = '';
      } else {
        const badge = row.querySelector(`.badge-${filterValue}`);
        row.style.display = badge ? '' : 'none';
      }
    });
  },

  getLevelByReward(amount) {
    const roundedAmount = Math.round(parseFloat(amount));
    const index = CONFIG.TOKEN_REWARDS.indexOf(roundedAmount);
    return index !== -1 ? index + 1 : '-';
  },

  // ═══════════════════════════════════════════════════════════════
  // ОБНОВЛЕНИЕ ДАННЫХ
  // ═══════════════════════════════════════════════════════════════
  async refresh() {
    console.log('🔄 Refreshing tokens data...');
    await this.loadAllData();
  }
};

// Экспорт в window
window.tokensModule = tokensModule;
