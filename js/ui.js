/* jshint esversion: 8 */
/* global web3Manager, contracts, Utils, CONFIG */

/**
 * UI Manager - Управління інтерфейсом
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
    
    // Перевірка збереженої сторінки
    const savedPage = Utils.getStorage('currentPage');
    if (savedPage) {
      this.currentPage = savedPage;
    }
    
    this.initialized = true;
    console.log('✅ UI Manager initialized');
  }

  /**
   * Налаштування навігації
   */
  setupNavigation() {
    // Desktop navigation
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
   * Показати сторінку
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

    // Приховати всі сторінки
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
      page.classList.remove('active');
      page.style.display = 'none';
    });

    // Показати потрібну сторінку
    const targetPage = document.getElementById(pageName);
    if (targetPage) {
      targetPage.style.display = 'block';
      setTimeout(() => {
        targetPage.classList.add('active');
      }, 10);
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
    // Desktop navigation
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

  /**
   * Завантажити дані користувача
   */
  async loadUserData() {
    if (!web3Manager.connected || !contracts.initialized) {
      console.log('⚠️ Cannot load user data - wallet not connected or contracts not initialized');
      return;
    }

    try {
      const address = web3Manager.address;
      
      console.log('📊 Loading user data for:', address);

      // Базова інформація
      const balance = await web3Manager.provider.getBalance(address);
      const userInfo = await contracts.getUserInfo(address);

      this.userData = {
        address: address,
        balance: ethers.utils.formatEther(balance),
        userId: userInfo.id || '',
        sponsorId: userInfo.sponsorId || '',
        refAddress: userInfo.refAddress || ethers.constants.AddressZero,
        registrationTime: userInfo.registrationTime || 0,
        rankLevel: userInfo.rankLevel || 0,
        activeLevel: userInfo.activeLevel || 0,
        partnersCount: userInfo.partnersCount || 0,
        isRegistered: userInfo.id && userInfo.id !== '' && userInfo.id !== '0'
      };

      console.log('✅ User data loaded:', this.userData);

      // Оновити UI
      await this.updateUI();

    } catch (error) {
      console.error('❌ Load user data failed:', error);
    }
  }

  /**
   * Оновити UI елементи
   */
  async updateUI() {
    if (!this.userData) return;

    try {
      // User Address
      const addressElements = document.querySelectorAll('.user-address');
      addressElements.forEach(el => {
        el.textContent = Utils.formatAddress(this.userData.address);
      });

      // User Balance
      const balanceElements = document.querySelectorAll('.user-balance');
      balanceElements.forEach(el => {
        el.textContent = `${Utils.formatBNB(this.userData.balance)} BNB`;
      });

      // User ID
      const userIdElements = document.querySelectorAll('.user-id');
      userIdElements.forEach(el => {
        el.textContent = Utils.formatUserId(this.userData.userId);
      });

      // User Rank
      const rankElements = document.querySelectorAll('.user-rank');
      rankElements.forEach(el => {
        el.textContent = Utils.getRankName(this.userData.rankLevel);
      });

      // Active Level
      const levelElements = document.querySelectorAll('.active-level');
      levelElements.forEach(el => {
        el.textContent = this.userData.activeLevel;
      });

      // Partners Count
      const partnersElements = document.querySelectorAll('.partners-count');
      partnersElements.forEach(el => {
        el.textContent = this.userData.partnersCount;
      });

      // Referral Link
      if (this.userData.userId && this.userData.userId !== '') {
        const refLink = `${window.location.origin}?ref=${this.userData.userId}`;
        const refLinkElements = document.querySelectorAll('.ref-link');
        refLinkElements.forEach(el => {
          if (el.tagName === 'INPUT') {
            el.value = refLink;
          } else {
            el.textContent = refLink;
          }
        });
      }

      console.log('✅ UI updated');

    } catch (error) {
      console.error('Update UI error:', error);
    }
  }

  /**
   * Показати/приховати header навігацію
   */
  toggleHeader(show) {
    const header = document.querySelector('.header');
    if (header) {
      if (show) {
        header.style.display = 'block';
      } else {
        header.style.display = 'none';
      }
    }
  }

  /**
   * Показати/приховати footer
   */
  toggleFooter(show) {
    const footer = document.querySelector('.footer');
    if (footer) {
      if (show) {
        footer.style.display = 'block';
      } else {
        footer.style.display = 'none';
      }
    }
  }

  /**
   * Режим landing (приховати навігацію)
   */
  setLandingMode() {
    this.toggleHeader(false);
    this.showPage('landing');
  }

  /**
   * Режим dashboard (показати навігацію)
   */
  setDashboardMode() {
    this.toggleHeader(true);
    this.showPage('dashboard');
  }

  /**
   * Оновити статус підключення в UI
   */
  updateConnectionStatus(connected) {
    const connectBtn = document.getElementById('connectWallet');
    
    if (connectBtn) {
      if (connected && web3Manager.address) {
        connectBtn.textContent = Utils.formatAddress(web3Manager.address);
        connectBtn.classList.add('connected');
      } else {
        connectBtn.textContent = 'Connect Wallet';
        connectBtn.classList.remove('connected');
      }
    }

    // Показати/приховати елементи в залежності від підключення
    const connectedOnly = document.querySelectorAll('.connected-only');
    const disconnectedOnly = document.querySelectorAll('.disconnected-only');

    connectedOnly.forEach(el => {
      el.style.display = connected ? 'block' : 'none';
    });

    disconnectedOnly.forEach(el => {
      el.style.display = connected ? 'none' : 'block';
    });
  }

  /**
   * Показати помилку мережі
   */
  showNetworkError() {
    Utils.showNotification(
      `Wrong network. Please switch to ${CONFIG.NETWORK.name}`,
      'error',
      5000
    );

    // Показати кнопку переключення мережі
    const switchBtn = document.getElementById('switchNetworkBtn');
    if (switchBtn) {
      switchBtn.style.display = 'block';
    }
  }

  /**
   * Приховати помилку мережі
   */
  hideNetworkError() {
    const switchBtn = document.getElementById('switchNetworkBtn');
    if (switchBtn) {
      switchBtn.style.display = 'none';
    }
  }

  /**
   * Показати skeleton loader для таблиць
   */
  showTableSkeleton(tableId, rows = 5) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    for (let i = 0; i < rows; i++) {
      const tr = document.createElement('tr');
      tr.className = 'skeleton-row';
      
      const colCount = table.querySelectorAll('thead th').length;
      
      for (let j = 0; j < colCount; j++) {
        const td = document.createElement('td');
        td.innerHTML = '<div class="skeleton-line"></div>';
        tr.appendChild(td);
      }
      
      tbody.appendChild(tr);
    }
  }

  /**
   * Показати порожній стан таблиці
   */
  showTableEmpty(tableId, message = 'No data available') {
    const table = document.getElementById(tableId);
    if (!table) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const colCount = table.querySelectorAll('thead th').length;

    tbody.innerHTML = `
      <tr>
        <td colspan="${colCount}" class="text-center empty-state">
          ${message}
        </td>
      </tr>
    `;
  }

  /**
   * Додати рядок в таблицю
   */
  addTableRow(tableId, rowData) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    // Видалити skeleton або empty state
    const skeleton = tbody.querySelector('.skeleton-row');
    const empty = tbody.querySelector('.empty-state');
    if (skeleton) tbody.innerHTML = '';
    if (empty) tbody.innerHTML = '';

    const tr = document.createElement('tr');
    
    rowData.forEach(cellData => {
      const td = document.createElement('td');
      td.innerHTML = cellData;
      tr.appendChild(td);
    });
    
    tbody.appendChild(tr);
  }

  /**
   * Очистити таблицю
   */
  clearTable(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const tbody = table.querySelector('tbody');
    if (tbody) {
      tbody.innerHTML = '';
    }
  }

  /**
   * Оновити значення елемента
   */
  updateElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.value = value;
      } else {
        element.textContent = value;
      }
    }
  }

  /**
   * Показати/приховати елемент
   */
  toggleElement(elementId, show) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = show ? 'block' : 'none';
    }
  }

  /**
   * Додати клас до елемента
   */
  addClass(elementId, className) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.add(className);
    }
  }

  /**
   * Видалити клас з елемента
   */
  removeClass(elementId, className) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.remove(className);
    }
  }

  /**
   * Показати badge з повідомленням (для навігації)
   */
  showNavBadge(pageName, count) {
    const navLink = document.querySelector(`.nav-link[data-page="${pageName}"]`);
    if (!navLink) return;

    let badge = navLink.querySelector('.nav-badge');
    
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'nav-badge';
      navLink.appendChild(badge);
    }

    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  }

  /**
   * Приховати badge
   */
  hideNavBadge(pageName) {
    const navLink = document.querySelector(`.nav-link[data-page="${pageName}"]`);
    if (!navLink) return;

    const badge = navLink.querySelector('.nav-badge');
    if (badge) {
      badge.style.display = 'none';
    }
  }

  /**
   * Форматувати HTML для відображення транзакції
   */
  formatTransactionRow(tx) {
    return `
      <tr>
        <td>${Utils.formatDateShort(tx.timestamp)}</td>
        <td><span class="tx-type ${tx.type}">${tx.type}</span></td>
        <td>${Utils.formatBNB(tx.amount)} BNB</td>
        <td>
          <a href="${Utils.getExplorerLink(tx.hash)}" target="_blank" rel="noopener">
            ${Utils.formatAddress(tx.hash)}
          </a>
        </td>
        <td><span class="tx-status ${tx.status}">${tx.status}</span></td>
      </tr>
    `;
  }

  /**
   * Форматувати рядок партнера
   */
  formatPartnerRow(partner) {
    return `
      <tr>
        <td>${Utils.formatUserId(partner.id)}</td>
        <td>${Utils.formatAddress(partner.address)}</td>
        <td>${partner.level}</td>
        <td><span class="rank-badge rank-${partner.rank}">${Utils.getRankName(partner.rank)}</span></td>
        <td>${partner.partners}</td>
        <td>${Utils.formatDateShort(partner.joinDate)}</td>
      </tr>
    `;
  }

  /**
   * Показати прогрес бар
   */
  showProgressBar(elementId, current, total) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const percentage = total > 0 ? (current / total) * 100 : 0;
    
    element.innerHTML = `
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percentage}%"></div>
      </div>
      <div class="progress-text">${current} / ${total}</div>
    `;
  }

  /**
   * Показати статистичну картку
   */
  showStatCard(containerId, stats) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = stats.map(stat => `
      <div class="stat-card">
        <div class="stat-icon">${stat.icon}</div>
        <div class="stat-value">${stat.value}</div>
        <div class="stat-label">${stat.label}</div>
      </div>
    `).join('');
  }

  /**
   * Анімація зміни числа
   */
  animateNumber(elementId, from, to, duration = 1000) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const start = Date.now();
    const range = to - from;

    const update = () => {
      const now = Date.now();
      const progress = Math.min((now - start) / duration, 1);
      const current = from + (range * progress);
      
      element.textContent = Math.floor(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  }
}

// Створити глобальний екземпляр
const uiManager = new UIManager();

// Експорт для використання в інших модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIManager;
}
