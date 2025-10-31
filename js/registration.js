/* jshint esversion: 11 */
/* global web3Manager, contracts, Utils, CONFIG */

class RegistrationManager {
  constructor() {
    this.sponsorId = null;
    this.sponsorAddress = null;
    this.sponsorValid = false;
    this.modalShown = false;
  }

  // 🔥 Инициализация - проверка ref параметра
  async init() {
    console.log('🎯 Initializing RegistrationManager...');
    
    // Проверяем URL параметр
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    
    if (refParam) {
      console.log('🔗 Referral link detected:', refParam);
      
      // Сохраняем спонсора
      this.sponsorId = refParam;
      localStorage.setItem('sponsorId', refParam);
      
      // Проверяем валидность спонсора
      try {
        const sponsorAddress = await this.getAddressFromId(refParam);
        const sponsorInfo = await contracts.getUserInfo(sponsorAddress);
        
        if (sponsorInfo.isRegistered) {
          this.sponsorValid = true;
          this.sponsorAddress = sponsorAddress;
          console.log('✅ Sponsor validated:', this.formatId(refParam), sponsorAddress);
        } else {
          console.warn('⚠️ Sponsor not registered');
          this.sponsorValid = false;
        }
      } catch (error) {
        console.error('❌ Error validating sponsor:', error);
        this.sponsorValid = false;
      }
      
    } else {
      console.log('ℹ️ No referral link found');
      
      // Проверяем localStorage (может сохранили раньше)
      const savedSponsor = localStorage.getItem('sponsorId');
      if (savedSponsor) {
        console.log('📦 Found saved sponsor:', savedSponsor);
        this.sponsorId = savedSponsor;
        
        // Проверяем его валидность
        try {
          const sponsorAddress = await this.getAddressFromId(savedSponsor);
          const sponsorInfo = await contracts.getUserInfo(sponsorAddress);
          
          if (sponsorInfo.isRegistered) {
            this.sponsorValid = true;
            this.sponsorAddress = sponsorAddress;
          }
        } catch (error) {
          console.warn('⚠️ Saved sponsor invalid');
        }
      }
    }
  }

  // 🔄 Конвертация ID в адрес
  async getAddressFromId(input) {
    try {
      let userId;
      
      // Парсим ввод
      if (input.toUpperCase().startsWith('GW')) {
        // GW0000123 → 123
        userId = parseInt(input.replace(/GW/i, ''));
      } else if (/^\d+$/.test(input)) {
        // "123" → 123
        userId = parseInt(input);
      } else if (input.startsWith('0x')) {
        // Это уже адрес
        if (Utils.validateAddress(input)) {
          return input;
        } else {
          throw new Error('Invalid address format');
        }
      } else {
        throw new Error('Invalid ID format');
      }
      
      console.log('🔍 Getting address for user ID:', userId);
      
      // Получаем адрес из контракта
      const address = await contracts.getUserAddress(userId);
      
      // Проверяем что не нулевой адрес
      if (!address || address === '0x0000000000000000000000000000000000000000') {
        throw new Error('User ID not found');
      }
      
      return address;
      
    } catch (error) {
      console.error('❌ Error converting ID to address:', error);
      throw error;
    }
  }

  // 🎨 Форматирование ID для отображения
  formatId(input) {
    try {
      if (input.toUpperCase().startsWith('GW')) {
        return input.toUpperCase();
      } else if (/^\d+$/.test(input)) {
        const id = parseInt(input);
        return `GW${String(id).padStart(7, '0')}`;
      } else if (input.startsWith('0x')) {
        return Utils.formatAddress(input);
      }
      return input;
    } catch (error) {
      return input;
    }
  }

