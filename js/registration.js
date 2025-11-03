/* jshint esversion: 8 */
/* global CONFIG, web3Manager, contracts, Utils, ethers */

/**
 * RegistrationManager - User Registration Module
 * Version: 2.0 - Production Ready
 * Date: 03.11.2025
 */

class RegistrationManager {
  constructor() {
    this.isProcessing = false;
    this.referralId = null;
    this.sponsorAddress = null;
  }

  /**
   * Инициализация модуля регистрации
   */
  init() {
    console.log('📝 Initializing Registration Manager...');
    
    // Проверка реферальной ссылки в URL
    this.checkReferralLink();
    
    // Настройка обработчиков
    this.setupEventListeners();
    
    console.log('✅ Registration Manager initialized');
  }

  /**
   * Настройка обработчиков событий
   */
  setupEventListeners() {
    // Кнопка регистрации
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
      registerBtn.addEventListener('click', () => this.register());
    }
    
    // Поле ввода Referral ID
    const refInput = document.getElementById('refInput');
    if (refInput) {
      // Валидация при вводе
      refInput.addEventListener('input', Utils.debounce(() => {
        this.validateReferralId(refInput.value);
      }, 500));
      
      // Валидация при потере фокуса
      refInput.addEventListener('blur', () => {
        this.validateReferralId(refInput.value);
      });
    }
    
