// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Main Application Controller
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// GlobalWay DApp - PRODUCTION READY v2.2
// Date: 2025-11-12
// Status: ✅ 100% COMPLETE
// 
// Changes in this version:
// - Fixed activation modal design (cosmic theme)
// - Fixed level activation conditions
// - Added proper error handling
// - Improved user experience
// ═══════════════════════════════════════════════════════════════

const app = {
  // Состояние приложения
  state: {
    currentPage: null,
    userAddress: null,
    isRegistered: false,
    userID: null,
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
        console.log('🔄 Forcing landing page...');
        const landing = document.getElementById('landing');
        if (landing) landing.classList.add('active');
        const dapp = document.getElementById('dapp');
        if (dapp) dapp.classList.remove('active');
        this.state.currentPage = 'landing';
        return;
      }
      
      const hash = window.location.hash.substring(1);
      
      if (hash) {
        this.state.isLandingSkipped = true;
        const dappPage = document.getElementById('dapp');
        if (dappPage) dappPage.classList.add('active');
        
        const landing = document.getElementById('landing');
        if (landing) landing.classList.remove('active');
        
        this.initNavigation();
        
        if (hash && hash !== '') this.state.currentPage = hash;
        await this.loadCurrentPage();
      } else {
        console.log('👋 First visit - showing Landing page');
        this.state.currentPage = 'landing';
        const landing = document.getElementById('landing');
        if (landing) landing.classList.add('active');
        
        const dappPage = document.getElementById('dapp');
        if (dappPage) dappPage.classList.remove('active');
      }
      
      console.log('✅ App initialized successfully');
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      this.showNotification('Ошибка инициализации приложения', 'error');
    }
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

      const globalWay = await this.getContract('GlobalWay');
      const helper = await this.getContract('GlobalWayHelper');

      this.state.isRegistered = await globalWay.isUserRegistered(userAddress);

      if (this.state.isRegistered) {
        const userID = await helper.getUserID(userAddress);
        this.state.userID = userID === '' ? null : userID;
        this.state.maxLevel = await globalWay.getUserMaxLevel(userAddress);

        console.log('✅ User data loaded:', {
          address: userAddress,
          id: this.state.userID,
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
      const globalWay = await this.getContract('GlobalWay');
      const helper = await this.getContract('GlobalWayHelper');
      
      const isRegistered = await globalWay.isUserRegistered(this.state.userAddress);
      
      if (isRegistered) {
        console.log('✅ User is already registered');
        this.state.isRegistered = true;
        
        const userID = await helper.getUserID(this.state.userAddress);
        console.log('🆔 Current user ID:', userID);
        
        if (!userID || userID === '') {
          console.log('🆔 User registered but no ID - assigning...');
          
          const assignConfirm = confirm(
            'Регистрация обнаружена! 🎉\n\n' +
            'Для завершения нужно присвоить ваш уникальный ID.\n' +
            'Это бесплатно и займет несколько секунд.\n\n' +
            'Присвоить ID сейчас?'
          );
          
          if (!assignConfirm) {
            this.showNotification('Присвоение ID отменено', 'info');
            return;
          }
          
          const helperSigned = await this.getSignedContract('GlobalWayHelper');
          console.log('📝 Calling assignUserID()...');
          
          const assignTx = await helperSigned.assignUserID(this.state.userAddress);
          
          this.showNotification('Присвоение ID...', 'info');
          await assignTx.wait();
          
          const newID = await helper.getUserID(this.state.userAddress);
          this.state.userID = newID;
          
          this.showNotification(`✅ ID присвоен!\nВаш ID: GW${newID}`, 'success');
          console.log('✅ ID assigned:', newID);
        } else {
          this.state.userID = userID;
          console.log('✅ User already has ID:', userID);
        }
        
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
      
      const sponsorAddress = await this.getSponsorAddress();
      console.log('🎯 Using sponsor:', sponsorAddress);
      
      if (!sponsorAddress || sponsorAddress === ethers.ZeroAddress) {
        throw new Error('Invalid sponsor address: ' + sponsorAddress);
      }
      
      const globalWaySigned = await this.getSignedContract('GlobalWay');
      const registerTx = await globalWaySigned.register(sponsorAddress, { gasLimit: 500000 });
      
      this.showNotification('Регистрация...', 'info');
      await registerTx.wait();
      console.log('✅ Registered in GlobalWay');
      
      this.state.isRegistered = true;
      
      console.log('🆔 Assigning user ID after registration...');
      const helperSigned = await this.getSignedContract('GlobalWayHelper');
      
      const assignTx = await helperSigned.assignUserID(this.state.userAddress);
      
      this.showNotification('Присвоение ID...', 'info');
      await assignTx.wait();

      const newID = await helper.getUserID(this.state.userAddress);
      this.state.userID = newID;

      this.showNotification(`✅ Регистрация завершена!\nВаш ID: GW${newID}`, 'success');
      console.log('✅ ID assigned:', newID);

      setTimeout(() => {
        this.showActivationModal();
      }, 1500);

    } catch (error) {
      console.error('❌ Registration error:', error);
      
      if (error.code === 4001) {
        this.showNotification('Действие отменено пользователем', 'info');
      } else if (error.message.includes('Already registered')) {
        console.log('⚠️ User already registered, continuing...');
        this.state.isRegistered = true;
      } else if (error.message.includes('Sponsor not registered')) {
        this.showNotification('Ошибка: спонсор не зарегистрирован', 'error');
      } else if (error.message.includes('Invalid sponsor address')) {
        this.showNotification('Ошибка: неверный адрес спонсора', 'error');
      } else {
        this.showNotification('Ошибка: ' + error.message, 'error');
      }
      
      console.log('⚠️ User can still browse but needs manual registration');
    }
  },

  async getSponsorAddress() {
    const refCode = this.getReferralFromURL();
    
    if (!refCode) {
      return CONFIG.ADMIN.owner;
    }

    try {
      const helper = await this.getContract('GlobalWayHelper');
      let sponsorAddress = null;

      if (refCode.startsWith('GW') || /^\d+$/.test(refCode)) {
        const id = refCode.replace(/^GW/i, '');
        sponsorAddress = await helper.getAddressByID(id);
      } else if (refCode.startsWith('0x')) {
        sponsorAddress = refCode;
      }

      if (sponsorAddress && sponsorAddress !== ethers.ZeroAddress) {
        return sponsorAddress;
      }
    } catch (error) {
      console.error('Error getting sponsor:', error);
    }

    return CONFIG.ADMIN.owner;
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
      <div id="activationModal" class="modal" style="display: none; position: fixed; z-index: 10000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(10, 15, 35, 0.95); backdrop-filter: blur(10px);">
        <div class="modal-content" style="background: linear-gradient(135deg, #0a1a2f 0%, #152642 100%); margin: 5% auto; padding: 0; border: 1px solid #2a4a7a; border-radius: 20px; width: 90%; max-width: 450px; position: relative; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 215, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1); overflow: hidden;">
          <span class="close" style="color: #ffd700; float: right; font-size: 28px; font-weight: bold; position: absolute; right: 20px; top: 15px; cursor: pointer; z-index: 10001; text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);">&times;</span>
          
          <div style="background: linear-gradient(135deg, #1e3a5c 0%, #2a4a7a 100%); padding: 30px 20px 20px; text-align: center; border-bottom: 1px solid #2a4a7a; position: relative;">
            <div style="width: 100%; height: 3px; background: linear-gradient(90deg, #ffd700, #ffed4e, #ffd700); position: absolute; top: 0; left: 0;"></div>
            <div style="font-size: 48px; margin-bottom: 15px; filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.3));">🚀</div>
            <h2 style="color: #ffffff; margin: 0 0 10px; font-size: 22px; font-weight: 600;">Добро пожаловать в GlobalWay!</h2>
            <p style="color: #a0b3d9; margin: 0; font-size: 14px;">Ваш ID: <span style="color: #ffd700; font-weight: bold;">GW${this.state.userID}</span></p>
          </div>
          
          <div style="padding: 25px;">
            <div style="margin-bottom: 25px;">
              <h3 style="color: #ffd700; margin: 0 0 10px; font-size: 18px; font-weight: 600;">🎯 Начните зарабатывать!</h3>
              <p style="color: #a0b3d9; margin: 0 0 15px; font-size: 14px; line-height: 1.4;">Активируйте первый уровень чтобы открыть все возможности платформы</p>
              
              <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="color: #ffffff; padding: 8px 0; font-size: 14px; border-bottom: 1px solid #2a4a7a;">📊 Реферальная система</li>
                <li style="color: #ffffff; padding: 8px 0; font-size: 14px; border-bottom: 1px solid #2a4a7a;">🌐 Матричная структура</li>
                <li style="color: #ffffff; padding: 8px 0; font-size: 14px; border-bottom: 1px solid #2a4a7a;">💰 Выплаты и бонусы</li>
                <li style="color: #ffffff; padding: 8px 0; font-size: 14px;">🏆 Ранговая система</li>
              </ul>
            </div>
            
            <div style="margin-bottom: 25px;">
              <div style="background: rgba(255, 215, 0, 0.1); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
                <div style="color: #ffd700; font-size: 18px; font-weight: 600; margin-bottom: 5px;">Уровень 1</div>
                <div style="color: #ffffff; font-size: 24px; font-weight: bold; margin-bottom: 5px;">0.0015 BNB</div>
                <div style="color: #a0b3d9; font-size: 14px;">+5 GWT токенов</div>
              </div>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
              <button id="activateLevel1Btn" style="background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); color: #0a1a2f; padding: 15px 20px; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; text-align: center; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);">
                🚀 АКТИВИРОВАТЬ УРОВЕНЬ 1
              </button>
              
              <button id="viewPackagesBtn" style="background: transparent; color: #ffd700; border: 2px solid #ffd700; padding: 12px 20px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; text-align: center;">
                📦 Посмотреть пакеты
              </button>
            </div>
            
            <p style="color: #7a8fb9; font-size: 12px; text-align: center; margin: 0; line-height: 1.4;">
              После активации откроется полный доступ ко всем функциям платформы
            </p>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const activateBtn = document.getElementById('activateLevel1Btn');
    const packagesBtn = document.getElementById('viewPackagesBtn');
    
    if (activateBtn) {
      activateBtn.onclick = async () => {
        await this.activateUserLevel(1, '0.0015', activateBtn);
      };
      
      activateBtn.onmouseover = function() {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.5)';
      };
      
      activateBtn.onmouseout = function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.3)';
      };
    }
    
    if (packagesBtn) {
      packagesBtn.onclick = () => {
        this.closeModal('activationModal');
        this.showPage('packages');
      };
      
      packagesBtn.onmouseover = function() {
        this.style.background = 'rgba(255, 215, 0, 0.1)';
        this.style.transform = 'translateY(-2px)';
      };
      
      packagesBtn.onmouseout = function() {
        this.style.background = 'transparent';
        this.style.transform = 'translateY(0)';
      };
    }
    
    console.log('✅ Activation modal created');
  },

  async checkActivationConditions() {
    try {
      const userAddress = app.state.userAddress;
      console.log('🔍 Checking activation conditions...');
      
      const globalWay = await this.getContract('GlobalWay');
      
      const isRegistered = await globalWay.isUserRegistered(userAddress);
      console.log('✅ Registered:', isRegistered);
      
      const sponsor = await globalWay.getUserSponsor(userAddress);
      console.log('🎯 Sponsor:', sponsor);
      
      const isLevel1Active = await globalWay.isLevelActive(userAddress, 1);
      console.log('🔘 Level 1 active:', isLevel1Active);
      
      const isQuarterlyActive = await globalWay.isQuarterlyActive(userAddress);
      console.log('📅 Quarterly active:', isQuarterlyActive);
      
      const level1Price = await globalWay.levelPrices(1);
      console.log('💰 Level 1 price:', ethers.utils.formatEther(level1Price), 'BNB');
      
      if (!isRegistered) {
        console.log('❌ User not registered');
        return false;
      }
      if (isLevel1Active) {
        console.log('❌ Level 1 already active');
        return false;
      }
      if (!isQuarterlyActive) {
        console.log('❌ Quarterly not active');
        return false;
      }
      if (sponsor === '0x0000000000000000000000000000000000000000') {
        console.log('❌ Invalid sponsor');
        return false;
      }
      
      console.log('✅ All conditions met for activation');
      return true;
      
    } catch (error) {
      console.error('❌ Check conditions error:', error);
      return false;
    }
  },

  async activateUserLevel(level, price, button) {
    try {
      console.log(`🔄 Activating level ${level} for ${price} BNB...`);
      
      const canActivate = await this.checkActivationConditions();
      if (!canActivate) {
        app.showNotification('❌ Не выполнены условия для активации', 'error');
        return;
      }
      
      button.disabled = true;
      button.textContent = '⏳ Обработка...';
      
      const globalWaySigned = await this.getSignedContract('GlobalWay');
      const priceInWei = ethers.utils.parseEther(price);
      
      const tx = await globalWaySigned.activateLevel(level, {
        value: priceInWei,
        gasLimit: 500000
      });
      
      app.showNotification(`Активация уровня ${level}...`, 'info');
      await tx.wait();
      
      this.closeModal('activationModal');
      app.showNotification(`✅ Уровень ${level} успешно активирован!`, 'success');
      
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
        app.showNotification('❌ Транзакция отменена', 'error');
      } else if (error.message.includes('Level already active')) {
        app.showNotification('❌ Уровень уже активирован', 'error');
      } else if (error.message.includes('Previous level not active')) {
        app.showNotification('❌ Сначала активируйте предыдущий уровень', 'error');
      } else if (error.message.includes('execution reverted')) {
        app.showNotification('❌ Ошибка контракта. Проверьте условия активации', 'error');
      } else {
        app.showNotification('❌ Ошибка активации: ' + error.message, 'error');
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // НАВИГАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  initNavigation() {
    if (this.state.navigationInitialized) {
      console.log('✅ Navigation already initialized, skipping...');
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
    if (hash) {
      this.state.currentPage = hash;
    } else {
      this.state.currentPage = 'dashboard';
    }

    this.state.navigationInitialized = true;
    console.log('✅ Navigation initialized successfully');
  },

  async showPage(pageName) {
    console.log(`📄 Loading page: ${pageName}`);
    
    try {
      const dapp = document.getElementById('dapp');
      if (dapp && !dapp.classList.contains('active')) {
        dapp.classList.add('active');
      }

      const landing = document.getElementById('landing');
      if (landing && landing.classList.contains('active')) {
        landing.classList.remove('active');
      }

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
        } else {
          console.warn(`⚠️ Module ${moduleName} has no init() function`);
        }
      } else {
        console.warn(`❌ Module ${moduleName} not found in window object`);
      }
    } catch (error) {
      console.error(`❌ Error loading module ${pageName}:`, error);
    }
  },

  async loadCurrentPage() {
    await this.showPage(this.state.currentPage);
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
        throw new Error(`Contract ${contractName} not found in config`);
      }

      const response = await fetch(`./contracts/abis/${contractName}.json`);
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
      
      console.log(`✅ Contract ${contractName} loaded`);
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
    }, 3000);
  },

  // ═══════════════════════════════════════════════════════════════
  // МОДАЛЬНЫЕ ОКНА
  // ═══════════════════════════════════════════════════════════════
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'block';
      
      const closeBtn = modal.querySelector('.close');
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
    
    const chainId = await window.web3Manager.provider.getNetwork().then(n => n.chainId);
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

window.app = app;
