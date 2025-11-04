/* jshint esversion: 8 */
/* global CONFIG, web3Manager, contracts, Utils, QRCode */

/**
 * Application - Main DApp Controller
 * Version: 2.0 - Production Ready
 * Date: 03.11.2025
 */

class Application {
  constructor() {
    this.initialized = false;
    this.currentPage = 'landing';
    this.userData = null;
    this.autoUpdateInterval = null;
  }

  /**
   * Инициализация приложения
   */
  async init() {
    console.log('🚀 GlobalWay DApp Starting...');
    
    try {
      // Инициализация Web3Manager
      await web3Manager.init();
      
      // Проверка сохранённого подключения
      const wasConnected = localStorage.getItem('walletConnected') === 'true';
      const savedAddress = localStorage.getItem('walletAddress');
      
      if (wasConnected && savedAddress && web3Manager.connected) {
        console.log('🔄 Auto-connected to saved wallet');
        await this.onWalletConnected();
      }
      
      // Настройка UI
      this.setupUI();
      
      // Обработчики кнопок
      this.setupEventListeners();
      
      // 🔥 НОВОЕ: Touch-поддержка для мобильных устройств
      this.setupTouchSupport();
      
      // Проверка реферальной ссылки
      this.checkReferralLink();
      
      this.initialized = true;
      console.log('✅ DApp initialized successfully');
      
    } catch (error) {
      console.error('❌ DApp initialization failed:', error);
      Utils.showNotification('Initialization failed: ' + error.message, 'error');
    }
  }

  /**
   * Настройка UI элементов
   */
  setupUI() {
    // Обновить статус подключения
    this.updateConnectionStatus();
    
    // Показать/скрыть элементы в зависимости от подключения
    this.updateUIVisibility();
  }

