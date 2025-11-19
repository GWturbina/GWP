// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Tokens Module  
// Токеномика GWT: баланс, торговля, пулы, награды, стейкинг
// СОЗДАН С НУЛЯ под новые контракты
// Date: 2025-01-19
// ═══════════════════════════════════════════════════════════════════

const tokensModule = {
  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  contracts: {},
  
  state: {
    balance: '0',
    totalValue: 0,
    tokenPrice: 0.001,
    
    tokenomics: {
      totalSupply: 1000000000,    // 1B GWT
      inCirculation: 0,
      burned: 0,
      marketCap: 0
    },
    
    pools: {
      tokenomics: { amount: 800000000, percent: 80, status: 'soon' },
      distribution: { amount: 100000000, percent: 10, status: 'soon' },
      team: { amount: 50000000, percent: 5, status: 'locked' },
      reserve: { amount: 50000000, percent: 5, status: 'soon' }
    },
    
    trading: {
      isActive: false,
      activationPrice: 0.01,
      amount: 0,
      cost: 0,
      newPrice: 0
    },
    
    rewards: {
      earned: 0,
      available: 0,
      claimed: 0
    },
    
    history: [],
    
    staking: {
      isActive: false,
      staked: 0,
      rewards: 0,
      apy: 0
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('🪙 Initializing Tokens...');
    
    try {
      if (!app.state.userAddress) {
        console.log('⚠️ No user address');
        return;
      }

      await this.loadContracts();
      await this.loadAllData();
      this.initUI();
      this.renderRewards();

      console.log('✅ Tokens loaded');
    } catch (error) {
      console.error('❌ Tokens init error:', error);
      app.showNotification('Ошибка загрузки токенов', 'error');
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
      this.loadTokenomics(),
      this.loadRewards(),
      this.loadHistory()
    ]);
  },

  // ═══════════════════════════════════════════════════════════════
  // БАЛАНС ТОКЕНОВ
  // ═══════════════════════════════════════════════════════════════
  async loadBalance() {
    try {
      const address = app.state.userAddress;
      console.log('💰 Loading token balance...');

      // Баланс токенов
      const balance = await this.contracts.token.balanceOf(address);
      this.state.balance = ethers.utils.formatEther(balance);

      // Цена токена (можно получить из контракта или API)
      // Пока используем фиксированную цену
      this.state.tokenPrice = 0.001;

      // Общая стоимость
      this.state.totalValue = parseFloat(this.state.balance) * this.state.tokenPrice;

      console.log('✅ Balance loaded:', this.state.balance, 'GWT');
      
      this.updateBalanceUI();
      
    } catch (error) {
      console.error('❌ Error loading balance:', error);
      this.state.balance = '0';
      this.state.totalValue = 0;
      this.updateBalanceUI();
    }
  },

  updateBalanceUI() {
    const balanceEl = document.getElementById('tokenBalance');
    const valueEl = document.getElementById('tokenValue');
    const priceEl = document.getElementById('tokenPrice');

    if (balanceEl) {
      balanceEl.textContent = `${app.formatNumber(this.state.balance, 2)} GWT`;
    }
    
    if (valueEl) {
      valueEl.textContent = `$${this.state.totalValue.toFixed(2)}`;
    }
    
    if (priceEl) {
      priceEl.textContent = `$${this.state.tokenPrice.toFixed(4)}`;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ТОКЕНОМИКА
  // ═══════════════════════════════════════════════════════════════
  async loadTokenomics() {
    try {
      console.log('📊 Loading tokenomics...');

      // Total Supply
      const totalSupply = await this.contracts.token.totalSupply();
      this.state.tokenomics.totalSupply = Number(ethers.utils.formatEther(totalSupply));

      // Burned tokens
      try {
        const burnedBalance = await this.contracts.token.balanceOf(ethers.constants.AddressZero);
        this.state.tokenomics.burned = Number(ethers.utils.formatEther(burnedBalance));
      } catch (e) {
        this.state.tokenomics.burned = 0;
      }

      // Circulation (можно посчитать через события Transfer)
      this.state.tokenomics.inCirculation = 0; // TODO: рассчитать

      // Market Cap
      this.state.tokenomics.marketCap = 
        this.state.tokenomics.inCirculation * this.state.tokenPrice;

      console.log('✅ Tokenomics loaded');
      
      this.updateTokenomicsUI();
      
    } catch (error) {
      console.error('❌ Error loading tokenomics:', error);
      this.updateTokenomicsUI();
    }
  },

  updateTokenomicsUI() {
    const { totalSupply, inCirculation, burned, marketCap } = this.state.tokenomics;

    const totalEl = document.getElementById('totalSupply');
    const circulationEl = document.getElementById('inCirculation');
    const burnedEl = document.getElementById('tokensBurned');
    const capEl = document.getElementById('marketCap');

    if (totalEl) {
      totalEl.textContent = `${(totalSupply / 1000000).toFixed(0)}M GWT`;
    }
    
    if (circulationEl) {
      circulationEl.textContent = `${(inCirculation / 1000000).toFixed(0)}M GWT`;
    }
    
    if (burnedEl) {
      burnedEl.textContent = `${app.formatNumber(burned, 0)} GWT`;
    }
    
    if (capEl) {
      capEl.textContent = `$${marketCap.toFixed(0)}`;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПУЛЫ ТОКЕНОВ
  // ═══════════════════════════════════════════════════════════════
  renderPools() {
    const container = document.getElementById('tokenPools');
    if (!container) return;

    const poolsHTML = `
      <div class="pool-item">
        <div class="pool-header">
          <span class="pool-name">Пул токеномики 80% (800M GWT)</span>
          <span class="pool-status status-soon">Soon</span>
        </div>
      </div>
      
      <div class="pool-item">
        <div class="pool-header">
          <span class="pool-name">Пул раздачи 10% (100M GWT)</span>
          <span class="pool-status status-soon">Soon</span>
        </div>
      </div>
      
      <div class="pool-item">
        <div class="pool-header">
          <span class="pool-name">Командный пул 5% (50M GWT)</span>
          <span class="pool-status status-locked">Locked</span>
        </div>
      </div>
      
      <div class="pool-item">
        <div class="pool-header">
          <span class="pool-name">Резервный пул 5% (50M GWT)</span>
          <span class="pool-status status-soon">Soon</span>
        </div>
      </div>
    `;

    container.innerHTML = poolsHTML;
  },

  // ═══════════════════════════════════════════════════════════════
  // ТОРГОВЛЯ ТОКЕНАМИ
  // ═══════════════════════════════════════════════════════════════
  updateTradingUI() {
    const statusEl = document.getElementById('tradingStatus');
    const messageEl = document.getElementById('tradingMessage');
    const buyBtn = document.getElementById('buyTokenBtn');
    const sellBtn = document.getElementById('sellTokenBtn');
    const amountInput = document.getElementById('tradeAmount');

    // Статус торговли
    const isActive = this.state.tokenPrice >= this.state.trading.activationPrice;
    this.state.trading.isActive = isActive;

    if (statusEl) {
      statusEl.textContent = isActive ? 'Активна' : 'Неактивна';
      statusEl.className = `trading-status ${isActive ? 'active' : 'inactive'}`;
    }

    if (messageEl) {
      if (!isActive) {
        messageEl.textContent = `Торговля начинается при достижении цены $${this.state.trading.activationPrice}`;
        messageEl.style.display = 'block';
      } else {
        messageEl.style.display = 'none';
      }
    }

    // Кнопки
    if (buyBtn) {
      buyBtn.disabled = !isActive;
      buyBtn.onclick = () => this.buyTokens();
    }

    if (sellBtn) {
      sellBtn.disabled = !isActive;
      sellBtn.onclick = () => this.sellTokens();
    }

    // Input
    if (amountInput) {
      amountInput.oninput = () => this.calculateTradeCost();
    }
  },

  calculateTradeCost() {
    const amount = parseFloat(document.getElementById('tradeAmount').value) || 0;
    const cost = amount * this.state.tokenPrice;
    const newPrice = this.state.tokenPrice; // TODO: рассчитать новую цену с учетом ликвидности

    this.state.trading.amount = amount;
    this.state.trading.cost = cost;
    this.state.trading.newPrice = newPrice;

    const costEl = document.getElementById('tradeCost');
    const newPriceEl = document.getElementById('tradeNewPrice');

    if (costEl) {
      costEl.textContent = `Cost: ${cost.toFixed(4)} BNB`;
    }

    if (newPriceEl) {
      newPriceEl.textContent = `New Price: $${newPrice.toFixed(4)}`;
    }
  },

  async buyTokens() {
    try {
      const amount = this.state.trading.amount;
      
      if (amount <= 0) {
        app.showNotification('Введите количество токенов', 'error');
        return;
      }

      app.showNotification('Функция в разработке', 'info');
      
      // TODO: Реализовать покупку токенов
      // const tx = await this.contracts.token.buy(amount, { value: cost });
      // await tx.wait();
      
    } catch (error) {
      console.error('❌ Error buying tokens:', error);
      app.showNotification('Ошибка покупки токенов', 'error');
    }
  },

  async sellTokens() {
    try {
      const amount = this.state.trading.amount;
      
      if (amount <= 0) {
        app.showNotification('Введите количество токенов', 'error');
        return;
      }

      if (amount > parseFloat(this.state.balance)) {
        app.showNotification('Недостаточно токенов', 'error');
        return;
      }

      app.showNotification('Функция в разработке', 'info');
      
      // TODO: Реализовать продажу токенов
      // const tx = await this.contracts.token.sell(amount);
      // await tx.wait();
      
    } catch (error) {
      console.error('❌ Error selling tokens:', error);
      app.showNotification('Ошибка продажи токенов', 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // НАГРАДЫ ЗА УРОВНИ
  // ═══════════════════════════════════════════════════════════════
  async loadRewards() {
    try {
      const address = app.state.userAddress;
      console.log('🎁 Loading rewards...');

      // Получаем максимальный уровень пользователя
      const maxLevel = await this.contracts.globalWay.getUserMaxLevel(address);
      const userMaxLevel = Number(maxLevel);

      // Считаем заработанные награды
      let earned = 0;
      for (let i = 0; i < userMaxLevel; i++) {
        earned += CONFIG.TOKEN_REWARDS[i];
      }

      this.state.rewards.earned = earned;
      
      // Всего доступно наград
      this.state.rewards.available = CONFIG.TOKEN_REWARDS.reduce((a, b) => a + b, 0);

      console.log('✅ Rewards loaded:', earned, '/', this.state.rewards.available);
      
    } catch (error) {
      console.error('❌ Error loading rewards:', error);
      this.state.rewards.earned = 0;
      this.state.rewards.available = 0;
    }
  },

  renderRewards() {
    const container = document.getElementById('levelRewards');
    if (!container) return;

    const rewardsHTML = CONFIG.TOKEN_REWARDS.map((reward, index) => {
      const level = index + 1;
      const isUnlocked = app.state.maxLevel >= level;
      
      return `
        <div class="reward-card ${isUnlocked ? 'unlocked' : 'locked'}">
          <div class="reward-level">Уровень ${level}</div>
          <div class="reward-amount">${reward} GWT</div>
          <div class="reward-status">
            ${isUnlocked ? '✓' : '🔒'}
            ${isUnlocked ? 'РАЗБЛОКИРОВАНО' : 'РАЗБЛОКИРОВАНО'}
          </div>
        </div>
      `;
    }).join('');

    const totalRewards = CONFIG.TOKEN_REWARDS.reduce((a, b) => a + b, 0);

    container.innerHTML = `
      ${rewardsHTML}
      <div class="total-rewards">
        Total Possible Rewards: ${app.formatNumber(totalRewards, 0)} GWT
      </div>
    `;
  },

  // ═══════════════════════════════════════════════════════════════
  // ИСТОРИЯ ТОКЕНОВ
  // ═══════════════════════════════════════════════════════════════
  async loadHistory() {
    try {
      const address = app.state.userAddress;
      console.log('📜 Loading token history...');

      // Получаем события Transfer
      const filterFrom = this.contracts.token.filters.Transfer(address, null);
      const filterTo = this.contracts.token.filters.Transfer(null, address);

      const eventsFrom = await this.contracts.token.queryFilter(filterFrom, -10000);
      const eventsTo = await this.contracts.token.queryFilter(filterTo, -10000);

      const allEvents = [...eventsFrom, ...eventsTo];
      
      // Сортируем по блоку
      allEvents.sort((a, b) => b.blockNumber - a.blockNumber);

      // Форматируем события
      const history = await Promise.all(
        allEvents.slice(0, 50).map(async (event) => {
          const block = await event.getBlock();
          const date = new Date(block.timestamp * 1000).toLocaleDateString('ru-RU');
          
          const isReceived = event.args.to.toLowerCase() === address.toLowerCase();
          const type = isReceived ? 'Получено' : 'Отправлено';
          const amount = ethers.utils.formatEther(event.args.amount);

          return {
            date,
            type,
            amount,
            level: '-',
            status: 'Завершено'
          };
        })
      );

      this.state.history = history;
      
      console.log('✅ History loaded:', history.length, 'transactions');
      
      this.renderHistory();
      
    } catch (error) {
      console.error('❌ Error loading history:', error);
      this.state.history = [];
      this.renderHistory();
    }
  },

  renderHistory() {
    const tableBody = document.getElementById('tokenHistoryTable');
    if (!tableBody) return;

    if (this.state.history.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" class="no-data">Нет транзакций</td></tr>';
      return;
    }

    tableBody.innerHTML = this.state.history.map(tx => `
      <tr>
        <td>${tx.date}</td>
        <td>${tx.type}</td>
        <td>${tx.level}</td>
        <td>${app.formatNumber(tx.amount, 2)} GWT</td>
        <td><span class="badge badge-success">${tx.status}</span></td>
      </tr>
    `).join('');
  },

  filterHistory() {
    const filterValue = document.getElementById('historyFilter').value;
    
    if (filterValue === 'all') {
      this.renderHistory();
      return;
    }

    const filtered = this.state.history.filter(tx => {
      if (filterValue === 'received') return tx.type === 'Получено';
      if (filterValue === 'sent') return tx.type === 'Отправлено';
      return true;
    });

    // Render filtered
    const tableBody = document.getElementById('tokenHistoryTable');
    if (!tableBody) return;

    if (filtered.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" class="no-data">Нет транзакций</td></tr>';
      return;
    }

    tableBody.innerHTML = filtered.map(tx => `
      <tr>
        <td>${tx.date}</td>
        <td>${tx.type}</td>
        <td>${tx.level}</td>
        <td>${app.formatNumber(tx.amount, 2)} GWT</td>
        <td><span class="badge badge-success">${tx.status}</span></td>
      </tr>
    `).join('');
  },

  // ═══════════════════════════════════════════════════════════════
  // СТЕЙКИНГ
  // ═══════════════════════════════════════════════════════════════
  renderStaking() {
    const container = document.getElementById('stakingInfo');
    if (!container) return;

    container.innerHTML = `
      <h3>Скоро</h3>
      <div class="staking-features">
        <div class="feature">
          <span class="icon">📊</span>
          <span>Зарабатывайте награды</span>
        </div>
        <div class="feature">
          <span class="icon">🎯</span>
          <span>Права управления</span>
        </div>
        <div class="feature">
          <span class="icon">💎</span>
          <span>Эксклюзивный доступ</span>
        </div>
      </div>
    `;
  },

  // ═══════════════════════════════════════════════════════════════
  // ИНФОРМАЦИЯ О КОНТРАКТЕ
  // ═══════════════════════════════════════════════════════════════
  renderContractInfo() {
    const container = document.getElementById('contractInfo');
    if (!container) return;

    const contractAddress = CONFIG.CONTRACTS.GWTToken;

    container.innerHTML = `
      <div class="info-item">
        <span class="label">Адрес контракта</span>
        <div class="value-with-copy">
          <span class="value">${contractAddress}</span>
          <button onclick="tokensModule.copyAddress()" class="copy-btn">Copy</button>
        </div>
      </div>
      
      <div class="info-item">
        <span class="label">Название токена</span>
        <span class="value">GlobalWay Token</span>
      </div>
      
      <div class="info-item">
        <span class="label">Символ</span>
        <span class="value">GWT</span>
      </div>
      
      <div class="info-item">
        <span class="label">Децималы</span>
        <span class="value">18</span>
      </div>
      
      <div class="info-item">
        <span class="label">Сеть</span>
        <span class="value">opBNB</span>
      </div>
      
      <div class="contract-actions">
        <button onclick="tokensModule.addToWallet()" class="btn-outline">
          Добавить в кошелек
        </button>
        <button onclick="tokensModule.viewInExplorer()" class="btn-outline">
          Смотреть в проводнике
        </button>
      </div>
    `;
  },

  async copyAddress() {
    const address = CONFIG.CONTRACTS.GWTToken;
    await app.copyToClipboard(address);
  },

  async addToWallet() {
    try {
      if (!window.ethereum) {
        app.showNotification('MetaMask не найден', 'error');
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
            image: 'https://globalway.io/assets/icons/gwt-coin.png'
          }
        }
      });

      app.showNotification('Токен добавлен в кошелек!', 'success');
      
    } catch (error) {
      console.error('❌ Error adding to wallet:', error);
      app.showNotification('Ошибка добавления токена', 'error');
    }
  },

  viewInExplorer() {
    const address = CONFIG.CONTRACTS.GWTToken;
    const url = `${CONFIG.NETWORK.blockExplorer}/token/${address}`;
    window.open(url, '_blank');
  },

  // ═══════════════════════════════════════════════════════════════
  // UI ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  initUI() {
    console.log('🎨 Initializing Tokens UI...');

    // Торговля
    this.updateTradingUI();

    // Пулы
    this.renderPools();

    // Стейкинг
    this.renderStaking();

    // Информация о контракте
    this.renderContractInfo();

    // Фильтр истории
    const filterEl = document.getElementById('historyFilter');
    if (filterEl) {
      filterEl.onchange = () => this.filterHistory();
    }

    // Кнопка обновления истории
    const refreshBtn = document.getElementById('refreshHistory');
    if (refreshBtn) {
      refreshBtn.onclick = () => this.loadHistory();
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ОБНОВЛЕНИЕ ДАННЫХ
  // ═══════════════════════════════════════════════════════════════
  async refresh() {
    console.log('🔄 Refreshing tokens data...');
    await this.loadAllData();
    this.renderRewards();
  }
};

// Экспорт в window
window.tokensModule = tokensModule;
