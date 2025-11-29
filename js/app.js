// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Main Application Controller
// ИСПРАВЛЕНО: Компактное модальное окно, улучшенная обработка ошибок
// Date: 2025-01-29
// ═══════════════════════════════════════════════════════════════════

const app = {
  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  state: {
    currentPage: null,
    userAddress: null,
    isRegistered: false,
    userId: null,
    maxLevel: 0,
    contracts: {},
    pageModules: {},
    isLandingSkipped: false,
    navigationInitialized: false,
    activationModalShown: false
  },

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('🚀 Initializing GlobalWay DApp...');
    
    try {
      await this.waitForWeb3();
      this.initConnectButton();
      await this.checkWalletConnection();

      if (!window.location.hash && !this.state.isLandingSkipped) {
        console.log('🔄 Showing landing page...');
        this.showLanding();
        return;
      }
      
      const hash = window.location.hash.substring(1);
      if (hash) {
        this.state.isLandingSkipped = true;
        this.showDApp();
        this.initNavigation();
        this.state.currentPage = hash || 'dashboard';
        await this.loadCurrentPage();
      } else {
        this.showLanding();
      }
      
      console.log('✅ App initialized successfully');
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      this.showNotification('Ошибка инициализации приложения', 'error');
    }
  },

  showLanding() {
    const landing = document.getElementById('landing');
    const dapp = document.getElementById('dapp');
    if (landing) landing.classList.add('active');
    if (dapp) dapp.classList.remove('active');
    this.state.currentPage = 'landing';
  },

  showDApp() {
    const landing = document.getElementById('landing');
    const dapp = document.getElementById('dapp');
    if (landing) landing.classList.remove('active');
    if (dapp) dapp.classList.add('active');
  },

  // ═══════════════════════════════════════════════════════════════
  // ПОДКЛЮЧЕНИЕ КОШЕЛЬКА
  // ═══════════════════════════════════════════════════════════════
  initConnectButton() {
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) {
      connectBtn.addEventListener('click', async () => {
        await this.connectWallet();
      });
    }
  },

  async connectWallet() {
    try {
      if (!window.web3Manager) {
        this.showNotification('Web3 Manager не загружен', 'error');
        return;
      }

      this.showNotification('Подключение кошелька...', 'info');
      
      await window.web3Manager.connect();
      
      if (window.web3Manager.isConnected) {
        this.state.userAddress = window.web3Manager.currentAccount;
        
        this.updateWalletUI();
        await this.loadUserData();
        await this.checkAndAutoRegister();
        this.checkAndShowActivationModal();
        await this.loadCurrentPage();
        
        this.showNotification('Кошелек подключен!', 'success');
      }
    } catch (error) {
      console.error('❌ Connect wallet error:', error);
      this.showNotification('Ошибка подключения кошелька', 'error');
    }
  },

  updateWalletUI() {
    const walletAddress = document.getElementById('walletAddress');
    const connectBtn = document.getElementById('connectBtn');
    
    if (this.state.userAddress) {
      if (walletAddress) {
        walletAddress.textContent = this.formatAddress(this.state.userAddress);
      }
      if (connectBtn) {
        connectBtn.textContent = 'Connected';
        connectBtn.style.background = '#00ff00';
        connectBtn.disabled = true;
      }
    }
  },

  async waitForWeb3() {
    return new Promise((resolve) => {
      if (window.web3Manager) {
        resolve();
      } else {
        const interval = setInterval(() => {
          if (window.web3Manager) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      }
    });
  },

  async checkWalletConnection() {
    if (window.web3Manager && window.web3Manager.isConnected) {
      this.state.userAddress = window.web3Manager.currentAccount;
      await this.loadUserData();
      await this.checkAndAutoRegister();
      this.checkAndShowActivationModal();
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
  // ═══════════════════════════════════════════════════════════════
  async loadUserData() {
    try {
      const { userAddress } = this.state;
      if (!userAddress) return;
      console.log('📊 Loading user data...');
      
      const matrixRegistry = await this.getContract('MatrixRegistry');
      const globalWay = await this.getContract('GlobalWay');
      
      this.state.isRegistered = await matrixRegistry.isRegistered(userAddress);
      if (this.state.isRegistered) {
        const userId = await matrixRegistry.getUserIdByAddress(userAddress);
        this.state.userId = userId.toString();
        
        const maxLevel = await globalWay.getUserMaxLevel(userAddress);
        this.state.maxLevel = Number(maxLevel);
        console.log('✅ User data loaded:', {
          address: userAddress,
          userId: this.state.userId,
          maxLevel: this.state.maxLevel
        });
      }
    } catch (error) {
      console.error('❌ Error loading user data:', error);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // АВТОМАТИЧЕСКАЯ РЕГИСТРАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  
  getReferralFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    
    const refFromURL = urlParams.get('ref') || urlParams.get('sponsor');
    const refFromHash = hashParams.get('ref') || hashParams.get('sponsor');
    
    return refFromURL || refFromHash || null;
  },

  async checkAndAutoRegister() {
    if (!this.state.userAddress) {
      console.log('⚠️ No user address, skipping registration check');
      return;
    }
    try {
      console.log('🔍 Checking registration status for:', this.state.userAddress);
      
      const matrixRegistry = await this.getContract('MatrixRegistry');
      const globalWay = await this.getContract('GlobalWay');
      const isRegistered = await matrixRegistry.isRegistered(this.state.userAddress);
      
      console.log('📋 Registration status:', isRegistered);
      
      if (isRegistered) {
        console.log('✅ User is already registered');
        this.state.isRegistered = true;
        
        const userId = await matrixRegistry.getUserIdByAddress(this.state.userAddress);
        this.state.userId = userId.toString();
        console.log('🆔 User ID:', this.state.userId);
        
        try {
          const maxLevel = await globalWay.getUserMaxLevel(this.state.userAddress);
          this.state.maxLevel = Number(maxLevel);
          console.log('📊 Max level:', this.state.maxLevel);
        } catch (error) {
          console.warn('⚠️ Could not load maxLevel:', error);
        }
        
        setTimeout(() => {
          this.checkAndShowActivationModal();
        }, 1000);
        
        return;
      }
      
      console.log('🆕 User not registered');
      
      const referralCode = this.getReferralFromURL();
      let sponsorId = null;
      
      if (referralCode) {
        console.log('🔗 Found referral code:', referralCode);
        // Валидация и регистрация...
      }
      
    } catch (error) {
      console.error('❌ Auto-register error:', error);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // МОДАЛЬНОЕ ОКНО АКТИВАЦИИ — ИСПРАВЛЕНО
  // ═══════════════════════════════════════════════════════════════

  checkAndShowActivationModal() {
    console.log('🔍 Checking activation modal conditions:');
    console.log('   isRegistered:', this.state.isRegistered);
    console.log('   maxLevel:', this.state.maxLevel);
    console.log('   activationModalShown:', this.state.activationModalShown);
    
    if (this.state.isRegistered && 
        this.state.maxLevel === 0 && 
        !this.state.activationModalShown) {
      
      console.log('✅ Conditions met for activation modal');
      
      setTimeout(() => {
        this.showActivationModal();
      }, 2000);
    } else {
      console.log('❌ Conditions NOT met for activation modal');
    }
  },

  showActivationModal() {
    if (this.state.activationModalShown) {
      console.log('⚠️ Activation modal already shown');
      return;
    }

    console.log('🎯 Showing activation modal...');
    
    if (!document.getElementById('activationModal')) {
      this.createActivationModal();
    }
    
    this.showModal('activationModal');
    this.state.activationModalShown = true;
  },

  // ✅ ИСПРАВЛЕНО: Компактное модальное окно
  createActivationModal() {
    console.log('🔧 Creating activation modal...');
    
    // Добавляем стили для компактного модального окна
    if (!document.getElementById('activationModalStyles')) {
      const styles = document.createElement('style');
      styles.id = 'activationModalStyles';
      styles.textContent = `
        #activationModal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          z-index: 10000;
          overflow-y: auto;
          padding: 20px;
          box-sizing: border-box;
        }
        
        #activationModal .modal-content {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          max-width: 400px;
          margin: 20px auto;
          padding: 24px;
          position: relative;
          border: 1px solid rgba(255, 215, 0, 0.3);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }
        
        #activationModal .modal-header {
          text-align: center;
          margin-bottom: 20px;
        }
        
        #activationModal .header-icon {
          font-size: 48px;
          margin-bottom: 10px;
        }
        
        #activationModal h2 {
          color: #ffd700;
          font-size: 20px;
          margin: 0 0 8px 0;
        }
        
        #activationModal .user-id {
          background: linear-gradient(90deg, #ffd700, #ff8c00);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: bold;
          font-size: 18px;
        }
        
        #activationModal .price-card {
          background: rgba(255, 215, 0, 0.1);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          margin: 16px 0;
        }
        
        #activationModal .price-amount {
          font-size: 28px;
          font-weight: bold;
          color: #ffd700;
          display: block;
        }
        
        #activationModal .token-reward {
          color: #00ff00;
          font-size: 14px;
          margin-top: 8px;
          display: block;
        }
        
        #activationModal .btn-gold {
          width: 100%;
          padding: 14px 24px;
          font-size: 16px;
          font-weight: bold;
          color: #000;
          background: linear-gradient(90deg, #ffd700, #ff8c00);
          border: none;
          border-radius: 8px;
          cursor: pointer;
          margin-bottom: 12px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        #activationModal .btn-gold:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 215, 0, 0.4);
        }
        
        #activationModal .btn-gold:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        #activationModal .btn-outline {
          width: 100%;
          padding: 12px 24px;
          font-size: 14px;
          color: #ffd700;
          background: transparent;
          border: 1px solid rgba(255, 215, 0, 0.5);
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        #activationModal .btn-outline:hover {
          background: rgba(255, 215, 0, 0.1);
        }
        
        #activationModal .close-modal {
          position: absolute;
          top: 12px;
          right: 16px;
          font-size: 24px;
          color: #888;
          cursor: pointer;
          transition: color 0.2s;
        }
        
        #activationModal .close-modal:hover {
          color: #fff;
        }
        
        #activationModal .modal-footer {
          text-align: center;
          margin-top: 16px;
          font-size: 12px;
          color: #888;
        }
        
        #activationModal .error-message {
          background: rgba(255, 0, 0, 0.1);
          border: 1px solid rgba(255, 0, 0, 0.3);
          border-radius: 8px;
          padding: 12px;
          margin-top: 12px;
          color: #ff6b6b;
          font-size: 13px;
          display: none;
        }
        
        #activationModal .status-message {
          text-align: center;
          padding: 8px;
          margin-top: 8px;
          font-size: 13px;
          color: #ffd700;
        }
      `;
      document.head.appendChild(styles);
    }
    
    const modalHTML = `
    <div id="activationModal" class="modal">
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            
            <div class="modal-header">
                <div class="header-icon">🚀</div>
                <h2>Добро пожаловать!</h2>
                <p>Ваш ID: <span class="user-id">GW${this.state.userId}</span></p>
            </div>
            
            <div class="price-card">
                <span style="color: #888; font-size: 14px;">Уровень 1</span>
                <span class="price-amount">${CONFIG.LEVEL_PRICES[0]} BNB</span>
                <span class="token-reward">+${CONFIG.TOKEN_REWARDS[0]} GWT токенов</span>
            </div>
            
            <div class="action-buttons">
                <button id="activateLevel1Btn" class="btn-gold">
                    🚀 АКТИВИРОВАТЬ
                </button>
                
                <button id="viewPackagesBtn" class="btn-outline">
                    📦 Все пакеты
                </button>
            </div>
            
            <div id="activationStatus" class="status-message" style="display: none;"></div>
            <div id="activationError" class="error-message"></div>
            
            <div class="modal-footer">
                <p>Активация откроет доступ ко всем функциям</p>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Обработчики событий
    const activateBtn = document.getElementById('activateLevel1Btn');
    const packagesBtn = document.getElementById('viewPackagesBtn');
    const closeBtn = document.querySelector('#activationModal .close-modal');
    
    if (activateBtn) {
      activateBtn.onclick = async () => {
        await this.activateUserLevel(1, CONFIG.LEVEL_PRICES[0], activateBtn);
      };
    }
    
    if (packagesBtn) {
      packagesBtn.onclick = () => {
        this.closeModal('activationModal');
        this.showPage('dashboard');
      };
    }
    
    if (closeBtn) {
      closeBtn.onclick = () => this.closeModal('activationModal');
    }
    
    // Закрытие по клику вне модалки
    const modal = document.getElementById('activationModal');
    if (modal) {
      modal.onclick = (event) => {
        if (event.target === modal) {
          this.closeModal('activationModal');
        }
      };
    }
    
    console.log('✅ Activation modal created');
  },

  // ✅ ИСПРАВЛЕНО: Улучшенная активация с детальными логами
  async activateUserLevel(level, price, button) {
    const statusEl = document.getElementById('activationStatus');
    const errorEl = document.getElementById('activationError');
    
    const showStatus = (msg) => {
      if (statusEl) {
        statusEl.textContent = msg;
        statusEl.style.display = 'block';
      }
      console.log('📍 Status:', msg);
    };
    
    const showError = (msg) => {
      if (errorEl) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
      }
      if (statusEl) {
        statusEl.style.display = 'none';
      }
      console.error('❌ Error:', msg);
    };
    
    const hideMessages = () => {
      if (statusEl) statusEl.style.display = 'none';
      if (errorEl) errorEl.style.display = 'none';
    };
    
    try {
      hideMessages();
      console.log(`\n=== 🔄 ACTIVATING LEVEL ${level} ===`);
      console.log(`Price: ${price} BNB`);
      console.log(`User: ${this.state.userAddress}`);
      
      if (!this.state.isRegistered) {
        showError('Сначала зарегистрируйтесь');
        return;
      }
      
      // Проверяем сеть
      showStatus('Проверка сети...');
      if (!await this.checkNetwork()) {
        showError('Переключитесь на сеть opBNB');
        return;
      }
      
      // Проверяем баланс
      showStatus('Проверка баланса...');
      const balance = await window.web3Manager.provider.getBalance(this.state.userAddress);
      const priceWei = ethers.utils.parseEther(price);
      console.log(`Balance: ${ethers.utils.formatEther(balance)} BNB`);
      console.log(`Required: ${price} BNB`);
      
      if (balance.lt(priceWei)) {
        showError(`Недостаточно BNB. Нужно: ${price}, есть: ${ethers.utils.formatEther(balance)}`);
        return;
      }
      
      button.disabled = true;
      button.textContent = '⏳ Подготовка...';
      
      // Получаем контракт
      showStatus('Подключение к контракту...');
      const globalWay = await this.getSignedContract('GlobalWay');
      console.log('Contract address:', globalWay.address);
      
      // Проверяем не активирован ли уже уровень
      showStatus('Проверка статуса уровня...');
      const isActive = await globalWay.isLevelActive(this.state.userAddress, level);
      console.log(`Level ${level} already active:`, isActive);
      
      if (isActive) {
        showError('Уровень уже активирован!');
        button.disabled = false;
        button.textContent = `🚀 АКТИВИРОВАТЬ`;
        return;
      }
      
      // Отправляем транзакцию
      showStatus('Отправка транзакции...');
      button.textContent = '⏳ Подтвердите в кошельке...';
      
      console.log('Sending transaction with params:', {
        level: level,
        value: priceWei.toString(),
        gasLimit: CONFIG.GAS.buyLevel
      });
      
      const tx = await globalWay.activateLevel(level, {
        value: priceWei,
        gasLimit: CONFIG.GAS.buyLevel
      });
      
      console.log('✅ TX sent:', tx.hash);
      showStatus(`Ожидание подтверждения... TX: ${tx.hash.slice(0, 10)}...`);
      button.textContent = '⏳ Ожидание...';
      
      const receipt = await tx.wait();
      console.log('📦 Receipt:', {
        status: receipt.status,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        logs: receipt.logs.length
      });
      
      if (receipt.status === 0) {
        throw new Error('Транзакция откатилась. Проверьте настройки контракта.');
      }
      
      // Успех!
      console.log('🎉 Level activated successfully!');
      this.closeModal('activationModal');
      this.showNotification(
        `✅ Уровень ${level} активирован! +${CONFIG.TOKEN_REWARDS[level - 1]} GWT`, 
        'success'
      );
      
      // Обновляем данные
      await this.loadUserData();
      
      if (this.state.currentPage && this.state.pageModules[this.state.currentPage]) {
        const module = this.state.pageModules[this.state.currentPage];
        if (typeof module.refresh === 'function') {
          await module.refresh();
        }
      }
      
    } catch (error) {
      console.error('❌ Activation error:', error);
      
      button.disabled = false;
      button.textContent = `🚀 АКТИВИРОВАТЬ`;
      
      // Парсим ошибку
      let errorMessage = 'Неизвестная ошибка';
      
      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        errorMessage = 'Транзакция отменена пользователем';
      } else if (error.message) {
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'Недостаточно BNB для оплаты';
        } else if (error.message.includes('Level already active')) {
          errorMessage = 'Уровень уже активирован';
        } else if (error.message.includes('Not registered')) {
          errorMessage = 'Пользователь не зарегистрирован';
        } else if (error.message.includes('Incorrect payment')) {
          errorMessage = 'Неверная сумма оплаты';
        } else if (error.message.includes('CALL_EXCEPTION')) {
          errorMessage = 'Ошибка контракта. Обратитесь в поддержку.';
        } else {
          errorMessage = error.message.slice(0, 100);
        }
      }
      
      showError(errorMessage);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // НАВИГАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  initNavigation() {
    if (this.state.navigationInitialized) return;
    
    document.querySelectorAll('.nav-btn').forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        if (page) {
          await this.showPage(page);
        }
      });
    });
    
    window.addEventListener('hashchange', async () => {
      const hash = window.location.hash.substring(1);
      if (hash && hash !== this.state.currentPage) {
        await this.showPage(hash);
      }
    });
    
    this.state.navigationInitialized = true;
    console.log('✅ Navigation initialized');
  },

  async showPage(pageName) {
    try {
      console.log(`📄 Showing page: ${pageName}`);

      document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
      });

      const pageElement = document.getElementById(pageName);
      if (pageElement) {
        pageElement.classList.add('active');
      } else {
        console.error(`❌ Page element #${pageName} not found!`);
      }

      document.querySelectorAll('.nav-btn').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageName) {
          link.classList.add('active');
        }
      });

      window.location.hash = pageName;
      this.state.currentPage = pageName;

      await this.loadPageModule(pageName);

    } catch (error) {
      console.error(`❌ Error showing page ${pageName}:`, error);
      this.showNotification('Ошибка загрузки страницы', 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА МОДУЛЕЙ СТРАНИЦ
  // ═══════════════════════════════════════════════════════════════
  async loadPageModule(pageName) {
    console.log(`🔧 Loading module for page: ${pageName}`);
    
    if (this.state.pageModules[pageName]) {
      console.log(`✅ Module ${pageName} already loaded, re-initializing...`);
      if (typeof this.state.pageModules[pageName].init === 'function') {
        await this.state.pageModules[pageName].init();
      }
      return;
    }

    try {
      const moduleName = `${pageName}Module`;
      console.log(`🔍 Looking for window.${moduleName}...`);
      
      const module = window[moduleName];
      
      if (module) {
        console.log(`✅ Found module: ${moduleName}`);
        this.state.pageModules[pageName] = module;
        
        if (typeof module.init === 'function') {
          console.log(`🚀 Calling ${moduleName}.init()...`);
          await module.init();
        }
      } else {
        console.warn(`❌ Module ${moduleName} not found`);
      }
    } catch (error) {
      console.error(`❌ Error loading module ${pageName}:`, error);
    }
  },

  async loadCurrentPage() {
    if (this.state.currentPage && this.state.currentPage !== 'landing') {
      await this.showPage(this.state.currentPage);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // РАБОТА С КОНТРАКТАМИ
  // ═══════════════════════════════════════════════════════════════
  async getContract(contractName) {
    if (this.state.contracts[contractName]) {
      return this.state.contracts[contractName];
    }

    try {
      const address = CONFIG.CONTRACTS[contractName];
      if (!address) {
        throw new Error(`Contract ${contractName} not found in CONFIG`);
      }

      const abiPath = CONFIG.ABI_PATHS[contractName];
      if (!abiPath) {
        throw new Error(`ABI path for ${contractName} not found in CONFIG`);
      }

      console.log(`📥 Loading contract ${contractName} from ${abiPath}...`);

      const response = await fetch(abiPath);
      if (!response.ok) {
        throw new Error(`Failed to load ABI: ${response.status}`);
      }

      const contractData = await response.json();
      
      const providerOrSigner = window.web3Manager?.signer || window.web3Manager?.provider;
      
      if (!providerOrSigner) {
        throw new Error('Web3 not initialized');
      }
      
      const contract = new ethers.Contract(
        address,
        contractData.abi,
        providerOrSigner
      );

      this.state.contracts[contractName] = contract;
      
      console.log(`✅ Contract ${contractName} loaded at ${address}`);
      return contract;
    } catch (error) {
      console.error(`❌ Error loading contract ${contractName}:`, error);
      throw error;
    }
  },

  async getSignedContract(contractName) {
    const contract = await this.getContract(contractName);
    const signer = window.web3Manager.signer;
    return contract.connect(signer);
  },

  // ═══════════════════════════════════════════════════════════════
  // УВЕДОМЛЕНИЯ
  // ═══════════════════════════════════════════════════════════════
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, CONFIG.UI.notificationDuration);
  },

  // ═══════════════════════════════════════════════════════════════
  // МОДАЛЬНЫЕ ОКНА
  // ═══════════════════════════════════════════════════════════════
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'block';
      
      const closeBtn = modal.querySelector('.close, .close-modal');
      if (closeBtn) {
        closeBtn.onclick = () => this.closeModal(modalId);
      }

      modal.onclick = (event) => {
        if (event.target === modal) {
          this.closeModal(modalId);
        }
      };
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ═══════════════════════════════════════════════════════════════
  
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showNotification('Скопировано! ✓', 'success');
    } catch (error) {
      console.error('Copy failed:', error);
      this.showNotification('Ошибка копирования', 'error');
    }
  },

  formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  },

  formatNumber(number, decimals = 4) {
    if (!number) return '0';
    return Number(number).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  },

  formatBNB(wei) {
    if (!wei) return '0';
    return ethers.utils.formatEther(wei);
  },

  parseEther(amount) {
    return ethers.utils.parseEther(amount.toString());
  },

  async checkNetwork() {
    if (!window.web3Manager) return false;
    
    const network = await window.web3Manager.provider.getNetwork();
    const chainId = network.chainId;
    
    if (chainId !== CONFIG.NETWORK.chainId) {
      this.showNotification('Неправильная сеть! Переключитесь на opBNB', 'error');
      return false;
    }
    return true;
  },

  async refreshUserData() {
    await this.loadUserData();
    
    if (this.state.pageModules[this.state.currentPage]) {
      const module = this.state.pageModules[this.state.currentPage];
      if (typeof module.refresh === 'function') {
        await module.refresh();
      }
    }
  }
};

// ═══════════════════════════════════════════════════════════════════
// ГЛОБАЛЬНЫЕ ОБРАБОТЧИКИ
// ═══════════════════════════════════════════════════════════════════

window.addEventListener('accountsChanged', async (accounts) => {
  console.log('👤 Account changed');
  app.state.userAddress = accounts[0] || null;
  await app.refreshUserData();
});

window.addEventListener('chainChanged', async () => {
  console.log('🔗 Chain changed');
  window.location.reload();
});

// Экспорт в window
window.app = app;