    // Кнопка "Activate Level 1" из модального окна
    const activateBtn = document.getElementById('activateBtn');
    if (activateBtn) {
      activateBtn.addEventListener('click', () => this.register());
    }
  }

  /**
   * Проверка реферальной ссылки в URL
   */
  checkReferralLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const refId = urlParams.get('ref');
    
    if (refId) {
      console.log('🔗 Referral ID detected in URL:', refId);
      
      // Сохранить в localStorage
      localStorage.setItem('referralId', refId);
      this.referralId = refId;
      
      // Заполнить поле
      const refInput = document.getElementById('refInput');
      if (refInput) {
        refInput.value = refId;
        refInput.readOnly = true; // Сделать только для чтения
      }
      
      // Прокрутка к форме регистрации
      setTimeout(() => {
        Utils.scrollToElement('registration', 80);
      }, 500);
      
      // Валидация
      this.validateReferralId(refId);
    } else {
      // Проверка в localStorage
      const savedRefId = localStorage.getItem('referralId');
      if (savedRefId) {
        console.log('🔗 Referral ID from localStorage:', savedRefId);
        this.referralId = savedRefId;
        
        const refInput = document.getElementById('refInput');
        if (refInput && !refInput.value) {
          refInput.value = savedRefId;
        }
      }
    }
  }

  /**
   * Валидация Referral ID
   */
  async validateReferralId(refId) {
    const refInput = document.getElementById('refInput');
    const feedbackEl = document.getElementById('refInputFeedback');
    
    if (!refId || refId.trim() === '') {
      this.updateValidationFeedback(refInput, feedbackEl, null, 'Please enter Referral ID');
      return false;
    }
    
    // Проверка формата
    if (!CONFIG.VALIDATION.USER_ID_REGEX.test(refId)) {
      this.updateValidationFeedback(refInput, feedbackEl, false, 'Invalid format. Must be GWXXXXXXX');
      return false;
    }
    
    // Проверка подключения кошелька
    if (!web3Manager.connected) {
      this.updateValidationFeedback(refInput, feedbackEl, null, 'Connect wallet to verify');
      return false;
    }
    
    try {
      // Проверка существования спонсора
      const sponsorAddress = await contracts.getAddressByUserId(refId);
      
      if (sponsorAddress === ethers.constants.AddressZero) {
        this.updateValidationFeedback(refInput, feedbackEl, false, 'Referral ID not found');
        this.sponsorAddress = null;
        return false;
      }
      
      // Проверка что спонсор зарегистрирован
      const sponsorInfo = await contracts.getUserInfo(sponsorAddress);
      
      if (!sponsorInfo.id || sponsorInfo.registrationTime === 0) {
        this.updateValidationFeedback(refInput, feedbackEl, false, 'Sponsor is not registered');
        this.sponsorAddress = null;
        return false;
      }
      
      // Проверка что спонсор не заблокирован
      if (sponsorInfo.isBlocked) {
        this.updateValidationFeedback(refInput, feedbackEl, false, 'Sponsor is blocked');
        this.sponsorAddress = null;
        return false;
      }
      
      // Всё ОК
      this.sponsorAddress = sponsorAddress;
      this.updateValidationFeedback(refInput, feedbackEl, true, `✓ Valid sponsor: ${sponsorInfo.id}`);
      return true;
      
    } catch (error) {
      console.error('Referral validation error:', error);
      this.updateValidationFeedback(refInput, feedbackEl, false, 'Validation error');
      this.sponsorAddress = null;
      return false;
    }
  }

  /**
   * Обновление UI валидации
   */
  updateValidationFeedback(inputEl, feedbackEl, isValid, message) {
    if (inputEl) {
      inputEl.classList.remove('is-valid', 'is-invalid');
      
      if (isValid === true) {
        inputEl.classList.add('is-valid');
      } else if (isValid === false) {
        inputEl.classList.add('is-invalid');
      }
    }
    
    if (feedbackEl) {
      feedbackEl.textContent = message;
      feedbackEl.className = 'form-feedback';
      
      if (isValid === true) {
        feedbackEl.classList.add('valid-feedback');
      } else if (isValid === false) {
        feedbackEl.classList.add('invalid-feedback');
      } else {
        feedbackEl.classList.add('info-feedback');
      }
    }
  }

  /**
   * Главная функция регистрации
   */
  async register() {
    if (this.isProcessing) {
      console.warn('⚠️ Registration already in progress');
      return;
    }
    
    console.log('📝 Starting registration process...');
    
    try {
      // Шаг 1: Проверка подключения кошелька
      if (!web3Manager.connected) {
        Utils.showNotification(CONFIG.ERRORS.WALLET_NOT_CONNECTED, 'error');
        
        // Попытка подключить
        const connect = confirm('Wallet not connected. Connect now?');
        if (connect) {
          await web3Manager.connect();
        }
        return;
      }
      
      // Шаг 2: Проверка что пользователь ещё не зарегистрирован
      const isRegistered = await contracts.isUserRegistered(web3Manager.address);
      if (isRegistered) {
        Utils.showNotification('You are already registered!', 'warning');
        
        // Переход на dashboard
        if (window.app && typeof window.app.showPage === 'function') {
          window.app.showPage('dashboard');
        }
        return;
      }
      
      // Шаг 3: Получение и валидация Referral ID
      const refInput = document.getElementById('refInput');
      if (!refInput || !refInput.value) {
        Utils.showNotification('Please enter Referral ID', 'error');
        if (refInput) refInput.focus();
        return;
      }
      
      const refId = refInput.value.trim();
      
      // Валидация
      const isValid = await this.validateReferralId(refId);
      if (!isValid || !this.sponsorAddress) {
        Utils.showNotification('Invalid Referral ID', 'error');
        return;
      }
      
      // Шаг 4: Проверка баланса
      const balance = await web3Manager.getBalance();
      const requiredAmount = parseFloat(CONFIG.LEVEL_PRICES[0]);
      
      if (parseFloat(balance) < requiredAmount) {
        Utils.showNotification(
          `Insufficient balance. You need ${requiredAmount} BNB, but have ${parseFloat(balance).toFixed(4)} BNB`,
          'error'
        );
        return;
      }
      
      // Шаг 5: Подтверждение от пользователя
      const confirmed = await this.showConfirmationModal(refId, requiredAmount);
      if (!confirmed) {
        console.log('Registration cancelled by user');
        return;
      }
      
      // Шаг 6: Выполнение регистрации
      this.isProcessing = true;
      Utils.showLoader(true);
      
      console.log('📤 Sending registration transaction...');
      console.log('  Sponsor:', this.sponsorAddress);
      console.log('  Payment:', requiredAmount, 'BNB');
      
      const receipt = await contracts.register(this.sponsorAddress);
      
      console.log('✅ Registration successful!');
      console.log('  Transaction:', receipt.transactionHash);
      
      // Шаг 7: Успешное завершение
      await this.onRegistrationSuccess(receipt);
      
    } catch (error) {
      console.error('❌ Registration failed:', error);
      this.handleRegistrationError(error);
    } finally {
      this.isProcessing = false;
      Utils.showLoader(false);
    }
  }

  /**
   * Показать модальное окно подтверждения
   */
  async showConfirmationModal(refId, amount) {
    return new Promise((resolve) => {
      // Создать модальное окно
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.id = 'registrationConfirmModal';
      modal.innerHTML = `
        <div class="modal-content">
          <h3>🎉 Confirm Registration</h3>
          <div class="modal-body">
            <p><strong>You are about to register with GlobalWay!</strong></p>
            <div class="info-box">
              <p>📋 <strong>Referral ID:</strong> ${refId}</p>
              <p>💰 <strong>Activation Fee:</strong> ${amount} BNB</p>
              <p>🎁 <strong>You will receive:</strong> ${CONFIG.TOKEN_REWARDS[0]} GWT tokens</p>
            </div>
            <p class="warning-text">⚠️ This transaction cannot be reversed. Make sure the Referral ID is correct!</p>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" id="cancelRegBtn">Cancel</button>
            <button class="btn btn-primary" id="confirmRegBtn">Confirm & Register</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Показать модал
      modal.style.display = 'block';
      
      // Обработчики
      const confirmBtn = modal.querySelector('#confirmRegBtn');
      const cancelBtn = modal.querySelector('#cancelRegBtn');
      
      confirmBtn.onclick = () => {
        modal.remove();
        resolve(true);
      };
      
      cancelBtn.onclick = () => {
        modal.remove();
        resolve(false);
      };
      
      // Закрытие по клику вне
      modal.onclick = (e) => {
        if (e.target === modal) {
          modal.remove();
          resolve(false);
        }
      };
    });
  }

  /**
   * Обработка успешной регистрации
   */
  async onRegistrationSuccess(receipt) {
    // Показать уведомление
    Utils.showNotification(CONFIG.SUCCESS.REGISTRATION_COMPLETE, 'success');
    
    // Показать модальное окно успеха
    this.showSuccessModal(receipt.transactionHash);
    
    // Очистить сохранённый referral ID
    localStorage.removeItem('referralId');
    
    // Перезагрузить данные пользователя
    if (window.app && typeof window.app.loadUserData === 'function') {
      await window.app.loadUserData();
    }
    
    // Переход на dashboard через 3 секунды
    setTimeout(() => {
      if (window.app && typeof window.app.showPage === 'function') {
        window.app.showPage('dashboard');
        
        // Запустить автообновление
        if (typeof window.app.startAutoUpdate === 'function') {
          window.app.startAutoUpdate();
        }
      }
    }, 3000);
  }

  /**
   * Показать модальное окно успеха
   */
  showSuccessModal(txHash) {
    const modal = document.createElement('div');
    modal.className = 'modal success-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="success-icon">✅</div>
        <h2>Welcome to GlobalWay!</h2>
        <p>Your registration was successful!</p>
        <div class="info-box">
          <p>Transaction: <a href="${CONFIG.NETWORK.explorer}/tx/${txHash}" target="_blank" rel="noopener">${Utils.formatAddress(txHash)}</a></p>
          <p>You have received ${CONFIG.TOKEN_REWARDS[0]} GWT tokens!</p>
        </div>
        <p>Redirecting to dashboard...</p>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Автоматическое закрытие через 3 секунды
    setTimeout(() => {
      modal.style.display = 'none';
      modal.remove();
    }, 3000);
  }

  /**
   * Обработка ошибок регистрации
   */
  handleRegistrationError(error) {
    let errorMessage = 'Registration failed';
    
    // Определение типа ошибки
    if (error.code === 4001) {
      errorMessage = 'Transaction rejected by user';
    } else if (error.code === -32603) {
      errorMessage = 'Transaction failed. Please try again.';
    } else if (error.message) {
      if (error.message.includes('insufficient funds')) {
        errorMessage = CONFIG.ERRORS.INSUFFICIENT_BALANCE;
      } else if (error.message.includes('already registered')) {
        errorMessage = 'You are already registered';
      } else if (error.message.includes('invalid sponsor')) {
        errorMessage = CONFIG.ERRORS.INVALID_SPONSOR;
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction rejected';
      } else {
        errorMessage = error.message;
      }
    }
    
    Utils.showNotification(errorMessage, 'error');
    
    // Логирование
    console.error('Registration error details:', {
      code: error.code,
      message: error.message,
      data: error.data
    });
  }

  /**
   * Получить текущий Referral ID
   */
  getReferralId() {
    return this.referralId;
  }

  /**
   * Получить адрес спонсора
   */
  getSponsorAddress() {
    return this.sponsorAddress;
  }

  /**
   * Сброс состояния
   */
  reset() {
    this.isProcessing = false;
    this.referralId = null;
    this.sponsorAddress = null;
    
    const refInput = document.getElementById('refInput');
    if (refInput) {
      refInput.value = '';
      refInput.readOnly = false;
      refInput.classList.remove('is-valid', 'is-invalid');
    }
    
    const feedbackEl = document.getElementById('refInputFeedback');
    if (feedbackEl) {
      feedbackEl.textContent = '';
    }
  }
}

// Создать глобальный экземпляр
const registrationManager = new RegistrationManager();

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  registrationManager.init();
});

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RegistrationManager;
}
