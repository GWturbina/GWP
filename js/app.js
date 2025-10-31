/* jshint esversion: 8 */
/* global CONFIG, web3Manager, contracts, uiManager, Utils, i18n, ethers, QRCode */

/**
 * GlobalWay DApp Main Application
 * Головний клас додатку з повною інтеграцією
 */

class Application {
  constructor() {
    this.initialized = false;
    this.currentQR = null; // Зберігаємо поточний QR код
  }

  /**
   * Ініціалізація додатку
   */
  async init() {
    console.log('🚀 GlobalWay DApp starting...');
    
    try {
      // 1. Ініціалізація UI
      uiManager.init();
      console.log('✅ UI initialized');
      
      // 2. Ініціалізація i18n (використовуємо правильну функцію)
      if (typeof i18n !== 'undefined' && i18n) {
        try {
          // Ваш i18n.js має функцію initI18n(), а не init()
          if (typeof i18n.initI18n === 'function') {
            await i18n.initI18n();
            console.log('✅ i18n initialized');
          } else if (typeof i18n.init === 'function') {
            await i18n.init();
            console.log('✅ i18n initialized');
          } else {
            console.log('ℹ️ i18n already initialized');
          }
        } catch (i18nError) {
          console.warn('⚠️ i18n initialization failed:', i18nError);
          // Продовжуємо без i18n
        }
      } else {
        console.log('ℹ️ i18n not available');
      }
      
      // 3. Ініціалізація Web3
      await web3Manager.init();
      console.log('✅ Web3 initialized');
      
      // 4. Якщо підключено - ініціалізувати контракти
      if (web3Manager.connected) {
        await this.onWalletConnected();
      }
      
      // 5. Налаштування обробників подій
      this.setupEventHandlers();
      
      this.initialized = true;
      console.log('✅ DApp initialized successfully');
      
    } catch (error) {
      console.error('❌ DApp initialization failed:', error);
      Utils.showNotification('Initialization failed: ' + error.message, 'error');
    }
  }

