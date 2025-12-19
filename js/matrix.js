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
        <button id="matrixGoUp" style="padding:10px 20px; background:linear-gradient(135deg, #667eea, #764ba2); color:#fff; border:none; border-radius:8px; font-weight:bold; cursor:pointer; font-size:14px; transition:all 0.3s;">
          ⬆️ Вверх
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

    // Кнопка "Вверх" видна всегда (проверка родителя при нажатии)
    if (goUpBtn) {
      goUpBtn.style.display = 'inline-block';
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
    try {
      console.log(`⬆️ goUp clicked! viewingUserId=${this.state.viewingUserId}`);
      
      // Получаем parentBinaryId текущего просматриваемого пользователя
      const nodeData = await this.contracts.matrixRegistry.matrixNodes(this.state.viewingUserId);
      const parentBinaryId = nodeData[5].toString(); // parentBinaryId
      
      console.log(`⬆️ parentBinaryId for GW${this.state.viewingUserId} = ${parentBinaryId}`);
      
      if (parentBinaryId === '0') {
        app.showNotification('Вы на верхнем уровне структуры', 'info');
        return;
      }

      console.log(`⬆️ Going up to parent GW${parentBinaryId}`);
      
      // Добавляем текущий в историю для возможности вернуться
      this.state.navigationHistory.push(this.state.viewingUserId);
      
      await this.loadMatrixData(parentBinaryId, this.state.currentLevel, false);
    } catch (error) {
      console.error('❌ Error going up:', error);
      app.showNotification('Ошибка навигации', 'error');
    }
  },

  async goHome() {
    console.log(`🏠 Going home to GW${this.state.currentUserId}`);
    this.state.navigationHistory = [];
    await this.loadMatrixData(this.state.currentUserId, this.state.currentLevel, false);
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА ДАННЫХ
  // ═══════════════════════════════════════════════════════════════

  async loadMatrixData(userId, level, addToHistory = false) {
    try {
      console.log(`📊 loadMatrixData START: GW${userId}, level ${level}, addToHistory=${addToHistory}`);

      const userAddress = await this.contracts.matrixRegistry.getAddressById(userId);
      console.log(`📊 userAddress for GW${userId}:`, userAddress);
      
      if (!userAddress || userAddress === ethers.constants.AddressZero) {
        console.error('❌ Invalid user address for GW' + userId);
        app.showNotification('Пользователь не найден', 'error');
        return;
      }

      if (addToHistory && this.state.viewingUserId && this.state.viewingUserId !== userId) {
        this.state.navigationHistory.push(this.state.viewingUserId);
        console.log(`📚 Added GW${this.state.viewingUserId} to history. Stack:`, this.state.navigationHistory);
      }

      this.state.viewingUserId = userId.toString();
      console.log(`📊 viewingUserId set to: ${this.state.viewingUserId}`);

      const matrixStructure = await this.getMatrixStructure(userId, level);
      console.log(`📊 matrixStructure:`, matrixStructure);

      this.state.matrixData = matrixStructure;
      this.state.currentLevel = level;

      console.log(`📊 Calling renderMatrix...`);
      this.renderMatrix(matrixStructure);
      
      console.log(`📊 Calling renderMatrixTable...`);
      await this.renderMatrixTable(matrixStructure);
      
      console.log(`📊 Calling updateMatrixStats...`);
      this.updateMatrixStats(matrixStructure);
      
      console.log(`📊 Calling updateNavigationUI...`);
      this.updateNavigationUI();

      console.log('✅ loadMatrixData COMPLETE for GW' + userId);
      
    } catch (error) {
      console.error('❌ Error in loadMatrixData:', error);
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
    if (depth >= 12 || childId.toString() === '0') return;
    
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

    const allPositions = [structure.root, ...structure.positions]
      .filter(p => p.address && p.address !== ethers.constants.AddressZero);

    if (allPositions.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Нет данных</td></tr>';
      return;
    }

    const positionsData = await Promise.all(
      allPositions.map(async (p, index) => {
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

    const oldModal = document.getElementById('nodeModal');
    if (oldModal) oldModal.remove();

    const modalHTML = `
      <div id="nodeModal" style="display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; align-items:center; justify-content:center;">
        <div style="background:linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border:2px solid #ffd700; border-radius:15px; padding:25px; max-width:400px; width:90%; position:relative;">
          <span id="nodeModalCloseX" style="position:absolute; top:10px; right:15px; font-size:28px; color:#ffd700; cursor:pointer;">&times;</span>
          <div style="text-align:center; margin-bottom:20px;">
            <h2 style="color:#ffd700; margin:0;">Информация о позиции</h2>
          </div>
          <div style="color:#fff; line-height:2;">
            <p><strong>ID:</strong> ${nodeUserId !== 'N/A' && nodeUserId !== '0' ? 'GW' + nodeUserId : 'N/A'}</p>
            <p><strong>Адрес:</strong> ${app.formatAddress(node.address)}</p>
            <p><strong>Спонсор:</strong> ${sponsorId}</p>
            <p><strong>Уровень:</strong> ${node.maxLevel}</p>
            <p><strong>Ранг:</strong> ${rank}</p>
            <p><strong>Тип:</strong> ${this.getTypeLabel(node.type, node.isTechAccount)}</p>
          </div>
          <div style="display:flex; gap:10px; margin-top:25px;">
            <button id="viewMatrixBtn" style="flex:1; padding:14px 15px; background:linear-gradient(135deg, #ffd700, #ffaa00); color:#000; border:none; border-radius:8px; font-weight:bold; cursor:pointer; font-size:13px;">
              🌐 Матрица
            </button>
            <button id="closeModalBtn" style="flex:1; padding:14px 15px; background:transparent; color:#ffd700; border:2px solid #ffd700; border-radius:8px; font-weight:bold; cursor:pointer; font-size:13px;">
              ✕ Закрыть
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const closeX = document.getElementById('nodeModalCloseX');
    const closeBtn = document.getElementById('closeModalBtn');
    const viewBtn = document.getElementById('viewMatrixBtn');

    const closeModal = () => {
      const m = document.getElementById('nodeModal');
      if (m) m.remove();
    };

    closeX.onclick = closeModal;
    closeBtn.onclick = closeModal;

    if (nodeUserId && nodeUserId !== 'N/A' && nodeUserId !== '0') {
      viewBtn.onclick = async function() {
        console.log(`🌐 Button clicked! Loading matrix for GW${nodeUserId}...`);
        alert(`Открываю матрицу GW${nodeUserId}`); // Временно для отладки
        closeModal();
        try {
          await self.loadMatrixData(nodeUserId, currentLevel, true);
          console.log('✅ Matrix loaded successfully');
        } catch (err) {
          console.error('❌ Error loading matrix:', err);
          alert('Ошибка: ' + err.message);
        }
      };
    } else {
      viewBtn.disabled = true;
      viewBtn.style.opacity = '0.5';
      viewBtn.style.cursor = 'not-allowed';
    }

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

    console.log('🔍 initUI: searchBtn=', searchBtn, 'searchInput=', searchInput);

    if (searchBtn && searchInput) {
      const self = this;
      searchBtn.onclick = async () => {
        let userId = searchInput.value.trim().replace(/^GW/i, '');
        console.log(`🔍 Search clicked! userId=${userId}`);
        
        if (!/^\d+$/.test(userId)) {
          app.showNotification('Введите корректный ID', 'error');
          return;
        }
        
        alert(`Ищу матрицу GW${userId}`); // Временно для отладки
        
        try {
          await self.loadMatrixData(userId, self.state.currentLevel, true);
          console.log('✅ Search completed');
        } catch (err) {
          console.error('❌ Search error:', err);
          alert('Ошибка поиска: ' + err.message);
        }
      };

      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBtn.click();
      });
    } else {
      console.warn('⚠️ Search elements not found!');
    }
  },

  async getUserMaxLevel(address) {
    try {
      return Number(await this.contracts.globalWay.getUserMaxLevel(address));
    } catch (error) {
      return 0;
    }
  },

  async refresh() {
    await this.loadMatrixData(this.state.viewingUserId, this.state.currentLevel, false);
  }
};

window.matrixModule = matrixModule;
