/* jshint esversion: 8 */
// ═══════════════════════════════════════════════════════════════
// Tokens Module - GWT Token Management
// ═══════════════════════════════════════════════════════════════

const tokensModule = {
  contracts: {},
  
  tokenData: {
    balance: '0',
    price: '0',
    totalValue: '0',
    rewards: {}, // {level: {claimed: bool, amount: number}}
    history: []
  },

  async init() {
    console.log('🪙 Initializing Tokens Module...');
    
    if (!app.state.userAddress) {
      this.showConnectPrompt();
      return;
    }

    try {
      await this.loadContracts();
      await this.loadTokenData();
      this.initUI();
      console.log('✅ Tokens module loaded');
    } catch (error) {
      console.error('❌ Tokens init error:', error);
    }
  },

  async loadContracts() {
    this.contracts.token = await app.getContract('GWTToken');
    this.contracts.globalWay = await app.getContract('GlobalWay');
  },

  async loadTokenData() {
    const address = app.state.userAddress;
    
    try {
      // 1. Баланс токенов
      const balance = await this.contracts.token.balanceOf(address);
      this.tokenData.balance = ethers.utils.formatEther(balance);
      
      // 2. Цена токена
      const price = await this.contracts.token.getCurrentPrice();
      this.tokenData.price = ethers.utils.formatEther(price);
      
      // 3. Общая стоимость
      this.tokenData.totalValue = (parseFloat(this.tokenData.balance) * parseFloat(this.tokenData.price)).toFixed(2);
      
      // 4. Награды за уровни
      await this.loadLevelRewards(address);
      
      // 5. История транзакций
      await this.loadHistory(address);
      
      this.updateUI();
      
    } catch (error) {
      console.error('Error loading token data:', error);
    }
  },

  async loadLevelRewards(address) {
    try {
      // Проверяем какие уровни активированы
      const maxLevel = await this.contracts.globalWay.getUserMaxLevel(address);
      
      // Награды за каждый уровень
      const rewards = CONFIG.TOKEN_REWARDS; // [5, 5, 10, 15, 35, 75, 150, 300, 600, 1200, 2400, 4500]
      
      for (let level = 1; level <= 12; level++) {
        this.tokenData.rewards[level] = {
          claimed: level <= maxLevel,
          amount: rewards[level - 1]
        };
      }
      
      // Считаем total possible rewards
      this.tokenData.totalPossibleRewards = rewards.reduce((sum, r) => sum + r, 0);
      this.tokenData.totalClaimedRewards = rewards.slice(0, maxLevel).reduce((sum, r) => sum + r, 0);
      
    } catch (error) {
      console.error('Error loading rewards:', error);
    }
  },

  async loadHistory(address) {
    try {
      // Получаем события Transfer для этого адреса
      const filter = this.contracts.token.filters.Transfer(null, address);
      const events = await this.contracts.token.queryFilter(filter, -10000); // Последние 10k блоков
      
      this.tokenData.history = [];
      
      for (const event of events) {
        const tx = await event.getTransaction();
        const block = await event.getBlock();
        
        // Определяем тип транзакции
        let type = 'Transfer';
        if (event.args.from === ethers.constants.AddressZero) {
          type = 'Level Reward'; // Минтинг = награда за уровень
        } else if (tx.to === this.contracts.token.address) {
          type = 'Trading';
        }
        
        this.tokenData.history.push({
          type: type,
          from: event.args.from,
          to: event.args.to,
          amount: ethers.utils.formatEther(event.args.value),
          timestamp: block.timestamp,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber
        });
      }
      
      // Сортируем по времени (новые первые)
      this.tokenData.history.sort((a, b) => b.timestamp - a.timestamp);
      
    } catch (error) {
      console.error('Error loading history:', error);
      this.tokenData.history = [];
    }
  },

  updateUI() {
    // Обновляем данные в Dashboard (если на этой странице)
    const balanceEl = document.getElementById('tokenBalance');
    const priceEl = document.getElementById('tokenPrice');
    const valueEl = document.getElementById('tokenTotalValue');
    
    if (balanceEl) balanceEl.textContent = `${parseFloat(this.tokenData.balance).toFixed(2)} GWT`;
    if (priceEl) priceEl.textContent = `$${parseFloat(this.tokenData.price).toFixed(6)}`;
    if (valueEl) valueEl.textContent = `$${this.tokenData.totalValue}`;
    
    // Обновляем таблицу наград на странице Tokens
    this.updateRewardsTable();
    
    // Обновляем историю
    this.updateHistoryTable();
  },

  updateRewardsTable() {
    const container = document.getElementById('rewardsGrid');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let level = 1; level <= 12; level++) {
      const reward = this.tokenData.rewards[level];
      const isClaimed = reward?.claimed || false;
      
      const card = document.createElement('div');
      card.className = `reward-card ${isClaimed ? 'claimed' : 'locked'}`;
      card.innerHTML = `
        <div class="reward-level">Уровень ${level}</div>
        <div class="reward-amount">${CONFIG.TOKEN_REWARDS[level - 1]} GWT</div>
        <div class="reward-status">
          ${isClaimed ? '✓' : '🔒'}
        </div>
        <div class="reward-state">${isClaimed ? 'Разблокирован' : 'Заблокирован'}</div>
      `;
      
      container.appendChild(card);
    }
    
    // Обновляем total rewards
    const totalEl = document.getElementById('totalRewards');
    if (totalEl) {
      totalEl.textContent = `Total Possible Rewards: ${this.tokenData.totalPossibleRewards.toLocaleString()} GWT`;
    }
    
    const claimedEl = document.getElementById('claimedRewards');
    if (claimedEl) {
      claimedEl.textContent = `Получено: ${this.tokenData.totalClaimedRewards.toLocaleString()} GWT`;
    }
  },

  updateHistoryTable(filter = 'all') {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Фильтруем по типу
    let filtered = this.tokenData.history;
    if (filter !== 'all') {
      filtered = this.tokenData.history.filter(tx => {
        if (filter === 'rewards') return tx.type === 'Level Reward';
        if (filter === 'trading') return tx.type === 'Trading';
        if (filter === 'transfers') return tx.type === 'Transfer';
        return true;
      });
    }
    
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Нет транзакций</td></tr>';
      return;
    }
    
    filtered.forEach((tx, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${tx.type}</td>
        <td>${parseFloat(tx.amount).toFixed(2)} GWT</td>
        <td>${new Date(tx.timestamp * 1000).toLocaleDateString('ru-RU')}</td>
      `;
      tbody.appendChild(row);
    });
  },

  initUI() {
    // Кнопка Refresh
    const refreshBtn = document.getElementById('refreshTokensBtn');
    if (refreshBtn) {
      refreshBtn.onclick = () => this.refresh();
    }
    
    // Фильтр истории
    const filterSelect = document.getElementById('historyFilter');
    if (filterSelect) {
      filterSelect.onchange = (e) => {
        const value = e.target.value;
        let filter = 'all';
        if (value === 'Level Rewards') filter = 'rewards';
        else if (value === 'Trading') filter = 'trading';
        else if (value === 'Transfers') filter = 'transfers';
        
        this.updateHistoryTable(filter);
      };
    }
    
    // Кнопка Управлять
    const manageBtn = document.getElementById('manageTokensBtn');
    if (manageBtn) {
      manageBtn.onclick = () => {
        window.location.href = '#tokens'; // Переход на страницу Tokens
      };
    }
  },

  showConnectPrompt() {
    const message = document.createElement('div');
    message.style.cssText = 'padding: 20px; text-align: center; color: #ffc107;';
    message.textContent = 'Подключите кошелек для просмотра токенов';
    
    const container = document.getElementById('tokensContainer');
    if (container) {
      container.innerHTML = '';
      container.appendChild(message);
    }
  },

  async refresh() {
    console.log('🔄 Refreshing tokens data...');
    await this.loadTokenData();
  }
};

// Экспорт
window.tokensModule = tokensModule;
