// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Admin Module - ИСПРАВЛЕННАЯ ВЕРСИЯ
// Админ панель: управление пользователями, board members, финансы
// ТОЛЬКО для Owner + 3 Founders + Guardians из контракта
// Date: 2025-01-19 - FIXED
// ═══════════════════════════════════════════════════════════════════

const adminModule = {
  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  contracts: {},
  
  access: {
    isOwner: false,
    isFounder: false,
    isGuardian: false,
    level: 'No Access'
  },

  state: {
    stats: {
      totalUsers: 0,
      activeUsers: 0,
      contractBalance: '0',
      totalVolume: '0',
      totalIDs: 0
    },
    boardMembers: []
  },

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('⚙️ Initializing Admin Panel...');
    
    try {
      if (!app.state.userAddress) {
        this.showAccessDenied();
        return;
      }

      // Загружаем контракты
      await this.loadContracts();
      
      // СТРОГАЯ ПРОВЕРКА ПРАВ
      const hasAccess = await this.checkRights();
      
      if (!hasAccess) {
        this.showAccessDenied();
        return;
      }

      // Загружаем данные
      await this.loadAllData();

      // Инициализируем UI
      this.initUI();

      console.log('✅ Admin panel loaded');
    } catch (error) {
      console.error('❌ Admin init error:', error);
      app.showNotification('Ошибка загрузки админ панели', 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПРОВЕРКА ПРАВ ДОСТУПА
  // ═══════════════════════════════════════════════════════════════
  async checkRights() {
    if (!app.state.userAddress) {
      console.error('❌ No wallet connected');
      return false;
    }

    const currentAddress = app.state.userAddress.toLowerCase();

    // 1️⃣ Проверяем Owner из CONFIG
    const isOwner = currentAddress === CONFIG.ADMIN.owner.toLowerCase();
    
    // 2️⃣ Проверяем Founders из CONFIG (первые 3)
    const isFounder = CONFIG.ADMIN.founders.slice(0, 3)
      .map(f => f.toLowerCase())
      .includes(currentAddress);
    
    // 3️⃣ Проверяем через смарт-контракт GlobalWayGovernance
    let isGuardian = false;
    if (this.contracts.governance) {
      try {
        isGuardian = await this.contracts.governance.isGuardian(app.state.userAddress);
        console.log('🔐 Guardian check from contract:', isGuardian);
      } catch (error) {
        console.error('❌ Error checking guardian status:', error);
      }
    }

    // ✅ Доступ есть если: Owner, Founder или Guardian
    const hasAccess = isOwner || isFounder || isGuardian;

    if (!hasAccess) {
      console.error('❌ ADMIN ACCESS DENIED for:', app.state.userAddress);
      console.log('   Owner:', isOwner);
      console.log('   Founder:', isFounder);
      console.log('   Guardian:', isGuardian);
      return false;
    }

    // Определяем уровень прав
    this.access.isOwner = isOwner;
    this.access.isFounder = isFounder;
    this.access.isGuardian = isGuardian;
    
    this.access.level = isOwner ? 'Owner' : 
                       isFounder ? 'Founder' : 
                       'Guardian';

    console.log('✅ Admin access granted:', this.access.level);
    console.log('🔐 Address:', app.state.userAddress);

    // Обновляем UI
    this.updateAccessUI();

    return true;
  },

  updateAccessUI() {
    const accountEl = document.getElementById('adminCurrentAccount');
    const levelEl = document.getElementById('adminRightsLevel');

    if (accountEl) accountEl.textContent = app.formatAddress(app.state.userAddress);
    if (levelEl) levelEl.textContent = this.access.level;
  },

  showAccessDenied() {
    const adminPage = document.querySelector('.admin-page');
    if (!adminPage) return;

    adminPage.innerHTML = `
      <div style="text-align: center; padding: 50px;">
        <h2>🔒 Доступ Запрещен</h2>
        <p style="color: #ff4444; font-weight: bold; margin: 20px 0;">
          Админ панель доступна только Owner, Founders (первые 3) и Guardians.
        </p>
        <p>Ваш адрес: <code>${app.state.userAddress || 'Не подключен'}</code></p>
        
        <div style="margin-top: 30px; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto;">
          <p><strong>Разрешенные адреса:</strong></p>
          <ul style="list-style: none; padding: 0;">
            <li>👑 <strong>Owner:</strong> <code>${CONFIG.ADMIN.owner}</code></li>
            <li>🔥 <strong>Founder 1 (ID: 7777777):</strong> <code>${CONFIG.ADMIN.founders[0]}</code></li>
            <li>🔥 <strong>Founder 2 (ID: 5555555):</strong> <code>${CONFIG.ADMIN.founders[1]}</code></li>
            <li>🔥 <strong>Founder 3 (ID: 9999999):</strong> <code>${CONFIG.ADMIN.founders[2]}</code></li>
            <li>🛡️ <strong>+ Guardians из контракта GlobalWayGovernance</strong></li>
          </ul>
        </div>
        
        <p style="margin-top: 30px;">
          <button class="btn-secondary" onclick="app.showPage('dashboard')">← Вернуться на главную</button>
        </p>
      </div>
    `;
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА КОНТРАКТОВ
  // ═══════════════════════════════════════════════════════════════
  async loadContracts() {
    console.log('📥 Loading contracts for admin...');
    
    this.contracts.globalWay = await app.getContract('GlobalWay');
    this.contracts.matrixRegistry = await app.getContract('MatrixRegistry');
    
    // Governance - опционально
    try {
      this.contracts.governance = await app.getContract('GlobalWayGovernance');
      console.log('✅ Governance contract loaded');
    } catch (e) {
      console.log('⚠️ Governance contract not available');
      this.contracts.governance = null;
    }
    
    console.log('✅ All admin contracts loaded');
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА ДАННЫХ
  // ═══════════════════════════════════════════════════════════════
  async loadAllData() {
    await Promise.all([
      this.loadStats(),
      this.loadBoardMembers()
    ]);
  },

  // ═══════════════════════════════════════════════════════════════
  // СТАТИСТИКА
  // ═══════════════════════════════════════════════════════════════
  async loadStats() {
    try {
      console.log('📊 Loading admin stats...');

      // Общее количество пользователей
      let totalUsers = 0;
      try {
        totalUsers = Number(await this.contracts.globalWay.getTotalUsers());
      } catch (e) {
        console.error('Error getting total users:', e);
      }

      // Баланс контракта GlobalWay
      let contractBalance = '0';
      try {
        const balance = await app.provider.getBalance(CONFIG.CONTRACTS.GlobalWay);
        contractBalance = ethers.utils.formatEther(balance);
      } catch (e) {
        console.error('Error getting balance:', e);
      }

      // Total volume (можно получить из событий)
      let totalVolume = '0';
      
      this.state.stats = {
        totalUsers,
        activeUsers: 0, // TODO: подсчитать активных
        contractBalance,
        totalVolume,
        totalIDs: totalUsers
      };

      console.log('✅ Stats loaded:', this.state.stats);
      
      this.updateStatsUI();
      
    } catch (error) {
      console.error('❌ Error loading stats:', error);
      this.updateStatsUI();
    }
  },

  updateStatsUI() {
    const { totalUsers, activeUsers, contractBalance, totalVolume, totalIDs } = this.state.stats;

    const elements = {
      adminTotalUsers: totalUsers,
      adminActiveUsers: activeUsers || '-',
      adminContractBalance: `${app.formatNumber(contractBalance, 4)} BNB`,
      adminTotalVolume: `${app.formatNumber(totalVolume, 4)} BNB`,
      totalIdsAssigned: totalIDs
    };

    Object.entries(elements).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
  },

  // ═══════════════════════════════════════════════════════════════
  // BOARD MEMBERS (GUARDIANS)
  // ═══════════════════════════════════════════════════════════════
  async loadBoardMembers() {
    try {
      console.log('📋 Loading board members...');

      let members = [];
      
      if (this.contracts.governance) {
        try {
          // Получаем guardians из контракта
          const guardiansCount = await this.contracts.governance.guardiansCount();
          
          for (let i = 0; i < guardiansCount; i++) {
            const guardian = await this.contracts.governance.guardians(i);
            members.push(guardian);
          }
        } catch (e) {
          console.error('Error loading guardians:', e);
        }
      }
      
      this.state.boardMembers = members;

      console.log('✅ Board members loaded:', members.length);
      
      this.updateBoardUI();
      
    } catch (error) {
      console.error('❌ Error loading board members:', error);
      this.updateBoardUI();
    }
  },

  updateBoardUI() {
    const listEl = document.getElementById('boardMembersList');
    const totalEl = document.getElementById('totalBoardMembers');

    if (totalEl) totalEl.textContent = this.state.boardMembers.length;

    if (!listEl) return;

    if (this.state.boardMembers.length === 0) {
      listEl.innerHTML = '<div class="no-data">Нет board members</div>';
      return;
    }

    listEl.innerHTML = this.state.boardMembers.map((address, index) => `
      <div class="board-member-card">
        <div class="member-info">
          <span class="member-number">#${index + 1}</span>
          <span class="member-address">${address}</span>
          <span class="member-short">${app.formatAddress(address)}</span>
        </div>
        <button class="btn-small btn-copy" onclick="app.copyToClipboard('${address}')">
          📋 Copy
        </button>
      </div>
    `).join('');
  },

  // ═══════════════════════════════════════════════════════════════
  // УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ
  // ═══════════════════════════════════════════════════════════════
  async lookupUser() {
    const addressInput = document.getElementById('lookupAddress');
    if (!addressInput || !addressInput.value) {
      app.showNotification('Введите адрес', 'error');
      return;
    }

    const address = addressInput.value.trim();

    if (!ethers.utils.isAddress(address)) {
      app.showNotification('Неверный адрес', 'error');
      return;
    }

    try {
      app.showNotification('Поиск пользователя...', 'info');

      // Проверяем регистрацию
      const isRegistered = await this.contracts.matrixRegistry.isRegistered(address);

      if (!isRegistered) {
        app.showNotification('Пользователь не зарегистрирован', 'error');
        return;
      }

      // Получаем данные
      const userId = await this.contracts.matrixRegistry.getUserIdByAddress(address);
      const maxLevel = await this.contracts.globalWay.getUserMaxLevel(address);

      // Показываем результат
      const resultEl = document.getElementById('lookupResult');
      if (resultEl) {
        resultEl.innerHTML = `
          <div class="lookup-result">
            <h4>Информация о пользователе</h4>
            <p><strong>Адрес:</strong> ${address}</p>
            <p><strong>ID:</strong> GW${userId.toString()}</p>
            <p><strong>Максимальный уровень:</strong> ${maxLevel}</p>
          </div>
        `;
        resultEl.style.display = 'block';
      }

      app.showNotification('Пользователь найден!', 'success');

    } catch (error) {
      console.error('Lookup error:', error);
      app.showNotification('Ошибка поиска: ' + error.message, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // УПРАВЛЕНИЕ КОНТРАКТОМ
  // ═══════════════════════════════════════════════════════════════
  async pauseContract() {
    if (!this.access.isOwner) {
      app.showNotification('Только Owner может ставить на паузу', 'error');
      return;
    }

    const confirmed = confirm('Поставить контракт на паузу?');
    if (!confirmed) return;

    try {
      app.showNotification('Постановка на паузу...', 'info');

      const contract = await app.getSignedContract('GlobalWay');
      const tx = await contract.pause();
      await tx.wait();

      app.showNotification('Контракт на паузе! ⏸️', 'success');

    } catch (error) {
      console.error('Pause error:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  async unpauseContract() {
    if (!this.access.isOwner) {
      app.showNotification('Только Owner может снять паузу', 'error');
      return;
    }

    const confirmed = confirm('Снять контракт с паузы?');
    if (!confirmed) return;

    try {
      app.showNotification('Снятие с паузы...', 'info');

      const contract = await app.getSignedContract('GlobalWay');
      const tx = await contract.unpause();
      await tx.wait();

      app.showNotification('Контракт активен! ▶️', 'success');

    } catch (error) {
      console.error('Unpause error:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  async emergencyWithdraw() {
    if (!this.access.isOwner) {
      app.showNotification('Только Owner может выполнить экстренный вывод', 'error');
      return;
    }

    const confirmed = confirm(
      '⚠️ ЭКСТРЕННЫЙ ВЫВОД ⚠️\n\n' +
      'Вывести все средства из контракта?\n\n' +
      'Это действие необратимо!'
    );

    if (!confirmed) return;

    try {
      app.showNotification('Экстренный вывод...', 'info');

      const contract = await app.getSignedContract('GlobalWay');
      const tx = await contract.emergencyWithdraw();
      await tx.wait();

      app.showNotification('Средства выведены! 💰', 'success');
      
      await this.loadStats();

    } catch (error) {
      console.error('Emergency withdraw error:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BOARD MEMBERS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  async addBoardMember() {
    if (!this.access.isOwner) {
      app.showNotification('Только Owner может добавлять board members', 'error');
      return;
    }

    if (!this.contracts.governance) {
      app.showNotification('Контракт Governance не доступен', 'error');
      return;
    }

    const address = prompt('Введите адрес нового board member:');
    if (!address) return;

    if (!ethers.utils.isAddress(address)) {
      app.showNotification('Неверный адрес', 'error');
      return;
    }

    try {
      app.showNotification('Добавление board member...', 'info');

      const contract = await app.getSignedContract('GlobalWayGovernance');
      const tx = await contract.addGuardian(address);
      await tx.wait();

      app.showNotification('Board member добавлен! ✅', 'success');
      
      await this.loadBoardMembers();

    } catch (error) {
      console.error('Add board member error:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  async removeBoardMember() {
    if (!this.access.isOwner) {
      app.showNotification('Только Owner может удалять board members', 'error');
      return;
    }

    if (!this.contracts.governance) {
      app.showNotification('Контракт Governance не доступен', 'error');
      return;
    }

    const address = prompt('Введите адрес board member для удаления:');
    if (!address) return;

    if (!ethers.utils.isAddress(address)) {
      app.showNotification('Неверный адрес', 'error');
      return;
    }

    try {
      app.showNotification('Удаление board member...', 'info');

      const contract = await app.getSignedContract('GlobalWayGovernance');
      const tx = await contract.removeGuardian(address);
      await tx.wait();

      app.showNotification('Board member удален! ✅', 'success');
      
      await this.loadBoardMembers();

    } catch (error) {
      console.error('Remove board member error:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // UI ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  initUI() {
    console.log('🎨 Initializing Admin UI...');

    // User Lookup
    const lookupBtn = document.getElementById('lookupBtn');
    if (lookupBtn) {
      lookupBtn.onclick = () => this.lookupUser();
    }

    // Contract Management
    const pauseBtn = document.getElementById('pauseContractBtn');
    if (pauseBtn) {
      pauseBtn.onclick = () => this.pauseContract();
    }

    const unpauseBtn = document.getElementById('unpauseContractBtn');
    if (unpauseBtn) {
      unpauseBtn.onclick = () => this.unpauseContract();
    }

    // Emergency Withdraw
    const emergencyBtn = document.getElementById('emergencyWithdrawBtn');
    if (emergencyBtn) {
      emergencyBtn.onclick = () => this.emergencyWithdraw();
    }

    // Board Members Management
    const addBoardBtn = document.getElementById('addBoardMemberBtn');
    if (addBoardBtn) {
      addBoardBtn.onclick = () => this.addBoardMember();
    }

    const removeBoardBtn = document.getElementById('removeBoardMemberBtn');
    if (removeBoardBtn) {
      removeBoardBtn.onclick = () => this.removeBoardMember();
    }

    const refreshBoardBtn = document.getElementById('refreshBoardBtn');
    if (refreshBoardBtn) {
      refreshBoardBtn.onclick = () => this.loadBoardMembers();
    }

    // Refresh Stats
    const refreshStatsBtn = document.getElementById('refreshStatsBtn');
    if (refreshStatsBtn) {
      refreshStatsBtn.onclick = () => this.loadStats();
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ОБНОВЛЕНИЕ ДАННЫХ
  // ═══════════════════════════════════════════════════════════════
  async refresh() {
    console.log('🔄 Refreshing admin data...');
    await this.loadAllData();
  }
};

// Экспорт в window
window.adminModule = adminModule;
