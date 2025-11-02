/* jshint esversion: 8 */
/* global web3Manager, contracts, Utils, CONFIG */

/**
 * UI Manager - Управління інтерфейсом - FIXED
 * Відповідає за навігацію, завантаження сторінок, оновлення UI
 */

class UIManager {
  constructor() {
    this.currentPage = 'landing';
    this.initialized = false;
    this.userData = null;
  }

  /**
   * Ініціалізація UI менеджера
   */
  init() {
    console.log('🎨 Initializing UI Manager...');
    
    // Налаштування навігації
    this.setupNavigation();
    
    // Налаштування мобільного меню
    this.setupMobileMenu();
    
    // Налаштування language switcher
    this.setupLanguageSwitcher();
    
    // Налаштування кнопки входу в DApp
    this.setupDAppEntry();
    
    // Перевірка збереженої сторінки
    const savedPage = Utils.getStorage('currentPage');
    if (savedPage) {
      this.currentPage = savedPage;
    }
    
    this.initialized = true;
    console.log('✅ UI Manager initialized');
  }

  /**
   * Налаштування кнопки входу в DApp
   */
  setupDAppEntry() {
    const openDappBtn = document.getElementById('openDapp');
    if (openDappBtn) {
      openDappBtn.addEventListener('click', () => {
        this.enterDApp();
      });
    }
  }

  /**
   * Вхід в DApp
   */
  async enterDApp() {
    try {
      // Перевірити підключення кошелька
      if (!web3Manager || !web3Manager.connected) {
        Utils.showNotification('Please connect wallet first', 'warning');
        
        // Спробувати підключити
        if (typeof app !== 'undefined' && app.connectWallet) {
          await app.connectWallet();
        }
        return;
      }

      // Перевірити реєстрацію
      if (typeof app !== 'undefined' && !app.isRegistered) {
        Utils.showNotification('Please register first', 'warning');
        
        // Показати modal реєстрації
        if (typeof showRegistrationModal === 'function') {
          showRegistrationModal();
        }
        return;
      }

      // Переключитися на Dashboard
      this.showPage('dashboard');
      
    } catch (error) {
      console.error('Enter DApp error:', error);
      Utils.showNotification('Failed to enter DApp', 'error');
    }
  }

