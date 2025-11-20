// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Matrix Module - ИСПРАВЛЕННАЯ ВЕРСИЯ
// Интерактивная бинарная матрица через matrixNodes
// Date: 2025-01-19 - FIXED
// ═══════════════════════════════════════════════════════════════════

const matrixModule = {
  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
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

  // Цвета для типов позиций
  colors: {
    partner: '#00ff00',      // Зеленый - прямой реферал
    charity: '#ff9500',      // Оранжевый - благотворительность/spillover
    technical: '#00bfff',    // Синий - технические переливы
    available: '#666666'     // Серый - доступно
  },

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('🌐 Initializing Matrix...');
    
    try {
      if (!app.state.userAddress) {
        console.log('⚠️ No user address');
        return;
      }

      this.state.currentUserAddress = app.state.userAddress;

      await this.loadContracts();
      
      // Получаем ID текущего пользователя
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

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА КОНТРАКТОВ
  // ═══════════════════════════════════════════════════════════════
  async loadContracts() {
    console.log('📥 Loading contracts for matrix...');
    
    this.contracts.matrixRegistry = await app.getContract('MatrixRegistry');
    this.contracts.globalWay = await app.getContract('GlobalWay');
    
    console.log('✅ All matrix contracts loaded');
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА ДАННЫХ МАТРИЦЫ
  // ═══════════════════════════════════════════════════════════════
  async loadMatrixData(userId, level) {
    try {
      console.log(`📊 Loading matrix data for user ${userId}, level ${level}...`);

      // Получаем адрес пользователя
      const userAddress = await this.contracts.matrixRegistry.getAddressById(userId);
      
      if (!userAddress || userAddress === ethers.constants.AddressZero) {
        console.error('❌ Invalid user address');
        app.showNotification('Пользователь не найден', 'error');
        return;
      }

      // Получаем структуру матрицы
      const matrixStructure = await this.getMatrixStructure(userId, level);

      // Обновляем state
      this.state.matrixData = matrixStructure;
      this.state.currentLevel = level;

      // Рендерим матрицу
      this.renderMatrix(matrixStructure);
      
      // Обновляем таблицу
      await this.renderMatrixTable(matrixStructure);
      
      // Обновляем статистику
      this.updateMatrixStats(matrixStructure);

      console.log('✅ Matrix data loaded');
      
    } catch (error) {
      console.error('❌ Error loading matrix data:', error);
      app.showNotification('Ошибка загрузки матрицы', 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПОЛУЧЕНИЕ СТРУКТУРЫ МАТРИЦЫ (через matrixNodes)
  // ═══════════════════════════════════════════════════════════════
  async getMatrixStructure(userId, level) {
    try {
      console.log(`🔍 Getting matrix structure for userId ${userId}...`);

      // Получаем узел матрицы
      const nodeData = await this.contracts.matrixRegistry.matrixNodes(userId);
      
      // 🔍 ЛОГИРОВАНИЕ: смотрим что вернул контракт
      console.log("📊 matrixNodes result:", {
        id: nodeData[0].toString(),
        address: nodeData[1],
        sponsorId: nodeData[2].toString(),
        leftChildId: nodeData[3].toString(),
        rightChildId: nodeData[4].toString(),
        isActive: nodeData[7],
        isTechAccount: nodeData[8]
      });
      
      // nodeData - это массив: 
      // [0] id (uint256)
      // [1] userAddress (address)
      // [2] sponsorId (uint256)
      // [3] leftChildId (uint256)
      // [4] rightChildId (uint256)
      // [5] parentBinaryId (uint256)
      // [6] registeredAt (uint256)
      // [7] isActive (bool)
      // [8] isTechAccount (bool)

      if (!nodeData[7]) { // isActive
        console.error('❌ Node not active');
        return this.getEmptyStructure(nodeData[1], level);
      }

      const structure = {
        root: {
          address: nodeData[1], // userAddress
          userId: nodeData[0].toString(), // id
          level: level,
          maxLevel: await this.getUserMaxLevel(nodeData[1]),
          rank: 'Участник',
          leftChildId: nodeData[3].toString(), // leftChildId
          rightChildId: nodeData[4].toString(), // rightChildId
          sponsorId: nodeData[2].toString(), // sponsorId
          isTechAccount: nodeData[8] // isTechAccount
        },
        positions: []
      };

      // Рекурсивно загружаем дерево
      if (nodeData[3].toString() !== '0') {
        await this.buildMatrixTreeFromNodes(structure, nodeData[3], level, 1, 0, 'left');
      }
      
      if (nodeData[4].toString() !== '0') {
        await this.buildMatrixTreeFromNodes(structure, nodeData[4], level, 1, 1, 'right');
      }

      return structure;
      
    } catch (error) {
      console.error('❌ Error getting matrix structure:', error);
      
      // Получаем адрес из userId
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

  // ═══════════════════════════════════════════════════════════════
  // ПОСТРОЕНИЕ ДЕРЕВА МАТРИЦЫ (рекурсивно через matrixNodes)
  // ═══════════════════════════════════════════════════════════════
  async buildMatrixTreeFromNodes(structure, childId, level, depth, position, side) {
    // Ограничиваем глубину (максимум 12 уровней)
    if (depth >= 12 || childId.toString() === '0') return;

    try {
      // Получаем узел ребенка
      const nodeData = await this.contracts.matrixRegistry.matrixNodes(childId);
      
      if (!nodeData[7]) return; // Если не активен

      // Создаем узел
      const node = {
        address: nodeData[1],
        userId: nodeData[0].toString(),
        maxLevel: await this.getUserMaxLevel(nodeData[1]),
        rank: 'Участник',
        depth,
        position,
        side,
        type: await this.getPositionType(nodeData[1], structure.root.address, nodeData[2]),
        isTechAccount: nodeData[8]
      };
      
      structure.positions.push(node);
      
      // Рекурсивно загружаем потомков
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

  // ═══════════════════════════════════════════════════════════════
  // ОПРЕДЕЛЕНИЕ ТИПА ПОЗИЦИИ
  // ═══════════════════════════════════════════════════════════════
  async getPositionType(address, rootAddress, nodeSponsorId) {
    try {
      // Получаем sponsorId корневого пользователя
      const rootUserId = await this.contracts.matrixRegistry.getUserIdByAddress(rootAddress);
      
      // Если sponsorId узла совпадает с ID корня - это прямой реферал
      if (nodeSponsorId.toString() === rootUserId.toString()) {
        return 'partner';
      }

      // Если это тех. место (sponsorId = 7777777)
      if (nodeSponsorId.toString() === '7777777') {
        return 'technical';
      }

      // Иначе - spillover (благотворительность)
      return 'charity';
      
    } catch (error) {
      return 'charity';
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // РЕНДЕРИНГ МАТРИЦЫ (SVG)
  // ═══════════════════════════════════════════════════════════════
  renderMatrix(structure) {
    const container = document.getElementById('matrixVisualization');
    if (!container) return;

    container.innerHTML = '';

    // Создаем SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '600');
    svg.setAttribute('viewBox', '0 0 800 600');
    svg.style.background = 'transparent';

    // Рендерим корневой узел
    this.renderNode(svg, structure.root, 400, 50, 0, true);

    // Рендерим дочерние узлы (первые 4 уровня)
    const maxDepth = Math.min(4, 12);
    this.renderTreeLevel(svg, structure, 1, maxDepth);

    container.appendChild(svg);
  },

  renderNode(svg, node, x, y, depth, isRoot = false) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'matrix-node');
    group.style.cursor = 'pointer';

    // Цвет
    let fillColor = this.colors.available;
    if (node.address && node.address !== ethers.constants.AddressZero) {
      if (node.isTechAccount) {
        fillColor = this.colors.technical;
      } else {
        fillColor = this.colors[node.type] || this.colors.partner;
      }
    }

    // Круг
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', isRoot ? '40' : '30');
    circle.setAttribute('fill', fillColor);
    circle.setAttribute('stroke', '#ffd700');
    circle.setAttribute('stroke-width', isRoot ? '3' : '2');

    // Иконка
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y + 5);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#fff');
    text.setAttribute('font-size', isRoot ? '24' : '20');
    text.textContent = node.address && node.address !== ethers.constants.AddressZero ? '✓' : '?';

    // ID
    if (node.userId && node.userId !== 'N/A' && node.userId !== '0') {
      const idText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      idText.setAttribute('x', x);
      idText.setAttribute('y', y + (isRoot ? 60 : 50));
      idText.setAttribute('text-anchor', 'middle');
      idText.setAttribute('fill', '#ffd700');
      idText.setAttribute('font-size', '12');
      idText.textContent = `GW${node.userId}`;
      group.appendChild(idText);
    }

    // Level
    if (node.maxLevel > 0) {
      const levelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      levelText.setAttribute('x', x);
      levelText.setAttribute('y', y + (isRoot ? 75 : 65));
      levelText.setAttribute('text-anchor', 'middle');
      levelText.setAttribute('fill', '#fff');
      levelText.setAttribute('font-size', '10');
      levelText.textContent = `Level ${node.maxLevel}`;
      group.appendChild(levelText);
    }

    group.appendChild(circle);
    group.appendChild(text);

    // Клик
    group.addEventListener('click', () => {
      this.showNodeModal(node);
    });

    svg.appendChild(group);
  },

  renderTreeLevel(svg, structure, currentDepth, maxDepth) {
    if (currentDepth > maxDepth) return;

    const positions = structure.positions.filter(p => p.depth === currentDepth);
    const levelY = 50 + currentDepth * 120;
    const totalWidth = 800;
    const nodeCount = Math.pow(2, currentDepth);
    const spacing = totalWidth / (nodeCount + 1);

    positions.forEach((node, index) => {
      const x = spacing * (index + 1);
      this.renderNode(svg, node, x, levelY, currentDepth);

      // Линия к родителю
      if (currentDepth > 1) {
        const parentY = levelY - 120;
        const parentX = spacing * Math.floor(index / 2 + 1);
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', parentX);
        line.setAttribute('y1', parentY + 30);
        line.setAttribute('x2', x);
        line.setAttribute('y2', levelY - 30);
        line.setAttribute('stroke', '#ffd700');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('opacity', '0.5');
        
        svg.insertBefore(line, svg.firstChild);
      }
    });
  },

  // ═══════════════════════════════════════════════════════════════
  // РЕНДЕРИНГ ТАБЛИЦЫ
  // ═══════════════════════════════════════════════════════════════
  async renderMatrixTable(structure) {
    const tableBody = document.getElementById('matrixTable');
    if (!tableBody) return;

    const allPositions = [structure.root, ...structure.positions]
      .filter(p => p.address && p.address !== ethers.constants.AddressZero);

    if (allPositions.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" class="no-data">Матрица пуста</td></tr>';
      return;
    }

    const positionsData = await Promise.all(
      allPositions.map(async (pos, index) => {
        const userId = pos.userId || 'N/A';
        const sponsorId = pos.sponsorId ? `GW${pos.sponsorId}` : '-';
        const date = '-';
        const maxLevel = pos.maxLevel || 0;
        const rank = pos.rank || 'Участник';

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

    const totalEl = document.getElementById('matrixTotalPositions');
    const partnersEl = document.getElementById('matrixFromPartners');
    const charityEl = document.getElementById('matrixFromCharity');
    const technicalEl = document.getElementById('matrixFromTechnical');

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
              <p><strong>Level:</strong> ${node.maxLevel}</p>
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

    closeBtn.onclick = () => modal.remove();
    closeBtnBottom.onclick = () => modal.remove();
    
    if (viewMatrixBtn && node.userId && node.userId !== 'N/A' && node.userId !== '0') {
      viewMatrixBtn.onclick = async () => {
        modal.remove();
        await this.loadMatrixData(node.userId, this.state.currentLevel);
      };
    }

    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };

    modal.style.display = 'block';
  },

  getTypeLabel(type, isTechAccount) {
    if (isTechAccount) return '🔵 Техническое место';
    
    const labels = {
      partner: '🟢 Партнер',
      charity: '🟠 Благотворительность',
      technical: '🔵 Технический'
    };
    return labels[type] || '⚪ Доступно';
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

  // ═══════════════════════════════════════════════════════════════
  // ВСПОМОГАТЕЛЬНЫЕ
  // ═══════════════════════════════════════════════════════════════
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
