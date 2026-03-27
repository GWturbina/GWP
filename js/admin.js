// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Панель Администратора v3.0
// Полный функционал с мобильной адаптацией
// Дата: 2025-12-11
// ═══════════════════════════════════════════════════════════════════

const adminModule = {
  // ═══════════════════════════════════════════════════════════════
  // СОСТОЯНИЕ
  // ═══════════════════════════════════════════════════════════════
  contracts: {},
  
  access: {
    isOwner: false,
    isGuardian: false,
    level: 'No access'
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
  RANK_NAMES: ['No Rank', 'Bronze 🥉', 'Silver 🥈', 'Gold 🥇', 'Platinum 💎'],

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('⚙️ Инициализация Панели Администратора v3.0...');
    
    const adminPage = document.getElementById('admin');
    if (adminPage) {
      adminPage.classList.add('active');
      adminPage.style.display = 'block';
    }
    
    try {
      if (!app.state.userAddress) {
        console.log('⏳ Ожидание подключения кошелька...');
        return;
      }

      const hasAccess = this.checkRights();
      
      if (!hasAccess) {
        this.showAccessDenied();
        return;
      }

      this.renderAdminUI();
      await this.loadContracts();
      await this.loadAllData();
      this.initEventHandlers();

      console.log('✅ Панель администратора загружена');
    } catch (error) {
      console.error('❌ Ошибка инициализации админки:', error);
      app.showNotification('Admin panel loading error', 'error');
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
    this.access.level = isOwner ? 'Owner 👑' : (isGuardian ? 'Board of Directors 🛡️' : 'No access');

    console.log('🔐 Доступ:', this.access.level, 'для', currentAddress);

    return isOwner || isGuardian;
  },

  showAccessDenied() {
    const adminPage = document.getElementById('admin');
    if (!adminPage) return;

    const guardiansList = CONFIG.ADMIN.guardians
      .map((g, i) => `<li>🛡️ Board member ${i + 1}: <code>${g}</code></li>`)
      .join('');

    adminPage.innerHTML = `
      <div class="admin-access-denied">
        <h2>🔒 Access Denied</h2>
        <p class="admin-warning">Admin panel is available only to owner and board members</p>
        <p>Your address: <code>${app.state.userAddress || 'Not connected'}</code></p>
        
        <div class="admin-allowed-list">
          <h4>Allowed addresses:</h4>
          <ul>
            <li>👑 Owner: <code>${CONFIG.ADMIN.owner}</code></li>
            ${guardiansList}
          </ul>
        </div>
        
        <button class="admin-btn admin-btn-primary" onclick="app.showPage('dashboard')">
          ← Back to main
        </button>
      </div>
    `;
    
    this.injectStyles();
  },

  // ═══════════════════════════════════════════════════════════════
  // РЕНДЕР ИНТЕРФЕЙСА
  // ═══════════════════════════════════════════════════════════════
  renderAdminUI() {
    const adminPage = document.getElementById('admin');
    if (!adminPage) return;

    const ownerOnlyClass = this.access.isOwner ? '' : 'admin-hidden';

    adminPage.innerHTML = `
      <div class="admin-container">
        <h2 class="admin-title">🔧 Admin Panel</h2>
        
        <!-- Информация о доступе -->
        <section class="admin-section admin-access-info">
          <div class="admin-badge ${this.access.isOwner ? 'admin-badge-owner' : 'admin-badge-guardian'}">
            ${this.access.level}
          </div>
          <span class="admin-address">${app.formatAddress(app.state.userAddress)}</span>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- СТАТИСТИКА -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section">
          <h3 class="admin-section-title">📊 Platform Statistics</h3>
          <div class="admin-stats-grid">
            <div class="admin-stat-card">
              <div class="admin-stat-value" id="statTotalUsers">-</div>
              <div class="admin-stat-label">Users</div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-value" id="statTotalVolume">-</div>
              <div class="admin-stat-label">Volume (BNB)</div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-value" id="statContractBalance">-</div>
              <div class="admin-stat-label">Balance (BNB)</div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-value" id="statTotalTokens">-</div>
              <div class="admin-stat-label">GWT Tokens</div>
            </div>
          </div>
          
          <h4 class="admin-subtitle">🏆 Leadership Ranks</h4>
          <div class="admin-ranks-grid">
            <div class="admin-rank-card admin-rank-bronze">
              <span class="admin-rank-icon">🥉</span>
              <span class="admin-rank-count" id="rankBronze">0</span>
              <span class="admin-rank-name">Bronze</span>
            </div>
            <div class="admin-rank-card admin-rank-silver">
              <span class="admin-rank-icon">🥈</span>
              <span class="admin-rank-count" id="rankSilver">0</span>
              <span class="admin-rank-name">Silver</span>
            </div>
            <div class="admin-rank-card admin-rank-gold">
              <span class="admin-rank-icon">🥇</span>
              <span class="admin-rank-count" id="rankGold">0</span>
              <span class="admin-rank-name">Gold</span>
            </div>
            <div class="admin-rank-card admin-rank-platinum">
              <span class="admin-rank-icon">💎</span>
              <span class="admin-rank-count" id="rankPlatinum">0</span>
              <span class="admin-rank-name">Platinum</span>
            </div>
          </div>
          
          <button class="admin-btn admin-btn-secondary" id="refreshStatsBtn">🔄 Refresh</button>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- ПОИСК ПОЛЬЗОВАТЕЛЯ -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section">
          <h3 class="admin-section-title">🔍 Search User</h3>
          <div class="admin-search-form">
            <input type="text" id="searchUserInput" class="admin-input" placeholder="Address (0x...) or ID (GW1234567)">
            <button class="admin-btn admin-btn-primary" id="searchUserBtn">Search</button>
          </div>
          <div id="searchResult" class="admin-search-result admin-hidden"></div>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- РЕГИСТРАЦИЯ + АКТИВАЦИЯ -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section ${ownerOnlyClass}">
          <h3 class="admin-section-title">📝 Register New User</h3>
          <p class="admin-desc">Registers new user and activates levels for free</p>
          
          <div class="admin-form-grid">
            <div class="admin-form-group">
              <label>User address</label>
              <input type="text" id="regUserAddress" class="admin-input" placeholder="0x...">
            </div>
            <div class="admin-form-group">
              <label>Sponsor ID</label>
              <input type="text" id="regSponsorId" class="admin-input" placeholder="GW9729645">
            </div>
            <div class="admin-form-group">
              <label>Activate up to level</label>
              <select id="regMaxLevel" class="admin-select">
                <option value="0">Registration only</option>
                ${[1,2,3,4,5,6,7,8,9,10,11,12].map(l => `<option value="${l}" ${l===12?'selected':''}>Level ${l}</option>`).join('')}
              </select>
            </div>
          </div>
          
          <button class="admin-btn admin-btn-success" id="registerAndActivateBtn">
            ✅ Register
          </button>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- ТОЛЬКО АКТИВАЦИЯ -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section ${ownerOnlyClass}">
          <h3 class="admin-section-title">⚡ Активация уровней</h3>
          <p class="admin-desc">Для уже зарегистрированных пользователей</p>
          
          <div class="admin-form-grid">
            <div class="admin-form-group">
              <label>User address</label>
              <input type="text" id="activateUserAddress" class="admin-input" placeholder="0x...">
            </div>
            <div class="admin-form-group">
              <label>До уровня</label>
              <select id="activateMaxLevel" class="admin-select">
                ${[1,2,3,4,5,6,7,8,9,10,11,12].map(l => `<option value="${l}" ${l===12?'selected':''}>Level ${l}</option>`).join('')}
              </select>
            </div>
          </div>
          
          <button class="admin-btn admin-btn-success" id="activateLevelsBtn">
            ⚡ Активировать
          </button>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- ЗАМЕНА КОШЕЛЬКА -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section ${ownerOnlyClass}">
          <h3 class="admin-section-title">🔄 Замена кошелька</h3>
          <p class="admin-desc">Привязать существующий ID к новому адресу кошелька (emergencyFixNodeAddress)</p>
          
          <div class="admin-form-grid">
            <div class="admin-form-group">
              <label>User ID (число, без GW)</label>
              <input type="text" id="changeWalletUserId" class="admin-input" placeholder="9729645">
            </div>
            <div class="admin-form-group">
              <label>Новый адрес кошелька</label>
              <input type="text" id="changeWalletNewAddress" class="admin-input" placeholder="0x...">
            </div>
          </div>
          
          <button class="admin-btn admin-btn-warning" id="changeWalletBtn">
            🔄 Заменить кошелёк
          </button>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- ПРИСВОЕНИЕ РАНГА -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section ${ownerOnlyClass}">
          <h3 class="admin-section-title">🏆 Присвоение ранга</h3>
          <p class="admin-desc">Присваивает лидерский ранг пользователю</p>
          
          <div class="admin-form-grid">
            <div class="admin-form-group">
              <label>User address</label>
              <input type="text" id="rankUserAddress" class="admin-input" placeholder="0x...">
            </div>
            <div class="admin-form-group">
              <label>Ранг</label>
              <select id="rankSelect" class="admin-select">
                <option value="0">Нет ранга</option>
                <option value="1">🥉 Bronze</option>
                <option value="2">🥈 Silver</option>
                <option value="3">🥇 Gold</option>
                <option value="4">💎 Platinum</option>
              </select>
            </div>
          </div>
          
          <button class="admin-btn admin-btn-success" id="setRankBtn">
            🏆 Присвоить ранг
          </button>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- УПРАВЛЕНИЕ АВТОРИЗАЦИЕЙ -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section ${ownerOnlyClass}">
          <h3 class="admin-section-title">🔐 Управление авторизацией</h3>
          <p class="admin-desc">Авторизация контрактов для взаимодействия</p>
          
          <div class="admin-form-grid">
            <div class="admin-form-group">
              <label>Адрес контракта</label>
              <input type="text" id="authContractAddress" class="admin-input" placeholder="0x...">
            </div>
            <div class="admin-form-group">
              <label>Действие</label>
              <select id="authAction" class="admin-select">
                <option value="authorize">Авторизовать</option>
                <option value="revoke">Отозвать авторизацию</option>
              </select>
            </div>
          </div>
          
          <button class="admin-btn admin-btn-warning" id="setAuthBtn">
            🔐 Выполнить
          </button>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- СОВЕТ ДИРЕКТОРОВ (GUARDIANS) -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section">
          <h3 class="admin-section-title">🛡️ Совет директоров</h3>
          <p class="admin-desc">Управление членами совета директоров</p>
          
          <div id="guardiansList" class="admin-guardians-list">
            <div class="admin-loading">Загрузка...</div>
          </div>
          
          <div class="${ownerOnlyClass}">
            <h4 class="admin-subtitle">Добавить члена совета</h4>
            <div class="admin-inline-form">
              <input type="text" id="addGuardianAddress" class="admin-input" placeholder="Адрес (0x...)">
              <button class="admin-btn admin-btn-success" id="addGuardianBtn">Добавить</button>
            </div>
            
            <h4 class="admin-subtitle">Удалить члена совета</h4>
            <div class="admin-inline-form">
              <input type="text" id="removeGuardianAddress" class="admin-input" placeholder="Адрес (0x...)">
              <button class="admin-btn admin-btn-danger" id="removeGuardianBtn">Удалить</button>
            </div>
          </div>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- УПРАВЛЕНИЕ КОНТРАКТАМИ -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section ${ownerOnlyClass}">
          <h3 class="admin-section-title">⚙️ Управление контрактами</h3>
          
          <h4 class="admin-subtitle">Статус контракта</h4>
          <div class="admin-btn-group">
            <button class="admin-btn admin-btn-warning" id="pauseContractBtn">⏸️ Приостановить</button>
            <button class="admin-btn admin-btn-success" id="unpauseContractBtn">▶️ Возобновить</button>
          </div>
          
          <h4 class="admin-subtitle">Изменить адрес контракта</h4>
          <div class="admin-form-grid">
            <div class="admin-form-group">
              <label>Тип контракта</label>
              <select id="contractType" class="admin-select">
                <option value="partnerProgram">PartnerProgram</option>
                <option value="matrixPayments">MatrixPayments</option>
                <option value="quarterlyPayments">QuarterlyPayments</option>
                <option value="investmentPool">InvestmentPool</option>
                <option value="leaderPool">LeaderPool</option>
                <option value="gwtToken">GWTToken</option>
                <option value="treasury">Treasury</option>
                <option value="charity">Charity</option>
              </select>
            </div>
            <div class="admin-form-group">
              <label>Новый адрес</label>
              <input type="text" id="newContractAddress" class="admin-input" placeholder="0x...">
            </div>
          </div>
          <button class="admin-btn admin-btn-warning" id="updateContractBtn">🔄 Обновить адрес</button>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- ФИНАНСОВЫЙ МЕНЕДЖМЕНТ -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section ${ownerOnlyClass}">
          <h3 class="admin-section-title">💰 Финансовый менеджмент</h3>
          
          <div id="contractBalances" class="admin-balances-grid">
            <div class="admin-loading">Загрузка балансов...</div>
          </div>
          
          <h4 class="admin-subtitle">Вывод средств</h4>
          <div class="admin-form-grid">
            <div class="admin-form-group">
              <label>Контракт</label>
              <select id="withdrawContract" class="admin-select">
                <option value="globalway">GlobalWay</option>
                <option value="matrix">MatrixPayments</option>
                <option value="partner">PartnerProgram</option>
              </select>
            </div>
            <div class="admin-form-group">
              <label>Адрес получателя</label>
              <input type="text" id="withdrawAddress" class="admin-input" placeholder="0x...">
            </div>
            <div class="admin-form-group">
              <label>Сумма (BNB)</label>
              <input type="text" id="withdrawAmount" class="admin-input" placeholder="0.0">
            </div>
          </div>
          <p class="admin-notice">⚠️ Для сумм свыше 5 BNB требуется голосование совета</p>
          <button class="admin-btn admin-btn-warning" id="withdrawBtn">💸 Вывести</button>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- ДЕЛЕГИРОВАНИЕ ПРАВ -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section ${ownerOnlyClass}">
          <h3 class="admin-section-title">👥 Делегирование прав</h3>
          <p class="admin-desc">Передача определённых прав другим адресам</p>
          
          <div class="admin-form-grid">
            <div class="admin-form-group">
              <label>Адрес делегата</label>
              <input type="text" id="delegateAddress" class="admin-input" placeholder="0x...">
            </div>
            <div class="admin-form-group">
              <label>Права</label>
              <div class="admin-checkbox-group">
                <label class="admin-checkbox">
                  <input type="checkbox" id="permStats"> Статистика
                </label>
                <label class="admin-checkbox">
                  <input type="checkbox" id="permUsers"> Пользователи
                </label>
                <label class="admin-checkbox">
                  <input type="checkbox" id="permNews"> Новости
                </label>
                <label class="admin-checkbox">
                  <input type="checkbox" id="permSupport"> Поддержка
                </label>
              </div>
            </div>
          </div>
          
          <div class="admin-form-group">
            <label>Причина</label>
            <textarea id="delegateReason" class="admin-textarea" placeholder="Укажите причину делегирования..."></textarea>
          </div>
          
          <button class="admin-btn admin-btn-success" id="delegateBtn">👥 Делегировать права</button>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- НОВОСТИ И ПУБЛИКАЦИИ -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section ${ownerOnlyClass}">
          <h3 class="admin-section-title">📰 Новости и публикации</h3>
          <p class="admin-desc">Управление новостями платформы</p>
          
          <div class="admin-form-group">
            <label>Заголовок</label>
            <input type="text" id="newsTitle" class="admin-input" placeholder="Заголовок новости...">
          </div>
          <div class="admin-form-group">
            <label>Текст новости</label>
            <textarea id="newsContent" class="admin-textarea" placeholder="Текст новости..."></textarea>
          </div>
          <div class="admin-form-grid">
            <div class="admin-form-group">
              <label>Ссылка (необязательно)</label>
              <input type="text" id="newsLink" class="admin-input" placeholder="https://...">
            </div>
            <div class="admin-form-group">
              <label>Изображение</label>
              <input type="file" id="newsImage" class="admin-input" accept="image/*">
            </div>
          </div>
          
          <button class="admin-btn admin-btn-success" id="publishNewsBtn">📰 Опубликовать</button>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- ЭКСПОРТ БАЗЫ ДАННЫХ -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section ${ownerOnlyClass}">
          <h3 class="admin-section-title">💾 Экспорт базы данных</h3>
          <p class="admin-desc">Скачать данные для восстановления при передеплое</p>
          
          <div class="admin-btn-group">
            <button class="admin-btn admin-btn-secondary" id="exportUsersBtn">
              📥 Пользователи
            </button>
            <button class="admin-btn admin-btn-secondary" id="exportRanksBtn">
              📥 Ранги
            </button>
            <button class="admin-btn admin-btn-secondary" id="exportAllBtn">
              📥 Вся база
            </button>
          </div>
        </section>

        <!-- ═══════════════════════════════════════════════════════ -->
        <!-- ОПАСНАЯ ЗОНА -->
        <!-- ═══════════════════════════════════════════════════════ -->
        <section class="admin-section admin-danger-zone ${ownerOnlyClass}">
          <h3 class="admin-section-title">⚠️ Опасная зона</h3>
          <p class="admin-warning-text">Эти действия необратимы! Будьте очень осторожны.</p>
          
          <div class="admin-btn-group">
            <button class="admin-btn admin-btn-danger" id="emergencyWithdrawBtn">
              🚨 Экстренный вывод
            </button>
            <button class="admin-btn admin-btn-danger" id="transferOwnershipBtn">
              🔑 Передать владение
            </button>
          </div>
        </section>
      </div>
    `;

    this.injectStyles();
  },

  // ═══════════════════════════════════════════════════════════════
  // СТИЛИ (УЛУЧШЕННАЯ МОБИЛЬНАЯ АДАПТАЦИЯ)
  // ═══════════════════════════════════════════════════════════════
  injectStyles() {
    if (document.getElementById('admin-styles-v3')) return;

    const styles = document.createElement('style');
    styles.id = 'admin-styles-v3';
    styles.textContent = `
      /* ═══════════════════════════════════════════════════════ */
      /* БАЗОВЫЕ СТИЛИ */
      /* ═══════════════════════════════════════════════════════ */
      .admin-container {
        max-width: 1000px;
        margin: 0 auto;
        padding: 10px;
        font-size: 13px;
      }
      
      .admin-title {
        color: #ffd700;
        text-align: center;
        margin-bottom: 15px;
        font-size: 18px;
      }
      
      .admin-section {
        background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
        border: 1px solid #2a2a4a;
        border-radius: 10px;
        padding: 12px;
        margin-bottom: 12px;
      }
      
      .admin-section-title {
        color: #ffd700;
        margin: 0 0 10px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid #333;
        font-size: 14px;
      }
      
      .admin-subtitle {
        color: #ccc;
        margin: 12px 0 8px;
        font-size: 12px;
      }
      
      .admin-desc {
        color: #888;
        font-size: 11px;
        margin-bottom: 12px;
      }
      
      .admin-hidden { display: none !important; }
      
      /* ═══════════════════════════════════════════════════════ */
      /* ИНФОРМАЦИЯ О ДОСТУПЕ */
      /* ═══════════════════════════════════════════════════════ */
      .admin-access-info {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px !important;
        flex-wrap: wrap;
      }
      
      .admin-badge {
        padding: 5px 12px;
        border-radius: 15px;
        font-weight: bold;
        font-size: 11px;
      }
      
      .admin-badge-owner {
        background: linear-gradient(135deg, #ffd700, #ffaa00);
        color: #000;
      }
      
      .admin-badge-guardian {
        background: linear-gradient(135deg, #4a90d9, #357abd);
        color: #fff;
      }
      
      .admin-address {
        color: #888;
        font-family: monospace;
        font-size: 11px;
      }
      
      /* ═══════════════════════════════════════════════════════ */
      /* СТАТИСТИКА */
      /* ═══════════════════════════════════════════════════════ */
      .admin-stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        margin-bottom: 12px;
      }
      
      .admin-stat-card {
        background: rgba(255, 215, 0, 0.1);
        border: 1px solid #ffd700;
        border-radius: 8px;
        padding: 10px;
        text-align: center;
      }
      
      .admin-stat-value {
        font-size: 18px;
        font-weight: bold;
        color: #ffd700;
      }
      
      .admin-stat-label {
        color: #888;
        font-size: 10px;
        margin-top: 3px;
      }
      
      /* ═══════════════════════════════════════════════════════ */
      /* РАНГИ */
      /* ═══════════════════════════════════════════════════════ */
      .admin-ranks-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
        margin-bottom: 12px;
      }
      
      .admin-rank-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px 4px;
        border-radius: 8px;
        border: 2px solid;
      }
      
      .admin-rank-bronze { border-color: #cd7f32; background: rgba(205, 127, 50, 0.15); }
      .admin-rank-silver { border-color: #c0c0c0; background: rgba(192, 192, 192, 0.15); }
      .admin-rank-gold { border-color: #ffd700; background: rgba(255, 215, 0, 0.15); }
      .admin-rank-platinum { border-color: #e5e4e2; background: rgba(229, 228, 226, 0.15); }
      
      .admin-rank-icon { font-size: 16px; }
      .admin-rank-count { font-size: 18px; font-weight: bold; color: #fff; }
      .admin-rank-name { color: #888; font-size: 9px; }
      
      /* ═══════════════════════════════════════════════════════ */
      /* ФОРМЫ */
      /* ═══════════════════════════════════════════════════════ */
      .admin-form-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
        margin-bottom: 12px;
      }
      
      .admin-form-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .admin-form-group label {
        color: #ccc;
        font-size: 11px;
      }
      
      .admin-input,
      .admin-select,
      .admin-textarea {
        padding: 10px;
        border: 1px solid #333;
        border-radius: 6px;
        background: #1a1a2e;
        color: #fff;
        font-size: 13px;
        width: 100%;
        box-sizing: border-box;
      }
      
      .admin-input:focus,
      .admin-select:focus,
      .admin-textarea:focus {
        border-color: #ffd700;
        outline: none;
      }
      
      .admin-textarea {
        min-height: 60px;
        resize: vertical;
      }
      
      .admin-inline-form {
        display: flex;
        gap: 8px;
        margin-bottom: 10px;
        flex-wrap: wrap;
      }
      
      .admin-inline-form .admin-input {
        flex: 1;
        min-width: 150px;
      }
      
      /* ═══════════════════════════════════════════════════════ */
      /* ПОИСК */
      /* ═══════════════════════════════════════════════════════ */
      .admin-search-form {
        display: flex;
        gap: 8px;
        margin-bottom: 10px;
        flex-wrap: wrap;
      }
      
      .admin-search-form .admin-input {
        flex: 1;
        min-width: 150px;
      }
      
      .admin-search-result {
        background: #1a2a1e;
        border: 1px solid #00ff88;
        border-radius: 8px;
        padding: 12px;
        margin-top: 10px;
        font-size: 12px;
      }
      
      .admin-search-result.admin-error {
        background: #2a1a1e;
        border-color: #ff4444;
      }
      
      .admin-search-result h4 {
        color: #00ff88;
        margin: 0 0 8px 0;
        font-size: 13px;
      }
      
      .admin-search-result.admin-error h4 {
        color: #ff4444;
      }
      
      .admin-search-result p {
        margin: 5px 0;
        color: #ccc;
      }
      
      .admin-search-result code {
        background: #333;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        word-break: break-all;
      }
      
      /* ═══════════════════════════════════════════════════════ */
      /* GUARDIANS */
      /* ═══════════════════════════════════════════════════════ */
      .admin-guardians-list {
        margin-bottom: 12px;
      }
      
      .admin-guardian-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #1a1a2e;
        border: 1px solid #333;
        border-radius: 6px;
        padding: 8px 10px;
        margin-bottom: 6px;
        flex-wrap: wrap;
        gap: 5px;
      }
      
      .admin-guardian-card.admin-guardian-owner {
        border-color: #ffd700;
      }
      
      .admin-guardian-info {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      
      .admin-guardian-badge {
        padding: 3px 8px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: bold;
      }
      
      .admin-guardian-badge.admin-badge-owner {
        background: #ffd700;
        color: #000;
      }
      
      .admin-guardian-badge.admin-badge-guardian {
        background: #4a90d9;
        color: #fff;
      }
      
      .admin-guardian-address {
        font-family: monospace;
        color: #ccc;
        font-size: 10px;
        word-break: break-all;
      }
      
      /* ═══════════════════════════════════════════════════════ */
      /* ЧЕКБОКСЫ */
      /* ═══════════════════════════════════════════════════════ */
      .admin-checkbox-group {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      
      .admin-checkbox {
        display: flex;
        align-items: center;
        gap: 5px;
        color: #ccc;
        font-size: 11px;
        cursor: pointer;
      }
      
      .admin-checkbox input {
        width: 14px;
        height: 14px;
      }
      
      /* ═══════════════════════════════════════════════════════ */
      /* БАЛАНСЫ */
      /* ═══════════════════════════════════════════════════════ */
      .admin-balances-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
        margin-bottom: 12px;
      }
      
      .admin-balance-card {
        background: #1a1a2e;
        border: 1px solid #333;
        border-radius: 6px;
        padding: 8px;
        text-align: center;
      }
      
      .admin-balance-name {
        color: #888;
        font-size: 10px;
      }
      
      .admin-balance-value {
        color: #ffd700;
        font-size: 14px;
        font-weight: bold;
      }
      
      /* ═══════════════════════════════════════════════════════ */
      /* КНОПКИ */
      /* ═══════════════════════════════════════════════════════ */
      .admin-btn {
        padding: 10px 15px;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }
      
      .admin-btn-primary {
        background: linear-gradient(135deg, #ffd700, #ffaa00);
        color: #000;
      }
      
      .admin-btn-secondary {
        background: #333;
        color: #fff;
        border: 1px solid #555;
      }
      
      .admin-btn-success {
        background: linear-gradient(135deg, #00c853, #00a843);
        color: #fff;
      }
      
      .admin-btn-warning {
        background: linear-gradient(135deg, #ff9800, #f57c00);
        color: #fff;
      }
      
      .admin-btn-danger {
        background: linear-gradient(135deg, #f44336, #d32f2f);
        color: #fff;
      }
      
      .admin-btn:active {
        transform: scale(0.98);
      }
      
      .admin-btn-group {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      
      /* ═══════════════════════════════════════════════════════ */
      /* ОПАСНАЯ ЗОНА */
      /* ═══════════════════════════════════════════════════════ */
      .admin-danger-zone {
        border-color: #f44336 !important;
        background: linear-gradient(145deg, #2a1a1e 0%, #1e1a1a 100%) !important;
      }
      
      .admin-danger-zone .admin-section-title {
        color: #f44336 !important;
      }
      
      .admin-warning-text {
        color: #ff6b6b;
        font-size: 11px;
        margin-bottom: 12px;
      }
      
      .admin-notice {
        color: #ffaa00;
        font-size: 10px;
        margin: 8px 0;
      }
      
      /* ═══════════════════════════════════════════════════════ */
      /* ДОСТУП ЗАПРЕЩЁН */
      /* ═══════════════════════════════════════════════════════ */
      .admin-access-denied {
        text-align: center;
        padding: 30px 15px;
      }
      
      .admin-access-denied h2 {
        color: #f44336;
        font-size: 18px;
      }
      
      .admin-access-denied .admin-warning {
        color: #ff6b6b;
        font-size: 13px;
        margin: 15px 0;
      }
      
      .admin-access-denied code {
        background: #333;
        padding: 3px 10px;
        border-radius: 4px;
        font-size: 11px;
        word-break: break-all;
      }
      
      .admin-allowed-list {
        background: #1a1a2e;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 15px;
        margin: 20px auto;
        max-width: 500px;
        text-align: left;
      }
      
      .admin-allowed-list h4 {
        color: #ffd700;
        margin: 0 0 10px 0;
        font-size: 13px;
      }
      
      .admin-allowed-list ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      
      .admin-allowed-list li {
        padding: 6px 0;
        border-bottom: 1px solid #333;
        font-size: 11px;
      }
      
      .admin-allowed-list li:last-child {
        border-bottom: none;
      }
      
      .admin-loading {
        color: #888;
        text-align: center;
        padding: 15px;
        font-size: 12px;
      }
      
      /* ═══════════════════════════════════════════════════════ */
      /* ПЛАНШЕТ (600px+) */
      /* ═══════════════════════════════════════════════════════ */
      @media (min-width: 600px) {
        .admin-container {
          padding: 15px;
          font-size: 14px;
        }
        
        .admin-title {
          font-size: 22px;
          margin-bottom: 20px;
        }
        
        .admin-section {
          padding: 18px;
          margin-bottom: 18px;
        }
        
        .admin-section-title {
          font-size: 16px;
        }
        
        .admin-form-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .admin-stats-grid {
          grid-template-columns: repeat(4, 1fr);
        }
        
        .admin-balances-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        
        .admin-stat-value {
          font-size: 24px;
        }
        
        .admin-rank-count {
          font-size: 22px;
        }
      }
      
      /* ═══════════════════════════════════════════════════════ */
      /* ДЕСКТОП (900px+) */
      /* ═══════════════════════════════════════════════════════ */
      @media (min-width: 900px) {
        .admin-container {
          padding: 20px;
        }
        
        .admin-section {
          padding: 25px;
        }
        
        .admin-form-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        
        .admin-btn {
          padding: 12px 20px;
          font-size: 14px;
        }
      }
    `;
    document.head.appendChild(styles);
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА КОНТРАКТОВ
  // ═══════════════════════════════════════════════════════════════
  async loadContracts() {
    console.log('📥 Загрузка контрактов...');
    
    try {
      this.contracts.globalWay = await app.getContract('GlobalWay');
      this.contracts.matrixRegistry = await app.getContract('MatrixRegistry');
      console.log('✅ Основные контракты загружены');
    } catch (e) {
      console.error('❌ Ошибка загрузки основных контрактов:', e);
    }
    
    try {
      this.contracts.leaderPool = await app.getContract('GlobalWayLeaderPool');
      console.log('✅ LeaderPool загружен');
    } catch (e) {
      console.log('⚠️ LeaderPool недоступен');
    }
    
    try {
      this.contracts.governance = await app.getContract('GlobalWayGovernance');
      console.log('✅ Governance загружен');
    } catch (e) {
      console.log('⚠️ Governance недоступен');
    }
    
    try {
      this.contracts.gwtToken = await app.getContract('GWTToken');
      console.log('✅ GWTToken загружен');
    } catch (e) {
      console.log('⚠️ GWTToken недоступен');
    }
    
    try {
      this.contracts.matrixPayments = await app.getContract('MatrixPayments');
      this.contracts.partnerProgram = await app.getContract('PartnerProgram');
      console.log('✅ Дополнительные контракты загружены');
    } catch (e) {
      console.log('⚠️ Дополнительные контракты недоступны');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА ДАННЫХ
  // ═══════════════════════════════════════════════════════════════
  async loadAllData() {
    await Promise.all([
      this.loadStats(),
      this.loadGuardians(),
      this.loadBalances()
    ]);
  },

  async loadStats() {
    console.log('📊 Загрузка статистики...');
    
    try {
      // Пользователи
      let totalUsers = 0;
      if (this.contracts.matrixRegistry) {
        try {
          totalUsers = Number(await this.contracts.matrixRegistry.totalUsers());
        } catch (e) {
          console.error('Ошибка получения totalUsers из MatrixRegistry:', e);
        }
      }
      
      if (totalUsers === 0 && this.contracts.globalWay) {
        try {
          totalUsers = Number(await this.contracts.globalWay.getTotalUsers());
        } catch (e) {
          console.error('Ошибка получения totalUsers из GlobalWay:', e);
        }
      }
      
      // Объём
      let totalVolume = '0';
      if (this.contracts.globalWay) {
        try {
          const volume = await this.contracts.globalWay.totalVolume();
          totalVolume = ethers.utils.formatEther(volume);
        } catch (e) {
          console.error('Ошибка получения totalVolume:', e);
        }
      }
      
      // Баланс контракта
      let contractBalance = '0';
      try {
        const balance = await window.web3Manager.provider.getBalance(CONFIG.CONTRACTS.GlobalWay);
        contractBalance = ethers.utils.formatEther(balance);
      } catch (e) {
        console.error('Ошибка получения баланса:', e);
      }
      
      // Токены
      let totalTokens = '0';
      if (this.contracts.gwtToken) {
        try {
          const supply = await this.contracts.gwtToken.totalSupply();
          totalTokens = ethers.utils.formatEther(supply);
        } catch (e) {
          console.error('Ошибка получения totalSupply:', e);
        }
      }
      
      // Обновляем UI
      const el = (id) => document.getElementById(id);
      if (el('statTotalUsers')) el('statTotalUsers').textContent = totalUsers;
      if (el('statTotalVolume')) el('statTotalVolume').textContent = parseFloat(totalVolume).toFixed(2);
      if (el('statContractBalance')) el('statContractBalance').textContent = parseFloat(contractBalance).toFixed(2);
      if (el('statTotalTokens')) el('statTotalTokens').textContent = this.formatNumber(parseFloat(totalTokens));
      
      // Загружаем ранги
      await this.loadRanksCount(totalUsers);
      
      console.log('✅ Статистика загружена');
      
    } catch (error) {
      console.error('❌ Ошибка загрузки статистики:', error);
    }
  },

  async loadRanksCount(totalUsersFromMatrix) {
    console.log('🏆 Загрузка рангов...');
    
    const ranks = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    
    // Пересоздаём контракты для получения свежих данных
    try {
      this.contracts.leaderPool = await app.getContract('GlobalWayLeaderPool');
      this.contracts.globalWay = await app.getContract('GlobalWay');
    } catch (e) {
      console.log('⚠️ Не удалось обновить контракты:', e.message);
    }
    
    if (!this.contracts.leaderPool) {
      console.log('⚠️ Контракт LeaderPool недоступен');
      this.updateRanksUI(ranks);
      return;
    }
    
    try {
      // Получаем РЕАЛЬНОЕ количество пользователей из GlobalWay
      let totalUsersGW = 0;
      try {
        totalUsersGW = Number(await this.contracts.globalWay.getTotalUsers());
        console.log(`📊 GlobalWay.getTotalUsers() = ${totalUsersGW}`);
      } catch (e) {
        console.log('⚠️ getTotalUsers не работает:', e.message);
      }
      
      // Также проверяем totalUsers mapping
      try {
        const totalUsersVar = Number(await this.contracts.globalWay.totalUsers());
        console.log(`📊 GlobalWay.totalUsers = ${totalUsersVar}`);
        if (totalUsersVar > totalUsersGW) totalUsersGW = totalUsersVar;
      } catch (e) {
        // Переменная может не существовать
      }
      
      const maxCheck = Math.max(totalUsersGW, totalUsersFromMatrix, 20); // Минимум 20
      console.log(`📊 Проверяем до ${maxCheck} пользователей...`);
      
      const checkedAddresses = new Set();
      
      // Собираем адреса из GlobalWay.allUsers()
      if (this.contracts.globalWay && this.contracts.globalWay.allUsers) {
        console.log('🔍 Сканирование GlobalWay.allUsers...');
        
        for (let i = 0; i < maxCheck + 10; i++) {
          try {
            const address = await this.contracts.globalWay.allUsers(i);
            if (address && address !== '0x0000000000000000000000000000000000000000') {
              checkedAddresses.add(address.toLowerCase());
            }
          } catch (e) {
            console.log(`  ✅ allUsers закончился на индексе ${i}`);
            break;
          }
        }
      }
      
      console.log(`📋 Найдено ${checkedAddresses.size} адресов в GlobalWay.allUsers`);
      
      // Также добавляем известные адреса (Owner + Guardians)
      const knownAddresses = [
        app.state.userAddress,
        ...CONFIG.ADMIN.guardians
      ].filter(a => a);
      
      for (const addr of knownAddresses) {
        checkedAddresses.add(addr.toLowerCase());
      }
      
      // Добавляем адреса из localStorage (те кому присваивались ранги)
      const savedRankedAddresses = this.getRankedAddresses();
      console.log(`💾 Сохранённых адресов с рангами: ${savedRankedAddresses.length}`);
      
      for (const addr of savedRankedAddresses) {
        checkedAddresses.add(addr.toLowerCase());
      }
      
      console.log(`📋 Всего уникальных адресов: ${checkedAddresses.size}`);
      
      // Проверяем ранги для всех адресов
      for (const addressLower of checkedAddresses) {
        try {
          const address = addressLower; // Используем lowercase
          const rankInfo = await this.contracts.leaderPool.getUserRankInfo(address);
          const rank = Number(rankInfo.rank || rankInfo[0] || 0);
          
          if (rank > 0) {
            const rankNames = ['', 'Bronze', 'Silver', 'Gold', 'Platinum'];
            console.log(`  👤 ${address.slice(0,10)}... → ${rankNames[rank]} (${rank})`);
          }
          
          if (rank === 1) ranks.bronze++;
          else if (rank === 2) ranks.silver++;
          else if (rank === 3) ranks.gold++;
          else if (rank === 4) ranks.platinum++;
          
          // Автосохранение адресов с рангами
          if (rank > 0) {
            this.saveRankedAddress(addressLower, rank);
          }
        } catch (e) {
          // Пропускаем ошибки
        }
      }
      
      console.log('✅ Ранги подсчитаны:', ranks);
      
    } catch (error) {
      console.error('❌ Ошибка загрузки рангов:', error);
    }
    
    this.updateRanksUI(ranks);
  },

  updateRanksUI(ranks) {
    const el = (id) => document.getElementById(id);
    if (el('rankBronze')) el('rankBronze').textContent = ranks.bronze;
    if (el('rankSilver')) el('rankSilver').textContent = ranks.silver;
    if (el('rankGold')) el('rankGold').textContent = ranks.gold;
    if (el('rankPlatinum')) el('rankPlatinum').textContent = ranks.platinum;
  },

  async loadGuardians() {
    console.log('🛡️ Загрузка совета директоров...');
    
    const listEl = document.getElementById('guardiansList');
    if (!listEl) return;
    
    try {
      let guardians = [];
      
      if (this.contracts.governance) {
        try {
          guardians = await this.contracts.governance.getGuardians();
          console.log('✅ Guardians из контракта:', guardians.length);
        } catch (e) {
          console.log('⚠️ Не удалось получить guardians из контракта, используем CONFIG');
        }
      }
      
      if (guardians.length === 0) {
        guardians = [CONFIG.ADMIN.owner, ...CONFIG.ADMIN.guardians];
      }
      
      this.state.guardians = guardians;
      
      listEl.innerHTML = guardians.map((addr, index) => {
        const isOwner = addr.toLowerCase() === CONFIG.ADMIN.owner.toLowerCase();
        return `
          <div class="admin-guardian-card ${isOwner ? 'admin-guardian-owner' : ''}">
            <div class="admin-guardian-info">
              <span class="admin-guardian-badge ${isOwner ? 'admin-badge-owner' : 'admin-badge-guardian'}">
                ${isOwner ? '👑 Владелец' : `🛡️ Член ${index}`}
              </span>
              <span class="admin-guardian-address">${this.formatAddressShort(addr)}</span>
            </div>
            <button class="admin-btn admin-btn-secondary" onclick="navigator.clipboard.writeText('${addr}'); app.showNotification('Скопировано!', 'success');">
              📋
            </button>
          </div>
        `;
      }).join('');
      
    } catch (error) {
      console.error('❌ Ошибка загрузки guardians:', error);
      listEl.innerHTML = '<div class="admin-loading">Ошибка загрузки</div>';
    }
  },

  async loadBalances() {
    const container = document.getElementById('contractBalances');
    if (!container) return;
    
    try {
      const contracts = [
        { name: 'GlobalWay', address: CONFIG.CONTRACTS.GlobalWay },
        { name: 'MatrixPay', address: CONFIG.CONTRACTS.MatrixPayments },
        { name: 'Partner', address: CONFIG.CONTRACTS.PartnerProgram },
        { name: 'Quarterly', address: CONFIG.CONTRACTS.QuarterlyPayments },
        { name: 'Investment', address: CONFIG.CONTRACTS.InvestmentPool },
        { name: 'Leader', address: CONFIG.CONTRACTS.GlobalWayLeaderPool }
      ];
      
      let html = '';
      
      for (const c of contracts) {
        if (c.address) {
          try {
            const balance = await window.web3Manager.provider.getBalance(c.address);
            const bnb = parseFloat(ethers.utils.formatEther(balance)).toFixed(3);
            html += `
              <div class="admin-balance-card">
                <div class="admin-balance-name">${c.name}</div>
                <div class="admin-balance-value">${bnb} BNB</div>
              </div>
            `;
          } catch (e) {
            html += `
              <div class="admin-balance-card">
                <div class="admin-balance-name">${c.name}</div>
                <div class="admin-balance-value">-</div>
              </div>
            `;
          }
        }
      }
      
      container.innerHTML = html || '<div class="admin-loading">Нет данных</div>';
      
    } catch (error) {
      console.error('Ошибка загрузки балансов:', error);
      container.innerHTML = '<div class="admin-loading">Ошибка загрузки</div>';
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ОБРАБОТЧИКИ СОБЫТИЙ
  // ═══════════════════════════════════════════════════════════════
  initEventHandlers() {
    console.log('🎯 Инициализация обработчиков...');
    
    const self = this;
    
    // Статистика
    const refreshStatsBtn = document.getElementById('refreshStatsBtn');
    if (refreshStatsBtn) {
      refreshStatsBtn.addEventListener('click', () => {
        console.log('🔄 Обновление статистики...');
        self.loadStats();
      });
    }
    
    // Поиск
    const searchUserBtn = document.getElementById('searchUserBtn');
    if (searchUserBtn) {
      searchUserBtn.addEventListener('click', () => {
        console.log('🔍 Поиск пользователя...');
        self.searchUser();
      });
    }
    
    const searchInput = document.getElementById('searchUserInput');
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => { 
        if (e.key === 'Enter') self.searchUser(); 
      });
    }
    
    // Регистрация + Активация
    const registerAndActivateBtn = document.getElementById('registerAndActivateBtn');
    if (registerAndActivateBtn) {
      registerAndActivateBtn.addEventListener('click', () => {
        console.log('📝 Регистрация и активация...');
        self.registerAndActivate();
      });
    }
    
    // Только активация
    const activateLevelsBtn = document.getElementById('activateLevelsBtn');
    if (activateLevelsBtn) {
      activateLevelsBtn.addEventListener('click', () => {
        console.log('⚡ Активация уровней...');
        self.activateLevels();
      });
    }
    
    // ✅ Замена кошелька
    const changeWalletBtn = document.getElementById('changeWalletBtn');
    if (changeWalletBtn) {
      changeWalletBtn.addEventListener('click', () => {
        console.log('🔄 Замена кошелька...');
        self.changeUserWallet();
      });
    }
    
    // Ранги
    const setRankBtn = document.getElementById('setRankBtn');
    if (setRankBtn) {
      setRankBtn.addEventListener('click', () => {
        console.log('🏆 Присвоение ранга...');
        self.setUserRank();
      });
    }
    
    // Авторизация
    const setAuthBtn = document.getElementById('setAuthBtn');
    if (setAuthBtn) {
      setAuthBtn.addEventListener('click', () => {
        console.log('🔐 Управление авторизацией...');
        self.setAuthorization();
      });
    }
    
    // Guardians
    const addGuardianBtn = document.getElementById('addGuardianBtn');
    if (addGuardianBtn) {
      addGuardianBtn.addEventListener('click', () => {
        console.log('➕ Добавление Guardian...');
        self.addGuardian();
      });
    }
    
    const removeGuardianBtn = document.getElementById('removeGuardianBtn');
    if (removeGuardianBtn) {
      removeGuardianBtn.addEventListener('click', () => {
        console.log('➖ Удаление Guardian...');
        self.removeGuardian();
      });
    }
    
    // Контракты
    const pauseContractBtn = document.getElementById('pauseContractBtn');
    if (pauseContractBtn) {
      pauseContractBtn.addEventListener('click', () => {
        console.log('⏸️ Пауза контракта...');
        self.pauseContract();
      });
    }
    
    const unpauseContractBtn = document.getElementById('unpauseContractBtn');
    if (unpauseContractBtn) {
      unpauseContractBtn.addEventListener('click', () => {
        console.log('▶️ Возобновление контракта...');
        self.unpauseContract();
      });
    }
    
    const updateContractBtn = document.getElementById('updateContractBtn');
    if (updateContractBtn) {
      updateContractBtn.addEventListener('click', () => {
        console.log('🔄 Обновление адреса контракта...');
        self.updateContractAddress();
      });
    }
    
    // Финансы
    const withdrawBtn = document.getElementById('withdrawBtn');
    if (withdrawBtn) {
      withdrawBtn.addEventListener('click', () => {
        console.log('💸 Вывод средств...');
        self.withdrawFunds();
      });
    }
    
    // Делегирование
    const delegateBtn = document.getElementById('delegateBtn');
    if (delegateBtn) {
      delegateBtn.addEventListener('click', () => {
        console.log('👥 Делегирование прав...');
        self.delegateRights();
      });
    }
    
    // Новости
    const publishNewsBtn = document.getElementById('publishNewsBtn');
    if (publishNewsBtn) {
      publishNewsBtn.addEventListener('click', () => {
        console.log('📰 Публикация новости...');
        self.publishNews();
      });
    }
    
    // Экспорт
    const exportUsersBtn = document.getElementById('exportUsersBtn');
    if (exportUsersBtn) {
      exportUsersBtn.addEventListener('click', () => {
        console.log('📥 Экспорт пользователей...');
        self.exportUsers();
      });
    }
    
    const exportRanksBtn = document.getElementById('exportRanksBtn');
    if (exportRanksBtn) {
      exportRanksBtn.addEventListener('click', () => {
        console.log('📥 Экспорт рангов...');
        self.exportRanks();
      });
    }
    
    const exportAllBtn = document.getElementById('exportAllBtn');
    if (exportAllBtn) {
      exportAllBtn.addEventListener('click', () => {
        console.log('📥 Экспорт всей базы...');
        self.exportAll();
      });
    }
    
    // Опасная зона
    const emergencyWithdrawBtn = document.getElementById('emergencyWithdrawBtn');
    if (emergencyWithdrawBtn) {
      emergencyWithdrawBtn.addEventListener('click', () => {
        console.log('🚨 Экстренный вывод...');
        self.emergencyWithdraw();
      });
    }
    
    const transferOwnershipBtn = document.getElementById('transferOwnershipBtn');
    if (transferOwnershipBtn) {
      transferOwnershipBtn.addEventListener('click', () => {
        console.log('🔑 Передача владения...');
        self.transferOwnership();
      });
    }
    
    console.log('✅ Все обработчики привязаны');
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
    
    resultEl.classList.remove('admin-hidden', 'admin-error');
    resultEl.innerHTML = '<div class="admin-loading">Поиск...</div>';
    
    try {
      let address = query;
      let userId = null;
      
      if (query.startsWith('GW') || query.startsWith('gw')) {
        userId = query.substring(2);
        address = await this.contracts.matrixRegistry.getAddressById(userId);
      } else if (/^\d+$/.test(query)) {
        userId = query;
        address = await this.contracts.matrixRegistry.getAddressById(userId);
      }
      
      if (!ethers.utils.isAddress(address) || address === '0x0000000000000000000000000000000000000000') {
        resultEl.classList.add('admin-error');
        resultEl.innerHTML = `
          <h4>❌ Пользователь не найден</h4>
          <p>Запрос: <code>${escapeHtml(query)}</code></p>
        `;
        return;
      }
      
      const isRegistered = await this.contracts.matrixRegistry.isRegistered(address);
      
      if (!isRegistered) {
        resultEl.classList.add('admin-error');
        resultEl.innerHTML = `
          <h4>❌ Не зарегистрирован</h4>
          <p>Адрес: <code>${escapeHtml(address)}</code></p>
        `;
        return;
      }
      
      if (!userId) {
        userId = await this.contracts.matrixRegistry.getUserIdByAddress(address);
      }
      
      const maxLevel = await this.contracts.globalWay.getUserMaxLevel(address);
      
      let rank = 0;
      let rankName = 'Нет ранга';
      if (this.contracts.leaderPool) {
        try {
          const rankInfo = await this.contracts.leaderPool.getUserRankInfo(address);
          rank = Number(rankInfo.rank || rankInfo[0] || 0);
          rankName = this.RANK_NAMES[rank] || 'Нет ранга';
        } catch (e) {
          console.log('Не удалось получить ранг');
        }
      }
      
      resultEl.innerHTML = `
        <h4>✅ Найден</h4>
        <p><strong>Адрес:</strong> <code>${this.formatAddressShort(address)}</code></p>
        <p><strong>ID:</strong> GW${userId}</p>
        <p><strong>Уровень:</strong> ${maxLevel}</p>
        <p><strong>Ранг:</strong> ${rankName}</p>
      `;
      
      // Сохраняем адрес с рангом для подсчёта статистики
      if (rank > 0) {
        this.saveRankedAddress(address, rank);
      }
      
    } catch (error) {
      console.error('Ошибка поиска:', error);
      resultEl.classList.add('admin-error');
      resultEl.innerHTML = `
        <h4>❌ Ошибка</h4>
        <p>${escapeHtml(error.message)}</p>
      `;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // РЕГИСТРАЦИЯ + АКТИВАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async registerAndActivate() {
    if (!this.access.isOwner) {
      app.showNotification('Только владелец может выполнять это действие', 'error');
      return;
    }
    
    const userAddress = document.getElementById('regUserAddress').value.trim();
    let sponsorId = document.getElementById('regSponsorId').value.trim();
    const maxLevel = parseInt(document.getElementById('regMaxLevel').value);
    
    if (!ethers.utils.isAddress(userAddress)) {
      app.showNotification('Неверный адрес пользователя', 'error');
      return;
    }
    
    if (sponsorId.startsWith('GW') || sponsorId.startsWith('gw')) {
      sponsorId = sponsorId.substring(2);
    }
    
    if (!sponsorId || isNaN(parseInt(sponsorId))) {
      app.showNotification('Неверный ID спонсора', 'error');
      return;
    }
    
    try {
      const isRegistered = await this.contracts.matrixRegistry.isRegistered(userAddress);
      
      if (isRegistered) {
        app.showNotification('Пользователь уже зарегистрирован! Используйте "Активация уровней"', 'error');
        return;
      }
      
      const sponsorAddress = await this.contracts.matrixRegistry.getAddressById(sponsorId);
      if (sponsorAddress === '0x0000000000000000000000000000000000000000') {
        app.showNotification('Спонсор не найден', 'error');
        return;
      }
      
      const confirmed = await app.confirmAction(
        `Регистрация:\n\n` +
        `Пользователь: ${userAddress}\n` +
        `Спонсор: GW${sponsorId}\n` +
        `Уровень: ${maxLevel === 0 ? 'Только регистрация' : `до ${maxLevel}`}\n\n` +
        `Продолжить?`
      );
      
      if (!confirmed) return;
      
      app.showNotification('Выполняется регистрация...', 'info');
      
      const registryContract = await app.getSignedContract('MatrixRegistry');
      const globalWayContract = await app.getSignedContract('GlobalWay');
      
      // Регистрация
      try {
        const tx = await registryContract.registerFor(userAddress, sponsorId);
        await tx.wait();
        console.log('✅ Пользователь зарегистрирован');
      } catch (regError) {
        console.error('Ошибка регистрации:', regError);
        app.showNotification('Ошибка регистрации: ' + regError.message, 'error');
        return;
      }
      
      // Активация (если нужно)
      if (maxLevel > 0) {
        app.showNotification('Активация уровней...', 'info');
        
        try {
          // Диагностика
          const adminFuncs = Object.keys(globalWayContract.functions || {}).filter(f => f.toLowerCase().includes('admin'));
          console.log('🔍 Admin функции:', adminFuncs);
          
          if (typeof globalWayContract.adminSetLevelsActive === 'function') {
            console.log(`📤 Вызов adminSetLevelsActive(${userAddress}, 1, ${maxLevel})`);
            const tx2 = await globalWayContract.adminSetLevelsActive(userAddress, 1, maxLevel);
            await tx2.wait();
          } else if (typeof globalWayContract.adminSetLevelActive === 'function') {
            console.log(`📤 Используем adminSetLevelActive в цикле`);
            for (let lvl = 1; lvl <= maxLevel; lvl++) {
              console.log(`  ⚡ Уровень ${lvl}...`);
              const tx2 = await globalWayContract.adminSetLevelActive(userAddress, lvl);
              await tx2.wait();
            }
          } else {
            throw new Error('Функции admin активации не найдены! ' + adminFuncs.join(', '));
          }
          console.log('✅ Уровни активированы');
        } catch (actError) {
          console.error('Ошибка активации:', actError);
          app.showNotification('Зарегистрирован, но ошибка активации: ' + actError.message, 'error');
          return;
        }
        
        app.showNotification(`✅ Зарегистрирован и активирован до уровня ${maxLevel}!`, 'success');
      } else {
        app.showNotification('✅ Пользователь зарегистрирован!', 'success');
      }
      
      await this.loadStats();
      
      document.getElementById('regUserAddress').value = '';
      document.getElementById('regSponsorId').value = '';
      
    } catch (error) {
      console.error('Ошибка:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ТОЛЬКО АКТИВАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async activateLevels() {
    if (!this.access.isOwner) {
      app.showNotification('Только владелец может выполнять это действие', 'error');
      return;
    }
    
    const userAddress = document.getElementById('activateUserAddress').value.trim();
    const maxLevel = parseInt(document.getElementById('activateMaxLevel').value);
    
    if (!ethers.utils.isAddress(userAddress)) {
      app.showNotification('Неверный адрес', 'error');
      return;
    }
    
    try {
      const isRegistered = await this.contracts.matrixRegistry.isRegistered(userAddress);
      
      if (!isRegistered) {
        app.showNotification('Пользователь не зарегистрирован!', 'error');
        return;
      }
      
      const currentLevel = await this.contracts.globalWay.getUserMaxLevel(userAddress);
      
      if (currentLevel >= maxLevel) {
        app.showNotification(`Уже активирован уровень ${currentLevel}`, 'error');
        return;
      }
      
      const confirmed = await app.confirmAction(
        `Активация:\n\n` +
        `Пользователь: ${userAddress}\n` +
        `Текущий: ${currentLevel}\n` +
        `Новый: ${maxLevel}\n\n` +
        `Продолжить?`
      );
      
      if (!confirmed) return;
      
      app.showNotification('Активация...', 'info');
      
      const contract = await app.getSignedContract('GlobalWay');
      
      // Диагностика - какие функции доступны
      const allFuncs = Object.keys(contract.functions || {});
      const adminFuncs = allFuncs.filter(f => f.toLowerCase().includes('admin'));
      console.log('🔍 Все функции контракта:', allFuncs.length);
      console.log('🔍 Admin функции:', adminFuncs);
      console.log('🔍 adminSetLevelsActive:', typeof contract.adminSetLevelsActive);
      console.log('🔍 adminSetLevelActive:', typeof contract.adminSetLevelActive);
      
      // adminSetLevelsActive(address user, uint8 fromLevel, uint8 toLevel) - бесплатная активация
      const fromLevel = Number(currentLevel) + 1;
      
      if (typeof contract.adminSetLevelsActive === 'function') {
        console.log(`📤 Вызов adminSetLevelsActive(${userAddress}, ${fromLevel}, ${maxLevel})`);
        const tx = await contract.adminSetLevelsActive(userAddress, fromLevel, maxLevel);
        await tx.wait();
        app.showNotification(`✅ Активировано до уровня ${maxLevel}!`, 'success');
      } else if (typeof contract.adminSetLevelActive === 'function') {
        // Fallback - активируем по одному уровню
        console.log(`📤 Используем adminSetLevelActive в цикле`);
        for (let lvl = fromLevel; lvl <= maxLevel; lvl++) {
          console.log(`  ⚡ Уровень ${lvl}...`);
          app.showNotification(`Активация ${lvl}/${maxLevel}...`, 'info');
          const tx = await contract.adminSetLevelActive(userAddress, lvl);
          await tx.wait();
        }
        app.showNotification(`✅ Активировано до уровня ${maxLevel}!`, 'success');
      } else {
        throw new Error('Функции adminSetLevelsActive и adminSetLevelActive не найдены! Доступные admin: ' + adminFuncs.join(', '));
      }
      
      await this.loadStats();
      document.getElementById('activateUserAddress').value = '';
      
    } catch (error) {
      console.error('Ошибка:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАМЕНА КОШЕЛЬКА (emergencyFixNodeAddress)
  // ═══════════════════════════════════════════════════════════════
  async changeUserWallet() {
    if (!this.access.isOwner) {
      app.showNotification('Только владелец может выполнять это действие', 'error');
      return;
    }

    const userIdInput = document.getElementById('changeWalletUserId');
    const newAddressInput = document.getElementById('changeWalletNewAddress');

    if (!userIdInput || !newAddressInput) return;

    const userId = userIdInput.value.trim().replace(/^GW/i, '');
    const newAddress = newAddressInput.value.trim();

    if (!userId || !/^\d+$/.test(userId)) {
      app.showNotification('Введите числовой ID пользователя (без GW)', 'error');
      return;
    }

    if (!newAddress || !newAddress.startsWith('0x') || newAddress.length !== 42) {
      app.showNotification('Введите корректный адрес кошелька (0x...)', 'error');
      return;
    }

    try {
      // Проверяем текущий адрес
      const matrixRegistry = await app.getContract('MatrixRegistry');
      const currentAddress = await matrixRegistry.getAddressById(userId);
      
      if (currentAddress === ethers.constants.AddressZero) {
        app.showNotification(`ID ${userId} не найден в MatrixRegistry`, 'error');
        return;
      }

      // Проверяем что новый адрес ещё не зарегистрирован
      const isNewRegistered = await matrixRegistry.isRegistered(newAddress);
      if (isNewRegistered) {
        app.showNotification(`Адрес ${newAddress.slice(0,10)}... уже зарегистрирован!`, 'error');
        return;
      }

      const confirmed = await new Promise((resolve) => {
        const existing = document.getElementById('changeWalletModal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.id = 'changeWalletModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
        modal.innerHTML = `
          <div style="background:linear-gradient(135deg,#0d1117,#1a1f2e);border:1px solid #ff990044;border-radius:16px;padding:28px 24px;max-width:380px;width:100%;text-align:center;box-shadow:0 0 40px #ff990022;">
            <div style="font-size:40px;margin-bottom:10px">🔄</div>
            <h3 style="color:#ff9900;margin:0 0 12px;font-size:18px">Замена кошелька</h3>
            <p style="color:#ccc;margin:4px 0;font-size:13px">ID: <strong style="color:#fff">GW${userId}</strong></p>
            <p style="color:#ccc;margin:4px 0;font-size:13px">Было: <strong style="color:#ff6666">${currentAddress.slice(0,10)}...${currentAddress.slice(-6)}</strong></p>
            <p style="color:#ccc;margin:4px 0;font-size:13px">Стало: <strong style="color:#66ff66">${newAddress.slice(0,10)}...${newAddress.slice(-6)}</strong></p>
            <p style="color:#ff9900;margin:16px 0 0;font-size:12px">⚠️ Это необратимое действие!</p>
            <div style="display:flex;gap:10px;margin-top:20px">
              <button id="cwNo" style="flex:1;padding:14px;border:1px solid #555;border-radius:10px;background:transparent;color:#aaa;font-size:15px;cursor:pointer;">Отмена</button>
              <button id="cwYes" style="flex:1;padding:14px;border:none;border-radius:10px;background:linear-gradient(135deg,#ff9900,#ff6600);color:#000;font-weight:700;font-size:15px;cursor:pointer;">✅ Заменить</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        const cleanup = (val) => { modal.remove(); resolve(val); };
        document.getElementById('cwYes').onclick = () => cleanup(true);
        document.getElementById('cwNo').onclick = () => cleanup(false);
        modal.onclick = (e) => { if (e.target === modal) cleanup(false); };
      });

      if (!confirmed) return;

      app.showNotification('🔄 Замена кошелька...', 'info');

      const matrixRegistrySigned = await app.getSignedContract('MatrixRegistry');
      const tx = await matrixRegistrySigned.emergencyFixNodeAddress(userId, newAddress, {
        gasLimit: 500000
      });

      app.showNotification('⏳ Ожидание подтверждения...', 'info');
      await tx.wait();

      app.showNotification(`✅ Кошелёк для GW${userId} успешно заменён!`, 'success');
      
      // Очищаем форму
      userIdInput.value = '';
      newAddressInput.value = '';

    } catch (error) {
      console.error('❌ Change wallet error:', error);
      
      if (error.code === 4001) {
        app.showNotification('Транзакция отменена', 'error');
      } else if (error.message && error.message.includes('Only owner')) {
        app.showNotification('Только владелец контракта может менять адреса', 'error');
      } else {
        app.showNotification('Ошибка: ' + (error.reason || error.message || 'Неизвестная ошибка'), 'error');
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПРИСВОЕНИЕ РАНГА
  // ═══════════════════════════════════════════════════════════════
  async setUserRank() {
    if (!this.access.isOwner) {
      app.showNotification('Только владелец может выполнять это действие', 'error');
      return;
    }
    
    const userAddress = document.getElementById('rankUserAddress').value.trim();
    const rank = parseInt(document.getElementById('rankSelect').value);
    
    if (!ethers.utils.isAddress(userAddress)) {
      app.showNotification('Неверный адрес', 'error');
      return;
    }
    
    if (!this.contracts.leaderPool) {
      app.showNotification('Контракт LeaderPool недоступен', 'error');
      return;
    }
    
    try {
      const confirmed = await app.confirmAction(
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
      
      // Сохраняем адрес в список для подсчёта рангов
      this.saveRankedAddress(userAddress, rank);
      
      // Небольшая задержка для обновления данных в блокчейне
      console.log('⏳ Ожидание обновления данных...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.loadStats();
      document.getElementById('rankUserAddress').value = '';
      
    } catch (error) {
      console.error('Ошибка:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // АВТОРИЗАЦИЯ КОНТРАКТОВ
  // ═══════════════════════════════════════════════════════════════
  async setAuthorization() {
    if (!this.access.isOwner) {
      app.showNotification('Только владелец', 'error');
      return;
    }
    
    const address = document.getElementById('authContractAddress').value.trim();
    const action = document.getElementById('authAction').value;
    
    if (!ethers.utils.isAddress(address)) {
      app.showNotification('Неверный адрес', 'error');
      return;
    }
    
    try {
      const confirmed = await app.confirmAction(
        `${action === 'authorize' ? 'Авторизовать' : 'Отозвать авторизацию'}:\n` +
        `${address}\n\nПродолжить?`
      );
      
      if (!confirmed) return;
      
      app.showNotification('Выполнение...', 'info');
      
      const contract = await app.getSignedContract('MatrixRegistry');
      const tx = await contract.setAuthorizedContract(address, action === 'authorize');
      await tx.wait();
      
      app.showNotification('✅ Выполнено!', 'success');
      document.getElementById('authContractAddress').value = '';
      
    } catch (error) {
      console.error('Ошибка:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // GUARDIANS
  // ═══════════════════════════════════════════════════════════════
  async addGuardian() {
    if (!this.access.isOwner) {
      app.showNotification('Только владелец', 'error');
      return;
    }
    
    const address = document.getElementById('addGuardianAddress').value.trim();
    
    if (!ethers.utils.isAddress(address)) {
      app.showNotification('Неверный адрес', 'error');
      return;
    }
    
    if (!this.contracts.governance) {
      app.showNotification('Контракт Governance недоступен', 'error');
      return;
    }
    
    try {
      const confirmed = await app.confirmAction(`Добавить члена совета:\n${address}\n\nПродолжить?`);
      if (!confirmed) return;
      
      app.showNotification('Добавление...', 'info');
      
      const contract = await app.getSignedContract('GlobalWayGovernance');
      const tx = await contract.addGuardian(address);
      await tx.wait();
      
      app.showNotification('✅ Добавлен!', 'success');
      
      await this.loadGuardians();
      document.getElementById('addGuardianAddress').value = '';
      
    } catch (error) {
      console.error('Ошибка:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  async removeGuardian() {
    if (!this.access.isOwner) {
      app.showNotification('Только владелец', 'error');
      return;
    }
    
    const address = document.getElementById('removeGuardianAddress').value.trim();
    
    if (!ethers.utils.isAddress(address)) {
      app.showNotification('Неверный адрес', 'error');
      return;
    }
    
    if (!this.contracts.governance) {
      app.showNotification('Контракт Governance недоступен', 'error');
      return;
    }
    
    try {
      const confirmed = await app.confirmAction(
        `⚠️ Удалить члена совета:\n${address}\n\n` +
        `Требуется минимум 3 члена!\n\nПродолжить?`
      );
      if (!confirmed) return;
      
      app.showNotification('Удаление...', 'info');
      
      const contract = await app.getSignedContract('GlobalWayGovernance');
      const tx = await contract.removeGuardian(address);
      await tx.wait();
      
      app.showNotification('✅ Удалён!', 'success');
      
      await this.loadGuardians();
      document.getElementById('removeGuardianAddress').value = '';
      
    } catch (error) {
      console.error('Ошибка:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // УПРАВЛЕНИЕ КОНТРАКТАМИ
  // ═══════════════════════════════════════════════════════════════
  async pauseContract() {
    if (!this.access.isOwner) {
      app.showNotification('Только владелец', 'error');
      return;
    }
    
    const confirmed = await app.confirmAction('Приостановить контракт?\n\nВсе операции будут заблокированы!');
    if (!confirmed) return;
    
    try {
      app.showNotification('Приостановка...', 'info');
      
      const contract = await app.getSignedContract('GlobalWay');
      const tx = await contract.pause();
      await tx.wait();
      
      app.showNotification('⏸️ Контракт приостановлен!', 'success');
      
    } catch (error) {
      console.error('Ошибка:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  async unpauseContract() {
    if (!this.access.isOwner) {
      app.showNotification('Только владелец', 'error');
      return;
    }
    
    const confirmed = await app.confirmAction('Возобновить работу контракта?');
    if (!confirmed) return;
    
    try {
      app.showNotification('Возобновление...', 'info');
      
      const contract = await app.getSignedContract('GlobalWay');
      const tx = await contract.unpause();
      await tx.wait();
      
      app.showNotification('▶️ Контракт возобновлён!', 'success');
      
    } catch (error) {
      console.error('Ошибка:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  async updateContractAddress() {
    if (!this.access.isOwner) {
      app.showNotification('Только владелец', 'error');
      return;
    }
    
    const contractType = document.getElementById('contractType').value;
    const newAddress = document.getElementById('newContractAddress').value.trim();
    
    if (!ethers.utils.isAddress(newAddress)) {
      app.showNotification('Неверный адрес', 'error');
      return;
    }
    
    try {
      const confirmed = await app.confirmAction(
        `Изменить адрес ${contractType}:\n${newAddress}\n\n` +
        `⚠️ Это критическое действие!\n\nПродолжить?`
      );
      if (!confirmed) return;
      
      app.showNotification('Обновление...', 'info');
      
      const contract = await app.getSignedContract('GlobalWay');
      
      const setters = {
        partnerProgram: 'setPartnerProgram',
        matrixPayments: 'setMatrixPayments',
        quarterlyPayments: 'setQuarterlyPayments',
        investmentPool: 'setInvestmentPool',
        leaderPool: 'setLeaderPool',
        gwtToken: 'setGWTToken',
        treasury: 'setTreasury',
        charity: 'setCharity'
      };
      
      const method = setters[contractType];
      if (!method) {
        app.showNotification('Неизвестный тип контракта', 'error');
        return;
      }
      
      const tx = await contract[method](newAddress);
      await tx.wait();
      
      app.showNotification('✅ Адрес обновлён!', 'success');
      document.getElementById('newContractAddress').value = '';
      
    } catch (error) {
      console.error('Ошибка:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ФИНАНСЫ
  // ═══════════════════════════════════════════════════════════════
  async withdrawFunds() {
    app.showNotification('Функция в разработке', 'info');
  },

  // ═══════════════════════════════════════════════════════════════
  // ДЕЛЕГИРОВАНИЕ
  // ═══════════════════════════════════════════════════════════════
  async delegateRights() {
    app.showNotification('Функция в разработке', 'info');
  },

  // ═══════════════════════════════════════════════════════════════
  // НОВОСТИ
  // ═══════════════════════════════════════════════════════════════
  async publishNews() {
    app.showNotification('Функция в разработке', 'info');
  },

  // ═══════════════════════════════════════════════════════════════
  // ЭКСТРЕННЫЕ ФУНКЦИИ
  // ═══════════════════════════════════════════════════════════════
  async emergencyWithdraw() {
    if (!this.access.isOwner) {
      app.showNotification('Только владелец', 'error');
      return;
    }
    
    const confirmed = await app.confirmAction(
      '⚠️ ЭКСТРЕННЫЙ ВЫВОД ⚠️\n\n' +
      'Вывести ВСЕ средства?\n\n' +
      'Это действие НЕОБРАТИМО!'
    );
    
    if (!confirmed) return;
    
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
      console.error('Ошибка:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  async transferOwnership() {
    if (!this.access.isOwner) {
      app.showNotification('Только владелец', 'error');
      return;
    }
    
    const newOwner = prompt('Введите адрес нового владельца:');
    if (!newOwner || !ethers.utils.isAddress(newOwner)) {
      app.showNotification('Неверный адрес', 'error');
      return;
    }
    
    const confirmed = await app.confirmAction(
      `⚠️ ПЕРЕДАЧА ВЛАДЕНИЯ ⚠️\n\n` +
      `Новый владелец: ${newOwner}\n\n` +
      `ЭТО НЕОБРАТИМО!\n\nПродолжить?`
    );
    
    if (!confirmed) return;
    
    const input = prompt('Введите "ПЕРЕДАТЬ" для подтверждения:');
    if (input !== 'ПЕРЕДАТЬ') {
      app.showNotification('Отменено', 'info');
      return;
    }
    
    try {
      app.showNotification('Передача владения...', 'info');
      
      const contract = await app.getSignedContract('GlobalWay');
      const tx = await contract.transferOwnership(newOwner);
      await tx.wait();
      
      app.showNotification('✅ Владение передано!', 'success');
      
    } catch (error) {
      console.error('Ошибка:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЭКСПОРТ ДАННЫХ
  // ═══════════════════════════════════════════════════════════════
  async exportUsers() {
    if (!this.access.isOwner) {
      app.showNotification('Только владелец', 'error');
      return;
    }
    
    try {
      app.showNotification('Экспорт пользователей...', 'info');
      
      const totalUsers = Number(await this.contracts.matrixRegistry.totalUsers());
      const users = [];
      
      for (let i = 0; i < totalUsers && i < 1000; i++) {
        try {
          const address = await this.contracts.globalWay.allUsers(i);
          if (address && address !== '0x0000000000000000000000000000000000000000') {
            const userId = await this.contracts.matrixRegistry.getUserIdByAddress(address);
            const userInfo = await this.contracts.matrixRegistry.users(address);
            const maxLevel = await this.contracts.globalWay.getUserMaxLevel(address);
            
            users.push({
              address,
              userId: userId.toString(),
              sponsorId: userInfo.sponsorId.toString(),
              maxLevel: Number(maxLevel),
              personalInvites: Number(userInfo.personalInvites)
            });
          }
        } catch (e) {
          // Пропускаем
        }
      }
      
      this.downloadJSON({ exportDate: new Date().toISOString(), users }, 'globalway_users');
      app.showNotification(`✅ Экспортировано ${users.length} пользователей!`, 'success');
      
    } catch (error) {
      console.error('Ошибка:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  async exportRanks() {
    if (!this.access.isOwner) {
      app.showNotification('Только владелец', 'error');
      return;
    }
    
    if (!this.contracts.leaderPool) {
      app.showNotification('LeaderPool недоступен', 'error');
      return;
    }
    
    try {
      app.showNotification('Экспорт рангов...', 'info');
      
      const totalUsers = Number(await this.contracts.matrixRegistry.totalUsers());
      const ranks = [];
      
      for (let i = 0; i < totalUsers && i < 1000; i++) {
        try {
          const address = await this.contracts.globalWay.allUsers(i);
          if (address && address !== '0x0000000000000000000000000000000000000000') {
            const rankInfo = await this.contracts.leaderPool.getUserRankInfo(address);
            const rank = Number(rankInfo.rank || rankInfo[0] || 0);
            if (rank > 0) {
              ranks.push({
                address,
                rank,
                rankName: this.RANK_NAMES[rank]
              });
            }
          }
        } catch (e) {
          // Пропускаем
        }
      }
      
      this.downloadJSON({ exportDate: new Date().toISOString(), ranks }, 'globalway_ranks');
      app.showNotification(`✅ Экспортировано ${ranks.length} рангов!`, 'success');
      
    } catch (error) {
      console.error('Ошибка:', error);
      app.showNotification('Ошибка: ' + error.message, 'error');
    }
  },

  async exportAll() {
    app.showNotification('Экспорт всей базы...', 'info');
    await this.exportUsers();
    await this.exportRanks();
    app.showNotification('✅ Полный экспорт завершён!', 'success');
  },

  // ═══════════════════════════════════════════════════════════════
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ═══════════════════════════════════════════════════════════════
  
  // Сохранение адресов с рангами в localStorage
  saveRankedAddress(address, rank) {
    try {
      const key = 'globalway_ranked_addresses';
      let addresses = JSON.parse(localStorage.getItem(key) || '{}');
      addresses[address.toLowerCase()] = { rank, timestamp: Date.now() };
      localStorage.setItem(key, JSON.stringify(addresses));
      console.log(`💾 Сохранён адрес с рангом: ${address.slice(0,10)}... → ${rank}`);
    } catch (e) {
      console.warn('⚠️ Не удалось сохранить адрес в localStorage:', e);
    }
  },
  
  getRankedAddresses() {
    try {
      const key = 'globalway_ranked_addresses';
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      return Object.keys(data);
    } catch (e) {
      return [];
    }
  },
  
  downloadJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  },

  formatAddressShort(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  },

  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(0);
  }
};

// Экспорт
window.adminModule = adminModule;