  /**
   * Налаштування навігації
   */
  setupNavigation() {
    // Desktop navigation - кнопки в nav
    const navBtns = document.querySelectorAll('.nav-btn[data-page]');
    navBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const page = btn.dataset.page;
        this.showPage(page);
      });
    });

    // Desktop navigation - links
    const navLinks = document.querySelectorAll('.nav-link[data-page]');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        this.showPage(page);
      });
    });

    // Mobile navigation
    const mobileLinks = document.querySelectorAll('.mobile-nav-link[data-page]');
    mobileLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        this.showPage(page);
        this.closeMobileMenu();
      });
    });

    // Logo click - повернутися на головну
    const logo = document.querySelector('.logo');
    if (logo) {
      logo.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPage = web3Manager.connected ? 'dashboard' : 'landing';
        this.showPage(targetPage);
      });
    }
  }

  /**
   * Налаштування мобільного меню
   */
  setupMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    const overlay = document.querySelector('.mobile-nav-overlay');

    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        this.toggleMobileMenu();
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        this.closeMobileMenu();
      });
    }
  }

  /**
   * Відкрити/закрити мобільне меню
   */
  toggleMobileMenu() {
    const mobileNav = document.querySelector('.mobile-nav');
    const overlay = document.querySelector('.mobile-nav-overlay');
    
    if (mobileNav && overlay) {
      mobileNav.classList.toggle('active');
      overlay.classList.toggle('active');
      document.body.classList.toggle('menu-open');
    }
  }

  /**
   * Закрити мобільне меню
   */
  closeMobileMenu() {
    const mobileNav = document.querySelector('.mobile-nav');
    const overlay = document.querySelector('.mobile-nav-overlay');
    
    if (mobileNav && overlay) {
      mobileNav.classList.remove('active');
      overlay.classList.remove('active');
      document.body.classList.remove('menu-open');
    }
  }

  /**
   * Налаштування перемикача мови
   */
  setupLanguageSwitcher() {
    const langButtons = document.querySelectorAll('[data-lang]');
    
    langButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        this.changeLanguage(lang);
      });
    });
  }

  /**
   * Зміна мови
   */
  async changeLanguage(lang) {
    try {
      if (typeof i18n !== 'undefined') {
        await i18n.changeLanguage(lang);
        Utils.showNotification('Language changed', 'success');
      }
    } catch (error) {
      console.error('Language change error:', error);
    }
  }

  /**
   * 🔥 FIXED: Показати сторінку
   * @param {string} pageName - Назва сторінки (landing, dashboard, partners, matrix, tokens, projects, admin)
   */
  async showPage(pageName) {
    console.log('📄 Showing page:', pageName);

    // Перевірка доступу
    if (!this.checkPageAccess(pageName)) {
      Utils.showNotification('Please connect wallet and register', 'warning');
      this.showPage('landing');
      return;
    }

    // 🔥 ВИПРАВЛЕНО: Спеціальна логіка для landing/dapp переключення
    const landing = document.getElementById('landing');
    const dapp = document.getElementById('dapp');

    if (pageName === 'landing') {
      // Показати Landing, сховати DApp
      if (landing) {
        landing.classList.add('active');
        landing.style.display = 'block';
      }
      if (dapp) {
        dapp.classList.remove('active');
        dapp.style.display = 'none';
      }
    } else {
      // Показати DApp, сховати Landing
      if (landing) {
        landing.classList.remove('active');
        landing.style.display = 'none';
      }
      if (dapp) {
        dapp.classList.add('active');
        dapp.style.display = 'block';
      }

      // Приховати всі page-content
      const pageContents = document.querySelectorAll('.page-content');
      pageContents.forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
      });

      // Показати потрібний page-content
      const targetPage = document.getElementById(pageName);
      if (targetPage) {
        targetPage.style.display = 'block';
        setTimeout(() => {
          targetPage.classList.add('active');
        }, 10);
      } else {
        console.error('❌ Page not found:', pageName);
      }
    }

    // Оновити активний пункт меню
    this.updateActiveNavigation(pageName);

    // Зберегти поточну сторінку
    this.currentPage = pageName;
    Utils.setStorage('currentPage', pageName);

    // Завантажити дані для сторінки
    await this.loadPageData(pageName);

    // Scroll to top
    window.scrollTo(0, 0);
  }

  /**
   * Перевірка доступу до сторінки
   */
  checkPageAccess(pageName) {
    // Landing завжди доступний
    if (pageName === 'landing') return true;

    // Інші сторінки потребують підключеного кошелька
    if (!web3Manager.connected) return false;

    // Admin потребує прав
    if (pageName === 'admin') {
      // Перевірка чи адреса в списку адмінів
      const address = web3Manager.address.toLowerCase();
      const isOwner = address === CONFIG.ADMIN.owner.toLowerCase();
      const isFounder = CONFIG.ADMIN.founders.some(f => f.toLowerCase() === address);
      const isBoard = CONFIG.ADMIN.board.some(b => b.toLowerCase() === address);
      
      return isOwner || isFounder || isBoard;
    }

    return true;
  }

  /**
   * Оновити активну навігацію
   */
  updateActiveNavigation(pageName) {
    // Desktop navigation - buttons
    const navBtns = document.querySelectorAll('.nav-btn[data-page]');
    navBtns.forEach(btn => {
      if (btn.dataset.page === pageName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Desktop navigation - links
    const navLinks = document.querySelectorAll('.nav-link[data-page]');
    navLinks.forEach(link => {
      if (link.dataset.page === pageName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Mobile navigation
    const mobileLinks = document.querySelectorAll('.mobile-nav-link[data-page]');
    mobileLinks.forEach(link => {
      if (link.dataset.page === pageName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  /**
   * Завантажити дані для сторінки
   */
  async loadPageData(pageName) {
    if (!web3Manager.connected) return;

    try {
      switch (pageName) {
        case 'dashboard':
          if (typeof app !== 'undefined' && app.loadDashboard) {
            await app.loadDashboard();
          }
          break;
          
        case 'partners':
          if (typeof app !== 'undefined' && app.loadPartners) {
            await app.loadPartners();
          }
          break;
          
        case 'matrix':
          if (typeof app !== 'undefined' && app.loadMatrix) {
            await app.loadMatrix();
          }
          break;
          
        case 'tokens':
          if (typeof app !== 'undefined' && app.loadTokens) {
            await app.loadTokens();
          }
          break;
          
        case 'projects':
          if (typeof app !== 'undefined' && app.loadProjects) {
            await app.loadProjects();
          }
          break;
          
        case 'admin':
          if (typeof adminManager !== 'undefined' && adminManager.loadAdminPage) {
            await adminManager.loadAdminPage();
          }
          break;
      }
    } catch (error) {
      console.error('Load page data error:', error);
    }
  }
}

// Створити глобальний екземпляр
const uiManager = new UIManager();

// Експорт
if (typeof window !== 'undefined') {
  window.uiManager = uiManager;
  window.showPage = (page) => uiManager.showPage(page);
}

console.log('✅ UI Manager loaded');
