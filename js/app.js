// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Main Application Controller
// ИСПРАВЛЕНО: Регистрация через GlobalWay + правильный ROOT_ID
// Date: 2025-11-30
// ═══════════════════════════════════════════════════════════════════

const app = {
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

  async init() {
    console.log('🚀 Initializing GlobalWay DApp...');
    try {
      await this.waitForWeb3();
      this.initConnectButton();
      await this.checkWalletConnection();
      if (!window.location.hash && !this.state.isLandingSkipped) {
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
      if (walletAddress) walletAddress.textContent = this.formatAddress(this.state.userAddress);
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
        console.log('✅ User data loaded:', { address: userAddress, userId: this.state.userId, maxLevel: this.state.maxLevel });
      }
    } catch (error) {
      console.error('❌ Error loading user data:', error);
    }
  },

  getReferralFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const refFromURL = urlParams.get('ref') || urlParams.get('sponsor');
    const refFromHash = hashParams.get('ref') || hashParams.get('sponsor');
    return refFromURL || refFromHash || null;
  },

  // ✅ ИСПРАВЛЕНО: Регистрация через GlobalWay.register()
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
        setTimeout(() => { this.checkAndShowActivationModal(); }, 1000);
        return;
      }
      
      console.log('🆕 User not registered');
      const sponsorId = await this.getSponsorId();
      console.log('🎯 Resolved sponsor ID:', sponsorId);
      const referralCode = this.getReferralFromURL();
      
      const message = referralCode 
        ? `Добро пожаловать в GlobalWay!\n\nВас пригласил партнёр с ID: ${sponsorId}\n\nРегистрация БЕСПЛАТНАЯ.\n\nЗарегистрироваться?`
        : `Добро пожаловать в GlobalWay!\n\nВы будете зарегистрированы под ROOT (ID: ${CONFIG.ROOT_ID})\n\nРегистрация БЕСПЛАТНАЯ.\n\nЗарегистрироваться?`;
      
      const wantsToRegister = confirm(message);
      if (!wantsToRegister) {
        this.showNotification('Регистрация отменена', 'info');
        return;
      }
      
      console.log('🚀 Starting registration with sponsor ID:', sponsorId);
      if (!sponsorId || sponsorId === '0') {
        throw new Error('Invalid sponsor ID: ' + sponsorId);
      }
      
      // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Вызываем GlobalWay.register()
      console.log('📝 Calling GlobalWay.register(' + sponsorId + ')...');
      const globalWaySigned = await this.getSignedContract('GlobalWay');
      if (!globalWaySigned) {
        throw new Error('Failed to get signed GlobalWay contract');
      }
      
      console.log('✅ Signed contract ready, requesting transaction...');
      this.showNotification('Подтвердите транзакцию в кошельке...', 'info');
      
      const registerTx = await globalWaySigned.register(sponsorId, { gasLimit: CONFIG.GAS.register });
      console.log('⏳ Transaction sent:', registerTx.hash);
      this.showNotification('Регистрация... Ожидайте подтверждения.', 'info');
      
      const receipt = await registerTx.wait();
      console.log('✅ Transaction confirmed:', receipt.transactionHash);
      
      this.state.isRegistered = true;
      const newUserId = await matrixRegistry.getUserIdByAddress(this.state.userAddress);
      this.state.userId = newUserId.toString();
      
      console.log('✅ Registration completed! ID:', this.state.userId);
      this.showNotification(`✅ Регистрация завершена!\nВаш ID: GW${this.state.userId}`, 'success');
      
      await this.loadUserData();
      await this.loadCurrentPage();
      setTimeout(() => { this.showActivationModal(); }, 1500);
      
    } catch (error) {
      console.error('❌ Registration error:', error);
      if (error.code === 4001) {
        this.showNotification('Действие отменено пользователем', 'info');
      } else if (error.message && error.message.includes('Already registered')) {
        this.state.isRegistered = true;
        await this.loadUserData();
        this.showNotification('Вы уже зарегистрированы!', 'info');
      } else if (error.message && error.message.includes('Sponsor not found')) {
        this.showNotification('Ошибка: спонсор не найден в системе', 'error');
      } else {
        this.showNotification('Ошибка: ' + (error.message || 'Неизвестная ошибка'), 'error');
      }
    }
  },

  // ✅ ИСПРАВЛЕНО: Fallback на CONFIG.ROOT_ID
  async getSponsorId() {
    const refCode = this.getReferralFromURL();
    console.log('🔍 Getting sponsor ID for ref code:', refCode);
    
    if (!refCode) {
      console.log('ℹ️ No referral code, using ROOT_ID:', CONFIG.ROOT_ID);
      return CONFIG.ROOT_ID;
    }
    
    try {
      const matrixRegistry = await this.getContract('MatrixRegistry');
      
      if (refCode.startsWith('GW') || /^\d+$/.test(refCode)) {
        const id = refCode.replace(/^GW/i, '');
        console.log('🔢 Checking numeric ID:', id);
        try {
          const address = await matrixRegistry.getAddressById(id);
          if (address && address !== ethers.constants.AddressZero) {
            console.log('✅ Valid sponsor ID:', id);
            return id;
          }
        } catch (error) {
          console.error('❌ Error checking ID:', id, error);
        }
      }
      
      if (refCode.startsWith('0x')) {
        console.log('🔍 Checking address:', refCode);
        try {
          const userId = await matrixRegistry.getUserIdByAddress(refCode);
          if (userId && userId.toString() !== '0') {
            console.log('✅ Valid sponsor from address:', userId.toString());
            return userId.toString();
          }
        } catch (error) {
          console.error('❌ Error checking address:', refCode, error);
        }
      }
    } catch (error) {
      console.error('❌ Error getting sponsor ID:', error);
    }
    
    console.log('ℹ️ Falling back to ROOT_ID:', CONFIG.ROOT_ID);
    return CONFIG.ROOT_ID;
  },

  checkAndShowActivationModal() {
    console.log('🔍 Checking activation modal conditions:', { isRegistered: this.state.isRegistered, maxLevel: this.state.maxLevel, shown: this.state.activationModalShown });
    if (this.state.isRegistered && this.state.maxLevel === 0 && !this.state.activationModalShown) {
      console.log('✅ Conditions met for activation modal');
      setTimeout(() => { this.showActivationModal(); }, 2000);
    }
  },

  showActivationModal() {
    if (this.state.activationModalShown) return;
    console.log('🎯 Showing activation modal...');
    if (!document.getElementById('activationModal')) {
      this.createActivationModal();
    }
    this.showModal('activationModal');
    this.state.activationModalShown = true;
  },

  createActivationModal() {
    const modalHTML = `
    <div id="activationModal" class="modal cosmic-modal">
      <div class="modal-content cosmic-card">
        <div class="modal-header cosmic-header">
          <div class="header-icon">🚀</div>
          <h2>Добро пожаловать в GlobalWay!</h2>
          <p>Ваш ID: <span class="user-id">GW${this.state.userId}</span></p>
        </div>
        <div class="modal-body">
          <div class="pricing-section">
            <div class="price-card">
              <span class="level-badge">Уровень 1</span>
              <span class="price-amount">${CONFIG.LEVEL_PRICES[0]} BNB</span>
              <span class="token-reward">+${CONFIG.TOKEN_REWARDS[0]} GWT</span>
            </div>
          </div>
          <div class="action-buttons">
            <button id="activateLevel1Btn" class="btn-gold">🚀 АКТИВИРОВАТЬ УРОВЕНЬ 1</button>
            <button id="viewPackagesBtn" class="btn-outline">📦 Посмотреть пакеты</button>
          </div>
        </div>
        <span class="close-modal">&times;</span>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const activateBtn = document.getElementById('activateLevel1Btn');
    const packagesBtn = document.getElementById('viewPackagesBtn');
    const closeBtn = document.querySelector('#activationModal .close-modal');
    
    if (activateBtn) activateBtn.onclick = async () => { await this.activateUserLevel(1, CONFIG.LEVEL_PRICES[0], activateBtn); };
    if (packagesBtn) packagesBtn.onclick = () => { this.closeModal('activationModal'); this.showPage('dashboard'); };
    if (closeBtn) closeBtn.onclick = () => this.closeModal('activationModal');
    
    const modal = document.getElementById('activationModal');
    if (modal) modal.onclick = (e) => { if (e.target === modal) this.closeModal('activationModal'); };
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
      const tx = await globalWaySigned.activateLevel(level, { value: priceInWei, gasLimit: CONFIG.GAS.buyLevel });
      
      this.showNotification(`Активация уровня ${level}...`, 'info');
      await tx.wait();
      
      this.closeModal('activationModal');
      this.showNotification(`✅ Уровень ${level} активирован!`, 'success');
      await this.loadUserData();
      
      if (this.state.currentPage && this.state.pageModules[this.state.currentPage]) {
        const module = this.state.pageModules[this.state.currentPage];
        if (typeof module.refresh === 'function') await module.refresh();
      }
    } catch (error) {
      console.error('❌ Activation error:', error);
      button.disabled = false;
      button.textContent = `🚀 АКТИВИРОВАТЬ УРОВЕНЬ ${level}`;
      if (error.code === 4001) {
        this.showNotification('❌ Транзакция отменена', 'error');
      } else if (error.message && error.message.includes('Not registered')) {
        this.showNotification('❌ Пользователь не зарегистрирован в GlobalWay', 'error');
      } else {
        this.showNotification('❌ Ошибка активации: ' + error.message, 'error');
      }
    }
  },

  initNavigation() {
    if (this.state.navigationInitialized) return;
    const navLinks = document.querySelectorAll('[data-page]');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        this.showPage(page);
      });
    });
    this.state.navigationInitialized = true;
    console.log('✅ Navigation initialized');
  },

  async showPage(pageName) {
    try {
      this.showDApp();
      if (!this.state.navigationInitialized) this.initNavigation();
      document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active'));
      const pageElement = document.getElementById(pageName);
      if (pageElement) pageElement.classList.add('active');
      document.querySelectorAll('.nav-btn').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageName) link.classList.add('active');
      });
      window.location.hash = pageName;
      this.state.currentPage = pageName;
      await this.loadPageModule(pageName);
    } catch (error) {
      console.error(`❌ Error showing page ${pageName}:`, error);
    }
  },

  async loadPageModule(pageName) {
    if (this.state.pageModules[pageName]) {
      if (typeof this.state.pageModules[pageName].init === 'function') {
        await this.state.pageModules[pageName].init();
      }
      return;
    }
    try {
      const moduleName = `${pageName}Module`;
      const module = window[moduleName];
      if (module) {
        this.state.pageModules[pageName] = module;
        if (typeof module.init === 'function') await module.init();
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

  async getContract(contractName) {
    if (this.state.contracts[contractName]) return this.state.contracts[contractName];
    try {
      const address = CONFIG.CONTRACTS[contractName];
      const abiPath = CONFIG.ABI_PATHS[contractName];
      const response = await fetch(abiPath);
      const contractData = await response.json();
      const providerOrSigner = window.web3Manager?.signer || window.web3Manager?.provider;
      const contract = new ethers.Contract(address, contractData.abi, providerOrSigner);
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
    return contract.connect(window.web3Manager.signer);
  },

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

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'block';
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  },

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showNotification('Скопировано! ✓', 'success');
    } catch (error) {
      this.showNotification('Ошибка копирования', 'error');
    }
  },

  formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  },

  formatNumber(number, decimals = 4) {
    if (!number) return '0';
    return Number(number).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
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
    if (network.chainId !== CONFIG.NETWORK.chainId) {
      this.showNotification('Неправильная сеть! Переключитесь на opBNB', 'error');
      return false;
    }
    return true;
  },

  async refreshUserData() {
    await this.loadUserData();
    if (this.state.pageModules[this.state.currentPage]) {
      const module = this.state.pageModules[this.state.currentPage];
      if (typeof module.refresh === 'function') await module.refresh();
    }
  }
};

window.addEventListener('accountsChanged', async (accounts) => {
  app.state.userAddress = accounts[0] || null;
  await app.refreshUserData();
});

window.addEventListener('chainChanged', async () => {
  window.location.reload();
});

window.app = app;
