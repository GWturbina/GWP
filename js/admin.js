// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Admin Module v2.0
// Полная админ панель с управлением пользователями, рангами, guardians
// Date: 2025-12-11
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
      totalVolume: '0',
      contractBalance: '0',
      totalTokens: '0',
      ranksCount: { bronze: 0, silver: 0, gold: 0, platinum: 0 }
    },
    guardians: [],
    lookupResult: null
  },

  // Названия рангов
  RANK_NAMES: ['Нет ранга', 'Bronze 🥉', 'Silver 🥈', 'Gold 🥇', 'Platinum 💎'],

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('⚙️ Initializing Admin Panel v2.0...');
    
    // Принудительно показываем страницу admin
    const adminPage = document.getElementById('admin');
    if (adminPage) {
      adminPage.classList.add('active');
      adminPage.style.display = 'block';
    }
    
    try {
      // Ждём подключения кошелька
      if (!app.state.userAddress) {
        console.log('⏳ Waiting for wallet connection...');
        return;
      }

      // Проверка прав
      const hasAccess = this.checkRights();
      
      if (!hasAccess) {
        this.showAccessDenied();
        return;
      }

      // Рендерим UI
      this.renderAdminUI();

      // Загружаем контракты
      await this.loadContracts();

      // Загружаем данные
      await this.loadAllData();

      // Инициализируем обработчики
      this.initEventHandlers();

      console.log('✅ Admin panel v2.0 loaded');
    } catch (error) {
      console.error('❌ Admin init error:', error);
      app.showNotification('Ошибка загрузки админ панели', 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПРОВЕРКА ПРАВ ДОСТУПА
  // ═══════════════════════════════════════════════════════════════
  checkRights() {
    if (!app.state.userAddress) return false;

    const currentAddress = app.state.userAddress.toLowerCase();
    const ownerAddress = CONFIG.ADMIN.owner.toLowerCase();
    const guardians = CONFIG.ADMIN.guardians.map(g => g.toLowerCase());

    const isOwner = currentAddress === ownerAddress;
    const isGuardian = guardians.includes(currentAddress);

    this.access.isOwner = isOwner;
    this.access.isGuardian = isGuardian;
    this.access.level = isOwner ? 'Owner 👑' : (isGuardian ? 'Guardian 🛡️' : 'No Access');

    console.log('🔐 Access:', this.access.level, 'for', currentAddress);

    return isOwner || isGuardian;
  },

  showAccessDenied() {
    const adminPage = document.getElementById('admin');
    if (!adminPage) return;

    const guardiansList = CONFIG.ADMIN.guardians
      .map((g, i) => `<li>🛡️ Guardian ${i + 1}: <code>${g}</code></li>`)
      .join('');

    adminPage.innerHTML = `
      <div class="access-denied">
        <h2>🔒 Доступ Запрещён</h2>
        <p class="warning">Админ панель доступна только Owner и Guardians</p>
        <p>Ваш адрес: <code>${app.state.userAddress || 'Не подключен'}</code></p>
        
        <div class="allowed-addresses">
          <h4>Разрешённые адреса:</h4>
          <ul>
            <li>👑 Owner: <code>${CONFIG.ADMIN.owner}</code></li>
            ${guardiansList}
          </ul>
        </div>
        
        <button class="btn-primary" onclick="app.showPage('dashboard')">
          ← Вернуться на главную
        </button>
      </div>
    `;
  },

  // ═══════════════════════════════════════════════════════════════
  // РЕНДЕР UI
  // ═══════════════════════════════════════════════════════════════
  renderAdminUI() {
    const adminPage = document.getElementById('admin');
    if (!adminPage) return;

    // Показываем/скрываем Owner-only секции
    const ownerOnlyClass = this.access.isOwner ? '' : 'hidden';

    adminPage.innerHTML = `
      <div class="admin-page-v2">
        <h2>🔧 Панель Администратора</h2>
        
        <!-- Информация о доступе -->
        <section class="admin-section access-info">
          <div class="access-badge ${this.access.isOwner ? 'owner' : 'guardian'}">
            ${this.access.level}
          </div>
          <span class="access-address">${app.formatAddress(app.state.userAddress)}</span>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- СТАТИСТИКА -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section">
          <h3>📊 Статистика платформы</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value" id="statTotalUsers">-</div>
              <div class="stat-label">Всего пользователей</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="statTotalVolume">-</div>
              <div class="stat-label">Общий объём (BNB)</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="statContractBalance">-</div>
              <div class="stat-label">Баланс контракта (BNB)</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="statTotalTokens">-</div>
              <div class="stat-label">Токенов GWT</div>
            </div>
          </div>
          
          <h4>🏆 Ранги пользователей</h4>
          <div class="ranks-grid">
            <div class="rank-card bronze">
              <span class="rank-icon">🥉</span>
              <span class="rank-count" id="rankBronze">0</span>
              <span class="rank-name">Bronze</span>
            </div>
            <div class="rank-card silver">
              <span class="rank-icon">🥈</span>
              <span class="rank-count" id="rankSilver">0</span>
              <span class="rank-name">Silver</span>
            </div>
            <div class="rank-card gold">
              <span class="rank-icon">🥇</span>
              <span class="rank-count" id="rankGold">0</span>
              <span class="rank-name">Gold</span>
            </div>
            <div class="rank-card platinum">
              <span class="rank-icon">💎</span>
              <span class="rank-count" id="rankPlatinum">0</span>
              <span class="rank-name">Platinum</span>
            </div>
          </div>
          
          <button class="btn-secondary" id="refreshStatsBtn">🔄 Обновить статистику</button>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- ПОИСК ПОЛЬЗОВАТЕЛЯ -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section">
          <h3>🔍 Поиск пользователя</h3>
          <div class="search-form">
            <input type="text" id="searchUserInput" placeholder="Адрес (0x...) или ID (GW1234567)">
            <button class="btn-primary" id="searchUserBtn">🔍 Найти</button>
          </div>
          <div id="searchResult" class="search-result hidden"></div>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- РЕГИСТРАЦИЯ + АКТИВАЦИЯ -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section ${ownerOnlyClass}">
          <h3>📝 Регистрация и активация нового пользователя</h3>
          <p class="section-desc">Регистрирует нового пользователя и активирует уровни бесплатно</p>
          
          <div class="form-grid">
            <div class="form-group">
              <label>Адрес пользователя *</label>
              <input type="text" id="regUserAddress" placeholder="0x...">
            </div>
            <div class="form-group">
              <label>ID спонсора *</label>
              <input type="text" id="regSponsorId" placeholder="GW9729645 или 9729645">
            </div>
            <div class="form-group">
              <label>Активировать до уровня</label>
              <select id="regMaxLevel">
                <option value="0">Только регистрация (без активации)</option>
                <option value="1">Уровень 1</option>
                <option value="2">Уровень 2</option>
                <option value="3">Уровень 3</option>
                <option value="4">Уровень 4</option>
                <option value="5">Уровень 5</option>
                <option value="6">Уровень 6</option>
                <option value="7">Уровень 7</option>
                <option value="8">Уровень 8</option>
                <option value="9">Уровень 9</option>
                <option value="10">Уровень 10</option>
                <option value="11">Уровень 11</option>
                <option value="12" selected>Уровень 12 (все)</option>
              </select>
            </div>
          </div>
          
          <button class="btn-success" id="registerAndActivateBtn">
            ✅ Зарегистрировать и активировать
          </button>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- ТОЛЬКО АКТИВАЦИЯ (для зарегистрированных) -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section ${ownerOnlyClass}">
          <h3>⚡ Активация уровней (для зарегистрированных)</h3>
          <p class="section-desc">Активирует уровни для уже зарегистрированного пользователя</p>
          
          <div class="form-grid">
            <div class="form-group">
              <label>Адрес пользователя *</label>
              <input type="text" id="activateUserAddress" placeholder="0x...">
            </div>
            <div class="form-group">
              <label>Активировать до уровня *</label>
              <select id="activateMaxLevel">
                <option value="1">Уровень 1</option>
                <option value="2">Уровень 2</option>
                <option value="3">Уровень 3</option>
                <option value="4">Уровень 4</option>
                <option value="5">Уровень 5</option>
                <option value="6">Уровень 6</option>
                <option value="7">Уровень 7</option>
                <option value="8">Уровень 8</option>
                <option value="9">Уровень 9</option>
                <option value="10">Уровень 10</option>
                <option value="11">Уровень 11</option>
                <option value="12" selected>Уровень 12 (все)</option>
              </select>
            </div>
          </div>
          
          <button class="btn-success" id="activateLevelsBtn">
            ⚡ Активировать уровни
          </button>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- ПРИСВОЕНИЕ РАНГА -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section ${ownerOnlyClass}">
          <h3>🏆 Присвоение ранга</h3>
          <p class="section-desc">Присваивает лидерский ранг пользователю</p>
          
          <div class="form-grid">
            <div class="form-group">
              <label>Адрес пользователя *</label>
              <input type="text" id="rankUserAddress" placeholder="0x...">
            </div>
            <div class="form-group">
              <label>Ранг *</label>
              <select id="rankSelect">
                <option value="0">Нет ранга</option>
                <option value="1">🥉 Bronze</option>
                <option value="2">🥈 Silver</option>
                <option value="3">🥇 Gold</option>
                <option value="4">💎 Platinum</option>
              </select>
            </div>
          </div>
          
          <button class="btn-success" id="setRankBtn">
            🏆 Присвоить ранг
          </button>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- GUARDIANS -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section">
          <h3>🛡️ Совет Guardians</h3>
          <p class="section-desc">Guardians могут голосовать и выполнять экстренные действия</p>
          
          <div id="guardiansList" class="guardians-list">
            <div class="loading">Загрузка...</div>
          </div>
          
          <div class="${ownerOnlyClass}">
            <h4>Добавить Guardian</h4>
            <div class="form-inline">
              <input type="text" id="addGuardianAddress" placeholder="Адрес (0x...)">
              <button class="btn-success" id="addGuardianBtn">➕ Добавить</button>
            </div>
            
            <h4>Удалить Guardian</h4>
            <div class="form-inline">
              <input type="text" id="removeGuardianAddress" placeholder="Адрес (0x...)">
              <button class="btn-danger" id="removeGuardianBtn">➖ Удалить</button>
            </div>
          </div>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- УПРАВЛЕНИЕ КОНТРАКТОМ -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section ${ownerOnlyClass}">
          <h3>⚙️ Управление контрактом</h3>
          
          <div class="control-buttons">
            <button class="btn-warning" id="pauseContractBtn">⏸️ Пауза</button>
            <button class="btn-success" id="unpauseContractBtn">▶️ Возобновить</button>
          </div>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- ОПАСНАЯ ЗОНА (только Owner) -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section danger-zone ${ownerOnlyClass}">
          <h3>⚠️ Опасная зона</h3>
          <p class="warning">Эти действия необратимы! Будьте осторожны.</p>
          
          <button class="btn-danger" id="emergencyWithdrawBtn">
            🚨 Экстренный вывод средств
          </button>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- ЭКСПОРТ БАЗЫ ДАННЫХ -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section ${ownerOnlyClass}">
          <h3>💾 Экспорт базы данных</h3>
          <p class="section-desc">Скачать данные для восстановления при передеплое</p>
          
          <div class="export-buttons">
            <button class="btn-secondary" id="exportUsersBtn">
              📥 Скачать пользователей (JSON)
            </button>
            <button class="btn-secondary" id="exportRanksBtn">
              📥 Скачать ранги (JSON)
            </button>
          </div>
        </section>
      </div>
    `;

    // Добавляем стили
    this.injectStyles();
  },

  // ═══════════════════════════════════════════════════════════════
  // СТИЛИ
  // ═══════════════════════════════════════════════════════════════
  injectStyles() {
    if (document.getElementById('admin-styles-v2')) return;

    const styles = document.createElement('style');
    styles.id = 'admin-styles-v2';
    styles.textContent = `
      .admin-page-v2 {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }
      
      .admin-page-v2 h2 {
        color: #ffd700;
        text-align: center;
        margin-bottom: 30px;
      }
      
      .admin-section {
        background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
        border: 1px solid #2a2a4a;
        border-radius: 15px;
        padding: 25px;
        margin-bottom: 25px;
      }
      
      .admin-section h3 {
        color: #ffd700;
        margin-top: 0;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid #333;
      }
      
      .admin-section h4 {
        color: #ccc;
        margin: 20px 0 10px;
      }
      
      .section-desc {
        color: #888;
        font-size: 14px;
        margin-bottom: 20px;
      }
      
      .hidden { display: none !important; }
      
      /* Access Badge */
      .access-info {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 15px 25px !important;
      }
      
      .access-badge {
        padding: 8px 20px;
        border-radius: 20px;
        font-weight: bold;
      }
      
      .access-badge.owner {
        background: linear-gradient(135deg, #ffd700, #ffaa00);
        color: #000;
      }
      
      .access-badge.guardian {
        background: linear-gradient(135deg, #4a90d9, #357abd);
        color: #fff;
      }
      
      .access-address {
        color: #888;
        font-family: monospace;
      }
      
      /* Stats Grid */
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 25px;
      }
      
      .stat-card {
        background: rgba(255, 215, 0, 0.1);
        border: 1px solid #ffd700;
        border-radius: 10px;
        padding: 20px;
        text-align: center;
      }
      
      .stat-value {
        font-size: 28px;
        font-weight: bold;
        color: #ffd700;
      }
      
      .stat-label {
        color: #888;
        font-size: 14px;
        margin-top: 5px;
      }
      
      /* Ranks Grid */
      .ranks-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
        margin-bottom: 20px;
      }
      
      .rank-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 15px;
        border-radius: 10px;
        border: 2px solid;
      }
      
      .rank-card.bronze { border-color: #cd7f32; background: rgba(205, 127, 50, 0.1); }
      .rank-card.silver { border-color: #c0c0c0; background: rgba(192, 192, 192, 0.1); }
      .rank-card.gold { border-color: #ffd700; background: rgba(255, 215, 0, 0.1); }
      .rank-card.platinum { border-color: #e5e4e2; background: rgba(229, 228, 226, 0.1); }
      
      .rank-icon { font-size: 24px; }
      .rank-count { font-size: 28px; font-weight: bold; color: #fff; }
      .rank-name { color: #888; font-size: 12px; }
      
      /* Forms */
      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
      }
      
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .form-group label {
        color: #ccc;
        font-size: 14px;
      }
      
      .form-group input,
      .form-group select {
        padding: 12px 15px;
        border: 1px solid #333;
        border-radius: 8px;
        background: #1a1a2e;
        color: #fff;
        font-size: 16px;
      }
      
      .form-group input:focus,
      .form-group select:focus {
        border-color: #ffd700;
        outline: none;
      }
      
      .form-inline {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
      }
      
      .form-inline input {
        flex: 1;
        padding: 12px 15px;
        border: 1px solid #333;
        border-radius: 8px;
        background: #1a1a2e;
        color: #fff;
      }
      
      /* Search */
      .search-form {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
      }
      
      .search-form input {
        flex: 1;
        padding: 12px 15px;
        border: 1px solid #333;
        border-radius: 8px;
        background: #1a1a2e;
        color: #fff;
      }
      
      .search-result {
        background: #1a2a1e;
        border: 1px solid #00ff88;
        border-radius: 10px;
        padding: 20px;
        margin-top: 15px;
      }
      
      .search-result.error {
        background: #2a1a1e;
        border-color: #ff4444;
      }
      
      .search-result h4 {
        color: #00ff88;
        margin-top: 0;
      }
      
      .search-result.error h4 {
        color: #ff4444;
      }
      
      .search-result p {
        margin: 8px 0;
        color: #ccc;
      }
      
      .search-result code {
        background: #333;
        padding: 3px 8px;
        border-radius: 4px;
        font-family: monospace;
      }
      
      /* Guardians List */
      .guardians-list {
        margin-bottom: 20px;
      }
      
      .guardian-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #1a1a2e;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 10px;
      }
      
      .guardian-card.owner {
        border-color: #ffd700;
      }
      
      .guardian-info {
        display: flex;
        align-items: center;
        gap: 15px;
      }
      
      .guardian-badge {
        padding: 5px 12px;
        border-radius: 15px;
        font-size: 12px;
        font-weight: bold;
      }
      
      .guardian-badge.owner {
        background: #ffd700;
        color: #000;
      }
      
      .guardian-badge.guardian {
        background: #4a90d9;
        color: #fff;
      }
      
      .guardian-address {
        font-family: monospace;
        color: #ccc;
      }
      
      /* Buttons */
      .btn-primary, .btn-secondary, .btn-success, .btn-warning, .btn-danger {
        padding: 12px 25px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .btn-primary {
        background: linear-gradient(135deg, #ffd700, #ffaa00);
        color: #000;
      }
      
      .btn-secondary {
        background: #333;
        color: #fff;
        border: 1px solid #555;
      }
      
      .btn-success {
        background: linear-gradient(135deg, #00c853, #00a843);
        color: #fff;
      }
      
      .btn-warning {
        background: linear-gradient(135deg, #ff9800, #f57c00);
        color: #fff;
      }
      
      .btn-danger {
        background: linear-gradient(135deg, #f44336, #d32f2f);
        color: #fff;
      }
      
      .btn-primary:hover, .btn-success:hover, .btn-warning:hover, .btn-danger:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
      }
      
      .btn-secondary:hover {
        background: #444;
      }
      
      .control-buttons {
        display: flex;
        gap: 15px;
        flex-wrap: wrap;
      }
      
      .export-buttons {
        display: flex;
        gap: 15px;
        flex-wrap: wrap;
      }
      
      /* Danger Zone */
      .danger-zone {
        border-color: #f44336 !important;
        background: linear-gradient(145deg, #2a1a1e 0%, #1e1a1a 100%) !important;
      }
      
      .danger-zone h3 {
        color: #f44336 !important;
      }
      
      .danger-zone .warning {
        color: #ff6b6b;
        font-size: 14px;
        margin-bottom: 20px;
      }
      
      /* Access Denied */
      .access-denied {
        text-align: center;
        padding: 50px;
      }
      
      .access-denied h2 {
        color: #f44336;
      }
      
      .access-denied .warning {
        color: #ff6b6b;
        font-size: 18px;
        margin: 20px 0;
      }
      
      .access-denied code {
        background: #333;
        padding: 5px 15px;
        border-radius: 5px;
      }
      
      .allowed-addresses {
        background: #1a1a2e;
        border: 1px solid #333;
        border-radius: 10px;
        padding: 20px;
        margin: 30px auto;
        max-width: 600px;
        text-align: left;
      }
      
      .allowed-addresses h4 {
        color: #ffd700;
        margin-top: 0;
      }
      
      .allowed-addresses ul {
        list-style: none;
        padding: 0;
      }
      
      .allowed-addresses li {
        padding: 8px 0;
        border-bottom: 1px solid #333;
      }
      
      .allowed-addresses li:last-child {
        border-bottom: none;
      }
      
      .loading {
        color: #888;
        text-align: center;
        padding: 20px;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .stats-grid { grid-template-columns: repeat(2, 1fr); }
        .ranks-grid { grid-template-columns: repeat(2, 1fr); }
        .form-grid { grid-template-columns: 1fr; }
        .form-inline { flex-direction: column; }
        .search-form { flex-direction: column; }
        .control-buttons { flex-direction: column; }
        .export-buttons { flex-direction: column; }
      }
    `;
    document.head.appendChild(styles);
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА КОНТРАКТОВ
  // ═══════════════════════════════════════════════════════════════
  async loadContracts() {
    console.log('📥 Loading admin contracts...');
    
    try {
      this.contracts.globalWay = await app.getContract('GlobalWay');
      this.contracts.matrixRegistry = await app.getContract('MatrixRegistry');
      console.log('✅ Core contracts loaded');
    } catch (e) {
      console.error('❌ Error loading core contracts:', e);
    }
    
    try {
      this.contracts.leaderPool = await app.getContract('GlobalWayLeaderPool');
      console.log('✅ LeaderPool contract loaded');
    } catch (e) {
      console.log('⚠️ LeaderPool not available');
    }
    
    try {
      this.contracts.governance = await app.getContract('GlobalWayGovernance');
      console.log('✅ Governance contract loaded');
    } catch (e) {
      console.log('⚠️ Governance not available');
    }
    
    try {
      this.contracts.gwtToken = await app.getContract('GWTToken');
      console.log('✅ GWTToken contract loaded');
    } catch (e) {
      console.log('⚠️ GWTToken not available');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА ДАННЫХ
  // ═══════════════════════════════════════════════════════════════
  async loadAllData() {
    await Promise.all([
      this.loadStats(),
      this.loadGuardians()
    ]);
  },

  async loadStats() {
    console.log('📊 Loading stats...');
    
    try {
      // Всего пользователей
      let totalUsers = 0;
      if (this.contracts.matrixRegistry) {
        try {
          totalUsers = Number(await this.contracts.matrixRegistry.totalUsers());
        } catch (e) {
          console.error('Error getting totalUsers from MatrixRegistry:', e);
        }
      }
      
      // Если не получилось из MatrixRegistry, пробуем GlobalWay
      if (totalUsers === 0 && this.contracts.globalWay) {
        try {
          totalUsers = Number(await this.contracts.globalWay.getTotalUsers());
        } catch (e) {
          console.error('Error getting totalUsers from GlobalWay:', e);
        }
      }
      
      // Общий объём
      let totalVolume = '0';
      if (this.contracts.globalWay) {
        try {
          const volume = await this.contracts.globalWay.totalVolume();
          totalVolume = ethers.utils.formatEther(volume);
        } catch (e) {
          console.error('Error getting totalVolume:', e);
        }
      }
      
      // Баланс контракта
      let contractBalance = '0';
      try {
        const balance = await window.web3Manager.provider.getBalance(CONFIG.CONTRACTS.GlobalWay);
        contractBalance = ethers.utils.formatEther(balance);
      } catch (e) {
        console.error('Error getting balance:', e);
      }
      
      // Токены GWT
      let totalTokens = '0';
      if (this.contracts.gwtToken) {
        try {
          const supply = await this.contracts.gwtToken.totalSupply();
          totalTokens = ethers.utils.formatEther(supply);
        } catch (e) {
          console.error('Error getting totalSupply:', e);
        }
      }
      
      // Обновляем UI
      document.getElementById('statTotalUsers').textContent = totalUsers;
      document.getElementById('statTotalVolume').textContent = parseFloat(totalVolume).toFixed(4);
      document.getElementById('statContractBalance').textContent = parseFloat(contractBalance).toFixed(4);
      document.getElementById('statTotalTokens').textContent = parseFloat(totalTokens).toFixed(0);
      
      console.log('✅ Stats loaded');
      
    } catch (error) {
      console.error('❌ Error loading stats:', error);
    }
  },

  async loadGuardians() {
    console.log('🛡️ Loading guardians...');
    
    const listEl = document.getElementById('guardiansList');
    if (!listEl) return;
    
    try {
      let guardians = [];
      
      // Пробуем получить из контракта Governance
      if (this.contracts.governance) {
        try {
          guardians = await this.contracts.governance.getGuardians();
          console.log('✅ Guardians from contract:', guardians.length);
        } catch (e) {
          console.log('⚠️ Cannot get guardians from contract, using CONFIG');
        }
      }
      
      // Если не получилось, используем CONFIG
      if (guardians.length === 0) {
        guardians = [CONFIG.ADMIN.owner, ...CONFIG.ADMIN.guardians];
      }
      
      this.state.guardians = guardians;
      
      // Рендерим список
      listEl.innerHTML = guardians.map((addr, index) => {
        const isOwner = addr.toLowerCase() === CONFIG.ADMIN.owner.toLowerCase();
        return `
          <div class="guardian-card ${isOwner ? 'owner' : ''}">
            <div class="guardian-info">
              <span class="guardian-badge ${isOwner ? 'owner' : 'guardian'}">
                ${isOwner ? '👑 Owner' : `🛡️ Guardian ${index}`}
              </span>
              <span class="guardian-address">${addr}</span>
            </div>
            <button class="btn-secondary" onclick="navigator.clipboard.writeText('${addr}'); app.showNotification('Скопировано!', 'success');">
              📋
            </button>
          </div>
        `;
      }).join('');
      
    } catch (error) {
      console.error('❌ Error loading guardians:', error);
      listEl.innerHTML = '<div class="loading">Ошибка загрузки</div>';
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ОБРАБОТЧИКИ СОБЫТИЙ
  // ═══════════════════════════════════════════════════════════════
  initEventHandlers() {
    console.log('🎯 Initializing event handlers...');
    
    // Обновить статистику
    const refreshStatsBtn = document.getElementById('refreshStatsBtn');
    if (refreshStatsBtn) {
      refreshStatsBtn.onclick = () => this.loadStats();
    }
    
    // Поиск пользователя
    const searchBtn = document.getElementById('searchUserBtn');
    if (searchBtn) {
      searchBtn.onclick = () => this.searchUser();
    }
    
    const searchInput = document.getElementById('searchUserInput');
    if (searchInput) {
      searchInput.onkeypress = (e) => {
        if (e.key === 'Enter') this.searchUser();
      };
    }
    
    // Регистрация + Активация
    const regBtn = document.getElementById('registerAndActivateBtn');
    if (regBtn) {
      regBtn.onclick = () => this.registerAndActivate();
    }
    
    // Только активация
    const activateBtn = document.getElementById('activateLevelsBtn');
    if (activateBtn) {
      activateBtn.onclick = () => this.activateLevels();
    }
    
    // Присвоение ранга
    const rankBtn = document.getElementById('setRankBtn');
    if (rankBtn) {
      rankBtn.onclick = () => this.setUserRank();
    }
    
    // Guardians
    const addGuardianBtn = document.getElementById('addGuardianBtn');
    if (addGuardianBtn) {
      addGuardianBtn.onclick = () => this.addGuardian();
    }
    
    const removeGuardianBtn = document.getElementById('removeGuardianBtn');
    if (removeGuardianBtn) {
      removeGuardianBtn.onclick = () => this.removeGuardian();
    }
    
    // Контракт
    const pauseBtn = document.getElementById('pauseContractBtn');
    if (pauseBtn) {
      pauseBtn.onclick = () => this.pauseContract();
    }
    
    const unpauseBtn = document.getElementById('unpauseContractBtn');
    if (unpauseBtn) {
      unpauseBtn.onclick = () => this.unpauseContract();
    }
    
    const emergencyBtn = document.getElementById('emergencyWithdrawBtn');
    if (emergencyBtn) {
      emergencyBtn.onclick = () => this.emergencyWithdraw();
    }
    
    // Экспорт
    const exportUsersBtn = document.getElementById('exportUsersBtn');
    if (exportUsersBtn) {
      exportUsersBtn.onclick = () => this.exportUsers();
    }
    
    const exportRanksBtn = document.getElementById('exportRanksBtn');
    if (exportRanksBtn) {
      exportRanksBtn.onclick = () => this.exportRanks();
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПОИСК ПОЛЬЗОВАТЕЛЯ
  // ═══════════════════════════════════════════════════════════════
  async searchUser() {
    const input = document.getElementById('searchUserInput');
    const resultEl = document.getElementById('searchResult');
    
    if (!input || !resultEl) return;
    
    let query = input.value.trim();
    if (!query) {
      app.showNotification('Введите адрес или ID', 'error');
      return;
    }
    
    resultEl.classList.remove('hidden', 'error');
    resultEl.innerHTML = '<div class="loading">Поиск...</div>';
    
    try {
      let address = query;
      let userId = null;
      
      // Если это ID (GW1234567 или просто 1234567)
      if (query.startsWith('GW') || query.startsWith('gw')) {
        userId = query.substring(2);
        address = await this.contracts.matrixRegistry.getAddressById(userId);
      } else if (/^\d+$/.test(query)) {
        userId = query;
        address = await this.contracts.matrixRegistry.getAddressById(userId);
      }
      
      // Проверяем адрес
      if (!ethers.utils.isAddress(address) || address === '0x0000000000000000000000000000000000000000') {
        resultEl.classList.add('error');
        resultEl.innerHTML = `
          <h4>❌ Пользователь не найден</h4>
          <p>Адрес или ID: <code>${query}</code></p>
        `;
        return;
      }
      
      // Получаем данные
      const isRegistered = await this.contracts.matrixRegistry.isRegistered(address);
      
      if (!isRegistered) {
        resultEl.classList.add('error');
        resultEl.innerHTML = `
          <h4>❌ Пользователь не зарегистрирован</h4>
          <p>Адрес: <code>${address}</code></p>
        `;
        return;
      }
      
      // Получаем полную информацию
      if (!userId) {
        userId = await this.contracts.matrixRegistry.getUserIdByAddress(address);
      }
      
      const maxLevel = await this.contracts.globalWay.getUserMaxLevel(address);
      
      // Ранг
      let rank = 0;
      let rankName = 'Нет ранга';
      if (this.contracts.leaderPool) {
        try {
          const rankInfo = await this.contracts.leaderPool.getUserRankInfo(address);
          rank = Number(rankInfo.rank);
          rankName = this.RANK_NAMES[rank] || 'Нет ранга';
        } catch (e) {
          console.log('Cannot get rank');
        }
      }
      
      resultEl.innerHTML = `
        <h4>✅ Пользователь найден</h4>
        <p><strong>Адрес:</strong> <code>${address}</code></p>
        <p><strong>ID:</strong> GW${userId}</p>
        <p><strong>Максимальный уровень:</strong> ${maxLevel}</p>
        <p><strong>Ранг:</strong> ${rankName}</p>
      `;
      
    } catch (error) {
      console.error('Search error:', error);
      resultEl.classList.add('error');
      resultEl.innerHTML = `
        <h4>❌ Ошибка поиска</h4>
        <p>${error.message}</p>
      `;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // РЕГИСТРАЦИЯ + АКТИВАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async registerAndActivate() {
    if (!this.access.isOwner) {
      app.showNotification('Только Owner может выполнять это действие', 'error');
      return;
    }
    
    const userAddress = document.getElementById('regUserAddress').value.trim();
    let sponsorId = document.getElementById('regSponsorId').value.trim();
    const maxLevel = parseInt(document.getElementById('regMaxLevel').value);
    
    // Валидация
    if (!ethers.utils.isAddress(userAddress)) {
      app.showNotification('Неверный адрес пользователя', 'error');
      return;
    }
    
    // Убираем GW из sponsorId
    if (sponsorId.startsWith('GW') || sponsorId.startsWith('gw')) {
      sponsorId = sponsorId.substring(2);
    }
    
    if (!sponsorId || isNaN(parseInt(sponsorId))) {
      app.showNotification('Неверный ID спонсора', 'error');
      return;
    }
    
    try {
      // Проверяем, зарегистрирован ли уже
      const isRegistered = await this.contracts.matrixRegistry.isRegistered(userAddress);
      
      if (isRegistered) {
        app.showNotification('Пользователь уже зарегистрирован! Используйте "Только активация"', 'error');
        return;
      }
      
      // Проверяем спонсора
      const sponsorAddress = await this.contracts.matrixRegistry.getAddressById(sponsorId);
      if (sponsorAddress === '0x0000000000000000000000000000000000000000') {
        app.showNotification('Спонсор с таким ID не найден', 'error');
        return;
      }
      
      const confirmed = confirm(
        `Регистрация и активация:\n\n` +
        `Пользователь: ${userAddress}\n` +
        `Спонсор: GW${sponsorId}\n` +
        `Уровень: ${maxLevel === 0 ? 'Только регистрация' : `до ${maxLevel}`}\n\n` +
        `Продолжить?`
      );
      
      if (!confirmed) return;
      
      app.showNotification('Выполняется регистрация...', 'info');
      
      // Шаг 1: Регистрация через MatrixRegistry.registerFor
      const registryContract = await app.getSignedContract('MatrixRegistry');
      
      // Проверяем авторизацию
      // Если GlobalWay авторизован, используем его для регистрации
      // Иначе используем registerFor напрямую (если Owner авторизован)
      
      // Пробуем через GlobalWay (если есть функция)
      const globalWayContract = await app.getSignedContract('GlobalWay');
      
      if (maxLevel > 0) {
        // Регистрация + Активация через ownerActivateLevels
        // Но сначала нужно зарегистрировать...
        
        // Проверяем есть ли функция registerFor
        try {
          const tx = await registryContract.registerFor(userAddress, sponsorId);
          await tx.wait();
          console.log('✅ User registered');
        } catch (regError) {
          console.error('Registration error:', regError);
          app.showNotification('Ошибка регистрации: ' + regError.message, 'error');
          return;
        }
        
        // Теперь активируем уровни
        app.showNotification('Активация уровней...', 'info');
        
        try {
          const tx2 = await globalWayContract.ownerActivateLevels(userAddress, maxLevel);
          await tx2.wait();
          console.log('✅ Levels activated');
        } catch (actError) {
          console.error('Activation error:', actError);
          app.showNotification('Зарегистрирован, но ошибка активации: ' + actError.message, 'error');
          return;
        }
        
        app.showNotification(`✅ Пользователь зарегистрирован и активирован до уровня ${maxLevel}!`, 'success');
        
      } else {
        // Только регистрация
        try {
          const tx = await registryContract.registerFor(userAddress, sponsorId);
          await tx.wait();
          app.showNotification('✅ Пользователь зарегистрирован!', 'success');
        } catch (regError) {
          console.error('Registration error:', regError);
          app.showNotification('Ошибка регистрации: ' + regError.message, 'error');
          return;
        }
      }
      
      // Обновляем статистику
      await this.loadStats();
      
      // Очищаем форму
      document.getElementById('regUserAddress').value = '';
      document.getElementById('regSponsorId').value = '';
      
    } catch (error) {
      console.error('Register and activate error:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ТОЛЬКО АКТИВАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async activateLevels() {
    if (!this.access.isOwner) {
      app.showNotification('Только Owner может выполнять это действие', 'error');
      return;
    }
    
    const userAddress = document.getElementById('activateUserAddress').value.trim();
    const maxLevel = parseInt(document.getElementById('activateMaxLevel').value);
    
    if (!ethers.utils.isAddress(userAddress)) {
      app.showNotification('Неверный адрес пользователя', 'error');
      return;
    }
    
    try {
      // Проверяем регистрацию
      const isRegistered = await this.contracts.matrixRegistry.isRegistered(userAddress);
      
      if (!isRegistered) {
        app.showNotification('Пользователь не зарегистрирован! Сначала зарегистрируйте', 'error');
        return;
      }
      
      // Текущий уровень
      const currentLevel = await this.contracts.globalWay.getUserMaxLevel(userAddress);
      
      if (currentLevel >= maxLevel) {
        app.showNotification(`У пользователя уже активирован уровень ${currentLevel}`, 'error');
        return;
      }
      
      const confirmed = confirm(
        `Активация уровней:\n\n` +
        `Пользователь: ${userAddress}\n` +
        `Текущий уровень: ${currentLevel}\n` +
        `Активировать до: ${maxLevel}\n\n` +
        `Продолжить?`
      );
      
      if (!confirmed) return;
      
      app.showNotification('Активация уровней...', 'info');
      
      const contract = await app.getSignedContract('GlobalWay');
      const tx = await contract.ownerActivateLevels(userAddress, maxLevel);
      await tx.wait();
      
      app.showNotification(`✅ Уровни активированы до ${maxLevel}!`, 'success');
      
      // Обновляем статистику
      await this.loadStats();
      
      // Очищаем форму
      document.getElementById('activateUserAddress').value = '';
      
    } catch (error) {
      console.error('Activate levels error:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПРИСВОЕНИЕ РАНГА
  // ═══════════════════════════════════════════════════════════════
  async setUserRank() {
    if (!this.access.isOwner) {
      app.showNotification('Только Owner может выполнять это действие', 'error');
      return;
    }
    
    const userAddress = document.getElementById('rankUserAddress').value.trim();
    const rank = parseInt(document.getElementById('rankSelect').value);
    
    if (!ethers.utils.isAddress(userAddress)) {
      app.showNotification('Неверный адрес пользователя', 'error');
      return;
    }
    
    if (!this.contracts.leaderPool) {
      app.showNotification('Контракт LeaderPool не загружен', 'error');
      return;
    }
    
    try {
      const confirmed = confirm(
        `Присвоение ранга:\n\n` +
        `Пользователь: ${userAddress}\n` +
        `Ранг: ${this.RANK_NAMES[rank]}\n\n` +
        `Продолжить?`
      );
      
      if (!confirmed) return;
      
      app.showNotification('Присвоение ранга...', 'info');
      
      const contract = await app.getSignedContract('GlobalWayLeaderPool');
      const tx = await contract.setUserRank(userAddress, rank);
      await tx.wait();
      
      app.showNotification(`✅ Ранг ${this.RANK_NAMES[rank]} присвоен!`, 'success');
      
      // Очищаем форму
      document.getElementById('rankUserAddress').value = '';
      
    } catch (error) {
      console.error('Set rank error:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // GUARDIANS
  // ═══════════════════════════════════════════════════════════════
  async addGuardian() {
    if (!this.access.isOwner) {
      app.showNotification('Только Owner может добавлять Guardians', 'error');
      return;
    }
    
    const address = document.getElementById('addGuardianAddress').value.trim();
    
    if (!ethers.utils.isAddress(address)) {
      app.showNotification('Неверный адрес', 'error');
      return;
    }
    
    if (!this.contracts.governance) {
      app.showNotification('Контракт Governance не загружен', 'error');
      return;
    }
    
    try {
      const confirmed = confirm(`Добавить Guardian:\n${address}\n\nПродолжить?`);
      if (!confirmed) return;
      
      app.showNotification('Добавление Guardian...', 'info');
      
      const contract = await app.getSignedContract('GlobalWayGovernance');
      const tx = await contract.addGuardian(address);
      await tx.wait();
      
      app.showNotification('✅ Guardian добавлен!', 'success');
      
      // Обновляем список
      await this.loadGuardians();
      
      document.getElementById('addGuardianAddress').value = '';
      
    } catch (error) {
      console.error('Add guardian error:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  async removeGuardian() {
    if (!this.access.isOwner) {
      app.showNotification('Только Owner может удалять Guardians', 'error');
      return;
    }
    
    const address = document.getElementById('removeGuardianAddress').value.trim();
    
    if (!ethers.utils.isAddress(address)) {
      app.showNotification('Неверный адрес', 'error');
      return;
    }
    
    if (!this.contracts.governance) {
      app.showNotification('Контракт Governance не загружен', 'error');
      return;
    }
    
    try {
      const confirmed = confirm(
        `⚠️ Удалить Guardian:\n${address}\n\n` +
        `Это действие требует минимум 3 Guardians в системе!\n\n` +
        `Продолжить?`
      );
      if (!confirmed) return;
      
      app.showNotification('Удаление Guardian...', 'info');
      
      const contract = await app.getSignedContract('GlobalWayGovernance');
      const tx = await contract.removeGuardian(address);
      await tx.wait();
      
      app.showNotification('✅ Guardian удалён!', 'success');
      
      // Обновляем список
      await this.loadGuardians();
      
      document.getElementById('removeGuardianAddress').value = '';
      
    } catch (error) {
      console.error('Remove guardian error:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
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
    
    const confirmed = confirm('Поставить контракт на паузу?\n\nВсе операции будут заблокированы!');
    if (!confirmed) return;
    
    try {
      app.showNotification('Постановка на паузу...', 'info');
      
      const contract = await app.getSignedContract('GlobalWay');
      const tx = await contract.pause();
      await tx.wait();
      
      app.showNotification('⏸️ Контракт на паузе!', 'success');
      
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
      
      app.showNotification('▶️ Контракт активен!', 'success');
      
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
      'Вывести ВСЕ средства из контракта?\n\n' +
      'Это действие НЕОБРАТИМО!'
    );
    
    if (!confirmed) return;
    
    // Двойное подтверждение
    const confirmed2 = confirm('Вы УВЕРЕНЫ? Введите "ДА" в следующем окне');
    if (!confirmed2) return;
    
    const input = prompt('Введите "ДА" для подтверждения:');
    if (input !== 'ДА') {
      app.showNotification('Отменено', 'info');
      return;
    }
    
    try {
      app.showNotification('Экстренный вывод...', 'info');
      
      const contract = await app.getSignedContract('GlobalWay');
      const tx = await contract.emergencyWithdraw();
      await tx.wait();
      
      app.showNotification('💰 Средства выведены!', 'success');
      
      await this.loadStats();
      
    } catch (error) {
      console.error('Emergency withdraw error:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЭКСПОРТ ДАННЫХ
  // ═══════════════════════════════════════════════════════════════
  async exportUsers() {
    if (!this.access.isOwner) {
      app.showNotification('Только Owner может экспортировать данные', 'error');
      return;
    }
    
    try {
      app.showNotification('Экспорт пользователей... Это может занять время', 'info');
      
      const totalUsers = Number(await this.contracts.matrixRegistry.totalUsers());
      const users = [];
      
      // Получаем всех пользователей
      for (let i = 0; i < totalUsers && i < 1000; i++) {
        try {
          const address = await this.contracts.globalWay.allUsers(i);
          if (address && address !== '0x0000000000000000000000000000000000000000') {
            const userId = await this.contracts.matrixRegistry.getUserIdByAddress(address);
            const userInfo = await this.contracts.matrixRegistry.users(address);
            const maxLevel = await this.contracts.globalWay.getUserMaxLevel(address);
            
            users.push({
              address: address,
              userId: userId.toString(),
              sponsorId: userInfo.sponsorId.toString(),
              maxLevel: Number(maxLevel),
              personalInvites: Number(userInfo.personalInvites)
            });
          }
        } catch (e) {
          console.log(`Skip user ${i}:`, e.message);
        }
      }
      
      // Скачиваем JSON
      const json = JSON.stringify({ exportDate: new Date().toISOString(), users }, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `globalway_users_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      app.showNotification(`✅ Экспортировано ${users.length} пользователей!`, 'success');
      
    } catch (error) {
      console.error('Export users error:', error);
      app.showNotification('Ошибка экспорта: ' + error.message, 'error');
    }
  },

  async exportRanks() {
    if (!this.access.isOwner) {
      app.showNotification('Только Owner может экспортировать данные', 'error');
      return;
    }
    
    if (!this.contracts.leaderPool) {
      app.showNotification('Контракт LeaderPool не загружен', 'error');
      return;
    }
    
    try {
      app.showNotification('Экспорт рангов... Это может занять время', 'info');
      
      const totalUsers = Number(await this.contracts.matrixRegistry.totalUsers());
      const ranks = [];
      
      for (let i = 0; i < totalUsers && i < 1000; i++) {
        try {
          const address = await this.contracts.globalWay.allUsers(i);
          if (address && address !== '0x0000000000000000000000000000000000000000') {
            const rankInfo = await this.contracts.leaderPool.getUserRankInfo(address);
            if (Number(rankInfo.rank) > 0) {
              ranks.push({
                address: address,
                rank: Number(rankInfo.rank),
                rankName: this.RANK_NAMES[Number(rankInfo.rank)],
                pendingReward: ethers.utils.formatEther(rankInfo.pendingReward)
              });
            }
          }
        } catch (e) {
          // Skip
        }
      }
      
      const json = JSON.stringify({ exportDate: new Date().toISOString(), ranks }, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `globalway_ranks_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      app.showNotification(`✅ Экспортировано ${ranks.length} рангов!`, 'success');
      
    } catch (error) {
      console.error('Export ranks error:', error);
      app.showNotification('Ошибка экспорта: ' + error.message, 'error');
    }
  }
};

// Экспорт
window.adminModule = adminModule;
