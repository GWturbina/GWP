/* jshint esversion: 8 */
/* global CONFIG, ethers */

/**
 * GlobalWay Utility Functions - EXTENDED v2.1
 * Розширена версія з усіма необхідними функціями
 */

class Utils {
  // ==========================================
  // FORMATTING - Форматування
  // ==========================================

  /**
   * Форматування адреси (0x1234...5678)
   */
  static formatAddress(address) {
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      return 'N/A';
    }
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  /**
   * Форматування BNB (з 4 знаками після коми)
   */
  static formatBNB(amount) {
    if (!amount) return '0.0000';
    const num = parseFloat(amount);
    return num.toFixed(4);
  }

  /**
   * Форматування токенів (з 2 знаками)
   */
  static formatTokens(amount) {
    if (!amount) return '0.00';
    const num = parseFloat(amount);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Форматування User ID (GW000123)
   */
  static formatUserId(id) {
    if (!id || id === '0' || id === '') return 'Not Assigned';
    const numId = typeof id === 'string' ? parseInt(id.replace(/GW/i, '')) : id;
    return `GW${String(numId).padStart(6, '0')}`;
  }

  /**
   * Форматування дати (DD.MM.YYYY HH:MM)
   */
  static formatDate(timestamp) {
    if (!timestamp || timestamp === 0) return 'N/A';
    const date = new Date(timestamp * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }

  /**
   * Форматування короткої дати (DD.MM.YYYY)
   */
  static formatDateShort(timestamp) {
    if (!timestamp || timestamp === 0) return 'N/A';
    const date = new Date(timestamp * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  /**
   * Форматування часу (HH:MM:SS)
   */
  static formatTime(timestamp) {
    if (!timestamp || timestamp === 0) return 'N/A';
    const date = new Date(timestamp * 1000);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Форматування числа з роздільниками
   */
  static formatNumber(num) {
    if (!num) return '0';
    return num.toLocaleString('en-US');
  }

  /**
   * Форматування відсотків
   */
  static formatPercent(value, decimals = 2) {
    if (!value) return '0%';
    return `${parseFloat(value).toFixed(decimals)}%`;
  }

  /**
   * Отримання назви рангу
   */
  static getRankName(rankLevel) {
    if (!CONFIG.RANKS || !CONFIG.RANKS[rankLevel]) {
      return 'Member';
    }
    return CONFIG.RANKS[rankLevel].name;
  }

  /**
   * Форматування прогресу до рангу
   */
  static formatRankProgress(current, required) {
    const percent = Math.min((current / required) * 100, 100);
    return {
      text: `${current}/${required}`,
      percent: percent.toFixed(0) + '%',
      value: percent
    };
  }

  /**
   * Форматування позиції в матриці
   */
  static formatMatrixPosition(position) {
    if (!position || position === 0) return 'Root';
    return `Position ${position}`;
  }

  // ==========================================
  // VALIDATION - Валідація
  // ==========================================

  /**
   * Валідація Ethereum адреси
   */
  static validateAddress(address) {
    if (!address) return false;
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return false;
    return ethers.utils.isAddress(address);
  }

  /**
   * Валідація User ID
   */
  static validateUserId(userId) {
    if (!userId) return false;
    
    // Формат: GW000123 або просто число
    if (typeof userId === 'string') {
      if (userId.toUpperCase().startsWith('GW')) {
        const numPart = userId.substring(2);
        return /^\d+$/.test(numPart) && parseInt(numPart) > 0;
      }
      return /^\d+$/.test(userId) && parseInt(userId) > 0;
    }
    
    return typeof userId === 'number' && userId > 0;
  }

  /**
   * Валідація суми BNB
   */
  static validateAmount(amount) {
    if (!amount) return false;
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0;
  }

  /**
   * Перевірка чи сума є валідною BNB
   */
  static isValidBNBAmount(amount, min = 0.0001) {
    const num = parseFloat(amount);
    return !isNaN(num) && num >= min;
  }

  /**
   * Валідація спонсора
   */
  static async validateSponsor(sponsorId) {
    try {
      if (!this.validateUserId(sponsorId)) {
        return { valid: false, error: 'Invalid sponsor ID format' };
      }

      // Перевірити чи існує спонсор (має бути реалізовано в contracts)
      if (typeof contracts !== 'undefined' && contracts.getAddressByUserId) {
        const address = await contracts.getAddressByUserId(sponsorId);
        if (address === ethers.constants.AddressZero) {
          return { valid: false, error: 'Sponsor not found' };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Валідація email
   */
  static validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // ==========================================
  // CALCULATIONS - Розрахунки
  // ==========================================

  /**
   * Розрахунок загальної ціни пакету рівнів
   */
  static calculateBulkPrice(upToLevel) {
    let total = 0;
    for (let i = 1; i <= upToLevel; i++) {
      if (CONFIG.LEVEL_PRICES && CONFIG.LEVEL_PRICES[i - 1]) {
        total += parseFloat(CONFIG.LEVEL_PRICES[i - 1]);
      }
    }
    return total.toFixed(4);
  }

  /**
   * Перевірка чи може користувач купити рівень
   */
  static canBuyLevel(userActiveLevel, targetLevel) {
    // Можна купувати тільки наступний рівень або нижчі (якщо не активовані)
    return targetLevel <= 12 && targetLevel > 0;
  }

  /**
   * Розрахунок наступного кварталу
   */
  static calculateNextQuarter(lastPaymentTime) {
    if (!lastPaymentTime || lastPaymentTime === 0) {
      return Date.now() / 1000; // Зараз
    }
    const quarterDuration = 90 * 24 * 60 * 60; // 90 днів в секундах
    return lastPaymentTime + quarterDuration;
  }

  /**
   * Розрахунок днів до наступної оплати
   */
  static calculateDaysRemaining(nextPaymentDue) {
    if (!nextPaymentDue || nextPaymentDue === 0) return 0;
    const now = Math.floor(Date.now() / 1000);
    const diff = nextPaymentDue - now;
    return Math.max(0, Math.floor(diff / 86400));
  }

  /**
   * Розрахунок доходів (приклад структури)
   */
  static calculateEarnings(earningsData) {
    const total = Object.values(earningsData).reduce((sum, val) => {
      return sum + parseFloat(val || 0);
    }, 0);

    return {
      ...earningsData,
      total: total.toFixed(4)
    };
  }

  /**
   * Розрахунок прогресу до наступного рангу
   */
  static calculateRankProgress(currentRank, userStats) {
    const nextRank = currentRank + 1;
    
    if (!CONFIG.RANKS || !CONFIG.RANKS[nextRank]) {
      return { progress: 100, text: 'Max Rank', canUpgrade: false };
    }

    const requirements = CONFIG.RANKS[nextRank].requirements;
    const current = {
      partners: userStats.partnersCount || 0,
      volume: parseFloat(userStats.volume || 0),
      activePartners: userStats.activePartners || 0
    };

    const progress = {
      partners: Math.min((current.partners / requirements.partners) * 100, 100),
      volume: Math.min((current.volume / parseFloat(requirements.volume)) * 100, 100),
      activePartners: Math.min((current.activePartners / requirements.activePartners) * 100, 100)
    };

    const avgProgress = (progress.partners + progress.volume + progress.activePartners) / 3;

    return {
      progress: avgProgress.toFixed(0),
      details: progress,
      canUpgrade: avgProgress >= 100,
      requirements,
      current
    };
  }

  // ==========================================
  // URL & LINKS - Посилання
  // ==========================================

  /**
   * Отримати посилання на explorer
   */
  static getExplorerLink(address) {
    return `${CONFIG.NETWORK.explorer}/address/${address}`;
  }

  /**
   * Отримати посилання на транзакцію
   */
  static getExplorerTxLink(txHash) {
    return `${CONFIG.NETWORK.explorer}/tx/${txHash}`;
  }

  /**
   * Парсинг реферального посилання з URL
   */
  static parseReferralLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    
    if (ref && this.validateUserId(ref)) {
      // Зберегти в storage
      this.setStorage('referralId', ref);
      return ref;
    }

    // Перевірити чи є збережений ref
    return this.getStorage('referralId');
  }

  /**
   * Генерація реферального посилання
   */
  static generateReferralLink(userId) {
    const origin = window.location.origin;
    const formattedId = this.formatUserId(userId);
    return `${origin}?ref=${formattedId}`;
  }

  // ==========================================
  // STORAGE - Локальне сховище
  // ==========================================

  /**
   * Зберегти дані в localStorage
   */
  static setStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }

  /**
   * Отримати дані з localStorage
   */
  static getStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  }

  /**
   * Видалити дані з localStorage
   */
  static removeStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  }

  /**
   * Очистити localStorage
   */
  static clearStorage() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }

  /**
   * Перевірка наявності ключа
   */
  static hasStorage(key) {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Зберегти в sessionStorage
   */
  static setSessionStorage(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Session storage set error:', error);
      return false;
    }
  }

  /**
   * Отримати з sessionStorage
   */
  static getSessionStorage(key, defaultValue = null) {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Session storage get error:', error);
      return defaultValue;
    }
  }

  // ==========================================
  // UI COMPONENTS - UI Компоненти
  // ==========================================

  /**
   * Показати notification
   */
  static showNotification(message, type = 'info', duration = 3000) {
    // Видалити попередні notification
    const existing = document.querySelector('.notification');
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icon = this.getNotificationIcon(type);
    
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${icon}</span>
        <span class="notification-message">${message}</span>
      </div>
      <button class="notification-close">&times;</button>
    `;

    document.body.appendChild(notification);

    // Показати з анімацією
    setTimeout(() => notification.classList.add('show'), 10);

    // Закриття по кліку
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      this.hideNotification(notification);
    });

    // Автоматичне закриття
    if (duration > 0) {
      setTimeout(() => {
        this.hideNotification(notification);
      }, duration);
    }

    return notification;
  }

  /**
   * Приховати notification
   */
  static hideNotification(notification) {
    if (!notification) {
      notification = document.querySelector('.notification');
    }
    if (notification) {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }
  }

  /**
   * Отримати іконку для notification
   */
  static getNotificationIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }

  /**
   * Показати loader
   */
  static showLoader(show = true, message = 'Loading...') {
    let loader = document.getElementById('loaderOverlay');
    
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'loaderOverlay';
      loader.className = 'loader-overlay';
      loader.innerHTML = `
        <div class="loader-content">
          <div class="spinner"></div>
          <div class="loader-message">${message}</div>
        </div>
      `;
      document.body.appendChild(loader);
    }

    const messageEl = loader.querySelector('.loader-message');
    if (messageEl) {
      messageEl.textContent = message;
    }

    if (show) {
      loader.style.display = 'flex';
      setTimeout(() => loader.classList.add('show'), 10);
    } else {
      loader.classList.remove('show');
      setTimeout(() => {
        loader.style.display = 'none';
      }, 300);
    }
  }

  /**
   * Приховати loader
   */
  static hideLoader() {
    this.showLoader(false);
  }

  /**
   * Показати модальне вікно
   */
  static showModal(title, content, buttons = []) {
    const modal = document.createElement('div');
    modal.className = 'custom-modal';
    
    let buttonsHTML = '';
    if (buttons.length > 0) {
      buttonsHTML = buttons.map(btn => 
        `<button class="btn ${btn.class || 'btn-primary'}" data-action="${btn.action}">${btn.text}</button>`
      ).join('');
    } else {
      buttonsHTML = '<button class="btn btn-primary" data-action="close">OK</button>';
    }

    modal.innerHTML = `
      <div class="custom-modal-overlay"></div>
      <div class="custom-modal-content">
        <div class="custom-modal-header">
          <h3>${title}</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="custom-modal-body">
          ${content}
        </div>
        <div class="custom-modal-footer">
          ${buttonsHTML}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Показати з анімацією
    setTimeout(() => modal.classList.add('show'), 10);

    // Обробники подій
    const overlay = modal.querySelector('.custom-modal-overlay');
    const closeBtn = modal.querySelector('.close-modal');
    const actionBtns = modal.querySelectorAll('[data-action]');

    overlay.addEventListener('click', () => this.hideModal(modal));
    closeBtn.addEventListener('click', () => this.hideModal(modal));

    actionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'close') {
          this.hideModal(modal);
        } else if (buttons.find(b => b.action === action)?.callback) {
          buttons.find(b => b.action === action).callback();
        }
      });
    });

    return modal;
  }

  /**
   * Приховати модальне вікно
   */
  static hideModal(modal) {
    if (!modal) {
      modal = document.querySelector('.custom-modal');
    }
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
    }
  }

  /**
   * Діалог підтвердження
   */
  static async confirm(message, title = 'Confirm') {
    return new Promise((resolve) => {
      const modal = this.showModal(
        title,
        `<p>${message}</p>`,
        [
          {
            text: 'Cancel',
            class: 'btn-secondary',
            action: 'cancel',
            callback: () => {
              this.hideModal(modal);
              resolve(false);
            }
          },
          {
            text: 'Confirm',
            class: 'btn-primary',
            action: 'confirm',
            callback: () => {
              this.hideModal(modal);
              resolve(true);
            }
          }
        ]
      );
    });
  }

  /**
   * Діалог попередження
   */
  static alert(message, title = 'Alert') {
    return this.showModal(title, `<p>${message}</p>`);
  }

  // ==========================================
  // QR CODE - QR Коди
  // ==========================================

  /**
   * Генерація QR коду
   */
  static generateQR(text, elementId, options = {}) {
    try {
      const container = document.getElementById(elementId);
      if (!container) {
        console.error('QR container not found:', elementId);
        return null;
      }

      // Очистити контейнер
      container.innerHTML = '';

      // Параметри за замовчуванням
      const qrOptions = {
        text: text,
        width: options.width || 256,
        height: options.height || 256,
        colorDark: options.colorDark || '#000000',
        colorLight: options.colorLight || '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      };

      // Створити QR код
      const qrcode = new QRCode(container, qrOptions);

      return qrcode;
    } catch (error) {
      console.error('QR generation error:', error);
      return null;
    }
  }

  /**
   * Завантаження QR коду як PNG
   */
  static downloadQR(elementId, filename = 'qrcode.png') {
    try {
      const container = document.getElementById(elementId);
      if (!container) return;

      const canvas = container.querySelector('canvas');
      const img = container.querySelector('img');

      if (canvas) {
        const url = canvas.toDataURL('image/png');
        this.downloadFile(url, filename);
      } else if (img) {
        this.downloadFile(img.src, filename);
      }
    } catch (error) {
      console.error('QR download error:', error);
    }
  }

  /**
   * Завантаження файлу
   */
  static downloadFile(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Поділитися QR кодом
   */
  static async shareQR(text, title = 'My Referral Link') {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
          url: text
        });
        return true;
      } catch (error) {
        console.error('Share error:', error);
        return false;
      }
    } else {
      // Fallback - копіювати в буфер
      return this.copyToClipboard(text);
    }
  }

  // ==========================================
  // CLIPBOARD - Буфер обміну
  // ==========================================

  /**
   * Копіювання в буфер обміну
   */
  static async copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        this.showNotification('Copied to clipboard!', 'success');
        return true;
      } else {
        // Fallback для старих браузерів
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (success) {
          this.showNotification('Copied to clipboard!', 'success');
        }
        return success;
      }
    } catch (error) {
      console.error('Copy error:', error);
      this.showNotification('Copy failed', 'error');
      return false;
    }
  }

  // ==========================================
  // STRING OPERATIONS - Операції з рядками
  // ==========================================

  /**
   * Обрізання рядка
   */
  static truncateString(str, maxLength = 50) {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  }

  /**
   * Capitalize перша літера
   */
  static capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Парсинг повідомлення помилки
   */
  static parseErrorMessage(error) {
    if (typeof error === 'string') return error;
    
    if (error.message) {
      // Blockchain помилки
      if (error.message.includes('user rejected')) {
        return 'Transaction rejected by user';
      }
      if (error.message.includes('insufficient funds')) {
        return 'Insufficient funds for transaction';
      }
      if (error.message.includes('gas required exceeds')) {
        return 'Transaction would fail. Please check parameters.';
      }
      return error.message;
    }
    
    if (error.reason) return error.reason;
    if (error.error && error.error.message) return error.error.message;
    
    return 'Unknown error occurred';
  }

  /**
   * Форматування помилки для відображення
   */
  static formatError(error) {
    const message = this.parseErrorMessage(error);
    return this.truncateString(message, 100);
  }

  // ==========================================
  // BROWSER & DEVICE - Браузер та пристрій
  // ==========================================

  /**
   * Перевірка чи мобільний пристрій
   */
  static isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Перевірка чи SafePal Browser
   */
  static isSafePalBrowser() {
    return /SafePal/i.test(navigator.userAgent) || window.safepalProvider !== undefined;
  }

  /**
   * Перевірка чи MetaMask
   */
  static isMetaMask() {
    return window.ethereum && window.ethereum.isMetaMask;
  }

  /**
   * Визначення браузера
   */
  static getBrowser() {
    const ua = navigator.userAgent;
    
    if (this.isSafePalBrowser()) return 'SafePal';
    if (/Chrome/i.test(ua)) return 'Chrome';
    if (/Safari/i.test(ua)) return 'Safari';
    if (/Firefox/i.test(ua)) return 'Firefox';
    if (/Edge/i.test(ua)) return 'Edge';
    if (/Opera/i.test(ua)) return 'Opera';
    
    return 'Unknown';
  }

  /**
   * Визначення OS
   */
  static getOS() {
    const ua = navigator.userAgent;
    
    if (/Android/i.test(ua)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac/i.test(ua)) return 'MacOS';
    if (/Linux/i.test(ua)) return 'Linux';
    
    return 'Unknown';
  }

  // ==========================================
  // ASYNC UTILITIES - Асинхронні утиліти
  // ==========================================

  /**
   * Затримка (sleep)
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry з експоненційним backoff
   */
  static async retry(fn, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.sleep(delay * Math.pow(2, i));
      }
    }
  }

  /**
   * Timeout для Promise
   */
  static withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
      )
    ]);
  }

  // ==========================================
  // DEBUG & LOGGING - Дебаг та логування
  // ==========================================

  /**
   * Лог з timestamp
   */
  static log(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, data || '');
  }

  /**
   * Debug mode check
   */
  static isDebugMode() {
    return localStorage.getItem('debug') === 'true' || 
           window.location.hostname === 'localhost';
  }

  /**
   * Debug log (тільки в debug mode)
   */
  static debug(message, data = null) {
    if (this.isDebugMode()) {
      this.log('DEBUG: ' + message, data);
    }
  }
}

// Експорт для використання в інших модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
