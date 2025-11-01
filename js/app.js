/* jshint esversion: 8 */
/* global CONFIG, web3Manager, contracts, Utils, ethers */

/**
 * GlobalWay Main Application - ПОВНІСТЮ ВИПРАВЛЕНА ВЕРСІЯ
 * 
 * Версія: 2.0 (Виправлена)
 * Дата: 01.11.2025
 */

class GlobalWayApp {
  constructor() {
    this.currentPage = 'dashboard';
    this.userData = null;
    this.updateInterval = null;
  }

  /**
   * Ініціалізація додатку
   */
  async init() {
    console.log('🚀 Initializing GlobalWay App...');

    try {
      // Перевірити чи підключений гаманець
      if (!web3Manager.connected) {
        this.showConnectionAlert();
        return;
      }

      // Ініціалізувати контракти
      await contracts.init();

      // Завантажити дані користувача
      await this.loadUserData();

      // Налаштувати автооновлення
      this.setupAutoUpdate();

      // Налаштувати обробники подій
      this.setupEventListeners();

      // Завантажити поточну сторінку
      await this.loadCurrentPage();

      console.log('✅ App initialized successfully');

    } catch (error) {
      console.error('❌ App initialization failed:', error);
      Utils.showNotification('Failed to initialize app', 'error');
    }
  }

  /**
   * Показати сповіщення про підключення
   */
  showConnectionAlert() {
    const alert = document.getElementById('connectionAlert');
    if (!alert) return;

    const message = document.getElementById('alertMessage');
    const actionBtn = document.getElementById('alertAction');

    if (message) {
      message.textContent = 'Please connect your wallet to continue';
    }

    if (actionBtn) {
      actionBtn.textContent = 'Connect Wallet';
      actionBtn.onclick = () => web3Manager.connect();
    }

    alert.style.display = 'block';
  }

  /**
   * Приховати сповіщення про підключення
   */
  hideConnectionAlert() {
    const alert = document.getElementById('connectionAlert');
    if (alert) {
      alert.style.display = 'none';
    }
  }

  /**
   * Завантажити дані користувача
   */
  async loadUserData() {
    if (!web3Manager.connected) return;

    try {
      const address = web3Manager.address;

      // Використовуємо Stats контракт для отримання ВСІХ даних
      const [userInfo, fullStats, quarterlyStats, structureStats] = await Promise.all([
        contracts.getUserInfo(address),
        contracts.getUserFullStats(address),
        contracts.getUserQuarterlyStats(address),
        contracts.getUserStructureStats(address)
      ]);

      this.userData = {
        address: address,
        info: userInfo,
        stats: fullStats,
        quarterly: quarterlyStats,
        structure: structureStats
      };

      console.log('✅ User data loaded:', this.userData);

      // Оновити UI
      this.updatePersonalCabinet();
      this.hideConnectionAlert();

    } catch (error) {
      console.error('❌ Load user data failed:', error);
      throw error;
    }
  }

