/* jshint esversion: 8 */
/* global web3Manager, contracts, Utils, ethers, showPage, app */

/**
 * Registration System - НОВОЕ
 * Версия: 2.1 - Модальное окно и автоматическая регистрация
 */

// 🔥 НОВАЯ ФУНКЦИЯ: Показать модальное окно регистрации
function showRegistrationModal() {
  let modal = document.getElementById('registrationModal');
  
  // Создать модальное окно если не существует
  if (!modal) {
    createRegistrationModal();
    modal = document.getElementById('registrationModal');
  }
  
  // Получить sponsor ID из URL
  const urlParams = new URLSearchParams(window.location.search);
  const refId = urlParams.get('ref');
  
  if (refId) {
    const sponsorInput = document.getElementById('sponsorInput');
    if (sponsorInput) {
      sponsorInput.value = refId;
    }
  }
  
  modal.style.display = 'flex';
  console.log('📋 Registration modal shown');
}

// 🔥 НОВАЯ ФУНКЦИЯ: Создать HTML модального окна
function createRegistrationModal() {
  const modal = document.createElement('div');
  modal.id = 'registrationModal';
  modal.className = 'modal registration-modal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="event.stopPropagation()"></div>
    <div class="modal-content registration-content">
      <span class="close" onclick="closeRegistrationModal()">&times;</span>
      
      <div class="modal-header">
        <h2 data-translate="registration.title">🌟 Join GlobalWay</h2>
        <p data-translate="registration.subtitle">Register to start earning</p>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label data-translate="registration.sponsorLabel">Sponsor ID:</label>
          <input 
            id="sponsorInput" 
            type="text" 
            placeholder="GW-XXXXXXX"
            data-translate="registration.sponsorPlaceholder"
            required
          >
          <small class="help-text" data-translate="registration.sponsorHelp">
            Enter your sponsor's ID (format: GW-XXXXXXX)
          </small>
        </div>
        
        <div class="registration-info">
          <div class="info-item">
            <span class="icon">💰</span>
            <div>
              <strong data-translate="registration.cost">Registration Cost:</strong>
              <span id="regCost">0.0015 BNB</span>
            </div>
          </div>
          <div class="info-item">
            <span class="icon">🎁</span>
            <div>
              <strong data-translate="registration.bonus">Welcome Bonus:</strong>
              <span data-translate="registration.level1">Level 1 + 5 GWT</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button 
          id="registerBtn" 
          class="btn-primary" 
          onclick="register()"
          data-translate="registration.registerBtn"
        >
          Register Now
        </button>
        <button 
          class="btn-secondary" 
          onclick="closeRegistrationModal()"
          data-translate="common.cancel"
        >
          Cancel
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  console.log('✅ Registration modal created');
  
  // Применить переводы если доступны
  if (window.i18n && window.i18n.translatePage) {
    window.i18n.translatePage();
  }
}

// 🔥 НОВАЯ ФУНКЦИЯ: Закрыть модальное окно
function closeRegistrationModal() {
  const modal = document.getElementById('registrationModal');
  if (modal) {
    modal.style.display = 'none';
  }
  console.log('📋 Registration modal closed');
}

