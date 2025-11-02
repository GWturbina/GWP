/* jshint esversion: 8 */
/* global CONFIG, web3Manager, contracts, Utils, showPage */

/**
 * GlobalWay Main App - ИСПРАВЛЕНО
 * Версия: 2.1 - Реализованы функции покупки и вывода
 */

class App {
  constructor() {
    this.currentPage = 'dashboard';
    this.isRegistered = false;
    this.updateInterval = null;
  }

  async init() {
    console.log('🚀 Initializing GlobalWay App...');
    
    try {
      // Инициализация i18n
      if (window.i18n && window.i18n.initI18n) {
        await window.i18n.initI18n();
      }
      
      // Инициализация Web3Manager
      await web3Manager.init();
      
      // Если кошелёк подключен
      if (web3Manager.connected) {
        console.log('✅ Wallet connected:', web3Manager.address);
        
        // Инициализация контрактов
        await contracts.init();
        
        // 🔥 НОВОЕ: Проверка регистрации
        await this.checkRegistration();
        
        // Загрузить dashboard
        if (this.isRegistered) {
          await this.loadDashboard();
          
          // 🔥 ИСПРАВЛЕНО: Переключить на Dashboard
          if (typeof uiManager !== 'undefined' && uiManager.showPage) {
            uiManager.showPage('dashboard');
          }
          this.startAutoUpdate();
        }
      } else {
        console.log('⚠️ Wallet not connected');
      }
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log('✅ App initialized successfully');
      
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      Utils.showNotification('Initialization failed', 'error');
    }
  }

  // 🔥 НОВАЯ ФУНКЦИЯ: Проверка регистрации
  async checkRegistration() {
    try {
      const isReg = await contracts.isUserRegistered(web3Manager.address);
      this.isRegistered = isReg;
      
      if (!isReg) {
        console.log('⚠️ User not registered');
        // Показать модальное окно регистрации
        if (typeof showRegistrationModal === 'function') {
          showRegistrationModal();
        }
      } else {
        console.log('✅ User registered');
      }
      
      return isReg;
    } catch (error) {
      console.error('checkRegistration error:', error);
      return false;
    }
  }

