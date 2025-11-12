// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Tokens Module
// Токены GWT: баланс, торговля, статистика, награды
// ═══════════════════════════════════════════════════════════════════

const tokensModule = {
  // Контракты
  contracts: {},
  
  // Состояние
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
    rewards: []
  },

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('💎 Initializing Tokens...');
    
    try {
      if (!app.state.userAddress) {
        app.showNotification('Подключите кошелек', 'error');
        return;
      }

      // Загружаем контракты
      await this.loadContracts();

      // Загружаем данные
      await this.loadAllData();

      // Инициализируем UI
      this.initUI();

      console.log('✅ Tokens loaded');
    } catch (error) {
      console.error('❌ Tokens init error:', error);
      app.showNotification('Ошибка загрузки токенов', 'error');
    }
  },

  // Загрузка контрактов
  async loadContracts() {
    this.contracts.token = await app.getContract('GWTToken');
    this.contracts.globalWay = await app.getContract('GlobalWay');
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА ДАННЫХ
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

  // Баланс токенов
  async loadBalance() {
    try {
      const address = app.state.userAddress;
      const balance = await this.contracts.token.balanceOf(address);
      this.state.balance = ethers.utils.formatEther(balance);

      this.updateBalanceUI();
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  },

  // Цена токена
  async loadPrice() {
    try {
      const price = await this.contracts.token.currentPrice();
      this.state.price = ethers.utils.formatEther(price);

      // Общая стоимость
      this.state.totalValue = (
        parseFloat(this.state.balance) * parseFloat(this.state.price)
      ).toFixed(2);

      // Проверяем торговлю
      const minPrice = 0.01; // $0.01
      this.state.tradingEnabled = parseFloat(this.state.price) >= minPrice;

      this.updatePriceUI();
      this.updateTradingUI();
    } catch (error) {
      console.error('Error loading price:', error);
    }
  },

  // Статистика токенов
  async loadStatistics() {
    try {
      // Total Supply
      const totalSupply = await this.contracts.token.totalSupply();
      this.state.stats.totalSupply = ethers.utils.formatEther(totalSupply);

      // Circulating Supply
      const circulating = ethers.BigNumber.from(0); // TODO: add to contract
      this.state.stats.circulating = ethers.utils.formatEther(circulating);

      // Burned
      const burned = await this.contracts.token.totalBurned();
      this.state.stats.burned = ethers.utils.formatEther(burned);

      // Market Cap
      const marketCap = await this.contracts.token.realCapitalization();
      this.state.stats.marketCap = ethers.utils.formatEther(marketCap);

      this.updateStatsUI();
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  },

  // Награды за уровни
  async loadRewards() {
    try {
      const address = app.state.userAddress;
      const rewards = [];

      for (let level = 1; level <= 12; level++) {
        const isActive = await this.contracts.globalWay.isLevelActive(address, level);
        const reward = CONFIG.TOKEN_REWARDS[level - 1];

        rewards.push({
          level,
          reward,
          unlocked: isActive
        });
      }

      this.state.rewards = rewards;
      this.updateRewardsUI();
    } catch (error) {
      console.error('Error loading rewards:', error);
    }
  },

  // История токенов
  async loadHistory() {
    try {
      const tableBody = document.getElementById('tokenHistoryTable');
      if (!tableBody) return;

      tableBody.innerHTML = '<tr><td colspan="5" class="no-data">Загрузка...</td></tr>';

      const events = await this.getTokenEvents();

      if (events.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="no-data">Нет транзакций</td></tr>';
        return;
      }

      tableBody.innerHTML = events.map(event => `
        <tr>
          <td>${event.date}</td>
          <td><span class="badge badge-${event.type}">${event.typeLabel}</span></td>
          <td>${event.level || '-'}</td>
          <td>${event.amount}</td>
          <td><span class="badge badge-${event.status}">${event.statusLabel}</span></td>
        </tr>
      `).join('');
    } catch (error) {
      console.error('Error loading history:', error);
    }
  },

  // Получение событий токенов
  async getTokenEvents() {
    const address = app.state.userAddress;
    const events = [];

    try {
      // События Transfer (получение токенов)
      const transferFilter = this.contracts.token.filters.Transfer(null, address);
      const transferEvents = await this.contracts.token.queryFilter(transferFilter, -10000);

      for (const event of transferEvents) {
        const block = await event.getBlock();
        
        // Определяем тип (награда за уровень или покупка)
        const amount = ethers.utils.formatEther(event.args.value);
        const isReward = CONFIG.TOKEN_REWARDS.includes(Number(amount));

        events.push({
          date: new Date(block.timestamp * 1000).toLocaleDateString(),
          type: isReward ? 'reward' : 'buy',
          typeLabel: isReward ? 'Награда' : 'Покупка',
          level: isReward ? this.getLevelByReward(amount) : '-',
          amount: `${app.formatNumber(amount, 2)} GWT`,
          status: 'success',
          statusLabel: 'Завершено'
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

  // ═══════════════════════════════════════════════════════════════
  // ТОРГОВЛЯ
  // ═══════════════════════════════════════════════════════════════
  async buyTokens() {
    if (!await app.checkNetwork()) return;
    if (!this.state.tradingEnabled) {
      app.showNotification('Торговля еще не активна', 'error');
      return;
    }

    const amountInput = document.getElementById('tradeAmount');
    if (!amountInput || !amountInput.value) {
      app.showNotification('Введите количество токенов', 'error');
      return;
    }

    const amount = parseFloat(amountInput.value);
    if (amount <= 0) {
      app.showNotification('Неверное количество', 'error');
      return;
    }

    try {
      app.showNotification('Покупка токенов...', 'info');

      // Расчет стоимости
      const cost = (amount * parseFloat(this.state.price)).toFixed(6);

      const contract = await app.getSignedContract('GWTToken');
      const tx = await contract.buyTokens({
        value: ethers.utils.parseEther(cost)
      });

      app.showNotification('Ожидание подтверждения...', 'info');
      await tx.wait();

      app.showNotification('Токены куплены! 🎉', 'success');
      
      await this.refresh();
    } catch (error) {
      console.error('Buy tokens error:', error);
      if (error.code === 4001) {
        app.showNotification('Транзакция отклонена', 'error');
      } else {
        app.showNotification('Ошибка покупки', 'error');
      }
    }
  },

  async sellTokens() {
    if (!await app.checkNetwork()) return;
    if (!this.state.tradingEnabled) {
      app.showNotification('Торговля еще не активна', 'error');
      return;
    }

    const amountInput = document.getElementById('tradeAmount');
    if (!amountInput || !amountInput.value) {
      app.showNotification('Введите количество токенов', 'error');
      return;
    }

    const amount = parseFloat(amountInput.value);
    if (amount <= 0) {
      app.showNotification('Неверное количество', 'error');
      return;
    }

    if (amount > parseFloat(this.state.balance)) {
      app.showNotification('Недостаточно токенов', 'error');
      return;
    }

    try {
      app.showNotification('Продажа токенов...', 'info');

      const contract = await app.getSignedContract('GWTToken');
      const tx = await contract.sellTokens(ethers.utils.parseEther(amount.toString()));

      app.showNotification('Ожидание подтверждения...', 'info');
      await tx.wait();

      app.showNotification('Токены проданы! 🎉', 'success');
      
      await this.refresh();
    } catch (error) {
      console.error('Sell tokens error:', error);
      if (error.code === 4001) {
        app.showNotification('Транзакция отклонена', 'error');
      } else {
        app.showNotification('Ошибка продажи', 'error');
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ОБНОВЛЕНИЕ UI
  // ═══════════════════════════════════════════════════════════════
  updateBalanceUI() {
    document.getElementById('totalTokens').textContent = `${app.formatNumber(this.state.balance, 2)} GWT`;
  },

  updatePriceUI() {
    document.getElementById('currentPrice').textContent = `$${this.state.price}`;
    document.getElementById('totalValue').textContent = `$${this.state.totalValue}`;
  },

  updateTradingUI() {
    const tradingSection = document.getElementById('tradingSection');
    if (!tradingSection) return;

    const statusIndicator = tradingSection.querySelector('.status-indicator');
    const statusText = tradingSection.querySelector('.status-text');
    const controls = tradingSection.querySelector('.trading-controls');
    const buyBtn = document.getElementById('buyBtn');
    const sellBtn = document.getElementById('sellBtn');
    const amountInput = document.getElementById('tradeAmount');

    if (this.state.tradingEnabled) {
      statusIndicator.classList.remove('disabled');
      statusIndicator.classList.add('enabled');
      statusText.textContent = 'Активна';
      controls.style.opacity = '1';
      
      if (buyBtn) buyBtn.disabled = false;
      if (sellBtn) sellBtn.disabled = false;
      if (amountInput) amountInput.disabled = false;
    } else {
      statusIndicator.classList.remove('enabled');
      statusIndicator.classList.add('disabled');
      statusText.textContent = 'Неактивна';
      controls.style.opacity = '0.5';
      
      if (buyBtn) buyBtn.disabled = true;
      if (sellBtn) sellBtn.disabled = true;
      if (amountInput) amountInput.disabled = true;
    }
  },

  updateStatsUI() {
    const { totalSupply, circulating, burned, marketCap } = this.state.stats;

    document.getElementById('totalSupply').textContent = 
      `${app.formatNumber(parseFloat(totalSupply) / 1000000, 2)}M GWT`;
    document.getElementById('circSupply').textContent = 
      `${app.formatNumber(parseFloat(circulating) / 1000000, 2)}M GWT`;
    document.getElementById('burnedTokens').textContent = 
      `${app.formatNumber(burned, 2)} GWT`;
    document.getElementById('marketCap').textContent = 
      `$${app.formatNumber(marketCap, 0)}`;
  },

  updateRewardsUI() {
    const container = document.getElementById('levelRewards');
    if (!container) return;

    container.innerHTML = this.state.rewards.map(reward => `
      <div class="reward-item ${reward.unlocked ? 'unlocked' : 'locked'}">
        <div class="reward-level">Уровень ${reward.level}</div>
        <div class="reward-amount">${reward.reward} GWT</div>
        <div class="reward-status">
          ${reward.unlocked ? '✓ Разблокировано' : '🔒 Заблокировано'}
        </div>
      </div>
    `).join('');

    // Общая сумма
    const total = this.state.rewards.reduce((sum, r) => sum + r.reward, 0);
    document.getElementById('totalPossibleRewards').textContent = `${app.formatNumber(total, 0)} GWT`;
  },

  // ═══════════════════════════════════════════════════════════════
  // UI ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  initUI() {
    // Кнопка покупки
    const buyBtn = document.getElementById('buyBtn');
    if (buyBtn) {
      buyBtn.onclick = () => this.buyTokens();
    }

    // Кнопка продажи
    const sellBtn = document.getElementById('sellBtn');
    if (sellBtn) {
      sellBtn.onclick = () => this.sellTokens();
    }

    // Расчет стоимости при вводе
    const amountInput = document.getElementById('tradeAmount');
    if (amountInput) {
      amountInput.oninput = () => this.calculateTradeCost();
    }

    // Добавить в кошелек
    const addToWalletBtn = document.getElementById('addToWallet');
    if (addToWalletBtn) {
      addToWalletBtn.onclick = () => this.addTokenToWallet();
    }

    // Просмотр в Explorer
    const viewExplorerBtn = document.getElementById('viewExplorer');
    if (viewExplorerBtn) {
      viewExplorerBtn.onclick = () => {
        const tokenAddress = CONFIG.CONTRACTS.GWTToken;
        window.open(`${CONFIG.NETWORK.explorer}/token/${tokenAddress}`, '_blank');
      };
    }

    // Фильтр истории
    const filterSelect = document.getElementById('tokenHistoryFilter');
    if (filterSelect) {
      filterSelect.onchange = () => this.filterHistory();
    }

    // Обновление истории
    const refreshBtn = document.getElementById('refreshTokenHistory');
    if (refreshBtn) {
      refreshBtn.onclick = () => this.loadHistory();
    }

    // Копирование адреса контракта
    const copyBtns = document.querySelectorAll('.copy-btn[data-copy]');
    copyBtns.forEach(btn => {
      btn.onclick = () => {
        const text = btn.getAttribute('data-copy');
        app.copyToClipboard(text);
      };
    });
  },

  // Расчет стоимости торговли
  calculateTradeCost() {
    const amountInput = document.getElementById('tradeAmount');
    const costDisplay = document.getElementById('tradeCost');
    const newPriceDisplay = document.getElementById('newPrice');

    if (!amountInput || !costDisplay) return;

    const amount = parseFloat(amountInput.value) || 0;
    const cost = (amount * parseFloat(this.state.price)).toFixed(6);
    
    costDisplay.textContent = `${cost} BNB`;
    
    if (newPriceDisplay) {
      // Новая цена после покупки/продажи (примерно)
      newPriceDisplay.textContent = `$${this.state.price}`;
    }
  },

  // Добавить токен в кошелек
  async addTokenToWallet() {
    try {
      if (!window.ethereum) {
        app.showNotification('Кошелек не найден', 'error');
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

      app.showNotification('Токен добавлен в кошелек! ✓', 'success');
    } catch (error) {
      console.error('Error adding token:', error);
      app.showNotification('Ошибка добавления токена', 'error');
    }
  },

  // Фильтрация истории
  filterHistory() {
    const filterValue = document.getElementById('tokenHistoryFilter').value;
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

  // ═══════════════════════════════════════════════════════════════
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ═══════════════════════════════════════════════════════════════
  getLevelByReward(amount) {
    const index = CONFIG.TOKEN_REWARDS.indexOf(Number(amount));
    return index !== -1 ? index + 1 : '-';
  },

  // Обновление данных
  async refresh() {
    await this.loadAllData();
  }
};

// Экспорт в window
window.tokensModule = tokensModule;