  /**
   * Настройка обработчиков событий
   */
  setupEventListeners() {
    // Кнопка Connect Wallet
    const connectBtn = document.getElementById('connectWallet');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => this.connectWallet());
    }
    
    // Кнопка Register
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
      registerBtn.addEventListener('click', () => this.register());
    }
    
    // Кнопка Activate Level
    const activateBtns = document.querySelectorAll('.activate-level-btn');
    activateBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const level = parseInt(btn.dataset.level);
        this.activateLevel(level);
      });
    });
    
    // Кнопка Pay Quarterly
    const payQuarterlyBtn = document.getElementById('payActivityBtn');
    if (payQuarterlyBtn) {
      payQuarterlyBtn.addEventListener('click', () => this.payQuarterly());
    }
    
    // Кнопки Withdraw
    const withdrawBtns = document.querySelectorAll('.withdraw-btn');
    withdrawBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const poolType = btn.dataset.pool;
        this.withdraw(poolType);
      });
    });
    
    // Копирование реферальной ссылки
    const copyRefBtn = document.getElementById('copyRefLink');
    if (copyRefBtn) {
      copyRefBtn.addEventListener('click', () => this.copyReferralLink());
    }
    
    // Генерация QR кода
    const generateQRBtn = document.getElementById('generateQR');
    if (generateQRBtn) {
      generateQRBtn.addEventListener('click', () => this.generateQRCode());
    }
  }

  /**
   * Настройка touch-поддержки для мобильных устройств
   * 🔥 НОВОЕ: Добавляем touchstart/touchend для всех кликабельных элементов
   */
  setupTouchSupport() {
    // Проверяем, является ли устройство мобильным
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (!isMobile && !isTouchDevice) {
      console.log('📱 Desktop device detected, skipping touch setup');
      return;
    }
    
    console.log('📱 Mobile/Touch device detected, setting up touch events');
    
    // Добавляем touch события ко всем кнопкам
    const buttons = document.querySelectorAll('button, .btn, .level-btn, .nav-btn');
    buttons.forEach(btn => {
      this.addTouchEvent(btn);
    });
    
    // Добавляем touch события к планетам
    const planets = document.querySelectorAll('.planet, .planet-item, [data-planet]');
    planets.forEach(planet => {
      this.addTouchEvent(planet);
    });
    
    // Добавляем touch события к кликабельным элементам
    const clickables = document.querySelectorAll('[onclick], .clickable, .position-card');
    clickables.forEach(el => {
      this.addTouchEvent(el);
    });
    
    // Адаптивные модальные окна
    this.makeModalsAdaptive();
    
    console.log('✅ Touch support enabled');
  }
  
  /**
   * Добавить touch-событие к элементу
   */
  addTouchEvent(element) {
    if (!element || element.dataset.touchEnabled) return;
    
    let touchStartTime = 0;
    let touchMoved = false;
    
    element.addEventListener('touchstart', (e) => {
      touchStartTime = Date.now();
      touchMoved = false;
      element.classList.add('touch-active');
    }, { passive: true });
    
    element.addEventListener('touchmove', () => {
      touchMoved = true;
      element.classList.remove('touch-active');
    }, { passive: true });
    
    element.addEventListener('touchend', (e) => {
      element.classList.remove('touch-active');
      
      // Если это был короткий тап без движения - эмулируем клик
      const touchDuration = Date.now() - touchStartTime;
      if (!touchMoved && touchDuration < 500) {
        // Предотвращаем двойное срабатывание (touch + click)
        e.preventDefault();
        
        // Триггерим клик событие
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        element.dispatchEvent(clickEvent);
      }
    });
    
    // Отмечаем что touch уже добавлен
    element.dataset.touchEnabled = 'true';
  }
  
  /**
   * Сделать модальные окна адаптивными
   * 🔥 НОВОЕ: Адаптация под размер экрана и touch-жесты
   */
  makeModalsAdaptive() {
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
      // Адаптивное позиционирование
      const checkModalSize = () => {
        const modalContent = modal.querySelector('.modal-content');
        if (!modalContent) return;
        
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        
        // На мобильных делаем модалку на весь экран
        if (windowWidth < 768) {
          modalContent.style.width = '95%';
          modalContent.style.maxWidth = '95%';
          modalContent.style.margin = '10px auto';
          modalContent.style.maxHeight = `${windowHeight - 40}px`;
          modalContent.style.overflowY = 'auto';
        } else {
          // На десктопе стандартные размеры
          modalContent.style.width = '';
          modalContent.style.maxWidth = '';
          modalContent.style.margin = '';
          modalContent.style.maxHeight = '';
        }
      };
      
      // Проверяем при открытии модалки
      const originalDisplay = modal.style.display;
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'style' && modal.style.display === 'block') {
            checkModalSize();
          }
        });
      });
      
      observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
      
      // Проверяем при изменении размера окна
      window.addEventListener('resize', checkModalSize);
      
      // Swipe для закрытия на мобильных
      let touchStartY = 0;
      let touchEndY = 0;
      
      modal.addEventListener('touchstart', (e) => {
        touchStartY = e.changedTouches[0].screenY;
      }, { passive: true });
      
      modal.addEventListener('touchend', (e) => {
        touchEndY = e.changedTouches[0].screenY;
        
        // Если свайп вниз больше 100px - закрываем модалку
        if (touchStartY - touchEndY < -100) {
          modal.style.display = 'none';
        }
      }, { passive: true });
    });
  }

  /**
   * Подключение кошелька
   */
  async connectWallet() {
    try {
      Utils.showLoader(true);
      
      await web3Manager.connect();
      await this.onWalletConnected();
      
      Utils.showNotification(CONFIG.SUCCESS.WALLET_CONNECTED, 'success');
      
    } catch (error) {
      console.error('Connection error:', error);
      Utils.showNotification(error.message, 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  /**
   * Обработчик успешного подключения кошелька
   */
  async onWalletConnected() {
    console.log('✅ Wallet connected:', web3Manager.address);
    
    try {
      // Инициализация контрактов
      await contracts.init();
      
      // Загрузка данных пользователя
      await this.loadUserData();
      
      // Обновить UI
      this.updateConnectionStatus();
      this.updateUIVisibility();
      
      // Проверка регистрации
      const isRegistered = await contracts.isUserRegistered(web3Manager.address);
      
      if (!isRegistered) {
        console.log('⚠️ User not registered');
        this.showRegistrationPrompt();
      } else {
        console.log('✅ User registered');
        this.showPage('dashboard');
        
        // Запустить автообновление
        this.startAutoUpdate();
      }
      
    } catch (error) {
      console.error('❌ Post-connection setup failed:', error);
      Utils.showNotification('Failed to load user data', 'error');
    }
  }

  /**
   * Смена аккаунта
   */
  async onAccountChanged(newAddress) {
    console.log('🔄 Account changed to:', newAddress);
    
    // Остановить автообновление
    this.stopAutoUpdate();
    
    // Перезагрузить данные
    await this.loadUserData();
    
    // Проверка регистрации нового аккаунта
    const isRegistered = await contracts.isUserRegistered(newAddress);
    
    if (!isRegistered) {
      this.showRegistrationPrompt();
    } else {
      this.showPage('dashboard');
      this.startAutoUpdate();
    }
  }

  /**
   * Загрузка данных пользователя
   */
  async loadUserData() {
    if (!web3Manager.connected) {
      console.warn('⚠️ Wallet not connected');
      return;
    }
    
    console.log('📊 Loading user data...');
    
    try {
      const address = web3Manager.address;
      
      // Базовая информация
      const balance = await web3Manager.getBalance();
      const userInfo = await contracts.getUserInfo(address);
      
      // Сохранить данные
      this.userData = {
        address,
        balance,
        ...userInfo
      };
      
      // Обновить UI
      this.updateUserInfo();
      
      console.log('✅ User data loaded');
      
    } catch (error) {
      console.error('❌ Failed to load user data:', error);
    }
  }

  /**
   * Обновление информации о пользователе в UI
   */
  updateUserInfo() {
    if (!this.userData) return;
    
    // Адрес
    const addressEl = document.getElementById('userAddress');
    if (addressEl) {
      addressEl.textContent = Utils.formatAddress(this.userData.address);
    }
    
    // Баланс
    const balanceEl = document.getElementById('userBalance');
    if (balanceEl) {
      balanceEl.textContent = `${parseFloat(this.userData.balance).toFixed(4)} BNB`;
    }
    
    // ID пользователя
    const userIdEl = document.getElementById('userId');
    if (userIdEl && this.userData.id) {
      userIdEl.textContent = this.userData.id;
    }
    
    // Ранг (определяется по количеству активных уровней)
    const rankEl = document.getElementById('userRank');
    if (rankEl) {
      // 🔥 ИСПРАВЛЕНО: Передаём activeLevel вместо rankLevel
      const rankName = this.getRankName(this.userData.activeLevel || 0);
      rankEl.textContent = rankName;
      rankEl.className = `rank-badge ${rankName.toLowerCase()}`;
    }
    
    // Реферальная ссылка
    if (this.userData.id) {
      const refLinkEl = document.getElementById('refLink');
      if (refLinkEl) {
        const refLink = `${window.location.origin}?ref=${this.userData.id}`;
        refLinkEl.value = refLink;
      }
    }
  }

  /**
   * Получить название ранга по количеству активных уровней
   * 🔥 ИСПРАВЛЕНО: Определяем ранг по activeLevel, а не по rankLevel
   * Логика:
   * - 0 уровней = None
   * - 1-3 уровня = Bronze
   * - 4-7 уровней = Silver
   * - 8-10 уровней = Gold
   * - 11-12 уровней = Platinum
   */
  getRankName(rankLevel) {
    // Если передан activeLevel напрямую, используем его
    // Иначе берём из userData
    const activeLevel = (typeof rankLevel === 'number' && rankLevel >= 0) 
      ? rankLevel 
      : (this.userData?.activeLevel || 0);
    
    if (activeLevel === 0) return 'None';
    if (activeLevel >= 1 && activeLevel <= 3) return 'Bronze';
    if (activeLevel >= 4 && activeLevel <= 7) return 'Silver';
    if (activeLevel >= 8 && activeLevel <= 10) return 'Gold';
    if (activeLevel >= 11 && activeLevel <= 12) return 'Platinum';
    
    return 'None';
  }

  /**
   * Обновить статус подключения
   */
  updateConnectionStatus() {
    const statusEl = document.getElementById('walletStatus');
    const connectBtn = document.getElementById('connectWallet');
    
    if (!statusEl || !connectBtn) return;
    
    if (web3Manager.connected) {
      statusEl.textContent = Utils.formatAddress(web3Manager.address);
      statusEl.classList.add('connected');
      connectBtn.textContent = 'Connected';
      connectBtn.disabled = true;
    } else {
      statusEl.textContent = 'Not Connected';
      statusEl.classList.remove('connected');
      connectBtn.textContent = 'Connect Wallet';
      connectBtn.disabled = false;
    }
  }

  /**
   * Обновить видимость UI элементов
   */
  updateUIVisibility() {
    const isConnected = web3Manager.connected;
    
    // Скрыть/показать элементы требующие подключения
    const connectedElements = document.querySelectorAll('.requires-connection');
    connectedElements.forEach(el => {
      el.style.display = isConnected ? 'block' : 'none';
    });
    
    // Показать/скрыть алерт подключения
    const connectionAlert = document.getElementById('connectionAlert');
    if (connectionAlert) {
      connectionAlert.style.display = isConnected ? 'none' : 'flex';
    }
  }

  /**
   * Проверка реферальной ссылки в URL
   */
  checkReferralLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const refId = urlParams.get('ref');
    
    if (refId) {
      console.log('🔗 Referral ID found:', refId);
      
      // Сохранить в localStorage
      localStorage.setItem('referralId', refId);
      
      // Показать форму регистрации
      const regSection = document.getElementById('registration');
      if (regSection) {
        regSection.scrollIntoView({ behavior: 'smooth' });
      }
      
      // Заполнить поле
      const refInput = document.getElementById('refInput');
      if (refInput) {
        refInput.value = refId;
      }
    }
  }

  /**
   * Показать prompt регистрации
   */
  showRegistrationPrompt() {
    const alertEl = document.getElementById('connectionAlert');
    const messageEl = document.getElementById('alertMessage');
    const actionBtn = document.getElementById('alertAction');
    
    if (!alertEl || !messageEl || !actionBtn) return;
    
    messageEl.textContent = 'You need to register first!';
    actionBtn.textContent = 'Register Now';
    actionBtn.onclick = () => {
      this.showPage('landing');
      const regSection = document.getElementById('registration');
      if (regSection) {
        regSection.scrollIntoView({ behavior: 'smooth' });
      }
    };
    
    alertEl.style.display = 'flex';
  }

  /**
   * Регистрация пользователя
   */
  async register() {
    try {
      if (!web3Manager.connected) {
        Utils.showNotification(CONFIG.ERRORS.WALLET_NOT_CONNECTED, 'error');
        return;
      }
      
      // Получить referral ID
      const refInput = document.getElementById('refInput');
      if (!refInput || !refInput.value) {
        Utils.showNotification('Please enter Referral ID', 'error');
        return;
      }
      
      const refId = refInput.value.trim();
      
      // Валидация ID
      if (!CONFIG.VALIDATION.USER_ID_REGEX.test(refId)) {
        Utils.showNotification('Invalid Referral ID format', 'error');
        return;
      }
      
      Utils.showLoader(true);
      
      // Получить адрес спонсора по ID
      const sponsorAddress = await contracts.getAddressByUserId(refId);
      
      if (sponsorAddress === ethers.constants.AddressZero) {
        throw new Error('Invalid Referral ID: Sponsor not found');
      }
      
      console.log('📝 Registering with sponsor:', sponsorAddress);
      
      // Проверка спонсора зарегистрирован
      const sponsorRegistered = await contracts.isUserRegistered(sponsorAddress);
      if (!sponsorRegistered) {
        throw new Error('Sponsor is not registered');
      }
      
      // Вызов контракта
      const receipt = await contracts.register(sponsorAddress);
      
      console.log('✅ Registration successful:', receipt.transactionHash);
      
      Utils.showNotification(CONFIG.SUCCESS.REGISTRATION_COMPLETE, 'success');
      
      // Перезагрузить данные
      await this.loadUserData();
      
      // Переход на dashboard
      setTimeout(() => {
        this.showPage('dashboard');
        this.startAutoUpdate();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Registration failed:', error);
      Utils.showNotification(error.message, 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  /**
   * Активация уровня
   */
  async activateLevel(level) {
    try {
      if (!web3Manager.connected) {
        Utils.showNotification(CONFIG.ERRORS.WALLET_NOT_CONNECTED, 'error');
        return;
      }
      
      // Проверка можно ли купить
      const canBuy = await contracts.canBuyLevel(web3Manager.address, level);
      if (!canBuy) {
        Utils.showNotification('Cannot activate this level yet', 'error');
        return;
      }
      
      const price = CONFIG.LEVEL_PRICES[level - 1];
      
      const confirmed = confirm(
        `Activate Level ${level}?\n\n` +
        `Price: ${price} BNB\n\n` +
        `You will receive ${CONFIG.TOKEN_REWARDS[level - 1]} GWT tokens!`
      );
      
      if (!confirmed) return;
      
      Utils.showLoader(true);
      
      const receipt = await contracts.activateLevel(level);
      
      console.log('✅ Level activated:', receipt.transactionHash);
      
      Utils.showNotification(CONFIG.SUCCESS.LEVEL_ACTIVATED, 'success');
      
      // Обновить UI
      await this.loadDashboard();
      
    } catch (error) {
      console.error('❌ Level activation failed:', error);
      Utils.showNotification(error.message, 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  /**
   * Пакетная активация уровней
   */
  async activateBulkLevels(upToLevel) {
    try {
      if (!web3Manager.connected) {
        Utils.showNotification(CONFIG.ERRORS.WALLET_NOT_CONNECTED, 'error');
        return;
      }
      
      Utils.showLoader(true);
      
      // Рассчитать цену
      const totalPrice = await contracts.calculateBulkPrice(upToLevel);
      const priceFormatted = ethers.utils.formatEther(totalPrice);
      
      const confirmed = confirm(
        `Activate Levels 1-${upToLevel}?\n\n` +
        `Total Price: ${priceFormatted} BNB\n\n` +
        `You will receive tokens for all levels!`
      );
      
      if (!confirmed) {
        Utils.showLoader(false);
        return;
      }
      
      const receipt = await contracts.activateBulkLevels(upToLevel);
      
      console.log('✅ Bulk levels activated:', receipt.transactionHash);
      
      Utils.showNotification('Bulk activation successful!', 'success');
      
      // Обновить UI
      await this.loadDashboard();
      
    } catch (error) {
      console.error('❌ Bulk activation failed:', error);
      Utils.showNotification(error.message, 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  /**
   * Оплата квартальной активности
   */
  async payQuarterly() {
    try {
      if (!web3Manager.connected) {
        Utils.showNotification(CONFIG.ERRORS.WALLET_NOT_CONNECTED, 'error');
        return;
      }
      
      const fee = CONFIG.QUARTERLY.FEE;
      
      const confirmed = confirm(
        `Pay Quarterly Activity?\n\n` +
        `Fee: ${fee} BNB\n\n` +
        `This will create 3 technical accounts in your matrix.`
      );
      
      if (!confirmed) return;
      
      Utils.showLoader(true);
      
      const receipt = await contracts.payQuarterlyActivity();
      
      console.log('✅ Quarterly paid:', receipt.transactionHash);
      
      Utils.showNotification(CONFIG.SUCCESS.QUARTERLY_PAID, 'success');
      
      // Обновить UI
      await this.loadDashboard();
      
    } catch (error) {
      console.error('❌ Quarterly payment failed:', error);
      Utils.showNotification(error.message, 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  /**
   * Вывод средств
   */
  async withdraw(poolType) {
    try {
      if (!web3Manager.connected) {
        Utils.showNotification(CONFIG.ERRORS.WALLET_NOT_CONNECTED, 'error');
        return;
      }
      
      const confirmed = confirm(
        `Withdraw from ${poolType} pool?\n\n` +
        `All available funds will be sent to your wallet.`
      );
      
      if (!confirmed) return;
      
      Utils.showLoader(true);
      
      let receipt;
      
      switch (poolType) {
        case 'referral':
          receipt = await contracts.withdrawReferral();
          break;
        case 'matrix':
          receipt = await contracts.withdrawMatrix();
          break;
        case 'leader':
          receipt = await contracts.claimRankBonus();
          break;
        case 'investment':
          receipt = await contracts.claimWeeklyReward();
          break;
        default:
          throw new Error('Unknown pool type');
      }
      
      console.log('✅ Withdrawal successful:', receipt.transactionHash);
      
      Utils.showNotification(CONFIG.SUCCESS.WITHDRAWAL_SUCCESS, 'success');
      
      // Обновить баланс
      await this.loadUserData();
      await this.loadDashboard();
      
    } catch (error) {
      console.error('❌ Withdrawal failed:', error);
      Utils.showNotification(error.message, 'error');
    } finally {
      Utils.showLoader(false);
    }
  }

  /**
   * Копирование реферальной ссылки
   */
  async copyReferralLink() {
    const refLinkEl = document.getElementById('refLink');
    if (!refLinkEl) return;
    
    try {
      await navigator.clipboard.writeText(refLinkEl.value);
      Utils.showNotification('Referral link copied!', 'success');
    } catch (error) {
      // Fallback
      refLinkEl.select();
      document.execCommand('copy');
      Utils.showNotification('Referral link copied!', 'success');
    }
  }

  /**
   * Генерация QR кода
   */
  generateQRCode() {
    const refLinkEl = document.getElementById('refLink');
    if (!refLinkEl || !refLinkEl.value) {
      Utils.showNotification('No referral link available', 'error');
      return;
    }
    
    // Создать модальное окно для QR
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h3>Your Referral QR Code</h3>
        <div id="qrcode-container"></div>
        <p>Share this QR code to invite partners</p>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Генерировать QR
    const qrContainer = modal.querySelector('#qrcode-container');
    new QRCode(qrContainer, {
      text: refLinkEl.value,
      width: CONFIG.QR_CONFIG.size,
      height: CONFIG.QR_CONFIG.size,
      colorDark: CONFIG.QR_CONFIG.colorDark,
      colorLight: CONFIG.QR_CONFIG.colorLight,
      correctLevel: QRCode.CorrectLevel.H
    });
    
    // Показать модал
    // 🔥 ИСПРАВЛЕНО: Используем адаптивное отображение
    modal.style.display = 'block';
    
    // Адаптируем модалку под размер экрана
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent && window.innerWidth < 768) {
      modalContent.style.width = '95%';
      modalContent.style.maxWidth = '95%';
    }
    
    // Закрытие
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => {
      modal.style.display = 'none';
      modal.remove();
    };
    
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        modal.remove();
      }
    };
  }

  /**
   * Переключение страниц
   */
  showPage(pageName) {
    console.log('📄 Showing page:', pageName);
    
    // Скрыть все страницы
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => page.style.display = 'none');
    
    // Показать выбранную
    const targetPage = document.getElementById(pageName);
    if (targetPage) {
      targetPage.style.display = 'block';
      this.currentPage = pageName;
      
      // Загрузить данные для страницы
      this.loadPageData(pageName);
    }
    
    // Обновить навигацию
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.page === pageName) {
        btn.classList.add('active');
      }
    });
  }

  /**
   * Загрузка данных для страницы
   */
  async loadPageData(pageName) {
    if (!web3Manager.connected) return;
    
    try {
      switch (pageName) {
        case 'dashboard':
          await this.loadDashboard();
          break;
        case 'partners':
          await this.loadPartners();
          break;
        case 'matrix':
          await this.loadMatrix();
          break;
        case 'tokens':
          await this.loadTokens();
          break;
        case 'projects':
          await this.loadProjects();
          break;
      }
    } catch (error) {
      console.error('Failed to load page data:', error);
    }
  }

  /**
   * Загрузка Dashboard
   */
  async loadDashboard() {
    console.log('📊 Loading dashboard...');
    
    try {
      await this.loadUserData();
      await this.loadQuarterlyInfo();
      await this.loadLevelManagement();
      await this.loadBalances();
      await this.loadEarnings();
      await this.loadTransactionHistory();
      
      console.log('✅ Dashboard loaded');
    } catch (error) {
      console.error('❌ Dashboard load failed:', error);
    }
  }

  /**
   * Загрузка квартальной информации
   */
  async loadQuarterlyInfo() {
    try {
      const info = await contracts.getUserQuarterlyInfo(web3Manager.address);
      
      // Обновить UI
      const quarterEl = document.getElementById('currentQuarter');
      if (quarterEl) {
        quarterEl.textContent = info.currentQuarter || 1;
      }
      
      const lastPaymentEl = document.getElementById('lastPayment');
      if (lastPaymentEl) {
        lastPaymentEl.textContent = info.lastPayment > 0 
          ? Utils.formatDate(info.lastPayment) 
          : '-';
      }
      
      const nextPaymentEl = document.getElementById('nextPayment');
      if (nextPaymentEl) {
        nextPaymentEl.textContent = info.nextPayment > 0 
          ? Utils.formatDate(info.nextPayment) 
          : '-';
      }
      
      // Дни до оплаты
      const daysRemainingEl = document.getElementById('daysRemaining');
      if (daysRemainingEl && info.nextPayment > 0) {
        const now = Math.floor(Date.now() / 1000);
        const days = Math.floor((info.nextPayment - now) / 86400);
        daysRemainingEl.textContent = days;
        
        // Показать предупреждение если < 10 дней
        const warningEl = document.getElementById('paymentWarning');
        if (warningEl) {
          warningEl.style.display = days <= 10 ? 'flex' : 'none';
        }
      }
      
    } catch (error) {
      console.error('loadQuarterlyInfo error:', error);
    }
  }

  /**
   * Загрузка управления уровнями
   */
  async loadLevelManagement() {
    try {
      const container = document.getElementById('individualLevels');
      if (!container) return;
      
      container.innerHTML = '';
      
      for (let level = 1; level <= 12; level++) {
        const levelInfo = await contracts.getUserLevel(web3Manager.address, level);
        const price = CONFIG.LEVEL_PRICES[level - 1];
        
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        btn.dataset.level = level;
        
        if (levelInfo.isActive) {
          btn.classList.add('active');
          btn.disabled = true;
          btn.innerHTML = `
            <span class="level-number">Level ${level}</span>
            <span class="level-price">${price} BNB</span>
            <span class="level-status">✓ Active</span>
          `;
        } else {
          const canBuy = await contracts.canBuyLevel(web3Manager.address, level);
          
          if (canBuy) {
            btn.innerHTML = `
              <span class="level-number">Level ${level}</span>
              <span class="level-price">${price} BNB</span>
              <span class="level-status">Buy</span>
            `;
            btn.onclick = () => this.activateLevel(level);
          } else {
            btn.classList.add('locked');
            btn.disabled = true;
            btn.innerHTML = `
              <span class="level-number">Level ${level}</span>
              <span class="level-price">${price} BNB</span>
              <span class="level-status">🔒 Locked</span>
            `;
          }
        }
        
        container.appendChild(btn);
      }
      
    } catch (error) {
      console.error('loadLevelManagement error:', error);
    }
  }

  /**
   * Загрузка балансов
   */
  async loadBalances() {
    try {
      const balances = await contracts.getUserBalances(web3Manager.address);
      
      // Referral
      const refBalEl = document.getElementById('marketingBalance');
      if (refBalEl) {
        refBalEl.textContent = `${parseFloat(balances.referral).toFixed(4)} BNB`;
      }
      
      // Matrix
      const matrixBalEl = document.getElementById('leaderBalance');
      if (matrixBalEl) {
        matrixBalEl.textContent = `${parseFloat(balances.matrix).toFixed(4)} BNB`;
      }
      
      // Investment
      const investBalEl = document.getElementById('investmentBalance');
      if (investBalEl) {
        investBalEl.textContent = `${parseFloat(balances.investment).toFixed(4)} BNB`;
      }
      
    } catch (error) {
      console.error('loadBalances error:', error);
    }
  }

  /**
   * Загрузка доходов
   */
  async loadEarnings() {
    try {
      const stats = await contracts.getUserFullStats(web3Manager.address);
      
      const totalEl = document.getElementById('totalIncome');
      if (totalEl) {
        totalEl.textContent = `${parseFloat(stats.totalEarned).toFixed(4)} BNB`;
      }
      
      // Детальная разбивка
      const earningsContainer = document.getElementById('earningsRank');
      if (earningsContainer) {
        earningsContainer.innerHTML = `
          <div class="earning-item">
            <span>Referral Earnings</span>
            <span>${parseFloat(stats.referralEarnings).toFixed(4)} BNB</span>
          </div>
          <div class="earning-item">
            <span>Matrix Earnings</span>
            <span>${parseFloat(stats.matrixEarnings).toFixed(4)} BNB</span>
          </div>
          <div class="earning-item">
            <span>Leader Pool</span>
            <span>${parseFloat(stats.leaderPoolEarnings).toFixed(4)} BNB</span>
          </div>
          <div class="earning-item">
            <span>Quarterly</span>
            <span>${parseFloat(stats.quarterlyEarnings).toFixed(4)} BNB</span>
          </div>
        `;
      }
      
    } catch (error) {
      console.error('loadEarnings error:', error);
    }
  }

  /**
   * Загрузка истории транзакций
   */
  async loadTransactionHistory(filterType = 'all') {
    try {
      const tbody = document.getElementById('historyTable');
      if (!tbody) return;
      
      tbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
      
      const transactions = await contracts.getTransactionHistory(
        web3Manager.address,
        filterType,
        50
      );
      
      if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No transactions found</td></tr>';
        return;
      }
      
      tbody.innerHTML = '';
      
      transactions.forEach((tx, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${tx.level || '-'}</td>
          <td>${parseFloat(tx.amount).toFixed(4)} BNB</td>
          <td>${Utils.formatDate(tx.timestamp)}</td>
          <td>${tx.from || '-'}</td>
          <td><span class="badge">${tx.type}</span></td>
        `;
        tbody.appendChild(row);
      });
      
    } catch (error) {
      console.error('loadTransactionHistory error:', error);
      const tbody = document.getElementById('historyTable');
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6">Error loading transactions</td></tr>';
      }
    }
  }

  /**
   * Загрузка партнёров
   */
  async loadPartners() {
    console.log('👥 Loading partners...');
    // TODO: Implement in next iteration
  }

  /**
   * Загрузка матрицы
   */
  async loadMatrix() {
    console.log('🔷 Loading matrix...');
    // TODO: Implement in next iteration
  }

  /**
   * Загрузка токенов
   */
  async loadTokens() {
    console.log('💎 Loading tokens...');
    // TODO: Implement in next iteration
  }

  /**
   * Загрузка проектов
   */
  async loadProjects() {
    console.log('🚀 Loading projects...');
    // TODO: Implement in next iteration
  }

  /**
   * Запуск автообновления
   */
  startAutoUpdate() {
    if (this.autoUpdateInterval) {
      clearInterval(this.autoUpdateInterval);
    }
    
    this.autoUpdateInterval = setInterval(() => {
      if (web3Manager.connected && this.currentPage === 'dashboard') {
        this.loadDashboard();
      }
    }, CONFIG.UI.autoUpdateInterval);
    
    console.log('🔄 Auto-update started');
  }

  /**
   * Остановка автообновления
   */
  stopAutoUpdate() {
    if (this.autoUpdateInterval) {
      clearInterval(this.autoUpdateInterval);
      this.autoUpdateInterval = null;
      console.log('⏸️ Auto-update stopped');
    }
  }
}

// Создать глобальный экземпляр
const app = new Application();

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', async () => {
  await app.init();
});

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Application;
}