// 🔥 УЛУЧШЕННАЯ ФУНКЦИЯ: Регистрация
async function register() {
  const sponsorInput = document.getElementById('sponsorInput');
  const registerBtn = document.getElementById('registerBtn');
  
  if (!sponsorInput) {
    console.error('Sponsor input not found');
    return;
  }
  
  const sponsorId = sponsorInput.value.trim();
  
  if (!sponsorId) {
    Utils.showNotification('Please enter Sponsor ID', 'warning');
    sponsorInput.focus();
    return;
  }
  
  // Проверка формата
  if (!sponsorId.match(/^GW-\d{7}$/i)) {
    Utils.showNotification('Invalid Sponsor ID format (GW-XXXXXXX)', 'warning');
    sponsorInput.focus();
    return;
  }
  
  try {
    // Отключить кнопку
    if (registerBtn) {
      registerBtn.disabled = true;
      registerBtn.textContent = 'Processing...';
    }
    
    // Подключить кошелёк если не подключен
    if (!web3Manager.connected) {
      console.log('📱 Wallet not connected, connecting...');
      Utils.showLoader(true, 'Connecting wallet...');
      
      try {
        await web3Manager.connect();
        await contracts.init();
      } catch (connectError) {
        console.error('Wallet connection failed:', connectError);
        Utils.showNotification('Please connect your wallet first', 'error');
        
        if (registerBtn) {
          registerBtn.disabled = false;
          registerBtn.textContent = 'Register Now';
        }
        Utils.hideLoader();
        return;
      }
    }
    
    // Проверка существующей регистрации
    const isAlreadyRegistered = await contracts.isUserRegistered(web3Manager.address);
    
    if (isAlreadyRegistered) {
      Utils.showNotification('You are already registered!', 'info');
      closeRegistrationModal();
      
      if (registerBtn) {
        registerBtn.disabled = false;
        registerBtn.textContent = 'Register Now';
      }
      
      // Перейти в dashboard
      if (typeof uiManager !== 'undefined' && uiManager.showPage) {
        uiManager.showPage('dashboard');
      }
      if (app && app.loadDashboard) {
        await app.loadDashboard();
      }
      
      return;
    }
    
    Utils.showLoader(true, 'Checking sponsor...');
    
    // Получить адрес спонсора по ID
    let sponsorAddress;
    
    try {
      sponsorAddress = await contracts.contracts.globalWay.idToAddress(sponsorId);
    } catch (error) {
      console.error('Failed to get sponsor address:', error);
      Utils.showNotification('Failed to verify sponsor. Please check the ID.', 'error');
      
      if (registerBtn) {
        registerBtn.disabled = false;
        registerBtn.textContent = 'Register Now';
      }
      Utils.hideLoader();
      return;
    }
    
    // Проверка что спонсор существует
    if (!sponsorAddress || sponsorAddress === ethers.constants.AddressZero) {
      Utils.showNotification('Sponsor not found. Please check the ID.', 'error');
      sponsorInput.focus();
      
      if (registerBtn) {
        registerBtn.disabled = false;
        registerBtn.textContent = 'Register Now';
      }
      Utils.hideLoader();
      return;
    }
    
    console.log('✅ Sponsor found:', sponsorAddress);
    
    // Проверка что спонсор зарегистрирован
    const sponsorInfo = await contracts.getUserInfo(sponsorAddress);
    
    if (!sponsorInfo.id || sponsorInfo.registrationTime === 0) {
      Utils.showNotification('Invalid sponsor. Please check the ID.', 'error');
      
      if (registerBtn) {
        registerBtn.disabled = false;
        registerBtn.textContent = 'Register Now';
      }
      Utils.hideLoader();
      return;
    }
    
    Utils.hideLoader();
    
    // Подтверждение регистрации
    const cost = CONFIG.LEVEL_PRICES[0];
    const confirmed = confirm(
      `Register in GlobalWay?\n\n` +
      `Sponsor: ${sponsorId}\n` +
      `Cost: ${cost} BNB\n` +
      `Bonus: Level 1 + 5 GWT tokens\n\n` +
      `Proceed with registration?`
    );
    
    if (!confirmed) {
      if (registerBtn) {
        registerBtn.disabled = false;
        registerBtn.textContent = 'Register Now';
      }
      return;
    }
    
    Utils.showLoader(true, 'Registering...');
    
    // Выполнить регистрацию
    const receipt = await contracts.register(sponsorAddress);
    
    console.log('✅ Registration successful!');
    console.log('Transaction:', receipt.transactionHash);
    
    Utils.hideLoader();
    
    Utils.showNotification(
      '🎉 Welcome to GlobalWay! Registration successful!',
      'success'
    );
    
    // Сохранить sponsor ID
    localStorage.setItem('sponsorId', sponsorId);
    localStorage.setItem('registered', 'true');
    
    // Закрыть модальное окно
    closeRegistrationModal();
    
    // Обновить статус в app
    if (app) {
      app.isRegistered = true;
    }
    
    // Перейти в dashboard
    if (typeof uiManager !== 'undefined' && uiManager.showPage) {
      uiManager.showPage('dashboard');
    }
    
    // Загрузить dashboard
    if (app && app.loadDashboard) {
      await app.loadDashboard();
    }
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    
    Utils.hideLoader();
    
    // Обработка различных ошибок
    if (error.message.includes('user rejected') || error.message.includes('User denied')) {
      Utils.showNotification('Transaction cancelled', 'info');
    } else if (error.message.includes('insufficient funds')) {
      Utils.showNotification('Insufficient BNB balance', 'error');
    } else if (error.message.includes('already registered')) {
      Utils.showNotification('Already registered', 'info');
      closeRegistrationModal();
    } else {
      const errorMsg = error.reason || error.message || 'Registration failed';
      Utils.showNotification(errorMsg, 'error');
    }
    
  } finally {
    // Включить кнопку обратно
    if (registerBtn) {
      registerBtn.disabled = false;
      registerBtn.textContent = 'Register Now';
    }
    Utils.hideLoader();
  }
}

// 🔥 НОВАЯ ФУНКЦИЯ: Проверка при загрузке страницы
async function checkRegistrationOnLoad() {
  try {
    // Проверить есть ли ref параметр в URL
    const urlParams = new URLSearchParams(window.location.search);
    const refId = urlParams.get('ref');
    
    // Проверить localStorage
    const visited = localStorage.getItem('visited');
    const registered = localStorage.getItem('registered');
    
    // Если первый визит и есть ref - показать модалку
    if (!visited && refId) {
      console.log('🆕 First visit with referral link');
      localStorage.setItem('visited', 'true');
      
      // Задержка чтобы страница загрузилась
      setTimeout(() => {
        showRegistrationModal();
      }, 1000);
      
      return;
    }
    
    // Если кошелёк подключен - проверить регистрацию
    if (web3Manager.connected) {
      const isReg = await contracts.isUserRegistered(web3Manager.address);
      
      if (!isReg && !registered) {
        console.log('⚠️ User not registered');
        setTimeout(() => {
          showRegistrationModal();
        }, 1000);
      }
    }
    
    // Отметить что сайт посещён
    if (!visited) {
      localStorage.setItem('visited', 'true');
    }
    
  } catch (error) {
    console.error('checkRegistrationOnLoad error:', error);
  }
}

// Экспорт функций
if (typeof window !== 'undefined') {
  window.showRegistrationModal = showRegistrationModal;
  window.closeRegistrationModal = closeRegistrationModal;
  window.register = register;
  window.checkRegistrationOnLoad = checkRegistrationOnLoad;
}

// Автоматическая проверка при загрузке
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkRegistrationOnLoad, 2000);
  });
} else {
  setTimeout(checkRegistrationOnLoad, 2000);
}
