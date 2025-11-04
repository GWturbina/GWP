/* jshint esversion: 8 */
/* global CONFIG, ethers */

/**
 * Utils - Utility Functions
 * Version: 2.0
 */

class Utils {
  /**
   * Форматирование адреса (0x123...789)
   */
  static formatAddress(address) {
    if (!address || address.length < 10) {
      return '0x000...000';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Форматирование BNB с фиксированным количеством знаков
   */
  static formatBNB(amount, decimals = 4) {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0.0000';
    return num.toFixed(decimals);
  }

  /**
   * Форматирование даты
   */
  static formatDate(timestamp) {
    if (!timestamp || timestamp === 0) {
      return '-';
    }
    
    const date = new Date(timestamp * 1000);
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }

  /**
   * Форматирование только даты
   */
  static formatDateOnly(timestamp) {
    if (!timestamp || timestamp === 0) {
      return '-';
    }
    
    const date = new Date(timestamp * 1000);
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}.${month}.${year}`;
  }

  /**
   * Валидация адреса
   */
  static validateAddress(address) {
    if (!address) return false;
    return CONFIG.VALIDATION.ADDRESS_REGEX.test(address);
  }

  /**
   * Валидация User ID
   */
  static validateUserId(userId) {
    if (!userId) return false;
    return CONFIG.VALIDATION.USER_ID_REGEX.test(userId);
  }

  /**
   * Копирование в буфер обмена
   */
  static async copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        this.showNotification('Copied to clipboard!', 'success');
      } else {
        // Fallback для старых браузеров
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.showNotification('Copied to clipboard!', 'success');
      }
    } catch (error) {
      console.error('Copy failed:', error);
      this.showNotification('Failed to copy', 'error');
    }
  }

  /**
   * Показать уведомление
   */
  static showNotification(message, type = 'info') {
    // Удалить старое уведомление если есть
    const existing = document.getElementById('notification');
    if (existing) {
      existing.remove();
    }
    
    // Создать новое
    const notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = `notification ${type}`;
    
    // Иконка в зависимости от типа
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';
    
    notification.innerHTML = `
      <span class="notification-icon">${icon}</span>
      <span class="notification-message">${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Автоматическое скрытие
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, CONFIG.UI.notificationDuration);
  }

  /**
   * Показать/скрыть лоадер
   */
  static showLoader(show) {
    let loader = document.getElementById('globalLoader');
    
    if (!loader) {
      loader = this.createLoader();
    }
    
    if (show) {
      loader.style.display = 'flex';
      // Блокировка скролла
      document.body.style.overflow = 'hidden';
    } else {
      loader.style.display = 'none';
      // Разблокировка скролла
      document.body.style.overflow = '';
    }
  }

  /**
   * Создать лоадер
   */
  static createLoader() {
    const loader = document.createElement('div');
    loader.id = 'globalLoader';
    loader.className = 'loader-overlay';
    loader.innerHTML = `
      <div class="loader-content">
        <div class="spinner"></div>
        <p>Processing transaction...</p>
      </div>
    `;
    document.body.appendChild(loader);
    return loader;
  }

  /**
   * Открыть модальное окно
   */
  static openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * Закрыть модальное окно
   */
  static closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  /**
   * Форматирование большого числа (1000 → 1K, 1000000 → 1M)
   */
  static formatLargeNumber(num) {
    const number = parseFloat(num);
    
    if (number >= 1000000) {
      return (number / 1000000).toFixed(2) + 'M';
    }
    
    if (number >= 1000) {
      return (number / 1000).toFixed(2) + 'K';
    }
    
    return number.toFixed(2);
  }

  /**
   * Подсветка текста при копировании
   */
  static highlightCopied(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.classList.add('copied-highlight');
    
    setTimeout(() => {
      element.classList.remove('copied-highlight');
    }, 1000);
  }

  /**
   * Debounce функция
   */
  static debounce(func, delay = 500) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * Проверка мобильного устройства
   */
  static isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }

  /**
   * Плавная прокрутка к элементу
   */
  static scrollToElement(elementId, offset = 0) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;
    
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }

  /**
   * Проверка видимости элемента на экране
   */
  static isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  /**
   * Генерация случайного цвета
   */
  static randomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  /**
   * Задержка (Promise)
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Форматирование процентов
   */
  static formatPercent(value, decimals = 2) {
    const num = parseFloat(value);
    if (isNaN(num)) return '0%';
    return num.toFixed(decimals) + '%';
  }

  /**
   * Обрезка текста с многоточием
   */
  static truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Получить параметр из URL
   */
  static getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  /**
   * Установить параметр в URL
   */
  static setUrlParameter(name, value) {
    const url = new URL(window.location);
    url.searchParams.set(name, value);
    window.history.pushState({}, '', url);
  }

  /**
   * Очистить параметр из URL
   */
  static clearUrlParameter(name) {
    const url = new URL(window.location);
    url.searchParams.delete(name);
    window.history.pushState({}, '', url);
  }
}

