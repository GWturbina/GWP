/* jshint esversion: 8 */
// ═══════════════════════════════════════════════════════════════
// Tokens Module - Адаптирован для Существующего HTML
// ═══════════════════════════════════════════════════════════════

const tokensModule = {
  contracts: {},
  
  tokenData: {
    balance: '0',
    price: '0',
    totalValue: '0',
    rewards: {},
    history: []
  },

  async init() {
    console.log('🪙 Initializing Tokens Module...');
    
    if (!app.state.userAddress) {
      console.log('⚠️ No wallet connected');
      return;
    }

    try {
      await this.loadContracts();
      await this.loadTokenData();
      this.updateUI();
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
      
      // 2. ✅ Цена из tokenomics баланса
      const TOKENOMICS_ADDRESS = '0xbDC29886c91878C1ba9ce0626Da5E1961324354F';
      const TOTAL_SUPPLY = 1000000000;
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const tokenomicsBalance = await provider.getBalance(TOKENOMICS_ADDRESS);
      const tokenomicsBalanceBNB = parseFloat(ethers.utils.formatEther(tokenomicsBalance));
      
      const priceInBNB = tokenomicsBalanceBNB / TOTAL_SUPPLY;
      const priceInUSD = (priceInBNB * 600).toFixed(6);
      
      this.tokenData.price = priceInUSD;
      
      // 3. Общая стоимость
      this.tokenData.totalValue = (parseFloat(this.tokenData.balance) * parseFloat(this.tokenData.price)).toFixed(2);
      
      // 4. Награды за уровни
      await this.loadLevelRewards(address);
      
      // 5. История
      await this.loadHistory(address);
      
    } catch (error) {
      console.error('Error loading token data:', error);
    }
  },

  async loadLevelRewards(address) {
    try {
      const maxLevel = await this.contracts.globalWay.getUserMaxLevel(address);
      const maxLevelNum = parseInt(maxLevel.toString());
      
      const rewards = [5, 5, 10, 15, 35, 75, 150, 300, 600, 1200, 2400, 4500];
      
      this.tokenData.rewards = {};
      let totalClaimed = 0;
      
      for (let level = 1; level <= 12; level++) {
        const isClaimed = level <= maxLevelNum;
        const amount = rewards[level - 1];
        
        this.tokenData.rewards[level] = {
          claimed: isClaimed,
          amount: amount
        };
        
        if (isClaimed) {
          totalClaimed += amount;
        }
      }
      
      this.tokenData.totalPossibleRewards = rewards.reduce((sum, r) => sum + r, 0);
      this.tokenData.totalClaimedRewards = totalClaimed;
      
    } catch (error) {
      console.error('Error loading rewards:', error);
    }
  },

  async loadHistory(address) {
    try {
      const filter = this.contracts.token.filters.Transfer(null, address);
      const events = await this.contracts.token.queryFilter(filter, -5000);
      
      this.tokenData.history = [];
      
      for (const event of events) {
        const block = await event.getBlock();
        const amount = ethers.utils.formatEther(event.args.value);
        
        let type = 'Transfer';
        if (event.args.from === ethers.constants.AddressZero) {
          type = 'reward';
        }
        
        this.tokenData.history.push({
          type: type,
          amount: parseFloat(amount),
          timestamp: block.timestamp,
          txHash: event.transactionHash
        });
      }
      
      this.tokenData.history.sort((a, b) => b.timestamp - a.timestamp);
      
    } catch (error) {
      console.error('Error loading history:', error);
      this.tokenData.history = [];
    }
  },

  updateUI() {
    // ✅ ИСПРАВЛЕНО: Использую правильные ID из HTML!
    
    // Баланс
    const totalTokensEl = document.getElementById('totalTokens');
    if (totalTokensEl) {
      totalTokensEl.textContent = `${parseFloat(this.tokenData.balance).toFixed(2)} GWT`;
    }
    
    // Цена
    const currentPriceEl = document.getElementById('currentPrice');
    if (currentPriceEl) {
      currentPriceEl.textContent = `$${parseFloat(this.tokenData.price).toFixed(6)}`;
    }
    
    // Общая стоимость
    const totalValueEl = document.getElementById('totalValue');
    if (totalValueEl) {
      totalValueEl.textContent = `$${this.tokenData.totalValue}`;
    }
    
    // Таблица наград
    this.updateRewardsGrid();
    
    // Total Possible Rewards
    const totalPossibleEl = document.getElementById('totalPossibleRewards');
    if (totalPossibleEl) {
      totalPossibleEl.textContent = `${this.tokenData.totalPossibleRewards.toLocaleString()} GWT`;
    }
    
    // История
    this.updateHistoryTable();
  },

  updateRewardsGrid() {
    const container = document.getElementById('levelRewards');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let level = 1; level <= 12; level++) {
      const reward = this.tokenData.rewards[level];
      if (!reward) continue;
      
      const isClaimed = reward.claimed;
      
      const card = document.createElement('div');
      card.className = `reward-item ${isClaimed ? 'claimed' : 'locked'}`;
      card.innerHTML = `
        <div class="reward-level">Уровень ${level}</div>
        <div class="reward-amount">${reward.amount} GWT</div>
        <div class="reward-status">
          ${isClaimed ? '<span class="status-icon">✓</span>' : '<span class="status-icon">🔒</span>'}
        </div>
        <div class="reward-state">${isClaimed ? 'Разблокирован' : 'Заблокирован'}</div>
      `;
      
      container.appendChild(card);
    }
  },

  updateHistoryTable(filter = 'all') {
    const tbody = document.getElementById('tokenHistoryTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    let filtered = this.tokenData.history;
    if (filter !== 'all') {
      filtered = this.tokenData.history.filter(tx => tx.type === filter);
    }
    
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="no-data">Нет транзакций</td></tr>';
      return;
    }
    
    filtered.slice(0, 20).forEach((tx, index) => {
      const row = document.createElement('tr');
      const date = new Date(tx.timestamp * 1000).toLocaleDateString('ru-RU');
      const typeLabel = tx.type === 'reward' ? 'Level Reward' : 'Transfer';
      
      row.innerHTML = `
        <td>${date}</td>
        <td>${typeLabel}</td>
        <td>-</td>
        <td>${tx.amount.toFixed(2)} GWT</td>
        <td><span class="status-completed">✓</span></td>
      `;
      tbody.appendChild(row);
    });
  },

  initUI() {
    // Фильтр истории
    const filterSelect = document.getElementById('tokenHistoryFilter');
    if (filterSelect) {
      filterSelect.onchange = (e) => {
        this.updateHistoryTable(e.target.value);
      };
    }
    
    // Кнопка обновления
    const refreshBtn = document.getElementById('refreshTokenHistory');
    if (refreshBtn) {
      refreshBtn.onclick = () => this.refresh();
    }
  },

  async refresh() {
    console.log('🔄 Refreshing tokens data...');
    await this.loadTokenData();
    this.updateUI();
  }
};

// Экспорт
window.tokensModule = tokensModule;
