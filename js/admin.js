// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Admin Module
// Админ панель: управление пользователями, board members, финансы
// ТОЛЬКО для Owner + 3 Founders + Guardians из контракта
// ═══════════════════════════════════════════════════════════════════

const adminModule = {
  // Контракты
  contracts: {},
  
  // Права доступа
  access: {
    isOwner: false,
    isFounder: false,
    isGuardian: false,
    level: 'No Access'
  },

  // Состояние
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
      // Сначала загружаем контракты
      await this.loadContracts();
      
      // СТРОГАЯ ПРОВЕРКА ПРАВ (через смарт-контракт)
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
  // ПРОВЕРКА ПРАВ ДОСТУПА (ЧЕРЕЗ СМАРТ-КОНТРАКТ + CONFIG)
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
    const allowedFounders = CONFIG.ADMIN.founders
      .slice(0, 3)
      .map(f => f.address?.toLowerCase())
      .filter(addr => addr);
    
    const isFounder = allowedFounders.includes(currentAddress);
    
    // 3️⃣ КРИТИЧНО: Проверяем через смарт-контракт GlobalWayGovernance
    let isGuardian = false;
    try {
      isGuardian = await this.contracts.governance.isGuardian(app.state.userAddress);
      console.log('🔐 Guardian check from contract:', isGuardian);
    } catch (error) {
      console.error('❌ Error checking guardian status:', error);
    }

    // ✅ Доступ есть если:
    // - Owner из CONFIG
    // - Founder из CONFIG (первые 3)
    // - Guardian из смарт-контракта
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
          Админ панель доступна только Owner, Founders и Guardians.
        </p>
        <p>Ваш адрес: <code>${app.state.userAddress || 'Не подключен'}</code></p>
        
        <div style="margin-top: 30px; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto;">
          <p><strong>Разрешенные адреса:</strong></p>
          <ul style="list-style: none; padding: 0;">
            <li>👑 <strong>Owner:</strong> <code>${CONFIG.ADMIN.owner}</code></li>
            <li>🔥 <strong>Founder 1 (ID: 7777777):</strong> <code>${CONFIG.ADMIN.founders[0]?.address || 'N/A'}</code></li>
            <li>🔥 <strong>Founder 2 (ID: 5555555):</strong> <code>${CONFIG.ADMIN.founders[1]?.address || 'N/A'}</code></li>
            <li>🔥 <strong>Founder 3 (ID: 9999999):</strong> <code>${CONFIG.ADMIN.founders[2]?.address || 'N/A'}</code></li>
            <li>🛡️ <strong>+ Guardians из контракта GlobalWayGovernance</strong></li>
          </ul>
        </div>
        
        <p style="margin-top: 30px;">
          <button class="btn-secondary" onclick="app.showPage('dashboard')">← Вернуться на главную</button>
        </p>
      </div>
    `;
  },

  // Загрузка контрактов
  async loadContracts() {
    this.contracts.globalWay = await app.getContract('GlobalWay');
    this.contracts.helper = await app.getContract('GlobalWayHelper');
    this.contracts.governance = await app.getContract('GlobalWayGovernance');
    this.contracts.marketing = await app.getContract('GlobalWayMarketing');
    this.contracts.quarterly = await app.getContract('GlobalWayQuarterly');
    this.contracts.stats = await app.getContract('GlobalWayStats');
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

  // Статистика
  async loadStats() {
    try {
      // Общая статистика
      const [totalUsers, totalVolume, ...rest] = await this.contracts.stats.getGlobalStats();
      
      // Баланс контракта
      const balance = await window.web3Manager.provider.getBalance(
        CONFIG.CONTRACTS.GlobalWay
      );

      this.state.stats = {
        totalUsers: Number(totalUsers),
        activeUsers: 0, // TODO: подсчитать активных
        contractBalance: ethers.utils.formatEther(balance),
        totalVolume: ethers.utils.formatEther(totalVolume),
        totalIDs: Number(totalUsers) // Предполагаем что все имеют ID
      };

      this.updateStatsUI();
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  },

  updateStatsUI() {
    const { totalUsers, activeUsers, contractBalance, totalVolume, totalIDs } = this.state.stats;

    const elements = {
      adminTotalUsers: totalUsers,
      adminActiveUsers: activeUsers || '-',
      adminContractBalance: `${app.formatNumber(contractBalance)} BNB`,
      adminTotalVolume: `${app.formatNumber(totalVolume)} BNB`,
      totalIdsAssigned: totalIDs
    };

    Object.entries(elements).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
  },

  // Board Members
  async loadBoardMembers() {
    try {
      const members = await this.contracts.governance.getBoardMembers();
      this.state.boardMembers = members;

      const listEl = document.getElementById('boardMembersList');
      const totalEl = document.getElementById('totalBoardMembers');

      if (totalEl) totalEl.textContent = members.length;

      if (!listEl) return;

      if (members.length === 0) {
        listEl.innerHTML = '<div class="no-data">Нет членов совета</div>';
        return;
      }

      listEl.innerHTML = members.map((address, index) => `
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

    } catch (error) {
      console.error('Error loading board members:', error);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // БЕСПЛАТНАЯ АКТИВАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async freeActivate() {
    const addressInput = document.getElementById('freeActivateAddress');
    const levelInput = document.getElementById('freeActivateLevel');

    if (!addressInput || !levelInput) return;

    const address = addressInput.value.trim();
    const level = parseInt(levelInput.value);

    if (!address || !level) {
      app.showNotification('Заполните все поля', 'error');
      return;
    }

    if (!ethers.isAddress(address)) {
      app.showNotification('Неверный адрес', 'error');
      return;
    }

    if (level < 1 || level > 12) {
      app.showNotification('Уровень должен быть от 1 до 12', 'error');
      return;
    }

    const confirmed = confirm(
      `Активировать уровень ${level} для пользователя ${app.formatAddress(address)} бесплатно?`
    );

    if (!confirmed) return;

    try {
      app.showNotification('Активация уровня...', 'info');

      const contract = await app.getSignedContract('GlobalWay');
      const tx = await contract.adminActivateLevel(address, level);
      await tx.wait();

      app.showNotification(`Уровень ${level} активирован! 🎉`, 'success');
      
      addressInput.value = '';
      levelInput.value = '';

    } catch (error) {
      console.error('Free activation error:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // КОНТРОЛЬ КОНТРАКТА
  // ═══════════════════════════════════════════════════════════════
  async pauseContract() {
    if (!this.access.isOwner) {
      app.showNotification('Только Owner может приостановить контракт', 'error');
      return;
    }

    const confirmed = confirm('Приостановить работу контракта?');
    if (!confirmed) return;

    try {
      const contract = await app.getSignedContract('GlobalWay');
      const tx = await contract.pause();
      await tx.wait();
      app.showNotification('Контракт приостановлен', 'success');
    } catch (error) {
      console.error('Pause error:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  async unpauseContract() {
    if (!this.access.isOwner) {
      app.showNotification('Только Owner может возобновить контракт', 'error');
      return;
    }

    const confirmed = confirm('Возобновить работу контракта?');
    if (!confirmed) return;

    try {
      const contract = await app.getSignedContract('GlobalWay');
      const tx = await contract.unpause();
      await tx.wait();
      app.showNotification('Контракт возобновлён', 'success');
    } catch (error) {
      console.error('Unpause error:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ID MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  async assignId() {
    const addressInput = document.getElementById('assignIdUserAddress');
    if (!addressInput) return;

    const address = addressInput.value.trim();

    if (!address) {
      app.showNotification('Введите адрес пользователя', 'error');
      return;
    }

    if (!ethers.isAddress(address)) {
      app.showNotification('Неверный адрес', 'error');
      return;
    }

    try {
      app.showNotification('Назначение ID...', 'info');

      const contract = await app.getSignedContract('GlobalWay');
      const tx = await contract.assignUserID(address);
      const receipt = await tx.wait();

      // Получаем назначенный ID
      const userID = await this.contracts.helper.getUserID(address);

      app.showNotification(`ID назначен: GW${userID} ✅`, 'success');
      
      addressInput.value = '';
      await this.loadStats();

    } catch (error) {
      console.error('Assign ID error:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BOARD MEMBERS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  async addBoardMember() {
    if (!this.access.isOwner) {
      app.showNotification('Только Owner может добавлять членов совета', 'error');
      return;
    }

    const addressInput = document.getElementById('boardMemberAddress');
    if (!addressInput) return;

    const address = addressInput.value.trim();

    if (!address) {
      app.showNotification('Введите адрес', 'error');
      return;
    }

    if (!ethers.isAddress(address)) {
      app.showNotification('Неверный адрес', 'error');
      return;
    }

    const confirmed = confirm(`Добавить ${app.formatAddress(address)} в совет директоров?`);
    if (!confirmed) return;

    try {
      app.showNotification('Добавление члена совета...', 'info');

      const contract = await app.getSignedContract('GlobalWayGovernance');
      const tx = await contract.addBoardMember(address);
      await tx.wait();

      app.showNotification('Член совета добавлен! ✅', 'success');
      
      addressInput.value = '';
      await this.loadBoardMembers();

    } catch (error) {
      console.error('Add board member error:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  async removeBoardMember() {
    if (!this.access.isOwner) {
      app.showNotification('Только Owner может удалять членов совета', 'error');
      return;
    }

    const addressInput = document.getElementById('removeBoardMemberAddress');
    if (!addressInput) return;

    const address = addressInput.value.trim();

    if (!address) {
      app.showNotification('Введите адрес', 'error');
      return;
    }

    if (!ethers.isAddress(address)) {
      app.showNotification('Неверный адрес', 'error');
      return;
    }

    const confirmed = confirm(
      `⚠️ Удалить ${app.formatAddress(address)} из совета директоров?\n\nЭто действие нельзя отменить!`
    );
    if (!confirmed) return;

    try {
      app.showNotification('Удаление члена совета...', 'info');

      const contract = await app.getSignedContract('GlobalWayGovernance');
      const tx = await contract.removeBoardMember(address);
      await tx.wait();

      app.showNotification('Член совета удалён! ✅', 'success');
      
      addressInput.value = '';
      await this.loadBoardMembers();

    } catch (error) {
      console.error('Remove board member error:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // USER LOOKUP
  // ═══════════════════════════════════════════════════════════════
  async lookupUser() {
    const inputEl = document.getElementById('lookupInput');
    const resultsEl = document.getElementById('lookupResults');

    if (!inputEl || !resultsEl) return;

    const input = inputEl.value.trim();
    if (!input) {
      app.showNotification('Введите адрес или ID', 'error');
      return;
    }

    resultsEl.style.display = 'block';
    resultsEl.innerHTML = '<div class="loading">🔍 Поиск...</div>';

    try {
      let address = input;

      // Если введён ID (формат GW1234567 или просто 1234567)
      if (input.toUpperCase().startsWith('GW') || !input.startsWith('0x')) {
        const numericID = input.toUpperCase().replace('GW', '');
        
        try {
          address = await this.contracts.helper.getAddressByID(numericID);
        } catch (error) {
          resultsEl.innerHTML = '<div class="no-data">❌ ID не найден</div>';
          return;
        }
      }

      // Получаем данные пользователя
      const isRegistered = await this.contracts.globalWay.isUserRegistered(address);

      if (!isRegistered) {
        resultsEl.innerHTML = '<div class="no-data">❌ Пользователь не зарегистрирован</div>';
        return;
      }

      const userID = await this.contracts.helper.getUserID(address);
      const maxLevel = await this.contracts.globalWay.getUserMaxLevel(address);
      const sponsor = await this.contracts.globalWay.getUserSponsor(address);
      const sponsorID = await this.contracts.helper.getUserID(sponsor);
      const [rankQualified] = await this.contracts.helper.getUserQualificationStatus(address);
      
      const rank = rankQualified[3] ? 'Платина' :
                   rankQualified[2] ? 'Золото' :
                   rankQualified[1] ? 'Серебро' :
                   rankQualified[0] ? 'Бронза' : 'Никто';

      // Quarterly
      const [lastPayment, quarterCount] = await this.contracts.quarterly.getUserQuarterlyInfo(address);
      const quarterlyActive = Number(lastPayment) > 0;

      resultsEl.innerHTML = `
        <div class="user-lookup-result">
          <h4>✅ Пользователь найден</h4>
          <div class="lookup-item">
            <strong>ID:</strong> GW${userID}
          </div>
          <div class="lookup-item">
            <strong>Адрес:</strong> ${address}
          </div>
          <div class="lookup-item">
            <strong>Спонсор ID:</strong> GW${sponsorID}
          </div>
          <div class="lookup-item">
            <strong>Макс. уровень:</strong> ${maxLevel}
          </div>
          <div class="lookup-item">
            <strong>Ранг:</strong> ${rank}
          </div>
          <div class="lookup-item">
            <strong>Quarterly:</strong> ${quarterlyActive ? '✓ Активен (Q' + quarterCount + ')' : '❌ Неактивен'}
          </div>
        </div>
      `;

    } catch (error) {
      console.error('Lookup error:', error);
      resultsEl.innerHTML = '<div class="error">❌ Ошибка поиска</div>';
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ФИНАНСОВОЕ УПРАВЛЕНИЕ (WITHDRAWAL PROPOSALS)
  // ═══════════════════════════════════════════════════════════════
  async createWithdrawalProposal() {
    const addressInput = document.getElementById('withdrawalAddress');
    const amountInput = document.getElementById('withdrawalAmount');
    const poolSelect = document.getElementById('withdrawalPool');
    const noteInput = document.getElementById('withdrawalNote');

    if (!addressInput || !amountInput || !poolSelect || !noteInput) return;

    const address = addressInput.value.trim();
    const amount = amountInput.value.trim();
    const pool = poolSelect.value;
    const note = noteInput.value.trim();

    if (!address || !amount || !pool || !note) {
      app.showNotification('Заполните все поля', 'error');
      return;
    }

    if (!ethers.isAddress(address)) {
      app.showNotification('Неверный адрес', 'error');
      return;
    }

    const amountBNB = parseFloat(amount);
    if (amountBNB <= 0) {
      app.showNotification('Неверная сумма', 'error');
      return;
    }

    const requiresVoting = amountBNB > 5;

    const confirmed = confirm(
      `Создать предложение о выводе?\n\n` +
      `Пул: ${pool}\n` +
      `Адрес: ${app.formatAddress(address)}\n` +
      `Сумма: ${amount} BNB\n` +
      `Примечание: ${note}\n\n` +
      `${requiresVoting ? '⚠️ Требуется 8 голосов!' : '✅ Можно выполнить сразу'}`
    );

    if (!confirmed) return;

    try {
      app.showNotification('Создание предложения...', 'info');

      const contract = await app.getSignedContract('GlobalWayGovernance');
      const amountWei = ethers.utils.parseEther(amount);
      
      const tx = await contract.createWithdrawalProposal(
        address,
        amountWei,
        pool,
        note
      );
      
      await tx.wait();

      app.showNotification(
        requiresVoting 
          ? 'Предложение создано! Ожидание голосов.' 
          : 'Вывод выполнен!', 
        'success'
      );

      addressInput.value = '';
      amountInput.value = '';
      noteInput.value = '';

    } catch (error) {
      console.error('Withdrawal error:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЭКСТРЕННЫЙ ВЫВОД
  // ═══════════════════════════════════════════════════════════════
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
    // Free Activation
    const freeActivateBtn = document.getElementById('freeActivateBtn');
    if (freeActivateBtn) {
      freeActivateBtn.onclick = () => this.freeActivate();
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

    // ID Management
    const assignIdBtn = document.getElementById('assignIdBtn');
    if (assignIdBtn) {
      assignIdBtn.onclick = () => this.assignId();
    }

    // User Lookup
    const lookupBtn = document.getElementById('lookupBtn');
    if (lookupBtn) {
      lookupBtn.onclick = () => this.lookupUser();
    }

    // Emergency Withdraw
    const emergencyBtn = document.getElementById('emergencyWithdrawBtn');
    if (emergencyBtn) {
      emergencyBtn.onclick = () => this.emergencyWithdraw();
    }

    // Financial Management
    const withdrawalBtn = document.getElementById('withdrawalBtn');
    if (withdrawalBtn) {
      withdrawalBtn.onclick = () => this.createWithdrawalProposal();
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
  },

  // ═══════════════════════════════════════════════════════════════
  // ОБНОВЛЕНИЕ ДАННЫХ
  // ═══════════════════════════════════════════════════════════════
  async refresh() {
    await this.loadAllData();
  }
};

// Экспорт в window
window.adminModule = adminModule;
