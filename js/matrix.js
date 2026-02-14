// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Matrix Module - VERSION 2.0 WITH NAVIGATION
// Date: 2025-12-19
// FIX: Правильное отображение позиций по position вместо индекса
// NEW: Навигация Вверх/Домой для просмотра структуры
// ═══════════════════════════════════════════════════════════════════

const matrixModule = {
  contracts: {},
  
  state: {
    currentLevel: 1,
    currentUserId: null,        // ID залогиненного пользователя
    currentUserAddress: null,
    viewingUserId: null,        // ID которого сейчас смотрим
    navigationHistory: [],      // История навигации для кнопки "Вверх"
    matrixData: {},
    stats: {
      totalPositions: 0,
      fromPartners: 0,
      fromCharity: 0,
      fromTechnical: 0
    }
  },

  colors: {
    partner: '#00ff00',
    charity: '#ff9500',
    technical: '#00bfff',
    available: '#666666'
  },

  async init() {
    console.log('🌐 Initializing Matrix v2.0 with Navigation...');
    
    try {
      if (!app.state.userAddress) {
        console.log('⚠️ No user address');
        return;
      }

      this.state.currentUserAddress = app.state.userAddress;
      await this.loadContracts();
      
      const userId = await this.contracts.matrixRegistry.getUserIdByAddress(
        this.state.currentUserAddress
      );
      this.state.currentUserId = userId.toString();
      this.state.viewingUserId = userId.toString();
      this.state.navigationHistory = [];

      this.createLevelButtons();
      this.createNavigationUI();
      this.initUI();
      await this.loadMatrixData(this.state.currentUserId, this.state.currentLevel, false);

      console.log('✅ Matrix v2.0 loaded');
    } catch (error) {
      console.error('❌ Matrix init error:', error);
      app.showNotification('Ошибка загрузки матрицы', 'error');
    }
  },

  async loadContracts() {
    console.log('📥 Loading contracts for matrix...');
    this.contracts.matrixRegistry = await app.getContract('MatrixRegistry');
    this.contracts.globalWay = await app.getContract('GlobalWay');
    console.log('✅ All matrix contracts loaded');
  },

  // ═══════════════════════════════════════════════════════════════
  // НАВИГАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  
  createNavigationUI() {
    const matrixContainer = document.querySelector('.interactive-matrix');
    if (!matrixContainer) return;

    if (document.getElementById('matrixNavigation')) return;

    const navHTML = `
      <div id="matrixNavigation" style="display:flex; justify-content:center; align-items:center; gap:15px; margin-bottom:15px; flex-wrap:wrap;">
        <button id="matrixGoUp" style="display:none; padding:10px 20px; background:linear-gradient(135deg, #667eea, #764ba2); color:#fff; border:none; border-radius:8px; font-weight:bold; cursor:pointer; font-size:14px; transition:all 0.3s;">
          ⬆️ Назад
        </button>
        <button id="matrixGoHome" style="display:none; padding:10px 20px; background:linear-gradient(135deg, #ffd700, #ffaa00); color:#000; border:none; border-radius:8px; font-weight:bold; cursor:pointer; font-size:14px; transition:all 0.3s;">
          🏠 Моя матрица
        </button>
        <span id="matrixViewingInfo" style="color:#ffd700; font-size:14px; font-weight:600;"></span>
      </div>
    `;

    const title = matrixContainer.querySelector('h3');
    if (title) {
      title.insertAdjacentHTML('afterend', navHTML);
    } else {
      matrixContainer.insertAdjacentHTML('afterbegin', navHTML);
    }

    const goUpBtn = document.getElementById('matrixGoUp');
    const goHomeBtn = document.getElementById('matrixGoHome');
    const self = this;

    if (goUpBtn) {
      goUpBtn.onclick = function() {
        self.goUp();
      };
    }

    if (goHomeBtn) {
      goHomeBtn.onclick = function() {
        self.goHome();
      };
    }
  },

  updateNavigationUI() {
    const goUpBtn = document.getElementById('matrixGoUp');
    const goHomeBtn = document.getElementById('matrixGoHome');
    const viewingInfo = document.getElementById('matrixViewingInfo');

    const isViewingOther = this.state.viewingUserId !== this.state.currentUserId;
    const hasHistory = this.state.navigationHistory.length > 0;

    // Кнопка "Вверх" видна только когда есть история навигации
    if (goUpBtn) {
      goUpBtn.style.display = hasHistory ? 'inline-block' : 'none';
    }

    if (goHomeBtn) {
      goHomeBtn.style.display = isViewingOther ? 'inline-block' : 'none';
    }

    if (viewingInfo) {
      if (isViewingOther) {
        viewingInfo.textContent = `Просмотр: GW${this.state.viewingUserId}`;
        viewingInfo.style.display = 'inline-block';
      } else {
        viewingInfo.textContent = '';
        viewingInfo.style.display = 'none';
      }
    }
  },

  async goUp() {
    // Возврат к ПРЕДЫДУЩЕМУ просмотру (не к родителю в бинаре!)
    if (this.state.navigationHistory.length === 0) {
      app.showNotification('Вы на своей матрице', 'info');
      return;
    }

    const previousId = this.state.navigationHistory.pop();
    console.log(`⬆️ Going back to previous: GW${previousId}`);
    
    await this.loadMatrixData(previousId, this.state.currentLevel, false);
  },

  async goHome() {
    console.log(`🏠 Going home to GW${this.state.currentUserId}`);
    this.state.navigationHistory = [];
    this.state.currentLevel = 1;
    // Reset level button UI
    document.querySelectorAll('#matrixLevels .level-btn').forEach((btn, index) => {
      btn.classList.toggle('active', index === 0);
    });
    await this.loadMatrixData(this.state.currentUserId, 1, false);
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА ДАННЫХ
  // ═══════════════════════════════════════════════════════════════

  async loadMatrixData(userId, level, addToHistory = false) {
    // Guard: предотвращаем дубликаты
    const loadKey = `${userId}_${level}`;
    if (this._loadingKey === loadKey) {
      console.log('⚠️ Already loading this matrix, skipping duplicate');
      return;
    }
    this._loadingKey = loadKey;
    
    try {
      console.log(`📊 Loading matrix: GW${userId}, level ${level}`);

      const userAddress = await this.contracts.matrixRegistry.getAddressById(userId);
      
      if (!userAddress || userAddress === ethers.constants.AddressZero) {
        console.error('❌ User not found: GW' + userId);
        app.showNotification('Пользователь не найден', 'error');
        return;
      }

      // Добавляем в историю для кнопки "Назад"
      if (addToHistory && this.state.viewingUserId && this.state.viewingUserId !== userId.toString()) {
        this.state.navigationHistory.push(this.state.viewingUserId);
        console.log(`📚 History: [${this.state.navigationHistory.join(' → ')}]`);
      }

      this.state.viewingUserId = userId.toString();

      const matrixStructure = await this.getMatrixStructure(userId, level);

      this.state.matrixData = matrixStructure;
      this.state.currentLevel = level;

      this.renderMatrix(matrixStructure);
      await this.renderMatrixTable(matrixStructure);
      this.updateMatrixStats(matrixStructure);
      this.updateNavigationUI();

      console.log('✅ Matrix loaded: GW' + userId);
      this._loadingKey = null;
      
    } catch (error) {
      this._loadingKey = null;
      console.error('❌ loadMatrixData error:', error);
      app.showNotification('Ошибка загрузки матрицы', 'error');
    }
  },

  async getMatrixStructure(userId, level) {
    try {
      console.log(`🔍 Getting matrix structure for userId ${userId}...`);

      const nodeData = await this.contracts.matrixRegistry.matrixNodes(userId);

      if (!nodeData[7]) {
        console.error('❌ Node not active');
        return this.getEmptyStructure(nodeData[1], level);
      }

      const structure = {
        root: {
          address: nodeData[1],
          userId: nodeData[0].toString(),
          level: level,
          maxLevel: await this.getUserMaxLevel(nodeData[1]),
          rank: 'Участник',
          leftChildId: nodeData[3].toString(),
          rightChildId: nodeData[4].toString(),
          sponsorId: nodeData[2].toString(),
          parentBinaryId: nodeData[5].toString(),
          isTechAccount: nodeData[8]
        },
        positions: []
      };

      if (nodeData[3].toString() !== '0') {
        await this.buildMatrixTreeFromNodes(structure, nodeData[3], level, 1, 0, 'left');
      }
      
      if (nodeData[4].toString() !== '0') {
        await this.buildMatrixTreeFromNodes(structure, nodeData[4], level, 1, 1, 'right');
      }

      return structure;
      
    } catch (error) {
      console.error('❌ Error getting matrix structure:', error);
      try {
        const addr = await this.contracts.matrixRegistry.getAddressById(userId);
        return this.getEmptyStructure(addr, level);
      } catch (e) {
        return this.getEmptyStructure(ethers.constants.AddressZero, level);
      }
    }
  },

  getEmptyStructure(userAddress, level) {
    return {
      root: {
        address: userAddress,
        userId: 'N/A',
        level: level,
        maxLevel: 0,
        rank: 'Никто',
        leftChildId: '0',
        rightChildId: '0',
        sponsorId: '0',
        parentBinaryId: '0',
        isTechAccount: false
      },
      positions: []
    };
  },

  async buildMatrixTreeFromNodes(structure, childId, level, depth, position, side) {
    // Показываем только 2 уровня глубины (root + 2 линии = 7 позиций)
    // Для таблицы подгружаем до currentLevel
    const maxDepth = Math.max(2, this.state.currentLevel);
    if (depth > maxDepth || childId.toString() === '0') return;
    
    try {
      const nodeData = await this.contracts.matrixRegistry.matrixNodes(childId);
      if (!nodeData[7]) return;
      
      const userMaxLevel = await this.getUserMaxLevel(nodeData[1]);
      
      const node = {
        address: nodeData[1],
        userId: nodeData[0].toString(),
        maxLevel: userMaxLevel,
        rank: 'Участник',
        depth,
        position,
        side,
        type: await this.getPositionType(nodeData[1], structure.root.address, nodeData[2]),
        isTechAccount: nodeData[8]
      };
      
      structure.positions.push(node);
      
      if (nodeData[3].toString() !== '0') {
        await this.buildMatrixTreeFromNodes(
          structure,
          nodeData[3],
          level,
          depth + 1,
          position * 2,
          'left'
        );
      }
      
      if (nodeData[4].toString() !== '0') {
        await this.buildMatrixTreeFromNodes(
          structure,
          nodeData[4],
          level,
          depth + 1,
          position * 2 + 1,
          'right'
        );
      }
    } catch (error) {
      console.error('❌ Error building tree:', error);
    }
  },

  async getPositionType(address, rootAddress, nodeSponsorId) {
    try {
      if (nodeSponsorId.toString() === '7777777') {
        return 'technical';
      }
      return 'partner';
    } catch (error) {
      return 'partner';
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // РЕНДЕРИНГ МАТРИЦЫ
  // ═══════════════════════════════════════════════════════════════
  renderMatrix(structure) {
    this.updateMatrixPosition('topPosition', structure.root);

    const firstLine = structure.positions.filter(p => p.depth === 1);
    this.updateMatrixPosition('position1', firstLine.find(p => p.position === 0) || null);
    this.updateMatrixPosition('position2', firstLine.find(p => p.position === 1) || null);

    const secondLine = structure.positions.filter(p => p.depth === 2);
    this.updateMatrixPosition('position3', secondLine.find(p => p.position === 0) || null);
    this.updateMatrixPosition('position4', secondLine.find(p => p.position === 1) || null);
    this.updateMatrixPosition('position5', secondLine.find(p => p.position === 2) || null);
    this.updateMatrixPosition('position6', secondLine.find(p => p.position === 3) || null);
  },

  updateMatrixPosition(elementId, nodeData) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const idSpan = element.querySelector('.position-id');
    const typeSpan = element.querySelector('.position-type');
    const levelSpan = element.querySelector('.position-level');
    const avatar = element.querySelector('.position-avatar');

    if (!nodeData || !nodeData.address || nodeData.address === ethers.constants.AddressZero) {
      if (idSpan) idSpan.textContent = 'Empty';
      if (typeSpan) typeSpan.textContent = 'Available';
      if (levelSpan) levelSpan.textContent = '';
      if (avatar) avatar.textContent = '?';
      element.style.background = '';
      element.classList.remove('filled', 'partner', 'charity', 'technical');
      element.onclick = null;
      return;
    }

    const userId = nodeData.userId || 'N/A';
    const idText = userId !== 'N/A' && userId !== '0' ? `GW${userId}` : app.formatAddress(nodeData.address);
    
    if (idSpan) idSpan.textContent = idText;
    if (levelSpan) levelSpan.textContent = `Level ${nodeData.maxLevel || 0}`;
    if (avatar) avatar.textContent = '✓';

    let typeText = 'Partner';
    let typeClass = 'partner';
    
    if (nodeData.isTechAccount || nodeData.type === 'technical') {
      typeText = 'Technical';
      typeClass = 'technical';
    }

    if (typeSpan) typeSpan.textContent = typeText;

    element.classList.remove('partner', 'charity', 'technical', 'available');
    element.classList.add('filled', typeClass);

    const self = this;
    element.onclick = function() {
      self.showNodeModal(nodeData);
    };
  },

  // ═══════════════════════════════════════════════════════════════
  // ТАБЛИЦА ПОЗИЦИЙ
  // ═══════════════════════════════════════════════════════════════
  async renderMatrixTable(structure) {
    const tableBody = document.getElementById('matrixTableBody');
    if (!tableBody) return;

    // Фильтруем ТОЛЬКО по выбранному уровню глубины (currentLevel)
    // Кнопка 1 = depth 1 (первая линия - 2 позиции)
    // Кнопка 2 = depth 2 (вторая линия - 4 позиции) и т.д.
    const levelPositions = structure.positions
      .filter(p => p.depth === this.state.currentLevel)
      .filter(p => p.address && p.address !== ethers.constants.AddressZero);

    // Обновляем информацию о уровне
    const maxPositionsOnLevel = Math.pow(2, this.state.currentLevel);

    if (levelPositions.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#ffd700;">Линия ${this.state.currentLevel} пуста (макс. ${maxPositionsOnLevel} позиций)</td></tr>`;
      return;
    }

    const positionsData = await Promise.all(
      levelPositions.map(async (p, index) => {
        const userId = p.userId || 'N/A';
        
        let sponsorId = '-';
        try {
          const nodeData = await this.contracts.matrixRegistry.matrixNodes(userId);
          const sid = nodeData[2].toString();
          sponsorId = sid !== '0' ? `GW${sid}` : '-';
        } catch (e) {}

        let date = '-';
        try {
          const nodeData = await this.contracts.matrixRegistry.matrixNodes(userId);
          const timestamp = Number(nodeData[6]);
          if (timestamp > 0) {
            date = new Date(timestamp * 1000).toLocaleDateString('ru-RU');
          }
        } catch (e) {}

        let maxLevel = p.maxLevel || 0;
        let rank = 'Участник';

        return {
          num: index + 1,
          id: userId !== 'N/A' && userId !== '0' ? `GW${userId}` : 'N/A',
          address: p.address,
          sponsorId,
          date,
          level: maxLevel,
          rank
        };
      })
    );

    tableBody.innerHTML = positionsData.map(p => `
      <tr>
        <td>${p.num}</td>
        <td>${p.id}</td>
        <td>${app.formatAddress(p.address)}</td>
        <td>${p.sponsorId}</td>
        <td>${p.date}</td>
        <td>${p.level}</td>
        <td><span class="badge">${p.rank}</span></td>
      </tr>
    `).join('');
  },

  getRankName(rankId) {
    const ranks = {
      0: 'Никто',
      1: 'Бронза 🥉',
      2: 'Серебро 🥈',
      3: 'Золото 🥇',
      4: 'Платина 💎'
    };
    return ranks[rankId] || 'Никто';
  },

  // ═══════════════════════════════════════════════════════════════
  // СТАТИСТИКА
  // ═══════════════════════════════════════════════════════════════
  updateMatrixStats(structure) {
    const allPositions = [structure.root, ...structure.positions]
      .filter(p => p.address && p.address !== ethers.constants.AddressZero);

    const total = allPositions.length;
    const fromPartners = allPositions.filter(p => p.type === 'partner').length;
    const fromCharity = allPositions.filter(p => p.type === 'charity').length;
    const fromTechnical = allPositions.filter(p => p.type === 'technical' || p.isTechAccount).length;

    this.state.stats = {
      totalPositions: total,
      fromPartners,
      fromCharity,
      fromTechnical
    };

    const totalEl = document.getElementById('totalActivePositions');
    const partnersEl = document.getElementById('partnerPositions');
    const charityEl = document.getElementById('charityPositions');
    const technicalEl = document.getElementById('technicalPositions');

    if (totalEl) totalEl.textContent = total;
    if (partnersEl) partnersEl.textContent = fromPartners;
    if (charityEl) charityEl.textContent = fromCharity;
    if (technicalEl) technicalEl.textContent = fromTechnical;

    const maxPositions = Math.pow(2, this.state.currentLevel);
    const levelInfoEl = document.getElementById('matrixLevelInfo');
    if (levelInfoEl) {
      levelInfoEl.textContent = `Current Level: ${this.state.currentLevel} Max Positions: ${maxPositions}`;
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // МОДАЛЬНОЕ ОКНО
  // ═══════════════════════════════════════════════════════════════
  async showNodeModal(node) {
    if (!node.address || node.address === ethers.constants.AddressZero) {
      app.showNotification('Позиция свободна', 'info');
      return;
    }

    const nodeUserId = node.userId;
    const currentLevel = this.state.currentLevel;
    const self = this;

    let sponsorId = '-';
    try {
      const nodeData = await this.contracts.matrixRegistry.matrixNodes(node.userId);
      const sponsorIdNum = nodeData[2].toString();
      sponsorId = sponsorIdNum !== '0' ? `GW${sponsorIdNum}` : '-';
    } catch (e) {
      console.warn('⚠️ Could not get sponsor:', e);
    }

    let rank = 'Никто';
    try {
      const leaderPool = await app.getContract('GlobalWayLeaderPool');
      const rankInfo = await leaderPool.getUserRankInfo(node.address);
      rank = this.getRankName(Number(rankInfo.rank));
    } catch (e) {
      console.warn('⚠️ Could not get rank:', e);
      rank = 'Участник';
    }

    // Удаляем старое модальное окно
    const oldModal = document.getElementById('nodeModal');
    if (oldModal) oldModal.remove();

    // Создаём контейнер
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'nodeModal';
    modalOverlay.style.cssText = 'display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; align-items:center; justify-content:center;';

    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background:linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border:2px solid #ffd700; border-radius:15px; padding:25px; max-width:400px; width:90%; position:relative;';

    // Крестик закрытия
    const closeX = document.createElement('span');
    closeX.innerHTML = '&times;';
    closeX.style.cssText = 'position:absolute; top:10px; right:15px; font-size:28px; color:#ffd700; cursor:pointer;';

    // Заголовок
    const header = document.createElement('div');
    header.style.cssText = 'text-align:center; margin-bottom:20px;';
    header.innerHTML = '<h2 style="color:#ffd700; margin:0;">Информация о позиции</h2>';

    // Контент
    const content = document.createElement('div');
    content.style.cssText = 'color:#fff; line-height:2;';
    content.innerHTML = `
      <p><strong>ID:</strong> <span style="color:#ffd700;">${nodeUserId !== 'N/A' && nodeUserId !== '0' ? 'GW' + nodeUserId : 'N/A'}</span></p>
      <p><strong>Адрес:</strong> ${app.formatAddress(node.address)}</p>
      <p><strong>Спонсор:</strong> ${sponsorId}</p>
      <p><strong>Уровень:</strong> ${node.maxLevel}</p>
      <p><strong>Ранг:</strong> ${rank}</p>
      <p><strong>Тип:</strong> ${this.getTypeLabel(node.type, node.isTechAccount)}</p>
    `;

    // Кнопки
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = 'display:flex; gap:10px; margin-top:25px;';

    const viewMatrixBtn = document.createElement('button');
    viewMatrixBtn.textContent = '🌐 Матрица';
    viewMatrixBtn.style.cssText = 'flex:1; padding:14px 15px; background:linear-gradient(135deg, #ffd700, #ffaa00); color:#000; border:none; border-radius:8px; font-weight:bold; cursor:pointer; font-size:13px;';

    const closeModalBtn = document.createElement('button');
    closeModalBtn.textContent = '✕ Закрыть';
    closeModalBtn.style.cssText = 'flex:1; padding:14px 15px; background:transparent; color:#ffd700; border:2px solid #ffd700; border-radius:8px; font-weight:bold; cursor:pointer; font-size:13px;';

    // Функция закрытия
    const closeModal = () => {
      console.log('🔴 Closing modal...');
      const m = document.getElementById('nodeModal');
      if (m) m.remove();
    };

    // Обработчики с addEventListener
    closeX.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('❌ CloseX clicked');
      closeModal();
    });

    closeModalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('❌ CloseBtn clicked');
      closeModal();
    });

    if (nodeUserId && nodeUserId !== 'N/A' && nodeUserId !== '0') {
      viewMatrixBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`🌐 ViewMatrix clicked for GW${nodeUserId}`);
        closeModal();
        try {
          await self.loadMatrixData(nodeUserId, currentLevel, true);
          console.log('✅ Matrix loaded for GW' + nodeUserId);
        } catch (err) {
          console.error('❌ Error:', err);
          app.showNotification('Ошибка загрузки матрицы', 'error');
        }
      });
    } else {
      viewMatrixBtn.disabled = true;
      viewMatrixBtn.style.opacity = '0.5';
      viewMatrixBtn.style.cursor = 'not-allowed';
    }

    // Клик по оверлею закрывает модалку
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });

    // Собираем DOM
    buttonsDiv.appendChild(viewMatrixBtn);
    buttonsDiv.appendChild(closeModalBtn);
    
    modalContent.appendChild(closeX);
    modalContent.appendChild(header);
    modalContent.appendChild(content);
    modalContent.appendChild(buttonsDiv);
    
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    console.log('✅ Modal opened for GW' + nodeUserId);
  },

  getTypeLabel(type, isTechAccount) {
    if (isTechAccount || type === 'technical') return '🔵 Техническое место';
    if (type === 'partner') return '🟢 Партнер';
    return '⚪ Доступно';
  },

  // ═══════════════════════════════════════════════════════════════
  // UI
  // ═══════════════════════════════════════════════════════════════
  createLevelButtons() {
    const container = document.getElementById('matrixLevels');
    if (!container) return;

    container.innerHTML = '';

    for (let level = 1; level <= 12; level++) {
      const btn = document.createElement('button');
      btn.className = `level-btn ${level === 1 ? 'active' : ''}`;
      btn.textContent = level;
      btn.onclick = () => this.selectLevel(level);
      container.appendChild(btn);
    }
  },

  async selectLevel(level) {
    document.querySelectorAll('#matrixLevels .level-btn').forEach((btn, index) => {
      btn.classList.toggle('active', index + 1 === level);
    });

    await this.loadMatrixData(this.state.viewingUserId, level, false);
  },

  initUI() {
    const searchBtn = document.getElementById('matrixSearchBtn');
    const searchInput = document.getElementById('matrixSearchInput');

    if (searchBtn && searchInput) {
      const self = this;
      searchBtn.addEventListener('click', async () => {
        let userId = searchInput.value.trim().replace(/^GW/i, '');
        console.log(`🔍 Search: ${userId}`);
        
        if (!/^\d+$/.test(userId)) {
          app.showNotification('Введите корректный ID', 'error');
          return;
        }
        
        try {
          await self.loadMatrixData(userId, self.state.currentLevel, true);
        } catch (err) {
          console.error('❌ Search error:', err);
          app.showNotification('Пользователь не найден', 'error');
        }
      });

      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBtn.click();
      });
    }
  },

  _maxLevelCache: {},
  
  async getUserMaxLevel(address) {
    try {
      // Cache to avoid duplicate RPC calls
      const key = address.toLowerCase();
      if (this._maxLevelCache[key] !== undefined) return this._maxLevelCache[key];
      const level = Number(await this.contracts.globalWay.getUserMaxLevel(address));
      this._maxLevelCache[key] = level;
      return level;
    } catch (error) {
      return 0;
    }
  },

  async refresh() {
    await this.loadMatrixData(this.state.viewingUserId, this.state.currentLevel, false);
  }
};

window.matrixModule = matrixModule;
