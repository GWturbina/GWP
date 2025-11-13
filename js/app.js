// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Main Application Controller
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// GlobalWay DApp - PRODUCTION READY v2.1
// Date: 2025-11-12
// Status: ✅ 100% COMPLETE
// 
// Changes in this version:
// - Added activation modal after registration
// - Fixed level activation buttons
// - Improved user state management
// - Better error handling
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
    activationModalShown: false  // ✅ НОВОЕ: Флаг чтобы не показывать модальное окно много раз
  },

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════

  // ✅ ФИНАЛ: Валидация конфигурации
  validateConfig() {
    try {
      // Проверка NETWORK
      if (!CONFIG.NETWORK || !CONFIG.NETWORK.chainId || !CONFIG.NETWORK.rpcUrl) {
        console.error('❌ Missing NETWORK config');
        return false;
      }
      
      // Проверка CONTRACTS
      if (!CONFIG.CONTRACTS) {
        console.error('❌ Missing CONTRACTS config');
        return false;
      }
      
      const requiredContracts = [
        'GlobalWay', 'GlobalWayHelper', 'GlobalWayMarketing', 
        'GlobalWayLeaderPool', 'GlobalWayInvestment', 'GlobalWayQuarterly',
        'GlobalWayBridge', 'GlobalWayStats', 'GWTToken'
      ];
      
      for (const contract of requiredContracts) {
        if (!CONFIG.CONTRACTS[contract]) {
          console.error(`❌ Missing contract: ${contract}`);
          return false;
        }
        
        // Проверка что адрес валидный (начинается с 0x и 42 символа)
        const addr = CONFIG.CONTRACTS[contract];
        if (!addr.startsWith('0x') || addr.length !== 42) {
          console.error(`❌ Invalid address for ${contract}: ${addr}`);
          return false;
        }
      }
      
      // Проверка ADMIN
      if (!CONFIG.ADMIN || !CONFIG.ADMIN.owner) {
        console.warn('⚠️ Missing ADMIN config');
      }
      
      console.log('✅ CONFIG validation passed');
      return true;
      
    } catch (error) {
      console.error('❌ CONFIG validation error:', error);
      return false;
    }
  },

  async init() {
    console.log('🚀 Initializing GlobalWay DApp...');
    
    try {
      await this.waitForWeb3();
      this.initConnectButton();
      await this.checkWalletConnection();

      // ПРИМУСОВО: Якщо немає hash і кошелек не підключений - показуємо лендінг
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
        
        // ✅ ИСПРАВЛЕНО: Всегда инициализируем навигацию при показе DApp
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

  // Инициализация кнопки Connect
  initConnectButton() {
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) {
      connectBtn.addEventListener('click', async () => {
        await this.connectWallet();
      });
    }
  },

  // Подключение кошелька
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
        
        // Обновляем UI
        this.updateWalletUI();
        
        // Загружаем данные
        await this.loadUserData();
        
        // Автоматическая регистрация
        await this.checkAndAutoRegister();
        
        // ✅ ДОБАВЛЕНО: Проверяем нужно ли показать модальное окно активации
        this.checkAndShowActivationModal();
        
        // КРИТИЧНО: Перезагружаем текущую страницу
        await this.loadCurrentPage();
        
        this.showNotification('Кошелек подключен!', 'success');
      }
    } catch (error) {
      console.error('❌ Connect wallet error:', error);
      this.showNotification('Ошибка подключения кошелька', 'error');
    }
  },

  // Обновление UI кошелька
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

  // Ждем загрузки Web3
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

  // Проверка подключения кошелька
  async checkWalletConnection() {
    if (window.web3Manager && window.web3Manager.isConnected) {
      this.state.userAddress = window.web3Manager.currentAccount;
      await this.loadUserData();
      
      // АВТОМАТИЧЕСКАЯ регистрация (если ID нет)
      await this.checkAndAutoRegister();
      
      // ✅ ДОБАВЛЕНО: Проверяем нужно ли показать модальное окно активации
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

      // Получаем контракты
      const globalWay = await this.getContract('GlobalWay');
      const helper = await this.getContract('GlobalWayHelper');

      // Проверяем регистрацию
      this.state.isRegistered = await globalWay.isUserRegistered(userAddress);

      if (this.state.isRegistered) {
        // Получаем ID пользователя
        const userID = await helper.getUserID(userAddress);
        this.state.userID = userID === '' ? null : userID;

        // Получаем максимальный уровень
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
  // АВТОМАТИЧЕСКАЯ РЕГИСТРАЦИЯ (БЕСПЛАТНАЯ!)
  // ═══════════════════════════════════════════════════════════════
  
  // Получить реферальный код из URL
  getReferralFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('ref') || params.get('sponsor') || null;
  },

  // ✅ ИСПРАВЛЕНО: Регистрация и присвоение ID (рабочая версия)
  async checkAndAutoRegister() {
    if (!this.state.userAddress) return;

    try {
      const globalWay = await this.getContract('GlobalWay');
      const helper = await this.getContract('GlobalWayHelper');
      
      // Проверяем зарегистрирован ли пользователь
      const isRegistered = await globalWay.isUserRegistered(this.state.userAddress);
      
      // ✅ СЛУЧАЙ 1: Пользователь УЖЕ зарегистрирован, но без ID
      if (isRegistered) {
        console.log('✅ User is already registered');
        this.state.isRegistered = true;
        
        // Проверяем есть ли ID
        const userID = await helper.getUserID(this.state.userAddress);
        console.log('🆔 Current user ID:', userID);
        
        if (!userID || userID === '') {
          console.log('🆔 User registered but no ID - assigning...');
          
          // ✅ Подтверждаем присвоение ID
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
          
          // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Передаем адрес пользователя как параметр
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
        
        // ✅ ДОБАВЛЕНО: После регистрации проверяем нужно ли показать модальное окно
        setTimeout(() => {
          this.checkAndShowActivationModal();
        }, 1000);
        
        return; // Прерываем функцию - пользователь уже в системе
      }
      
      // ✅ СЛУЧАЙ 2: Пользователь НЕ зарегистрирован
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
      
      // Регистрируем пользователя
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
      
      // Обновляем состояние
      this.state.isRegistered = true;
      
      // ✅ СРАЗУ присваиваем ID после регистрации
      console.log('🆔 Assigning user ID after registration...');
      const helperSigned = await this.getSignedContract('GlobalWayHelper');
      
      // ✅ ИСПРАВЛЕНО: Передаем адрес пользователя
      const assignTx = await helperSigned.assignUserID(this.state.userAddress);
      
      this.showNotification('Присвоение ID...', 'info');
      await assignTx.wait();

      const newID = await helper.getUserID(this.state.userAddress);
      this.state.userID = newID;

      this.showNotification(`✅ Регистрация завершена!\nВаш ID: GW${newID}`, 'success');
      console.log('✅ ID assigned:', newID);

      // ✅ ДОБАВЛЕНО: После успешной регистрации показываем модальное окно активации
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

  // Получить адрес спонсора из URL или использовать Owner
  async getSponsorAddress() {
    const refCode = this.getReferralFromURL();
    
    if (!refCode) {
      // Нет реф. кода - используем Owner
      return CONFIG.ADMIN.owner;
    }

    try {
      const helper = await this.getContract('GlobalWayHelper');
      let sponsorAddress = null;

      // Проверяем - это ID или адрес?
      if (refCode.startsWith('GW') || /^\d+$/.test(refCode)) {
        // Это ID
        const id = refCode.replace(/^GW/i, '');
        sponsorAddress = await helper.getAddressByID(id);
      } else if (refCode.startsWith('0x')) {
        // Это адрес
        sponsorAddress = refCode;
      }

      // Проверяем что спонсор существует
      if (sponsorAddress && sponsorAddress !== ethers.ZeroAddress) {
        return sponsorAddress;
      }
    } catch (error) {
      console.error('Error getting sponsor:', error);
    }

    // Fallback на Owner
    return CONFIG.ADMIN.owner;
  },

  // ═══════════════════════════════════════════════════════════════
  // МОДАЛЬНОЕ ОКНО АКТИВАЦИИ
  // ═══════════════════════════════════════════════════════════════

  // ✅ НОВОЕ: Проверка условий и показ модального окна активации
  checkAndShowActivationModal() {
    // Условия показа модального окна:
    // 1. Пользователь зарегистрирован
    // 2. Нет активных уровней (maxLevel === 0)
    // 3. Модальное окно еще не показывалось
    if (this.state.isRegistered && 
        this.state.maxLevel === 0 && 
        !this.state.activationModalShown) {
      
      console.log('🎯 Conditions met for activation modal');
      
      // Ждем немного чтобы интерфейс успел обновиться
      setTimeout(() => {
        this.showActivationModal();
      }, 2000);
    }
  },

  // ✅ НОВОЕ: Показ модального окна активации
  showActivationModal() {
    if (this.state.activationModalShown) {
      console.log('⚠️ Activation modal already shown');
      return;
    }

    console.log('🎯 Showing activation modal...');
    
    // Создаем модальное окно если его нет
    if (!document.getElementById('activationModal')) {
      this.createActivationModal();
    }
    
    // Показываем модальное окно
    this.showModal('activationModal');
    this.state.activationModalShown = true;
  },

  // ✅ НОВОЕ: Создание модального окна активации
  createActivationModal() {
    console.log('🔧 Creating activation modal...');
    
    const modalHTML = `
      <div id="activationModal" class="modal">
        <div class="modal-content" style="max-width: 500px;">
          <span class="close">&times;</span>
          
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
            <h2 style="color: #2c3e50; margin-bottom: 10px;">Добро пожаловать в GlobalWay!</h2>
            <p style="color: #7f8c8d; margin-bottom: 5px;">Ваш ID: <strong style="color: #e74c3c;">GW${this.state.userID}</strong></p>
            <p style="color: #7f8c8d; margin-bottom: 20px;">Регистрация успешно завершена!</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #27ae60; margin-bottom: 15px;">🚀 Начните зарабатывать!</h3>
              <p style="margin-bottom: 10px;"><strong>Активируйте первый уровень чтобы:</strong></p>
              <ul style="text-align: left; margin: 0 20px;">
                <li>Открыть реферальную систему</li>
                <li>Получить доступ к матрице</li>
                <li>Начать получать выплаты</li>
                <li>Участвовать в рангах и бонусах</li>
              </ul>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffeaa7;">
              <p style="margin: 0; color: #856404;">
                <strong>Уровень 1:</strong> 0.0015 BNB
              </p>
            </div>
            
            <button id="activateLevel1Btn" class="btn-primary" style="padding: 15px 30px; font-size: 18px; margin: 10px; width: 100%;">
              АКТИВИРОВАТЬ УРОВЕНЬ 1
            </button>
            
            <button id="viewPackagesBtn" class="btn-secondary" style="padding: 12px 25px; font-size: 16px; margin: 10px; width: 100%;">
              Посмотреть пакеты
            </button>
            
            <p style="font-size: 12px; color: #95a5a6; margin-top: 20px;">
              После активации откроется полный доступ ко всем функциям платформы
            </p>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Добавляем обработчики
    const activateBtn = document.getElementById('activateLevel1Btn');
    const packagesBtn = document.getElementById('viewPackagesBtn');
    
    if (activateBtn) {
      activateBtn.onclick = async () => {
        await this.activateUserLevel(1, '0.0015', activateBtn);
      };
    }
    
    if (packagesBtn) {
      packagesBtn.onclick = () => {
        this.closeModal('activationModal');
        this.showPage('packages');
      };
    }
    
    console.log('✅ Activation modal created');
  },

  // ✅ НОВОЕ: Функция активации уровня
  async activateUserLevel(level, price, button) {
    try {
      console.log(`🔄 Activating level ${level} for ${price} BNB...`);
      
      button.disabled = true;
      button.textContent = '⏳ Обработка...';
      
      const globalWaySigned = await this.getSignedContract('GlobalWay');
      const priceInWei = ethers.utils.parseEther(price);
      
      const tx = await globalWaySigned.activateLevel(level, {
        value: priceInWei,
        gasLimit: 300000
      });
      
      this.showNotification(`Активация уровня ${level}...`, 'info');
      await tx.wait();
      
      this.closeModal('activationModal');
      this.showNotification(`✅ Уровень ${level} успешно активирован!`, 'success');
      
      // Обновляем данные пользователя
      await this.loadUserData();
      
      // Обновляем текущую страницу
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
      } else if (error.message.includes('Level already active')) {
        this.showNotification('❌ Уровень уже активирован', 'error');
      } else if (error.message.includes('Previous level not active')) {
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
    // ✅ ИСПРАВЛЕНО: Проверяем, не была ли навигация уже инициализирована
    if (this.state.navigationInitialized) {
      console.log('✅ Navigation already initialized, skipping...');
      return;
    }

    console.log('🔧 Initializing navigation...');

    // Навигационное меню
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

    // Определяем текущую страницу из URL
    const hash = window.location.hash.substring(1);
    if (hash) {
      this.state.currentPage = hash;
    } else {
      // ✅ ИСПРАВЛЕНО: Если нет hash, устанавливаем dashboard по умолчанию
      this.state.currentPage = 'dashboard';
    }

    // ✅ НОВОЕ: Помечаем что навигация инициализирована
    this.state.navigationInitialized = true;
    console.log('✅ Navigation initialized successfully');
  },

  async showPage(pageName) {
    console.log(`📄 Loading page: ${pageName}`);
    
    try {
      // ✅ НОВОЕ: Убеждаемся что DApp видим и навигация инициализирована
      const dapp = document.getElementById('dapp');
      if (dapp && !dapp.classList.contains('active')) {
        dapp.classList.add('active');
      }

      const landing = document.getElementById('landing');
      if (landing && landing.classList.contains('active')) {
        landing.classList.remove('active');
      }

      // ✅ НОВОЕ: Инициализируем навигацию если еще не было
      if (!this.state.navigationInitialized) {
        this.initNavigation();
      }

      // 1. Скрываем все страницы
      document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
      });

      // 2. Показываем нужную страницу
      const pageElement = document.getElementById(pageName);
      if (pageElement) {
        pageElement.classList.add('active');
      } else {
        console.error(`❌ Page element #${pageName} not found!`);
      }

      // 3. Обновляем активный пункт меню
      document.querySelectorAll('.nav-btn').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageName) {
          link.classList.add('active');
        }
      });

      // 4. Обновляем URL
      window.location.hash = pageName;
      this.state.currentPage = pageName;

      // 5. Загружаем модуль страницы
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
    
    // Если модуль уже загружен, просто инициализируем
    if (this.state.pageModules[pageName]) {
      console.log(`✅ Module ${pageName} already loaded, re-initializing...`);
      if (typeof this.state.pageModules[pageName].init === 'function') {
        await this.state.pageModules[pageName].init();
      }
      return;
    }

    // Загружаем модуль динамически
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
        console.log('Available modules:', Object.keys(window).filter(k => k.endsWith('Module')));
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
    // Если контракт уже загружен
    if (this.state.contracts[contractName]) {
      return this.state.contracts[contractName];
    }

    try {
      const address = CONFIG.CONTRACTS[contractName];
      if (!address) {
        throw new Error(`Contract ${contractName} not found in config`);
      }

      // Загружаем ABI
      const response = await fetch(`./contracts/abis/${contractName}.json`);
      const contractData = await response.json();
      
      // Создаем контракт
      // Создаем контракт с signer если доступен
      const providerOrSigner = window.web3Manager?.signer || window.web3Manager?.provider;
      
      if (!providerOrSigner) {
        throw new Error('Web3 not initialized');
      }
      
      const contract = new ethers.Contract(
        address,
        contractData.abi,
        providerOrSigner
      );

      // Сохраняем в кеш
      this.state.contracts[contractName] = contract;
      
      console.log(`✅ Contract ${contractName} loaded`);
      return contract;
    } catch (error) {
      console.error(`❌ Error loading contract ${contractName}:`, error);
      throw error;
    }
  },

  // Получить контракт с подписью (для транзакций)
  async getSignedContract(contractName) {
    const contract = await this.getContract(contractName);
    const signer = window.web3Manager.signer;
    return contract.connect(signer);
  },

  // ═══════════════════════════════════════════════════════════════
  // ВЫВОД СРЕДСТВ (ОБЩАЯ ФУНКЦИЯ)
  // ═══════════════════════════════════════════════════════════════
  async withdrawFromContract(poolType) {
    if (!this.state.userAddress) {
      this.showNotification('Подключите кошелек', 'error');
      return;
    }

    try {
      let contractName, functionName;

      switch (poolType) {
        case 'marketing':
          contractName = 'GlobalWayMarketing';
          functionName = 'withdraw';
          break;
        case 'leader':
          contractName = 'GlobalWayLeaderPool';
          functionName = 'claimRankBonus';
          break;
        case 'investment':
          contractName = 'GlobalWayInvestment';
          functionName = 'withdraw';
          break;
        default:
          throw new Error('Unknown pool type');
      }

      this.showNotification('Подготовка транзакции...', 'info');

      const contract = await this.getSignedContract(contractName);
      const tx = await contract[functionName]();
      
      this.showNotification('Ожидание подтверждения...', 'info');
      await tx.wait();
      
      this.showNotification('Вывод успешен! 🎉', 'success');
      
      // Обновляем данные на странице
      if (this.state.pageModules[this.state.currentPage]) {
        const module = this.state.pageModules[this.state.currentPage];
        if (typeof module.refresh === 'function') {
          await module.refresh();
        }
      }

    } catch (error) {
      console.error('❌ Withdrawal error:', error);
      if (error.code === 4001) {
        this.showNotification('Транзакция отклонена', 'error');
      } else {
        this.showNotification('Ошибка вывода средств', 'error');
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // УВЕДОМЛЕНИЯ
  // ═══════════════════════════════════════════════════════════════
  showNotification(message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Добавляем на страницу
    document.body.appendChild(notification);

    // Показываем с анимацией
    setTimeout(() => notification.classList.add('show'), 10);

    // Убираем через 3 секунды
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
      
      // Закрытие по клику на крестик
      const closeBtn = modal.querySelector('.close');
      if (closeBtn) {
        closeBtn.onclick = () => this.closeModal(modalId);
      }

      // Закрытие по клику вне модалки
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
  
  // Копирование в буфер обмена
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showNotification('Скопировано! ✓', 'success');
    } catch (error) {
      console.error('Copy failed:', error);
      this.showNotification('Ошибка копирования', 'error');
    }
  },

  // Форматирование адреса (0x1234...5678)
  formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  },

  // Форматирование числа с разделителями
  formatNumber(number, decimals = 4) {
    if (!number) return '0';
    return Number(number).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  },

  // Форматирование BNB
  formatBNB(wei) {
    if (!wei) return '0';
    return ethers.utils.formatEther(wei);
  },

  // Конвертация в Wei
  parseEther(amount) {
    return ethers.utils.parseEther(amount.toString());
  },

  // Проверка сети
  async checkNetwork() {
    if (!window.web3Manager) return false;
    
    const chainId = await window.web3Manager.provider.getNetwork().then(n => n.chainId);
    if (chainId !== CONFIG.NETWORK.chainId) {
      this.showNotification('Неправильная сеть! Переключитесь на opBNB', 'error');
      return false;
    }
    return true;
  },

  // Обновление данных пользователя
  async refreshUserData() {
    await this.loadUserData();
    
    // Обновляем текущую страницу
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

// Обработчик изменения аккаунта
window.addEventListener('accountsChanged', async (accounts) => {
  console.log('👤 Account changed');
  app.state.userAddress = accounts[0] || null;
  await app.refreshUserData();
});

// Обработчик изменения сети
window.addEventListener('chainChanged', async () => {
  console.log('🔗 Chain changed');
  window.location.reload();
});

// Экспорт в window для доступа из других модулей
window.app = app;
