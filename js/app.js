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
      this.showNotification(_t('notifications.initError'), 'error');
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
    const connectBtn = document.getElementById('connectBtn');
    
    // ✅ ИСПРАВЛЕНО: блокируем кнопку сразу — предотвращаем двойное нажатие
    if (connectBtn) {
      if (connectBtn._connecting) {
        console.log('⚠️ Connection already in progress, ignoring click');
        return;
      }
      connectBtn._connecting = true;
      connectBtn.disabled = true;
      connectBtn.textContent = '⏳ Connecting...';
    }
    
    try {
      if (!window.web3Manager) {
        this.showNotification(_t('notifications.web3NotLoaded'), 'error');
        return;
      }

      this.showNotification(_t('notifications.walletConnecting'), 'info');
      
      await window.web3Manager.connect();
      
      if (window.web3Manager.isConnected) {
        this.state.userAddress = window.web3Manager.currentAccount;
        
        this.updateWalletUI();
        await this.loadUserData();
        await this.checkAndAutoRegister();
        this.checkAndShowActivationModal();
        await this.loadCurrentPage();
        
        this.showNotification(_t('notifications.walletConnected'), 'success');
      }
    } catch (error) {
      console.error('❌ Connect wallet error:', error);
      this.showNotification(_t('notifications.walletConnectError'), 'error');
      
      // ✅ ИСПРАВЛЕНО: разблокируем кнопку при ошибке
      if (connectBtn && !window.web3Manager?.isConnected) {
        connectBtn.disabled = false;
        connectBtn.textContent = _t ? _t('landing.connectWallet') : 'Connect Wallet';
        connectBtn._connecting = false;
      }
    } finally {
      // ✅ ИСПРАВЛЕНО: сбрасываем флаг блокировки в любом случае
      if (connectBtn) {
        connectBtn._connecting = false;
      }
    }
  },

  updateWalletUI() {
    const walletAddress = document.getElementById('walletAddress');
    const connectBtn = document.getElementById('connectBtn');
    const floatingBtn = document.getElementById('floatingConnectBtn');
    
    if (this.state.userAddress) {
      // Кошелёк подключён
      if (walletAddress) {
        walletAddress.textContent = this.formatAddress(this.state.userAddress);
      }
      if (connectBtn) {
        connectBtn.textContent = '✅ Connected';
        connectBtn.style.background = 'linear-gradient(135deg, #ffd700, #ffed4e)';
        connectBtn.style.color = '#000';
        connectBtn.style.borderColor = '#ffd700';
        connectBtn.disabled = true;
        connectBtn._connecting = false;
      }
      // ✅ Скрываем плавающую кнопку после подключения
      if (floatingBtn) floatingBtn.classList.add('hidden');

      this.updateAdminButton();
    } else {
      // Кошелёк не подключён — показываем плавающую кнопку
      if (walletAddress) walletAddress.textContent = 'Not connected';
      if (connectBtn) {
        connectBtn.textContent = 'Connect';
        connectBtn.style.background = '';
        connectBtn.style.color = '';
        connectBtn.style.borderColor = '';
        connectBtn.disabled = false;
        connectBtn._connecting = false;
      }
      if (floatingBtn) floatingBtn.classList.remove('hidden');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПРОВЕРКА ДОСТУПА К АДМИНКЕ
  // ═══════════════════════════════════════════════════════════════
  updateAdminButton() {
    const hasAccess = this.checkAdminAccess(this.state.userAddress);
    console.log('🔐 Admin access check:', hasAccess, 'for', this.state.userAddress);

    // ✅ ИСПРАВЛЕНО: обновляем ВСЕ admin-only кнопки (в nav и в overflow)
    const adminBtns = document.querySelectorAll('.admin-only');
    if (!adminBtns.length) {
      console.log('⚠️ No admin-only buttons found');
      return;
    }

    adminBtns.forEach(btn => {
      btn.style.display = hasAccess ? 'block' : 'none';
    });

    if (hasAccess) {
      console.log('✅ Admin buttons VISIBLE (' + adminBtns.length + ' buttons)');
      // Добавляем Admin в мобильный drawer если его там нет
      this.addAdminToDrawerIfNeeded();
    } else {
      console.log('🔒 Admin buttons HIDDEN');
    }
  },

  addAdminToDrawerIfNeeded() {
    const grid = document.getElementById('navDrawerGrid');
    if (!grid) return;
    if (grid.querySelector('[data-page="admin"]')) return; // уже есть

    const item = document.createElement('div');
    item.className = 'nav-drawer-item';
    item.setAttribute('data-page', 'admin');
    item.innerHTML = '<span class="nav-drawer-item-icon">⚙️</span><span class="nav-drawer-item-label">Admin</span>';
    item.addEventListener('click', () => {
      this.showPage('admin');
      this.closeMobileDrawer();
    });
    grid.appendChild(item);
    console.log('✅ Admin added to mobile drawer');
  },

  checkAdminAccess(address) {
    if (!address) return false;
    
    const addr = address.toLowerCase();
    const owner = CONFIG.ADMIN.owner.toLowerCase();
    const guardians = CONFIG.ADMIN.guardians.map(g => g.toLowerCase());
    
    const isOwner = addr === owner;
    const isGuardian = guardians.includes(addr);
    
    console.log('   Owner:', isOwner, '| Guardian:', isGuardian);
    
    return isOwner || isGuardian;
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
      this.updateWalletUI();
      await this.loadUserData();
      await this.checkAndAutoRegister();
      this.checkAndShowActivationModal();
    } else {
      // ✅ Не подключён — показываем плавающую кнопку на мобильном
      this.updateWalletUI();
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
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    
    const refFromURL = urlParams.get('ref') || urlParams.get('sponsor');
    const refFromHash = hashParams.get('ref') || hashParams.get('sponsor');
    
    // Поддержка хеш-ссылок: /#/ref/gw/123456
    let refFromHashPath = null;
    const hashPath = window.location.hash;
    const hashMatch = hashPath.match(/#\/ref\/(\w+)\/(\d+)/);
    if (hashMatch) {
      refFromHashPath = hashMatch[2]; // ID
      // Сохраняем направление для аналитики
      this.state.refDirection = hashMatch[1]; // gw, cg, nss
    }
    
    // Сохраняем направление из URL параметров
    const dir = urlParams.get('dir') || hashParams.get('dir');
    if (dir) this.state.refDirection = dir;
    
    return refFromURL || refFromHash || refFromHashPath || null;
  },


  // ✅ НОВОЕ: Модал подтверждения регистрации (вместо confirm())
  showRegistrationConfirmModal(referralCode, sponsorId) {
    return new Promise((resolve) => {
      // Удаляем старый модал если есть
      const existing = document.getElementById('regConfirmModal');
      if (existing) existing.remove();
      
      const sponsorText = referralCode && sponsorId
        ? `<p style="color:#aaa;margin:8px 0 0">Вас пригласил партнёр ID: <strong style="color:#ffd700">${sponsorId}</strong></p>`
        : '';

      const modal = document.createElement('div');
      modal.id = 'regConfirmModal';
      modal.style.cssText = `
        position:fixed;top:0;left:0;width:100%;height:100%;
        background:rgba(0,0,0,0.85);z-index:99999;
        display:flex;align-items:center;justify-content:center;
        padding:20px;box-sizing:border-box;
      `;
      modal.innerHTML = `
        <div style="
          background:linear-gradient(135deg,#0d1117,#1a1f2e);
          border:1px solid #ffd70044;border-radius:16px;
          padding:32px 24px;max-width:360px;width:100%;
          text-align:center;box-shadow:0 0 40px #ffd70022;
        ">
          <div style="font-size:48px;margin-bottom:12px">🌐</div>
          <h2 style="color:#ffd700;margin:0 0 8px;font-size:22px">GlobalWay</h2>
          <p style="color:#ccc;margin:0 0 4px;font-size:15px">Регистрация бесплатна и займёт несколько секунд.</p>
          ${sponsorText}
          <div style="display:flex;gap:12px;margin-top:24px">
            <button id="regNo" style="
              flex:1;padding:14px;border:1px solid #555;border-radius:10px;
              background:transparent;color:#aaa;font-size:15px;cursor:pointer;
            ">Отмена</button>
            <button id="regYes" style="
              flex:1;padding:14px;border:none;border-radius:10px;
              background:linear-gradient(135deg,#ffd700,#ff9500);
              color:#000;font-weight:700;font-size:15px;cursor:pointer;
            ">✅ Зарегистрироваться</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      const cleanup = (result) => {
        modal.remove();
        resolve(result);
      };
      
      document.getElementById('regYes').onclick = () => cleanup(true);
      document.getElementById('regNo').onclick  = () => cleanup(false);
      modal.onclick = (e) => { if (e.target === modal) cleanup(false); };
    });
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
        sponsorId = await this.getSponsorId();
        console.log('🎯 Resolved sponsor ID:', sponsorId);
      }
      
      console.log('🚀 Showing registration modal...');
      
      // ✅ ИСПРАВЛЕНО: заменяем confirm() на модал — confirm() блокирует весь UI на мобильных!
      const wantsToRegister = await this.showRegistrationConfirmModal(referralCode, sponsorId);
      
      if (!wantsToRegister) {
        this.showNotification('Registration cancelled', 'info');
        return;
      }
      
      console.log('🚀 Starting registration...');
      
      if (!sponsorId) {
        sponsorId = await this.getSponsorId();
      }
      
      console.log('🎯 Using sponsor ID:', sponsorId);
      
      if (!sponsorId || sponsorId === '0') {
        throw new Error('Invalid sponsor ID: ' + sponsorId);
      }
      
      console.log('📝 Calling MatrixRegistry.register(' + sponsorId + ')...');

      // ══════ ПРОВЕРКА: спонсор активировал L1? ══════
      try {
        const sponsorNode = await matrixRegistry.getMatrixNode(sponsorId);
        const isActive = sponsorNode.isActive ?? sponsorNode[1];
        if (!isActive) {
          this.showNotification(
            '⚠️ Your sponsor (ID: ' + sponsorId + ') has not activated Level 1 yet.\n\nRegistration is not possible until sponsor buys at least the first package.\nPlease let them know.',
            'error'
          );
          return;
        }
      } catch (checkErr) {
        // Если getMatrixNode не существует или ошибка — продолжаем, контракт сам вернёт ошибку
        console.warn('⚠️ Could not pre-check sponsor activation:', checkErr.message);
      }
      // ══════ КОНЕЦ ПРОВЕРКИ ══════

      const matrixRegistrySigned = await this.getSignedContract('MatrixRegistry');
      if (!matrixRegistrySigned) {
        throw new Error('Failed to get signed MatrixRegistry contract');
      }

      console.log('✅ Signed contract ready, requesting transaction...');
      
      // Показываем модальное окно с прогрессом
      this.showTransactionProgress('Registration', 'Confirm transaction in wallet...');
      
      const registerTx = await matrixRegistrySigned.register(sponsorId, { 
        gasLimit: CONFIG.GAS.register || 500000
      });

      console.log('⏳ Transaction sent:', registerTx.hash);
      console.log('⏳ Waiting for confirmation...');

      // Обновляем статус с хешем транзакции
      this.updateTransactionProgress(
        'Waiting for confirmation...', 
        'Transaction sent!',
        registerTx.hash
      );

      const receipt = await registerTx.wait();
      console.log('✅ Transaction confirmed:', receipt.transactionHash);

      // Закрываем прогресс
      this.hideTransactionProgress();

      this.state.isRegistered = true;
      
      const newUserId = await matrixRegistry.getUserIdByAddress(this.state.userAddress);
      this.state.userId = newUserId.toString();

      console.log('✅ Registration completed!');
      console.log('   Transaction hash:', receipt.transactionHash);
      console.log('   Your new ID:', this.state.userId);

      this.showNotification(
        `✅ Registration complete!\n\nYour ID: GW${this.state.userId}\n\n⚠️ Important: activate Level 1 so your referrals can register!`, 
        'success'
      );

      await this.loadUserData();
      await this.loadCurrentPage();

      setTimeout(() => {
        this.showActivationModal();
      }, 1500);

    } catch (error) {
      console.error('❌ Registration error:', error);
      console.error('   Error code:', error.code);
      console.error('   Error message:', error.message);
      
      // Закрываем прогресс при ошибке
      this.hideTransactionProgress();
      
      // ✅ После ошибки — убеждаемся что плавающая кнопка видна (если кошелёк отвалился)
      if (!window.web3Manager?.isConnected) {
        this.updateWalletUI();
      }

      if (error.code === 4001) {
        this.showNotification('Action cancelled by user', 'info');
      } else if (error.code === -32603) {
        this.showNotification('Transaction error. Check BNB balance.', 'error');
      } else if (error.message && error.message.includes('Already registered')) {
        console.log('⚠️ User already registered (from error)');
        this.state.isRegistered = true;
        await this.loadUserData();
        this.showNotification('Already registered!', 'info');
      } else if (error.message && error.message.includes('Sponsor not registered')) {
        this.showNotification('Error: sponsor not registered', 'error');
      } else if (error.message && (error.message.includes('Sponsor not found') || error.message.includes('Sponsor not active'))) {
        this.showNotification(
          '⚠️ Sponsor not activated!\n\nYour inviter is registered but has not bought Level 1 yet.\nTo register referrals, sponsor must activate at least Level 1.\n\nPlease notify your sponsor.', 
          'error'
        );
      } else if (error.message && error.message.includes('Invalid sponsor')) {
        this.showNotification('Error: invalid sponsor ID', 'error');
      } else {
        this.showNotification('Error: ' + (error.message || 'Unknown error'), 'error');
      }
    }
  },


  async getSponsorId() {
    const refCode = this.getReferralFromURL();
    console.log('🔍 Getting sponsor ID for ref code:', refCode);
    
    if (!refCode) {
      const rootId = (typeof CONFIG !== 'undefined' && CONFIG.ROOT_ID) ? CONFIG.ROOT_ID : '1';
      console.log('ℹ️ No referral code, using ROOT_ID:', rootId);
      return rootId;
    }

    try {
      const matrixRegistry = await this.getContract('MatrixRegistry');
      
      if (refCode.startsWith('GW') || /^\d+$/.test(refCode)) {
        const id = refCode.replace(/^GW/i, '');
        console.log('🔢 Checking numeric ID:', id);
        
        try {
          const address = await matrixRegistry.getAddressById(id);
          console.log('📍 Address for ID', id, ':', address);
          
          if (address && address !== ethers.constants.AddressZero) {
            console.log('✅ Valid sponsor ID:', id);
            return id;
          } else {
            console.warn('⚠️ Invalid sponsor ID (zero address):', id);
          }
        } catch (error) {
          console.error('❌ Error checking ID:', id, error);
        }
      }
      
      if (refCode.startsWith('0x')) {
        console.log('🔍 Checking address:', refCode);
        
        try {
          const userId = await matrixRegistry.getUserIdByAddress(refCode);
          console.log('🆔 User ID for address:', userId.toString());
          
          if (userId && userId.toString() !== '0') {
            console.log('✅ Valid sponsor from address:', userId.toString());
            return userId.toString();
          } else {
            console.warn('⚠️ Address not registered:', refCode);
          }
        } catch (error) {
          console.error('❌ Error checking address:', refCode, error);
        }
      }
    } catch (error) {
      console.error('❌ Error getting sponsor ID:', error);
    }

    const rootId = (typeof CONFIG !== 'undefined' && CONFIG.ROOT_ID) ? CONFIG.ROOT_ID : '1';
    console.log('ℹ️ Falling back to ROOT_ID:', rootId);
    return rootId;
  },


  // ═══════════════════════════════════════════════════════════════
  // МОДАЛЬНОЕ ОКНО АКТИВАЦИИ
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

  createActivationModal() {
    console.log('🔧 Creating activation modal...');
    
    const modalHTML = `
    <div id="activationModal" class="modal cosmic-modal">
        <div class="modal-content cosmic-card activation-modal-content">
            <span class="close-modal">&times;</span>
            
            <div class="modal-header cosmic-header">
                <div class="header-icon">🚀</div>
                <h2>Welcome to GlobalWay!</h2>
                <p>Your ID: <span class="user-id">GW${this.state.userId}</span></p>
            </div>
            
            <div class="modal-body modal-body-scroll">
                <div class="feature-section">
                    <h3>🎯 Start Earning!</h3>
                    <p>Activate Level 1 to unlock all platform features</p>
                    
                    <div class="features-grid">
                        <div class="feature-item">
                            <span class="feature-icon">📊</span>
                            <span>Referral System</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">🌐</span>
                            <span>Matrix Structure</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">💰</span>
                            <span>Payments & Bonuses</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">🏆</span>
                            <span>Rank System</span>
                        </div>
                    </div>
                </div>
                
                <div class="pricing-section">
                    <div class="price-card">
                        <div class="price-header">
                            <span class="level-badge">Level 1</span>
                            <span class="price-amount">${CONFIG.LEVEL_PRICES[0]} BNB</span>
                        </div>
                        <div class="price-details">
                            <span class="token-reward">+${CONFIG.TOKEN_REWARDS[0]} GWT tokens</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="action-buttons-fixed">
                <button id="activateLevel1Btn" class="btn-gold btn-activate-mobile">
                    🚀 ACTIVATE
                </button>
                <button id="viewPackagesBtn" class="btn-outline btn-packages-mobile">
                    📦 Packages
                </button>
            </div>
        </div>
    </div>
    <style id="activationModalStyles">
      .activation-modal-content {
        max-height: 90vh !important;
        max-height: 90dvh !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
        position: relative !important;
      }
      .activation-modal-content .close-modal {
        position: absolute !important;
        top: 10px !important;
        right: 15px !important;
        z-index: 10 !important;
        font-size: 28px !important;
        cursor: pointer !important;
        color: #fff !important;
      }
      .modal-body-scroll {
        flex: 1 !important;
        overflow-y: auto !important;
        padding: 15px 20px !important;
        -webkit-overflow-scrolling: touch !important;
      }
      .action-buttons-fixed {
        padding: 15px 20px !important;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
        border-top: 1px solid rgba(255,215,0,0.3) !important;
        display: flex !important;
        flex-direction: row !important;
        gap: 10px !important;
        flex-shrink: 0 !important;
      }
      .btn-activate-mobile {
        flex: 2 !important;
        padding: 15px 20px !important;
        font-size: 16px !important;
        min-height: 50px !important;
        touch-action: manipulation !important;
        -webkit-tap-highlight-color: transparent !important;
        cursor: pointer !important;
      }
      .btn-packages-mobile {
        flex: 1 !important;
        min-height: 50px !important;
        touch-action: manipulation !important;
        cursor: pointer !important;
      }
      @media (max-width: 480px) {
        .activation-modal-content {
          margin: 10px !important;
          max-height: calc(100vh - 20px) !important;
          max-height: calc(100dvh - 20px) !important;
          border-radius: 15px !important;
        }
        .activation-modal-content .modal-header {
          padding: 15px !important;
        }
        .activation-modal-content .modal-header h2 {
          font-size: 1.2em !important;
        }
        .features-grid {
          grid-template-columns: 1fr 1fr !important;
          gap: 8px !important;
        }
        .feature-item {
          padding: 8px !important;
          font-size: 0.8em !important;
        }
        .action-buttons-fixed {
          padding: 12px 15px !important;
        }
        .btn-activate-mobile {
          font-size: 14px !important;
          padding: 12px 15px !important;
        }
      }
    </style>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Обработчики событий с поддержкой мобильных устройств
    const activateBtn = document.getElementById('activateLevel1Btn');
    const packagesBtn = document.getElementById('viewPackagesBtn');
    const closeBtn = document.querySelector('#activationModal .close-modal');
    const self = this;
    
    // Защита от двойного нажатия
    let isActivating = false;
    
    if (activateBtn) {
        const handleActivate = async (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            
            if (isActivating) {
                console.log('⚠️ Activation already in progress');
                return;
            }
            
            isActivating = true;
            console.log('🚀 Activate button triggered');
            
            try {
                await self.activateUserLevel(1, CONFIG.LEVEL_PRICES[0], activateBtn);
            } finally {
                isActivating = false;
            }
        };
        
        activateBtn.addEventListener('click', handleActivate);
        activateBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            handleActivate(e);
        }, { passive: false });
    }
    
    if (packagesBtn) {
        const handlePackages = (e) => {
            if (e) e.preventDefault();
            console.log('📦 Packages button triggered');
            self.closeModal('activationModal');
            self.showPage('dashboard');
        };
        
        packagesBtn.addEventListener('click', handlePackages);
        packagesBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            handlePackages(e);
        }, { passive: false });
    }
    
    if (closeBtn) {
        const handleClose = (e) => {
            if (e) e.preventDefault();
            console.log('❌ Close button triggered');
            self.closeModal('activationModal');
        };
        
        closeBtn.addEventListener('click', handleClose);
        closeBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            handleClose(e);
        }, { passive: false });
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
        this.showNotification(_t('notifications.registerFirst'), 'error');
        return;
      }
      
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = '⏳ Confirm in wallet...';
      
      // Показываем модальное окно с прогрессом
      this.showTransactionProgress(`Level ${level} activation`, 'Confirm transaction in wallet...');
      
      const globalWaySigned = await this.getSignedContract('GlobalWay');
      const priceInWei = ethers.utils.parseEther(price);
      
      const tx = await globalWaySigned.activateLevel(level, {
        value: priceInWei,
        gasLimit: CONFIG.GAS.buyLevel || 500000
      });
      
      // Обновляем статус с хешем транзакции
      button.textContent = '⏳ Waiting...';
      this.updateTransactionProgress(
        'Waiting for confirmation...', 
        'Transaction sent!',
        tx.hash
      );
      
      await tx.wait();
      
      // Закрываем прогресс
      this.hideTransactionProgress();
      
      this.closeModal('activationModal');
      this.showNotification(
        `✅ Level ${level} activated!\n🎁 Received ${CONFIG.TOKEN_REWARDS[level - 1]} GWT`, 
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
      
      // Закрываем прогресс при ошибке
      this.hideTransactionProgress();
      
      button.disabled = false;
      button.textContent = `🚀 ACTIVATE УРОВЕНЬ ${level}`;
      
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

    // Initialize mobile drawer
    this.initMobileDrawer();
  },

  // ═══════════════════════════════════════════════════════════════
  // MOBILE MORE DRAWER
  // ═══════════════════════════════════════════════════════════════
  initMobileDrawer() {
    const moreBtn = document.getElementById('navMoreBtn');
    const drawer = document.getElementById('navDrawer');
    const overlay = document.getElementById('navDrawerOverlay');
    const grid = document.getElementById('navDrawerGrid');
    
    if (!moreBtn || !drawer || !grid) return;

    // Build drawer items from nav-secondary buttons
    const secondaryBtns = document.querySelectorAll('.nav-btn.nav-secondary');
    grid.innerHTML = '';
    
    secondaryBtns.forEach(btn => {
      // Skip hidden admin button for non-admins
      if (btn.style.display === 'none') return;
      
      const page = btn.getAttribute('data-page');
      const icon = btn.querySelector('.nav-icon')?.textContent || '📄';
      const label = btn.querySelector('span[data-translate]')?.textContent || btn.querySelector('span:last-child')?.textContent || page;
      
      const item = document.createElement('div');
      item.className = 'nav-drawer-item';
      item.setAttribute('data-page', page);
      item.innerHTML = `<span class="nav-drawer-item-icon">${icon}</span><span class="nav-drawer-item-label">${label}</span>`;
      
      item.addEventListener('click', () => {
        this.showPage(page);
        this.closeMobileDrawer();
      });
      
      grid.appendChild(item);
    });

    // More button toggle
    moreBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (drawer.classList.contains('active')) {
        this.closeMobileDrawer();
      } else {
        this.openMobileDrawer();
      }
    });

    // Overlay close
    if (overlay) {
      overlay.addEventListener('click', () => this.closeMobileDrawer());
    }

    // ✅ ИСПРАВЛЕНО: наблюдатель убран — логика перенесена в updateAdminButton()
    // который теперь сам вызывает addAdminToDrawerIfNeeded() когда нужно

    console.log('✅ Mobile drawer initialized');
  },

  openMobileDrawer() {
    const drawer = document.getElementById('navDrawer');
    const overlay = document.getElementById('navDrawerOverlay');
    const moreBtn = document.getElementById('navMoreBtn');
    
    // Update active states in drawer
    const currentPage = this.state.currentPage;
    document.querySelectorAll('.nav-drawer-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-page') === currentPage);
    });
    
    drawer?.classList.add('active');
    overlay?.classList.add('active');
    moreBtn?.classList.add('drawer-open');
  },

  closeMobileDrawer() {
    document.getElementById('navDrawer')?.classList.remove('active');
    document.getElementById('navDrawerOverlay')?.classList.remove('active');
    document.getElementById('navMoreBtn')?.classList.remove('drawer-open');
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

      // Highlight "More" button if secondary page is active
      const moreBtn = document.getElementById('navMoreBtn');
      const isSecondaryPage = document.querySelector(`.nav-btn.nav-secondary[data-page="${pageName}"]`);
      if (moreBtn) {
        moreBtn.classList.toggle('active', !!isSecondaryPage);
      }
      
      // Update drawer item active states
      document.querySelectorAll('.nav-drawer-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-page') === pageName);
      });

      // Close drawer on navigation
      this.closeMobileDrawer?.();

      window.location.hash = pageName;
      this.state.currentPage = pageName;

      await this.loadPageModule(pageName);

    } catch (error) {
      console.error(`❌ Error showing page ${pageName}:`, error);
      this.showNotification('Page loading error', 'error');
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
  // ПРОГРЕСС ТРАНЗАКЦИИ
  // ═══════════════════════════════════════════════════════════════
  showTransactionProgress(title, message) {
    // Удаляем старый если есть
    this.hideTransactionProgress();
    
    const modalHTML = `
    <div id="txProgressModal" class="modal tx-progress-modal" style="display: block;">
      <div class="modal-content tx-progress-content">
        <div class="tx-progress-header">
          <div class="tx-spinner"></div>
          <h3 id="txProgressTitle">${title}</h3>
        </div>
        <p id="txProgressMessage">${message}</p>
        <div id="txProgressLink" style="display: none;">
          <a id="txExplorerLink" href="#" target="_blank" class="tx-explorer-link">
            🔗 Посмотреть в эксплорере
          </a>
        </div>
        <p class="tx-warning">⚠️ Не закрывайте страницу!</p>
      </div>
    </div>
    <style>
      .tx-progress-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
      }
      .tx-progress-content {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 2px solid #ffd700;
        border-radius: 20px;
        padding: 30px 40px;
        text-align: center;
        max-width: 400px;
        box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
      }
      .tx-progress-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
        margin-bottom: 20px;
      }
      .tx-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid #333;
        border-top: 4px solid #ffd700;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .tx-progress-content h3 {
        color: #ffd700;
        margin: 0;
        font-size: 1.3em;
      }
      .tx-progress-content p {
        color: #fff;
        margin: 10px 0;
      }
      .tx-warning {
        color: #ff9800 !important;
        font-size: 0.9em;
        margin-top: 20px !important;
      }
      .tx-explorer-link {
        display: inline-block;
        color: #00d4ff;
        text-decoration: none;
        padding: 10px 20px;
        border: 1px solid #00d4ff;
        border-radius: 10px;
        margin-top: 10px;
        transition: all 0.3s;
      }
      .tx-explorer-link:hover {
        background: rgba(0, 212, 255, 0.2);
      }
    </style>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  },

  updateTransactionProgress(title, message, txHash) {
    const titleEl = document.getElementById('txProgressTitle');
    const messageEl = document.getElementById('txProgressMessage');
    const linkContainer = document.getElementById('txProgressLink');
    const linkEl = document.getElementById('txExplorerLink');
    
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    
    if (txHash && linkContainer && linkEl) {
      linkContainer.style.display = 'block';
      linkEl.href = `https://opbnbscan.com/tx/${txHash}`;
    }
  },

  hideTransactionProgress() {
    const modal = document.getElementById('txProgressModal');
    if (modal) {
      modal.remove();
    }
    // Удаляем стили если остались
    const styles = document.querySelectorAll('style');
    styles.forEach(style => {
      if (style.textContent.includes('tx-progress-modal')) {
        style.remove();
      }
    });
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
      // Пробуем современный API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        this.showNotification(_t ? _t('common.copied') : 'Скопировано! ✓', 'success');
        return;
      }
    } catch (e) {
      console.warn('clipboard.writeText failed:', e);
    }
    
    // ✅ FIX: Фолбек для мобильных (SafePal DApp Browser, iOS Safari)
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      
      // iOS Safari требует специальной обработки
      const range = document.createRange();
      range.selectNodeContents(textarea);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      textarea.setSelectionRange(0, text.length);
      
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showNotification(_t ? _t('common.copied') : 'Скопировано! ✓', 'success');
    } catch (fallbackError) {
      console.error('Copy fallback failed:', fallbackError);
      // Последний фолбек — показываем prompt
      prompt(_t ? _t('common.copyManual') : 'Скопируйте ссылку:', text);
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

// ✅ FIX: accountsChanged/chainChanged — события провайдера, а НЕ window!
function setupProviderListeners() {
  const provider = window.ethereum || window.safepal;
  if (!provider || provider._gwListenersSet) return;
  
  provider.on('accountsChanged', async (accounts) => {
    console.log('👤 Account changed:', accounts);
    if (accounts.length === 0) {
      app.state.userAddress = null;
      app.state.isRegistered = false;
      app.updateWalletUI();
    } else {
      app.state.userAddress = accounts[0].toLowerCase();
      app.state.contracts = {}; // сбрасываем кеш контрактов
      app.updateWalletUI();
      await app.loadUserData();
      await app.loadCurrentPage();
    }
  });
  
  provider.on('chainChanged', () => {
    console.log('🔗 Chain changed, reloading...');
    window.location.reload();
  });
  
  provider._gwListenersSet = true;
  console.log('✅ Provider event listeners set');
}

// Пытаемся установить слушатели при загрузке и после подключения
if (window.ethereum || window.safepal) {
  setupProviderListeners();
}
// Также вызываем после подключения кошелька
const _origConnect = app.connectWallet.bind(app);
app.connectWallet = async function() {
  await _origConnect();
  setupProviderListeners();
};

// Экспорт в window
window.app = app;