  // 📋 Показ модального окна регистрации
  async showRegistrationModal() {
    // Предотвращаем повторное показ
    if (this.modalShown) {
      console.log('⚠️ Registration modal already shown');
      return;
    }
    
    // Проверяем что пользователь подключён
    if (!web3Manager.connected || !web3Manager.address) {
      console.log('⚠️ Wallet not connected, skipping registration modal');
      return;
    }
    
    // Проверяем что пользователь не зарегистрирован
    try {
      const userInfo = await contracts.getUserInfo(web3Manager.address);
      if (userInfo.isRegistered) {
        console.log('✅ User already registered');
        return;
      }
    } catch (error) {
      console.error('❌ Error checking registration status:', error);
      return;
    }
    
    this.modalShown = true;
    
    // Создаём модальное окно
    const modal = document.createElement('div');
    modal.className = 'registration-modal';
    modal.id = 'registrationModal';
    
    if (this.sponsorId && this.sponsorValid) {
      // ✅ ЕСТЬ ВАЛИДНЫЙ СПОНСОР - автозаполнение
      modal.innerHTML = this.getAutofilledModalHTML();
    } else {
      // ❌ НЕТ СПОНСОРА - ручной ввод
      modal.innerHTML = this.getManualModalHTML();
    }
    
    document.body.appendChild(modal);
    
    // Показываем с анимацией
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
    
    this.setupModalEvents(modal);
  }