  /**
   * Налаштування обробників подій
   */
  setupEventHandlers() {
    // Connect Wallet button
    const connectBtn = document.getElementById('connectWallet');
    if (connectBtn) {
      connectBtn.addEventListener('click', async () => {
        try {
          await web3Manager.connect();
          await this.onWalletConnected();
        } catch (error) {
          console.error('Connection failed:', error);
          Utils.showNotification(error.message, 'error');
        }
      });
    }

    // Copy Referral Link
    const copyRefBtn = document.getElementById('copyRefLink');
    if (copyRefBtn) {
      copyRefBtn.addEventListener('click', () => {
        const refLink = document.getElementById('refLink');
        if (refLink) {
          Utils.copyToClipboard(refLink.value);
        }
      });
    }

    // Generate QR Code - ВИПРАВЛЕНИЙ ГЕНЕРАТОР
    const generateQRBtn = document.getElementById('generateQR');
    if (generateQRBtn) {
      generateQRBtn.addEventListener('click', () => {
        this.generateReferralQR();
      });
    }

    // Pay Quarterly Activity
    const payActivityBtn = document.getElementById('payActivityBtn');
    if (payActivityBtn) {
      payActivityBtn.addEventListener('click', async () => {
        await this.payQuarterlyActivity();
      });
    }

    // Registration
    const activateBtn = document.getElementById('activateBtn');
    if (activateBtn) {
      activateBtn.addEventListener('click', async () => {
        await this.registerUser();
      });
    }

    // Bulk level buttons
    document.querySelectorAll('.bulk-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const upToLevel = parseInt(btn.dataset.levels);
        await this.buyBulkLevels(upToLevel);
      });
    });
  }

  /**
   * Обробник підключення кошелька
   */
  async onWalletConnected() {
    try {
      console.log('👛 Wallet connected:', web3Manager.address);
      
      // Ініціалізація контрактів
      await contracts.init();
      console.log('✅ Contracts initialized');
      
      // Завантаження даних користувача
      await this.loadUserData();
      
      // Перевірка чи користувач зареєстрований
      const user = await contracts.getUserInfo(web3Manager.address);
      
      if (!user.isActive) {
        console.log('⚠️ User not registered');
        // Показати landing з формою реєстрації
        uiManager.showPage('landing');
        
        // Прокрутити до реєстрації
        const regSection = document.getElementById('registration');
        if (regSection) {
          regSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Показати alert
        this.showConnectionAlert('register');
      } else {
        console.log('✅ User registered:', user.id);
        // Перехід на dashboard
        uiManager.showPage('dashboard');
        
        // Приховати alert
        this.hideConnectionAlert();
      }
      
      // Оновити UI
      this.updateWalletUI();
      
    } catch (error) {
      console.error('❌ Wallet connection handler failed:', error);
      Utils.showNotification('Failed to load user data', 'error');
    }
  }

  /**
   * Завантаження даних користувача
   */
  async loadUserData() {
    try {
      const address = web3Manager.address;
      
      if (!address) {
        console.log('⚠️ No address available');
        return;
      }
      
      // Баланс BNB
      const balance = await web3Manager.provider.getBalance(address);
      const userBalanceEl = document.getElementById('userBalance');
      if (userBalanceEl) {
        userBalanceEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(balance))} BNB`;
      }
      
      // Адреса
      const userAddressEl = document.getElementById('userAddress');
      if (userAddressEl) {
        userAddressEl.textContent = Utils.formatAddress(address);
      }
      
      // Інформація користувача з контракту
      const user = await contracts.getUserInfo(address);
      
      if (user.id && user.id !== '' && user.id !== '0') {
        // User ID
        const userIdEl = document.getElementById('userId');
        if (userIdEl) {
          userIdEl.textContent = user.id;
        }
        
        // Rank
        const userRankEl = document.getElementById('userRank');
        if (userRankEl) {
          userRankEl.textContent = this.getRankName(user.rankLevel);
        }
        
        // Реферальне посилання
        const refLink = `${window.location.origin}?ref=${user.id}`;
        const refLinkEl = document.getElementById('refLink');
        if (refLinkEl) {
          refLinkEl.value = refLink;
        }
        
        // Оновити registration address
        const regAddressEl = document.getElementById('regAddress');
        if (regAddressEl) {
          regAddressEl.textContent = Utils.formatAddress(address);
        }
      }
      
      console.log('✅ User data loaded');
      
    } catch (error) {
      console.error('❌ Load user data failed:', error);
    }
  }

  /**
   * Отримати назву рангу
   */
  getRankName(rankLevel) {
    const ranks = ['None', 'Bronze', 'Silver', 'Gold', 'Platinum'];
    return ranks[rankLevel] || 'None';
  }

  /**
   * Оновити UI кошелька
   */
  updateWalletUI() {
    const connectBtn = document.getElementById('connectWallet');
    
    if (web3Manager.connected && web3Manager.address) {
      if (connectBtn) {
        connectBtn.textContent = Utils.formatAddress(web3Manager.address);
        connectBtn.classList.add('connected');
      }
    } else {
      if (connectBtn) {
        connectBtn.textContent = 'Connect Wallet';
        connectBtn.classList.remove('connected');
      }
    }
  }

  /**
   * Показати/сховати Connection Alert
   */
  showConnectionAlert(type) {
    const alertEl = document.getElementById('connectionAlert');
    const messageEl = document.getElementById('alertMessage');
    const actionBtn = document.getElementById('alertAction');
    
    if (!alertEl || !messageEl || !actionBtn) return;
    
    switch (type) {
      case 'noWallet':
        messageEl.textContent = 'Please connect your wallet';
        actionBtn.textContent = 'Connect';
        actionBtn.onclick = async () => {
          try {
            await web3Manager.connect();
            await this.onWalletConnected();
          } catch (error) {
            Utils.showNotification(error.message, 'error');
          }
        };
        break;
        
      case 'register':
        messageEl.textContent = 'Please register to continue';
        actionBtn.textContent = 'Register';
        actionBtn.onclick = () => {
          const regSection = document.getElementById('registration');
          if (regSection) {
            regSection.scrollIntoView({ behavior: 'smooth' });
          }
        };
        break;
        
      case 'wrongNetwork':
        messageEl.textContent = 'Wrong network. Please switch to opBNB';
        actionBtn.textContent = 'Switch Network';
        actionBtn.onclick = async () => {
          try {
            await web3Manager.switchNetwork();
            this.hideConnectionAlert();
          } catch (error) {
            Utils.showNotification('Failed to switch network', 'error');
          }
        };
        break;
    }
    
    alertEl.style.display = 'block';
  }

  hideConnectionAlert() {
    const alertEl = document.getElementById('connectionAlert');
    if (alertEl) {
      alertEl.style.display = 'none';
    }
  }

  /**
   * ВИПРАВЛЕНИЙ ГЕНЕРАТОР QR-КОДУ
   * Використовує правильну бібліотеку QRCode.js
   */
  generateReferralQR() {
    const refLinkEl = document.getElementById('refLink');
    if (!refLinkEl || !refLinkEl.value) {
      Utils.showNotification('Referral link not available', 'error');
      return;
    }
    
    const refLink = refLinkEl.value;
    
    // Створити модальне вікно для QR коду
    let qrModal = document.getElementById('qrModal');
    
    if (!qrModal) {
      // Створити модал якщо не існує
      qrModal = document.createElement('div');
      qrModal.id = 'qrModal';
      qrModal.className = 'modal';
      qrModal.innerHTML = `
        <div class="modal-content qr-modal-content">
          <span class="close" onclick="document.getElementById('qrModal').style.display='none'">&times;</span>
          <h3>Referral QR Code</h3>
          <div id="qrCodeContainer" style="text-align: center; padding: 20px;">
            <div id="qrcode"></div>
          </div>
          <div class="qr-actions" style="text-align: center; margin-top: 20px;">
            <button class="btn-primary" onclick="app.downloadQRCode()">Download QR</button>
            <button class="btn-secondary" onclick="document.getElementById('qrModal').style.display='none'">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(qrModal);
    }
    
    // Очистити попередній QR код
    const qrContainer = document.getElementById('qrcode');
    if (qrContainer) {
      qrContainer.innerHTML = '';
    }
    
    // Створити новий QR код з правильними параметрами
    try {
      // Використовуємо QRCode.js бібліотеку
      this.currentQR = new QRCode(qrContainer, {
        text: refLink,
        width: 256,
        height: 256,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
      
      console.log('✅ QR Code generated successfully');
      
      // Показати модал
      qrModal.style.display = 'block';
      
      Utils.showNotification('QR Code generated!', 'success');
      
    } catch (error) {
      console.error('❌ QR generation failed:', error);
      Utils.showNotification('Failed to generate QR code', 'error');
    }
  }

  /**
   * Завантажити QR код як зображення
   */
  downloadQRCode() {
    try {
      const qrContainer = document.getElementById('qrcode');
      if (!qrContainer) return;
      
      // Знайти canvas або img елемент
      const canvas = qrContainer.querySelector('canvas');
      const img = qrContainer.querySelector('img');
      
      if (canvas) {
        // Якщо є canvas - конвертувати в image
        const dataUrl = canvas.toDataURL('image/png');
        this.downloadImage(dataUrl, 'globalway-referral-qr.png');
      } else if (img) {
        // Якщо є img - використати його src
        this.downloadImage(img.src, 'globalway-referral-qr.png');
      } else {
        Utils.showNotification('QR code not found', 'error');
      }
      
    } catch (error) {
      console.error('❌ QR download failed:', error);
      Utils.showNotification('Failed to download QR code', 'error');
    }
  }

  /**
   * Допоміжна функція для завантаження зображення
   */
  downloadImage(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    Utils.showNotification('QR Code downloaded!', 'success');
  }

  /**
   * Реєстрація нового користувача
   */
  async registerUser() {
    try {
      if (!web3Manager.connected) {
        Utils.showNotification('Please connect wallet first', 'error');
        return;
      }
      
      const refInput = document.getElementById('refInput');
      if (!refInput || !refInput.value) {
        Utils.showNotification('Please enter Referral ID', 'error');
        return;
      }
      
      const refId = refInput.value.trim();
      
      // Валідація формату ID
      if (!refId.startsWith('GW') || refId.length !== 10) {
        Utils.showNotification('Invalid Referral ID format (should be GWXXXXXXX)', 'error');
        return;
      }
      
      // Отримати адресу спонсора
      const sponsorAddress = await contracts.getAddressByUserId(refId);
      
      if (sponsorAddress === ethers.constants.AddressZero) {
        Utils.showNotification('Referral ID not found', 'error');
        return;
      }
      
      // Перевірка балансу
      const balance = await web3Manager.provider.getBalance(web3Manager.address);
      const requiredBalance = ethers.utils.parseEther(CONFIG.LEVEL_PRICES[0]);
      
      if (balance.lt(requiredBalance)) {
        Utils.showNotification('Insufficient BNB balance', 'error');
        return;
      }
      
      // Підтвердження
      const confirmed = confirm(
        `Register with referrer ${refId}?\n\n` +
        `Cost: ${CONFIG.LEVEL_PRICES[0]} BNB (Level 1)\n\n` +
        `Press OK to continue.`
      );
      
      if (!confirmed) return;
      
      Utils.showLoader(true);
      
      // Реєстрація
      await contracts.register(sponsorAddress);
      
      Utils.showNotification('Registration successful!', 'success');
      
      // Перезавантажити дані
      await this.loadUserData();
      
      // Перехід на dashboard
      setTimeout(() => {
        uiManager.showPage('dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Registration failed:', error);
      
      let errorMsg = 'Registration failed';
      if (error.message.includes('Already registered')) {
        errorMsg = 'Address already registered';
      } else if (error.message.includes('rejected')) {
        errorMsg = 'Transaction cancelled';
      }
      
      Utils.showNotification(errorMsg, 'error');
      
    } finally {
      Utils.showLoader(false);
    }
  }

  // ==========================================
  // DASHBOARD FUNCTIONS
  // ==========================================

  /**
   * Завантаження Dashboard
   */
  async loadDashboard() {
    console.log('📊 Loading dashboard...');
    
    if (!web3Manager.connected) {
      this.showConnectionAlert('noWallet');
      return;
    }
    
    try {
      await this.loadUserData();
      await this.loadQuarterlyActivity();
      // await this.loadLevelManagement(); // TODO: fix
      await this.loadContractBalances();
      await this.loadEarningsByRank();
      await this.loadTransactionHistory();
      await this.loadTokensSummary();
      
      console.log('✅ Dashboard loaded');
      
    } catch (error) {
      console.error('❌ Load dashboard failed:', error);
      Utils.showNotification('Failed to load dashboard', 'error');
    }
  }

  /**
   * Завантаження квартальної активності
   */
  async loadQuarterlyActivity() {
    try {
      const address = web3Manager.address;
      const quarterlyInfo = await contracts.getQuarterlyInfo(address);
      
      // Current Quarter
      const currentQuarterEl = document.getElementById('currentQuarter');
      if (currentQuarterEl) {
        currentQuarterEl.textContent = quarterlyInfo.currentQuarter;
      }
      
      // Last Payment
      const lastPaymentEl = document.getElementById('lastPayment');
      if (lastPaymentEl) {
        if (quarterlyInfo.lastPaymentTime > 0) {
          lastPaymentEl.textContent = Utils.formatDate(quarterlyInfo.lastPaymentTime);
        } else {
          lastPaymentEl.textContent = 'Never';
        }
      }
      
      // Next Payment
      const nextPaymentEl = document.getElementById('nextPayment');
      if (nextPaymentEl) {
        if (quarterlyInfo.nextPaymentDue > 0) {
          nextPaymentEl.textContent = Utils.formatDate(quarterlyInfo.nextPaymentDue);
        } else {
          nextPaymentEl.textContent = '-';
        }
      }
      
      // Розрахунок днів до оплати
      if (quarterlyInfo.nextPaymentDue > 0) {
        const now = Math.floor(Date.now() / 1000);
        const daysRemaining = Math.floor((quarterlyInfo.nextPaymentDue - now) / 86400);
        
        const daysRemainingEl = document.getElementById('daysRemaining');
        if (daysRemainingEl) {
          daysRemainingEl.textContent = Math.max(0, daysRemaining);
        }
        
        // Показати попередження якщо < 10 днів
        const paymentWarningEl = document.getElementById('paymentWarning');
        if (paymentWarningEl) {
          if (daysRemaining > 0 && daysRemaining <= 10) {
            paymentWarningEl.style.display = 'flex';
          } else {
            paymentWarningEl.style.display = 'none';
          }
        }
      }
      
    } catch (error) {
      console.error('loadQuarterlyActivity error:', error);
    }
  }

  /**
   * Оплата квартальної активності
   */
  async payQuarterlyActivity() {
    try {
      if (!web3Manager.connected) {
        Utils.showNotification('Please connect wallet', 'error');
        return;
      }
      
      // Перевірка чи може оплатити
      const canPay = await contracts.canPayQuarterly(web3Manager.address);
      
      if (!canPay) {
        Utils.showNotification('Cannot pay quarterly activity yet', 'warning');
        return;
      }
      
      // Перевірка балансу
      const balance = await web3Manager.provider.getBalance(web3Manager.address);
      const requiredBalance = ethers.utils.parseEther(CONFIG.QUARTERLY_COST);
      
      if (balance.lt(requiredBalance)) {
        Utils.showNotification('Insufficient BNB balance', 'error');
        return;
      }
      
      // Підтвердження
      const confirmed = confirm(
        `Pay quarterly activity fee?\n\n` +
        `Cost: ${CONFIG.QUARTERLY_COST} BNB\n\n` +
        `Press OK to continue.`
      );
      
      if (!confirmed) return;
      
      Utils.showLoader(true);
      
      // Оплата
      await contracts.payQuarterlyActivity();
      
      Utils.showNotification('Quarterly activity paid!', 'success');
      
      // Оновити дані
      await this.loadQuarterlyActivity();
      
    } catch (error) {
      console.error('❌ Pay quarterly failed:', error);
      Utils.showNotification('Payment failed: ' + error.message, 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  /**
   * Завантаження управління рівнями
   */
  async loadLevelManagement() {
    try {
      const address = web3Manager.address;
      const container = document.getElementById('individualLevels');
      
      if (!container) return;
      
      container.innerHTML = '';
      
      for (let i = 1; i <= 12; i++) {
        const levelInfo = await contracts.getUserLevel(address, i);
        
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        btn.dataset.level = i;
        
        const levelNum = document.createElement('span');
        levelNum.className = 'level-number';
        levelNum.textContent = `Level ${i}`;
        
        const levelPrice = document.createElement('span');
        levelPrice.className = 'level-price';
        levelPrice.textContent = `${CONFIG.LEVEL_PRICES[i-1]} BNB`;
        
        const levelStatus = document.createElement('span');
        levelStatus.className = 'level-status';
        
        if (levelInfo.isActive) {
          btn.classList.add('active');
          btn.disabled = true;
          levelStatus.textContent = '✓ Active';
          levelStatus.classList.add('active-status');
        } else {
          // Перевірка чи можна купити (попередній рівень активний)
          let canBuy = true;
          if (i > 1) {
            const prevLevelInfo = await contracts.getUserLevel(address, i - 1);
            canBuy = prevLevelInfo.isActive;
          }
          
          if (canBuy) {
            levelStatus.textContent = 'Buy';
            btn.onclick = () => this.buyLevel(i);
          } else {
            btn.disabled = true;
            btn.classList.add('locked');
            levelStatus.textContent = 'Locked';
          }
        }
        
        btn.appendChild(levelNum);
        btn.appendChild(levelPrice);
        btn.appendChild(levelStatus);
        
        container.appendChild(btn);
      }
      
    } catch (error) {
      console.error('loadLevelManagement error:', error);
    }
  }

  /**
   * Купівля окремого рівня
   */
  async buyLevel(level) {
    try {
      if (!web3Manager.connected) {
        Utils.showNotification('Please connect wallet', 'error');
        return;
      }
      
      const price = CONFIG.LEVEL_PRICES[level - 1];
      
      // Перевірка балансу
      const balance = await web3Manager.provider.getBalance(web3Manager.address);
      const requiredBalance = ethers.utils.parseEther(price);
      
      if (balance.lt(requiredBalance)) {
        Utils.showNotification('Insufficient BNB balance', 'error');
        return;
      }
      
      // Підтвердження
      const confirmed = confirm(
        `Buy Level ${level}?\n\n` +
        `Cost: ${price} BNB\n\n` +
        `Press OK to continue.`
      );
      
      if (!confirmed) return;
      
      Utils.showLoader(true);
      
      // Купівля
      await contracts.buyLevel(level);
      
      Utils.showNotification(`Level ${level} activated!`, 'success');
      
      // Оновити рівні
      await this.loadLevelManagement();
      
    } catch (error) {
      console.error('❌ Buy level failed:', error);
      Utils.showNotification('Purchase failed: ' + error.message, 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  /**
   * Пакетна купівля рівнів
   */
  async buyBulkLevels(upToLevel) {
    try {
      if (!web3Manager.connected) {
        Utils.showNotification('Please connect wallet', 'error');
        return;
      }
      
      // Розрахувати загальну ціну
      let totalPrice = 0;
      for (let i = 0; i < upToLevel; i++) {
        totalPrice += parseFloat(CONFIG.LEVEL_PRICES[i]);
      }
      
      // Перевірка балансу
      const balance = await web3Manager.provider.getBalance(web3Manager.address);
      const requiredBalance = ethers.utils.parseEther(totalPrice.toString());
      
      if (balance.lt(requiredBalance)) {
        Utils.showNotification('Insufficient BNB balance', 'error');
        return;
      }
      
      // Підтвердження
      const confirmed = confirm(
        `Buy Levels 1-${upToLevel}?\n\n` +
        `Total Cost: ${totalPrice.toFixed(4)} BNB\n\n` +
        `Press OK to continue.`
      );
      
      if (!confirmed) return;
      
      Utils.showLoader(true);
      
      // Пакетна купівля
      await contracts.buyBulkLevels(upToLevel);
      
      Utils.showNotification(`Levels 1-${upToLevel} activated!`, 'success');
      
      // Оновити рівні
      await this.loadLevelManagement();
      
    } catch (error) {
      console.error('❌ Bulk buy failed:', error);
      Utils.showNotification('Purchase failed: ' + error.message, 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  /**
   * Завантаження балансів контрактів
   */
  async loadContractBalances() {
    try {
      const address = web3Manager.address;
      
      // Marketing Balance
      const marketingBalance = await contracts.getMarketingBalance(address);
      const marketingBalanceEl = document.getElementById('marketingBalance');
      if (marketingBalanceEl) {
        marketingBalanceEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(marketingBalance))} BNB`;
      }
      
      // Leader Balance
      // const leaderBalance = await contracts.getLeaderBalance(address);
      const leaderBalanceEl = document.getElementById('leaderBalance');
      if (leaderBalanceEl) {
        leaderBalanceEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(leaderBalance))} BNB`;
      }
      
      // Investment Balance
      // const investmentBalance = await contracts.getInvestmentBalance(address);
      const investmentBalanceEl = document.getElementById('investmentBalance');
      if (investmentBalanceEl) {
        investmentBalanceEl.textContent = `${Utils.formatBNB(ethers.utils.formatEther(investmentBalance))} BNB`;
      }
      
    } catch (error) {
      console.error('loadContractBalances error:', error);
    }
  }

  /**
   * Виведення з контракту
   */
  async withdrawFromContract(poolType) {
    try {
      if (!web3Manager.connected) {
        Utils.showNotification('Please connect wallet', 'error');
        return;
      }
      
      const confirmed = confirm(
        `Withdraw from ${poolType} pool?\n\n` +
        `All available balance will be withdrawn.\n\n` +
        `Press OK to continue.`
      );
      
      if (!confirmed) return;
      
      Utils.showLoader(true);
      
      // Виведення в залежності від типу пулу
      switch(poolType) {
        case 'marketing':
          await contracts.withdrawMarketing();
          break;
        case 'leader':
          await contracts.withdrawLeader();
          break;
        case 'investment':
          await contracts.withdrawInvestment();
          break;
        default:
          throw new Error('Invalid pool type');
      }
      
      Utils.showNotification('Withdrawal successful!', 'success');
      
      // Оновити баланси
      await this.loadContractBalances();
      await this.loadUserData();
      
    } catch (error) {
      console.error('❌ Withdrawal failed:', error);
      Utils.showNotification('Withdrawal failed: ' + error.message, 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  /**
   * Завантаження доходів по рангах
   */
  async loadEarningsByRank() {
    try {
      const address = web3Manager.address;
      const earningsContainer = document.getElementById('earningsRank');
      
      if (!earningsContainer) return;
      
      earningsContainer.innerHTML = '';
      
      // TODO: Отримати earnings з різних контрактів
      // Це потребує додаткових функцій у контрактах або парсинг Events
      
      const earnings = {
        'Direct Bonus': '0',
        'Partner Bonus': '0',
        'Matrix Bonus': '0',
        'Leadership Bonus': '0',
        'Qualification Bonus': '0'
      };
      
      let total = 0;
      
      for (const [type, amount] of Object.entries(earnings)) {
        const item = document.createElement('div');
        item.className = 'earning-item';
        item.innerHTML = `
          <span class="rank-name">${type}</span>
          <span class="earning-amount">${amount} BNB</span>
        `;
        earningsContainer.appendChild(item);
        
        total += parseFloat(amount);
      }
      
      // Total Income
      const totalIncomeEl = document.getElementById('totalIncome');
      if (totalIncomeEl) {
        totalIncomeEl.textContent = `${Utils.formatBNB(total)} BNB`;
      }
      
    } catch (error) {
      console.error('loadEarningsByRank error:', error);
    }
  }

  /**
   * Завантаження історії транзакцій
   */
  async loadTransactionHistory() {
    try {
      // TODO: Парсинг Events або використання Stats контракту
      const historyTable = document.getElementById('historyTable');
      
      if (!historyTable) return;
      
      historyTable.innerHTML = `
        <tr>
          <td colspan="6" class="no-data">No transactions yet</td>
        </tr>
      `;
      
    } catch (error) {
      console.error('loadTransactionHistory error:', error);
    }
  }

  /**
   * Завантаження підсумку токенів
   */
  async loadTokensSummary() {
    try {
      const address = web3Manager.address;
      
      // Token Balance
      const balance = await contracts.getTokenBalance(address);
      const tokenAmount = ethers.utils.formatEther(balance);
      
      const tokenAmountEl = document.getElementById('tokenAmount');
      if (tokenAmountEl) {
        tokenAmountEl.textContent = `${Utils.formatBNB(tokenAmount)} GWT`;
      }
      
      // Token Price
      // const price = await contracts.getTokenPrice();
      // const tokenPrice = ethers.utils.formatEther(price);
      
      const tokenPriceEl = document.getElementById('tokenPrice');
      if (tokenPriceEl) {
        // tokenPriceEl.textContent = `$${parseFloat(tokenPrice).toFixed(6)}`;
      }
      
      // Token Value
      const value = parseFloat(tokenAmount) * parseFloat(tokenPrice);
      const tokenValueEl = document.getElementById('tokenValue');
      if (tokenValueEl) {
        tokenValueEl.textContent = `$${value.toFixed(2)}`;
      }
      
    } catch (error) {
      console.error('loadTokensSummary error:', error);
    }
  }

  // ==========================================
  // PAGE LOADERS (буде викликано з uiManager)
  // ==========================================

  async loadPartners() {
    console.log('👥 Loading partners...');
    // TODO: Implement
  }

  async loadMatrix() {
    console.log('🔷 Loading matrix...');
    // TODO: Implement
  }

  async loadTokens() {
    console.log('💎 Loading tokens...');
    // TODO: Implement
  }

  async loadProjects() {
    console.log('🚀 Loading projects...');
    // TODO: Implement
  }
}

// Створити глобальний екземпляр
const app = new Application();

// Ініціалізація при завантаженні DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    await app.init();
  });
} else {
  // DOM вже завантажено
  app.init();
}
