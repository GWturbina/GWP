/* jshint esversion: 8 */
/* global CONFIG, web3Manager, contracts, Utils, ethers, showPage */

/**
 * GlobalWay Main Application
 * ПОЛНОСТЬЮ ПЕРЕПИСАНО НА ОСНОВЕ РЕАЛЬНЫХ ABI И HTML
 * Версия: 3.0
 * Дата: 01.11.2025
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
        
        // Проверка регистрации
        await this.checkRegistration();
        
        // Загрузить dashboard
        if (this.isRegistered) {
          await this.loadDashboard();
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

  /**
   * Проверка регистрации
   */
  async checkRegistration() {
    try {
      const isReg = await contracts.isUserRegistered(web3Manager.address);
      this.isRegistered = isReg;
      
      if (!isReg) {
        console.log('⚠️ User not registered');
        this.showConnectionAlert('register');
      } else {
        console.log('✅ User registered');
      }
      
      return isReg;
    } catch (error) {
      console.error('checkRegistration error:', error);
      return false;
    }
  }

  /**
   * Показать alert о статусе подключения
   * HTML: #connectionAlert, #alertMessage, #alertAction
   */
  showConnectionAlert(type) {
    const alert = document.getElementById('connectionAlert');
    const message = document.getElementById('alertMessage');
    const action = document.getElementById('alertAction');
    
    if (!alert || !message || !action) return;
    
    switch(type) {
      case 'register':
        message.textContent = 'Please register to continue';
        action.textContent = 'Register';
        action.onclick = () => {
          if (typeof showRegistrationModal === 'function') {
            showRegistrationModal();
          }
        };
        break;
      case 'connect':
        message.textContent = 'Please connect your wallet';
        action.textContent = 'Connect';
        action.onclick = () => this.connectWallet();
        break;
      case 'wrongNetwork':
        message.textContent = 'Wrong network. Switch to opBNB';
        action.textContent = 'Switch Network';
        action.onclick = () => web3Manager.switchNetwork();
        break;
    }
    
    alert.style.display = 'flex';
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
    // HTML: #payActivityBtn
    const payActivityBtn = document.getElementById('payActivityBtn');
    if (payActivityBtn) {
      payActivityBtn.addEventListener('click', () => this.payQuarterly());
    }
    
    // Кнопки покупки уровней
    this.setupLevelButtons();
    
    // Кнопки массовой покупки
    this.setupBulkButtons();
    
    // Кнопка копирования реферальной ссылки
    // HTML: #copyRefLink
    const copyRefBtn = document.getElementById('copyRefLink');
    if (copyRefBtn) {
      copyRefBtn.addEventListener('click', () => this.copyReferralLink());
    }
    
    // Кнопка генерации QR
    // HTML: #generateQR
    const qrBtn = document.getElementById('generateQR');
    if (qrBtn) {
      qrBtn.addEventListener('click', () => this.generateQRCode());
    }
  }

  setupLevelButtons() {
    // Создаем кнопки для 12 уровней
    for (let i = 1; i <= 12; i++) {
      const btn = document.getElementById(`buyLevel${i}`);
      if (btn) {
        btn.addEventListener('click', () => this.buyLevel(i));
      }
    }
  }

  setupBulkButtons() {
    // HTML: .bulk-btn с data-levels
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

  /**
   * Покупка уровня
   * Вызывает: contracts.buyLevel() → GlobalWay.activateLevel()
   */
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
      const tokens = CONFIG.TOKEN_REWARDS[level - 1];
      
      const confirmed = confirm(
        `Buy Level ${level}?\n\n` +
        `Price: ${price} BNB\n` +
        `Bonus: +${tokens} GWT tokens\n\n` +
        `Proceed?`
      );
      
      if (!confirmed) return;
      
      Utils.showLoader(true, `Buying Level ${level}...`);
      
      const receipt = await contracts.buyLevel(level);
      
      console.log('✅ Level purchased:', receipt.transactionHash);
      
      Utils.showNotification(
        `Level ${level} activated! +${tokens} GWT`,
        'success'
      );
      
      // Обновить dashboard
      await this.loadDashboard();
      
    } catch (error) {
      console.error('Buy level error:', error);
      
      if (error.message.includes('user rejected') || error.message.includes('User denied')) {
        Utils.showNotification('Transaction cancelled', 'info');
      } else if (error.message.includes('insufficient funds')) {
        Utils.showNotification('Insufficient BNB balance', 'error');
      } else {
        const errorMsg = error.reason || error.message || 'Purchase failed';
        Utils.showNotification(errorMsg, 'error');
      }
    } finally {
      Utils.hideLoader();
    }
  }

  /**
   * Пакетная покупка уровней
   * Вызывает: contracts.buyBulkLevels() → GlobalWay.activateBulkLevels()
   */
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
      // Подсчитать общую стоимость и токены
      let totalCost = 0;
      let totalTokens = 0;
      
      for (let i = 0; i < upToLevel; i++) {
        totalCost += parseFloat(CONFIG.LEVEL_PRICES[i]);
        totalTokens += CONFIG.TOKEN_REWARDS[i];
      }
      
      const confirmed = confirm(
        `Buy Levels 1-${upToLevel}?\n\n` +
        `Total Cost: ${totalCost.toFixed(4)} BNB\n` +
        `Total Tokens: +${totalTokens} GWT\n\n` +
        `Proceed?`
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
      } else if (error.message.includes('insufficient funds')) {
        Utils.showNotification('Insufficient BNB balance', 'error');
      } else {
        const errorMsg = error.reason || error.message || 'Purchase failed';
        Utils.showNotification(errorMsg, 'error');
      }
    } finally {
      Utils.hideLoader();
    }
  }

  /**
   * Оплата квартальной активности
   * Вызывает: contracts.payQuarterly() → Quarterly.payQuarterlyActivity()
   */
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
      const cost = '0.075';
      
      const confirmed = confirm(
        `Pay Quarterly Activity?\n\n` +
        `Cost: ${cost} BNB\n` +
        `Creates 3 tech accounts\n\n` +
        `Proceed?`
      );
      
      if (!confirmed) return;
      
      Utils.showLoader(true, 'Processing payment...');
      
      const receipt = await contracts.payQuarterly();
      
      console.log('✅ Quarterly payment successful:', receipt.transactionHash);
      
      Utils.showNotification('Quarterly activity paid!', 'success');
      
      // Обновить quarterly info
      await this.updateQuarterlyInfo();
      
    } catch (error) {
      console.error('Pay quarterly error:', error);
      
      if (error.message.includes('user rejected') || error.message.includes('User denied')) {
        Utils.showNotification('Transaction cancelled', 'info');
      } else if (error.message.includes('insufficient funds')) {
        Utils.showNotification('Insufficient BNB balance', 'error');
      } else {
        const errorMsg = error.reason || error.message || 'Payment failed';
        Utils.showNotification(errorMsg, 'error');
      }
    } finally {
      Utils.hideLoader();
    }
  }

  /**
   * Вывод средств из контракта
   * HTML: onclick="app.withdrawFromContract('marketing'|'leader'|'investment')"
   */
  async withdrawFromContract(poolType) {
    if (!web3Manager.connected) {
      Utils.showNotification('Please connect wallet first', 'warning');
      return;
    }
    
    try {
      const confirmed = confirm(`Withdraw from ${poolType} pool?`);
      if (!confirmed) return;
      
      Utils.showLoader(true, 'Processing withdrawal...');
      
      let receipt;
      let contractName = '';
      
      switch(poolType) {
        case 'marketing':
          // Вызывает: Marketing.withdrawReferral() + withdrawMatrix()
          await contracts.withdrawMarketing();
          contractName = 'Marketing';
          break;
          
        case 'leader':
          // Вызывает: LeaderPool.claimRankBonus()
          receipt = await contracts.withdrawLeaderPool();
          contractName = 'Leader Pool';
          break;
          
        case 'investment':
          // ПРИМЕЧАНИЕ: Investment выплаты автоматические через admin
          const info = await contracts.withdrawInvestment();
          Utils.showNotification(
            'Investment rewards are distributed automatically',
            'info'
          );
          Utils.hideLoader();
          return;
          
        default:
          throw new Error('Invalid pool type');
      }
      
      console.log('✅ Withdrawal successful');
      
      Utils.showNotification(
        `Withdrawn from ${contractName}!`,
        'success'
      );
      
      // Обновить балансы
      await this.updateBalances();
      
    } catch (error) {
      console.error('Withdraw error:', error);
      
      if (error.message.includes('user rejected') || error.message.includes('User denied')) {
        Utils.showNotification('Transaction cancelled', 'info');
      } else if (error.message.includes('No balance')) {
        Utils.showNotification('No balance to withdraw', 'warning');
      } else {
        const errorMsg = error.reason || error.message || 'Withdrawal failed';
        Utils.showNotification(errorMsg, 'error');
      }
    } finally {
      Utils.hideLoader();
    }
  }

  /**
   * Копирование реферальной ссылки
   * HTML: #refLink, #copyRefLink
   */
  async copyReferralLink() {
    const refLink = document.getElementById('refLink');
    if (!refLink || !refLink.value) {
      Utils.showNotification('No referral link available', 'warning');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(refLink.value);
      Utils.showNotification('Referral link copied!', 'success');
    } catch (error) {
      console.error('Copy failed:', error);
      
      // Fallback: select text
      refLink.select();
      document.execCommand('copy');
      Utils.showNotification('Referral link copied!', 'success');
    }
  }

  /**
   * Генерация QR кода
   * HTML: #generateQR
   */
  async generateQRCode() {
    const refLink = document.getElementById('refLink');
    if (!refLink || !refLink.value) {
      Utils.showNotification('No referral link available', 'warning');
      return;
    }
    
    // TODO: Реализовать QR код (нужна библиотека QRCode.js)
    Utils.showNotification('QR Code generation - coming soon', 'info');
  }

  /**
   * Загрузка всех данных dashboard
   */
  async loadDashboard() {
    if (!web3Manager.connected || !this.isRegistered) return;
    
    try {
      console.log('📊 Loading dashboard...');
      
      // Загрузить все данные параллельно
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

  /**
   * Обновить информацию о пользователе
   * HTML: #userAddress, #userBalance, #userId, #userRank, #refLink
   */
  async updateUserInfo() {
    try {
      const address = web3Manager.address;
      
      // Адрес
      // HTML: #userAddress
      const addressEl = document.getElementById('userAddress');
      if (addressEl) {
        addressEl.textContent = Utils.formatAddress(address);
      }
      
      // Баланс BNB
      // HTML: #userBalance
      const balance = await web3Manager.provider.getBalance(address);
      const balanceEl = document.getElementById('userBalance');
      if (balanceEl) {
        balanceEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(balance))} BNB`;
      }
      
      // User Info из контракта
      // Вызывает: GlobalWay.users(address)
      const userInfo = await contracts.getUserInfo(address);
      
      // User ID
      // HTML: #userId
      const userIdEl = document.getElementById('userId');
      if (userIdEl) {
        userIdEl.textContent = userInfo.id || '-';
      }
      
      // Rank
      // HTML: #userRank
      // Вызывает: LeaderPool.getUserRankInfo(address)
      const rankInfo = await contracts.getUserRankInfo(address);
      const rankEl = document.getElementById('userRank');
      if (rankEl) {
        const rankNames = ['None', 'Bronze', 'Silver', 'Gold', 'Platinum'];
        const rankName = rankNames[rankInfo.currentRank] || 'None';
        rankEl.textContent = rankName;
      }
      
      // Реферальная ссылка
      // HTML: #refLink
      const refLinkEl = document.getElementById('refLink');
      if (refLinkEl && userInfo.id) {
        const refLink = `${window.location.origin}?ref=${userInfo.id}`;
        refLinkEl.value = refLink;
      }
      
    } catch (error) {
      console.error('updateUserInfo error:', error);
    }
  }

  /**
   * Обновить балансы контрактов
   * HTML: #marketingBalance, #leaderBalance, #investmentBalance
   */
  async updateBalances() {
    try {
      const address = web3Manager.address;
      
      // Marketing Pool Balance
      // HTML: #marketingBalance
      // Вызывает: Marketing.getUserBalances(address)
      const marketingBalances = await contracts.getUserBalances(address);
      const totalMarketing = marketingBalances.referralBalance.add(marketingBalances.matrixBalance);
      
      const marketingEl = document.getElementById('marketingBalance');
      if (marketingEl) {
        marketingEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(totalMarketing))} BNB`;
      }
      
      // Leader Pool Balance
      // HTML: #leaderBalance
      // Вызывает: LeaderPool.getUserRankInfo(address)
      const rankInfo = await contracts.getUserRankInfo(address);
      const leaderEl = document.getElementById('leaderBalance');
      if (leaderEl) {
        leaderEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(rankInfo.rankBalance))} BNB`;
      }
      
      // Investment Pool Balance
      // HTML: #investmentBalance
      // Вызывает: Investment.getInvestorInfo(address)
      const investorInfo = await contracts.getInvestorInfo(address);
      const investmentEl = document.getElementById('investmentBalance');
      if (investmentEl) {
        investmentEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(investorInfo.pendingRewards))} BNB`;
      }
      
    } catch (error) {
      console.error('updateBalances error:', error);
    }
  }

  /**
   * Обновить статус уровней
   * HTML: #buyLevel1...#buyLevel12
   */
  async updateLevels() {
    try {
      const address = web3Manager.address;
      
      // Получить информацию о пользователе
      const userInfo = await contracts.getUserInfo(address);
      const maxLevel = userInfo.activeLevel;
      
      // Обновить кнопки уровней
      for (let i = 1; i <= 12; i++) {
        const btn = document.getElementById(`buyLevel${i}`);
        if (!btn) continue;
        
        // Проверить активен ли уровень
        // Вызывает: GlobalWay.isLevelActive(address, level)
        const isActive = await contracts.isLevelActive(address, i);
        
        if (isActive) {
          // Уровень активен
          btn.disabled = true;
          btn.textContent = '✓ Active';
          btn.classList.add('active');
          btn.classList.remove('locked');
        } else if (i === maxLevel + 1) {
          // Следующий доступный уровень
          btn.disabled = false;
          btn.textContent = `Buy Level ${i}`;
          btn.classList.remove('active', 'locked');
        } else {
          // Заблокирован
          btn.disabled = true;
          btn.textContent = 'Locked';
          btn.classList.remove('active');
          btn.classList.add('locked');
        }
      }
      
    } catch (error) {
      console.error('updateLevels error:', error);
    }
  }

  /**
   * Обновить информацию о квартальной активности
   * HTML: #currentQuarter, #lastPayment, #nextPayment, #paymentWarning, #daysRemaining
   */
  async updateQuarterlyInfo() {
    try {
      const address = web3Manager.address;
      
      // Вызывает: Quarterly.getUserQuarterlyInfo(address)
      const info = await contracts.getQuarterlyInfo(address);
      
      // Current Quarter
      // HTML: #currentQuarter
      const quarterEl = document.getElementById('currentQuarter');
      if (quarterEl) {
        quarterEl.textContent = info.currentQuarter || 0;
      }
      
      // Last Payment
      // HTML: #lastPayment
      const lastPaymentEl = document.getElementById('lastPayment');
      if (lastPaymentEl) {
        if (info.lastPaymentTime > 0) {
          lastPaymentEl.textContent = Utils.formatDate(info.lastPaymentTime);
        } else {
          lastPaymentEl.textContent = 'Never';
        }
      }
      
      // Next Payment
      // HTML: #nextPayment
      const nextPaymentEl = document.getElementById('nextPayment');
      if (nextPaymentEl) {
        if (info.nextPaymentDue > 0) {
          nextPaymentEl.textContent = Utils.formatDate(info.nextPaymentDue);
        } else {
          nextPaymentEl.textContent = 'N/A';
        }
      }
      
      // Проверить warning
      // HTML: #paymentWarning, #daysRemaining
      if (info.nextPaymentDue > 0) {
        const now = Math.floor(Date.now() / 1000);
        const daysLeft = Math.floor((info.nextPaymentDue - now) / 86400);
        
        const daysEl = document.getElementById('daysRemaining');
        if (daysEl) {
          daysEl.textContent = daysLeft;
        }
        
        const warningEl = document.getElementById('paymentWarning');
        if (warningEl) {
          if (daysLeft <= 10 && daysLeft >= 0) {
            warningEl.style.display = 'flex';
          } else {
            warningEl.style.display = 'none';
          }
        }
      }
      
    } catch (error) {
      console.error('updateQuarterlyInfo error:', error);
    }
  }

  /**
   * Обновить информацию о токенах
   * HTML: #tokenAmount, #tokenPrice, #tokenValue
   */
  async updateTokenInfo() {
    try {
      const address = web3Manager.address;
      
      // Token Balance
      // HTML: #tokenAmount
      // Вызывает: GWTToken.balanceOf(address)
      const balance = await contracts.getTokenBalance(address);
      const tokenAmountEl = document.getElementById('tokenAmount');
      if (tokenAmountEl) {
        tokenAmountEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(balance))} GWT`;
      }
      
      // Token Price
      // HTML: #tokenPrice
      // Вызывает: GWTToken.currentPrice()
      const price = await contracts.getTokenPrice();
      const tokenPriceEl = document.getElementById('tokenPrice');
      if (tokenPriceEl) {
        const priceInUSD = parseFloat(ethers.utils.formatEther(price));
        tokenPriceEl.textContent = `$${priceInUSD.toFixed(6)}`;
      }
      
      // Token Value (USD)
      // HTML: #tokenValue
      const value = parseFloat(ethers.utils.formatEther(balance)) * 
                   parseFloat(ethers.utils.formatEther(price));
      const tokenValueEl = document.getElementById('tokenValue');
      if (tokenValueEl) {
        tokenValueEl.textContent = `$${value.toFixed(2)}`;
      }
      
    } catch (error) {
      console.error('updateTokenInfo error:', error);
    }
  }

  /**
   * Очистить dashboard
   */
  clearDashboard() {
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
    
    // Очистить refLink
    const refLinkEl = document.getElementById('refLink');
    if (refLinkEl) {
      refLinkEl.value = '';
    }
  }

  /**
   * Запустить автообновление
   */
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
    
    console.log('✅ Auto-update started');
  }

  /**
   * Остановить автообновление
   */
  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('⏹️ Auto-update stopped');
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
