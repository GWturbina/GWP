// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Matrix Module - FINAL VERSION
// Обновляет HTML элементы вместо создания SVG
// Date: 2025-01-19
// FIX: Показывает только пользователей с активированным уровнем
// ═══════════════════════════════════════════════════════════════════

const matrixModule = {
  contracts: {},
  
  state: {
    currentLevel: 1,
    currentUserId: null,
    currentUserAddress: null,
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
    console.log('🌐 Initializing Matrix...');
    
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

      this.createLevelButtons();
      this.initUI();
      await this.loadMatrixData(this.state.currentUserId, this.state.currentLevel);

      console.log('✅ Matrix loaded');
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

  async loadMatrixData(userId, level) {
    try {
      console.log(`📊 Loading matrix data for user ${userId}, level ${level}...`);

      const userAddress = await this.contracts.matrixRegistry.getAddressById(userId);
      
      if (!userAddress || userAddress === ethers.constants.AddressZero) {
        console.error('❌ Invalid user address');
        app.showNotification('Пользователь не найден', 'error');
        return;
      }

      const matrixStructure = await this.getMatrixStructure(userId, level);

      this.state.matrixData = matrixStructure;
      this.state.currentLevel = level;

      this.renderMatrix(matrixStructure);
      await this.renderMatrixTable(matrixStructure);
      this.updateMatrixStats(matrixStructure);

      console.log('✅ Matrix data loaded');
      
    } catch (error) {
      console.error('❌ Error loading matrix data:', error);
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
    
    // Получаем maxLevel для отображения (БЕЗ пропуска пользователя)
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
}

  async getPositionType(address, rootAddress, nodeSponsorId) {
    try {
      // Если это тех. место (sponsorId = 7777777)
      if (nodeSponsorId.toString() === '7777777') {
        return 'technical';
      }

      // Всё остальное - партнёр
      return 'partner';
      
    } catch (error) {
      return 'partner';
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // РЕНДЕРИНГ МАТРИЦЫ (обновляем HTML элементы)
  // ═══════════════════════════════════════════════════════════════
  renderMatrix(structure) {
    // Обновляем топ-позицию (корень)
    this.updateMatrixPosition('topPosition', structure.root);

    // Обновляем позиции первой линии (2 позиции)
    const firstLine = structure.positions.filter(p => p.depth === 1);
    this.updateMatrixPosition('position1', firstLine[0] || null);
    this.updateMatrixPosition('position2', firstLine[1] || null);

    // Обновляем позиции второй линии (4 позиции)
    const secondLine = structure.positions.filter(p => p.depth === 2);
    this.updateMatrixPosition('position3', secondLine[0] || null);
    this.updateMatrixPosition('position4', secondLine[1] || null);
    this.updateMatrixPosition('position5', secondLine[2] || null);
    this.updateMatrixPosition('position6', secondLine[3] || null);
  },

  updateMatrixPosition(elementId, nodeData) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const idSpan = element.querySelector('.position-id');
    const typeSpan = element.querySelector('.position-type');
    const levelSpan = element.querySelector('.position-level');
    const avatar = element.querySelector('.position-avatar');

    if (!nodeData || !nodeData.address || nodeData.address === ethers.constants.AddressZero) {
      // Пустая позиция
      if (idSpan) idSpan.textContent = 'Empty';
      if (typeSpan) typeSpan.textContent = 'Available';
      if (levelSpan) levelSpan.textContent = '';
      if (avatar) avatar.textContent = '?';
      element.style.background = '';
      element.classList.remove('filled', 'partner', 'charity', 'technical');
      return;
    }

    // Заполненная позиция
    const userId = nodeData.userId || 'N/A';
    const idText = userId !== 'N/A' && userId !== '0' ? `GW${userId}` : app.formatAddress(nodeData.address);
    
    if (idSpan) idSpan.textContent = idText;
    if (levelSpan) levelSpan.textContent = `Level ${nodeData.maxLevel || 0}`;
    if (avatar) avatar.textContent = '✓';

    // Тип позиции
    let typeText = 'Partner';
    let typeClass = 'partner';
    
    if (nodeData.isTechAccount || nodeData.type === 'technical') {
      typeText = 'Technical';
      typeClass = 'technical';
    }

    if (typeSpan) typeSpan.textContent = typeText;
    
    // Добавляем классы
    element.classList.add('filled', typeClass);
    element.classList.remove('partner', 'charity', 'technical');
    element.classList.add(typeClass);

    // Клик
    element.onclick = () => this.showNodeModal(nodeData);
  },

  // ═══════════════════════════════════════════════════════════════
  // РЕНДЕРИНГ ТАБЛИЦЫ
  // ═══════════════════════════════════════════════════════════════
  async renderMatrixTable(structure) {
    const tableBody = document.getElementById('matrixTableBody');
    if (!tableBody) return;

    // ✅ ИСПРАВЛЕНО: Показываем только позиции выбранного уровня глубины
    const levelDepth = this.state.currentLevel;
    const levelPositions = structure.positions.filter(p => p.depth === levelDepth);

    if (levelPositions.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" class="no-data">На этом уровне нет партнеров</td></tr>';
      return;
    }

    const positionsData = await Promise.all(
      levelPositions.map(async (pos, index) => {
        const userId = pos.userId || 'N/A';
        
        // ✅ ИСПРАВЛЕНО: Получаем sponsorId из matrixNodes
        let sponsorId = '-';
        try {
          const nodeData = await this.contracts.matrixRegistry.matrixNodes(userId);
          const sponsorIdNum = nodeData[2].toString();
          sponsorId = sponsorIdNum !== '0' ? `GW${sponsorIdNum}` : '-';
        } catch (e) {
          console.warn('⚠️ Could not get sponsor:', e);
        }
        
        const date = '-';
        const maxLevel = pos.maxLevel || 0;
        
        // ✅ ИСПРАВЛЕНО: Получаем ранг из LeaderPool
        let rank = 'Никто';
        try {
          const leaderPool = await app.getContract('GlobalWayLeaderPool');
          const rankInfo = await leaderPool.getUserRankInfo(pos.address);
          rank = this.getRankName(Number(rankInfo.rank));
        } catch (e) {
          console.warn('⚠️ Could not get rank:', e);
          rank = 'Участник';
        }

        return {
          num: index + 1,
          id: userId !== 'N/A' && userId !== '0' ? `GW${userId}` : app.formatAddress(pos.address),
          address: pos.address,
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

    // ✅ ИСПРАВЛЕНО: Получаем спонсора
    let sponsorId = '-';
    try {
      const nodeData = await this.contracts.matrixRegistry.matrixNodes(node.userId);
      const sponsorIdNum = nodeData[2].toString();
      sponsorId = sponsorIdNum !== '0' ? `GW${sponsorIdNum}` : '-';
    } catch (e) {
      console.warn('⚠️ Could not get sponsor:', e);
    }

    // ✅ ИСПРАВЛЕНО: Получаем ранг
    let rank = 'Никто';
    try {
      const leaderPool = await app.getContract('GlobalWayLeaderPool');
      const rankInfo = await leaderPool.getUserRankInfo(node.address);
      rank = this.getRankName(Number(rankInfo.rank));
    } catch (e) {
      console.warn('⚠️ Could not get rank:', e);
      rank = 'Участник';
    }

    const modalHTML = `
      <div id="nodeModal" class="modal">
        <div class="modal-content cosmic-card">
          <span class="close-modal">&times;</span>
          <div class="modal-header cosmic-header">
            <h2>Информация о позиции</h2>
          </div>
          <div class="modal-body">
            <div class="node-info">
              <p><strong>ID:</strong> ${node.userId !== 'N/A' && node.userId !== '0' ? 'GW' + node.userId : 'N/A'}</p>
              <p><strong>Address:</strong> ${app.formatAddress(node.address)}</p>
              <p><strong>Спонсор:</strong> ${sponsorId}</p>
              <p><strong>Level:</strong> ${node.maxLevel}</p>
              <p><strong>Ранг:</strong> ${rank}</p>
              <p><strong>Type:</strong> ${this.getTypeLabel(node.type, node.isTechAccount)}</p>
            </div>
            <div class="modal-actions">
              <button id="viewMatrixBtn" class="btn-gold">
                🌐 Посмотреть матрицу
              </button>
              <button id="closeModalBtn" class="btn-outline">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const oldModal = document.getElementById('nodeModal');
    if (oldModal) oldModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('nodeModal');
    const closeBtn = modal.querySelector('.close-modal');
    const closeBtnBottom = document.getElementById('closeModalBtn');
    const viewMatrixBtn = document.getElementById('viewMatrixBtn');

    // ✅ ИСПРАВЛЕНО: Кнопки закрытия
    const closeModal = () => {
      modal.style.display = 'none';
      setTimeout(() => modal.remove(), 300);
    };

    closeBtn.onclick = closeModal;
    closeBtnBottom.onclick = closeModal;
    
    // ✅ ИСПРАВЛЕНО: Кнопка просмотра матрицы
    if (viewMatrixBtn && node.userId && node.userId !== 'N/A' && node.userId !== '0') {
      viewMatrixBtn.onclick = async () => {
        closeModal();
        await this.loadMatrixData(node.userId, this.state.currentLevel);
      };
    } else if (viewMatrixBtn) {
      viewMatrixBtn.disabled = true;
      viewMatrixBtn.style.opacity = '0.5';
    }

    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };

    modal.style.display = 'block';
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

    await this.loadMatrixData(this.state.currentUserId, level);
  },

  initUI() {
    const searchBtn = document.getElementById('matrixSearchBtn');
    const searchInput = document.getElementById('matrixSearchInput');

    if (searchBtn && searchInput) {
      searchBtn.onclick = async () => {
        let userId = searchInput.value.trim().replace(/^GW/i, '');
        if (!/^\d+$/.test(userId)) {
          app.showNotification('Введите корректный ID', 'error');
          return;
        }
        await this.loadMatrixData(userId, this.state.currentLevel);
      };

      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBtn.click();
      });
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
    await this.loadMatrixData(this.state.currentUserId, this.state.currentLevel);
  }
};

window.matrixModule = matrixModule;