  setupEventListeners() {
    // Кнопка подключения кошелька
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => this.connectWallet());
    }
    
    // Кнопка отключения
    const disconnectBtn = document.getElementById('disconnectBtn');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => this.disconnect());
    }
    
    // Кнопка оплаты квартальной активности
    const payActivityBtn = document.getElementById('payActivityBtn');
    if (payActivityBtn) {
      payActivityBtn.addEventListener('click', () => this.payQuarterly());
    }
    
    // Кнопки покупки уровней (индивидуальные)
    this.setupLevelButtons();
    
    // Кнопки массовой покупки
    this.setupBulkButtons();
  }

  setupLevelButtons() {
    for (let i = 1; i <= 12; i++) {
      const btn = document.getElementById(`buyLevel${i}`);
      if (btn) {
        btn.addEventListener('click', () => this.buyLevel(i));
      }
    }
  }

  setupBulkButtons() {
    const bulkBtns = document.querySelectorAll('.bulk-btn');
    bulkBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const levels = parseInt(btn.dataset.levels);
        this.buyBulkLevels(levels);
      });
    });
  }

  async connectWallet() {
    try {
      Utils.showLoader(true, 'Connecting wallet...');
      
      await web3Manager.connect();
      
      if (web3Manager.connected) {
        await contracts.init();
        await this.checkRegistration();
        
        if (this.isRegistered) {
          await this.loadDashboard();
          this.startAutoUpdate();
          Utils.showNotification('Wallet connected!', 'success');
        }
      }
      
    } catch (error) {
      console.error('Connect error:', error);
      Utils.showNotification('Connection failed', 'error');
    } finally {
      Utils.hideLoader();
    }
  }

  async disconnect() {
    await web3Manager.disconnect();
    this.stopAutoUpdate();
    this.isRegistered = false;
    Utils.showNotification('Wallet disconnected', 'info');
    
    // Очистить UI
    this.clearDashboard();
  }

  // 🔥 РЕАЛИЗОВАНО: Покупка уровня
  async buyLevel(level) {
    if (!web3Manager.connected) {
      Utils.showNotification('Please connect wallet first', 'warning');
      return;
    }
    
    if (!this.isRegistered) {
      Utils.showNotification('Please register first', 'warning');
      return;
    }
    
    try {
      const price = CONFIG.LEVEL_PRICES[level - 1];
      
      const confirmed = confirm(
        `Buy Level ${level}?\n\nPrice: ${price} BNB\nTokens: +${CONFIG.TOKEN_REWARDS[level - 1]} GWT`
      );
      
      if (!confirmed) return;
      
      Utils.showLoader(true, `Buying Level ${level}...`);
      
      const receipt = await contracts.buyLevel(level);
      
      console.log('✅ Level purchased:', receipt.transactionHash);
      
      Utils.showNotification(
        `Level ${level} activated! +${CONFIG.TOKEN_REWARDS[level - 1]} GWT`,
        'success'
      );
      
      // Обновить dashboard
      await this.loadDashboard();
      
    } catch (error) {
      console.error('Buy level error:', error);
      
      if (error.message.includes('user rejected') || error.message.includes('User denied')) {
        Utils.showNotification('Transaction cancelled', 'info');
      } else {
        Utils.showNotification('Purchase failed: ' + (error.reason || error.message), 'error');
      }
    } finally {
      Utils.hideLoader();
    }
  }

  // 🔥 РЕАЛИЗОВАНО: Пакетная покупка уровней
  async buyBulkLevels(upToLevel) {
    if (!web3Manager.connected) {
      Utils.showNotification('Please connect wallet first', 'warning');
      return;
    }
    
    if (!this.isRegistered) {
      Utils.showNotification('Please register first', 'warning');
      return;
    }
    
    try {
      // Подсчитать общую стоимость
      let totalCost = 0;
      let totalTokens = 0;
      
      for (let i = 0; i < upToLevel; i++) {
        totalCost += parseFloat(CONFIG.LEVEL_PRICES[i]);
        totalTokens += CONFIG.TOKEN_REWARDS[i];
      }
      
      const confirmed = confirm(
        `Buy Levels 1-${upToLevel}?\n\nTotal Cost: ${totalCost.toFixed(4)} BNB\nTotal Tokens: +${totalTokens} GWT`
      );
      
      if (!confirmed) return;
      
      Utils.showLoader(true, `Buying Levels 1-${upToLevel}...`);
      
      const receipt = await contracts.buyBulkLevels(upToLevel);
      
      console.log('✅ Bulk levels purchased:', receipt.transactionHash);
      
      Utils.showNotification(
        `Levels 1-${upToLevel} activated! +${totalTokens} GWT`,
        'success'
      );
      
      // Обновить dashboard
      await this.loadDashboard();
      
    } catch (error) {
      console.error('Bulk buy error:', error);
      
      if (error.message.includes('user rejected') || error.message.includes('User denied')) {
        Utils.showNotification('Transaction cancelled', 'info');
      } else {
        Utils.showNotification('Purchase failed: ' + (error.reason || error.message), 'error');
      }
    } finally {
      Utils.hideLoader();
    }
  }

  // 🔥 РЕАЛИЗОВАНО: Оплата квартальной активности
  async payQuarterly() {
    if (!web3Manager.connected) {
      Utils.showNotification('Please connect wallet first', 'warning');
      return;
    }
    
    if (!this.isRegistered) {
      Utils.showNotification('Please register first', 'warning');
      return;
    }
    
    try {
      const cost = CONFIG.QUARTERLY_COST;
      
      const confirmed = confirm(
        `Pay Quarterly Activity?\n\nCost: ${cost} BNB\n\nThis payment is required every 90 days to remain active.`
      );
      
      if (!confirmed) return;
      
      Utils.showLoader(true, 'Processing payment...');
      
      const receipt = await contracts.payQuarterly();
      
      console.log('✅ Quarterly payment successful:', receipt.transactionHash);
      
      Utils.showNotification('Quarterly activity paid! Active for 90 days', 'success');
      
      // Обновить dashboard
      await this.loadDashboard();
      
    } catch (error) {
      console.error('Quarterly payment error:', error);
      
      if (error.message.includes('user rejected') || error.message.includes('User denied')) {
        Utils.showNotification('Transaction cancelled', 'info');
      } else {
        Utils.showNotification('Payment failed: ' + (error.reason || error.message), 'error');
      }
    } finally {
      Utils.hideLoader();
    }
  }

  // 🔥 РЕАЛИЗОВАНО: Вывод средств
  async withdrawFromContract(contractType) {
    if (!web3Manager.connected) {
      Utils.showNotification('Please connect wallet first', 'warning');
      return;
    }
    
    try {
      let balances = await contracts.getUserBalances(web3Manager.address);
      let balance, contractName;
      
      if (contractType === 'marketing') {
        balance = balances.referralBalance.add(balances.matrixBalance);
        contractName = 'Marketing Pool';
      } else if (contractType === 'leader') {
        balance = balances.leaderBalance;
        contractName = 'Leader Pool';
      } else if (contractType === 'investment') {
        balance = balances.investmentPending;
        contractName = 'Investment Pool';
      } else {
        Utils.showNotification('Invalid contract type', 'error');
        return;
      }
      
      const balanceBNB = parseFloat(ethers.utils.formatEther(balance));
      
      if (balanceBNB <= 0) {
        Utils.showNotification(`No funds available in ${contractName}`, 'warning');
        return;
      }
      
      const confirmed = confirm(
        `Withdraw from ${contractName}?\n\nAmount: ${balanceBNB.toFixed(4)} BNB`
      );
      
      if (!confirmed) return;
      
      Utils.showLoader(true, `Withdrawing from ${contractName}...`);
      
      let receipt;
      
      if (contractType === 'marketing') {
        receipt = await contracts.withdrawMarketing();
      } else if (contractType === 'leader') {
        receipt = await contracts.withdrawLeaderPool();
      } else if (contractType === 'investment') {
        receipt = await contracts.withdrawInvestment();
      }
      
      console.log('✅ Withdrawal successful:', receipt.transactionHash);
      
      Utils.showNotification(
        `Withdrawn ${balanceBNB.toFixed(4)} BNB from ${contractName}!`,
        'success'
      );
      
      // Обновить балансы
      await this.updateBalances();
      
    } catch (error) {
      console.error('Withdraw error:', error);
      
      if (error.message.includes('user rejected') || error.message.includes('User denied')) {
        Utils.showNotification('Transaction cancelled', 'info');
      } else {
        Utils.showNotification('Withdrawal failed: ' + (error.reason || error.message), 'error');
      }
    } finally {
      Utils.hideLoader();
    }
  }

  async loadDashboard() {
    if (!web3Manager.connected || !this.isRegistered) return;
    
    try {
      // Загрузить основную информацию
      await Promise.all([
        this.updateUserInfo(),
        this.updateBalances(),
        this.updateLevels(),
        this.updateQuarterlyInfo(),
        this.updateTokenInfo()
      ]);
      
      console.log('✅ Dashboard loaded');
      
    } catch (error) {
      console.error('Load dashboard error:', error);
    }
  }

  async updateUserInfo() {
    try {
      const address = web3Manager.address;
      
      // Адрес
      const addressEl = document.getElementById('userAddress');
      if (addressEl) {
        addressEl.textContent = Utils.formatAddress(address);
      }
      
      // Баланс
      const balance = await web3Manager.getBalance();
      const balanceEl = document.getElementById('userBalance');
      if (balanceEl) {
        balanceEl.textContent = `${Utils.formatBNB(balance)} BNB`;
      }
      
      // User Info
      const userInfo = await contracts.getUserInfo(address);
      
      const userIdEl = document.getElementById('userId');
      if (userIdEl) {
        userIdEl.textContent = userInfo.id || '-';
      }
      
      const rankEl = document.getElementById('userRank');
      if (rankEl) {
        const rankName = CONFIG.RANKS[userInfo.rankLevel] || 'None';
        rankEl.textContent = rankName;
      }
      
      // Реферальная ссылка
      const refLinkEl = document.getElementById('refLink');
      if (refLinkEl && userInfo.id) {
        const refLink = `${window.location.origin}?ref=${userInfo.id}`;
        refLinkEl.value = refLink;
      }
      
    } catch (error) {
      console.error('updateUserInfo error:', error);
    }
  }

  async updateBalances() {
    try {
      const address = web3Manager.address;
      const balances = await contracts.getUserBalances(address);
      
      // Marketing Pool
      const marketingBalance = balances.referralBalance.add(balances.matrixBalance);
      const marketingEl = document.getElementById('marketingBalance');
      if (marketingEl) {
        marketingEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(marketingBalance))} BNB`;
      }
      
      // Leader Pool
      const leaderEl = document.getElementById('leaderBalance');
      if (leaderEl) {
        leaderEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(balances.leaderBalance))} BNB`;
      }
      
      // Investment Pool
      const investmentEl = document.getElementById('investmentBalance');
      if (investmentEl) {
        investmentEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(balances.investmentPending))} BNB`;
      }
      
    } catch (error) {
      console.error('updateBalances error:', error);
    }
  }

  async updateLevels() {
    try {
      const address = web3Manager.address;
      const userInfo = await contracts.getUserInfo(address);
      const maxLevel = userInfo.activeLevel;
      
      // Обновить кнопки уровней
      for (let i = 1; i <= 12; i++) {
        const btn = document.getElementById(`buyLevel${i}`);
        if (btn) {
          if (i <= maxLevel) {
            btn.disabled = true;
            btn.textContent = '✓ Active';
            btn.classList.add('active');
          } else if (i === maxLevel + 1) {
            btn.disabled = false;
            btn.textContent = `Buy Level ${i}`;
            btn.classList.remove('active');
          } else {
            btn.disabled = true;
            btn.textContent = 'Locked';
            btn.classList.remove('active');
          }
        }
      }
      
    } catch (error) {
      console.error('updateLevels error:', error);
    }
  }

  async updateQuarterlyInfo() {
    try {
      const address = web3Manager.address;
      const info = await contracts.getQuarterlyInfo(address);
      
      const quarterEl = document.getElementById('currentQuarter');
      if (quarterEl) {
        quarterEl.textContent = info.quarterCount || 0;
      }
      
      const lastPaymentEl = document.getElementById('lastPayment');
      if (lastPaymentEl) {
        if (info.lastPayment > 0) {
          lastPaymentEl.textContent = Utils.formatDate(info.lastPayment);
        } else {
          lastPaymentEl.textContent = 'Never';
        }
      }
      
      const nextPaymentEl = document.getElementById('nextPayment');
      if (nextPaymentEl) {
        if (info.nextPaymentTime > 0) {
          nextPaymentEl.textContent = Utils.formatDate(info.nextPaymentTime);
        } else {
          nextPaymentEl.textContent = 'N/A';
        }
      }
      
      // Проверить нужно ли платить
      if (info.nextPaymentTime > 0) {
        const now = Math.floor(Date.now() / 1000);
        const daysLeft = Math.floor((info.nextPaymentTime - now) / 86400);
        
        if (daysLeft <= 10) {
          const warningEl = document.getElementById('paymentWarning');
          const daysEl = document.getElementById('daysRemaining');
          
          if (warningEl && daysEl) {
            warningEl.style.display = 'flex';
            daysEl.textContent = daysLeft;
          }
        }
      }
      
    } catch (error) {
      console.error('updateQuarterlyInfo error:', error);
    }
  }

  async updateTokenInfo() {
    try {
      const address = web3Manager.address;
      const balance = await contracts.getTokenBalance(address);
      const price = await contracts.getTokenPrice();
      
      const tokenAmountEl = document.getElementById('tokenAmount');
      if (tokenAmountEl) {
        tokenAmountEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(balance))} GWT`;
      }
      
      const tokenPriceEl = document.getElementById('tokenPrice');
      if (tokenPriceEl) {
        tokenPriceEl.textContent = `$${parseFloat(ethers.utils.formatEther(price)).toFixed(6)}`;
      }
      
      const value = parseFloat(ethers.utils.formatEther(balance)) * parseFloat(ethers.utils.formatEther(price));
      const tokenValueEl = document.getElementById('tokenValue');
      if (tokenValueEl) {
        tokenValueEl.textContent = `$${value.toFixed(2)}`;
      }
      
    } catch (error) {
      console.error('updateTokenInfo error:', error);
    }
  }

  clearDashboard() {
    // Очистить все поля
    const fields = [
      'userAddress', 'userBalance', 'userId', 'userRank',
      'marketingBalance', 'leaderBalance', 'investmentBalance',
      'tokenAmount', 'tokenPrice', 'tokenValue'
    ];
    
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = '-';
      }
    });
  }

  startAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(async () => {
      if (web3Manager.connected && this.isRegistered) {
        try {
          await this.updateBalances();
          await this.updateTokenInfo();
        } catch (error) {
          console.error('Auto update error:', error);
        }
      }
    }, 30000); // Каждые 30 секунд
  }

  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

// Создать глобальный экземпляр
const app = new App();

// Инициализация при загрузке страницы
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}
