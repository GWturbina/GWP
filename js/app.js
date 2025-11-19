// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Main Application Controller
// ПОЛНОСТЬЮ ПЕРЕПИСАН под новые контракты
// Date: 2025-01-19
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
      // Ждем загрузки Web3
      await this.waitForWeb3();
      
      // Инициализируем кнопку подключения
      this.initConnectButton();
      
      // Проверяем подключение кошелька
      await this.checkWalletConnection();

      // Проверяем landing или dapp
      if (!window.location.hash && !this.state.isLandingSkipped) {
        console.log('🔄 Showing landing page...');
        this.showLanding();
        return;
      }
      
      // Если есть hash - показываем dapp
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

      // Получаем контракты
      const matrixRegistry = await this.getContract('MatrixRegistry');
      const globalWay = await this.getContract('GlobalWay');

      // Проверяем регистрацию
      this.state.isRegistered = await matrixRegistry.isRegistered(userAddress);

      if (this.state.isRegistered) {
        // Получаем ID пользователя
        const userId = await matrixRegistry.getUserIdByAddress(userAddress);
        this.state.userId = userId.toString();
        
        // Получаем максимальный уровень
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
    const params = new URLSearchParams(window.location.search);
    return params.get('ref') || params.get('sponsor') || null;
  },

  async checkAndAutoRegister() {
    if (!this.state.userAddress) return;

    try {
      console.log('🔍 Checking registration status...');
      
      const matrixRegistry = await this.getContract('MatrixRegistry');
      const isRegistered = await matrixRegistry.isRegistered(this.state.userAddress);
      
      if (isRegistered) {
        console.log('✅ User is already registered');
        this.state.isRegistered = true;
        
        const userId = await matrixRegistry.getUserIdByAddress(this.state.userAddress);
        this.state.userId = userId.toString();
        console.log('🆔 User ID:', this.state.userId);
        
        setTimeout(() => {
          this.checkAndShowActivationModal();
        }, 1000);
        
        return;
      }
      
      console.log('🆕 User not registered');
      
      const wantsToRegister = confirm(
        'Добро пожаловать в GlobalWay!\n\n' +
        'Для начала работы необходимо зарегистрироваться.\n' +
        'Регистрация БЕСПЛАТНАЯ и займет несколько секунд.\n\n' +
        'Зарегистрироваться сейчас?'
      );
      
      if (!wantsToRegister) {
        this.showNotification('Регистрация отменена', 'info');
        return;
      }
      
      console.log('🆕 Starting registration...');
      
      const sponsorId = await this.getSponsorId();
      console.log('🎯 Using sponsor ID:', sponsorId);
      
      if (!sponsorId || sponsorId === '0') {
        throw new Error('Invalid sponsor ID: ' + sponsorId);
      }
      
      const matrixRegistrySigned = await this.getSignedContract('MatrixRegistry');
      const registerTx = await matrixRegistrySigned.register(sponsorId, { 
        gasLimit: CONFIG.GAS.register 
      });
      
      this.showNotification('Регистрация...', 'info');
      await registerTx.wait();
      console.log('✅ Registered in MatrixRegistry');
      
      this.state.isRegistered = true;
      
      const newUserId = await matrixRegistry.getUserIdByAddress(this.state.userAddress);
      this.state.userId = newUserId.toString();

      this.showNotification(`✅ Регистрация завершена!\nВаш ID: GW${this.state.userId}`, 'success');
      console.log('✅ Registration completed, ID:', this.state.userId);

      setTimeout(() => {
        this.showActivationModal();
      }, 1500);

    } catch (error) {
      console.error('❌ Registration error:', error);
      
      if (error.code === 4001) {
        this.showNotification('Действие отменено пользователем', 'info');
      } else if (error.message && error.message.includes('Already registered')) {
        console.log('⚠️ User already registered');
        this.state.isRegistered = true;
      } else if (error.message && error.message.includes('Sponsor not registered')) {
        this.showNotification('Ошибка: спонсор не зарегистрирован', 'error');
      } else if (error.message && error.message.includes('Invalid sponsor')) {
        this.showNotification('Ошибка: неверный ID спонсора', 'error');
      } else {
        this.showNotification('Ошибка: ' + error.message, 'error');
      }
    }
  },

  async getSponsorId() {
    const refCode = this.getReferralFromURL();
    
    // Если нет реферала - используем ID 1 (основатель)
    if (!refCode) {
      return '1';
    }

    try {
      const matrixRegistry = await this.getContract('MatrixRegistry');
      
      // Если это GW123456 или просто 123456
      if (refCode.startsWith('GW') || /^\d+$/.test(refCode)) {
        const id = refCode.replace(/^GW/i, '');
        
        // Проверяем что пользователь с таким ID существует
        const address = await matrixRegistry.getAddressById(id);
        if (address && address !== ethers.constants.AddressZero) {
          return id;
        }
      }
      
      // Если это адрес 0x...
      if (refCode.startsWith('0x')) {
        const userId = await matrixRegistry.getUserIdByAddress(refCode);
        if (userId && userId.toString() !== '0') {
          return userId.toString();
        }
      }
    } catch (error) {
      console.error('Error getting sponsor ID:', error);
    }

    // Возвращаем ID 1 по умолчанию
    return '1';
  },

  // ═══════════════════════════════════════════════════════════════
  // МОДАЛЬНОЕ ОКНО АКТИВАЦИИ
  // ═══════════════════════════════════════════════════════════════

  checkAndShowActivationModal() {
    if (this.state.isRegistered && 
        this.state.maxLevel === 0 && 
        !this.state.activationModalShown) {
      
      console.log('🎯 Conditions met for activation modal');
      
      setTimeout(() => {
        this.showActivationModal();
      }, 2000);
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

  createActivationModal() {
    console.log('🔧 Creating activation modal...');
    
    const modalHTML = `
    <div id="activationModal" class="modal cosmic-modal">
        <div class="modal-content cosmic-card">
            <div class="modal-header cosmic-header">
                <div class="header-icon">🚀</div>
                <h2>Добро пожаловать в GlobalWay!</h2>
                <p>Ваш ID: <span class="user-id">GW${this.state.userId}</span></p>
            </div>
            
            <div class="modal-body">
                <div class="feature-section">
                    <h3>🎯 Начните зарабатывать!</h3>
                    <p>Активируйте первый уровень чтобы открыть все возможности платформы</p>
                    
                    <div class="features-grid">
                        <div class="feature-item">
                            <span class="feature-icon">📊</span>
                            <span>Реферальная система</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">🌐</span>
                            <span>Матричная структура</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">💰</span>
                            <span>Выплаты и бонусы</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">🏆</span>
                            <span>Ранговая система</span>
                        </div>
                    </div>
                </div>
                
                <div class="pricing-section">
                    <div class="price-card">
                        <div class="price-header">
                            <span class="level-badge">Уровень 1</span>
                            <span class="price-amount">${CONFIG.LEVEL_PRICES[0]} BNB</span>
                        </div>
                        <div class="price-details">
                            <span class="token-reward">+${CONFIG.TOKEN_REWARDS[0]} GWT токенов</span>
                        </div>
                    </div>
                </div>
                
                <div class="action-buttons">
                    <button id="activateLevel1Btn" class="btn-gold">
                        🚀 АКТИВИРОВАТЬ УРОВЕНЬ 1
                    </button>
                    
                    <button id="viewPackagesBtn" class="btn-outline">
                        📦 Посмотреть пакеты
                    </button>
                </div>
                
                <div class="modal-footer">
                    <p>После активации откроется полный доступ ко всем функциям платформы</p>
                </div>
            </div>
            
            <span class="close-modal">&times;</span>
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

  async activateUserLevel(level, price, button) {
    try {
      console.log(`🔄 Activating level ${level} for ${price} BNB...`);
      
      if (!this.state.isRegistered) {
        this.showNotification('Сначала зарегистрируйтесь', 'error');
        return;
      }
      
      button.disabled = true;
      button.textContent = '⏳ Обработка...';
      
      const globalWaySigned = await this.getSignedContract('GlobalWay');
      const priceInWei = ethers.utils.parseEther(price);
      
      const tx = await globalWaySigned.buyLevel(level, {
        value: priceInWei,
        gasLimit: CONFIG.GAS.buyLevel
      });
      
      this.showNotification(`Активация уровня ${level}...`, 'info');
      await tx.wait();
      
      this.closeModal('activationModal');
      this.showNotification(
        `✅ Уровень ${level} активирован!\n🎁 Получено ${CONFIG.TOKEN_REWARDS[level - 1]} GWT`, 
        'success'
      );
      
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
      button.textContent = `АКТИВИРОВАТЬ УРОВЕНЬ ${level}`;
      
      if (error.code === 4001) {
        this.showNotification('❌ Транзакция отменена', 'error');
      } else if (error.message && error.message.includes('Level already active')) {
        this.showNotification('❌ Уровень уже активирован', 'error');
      } else if (error.message && error.message.includes('Previous level not active')) {
        this.showNotification('❌ Сначала активируйте предыдущий уровень', 'error');
      } else {
        this.showNotification('❌ Ошибка активации: ' + error.message, 'error');
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // НАВИГАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  initNavigation() {
    if (this.state.navigationInitialized) {
      console.log('✅ Navigation already initialized');
      return;
    }

    console.log('🔧 Initializing navigation...');

    const navLinks = document.querySelectorAll('[data-page]');
    console.log(`📍 Found ${navLinks.length} navigation links`);
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        console.log(`🔘 Navigation clicked: ${page}`);
        this.showPage(page);
      });
    });

    const hash = window.location.hash.substring(1);
    this.state.currentPage = hash || 'dashboard';

    this.state.navigationInitialized = true;
    console.log('✅ Navigation initialized');
  },

  async showPage(pageName) {
    console.log(`📄 Loading page: ${pageName}`);
    
    try {
      this.showDApp();

      if (!this.state.navigationInitialized) {
        this.initNavigation();
      }

      document.querySelectorAll('.page-content').forEach(page => {
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
