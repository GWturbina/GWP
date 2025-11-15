// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Matrix Module (ПРАВИЛЬНАЯ ВЕРСИЯ)
// Единая глобальная бинарная матрица с поиском слева направо
// ═══════════════════════════════════════════════════════════════════

const matrixModule = {
  // Контракты
  contracts: {},
  
  // Состояние
  state: {
    currentDepth: 1,      // Текущая глубина для таблицы (1-12)
    currentRoot: null,    // Корень дерева (по умолчанию - пользователь)
    matrixData: [],       // Данные для таблицы
    stats: {
      totalActive: 0,
      fromPartners: 0,
      fromCharity: 0,
      fromTechnical: 0
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('🔲 Initializing Matrix Module...');
    
    try {
      if (!app.state.userAddress) {
        app.showNotification('Подключите кошелек', 'error');
        return;
      }

      // Устанавливаем корень = пользователь
      this.state.currentRoot = app.state.userAddress;

      // Загружаем контракты
      await this.loadContracts();

      // Создаем 12 кнопок уровней
      this.createDepthButtons();

      // Загружаем все данные
      await this.loadAllData();

      // Инициализируем UI
      this.initUI();

      console.log('✅ Matrix Module loaded successfully');
    } catch (error) {
      console.error('❌ Matrix init error:', error);
      app.showNotification('Ошибка загрузки матрицы', 'error');
    }
  },

  // Загрузка контрактов
  async loadContracts() {
    this.contracts.globalWay = await app.getContract('GlobalWay');
    this.contracts.helper = await app.getContract('GlobalWayHelper');
    this.contracts.stats = await app.getContract('GlobalWayStats');
    this.contracts.quarterly = await app.getContract('GlobalWayQuarterly');
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА ДАННЫХ
  // ═══════════════════════════════════════════════════════════════
  async loadAllData() {
    await Promise.all([
      this.loadMatrixVisualization(),  // Визуализация 1-2-4
      this.loadMatrixTable(),          // Таблица партнеров на текущей глубине
      this.loadMatrixStats()           // Статистика из контракта
    ]);
  },

  // ═══════════════════════════════════════════════════════════════
  // ВИЗУАЛИЗАЦИЯ 1-2-4 (Интерактивное дерево)
  // ═══════════════════════════════════════════════════════════════
  async loadMatrixVisualization() {
    try {
      const address = app.state.userAddress;
      const isRegistered = await this.contracts.globalWay.isUserRegistered(address);
      
      if (!isRegistered) {
        console.log("User not registered, skipping matrix visualization");
        return;
      }

      const { currentRoot } = this.state;

      // Получаем ветку матрицы (depth=2 → 7 узлов: 1+2+4)
      const nodes = await this.contracts.helper.getMatrixBranch(currentRoot, 2);

      // Обновляем визуализацию
      await this.updateVisualization(nodes);

    } catch (error) {
      console.error('Error loading matrix visualization:', error);
    }
  },

  // Обновление визуализации дерева
  async updateVisualization(nodes) {
    try {
      // nodes[0] = корень (topPosition)
      // nodes[1-2] = первый уровень (position1, position2)
      // nodes[3-6] = второй уровень (position3-6)

      const positionIds = [
        'topPosition',  // 0
        'position1',    // 1
        'position2',    // 2
        'position3',    // 3
        'position4',    // 4
        'position5',    // 5
        'position6'     // 6
      ];

      for (let i = 0; i < positionIds.length && i < nodes.length; i++) {
        await this.updatePosition(positionIds[i], nodes[i]);
      }

    } catch (error) {
      console.error('Error updating visualization:', error);
    }
  },

  // Обновление одной позиции в визуализации
async loadMatrixVisualization() {
  try {
    const address = app.state.userAddress;
    const isRegistered = await this.contracts.globalWay.isUserRegistered(address);
    
    if (!isRegistered) {
      console.log("User not registered");
      return;
    }

    const { currentRoot } = this.state;

    // Получаем ПОЗИЦИЮ
    const rootPos = await this.contracts.globalWay.getUserMatrixPosition(currentRoot);
    
    if (rootPos.toString() === "0") {
      console.log("User not in matrix");
      return;
    }

    // 🔥 КОНВЕРТИРУЕМ BigNumber в число!
    const posNum = parseInt(rootPos.toString());
    const nodes = await this.contracts.helper.getMatrixBranch(posNum, 2);

    await this.updateVisualization(nodes);

  } catch (error) {
    console.error('Error:', error);
  }
}

  // ═══════════════════════════════════════════════════════════════
  // ТАБЛИЦА ПАРТНЕРОВ (ПРАВИЛЬНАЯ ЛОГИКА)
  // ═══════════════════════════════════════════════════════════════
  async loadMatrixTable() {
    try {
      const { currentRoot, currentDepth } = this.state;
      const tableBody = document.getElementById('matrixTableBody');
      
      if (!tableBody) return;

      // 🔥 ПРЕДУПРЕЖДЕНИЕ: Для больших глубин
      if (currentDepth > 8) {
        const confirmed = confirm(
          `Глубина ${currentDepth} содержит ${Math.pow(2, currentDepth)} позиций.\n` +
          `Это может занять много времени и вызовов к контракту.\n\n` +
          `Продолжить загрузку?`
        );
        if (!confirmed) {
          tableBody.innerHTML = '<tr><td colspan="7" class="no-data">Загрузка отменена</td></tr>';
          return;
        }
      }

      tableBody.innerHTML = '<tr><td colspan="7" class="no-data">Загрузка...</td></tr>';

      // 🔥 ИСПРАВЛЕНО: Сначала получаем ПОЗИЦИЮ пользователя в матрице
      const rootPos = await this.contracts.globalWay.getUserMatrixPosition(currentRoot);
      
      if (rootPos.eq(0)) {
        tableBody.innerHTML = '<tr><td colspan="7" class="no-data">Пользователь не в матрице</td></tr>';
        return;
      }

      // 🔥 ПРАВИЛЬНАЯ ЛОГИКА: Получаем ТОЛЬКО партнеров на глубине currentDepth
      const positions = await this.getPositionsAtDepth(rootPos, currentDepth);

      // Информация о максимальном количестве позиций
      const maxPositions = Math.pow(2, currentDepth);
      document.getElementById('currentMatrixLevel').textContent = currentDepth;

      // Собираем детали для каждой позиции
      const details = [];
      
      // 🔥 ОПТИМИЗАЦИЯ: Показываем прогресс для больших глубин
      const showProgress = positions.length > 50;
      
      for (let i = 0; i < positions.length; i++) {
        if (showProgress && i % 10 === 0) {
          tableBody.innerHTML = `<tr><td colspan="7" class="no-data">Загрузка... ${i}/${positions.length}</td></tr>`;
        }
        
        const position = positions[i];
        
        // Получаем адрес из контракта
        const [userAddress] = await this.contracts.globalWay.getMatrixPosition(position);
        
        // 🔥 ПРАВИЛЬНАЯ ПРОВЕРКА: Пустой адрес
        // Проверяем все варианты пустого адреса
        const isEmptyAddress = 
          !userAddress || 
          userAddress === ethers.constants.AddressZero ||
          userAddress === '0x0000000000000000000000000000000000000000' ||
          userAddress.toLowerCase() === '0x0000000000000000000000000000000000000000';
        
        if (!isEmptyAddress) {
          // ✅ Позиция занята - получаем детали
          const posDetails = await this.getPositionDetails(userAddress);
          posDetails.number = details.length + 1; // Номер по порядку среди ЗАНЯТЫХ
          posDetails.position = position.toString();
          posDetails.relativePosition = i + 1; // Позиция в дереве
          details.push(posDetails);
        }
      }

      if (details.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="no-data">Нет партнеров на этом уровне (0/' + maxPositions + ')</td></tr>';
        return;
      }

      // 🔥 НОВОЕ: Показываем сколько позиций занято
      console.log(`✅ Found ${details.length} occupied positions out of ${maxPositions}`);
      
      // Обновляем информацию о занятых позициях
      document.getElementById('maxPositionsInfo').textContent = `${details.length}/${maxPositions}`;

      // Обновляем таблицу - ТОЛЬКО ЗАНЯТЫЕ ПОЗИЦИИ
      tableBody.innerHTML = details.map((pos, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${pos.id}</td>
          <td>${app.formatAddress(pos.address)}</td>
          <td>${pos.sponsorId}</td>
          <td>${pos.date}</td>
          <td>${pos.level}</td>
          <td><span class="badge badge-${pos.rank.toLowerCase()}">${pos.rank}</span></td>
        </tr>
      `).join('');

      this.state.matrixData = details;

    } catch (error) {
      console.error('Error loading matrix table:', error);
      const tableBody = document.getElementById('matrixTableBody');
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="7" class="no-data">Ошибка загрузки</td></tr>';
      }
    }
  },

  // 🔥 КЛЮЧЕВАЯ ФУНКЦИЯ: Получить позиции на конкретной глубине
  getPositionsAtDepth(rootPos, depth) {
    console.log(`📊 Getting positions at depth ${depth} from root position:`, rootPos.toString());
    
    // Для глубины N нужно получить 2^N позиций
    const count = Math.pow(2, depth);
    const positions = [];
    
    // Начальный индекс в полном бинарном дереве для глубины depth
    // Глубина 1: индексы 1-2 (относительно корня 0)
    // Глубина 2: индексы 3-6
    // Глубина 3: индексы 7-14
    const startIndex = Math.pow(2, depth) - 1;
    
    // 🔥 ИСПОЛЬЗУЕМ BigNumber для всех вычислений
    const rootPosBN = ethers.BigNumber.from(rootPos);
    
    for (let i = 0; i < count; i++) {
      const relativeIndex = startIndex + i;
      const absolutePos = this.calculateChildPosition(rootPosBN, relativeIndex);
      positions.push(absolutePos);
    }
    
    console.log(`✅ Calculated ${positions.length} positions for depth ${depth}`);
    if (positions.length <= 10) {
      console.log('Positions:', positions.map(p => p.toString()));
    }
    
    return positions;
  },

  // 🔥 МАТЕМАТИКА: Вычислить абсолютную позицию ребенка (с BigNumber)
  calculateChildPosition(rootPosBN, relativeIndex) {
    if (relativeIndex === 0) return rootPosBN;
    
    // Рекурсивно находим родителя
    const parentRelative = Math.floor((relativeIndex - 1) / 2);
    const parentPosBN = this.calculateChildPosition(rootPosBN, parentRelative);
    
    // Левый или правый ребенок?
    const isLeftChild = (relativeIndex % 2) === 1;
    
    // 🔥 Используем BigNumber для умножения и сложения
    return parentPosBN.mul(2).add(isLeftChild ? 1 : 2);
  },

  // ═══════════════════════════════════════════════════════════════
  // СТАТИСТИКА (ИЗ GlobalWayStats КОНТРАКТА)
  // ═══════════════════════════════════════════════════════════════
  async loadMatrixStats() {
    try {
      const userAddress = app.state.userAddress;

      // Получаем полную статистику из контракта GlobalWayStats
      const fullStats = await this.contracts.stats.getUserFullStats(userAddress);
      
      // fullStats возвращает:
      // [0] isRegistered
      // [1] sponsor
      // [2] maxLevel
      // [3] quarterlyActive
      // [4] marketingReferralBalance
      // [5] marketingMatrixBalance
      // [6] quarterlyBalance
      // [7] investmentBalance
      // [8] leaderBalance
      // [9] totalPendingBalance
      // [10] totalInvested
      // [11] totalInvestmentReceived
      // [12] investmentROI

      // Получаем структуру команды
      const structureStats = await this.contracts.stats.getUserStructureStats(userAddress);
      // [0] directReferrals
      // [1] referrals[]
      // [2] activeLevels
      // [3] levelStatus[]

      // 🔥 TODO: Добавить правильный подсчет типов позиций
      // Пока упрощенная версия
      this.state.stats = {
        totalActive: Number(structureStats[0]), // directReferrals
        fromPartners: Number(structureStats[0]),
        fromCharity: 0,  // TODO: подсчитать из quarterly
        fromTechnical: 0 // TODO: подсчитать из techAccounts
      };

      this.updateStatsUI();

    } catch (error) {
      console.error('Error loading matrix stats:', error);
      // Устанавливаем нулевые значения при ошибке
      this.state.stats = {
        totalActive: 0,
        fromPartners: 0,
        fromCharity: 0,
        fromTechnical: 0
      };
      this.updateStatsUI();
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ДЕТАЛИ ПОЗИЦИИ
  // ═══════════════════════════════════════════════════════════════
  async getPositionDetails(address) {
    try {
      // ID пользователя
      const userID = await this.contracts.helper.getUserID(address);
      const id = userID !== '' ? `GW${userID}` : app.formatAddress(address);

      // Спонсор
      const sponsor = await this.contracts.globalWay.getUserSponsor(address);
      const sponsorID = await this.contracts.helper.getUserID(sponsor);
      const sponsorId = sponsorID !== '' ? `GW${sponsorID}` : app.formatAddress(sponsor);

      // Максимальный уровень
      const maxLevel = Number(await this.contracts.globalWay.getUserMaxLevel(address));

      // Ранг
      const [rankQualified] = await this.contracts.helper.getUserQualificationStatus(address);
      const rank = this.getRankName(rankQualified);

      // Дата активации
      const date = await this.getActivationDate(address);

      return {
        address,
        id,
        sponsorId,
        level: maxLevel,
        rank,
        date
      };
    } catch (error) {
      console.error('Error getting position details:', error);
      return {
        address,
        id: app.formatAddress(address),
        sponsorId: '-',
        level: 0,
        rank: 'Никто',
        date: '-'
      };
    }
  },

  // Получить дату активации
  async getActivationDate(address) {
    try {
      const filter = this.contracts.globalWay.filters.LevelActivated(address, 1);
      const events = await this.contracts.globalWay.queryFilter(filter, -100000);
      
      if (events.length > 0) {
        const block = await events[0].getBlock();
        return new Date(block.timestamp * 1000).toLocaleDateString();
      }
      return '-';
    } catch (error) {
      return '-';
    }
  },

  // Определить тип позиции (partner/charity/technical)
  async getPositionType(address) {
    try {
      // Проверяем quarterly info
      const quarterlyInfo = await this.contracts.quarterly.getUserQuarterlyInfo(address);
      const charityAccount = quarterlyInfo[4]; // charityAccount из структуры
      
      if (charityAccount !== ethers.ZeroAddress) {
        return 'charity';
      }

      // Проверяем tech accounts
      const techAccount1 = quarterlyInfo[5];
      const techAccount2 = quarterlyInfo[6];
      
      if (techAccount1 !== ethers.ZeroAddress || techAccount2 !== ethers.ZeroAddress) {
        return 'technical';
      }

      return 'partner';
    } catch (error) {
      return 'partner';
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПОИСК В МАТРИЦЕ
  // ═══════════════════════════════════════════════════════════════
  async searchMatrix() {
    const searchInput = document.getElementById('matrixSearchInput');
    if (!searchInput) return;

    const searchValue = searchInput.value.trim();
    if (!searchValue) {
      app.showNotification('Введите ID для поиска', 'error');
      return;
    }

    try {
      // Убираем префикс GW
      const searchID = searchValue.replace(/^GW/i, '');

      app.showNotification('Поиск...', 'info');
      console.log('═══════════════════════════════════════');
      console.log(`🔍 ПОИСК ID: GW${searchID}`);

      // 🔥 ШАГ 1: Получаем адрес по ID
      const searchAddress = await this.contracts.helper.getAddressByID(searchID);
      console.log(`📍 Адрес найден:`, searchAddress);

      if (searchAddress === ethers.constants.AddressZero || 
          searchAddress === '0x0000000000000000000000000000000000000000') {
        app.showNotification('ID не найден в системе', 'error');
        console.log('❌ ID не существует');
        return;
      }

      // 🔥 ШАГ 2: Проверяем регистрацию
      const isRegistered = await this.contracts.globalWay.isUserRegistered(searchAddress);
      console.log(`✅ Зарегистрирован:`, isRegistered);

      if (!isRegistered) {
        app.showNotification(`GW${searchID} не зарегистрирован`, 'error');
        console.log('❌ Пользователь не зарегистрирован в GlobalWay');
        return;
      }

      // 🔥 ШАГ 3: Получаем позицию в матрице
      const matrixPosition = await this.contracts.globalWay.getUserMatrixPosition(searchAddress);
      console.log(`📊 Позиция в матрице:`, matrixPosition.toString());

      if (matrixPosition.eq(0)) {
        app.showNotification(
          `GW${searchID} зарегистрирован, но НЕТ в матрице!\n` +
          `(Matrix position = 0)`, 
          'warning'
        );
        console.log('⚠️ ПРОБЛЕМА: Пользователь зарегистрирован, но не имеет позиции в матрице!');
        console.log('Это означает что он в системе, но место в бинарной матрице не назначено');
        return;
      }

      // 🔥 ШАГ 4: Получаем спонсора
      const sponsor = await this.contracts.globalWay.getUserSponsor(searchAddress);
      const sponsorID = await this.contracts.helper.getUserID(sponsor);
      console.log(`👤 Спонсор: GW${sponsorID} (${sponsor})`);

      // 🔥 ШАГ 5: Ищем в матрице от корня
      const [found, position, depth] = await this.contracts.helper.searchInMatrix(
        app.state.userAddress,  // от чьей матрицы ищем
        searchAddress,          // кого ищем
        12                      // максимальная глубина поиска (увеличил до 12)
      );

      console.log(`🔍 Поиск в матрице:`, { found, position: position?.toString(), depth });

      if (found) {
        app.showNotification(
          `✅ Найдено! GW${searchID}\n` +
          `Позиция: ${position}\n` +
          `Глубина: ${depth}`, 
          'success'
        );
        console.log('✅ НАЙДЕН В ВАШЕЙ МАТРИЦЕ');
        console.log('═══════════════════════════════════════');
        
        // Переключаемся на найденного пользователя
        this.state.currentRoot = searchAddress;
        await this.loadMatrixVisualization();
      } else {
        app.showNotification(
          `⚠️ GW${searchID} НЕ найден в вашей матрице\n` +
          `(Он в позиции ${matrixPosition}, но в другой ветке)\n` +
          `Спонсор: GW${sponsorID}`, 
          'warning'
        );
        console.log('⚠️ НЕ НАЙДЕН в вашей матрице (глубина поиска: 12 уровней)');
        console.log('Возможно он находится глубже или в другой ветке матрицы');
        console.log('═══════════════════════════════════════');
      }

    } catch (error) {
      console.error('❌ ОШИБКА ПОИСКА:', error);
      app.showNotification('Ошибка поиска', 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // МОДАЛЬНОЕ ОКНО ПОЗИЦИИ
  // ═══════════════════════════════════════════════════════════════
  async showPositionModal(address) {
    try {
      const details = await this.getPositionDetails(address);

      // Заполняем модалку
      document.getElementById('modalPositionId').textContent = details.id;
      document.getElementById('modalSponsorId').textContent = details.sponsorId;
      document.getElementById('modalAddress').textContent = app.formatAddress(details.address);
      document.getElementById('modalLevel').textContent = details.level;
      document.getElementById('modalQualification').textContent = details.rank;

      // Проверяем quarterly статус
      const quarterlyStats = await this.contracts.stats.getUserQuarterlyStats(address);
      const status = quarterlyStats[3] ? 'Активен' : 'Неактивен'; // isActive
      document.getElementById('modalStatus').textContent = status;

      // Кнопка "Посмотреть матрицу" - меняет корень на этого пользователя
      document.getElementById('viewMatrixBtn').onclick = () => {
        this.state.currentRoot = address;
        this.loadMatrixVisualization();
        app.closeModal('positionModal');
      };

      // Показываем модалку
      app.showModal('positionModal');

    } catch (error) {
      console.error('Error showing modal:', error);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // UI ЭЛЕМЕНТЫ
  // ═══════════════════════════════════════════════════════════════

  // Создание 12 кнопок глубины
  createDepthButtons() {
    const container = document.getElementById('matrixLevels');
    if (!container) return;

    container.innerHTML = '';

    // 12 кнопок для глубины 1-12
    for (let depth = 1; depth <= 12; depth++) {
      const btn = document.createElement('button');
      btn.className = `level-btn ${depth === 1 ? 'active' : ''}`;
      btn.textContent = depth;
      
      // Подсказка с количеством позиций
      const posCount = Math.pow(2, depth);
      btn.title = `Глубина ${depth}: ${posCount} позиций`;
      
      btn.onclick = () => this.selectDepth(depth);
      container.appendChild(btn);
    }
  },

  // Выбор глубины
  async selectDepth(depth) {
    // Обновляем активную кнопку
    document.querySelectorAll('#matrixLevels .level-btn').forEach((btn, index) => {
      btn.classList.toggle('active', index + 1 === depth);
    });

    this.state.currentDepth = depth;
    this.state.currentRoot = app.state.userAddress; // Сброс на пользователя

    // Загружаем данные для этой глубины
    await this.loadMatrixTable();
  },

  // Обновление статистики UI
  updateStatsUI() {
    const { totalActive, fromPartners, fromCharity, fromTechnical } = this.state.stats;

    const totalEl = document.getElementById('totalActivePositions');
    const partnerEl = document.getElementById('partnerPositions');
    const charityEl = document.getElementById('charityPositions');
    const techEl = document.getElementById('technicalPositions');

    if (totalEl) totalEl.textContent = totalActive;
    if (partnerEl) partnerEl.textContent = fromPartners;
    if (charityEl) charityEl.textContent = fromCharity;
    if (techEl) techEl.textContent = fromTechnical;
  },

  // Инициализация UI
  initUI() {
    // Кнопка поиска
    const searchBtn = document.getElementById('matrixSearchBtn');
    if (searchBtn) {
      searchBtn.onclick = () => this.searchMatrix();
    }

    // Enter в поиске
    const searchInput = document.getElementById('matrixSearchInput');
    if (searchInput) {
      searchInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
          this.searchMatrix();
        }
      };
    }

    // Закрытие модалки
    const closeBtn = document.getElementById('closeModalBtn');
    if (closeBtn) {
      closeBtn.onclick = () => app.closeModal('positionModal');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ДИАГНОСТИКА (для отладки)
  // ═══════════════════════════════════════════════════════════════
  
  // 🔥 НОВАЯ ФУНКЦИЯ: Диагностика пользователя по ID
  async diagnoseUser(userID) {
    try {
      console.log('═══════════════════════════════════════');
      console.log(`🔍 ДИАГНОСТИКА: GW${userID}`);
      console.log('═══════════════════════════════════════');
      
      // Адрес
      const address = await this.contracts.helper.getAddressByID(userID);
      console.log(`📍 Адрес:`, address);
      
      if (address === ethers.constants.AddressZero) {
        console.log('❌ ID не найден');
        return;
      }
      
      // Регистрация
      const isRegistered = await this.contracts.globalWay.isUserRegistered(address);
      console.log(`✅ Зарегистрирован:`, isRegistered);
      
      if (!isRegistered) {
        console.log('❌ Не зарегистрирован');
        return;
      }
      
      // Позиция в матрице
      const matrixPos = await this.contracts.globalWay.getUserMatrixPosition(address);
      console.log(`📊 Позиция в матрице:`, matrixPos.toString());
      
      // Спонсор
      const sponsor = await this.contracts.globalWay.getUserSponsor(address);
      const sponsorID = await this.contracts.helper.getUserID(sponsor);
      console.log(`👤 Спонсор: GW${sponsorID} (${sponsor})`);
      
      // Максимальный уровень
      const maxLevel = await this.contracts.globalWay.getUserMaxLevel(address);
      console.log(`📈 Максимальный уровень:`, maxLevel);
      
      // Рефералы
      const referrals = await this.contracts.globalWay.getUserReferrals(address);
      console.log(`👥 Рефералов:`, referrals.length);
      if (referrals.length > 0) {
        for (let i = 0; i < referrals.length; i++) {
          const refID = await this.contracts.helper.getUserID(referrals[i]);
          console.log(`  ${i+1}. GW${refID} (${referrals[i]})`);
        }
      }
      
      // Поиск в матрице
      const yourPos = await this.contracts.globalWay.getUserMatrixPosition(app.state.userAddress);
      console.log(`\n🔍 Поиск от вашей позиции (${yourPos.toString()}):`);
      
      const [found, foundPos, depth] = await this.contracts.helper.searchInMatrix(
        app.state.userAddress,
        address,
        12
      );
      
      if (found) {
        console.log(`✅ НАЙДЕН! Позиция: ${foundPos}, Глубина: ${depth}`);
      } else {
        console.log(`⚠️ НЕ НАЙДЕН в вашей ветке (поиск до глубины 12)`);
      }
      
      console.log('═══════════════════════════════════════');
      
    } catch (error) {
      console.error('❌ Ошибка диагностики:', error);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ═══════════════════════════════════════════════════════════════
  getRankName(rankQualified) {
    // rankQualified - это массив [bronze, silver, gold, platinum]
    if (rankQualified[3]) return 'Платина';
    if (rankQualified[2]) return 'Золото';
    if (rankQualified[1]) return 'Серебро';
    if (rankQualified[0]) return 'Бронза';
    return 'Никто';
  },

  // Обновление данных
  async refresh() {
    await this.loadAllData();
  }
};

// Экспорт в window
window.matrixModule = matrixModule;
