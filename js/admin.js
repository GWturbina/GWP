// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Admin Module - FIXED VERSION
// Админ панель: управление пользователями, board members, финансы
// ТОЛЬКО для Owner + 3 Guardians из CONFIG
// Date: 2025-12-11 - FIXED
// ═══════════════════════════════════════════════════════════════════

const adminModule = {
  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  contracts: {},
  
  access: {
    isOwner: false,
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
        console.log('❌ No wallet connected');
        this.showAccessDenied();
        return;
      }

      // СТРОГАЯ ПРОВЕРКА ПРАВ (без загрузки контрактов)
      const hasAccess = this.checkRights();
      
      if (!hasAccess) {
        this.showAccessDenied();
        return;
      }

      // Загружаем контракты только если есть доступ
      await this.loadContracts();

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
  // ПРОВЕРКА ПРАВ ДОСТУПА (без контракта - только CONFIG)
  // ═══════════════════════════════════════════════════════════════
  checkRights() {
    if (!app.state.userAddress) {
      console.error('❌ No wallet connected');
      return false;
    }

    const currentAddress = app.state.userAddress.toLowerCase();
    
    console.log('🔐 Checking admin access for:', currentAddress);

    // 1️⃣ Проверяем Owner из CONFIG
    const ownerAddress = CONFIG.ADMIN.owner.toLowerCase();
    const isOwner = currentAddress === ownerAddress;
    console.log('   Owner check:', isOwner, '(owner:', ownerAddress, ')');
    
    // 2️⃣ Проверяем Guardians из CONFIG (первые 3)
    const guardians = CONFIG.ADMIN.guardians.map(g => g.toLowerCase());
    const isGuardian = guardians.includes(currentAddress);
    console.log('   Guardian check:', isGuardian);
    console.log('   Guardians list:', guardians);

    // ✅ Доступ есть если: Owner или Guardian
    const hasAccess = isOwner || isGuardian;

    if (!hasAccess) {
      console.error('❌ ADMIN ACCESS DENIED for:', currentAddress);
      return false;
    }

    // Сохраняем уровень прав
    this.access.isOwner = isOwner;
    this.access.isGuardian = isGuardian;
    this.access.level = isOwner ? 'Owner' : 'Guardian';

    console.log('✅ Admin access granted:', this.access.level);

    // Обновляем UI
    this.updateAccessUI();

    return true;
  },

  // ═══════════════════════════════════════════════════════════════
  // ПРОВЕРКА ДОСТУПА (для показа кнопки в навигации)
  // ═══════════════════════════════════════════════════════════════
  hasAccessStatic(address) {
    if (!address) return false;
    
    const addr = address.toLowerCase();
    const owner = CONFIG.ADMIN.owner.toLowerCase();
    const guardians = CONFIG.ADMIN.guardians.map(g => g.toLowerCase());
    
    return addr === owner || guardians.includes(addr);
  },

  updateAccessUI() {
    const accountEl = document.getElementById('adminCurrentAccount');
    const levelEl = document.getElementById('adminRightsLevel');

    if (accountEl) accountEl.textContent = app.formatAddress(app.state.userAddress);
    if (levelEl) levelEl.textContent = this.access.level;
  },

  showAccessDenied() {
    const adminPage = document.querySelector('.admin-page');
    if (!adminPage) {
      console.error('❌ Admin page container not found');
      return;
    }

    const guardiansList = CONFIG.ADMIN.guardians
      .map((g, i) => `<li>🛡️ <strong>Guardian ${i + 1}:</strong> <code>${g}</code></li>`)
      .join('');

    adminPage.innerHTML = `
      <div style="text-align: center; padding: 50px; color: #fff;">
        <h2 style="color: #ff4444;">🔒 Доступ Запрещен</h2>
        <p style="color: #ff4444; font-weight: bold; margin: 20px 0;">
          Админ панель доступна только для Owner и Guardians.
        </p>
        <p>Ваш адрес: <code style="background: #333; padding: 5px 10px; border-radius: 5px;">${app.state.userAddress || 'Не подключен'}</code></p>
        
        <div style="margin-top: 30px; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto; background: #1a1a2e; padding: 20px; border-radius: 10px; border: 1px solid #333;">
          <p style="color: #ffd700;"><strong>Разрешенные адреса:</strong></p>
          <ul style="list-style: none; padding: 0; line-height: 2;">
            <li>👑 <strong>Owner:</strong> <code>${CONFIG.ADMIN.owner}</code></li>
            ${guardiansList}
          </ul>
        </div>
        
        <p style="margin-top: 30px;">
          <button class="btn-secondary" onclick="app.showPage('dashboard')" style="padding: 10px 20px; background: #ffd700; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
            ← Вернуться на главную
          </button>
        </p>
      </div>
    `;
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА КОНТРАКТОВ
  // ═══════════════════════════════════════════════════════════════
  async loadContracts() {
    console.log('📥 Loading contracts for admin...');
    
    try {
      this.contracts.globalWay = await app.getContract('GlobalWay');
      this.contracts.matrixRegistry = await app.getContract('MatrixRegistry');
      console.log('✅ Core contracts loaded');
    } catch (e) {
      console.error('❌ Error loading core contracts:', e);
    }
    
    // Governance - опционально
    try {
      this.contracts.governance = await app.getContract('GlobalWayGovernance');
      console.log('✅ Governance contract loaded');
    } catch (e) {
      console.log('⚠️ Governance contract not available');
      this.contracts.governance = null;
    }
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
        if (this.contracts.globalWay) {
          totalUsers = Number(await this.contracts.globalWay.getTotalUsers());
        }
      } catch (e) {
        console.error('Error getting total users:', e);
      }

      // Баланс контракта GlobalWay
      let contractBalance = '0';
      try {
        const balance = await window.web3Manager.provider.getBalance(CONFIG.CONTRACTS.GlobalWay);
        contractBalance = ethers.utils.formatEther(balance);
      } catch (e) {
        console.error('Error getting balance:', e);
      }

      this.state.stats = {
        totalUsers,
        activeUsers: 0,
        contractBalance,
        totalVolume: '0',
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
      adminContractBalance: `${parseFloat(contractBalance).toFixed(4)} BNB`,
      adminTotalVolume: `${parseFloat(totalVolume).toFixed(4)} BNB`,
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

      // Используем guardians из CONFIG
      const members = CONFIG.ADMIN.guardians;
      
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
      <div class="board-member-card" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; margin: 10px 0; background: #1a1a2e; border-radius: 8px; border: 1px solid #333;">
        <div class="member-info">
          <span class="member-number" style="color: #ffd700; font-weight: bold;">#${index + 1}</span>
          <span class="member-address" style="margin-left: 15px; font-family: monospace;">${address}</span>
        </div>
        <button class="btn-small btn-copy" onclick="navigator.clipboard.writeText('${address}'); app.showNotification('Скопировано!', 'success');" style="padding: 5px 10px; background: #333; border: 1px solid #ffd700; color: #ffd700; border-radius: 5px; cursor: pointer;">
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
          <div class="lookup-result" style="background: #1a2a1e; border: 1px solid #00ff88; padding: 20px; border-radius: 10px; margin-top: 15px;">
            <h4 style="color: #00ff88; margin-top: 0;">✅ Информация о пользователе</h4>
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
  // УПРАВЛЕНИЕ КОНТРАКТОМ (только Owner)
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
  // UI ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  initUI() {
    console.log('🎨 Initializing Admin UI...');

    // User Lookup
    const lookupBtn = document.getElementById('lookupBtn');
    if (lookupBtn) {
      lookupBtn.onclick = () => this.lookupUser();
    }

    // Enter key for lookup
    const lookupInput = document.getElementById('lookupAddress');
    if (lookupInput) {
      lookupInput.onkeypress = (e) => {
        if (e.key === 'Enter') this.lookupUser();
      };
    }

    // Contract Management (только для Owner)
    if (this.access.isOwner) {
      const pauseBtn = document.getElementById('pauseContractBtn');
      if (pauseBtn) pauseBtn.onclick = () => this.pauseContract();

      const unpauseBtn = document.getElementById('unpauseContractBtn');
      if (unpauseBtn) unpauseBtn.onclick = () => this.unpauseContract();

      const emergencyBtn = document.getElementById('emergencyWithdrawBtn');
      if (emergencyBtn) emergencyBtn.onclick = () => this.emergencyWithdraw();
    }

    // Refresh buttons
    const refreshStatsBtn = document.getElementById('refreshStatsBtn');
    if (refreshStatsBtn) {
      refreshStatsBtn.onclick = () => this.loadStats();
    }

    const refreshBoardBtn = document.getElementById('refreshBoardBtn');
    if (refreshBoardBtn) {
      refreshBoardBtn.onclick = () => this.loadBoardMembers();
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

// Функция для проверки доступа (для использования в app.js)
window.checkAdminAccess = function(address) {
  if (!address) return false;
  
  const addr = address.toLowerCase();
  const owner = CONFIG.ADMIN.owner.toLowerCase();
  const guardians = CONFIG.ADMIN.guardians.map(g => g.toLowerCase());
  
  return addr === owner || guardians.includes(addr);
};