  /**
   * Оновити Personal Cabinet
   */
  updatePersonalCabinet() {
    if (!this.userData) return;

    // User Address
    const userAddressEl = document.getElementById('userAddress');
    if (userAddressEl) {
      userAddressEl.textContent = Utils.formatAddress(this.userData.address);
      userAddressEl.title = this.userData.address;
    }

    // User Balance
    web3Manager.provider.getBalance(this.userData.address).then(balance => {
      const userBalanceEl = document.getElementById('userBalance');
      if (userBalanceEl) {
        userBalanceEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(balance))} BNB`;
      }
    });

    // User ID
    const userIdEl = document.getElementById('userId');
    if (userIdEl) {
      userIdEl.textContent = this.userData.info.id || 'Not assigned';
    }

    // User Rank
    contracts.getRankInfo(this.userData.address).then(rankInfo => {
      const userRankEl = document.getElementById('userRank');
      if (userRankEl) {
        userRankEl.textContent = this.getRankName(rankInfo.currentRank);
      }
    });

    // Referral Link
    const refLinkEl = document.getElementById('refLink');
    if (refLinkEl && this.userData.info.id) {
      refLinkEl.value = `${window.location.origin}?ref=${this.userData.info.id}`;
    }
  }

  /**
   * Налаштувати обробники подій
   */
  setupEventListeners() {
    // Copy Referral Link
    const copyRefLinkBtn = document.getElementById('copyRefLink');
    if (copyRefLinkBtn) {
      copyRefLinkBtn.addEventListener('click', () => this.copyReferralLink());
    }

    // Generate QR
    const generateQRBtn = document.getElementById('generateQR');
    if (generateQRBtn) {
      generateQRBtn.addEventListener('click', () => this.generateReferralQR());
    }

    // Pay Quarterly Activity
    const payActivityBtn = document.getElementById('payActivityBtn');
    if (payActivityBtn) {
      payActivityBtn.addEventListener('click', () => this.payQuarterlyActivity());
    }

    // Refresh History
    const refreshHistoryBtn = document.getElementById('refreshHistory');
    if (refreshHistoryBtn) {
      refreshHistoryBtn.addEventListener('click', () => this.loadTransactionHistory());
    }

    // History Filter
    const historyFilter = document.getElementById('historyFilter');
    if (historyFilter) {
      historyFilter.addEventListener('change', () => this.loadTransactionHistory());
    }
  }

  /**
   * Налаштувати автооновлення
   */
  setupAutoUpdate() {
    // Оновлювати кожні 30 секунд
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      if (web3Manager.connected && this.currentPage === 'dashboard') {
        try {
          await this.refreshDashboardData();
        } catch (error) {
          console.error('Auto update failed:', error);
        }
      }
    }, 30000);
  }

  /**
   * Завантажити поточну сторінку
   */
  async loadCurrentPage() {
    switch (this.currentPage) {
      case 'dashboard':
        await this.loadDashboard();
        break;
      case 'partners':
        if (window.partnersManager) await window.partnersManager.init();
        break;
      case 'matrix':
        if (window.matrixManager) await window.matrixManager.init();
        break;
      case 'tokens':
        if (window.tokensManager) await window.tokensManager.init();
        break;
      case 'projects':
        if (window.projectsManager) await window.projectsManager.init();
        break;
      case 'admin':
        if (window.adminManager) await window.adminManager.init();
        break;
    }
  }

  // ==========================================
  // DASHBOARD
  // ==========================================

  /**
   * Завантажити Dashboard
   */
  async loadDashboard() {
    if (!web3Manager.connected || !this.userData) return;

    Utils.showLoader(true, 'Loading dashboard...');

    try {
      await Promise.all([
        this.updateQuarterlyActivity(),
        this.updateContractBalances(),
        this.updateLevelManagement(),
        this.updateEarnings(),
        this.loadTransactionHistory(),
        this.updateTokensSummary()
      ]);

      console.log('✅ Dashboard loaded');

    } catch (error) {
      console.error('❌ Dashboard load failed:', error);
      Utils.showNotification('Failed to load dashboard', 'error');
    } finally {
      Utils.hideLoader();
    }
  }

  /**
   * Оновити дані Dashboard
   */
  async refreshDashboardData() {
    if (!web3Manager.connected) return;

    try {
      // Тихо оновити дані без loader
      await this.loadUserData();
      await this.updateContractBalances();
      await this.updateTokensSummary();

    } catch (error) {
      console.error('Refresh failed:', error);
    }
  }

  /**
   * Оновити Quarterly Activity
   */
  async updateQuarterlyActivity() {
    if (!this.userData) return;

    const quarterlyStats = this.userData.quarterly;

    // Current Quarter
    const currentQuarterEl = document.getElementById('currentQuarter');
    if (currentQuarterEl) {
      currentQuarterEl.textContent = quarterlyStats.quarterCount || 0;
    }

    // Last Payment
    const lastPaymentEl = document.getElementById('lastPayment');
    if (lastPaymentEl) {
      if (quarterlyStats.lastPayment > 0) {
        lastPaymentEl.textContent = Utils.formatDate(quarterlyStats.lastPayment);
      } else {
        lastPaymentEl.textContent = 'Never';
      }
    }

    // Next Payment
    const nextPaymentEl = document.getElementById('nextPayment');
    if (nextPaymentEl) {
      if (quarterlyStats.nextPaymentTime > 0) {
        nextPaymentEl.textContent = Utils.formatDate(quarterlyStats.nextPaymentTime);
      } else {
        nextPaymentEl.textContent = '-';
      }
    }

    // Quarterly Cost
    const quarterlyCostEl = document.getElementById('quarterlyCost');
    if (quarterlyCostEl) {
      quarterlyCostEl.textContent = `${CONFIG.QUARTERLY_COST} BNB`;
    }

    // Payment Warning
    this.updatePaymentWarning(quarterlyStats);
  }

  /**
   * Оновити Payment Warning
   */
  updatePaymentWarning(quarterlyStats) {
    const paymentWarning = document.getElementById('paymentWarning');
    const daysRemainingEl = document.getElementById('daysRemaining');

    if (!paymentWarning) return;

    if (quarterlyStats.nextPaymentTime > 0) {
      const now = Math.floor(Date.now() / 1000);
      const daysLeft = Math.floor((quarterlyStats.nextPaymentTime - now) / (24 * 60 * 60));

      if (daysLeft <= 10 && daysLeft > 0) {
        // Warning - 10 днів або менше
        paymentWarning.style.display = 'flex';
        paymentWarning.classList.remove('critical');
        if (daysRemainingEl) {
          daysRemainingEl.textContent = daysLeft;
        }
      } else if (daysLeft <= 0 && quarterlyStats.isActive) {
        // Critical - прострочено
        paymentWarning.style.display = 'flex';
        paymentWarning.classList.add('critical');
        if (daysRemainingEl) {
          daysRemainingEl.textContent = 'OVERDUE';
        }
      } else {
        // Все ОК
        paymentWarning.style.display = 'none';
      }
    } else {
      paymentWarning.style.display = 'none';
    }
  }

  /**
   * Оновити Contract Balances - ВИПРАВЛЕНО!
   */
  async updateContractBalances() {
    if (!web3Manager.connected) return;

    try {
      // Використовуємо Stats контракт!
      const balances = await contracts.getUserBalances(web3Manager.address);

      // Marketing Balance (Referral + Matrix)
      const marketingBalanceEl = document.getElementById('marketingBalance');
      if (marketingBalanceEl) {
        const total = balances.referralBalance.add(balances.matrixBalance);
        marketingBalanceEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(total))} BNB`;
      }

      // Leader Balance
      const leaderBalanceEl = document.getElementById('leaderBalance');
      if (leaderBalanceEl) {
        leaderBalanceEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(balances.leaderBalance))} BNB`;
      }

      // Investment Balance
      const investmentBalanceEl = document.getElementById('investmentBalance');
      if (investmentBalanceEl) {
        leaderBalanceEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(balances.investmentPending))} BNB`;
      }

    } catch (error) {
      console.error('updateContractBalances error:', error);
    }
  }

  /**
   * Виведення з контракту - ВИПРАВЛЕНО!
   */
  async withdrawFromContract(poolType) {
    if (!web3Manager.connected) {
      Utils.showNotification('Please connect wallet', 'warning');
      return;
    }

    try {
      Utils.showLoader(true, `Withdrawing from ${poolType}...`);

      let tx;
      
      switch (poolType) {
        case 'marketing':
          // Вивести обидва баланси Marketing
          await contracts.withdrawReferral();
          tx = await contracts.withdrawMatrix();
          break;
          
        case 'leader':
          tx = await contracts.withdrawLeader();
          break;
          
        case 'investment':
          tx = await contracts.withdrawInvestment();
          break;
          
        default:
          throw new Error('Unknown pool type');
      }

      console.log('✅ Withdrawal successful:', tx.hash);
      Utils.showNotification('Withdrawal successful!', 'success');

      // Оновити баланси
      setTimeout(() => this.updateContractBalances(), 2000);

    } catch (error) {
      console.error('withdrawFromContract error:', error);
      Utils.showNotification(Utils.getErrorMessage(error), 'error');
    } finally {
      Utils.hideLoader();
    }
  }

  /**
   * Оновити Level Management
   */
  async updateLevelManagement() {
    if (!this.userData) return;

    const container = document.getElementById('individualLevels');
    if (!container) return;

    container.innerHTML = '';

    for (let level = 1; level <= 12; level++) {
      const levelInfo = await contracts.getUserLevel(web3Manager.address, level);
      const price = CONFIG.LEVEL_PRICES[level - 1];
      const reward = CONFIG.TOKEN_REWARDS[level - 1];

      const button = document.createElement('button');
      button.className = 'level-btn';
      button.dataset.level = level;

      if (levelInfo.isActive) {
        // Активний рівень
        button.classList.add('active');
        button.disabled = true;
        button.innerHTML = `
          <div class="level-number">Level ${level}</div>
          <div class="level-status">✓ Active</div>
          <div class="level-reward">+${reward} GWT</div>
        `;
      } else if (level <= this.userData.info.activeLevel + 1) {
        // Доступний для купівлі
        button.innerHTML = `
          <div class="level-number">Level ${level}</div>
          <div class="level-price">${price} BNB</div>
          <div class="level-reward">+${reward} GWT</div>
        `;
        button.addEventListener('click', () => this.buyLevel(level));
      } else {
        // Заблокований
        button.classList.add('locked');
        button.disabled = true;
        button.innerHTML = `
          <div class="level-number">Level ${level}</div>
          <div class="level-status">🔒 Locked</div>
          <div class="level-info">Activate previous levels</div>
        `;
      }

      container.appendChild(button);
    }
  }

  /**
   * Купити рівень
   */
  async buyLevel(level) {
    if (!web3Manager.connected) {
      Utils.showNotification('Please connect wallet', 'warning');
      return;
    }

    const price = CONFIG.LEVEL_PRICES[level - 1];
    const confirmed = confirm(`Activate Level ${level} for ${price} BNB?`);

    if (!confirmed) return;

    try {
      Utils.showLoader(true, `Activating Level ${level}...`);

      const tx = await contracts.buyLevel(level);

      console.log('✅ Level activated:', tx.hash);
      Utils.showNotification(`Level ${level} activated successfully!`, 'success');

      // Оновити дані
      setTimeout(() => {
        this.loadUserData();
        this.updateLevelManagement();
      }, 2000);

    } catch (error) {
      console.error('buyLevel error:', error);
      Utils.showNotification(Utils.getErrorMessage(error), 'error');
    } finally {
      Utils.hideLoader();
    }
  }

  /**
   * Оновити Earnings - ВИПРАВЛЕНО!
   */
  async updateEarnings() {
    if (!web3Manager.connected) return;

    try {
      const balances = await contracts.getUserBalances(web3Manager.address);

      const earningsContainer = document.getElementById('earningsRank');
      if (!earningsContainer) return;

      earningsContainer.innerHTML = '';

      const earnings = [
        { name: 'Referral Bonus', amount: balances.referralBalance, icon: '👥' },
        { name: 'Matrix Bonus', amount: balances.matrixBalance, icon: '🔷' },
        { name: 'Quarterly Upline', amount: balances.quarterlyBalance, icon: '📅' },
        { name: 'Leadership Bonus', amount: balances.leaderBalance, icon: '👑' },
        { name: 'Investment Rewards', amount: balances.investmentPending, icon: '💰' }
      ];

      let total = ethers.BigNumber.from(0);

      for (const earning of earnings) {
        const item = document.createElement('div');
        item.className = 'earning-item';
        item.innerHTML = `
          <span class="rank-name">${earning.icon} ${earning.name}</span>
          <span class="earning-amount">${Utils.formatBNB(ethers.utils.formatEther(earning.amount))} BNB</span>
        `;
        earningsContainer.appendChild(item);

        total = total.add(earning.amount);
      }

      // Total Income
      const totalIncomeEl = document.getElementById('totalIncome');
      if (totalIncomeEl) {
        totalIncomeEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(total))} BNB`;
      }

    } catch (error) {
      console.error('updateEarnings error:', error);
    }
  }

  /**
   * Завантажити Transaction History - ВИПРАВЛЕНО!
   */
  async loadTransactionHistory() {
    const historyTable = document.getElementById('historyTable');
    if (!historyTable || !web3Manager.connected) return;

    try {
      historyTable.innerHTML = `
        <tr>
          <td colspan="6" class="no-data">Loading...</td>
        </tr>
      `;

      // Отримати історію через Events
      const [levelHistory, quarterlyHistory] = await Promise.all([
        contracts.getLevelActivationsHistory(web3Manager.address),
        contracts.getQuarterlyPaymentsHistory(web3Manager.address)
      ]);

      // Об'єднати
      const allHistory = [
        ...levelHistory.map(item => ({ 
          ...item, 
          type: 'Level Purchase',
          amount: CONFIG.LEVEL_PRICES[item.level - 1]
        })),
        ...quarterlyHistory.map(item => ({ 
          ...item, 
          type: 'Quarterly Payment',
          level: '-',
          amount: ethers.utils.formatEther(item.amount)
        }))
      ];

      // Фільтр
      const filterEl = document.getElementById('historyFilter');
      let filtered = allHistory;

      if (filterEl && filterEl.value !== 'all') {
        const filterType = filterEl.value;
        filtered = allHistory.filter(item => {
          if (filterType === 'level') return item.type === 'Level Purchase';
          if (filterType === 'quarterly') return item.type === 'Quarterly Payment';
          return true;
        });
      }

      // Сортувати
      filtered.sort((a, b) => b.timestamp - a.timestamp);

      if (filtered.length === 0) {
        historyTable.innerHTML = `
          <tr>
            <td colspan="6" class="no-data">No transactions yet</td>
          </tr>
        `;
        return;
      }

      // Рендер (перші 50)
      historyTable.innerHTML = filtered.slice(0, 50).map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.level || '-'}</td>
          <td>${item.amount ? Utils.formatBNB(item.amount) + ' BNB' : '-'}</td>
          <td>${Utils.formatDate(item.timestamp)}</td>
          <td>
            <a href="${Utils.getExplorerLink(item.txHash)}" target="_blank" title="${item.txHash}">
              ${Utils.formatAddress(item.txHash)}
            </a>
          </td>
          <td><span class="transaction-type">${item.type}</span></td>
        </tr>
      `).join('');

    } catch (error) {
      console.error('loadTransactionHistory error:', error);
      historyTable.innerHTML = `
        <tr>
          <td colspan="6" class="no-data">Failed to load history</td>
        </tr>
      `;
    }
  }

  /**
   * Оновити Tokens Summary
   */
  async updateTokensSummary() {
    if (!web3Manager.connected) return;

    try {
      const balance = await contracts.getTokenBalance(web3Manager.address);
      const tokenAmount = ethers.utils.formatEther(balance);

      const tokenAmountEl = document.getElementById('tokenAmount');
      if (tokenAmountEl) {
        tokenAmountEl.textContent = `${Utils.formatBNB(tokenAmount)} GWT`;
      }

      const price = await contracts.getTokenPrice();
      const tokenPrice = ethers.utils.formatEther(price);

      const tokenPriceEl = document.getElementById('tokenPrice');
      if (tokenPriceEl) {
        tokenPriceEl.textContent = `$${parseFloat(tokenPrice).toFixed(6)}`;
      }

      const value = parseFloat(tokenAmount) * parseFloat(tokenPrice);
      const tokenValueEl = document.getElementById('tokenValue');
      if (tokenValueEl) {
        tokenValueEl.textContent = `$${value.toFixed(2)}`;
      }

    } catch (error) {
      console.error('updateTokensSummary error:', error);
    }
  }

  /**
   * Оплата квартальної активності
   */
  async payQuarterlyActivity() {
    if (!web3Manager.connected) {
      Utils.showNotification('Please connect wallet', 'warning');
      return;
    }

    try {
      const canPay = await contracts.canPayQuarterly(web3Manager.address);

      if (!canPay.can) {
        Utils.showNotification(canPay.reason, 'warning');
        return;
      }

      const confirmed = confirm(`Pay Quarterly Activity for ${CONFIG.QUARTERLY_COST} BNB?`);
      if (!confirmed) return;

      Utils.showLoader(true, 'Processing payment...');

      const tx = await contracts.payQuarterly();

      console.log('✅ Quarterly payment successful:', tx.hash);
      Utils.showNotification('Quarterly activity paid successfully!', 'success');

      setTimeout(() => {
        this.loadUserData();
        this.updateQuarterlyActivity();
      }, 2000);

    } catch (error) {
      console.error('payQuarterlyActivity error:', error);
      Utils.showNotification(Utils.getErrorMessage(error), 'error');
    } finally {
      Utils.hideLoader();
    }
  }

  copyReferralLink() {
    const refLinkEl = document.getElementById('refLink');
    if (!refLinkEl) return;

    refLinkEl.select();
    document.execCommand('copy');

    Utils.showNotification('Referral link copied!', 'success');
  }

  generateReferralQR() {
    const refLinkEl = document.getElementById('refLink');
    if (!refLinkEl || !refLinkEl.value) {
      Utils.showNotification('No referral link available', 'warning');
      return;
    }

    Utils.showNotification('QR code generation coming soon', 'info');
  }

  getRankName(rankLevel) {
    const ranks = ['None', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
    return ranks[rankLevel] || 'None';
  }

  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

const app = new GlobalWayApp();

document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM Content Loaded');
  
  if (web3Manager.connected) {
    app.init();
  }
});

window.addEventListener('walletConnected', () => {
  console.log('👛 Wallet connected, initializing app...');
  app.init();
});

window.addEventListener('walletDisconnected', () => {
  console.log('👛 Wallet disconnected');
  app.destroy();
  app.showConnectionAlert();
});