/**
 * UIManager - User Interface Manager
 * Управление навигацией, модальными окнами, темами
 */

class UIManager {
  constructor() {
    this.currentPage = 'landing';
    this.modals = {};
    this.theme = localStorage.getItem('theme') || 'dark';
  }

  /**
   * Инициализация UI Manager
   */
  init() {
    console.log('🎨 Initializing UI Manager...');
    
    this.setupNavigation();
    this.setupModals();
    this.setupTheme();
    this.setupMobileMenu();
    
    console.log('✅ UI Manager initialized');
  }

  /**
   * Настройка навигации
   */
  setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page) {
          this.showPage(page);
        }
      });
    });
    
    // Навигация в footer
    const footerLinks = document.querySelectorAll('.footer-nav a');
    footerLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const page = link.dataset.page;
        if (page) {
          e.preventDefault();
          this.showPage(page);
        }
      });
    });
  }

  /**
   * Показать страницу
   */
  async showPage(pageName) {
    console.log('📄 Showing page:', pageName);
    
    // 🔥 ИСПРАВЛЕНО: Загружаем компонент перед показом (если не dashboard)
    if (pageName !== 'dashboard') {
      await this.loadComponent(pageName);
    }
    
    // Скрыть все страницы
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => {
      page.style.display = 'none';
    });
    
    // Показать выбранную
    const targetPage = document.getElementById(pageName);
    if (targetPage) {
      targetPage.style.display = 'block';
      this.currentPage = pageName;
      
      // Прокрутка наверх
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Обновить активную кнопку
      this.updateActiveNavButton(pageName);
      
      // Загрузить данные страницы если app доступен
      if (window.app && typeof window.app.loadPageData === 'function') {
        window.app.loadPageData(pageName);
      }
    }
  }

  /**
   * Обновить активную кнопку навигации
   */
  updateActiveNavButton(pageName) {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.page === pageName) {
        btn.classList.add('active');
      }
    });
  }

  /**
   * Настройка модальных окон
   */
  setupModals() {
    // Найти все модальные окна
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
      const modalId = modal.id;
      this.modals[modalId] = modal;
      
      // Кнопка закрытия (X)
      const closeBtn = modal.querySelector('.close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.closeModal(modalId);
        });
      }
      
      // Закрытие по клику вне модала
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modalId);
        }
      });
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }

  /**
   * Открыть модальное окно
   */
  openModal(modalId) {
    const modal = this.modals[modalId] || document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'block';
      document.body.style.overflow = 'hidden';
      
      // Анимация
      setTimeout(() => {
        modal.classList.add('show');
      }, 10);
    }
  }

  /**
   * Закрыть модальное окно
   */
  closeModal(modalId) {
    const modal = this.modals[modalId] || document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show');
      
      setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }, 300);
    }
  }

  /**
   * Закрыть все модальные окна
   */
  closeAllModals() {
    Object.keys(this.modals).forEach(modalId => {
      this.closeModal(modalId);
    });
  }

  /**
   * Настройка темы
   */
  setupTheme() {
    // Применить сохранённую тему
    document.body.classList.add(`theme-${this.theme}`);
    
    // Кнопка переключения темы
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
  }

  /**
   * Переключение темы
   */
  toggleTheme() {
    const currentTheme = this.theme;
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.body.classList.remove(`theme-${currentTheme}`);
    document.body.classList.add(`theme-${newTheme}`);
    
    this.theme = newTheme;
    localStorage.setItem('theme', newTheme);
    
    console.log('🎨 Theme changed to:', newTheme);
  }

  /**
   * Настройка мобильного меню
   */
  setupMobileMenu() {
    const menuToggle = document.getElementById('mobileMenuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (menuToggle && mobileMenu) {
      menuToggle.addEventListener('click', () => {
        mobileMenu.classList.toggle('show');
      });
      
      // Закрытие при клике на пункт меню
      const menuItems = mobileMenu.querySelectorAll('.nav-btn');
      menuItems.forEach(item => {
        item.addEventListener('click', () => {
          mobileMenu.classList.remove('show');
        });
      });
      
      // Закрытие при клике вне меню
      document.addEventListener('click', (e) => {
        if (!mobileMenu.contains(e.target) && !menuToggle.contains(e.target)) {
          mobileMenu.classList.remove('show');
        }
      });
    }
  }

  /**
   * Показать/скрыть раздел
   */
  toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      const isVisible = section.style.display !== 'none';
      section.style.display = isVisible ? 'none' : 'block';
    }
  }

  /**
   * Показать табу
   */
  showTab(tabGroupId, tabId) {
    const tabGroup = document.getElementById(tabGroupId);
    if (!tabGroup) return;
    
    // Скрыть все табы
    const tabs = tabGroup.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
      tab.style.display = 'none';
    });
    
    // Убрать активный класс у кнопок
    const tabButtons = tabGroup.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Показать выбранный таб
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
      targetTab.style.display = 'block';
    }
    
    // Добавить активный класс кнопке
    const activeButton = tabGroup.querySelector(`[data-tab="${tabId}"]`);
    if (activeButton) {
      activeButton.classList.add('active');
    }
  }

  /**
   * Обновить прогресс-бар
   */
  updateProgressBar(elementId, percent) {
    const progressBar = document.getElementById(elementId);
    if (progressBar) {
      const progress = Math.min(100, Math.max(0, percent));
      progressBar.style.width = progress + '%';
      progressBar.setAttribute('aria-valuenow', progress);
    }
  }

  /**
   * Показать тултип
   */
  showTooltip(elementId, message) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = message;
    
    element.appendChild(tooltip);
    
    setTimeout(() => {
      tooltip.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      tooltip.classList.remove('show');
      setTimeout(() => {
        tooltip.remove();
      }, 300);
    }, 2000);
  }

  /**
   * Анимация счётчика
   */
  animateCounter(elementId, targetValue, duration = 1000) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = parseFloat(element.textContent) || 0;
    const increment = (targetValue - startValue) / (duration / 16);
    let currentValue = startValue;
    
    const timer = setInterval(() => {
      currentValue += increment;
      
      if ((increment > 0 && currentValue >= targetValue) ||
          (increment < 0 && currentValue <= targetValue)) {
        currentValue = targetValue;
        clearInterval(timer);
      }
      
      element.textContent = currentValue.toFixed(2);
    }, 16);
  }

  /**
   * Динамическая загрузка компонента из папки components/
   * 🔥 НОВОЕ: Загружает HTML компоненты по требованию
   */
  async loadComponent(componentName) {
    const container = document.getElementById(componentName);
    if (!container) {
      console.warn(`Container #${componentName} not found`);
      return false;
    }
    
    // Если компонент уже загружен (есть контент), пропускаем
    if (container.innerHTML.trim().length > 0 && !container.dataset.forceReload) {
      console.log(`✅ Component ${componentName} already loaded`);
      return true;
    }
    
    try {
      console.log(`📥 Loading component: ${componentName}.html...`);
      
      const response = await fetch(`components/${componentName}.html`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      container.innerHTML = html;
      
      console.log(`✅ Component ${componentName} loaded successfully`);
      
      // Инициализируем специфичную логику компонента
      await this.initializeComponent(componentName);
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to load component ${componentName}:`, error);
      container.innerHTML = `
        <div class="error-message">
          <h3>⚠️ Failed to load ${componentName}</h3>
          <p>${error.message}</p>
          <button onclick="uiManager.loadComponent('${componentName}')">Retry</button>
        </div>
      `;
      return false;
    }
  }
  
  /**
   * Инициализация компонента после загрузки
   * 🔥 НОВОЕ: Вызывает соответствующие init() методы
   */
  async initializeComponent(componentName) {
    try {
      switch(componentName) {
        case 'partners':
          if (window.partnersManager && typeof window.partnersManager.init === 'function') {
            await window.partnersManager.init();
          }
          break;
          
        case 'matrix':
          if (window.matrixManager && typeof window.matrixManager.init === 'function') {
            await window.matrixManager.init();
          }
          break;
          
        case 'tokens':
          if (window.tokensManager && typeof window.tokensManager.init === 'function') {
            await window.tokensManager.init();
          }
          break;
          
        case 'projects':
          if (window.projectsManager && typeof window.projectsManager.init === 'function') {
            await window.projectsManager.init();
          }
          break;
          
        case 'admin':
          if (window.adminManager && typeof window.adminManager.init === 'function') {
            await window.adminManager.init();
          }
          break;
      }
      
      console.log(`✅ Component ${componentName} initialized`);
    } catch (error) {
      console.error(`❌ Failed to initialize ${componentName}:`, error);
    }
  }

  /**
   * Получить текущую страницу
   */
  getCurrentPage() {
    return this.currentPage;
  }
}

// Создать глобальный экземпляр
const uiManager = new UIManager();

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  uiManager.init();
});

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Utils, UIManager };
}