  // 🎨 HTML для автозаполненной модалки
  getAutofilledModalHTML() {
    const formattedId = this.formatId(this.sponsorId);
    
    return `
      <div class="registration-modal-overlay">
        <div class="registration-modal-content">
          <div class="registration-icon">🎉</div>
          
          <div class="registration-header">
            <h2 data-translate="registration.welcome">Добро пожаловать в GlobalWay!</h2>
          </div>
          
          <div class="registration-body">
            <p class="sponsor-label" data-translate="registration.invitedBy">Вас пригласил:</p>
            
            <div class="sponsor-display autofilled">
              <input 
                type="text" 
                id="sponsorInput"
                value="${formattedId}"
                readonly
                class="sponsor-input"
              />
              <span class="status-icon validated">✅</span>
            </div>
            
            <p class="info-text" data-translate="registration.confirmText">
              Нажмите "Продолжить" чтобы зарегистрироваться в системе
            </p>
          </div>
          
          <div class="registration-footer">
            <button class="btn-primary btn-register" id="confirmBtn">
              <span class="btn-icon">✅</span>
              <span data-translate="registration.continue">Продолжить</span>
            </button>
            <button class="btn-secondary" id="cancelBtn">
              <span class="btn-icon">❌</span>
              <span data-translate="common.cancel">Отмена</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // 🎨 HTML для ручного ввода
  getManualModalHTML() {
    return `
      <div class="registration-modal-overlay">
        <div class="registration-modal-content">
          <div class="registration-icon">📝</div>
          
          <div class="registration-header">
            <h2 data-translate="registration.title">Регистрация в GlobalWay</h2>
          </div>
          
          <div class="registration-body">
            <p class="sponsor-label" data-translate="registration.enterSponsor">Введите ID вашего спонсора:</p>
            
            <div class="sponsor-display manual">
              <input 
                type="text" 
                id="sponsorInput"
                placeholder="1, 123, GW0001234"
                class="sponsor-input"
                autocomplete="off"
              />
              <span class="status-icon" id="statusIcon"></span>
            </div>
            
            <p class="info-text small" data-translate="registration.idFormats">
              Вы можете ввести ID в любом формате: 1, 123 или GW0001234
            </p>
          </div>
          
          <div class="registration-footer">
            <button class="btn-primary btn-register" id="confirmBtn" disabled>
              <span class="btn-icon">🔒</span>
              <span data-translate="registration.continue">Продолжить</span>
            </button>
            <button class="btn-secondary" id="cancelBtn">
              <span class="btn-icon">❌</span>
              <span data-translate="common.cancel">Отмена</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // 🎯 Настройка событий модального окна
  setupModalEvents(modal) {
    const input = modal.querySelector('#sponsorInput');
    const confirmBtn = modal.querySelector('#confirmBtn');
    const cancelBtn = modal.querySelector('#cancelBtn');
    const statusIcon = modal.querySelector('#statusIcon');
    
    // Если автозаполнение - сразу активна кнопка
    if (this.sponsorId && this.sponsorValid) {
      confirmBtn.disabled = false;
      confirmBtn.querySelector('.btn-icon').textContent = '✅';
    } else {
      // Если ручной ввод - валидация при вводе
      let validationTimeout;
      
      input.addEventListener('input', async (e) => {
        const value = e.target.value.trim();
        
        // Очищаем предыдущий таймер
        clearTimeout(validationTimeout);
        
        if (!value) {
          confirmBtn.disabled = true;
          confirmBtn.querySelector('.btn-icon').textContent = '🔒';
          if (statusIcon) statusIcon.textContent = '';
          return;
        }
        
        // Показываем проверку
        if (statusIcon) statusIcon.textContent = '⏳';
        confirmBtn.disabled = true;
        confirmBtn.querySelector('.btn-icon').textContent = '⏳';
        
        // Валидация с задержкой (debounce)
        validationTimeout = setTimeout(async () => {
          try {
            // Получаем адрес
            const sponsorAddress = await this.getAddressFromId(value);
            
            // Проверяем регистрацию
            const sponsorInfo = await contracts.getUserInfo(sponsorAddress);
            
            if (sponsorInfo.isRegistered) {
              // ✅ Валидный спонсор
              if (statusIcon) statusIcon.textContent = '✅';
              confirmBtn.disabled = false;
              confirmBtn.querySelector('.btn-icon').textContent = '✅';
              this.sponsorAddress = sponsorAddress;
              this.sponsorId = value;
              console.log('✅ Sponsor valid:', this.formatId(value));
            } else {
              // ❌ Не зарегистрирован
              if (statusIcon) statusIcon.textContent = '❌';
              confirmBtn.disabled = true;
              confirmBtn.querySelector('.btn-icon').textContent = '❌';
              Utils.showNotification('Этот ID не зарегистрирован в системе', 'error');
            }
          } catch (error) {
            // ❌ Ошибка (ID не найден)
            console.error('❌ Validation error:', error);
            if (statusIcon) statusIcon.textContent = '❌';
            confirmBtn.disabled = true;
            confirmBtn.querySelector('.btn-icon').textContent = '❌';
            Utils.showNotification('ID не найден', 'error');
          }
        }, 500); // Задержка 500ms
      });
    }
    
    // Подтверждение регистрации
    confirmBtn.addEventListener('click', async () => {
      await this.register();
    });
    
    // Отмена
    cancelBtn.addEventListener('click', () => {
      this.closeModal(modal);
    });
    
    // Закрытие по клику на overlay
    modal.querySelector('.registration-modal-overlay').addEventListener('click', (e) => {
      if (e.target.classList.contains('registration-modal-overlay')) {
        this.closeModal(modal);
      }
    });
  }

  // 🚀 Регистрация пользователя
  async register() {
    if (!this.sponsorAddress) {
      Utils.showNotification('Ошибка: адрес спонсора не определён', 'error');
      return;
    }
    
    try {
      Utils.showLoader(true);
      Utils.showNotification('Открываем кошелёк для подтверждения...', 'info');
      
      console.log('📝 Registering with sponsor:', this.sponsorAddress);
      console.log('📱 User address:', web3Manager.address);
      
      // Получаем стоимость регистрации из контракта
      const regFee = await contracts.contracts.globalway.REGISTRATION_FEE();
      
      // Отправляем транзакцию регистрации с оплатой
      const tx = await contracts.contracts.globalway.register(
        this.sponsorAddress,
        { value: regFee }
      );
      
      console.log('✅ Transaction sent:', tx.hash);
      Utils.showNotification('Транзакция отправлена! Ожидание подтверждения...', 'info');
      
      // Ждём подтверждения
      await tx.wait();
      
      console.log('🎉 Registration successful!');
      Utils.showNotification('🎉 Регистрация успешна! Добро пожаловать в GlobalWay!', 'success');
      
      // Закрываем модальное окно
      const modal = document.getElementById('registrationModal');
      if (modal) {
        this.closeModal(modal);
      }
      
      // Обновляем данные пользователя
      setTimeout(async () => {
        try {
          await uiManager.loadUserData();
          await uiManager.updateUI();
          console.log('✅ User data refreshed after registration');
        } catch (error) {
          console.error('⚠️ Error refreshing user data:', error);
        }
      }, 2000);
      
    } catch (error) {
      console.error('❌ Registration error:', error);
      
      let errorMsg = 'Ошибка регистрации';
      
      if (error.message.includes('user rejected') || error.message.includes('User denied')) {
        errorMsg = 'Регистрация отменена в кошельке';
      } else if (error.message.includes('Already registered')) {
        errorMsg = 'Вы уже зарегистрированы';
      } else if (error.message.includes('Sponsor not registered')) {
        errorMsg = 'Спонсор не зарегистрирован';
      } else if (error.message.includes('Invalid sponsor')) {
        errorMsg = 'Неверный адрес спонсора';
      } else {
        errorMsg = `Ошибка: ${error.message.substring(0, 80)}`;
      }
      
      Utils.showNotification(errorMsg, 'error');
      
    } finally {
      Utils.showLoader(false);
    }
  }

  // 🚪 Закрытие модального окна
  closeModal(modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
      this.modalShown = false;
    }, 300);
  }


  // 🚀 Активация одного уровня
  async activateLevel(level) {
    if (!web3Manager.connected) {
      Utils.showNotification('Подключите кошелек', 'error');
      return false;
    }

    try {
      Utils.showLoader(true);
      Utils.showNotification('Открываем кошелёк для подтверждения...', 'info');

      console.log(`📝 Activating level ${level}...`);

      // Получаем цену уровня
      const price = await contracts.contracts.globalway.levelPrices(level);
      
      console.log(`💰 Level ${level} price:`, ethers.utils.formatEther(price), 'BNB');

      // Отправляем транзакцию
      const tx = await contracts.contracts.globalway.activateLevel(level, {
        value: price
      });

      console.log('✅ Transaction sent:', tx.hash);
      Utils.showNotification('Транзакция отправлена! Ожидание подтверждения...', 'info');

      // Ждём подтверждения
      await tx.wait();

      console.log(`🎉 Level ${level} activated!`);
      Utils.showNotification(`🎉 Уровень ${level} активирован!`, 'success');

      // Обновляем UI
      setTimeout(async () => {
        try {
          if (typeof uiManager !== 'undefined') {
            await uiManager.loadUserData();
            await uiManager.updateUI();
          }
        } catch (error) {
          console.error('⚠️ Error refreshing UI:', error);
        }
      }, 2000);

      return true;

    } catch (error) {
      console.error('❌ Activation error:', error);

      let errorMsg = 'Ошибка активации уровня';

      if (error.message.includes('user rejected') || error.message.includes('User denied')) {
        errorMsg = 'Транзакция отменена в кошельке';
      } else if (error.message.includes('Not registered')) {
        errorMsg = 'Сначала зарегистрируйтесь';
      } else if (error.message.includes('Level already active')) {
        errorMsg = 'Уровень уже активен';
      } else if (error.message.includes('Previous level not active')) {
        errorMsg = 'Активируйте предыдущий уровень';
      } else if (error.message.includes('Incorrect payment')) {
        errorMsg = 'Неверная сумма оплаты';
      } else {
        errorMsg = `Ошибка: ${error.message.substring(0, 80)}`;
      }

      Utils.showNotification(errorMsg, 'error');
      return false;

    } finally {
      Utils.showLoader(false);
    }
  }

  // 🚀 Массовая активация уровней (до maxLevel)
  async activateLevelBulk(maxLevel) {
    if (!web3Manager.connected) {
      Utils.showNotification('Подключите кошелек', 'error');
      return false;
    }

    try {
      Utils.showLoader(true);
      Utils.showNotification('Расчёт стоимости активации...', 'info');

      console.log(`📝 Bulk activating levels up to ${maxLevel}...`);

      // Получаем информацию о пользователе
      const userInfo = await contracts.getUserInfo(web3Manager.address);
      const currentMaxLevel = userInfo.maxLevel;

      console.log(`Current max level: ${currentMaxLevel}`);

      if (currentMaxLevel >= maxLevel) {
        Utils.showNotification('Все уровни уже активированы', 'warning');
        return false;
      }

      // Рассчитываем стоимость через Stats
      const costData = await contracts.calculateUpgradeCost(web3Manager.address, maxLevel);
      
      if (!costData || !costData.missingLevels || costData.missingLevels.length === 0) {
        Utils.showNotification('Нет уровней для активации', 'warning');
        return false;
      }

      const totalCost = costData.totalCost;
      const missingLevels = costData.missingLevels;

      console.log(`💰 Total cost: ${totalCost} BNB`);
      console.log(`📊 Missing levels:`, missingLevels);

      Utils.showNotification(
        `Активация уровней ${missingLevels.join(', ')}. Стоимость: ${totalCost} BNB`,
        'info'
      );

      // Отправляем транзакцию bulk активации
      const tx = await contracts.contracts.globalway.activateLevelBulk(maxLevel, {
        value: ethers.utils.parseEther(totalCost)
      });

      console.log('✅ Transaction sent:', tx.hash);
      Utils.showNotification('Транзакция отправлена! Ожидание подтверждения...', 'info');

      // Ждём подтверждения
      await tx.wait();

      console.log(`🎉 Levels up to ${maxLevel} activated!`);
      Utils.showNotification(`🎉 Уровни до ${maxLevel} активированы!`, 'success');

      // Обновляем UI
      setTimeout(async () => {
        try {
          if (typeof uiManager !== 'undefined') {
            await uiManager.loadUserData();
            await uiManager.updateUI();
          }
        } catch (error) {
          console.error('⚠️ Error refreshing UI:', error);
        }
      }, 2000);

      return true;

    } catch (error) {
      console.error('❌ Bulk activation error:', error);

      let errorMsg = 'Ошибка массовой активации';

      if (error.message.includes('user rejected') || error.message.includes('User denied')) {
        errorMsg = 'Транзакция отменена в кошельке';
      } else if (error.message.includes('Not registered')) {
        errorMsg = 'Сначала зарегистрируйтесь';
      } else if (error.message.includes('Invalid max level')) {
        errorMsg = 'Неверный уровень';
      } else if (error.message.includes('Incorrect payment')) {
        errorMsg = 'Неверная сумма оплаты';
      } else {
        errorMsg = `Ошибка: ${error.message.substring(0, 80)}`;
      }

      Utils.showNotification(errorMsg, 'error');
      return false;

    } finally {
      Utils.showLoader(false);
    }
  }

  // 📊 Получить информацию о стоимости активации
  async getActivationCost(level) {
    try {
      const price = await contracts.contracts.globalway.levelPrices(level);
      return ethers.utils.formatEther(price);
    } catch (error) {
      console.error('Error getting activation cost:', error);
      // Возвращаем из CONFIG если контракт недоступен
      return CONFIG.LEVEL_PRICES[level - 1] || '0';
    }
  }

  // 📊 Получить стоимость массовой активации
  async getBulkActivationCost(maxLevel) {
    try {
      const userInfo = await contracts.getUserInfo(web3Manager.address);
      const currentMaxLevel = userInfo.maxLevel;

      if (currentMaxLevel >= maxLevel) {
        return { cost: '0', levels: [] };
      }

      const costData = await contracts.calculateUpgradeCost(web3Manager.address, maxLevel);
      
      return {
        cost: costData.totalCost,
        levels: costData.missingLevels
      };
    } catch (error) {
      console.error('Error calculating bulk cost:', error);
      return { cost: '0', levels: [] };
    }
  }

  // 🔧 Сброс состояния (для тестирования)
  reset() {
    this.sponsorId = null;
    this.sponsorAddress = null;
    this.sponsorValid = false;
    this.modalShown = false;
    localStorage.removeItem('sponsorId');
  }
}

// Создаём глобальный экземпляр
const registrationManager = new RegistrationManager();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RegistrationManager;
}
