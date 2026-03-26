// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Matrix Module - VERSION 3.1 FIXED
// Date: 2026-02-14
// FIX: getUserBinaryTree(id, 5) — контракт ограничивает depth=5
// FIX: Дозагрузка глубже 5 рекурсией от листовых узлов
// FIX: Всегда загружаем ВСЁ дерево до depth=12
// FIX: Кеширование matrixNodes и getUserMaxLevel
// FIX: Диагностика sponsor vs binaryParent
// ═══════════════════════════════════════════════════════════════════

const matrixModule = {
  contracts: {},
  
  state: {
    currentLevel: 1,
    currentUserId: null,
    currentUserAddress: null,
    viewingUserId: null,
    navigationHistory: [],
    matrixData: {},
    stats: {
      totalPositions: 0,
      fromPartners: 0,
      fromCharity: 0,
      fromTechnical: 0
    }
  },

  // Кеш для снижения RPC-вызовов
  _maxLevelCache: {},
  _maxLevelCacheTime: {},
  _nodeCache: {},       // кеш matrixNodes по userId
  _nodeCacheTime: {},
  CACHE_TTL: 60000, // 60 секунд

  colors: {
    partner: '#00ff00',
    charity: '#ff9500',
    technical: '#00bfff',
    available: '#666666'
  },

  async init() {
    console.log('🌐 Initializing Matrix v3.1...');
    
    try {
      if (!app.state.userAddress) {
        console.log('⚠️ No user address');
        return;
      }

      this.state.currentUserAddress = app.state.userAddress;
      // Очистка кешей при init
      this._maxLevelCache = {};
      this._maxLevelCacheTime = {};
      this._nodeCache = {};
      this._nodeCacheTime = {};
      
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

      console.log('✅ Matrix v3.1 loaded');
    } catch (error) {
      console.error('❌ Matrix init error:', error);
      app.showNotification(_t('notifications.matrixError'), 'error');
    }
  },

  async loadContracts() {
    console.log('📥 Loading contracts for matrix...');
    this.contracts.matrixRegistry = await app.getContract('MatrixRegistry');
    this.contracts.globalWay = await app.getContract('GlobalWay');
    console.log('✅ All matrix contracts loaded');
  },

  // ═══════════════════════════════════════════════════════════════
  // КЕШИРОВАНИЕ
  // ═══════════════════════════════════════════════════════════════
  async getUserMaxLevel(address) {
    const now = Date.now();
    if (this._maxLevelCache[address] !== undefined && 
        (now - (this._maxLevelCacheTime[address] || 0)) < this.CACHE_TTL) {
      return this._maxLevelCache[address];
    }
    try {
      const level = Number(await this.contracts.globalWay.getUserMaxLevel(address));
      this._maxLevelCache[address] = level;
      this._maxLevelCacheTime[address] = now;
      return level;
    } catch (error) {
      return 0;
    }
  },

  async getNodeData(nodeId) {
    const id = nodeId.toString();
    const now = Date.now();
    if (this._nodeCache[id] && (now - (this._nodeCacheTime[id] || 0)) < this.CACHE_TTL) {
      return this._nodeCache[id];
    }
    try {
      const data = await this.contracts.matrixRegistry.matrixNodes(id);
      this._nodeCache[id] = data;
      this._nodeCacheTime[id] = now;
      return data;
    } catch (error) {
      console.warn(`⚠️ getNodeData(${id}) failed:`, error.message);
      return null;
    }
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
          ⬆️ ${_t ? _t('common.back') : 'Back'}
        </button>
        <button id="matrixGoHome" style="display:none; padding:10px 20px; background:linear-gradient(135deg, #ffd700, #ffaa00); color:#000; border:none; border-radius:8px; font-weight:bold; cursor:pointer; font-size:14px; transition:all 0.3s;">
          🏠 ${_t ? _t('common.myMatrix') : 'My matrix'}
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
      goUpBtn.onclick = function() { self.goUp(); };
    }
    if (goHomeBtn) {
      goHomeBtn.onclick = function() { self.goHome(); };
    }
  },

  updateNavigationUI() {
    const goUpBtn = document.getElementById('matrixGoUp');
    const goHomeBtn = document.getElementById('matrixGoHome');
    const viewingInfo = document.getElementById('matrixViewingInfo');

    const isViewingOther = this.state.viewingUserId !== this.state.currentUserId;
    const hasHistory = this.state.navigationHistory.length > 0;

    if (goUpBtn) goUpBtn.style.display = hasHistory ? 'inline-block' : 'none';
    if (goHomeBtn) goHomeBtn.style.display = isViewingOther ? 'inline-block' : 'none';

    if (viewingInfo) {
      if (isViewingOther) {
        viewingInfo.textContent = (_t ? _t('common.viewing') : 'Viewing') + ': GW' + this.state.viewingUserId;
        viewingInfo.style.display = 'inline-block';
      } else {
        viewingInfo.textContent = '';
        viewingInfo.style.display = 'none';
      }
    }
  },

  async goUp() {
    if (this.state.navigationHistory.length === 0) {
      app.showNotification(_t('notifications.alreadyOnMatrix'), 'info');
      return;
    }
    const previousId = this.state.navigationHistory.pop();
    console.log(`⬆️ Going back to previous: GW${previousId}`);
    await this.loadMatrixData(previousId, this.state.currentLevel, false);
  },

  async goHome() {
    console.log(`🏠 Going home to GW${this.state.currentUserId}`);
    this.state.navigationHistory = [];
    this.state.viewingUserId = this.state.currentUserId;
    await this.loadMatrixData(this.state.currentUserId, this.state.currentLevel, false);
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА ДАННЫХ
  // ═══════════════════════════════════════════════════════════════

  async loadMatrixData(userId, level, addToHistory) {
    try {
      console.log(`📊 Loading matrix: GW${userId}, level ${level}`);

      const userAddress = await this.contracts.matrixRegistry.getAddressById(userId);
      
      if (!userAddress || userAddress === ethers.constants.AddressZero) {
        console.error('❌ User not found: GW' + userId);
        app.showNotification(_t('notifications.userNotFound'), 'error');
        return;
      }

      if (addToHistory && this.state.viewingUserId && this.state.viewingUserId !== userId.toString()) {
        this.state.navigationHistory.push(this.state.viewingUserId);
      }

      this.state.viewingUserId = userId.toString();

      const tableBody = document.getElementById('matrixTableBody');
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#ffd700;">' + (_t ? _t('common.loading') : 'Loading...') + '</td></tr>';
      }

      const matrixStructure = await this.getMatrixStructure(userId, level);

      this.state.matrixData = matrixStructure;
      this.state.currentLevel = level;

      this.renderMatrix(matrixStructure);
      await this.renderMatrixTable(matrixStructure);
      this.updateMatrixStats(matrixStructure);
      this.updateNavigationUI();

      console.log(`✅ Matrix loaded: GW${userId}, ${matrixStructure.positions.length} positions`);
      
    } catch (error) {
      console.error('❌ loadMatrixData error:', error);
      app.showNotification(_t('notifications.matrixError'), 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПОЛУЧЕНИЕ СТРУКТУРЫ — 2 стратегии:
  // 1) getUserBinaryTree(id, 5) + дозагрузка глубже
  // 2) Фолбек: рекурсия по matrixNodes до depth 12
  // ═══════════════════════════════════════════════════════════════

  async getMatrixStructure(userId, level) {
    try {
      console.log(`🔍 Getting matrix structure for userId ${userId}...`);

      const rootData = await this.getNodeData(userId);

      if (!rootData || !rootData[7]) {
        console.error('❌ Node not active');
        const addr = rootData ? rootData[1] : ethers.constants.AddressZero;
        return this.getEmptyStructure(addr, level);
      }

      const rootMaxLevel = await this.getUserMaxLevel(rootData[1]);

      const structure = {
        root: {
          address: rootData[1],
          userId: rootData[0].toString(),
          level: level,
          maxLevel: rootMaxLevel,
          rank: (_t ? _t('common.member') : 'Member'),
          leftChildId: rootData[3].toString(),
          rightChildId: rootData[4].toString(),
          sponsorId: rootData[2].toString(),
          parentBinaryId: rootData[5].toString(),
          isTechAccount: rootData[8],
          type: this.getPositionTypeSync(rootData[2], rootData[8])
        },
        positions: [],
        _addedIds: new Set() // Защита от дублей
      };

      // Стратегия 1: getUserBinaryTree(id, 5) для быстрой загрузки
      let usedBinaryTree = false;
      try {
        const treeIds = await this.contracts.matrixRegistry.getUserBinaryTree(userId, 5);
        const validIds = treeIds.map(id => id.toString()).filter(id => id !== '0');
        
        if (validIds.length > 0) {
          console.log(`📦 getUserBinaryTree returned ${validIds.length} IDs (depth 5)`);
          
          // Предзагрузка всех узлов пакетами
          await this.preloadNodes(validIds);
          
          // Строим дерево из кешированных данных
          await this.buildFromCache(structure, rootData[3].toString(), 1, 0, 'left');
          await this.buildFromCache(structure, rootData[4].toString(), 1, 1, 'right');
          
          // Дозагрузка глубже 5 уровней — от листовых узлов
          const leafNodes = structure.positions.filter(p => p.depth === 5);
          if (leafNodes.length > 0) {
            console.log(`🔄 Extending tree from ${leafNodes.length} leaf nodes at depth 5...`);
            for (const leaf of leafNodes) {
              const leafData = this._nodeCache[leaf.userId];
              if (leafData) {
                const leftId = leafData[3].toString();
                const rightId = leafData[4].toString();
                if (leftId !== '0') {
                  await this.buildTreeRecursive(structure, leftId, 6, leaf.position * 2, 'left');
                }
                if (rightId !== '0') {
                  await this.buildTreeRecursive(structure, rightId, 6, leaf.position * 2 + 1, 'right');
                }
              }
            }
          }
          
          usedBinaryTree = true;
        }
      } catch (e) {
        console.warn('⚠️ getUserBinaryTree failed:', e.reason || e.message);
      }

      // Стратегия 2: Полная рекурсия (фолбек)
      if (!usedBinaryTree) {
        console.log('🔄 Using full recursive tree loading (up to depth 12)...');
        if (rootData[3].toString() !== '0') {
          await this.buildTreeRecursive(structure, rootData[3], 1, 0, 'left');
        }
        if (rootData[4].toString() !== '0') {
          await this.buildTreeRecursive(structure, rootData[4], 1, 1, 'right');
        }
      }

      // Диагностика: проверяем спонсор vs бинарный родитель
      this.logSponsorDiagnostics(structure);

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

  // Предзагрузка узлов через Multicall3 (1-2 batch-вызова вместо десятков)
  async preloadNodes(nodeIds) {
    const mc = window.Multicall3;
    const now = Date.now();
    
    // Фильтруем уже кешированные
    const toLoadNodes = nodeIds.filter(id => 
      !this._nodeCache[id] || (now - (this._nodeCacheTime[id] || 0)) >= this.CACHE_TTL
    );
    
    // Батч 1: загружаем matrixNodes для всех некешированных ID
    if (toLoadNodes.length > 0) {
      const nodeCalls = toLoadNodes.map(id => ({
        contract: this.contracts.matrixRegistry,
        method: 'matrixNodes',
        args: [id]
      }));
      
      console.log(`⚡ Matrix Multicall3: loading ${toLoadNodes.length} nodes in batch`);
      const nodeResults = await mc.batchCall(nodeCalls);
      
      toLoadNodes.forEach((id, idx) => {
        if (nodeResults[idx]) {
          this._nodeCache[id] = nodeResults[idx];
          this._nodeCacheTime[id] = now;
        }
      });
    }
    
    // Батч 2: загружаем getUserMaxLevel для адресов
    const addressesToLoad = [];
    const addressIds = [];
    
    for (const id of nodeIds) {
      const addr = this._nodeCache[id]?.[1];
      if (addr && addr !== ethers.constants.AddressZero) {
        if (this._maxLevelCache[addr] === undefined || (now - (this._maxLevelCacheTime[addr] || 0)) >= this.CACHE_TTL) {
          addressesToLoad.push(addr);
          addressIds.push(id);
        }
      }
    }
    
    if (addressesToLoad.length > 0) {
      const levelCalls = addressesToLoad.map(addr => ({
        contract: this.contracts.globalWay,
        method: 'getUserMaxLevel',
        args: [addr]
      }));
      
      console.log(`⚡ Matrix Multicall3: loading ${addressesToLoad.length} maxLevels in batch`);
      const levelResults = await mc.batchCall(levelCalls);
      
      addressesToLoad.forEach((addr, idx) => {
        const level = levelResults[idx] != null ? Number(levelResults[idx]) : 0;
        this._maxLevelCache[addr] = level;
        this._maxLevelCacheTime[addr] = now;
      });
    }
  },

  // Построение из кешированных данных (без RPC вызовов)
  async buildFromCache(structure, childId, depth, position, side) {
    if (depth > 12 || childId === '0') return;
    if (structure._addedIds.has(childId)) return;
    
    const childData = this._nodeCache[childId];
    if (!childData || !childData[7]) return;
    
    structure._addedIds.add(childId);

    const maxLevel = await this.getUserMaxLevel(childData[1]);

    structure.positions.push({
      address: childData[1],
      userId: childData[0].toString(),
      maxLevel: maxLevel,
      rank: (_t ? _t('common.member') : 'Member'),
      depth,
      position,
      side,
      type: this.getPositionTypeSync(childData[2], childData[8]),
      isTechAccount: childData[8],
      sponsorId: childData[2].toString()
    });

    const leftId = childData[3].toString();
    const rightId = childData[4].toString();

    if (leftId !== '0') {
      await this.buildFromCache(structure, leftId, depth + 1, position * 2, 'left');
    }
    if (rightId !== '0') {
      await this.buildFromCache(structure, rightId, depth + 1, position * 2 + 1, 'right');
    }
  },

  // Полная рекурсия — ВСЕГДА до 12 уровней
  async buildTreeRecursive(structure, childId, depth, position, side) {
    if (depth > 12 || childId.toString() === '0') return;
    if (structure._addedIds.has(childId.toString())) return;
    
    try {
      const nodeData = await this.getNodeData(childId);
      if (!nodeData || !nodeData[7]) return;
      
      structure._addedIds.add(childId.toString());
      
      const userMaxLevel = await this.getUserMaxLevel(nodeData[1]);
      
      structure.positions.push({
        address: nodeData[1],
        userId: nodeData[0].toString(),
        maxLevel: userMaxLevel,
        rank: (_t ? _t('common.member') : 'Member'),
        depth,
        position,
        side,
        type: this.getPositionTypeSync(nodeData[2], nodeData[8]),
        isTechAccount: nodeData[8],
        sponsorId: nodeData[2].toString()
      });
      
      if (nodeData[3].toString() !== '0') {
        await this.buildTreeRecursive(structure, nodeData[3], depth + 1, position * 2, 'left');
      }
      
      if (nodeData[4].toString() !== '0') {
        await this.buildTreeRecursive(structure, nodeData[4], depth + 1, position * 2 + 1, 'right');
      }
    } catch (error) {
      console.error(`❌ Error building tree node ${childId}:`, error.message);
    }
  },

  // Диагностика: спонсоры vs бинарные родители
  logSponsorDiagnostics(structure) {
    console.log('═══════════ 📋 ДИАГНОСТИКА СПОНСОРОВ ═══════════');
    console.log(`Root: GW${structure.root.userId} (sponsor: GW${structure.root.sponsorId})`);
    
    let misplaced = 0;
    const rootId = structure.root.userId;
    
    for (const pos of structure.positions) {
      const sponsorId = pos.sponsorId;
      const parentBinaryText = `depth=${pos.depth}, pos=${pos.position}, side=${pos.side}`;
      
      // Проверяем: спонсор совпадает с корнем матрицы?
      const isSponsoredByRoot = sponsorId === rootId;
      
      if (pos.depth === 1 && !isSponsoredByRoot && sponsorId !== '7777777') {
        // ✅ НОРМАЛЬНО: в бинарной матрице место размещения ≠ спонсор
        // Алгоритм ставит человека туда где есть свободное место, а не к своему спонсору
        // Это стандартное поведение бинарной матрицы (forced matrix placement)
        misplaced++; // убрали лог — это не ошибка, просто информация
      }
      
      // Логируем первые 2 линии для визуальной проверки
      if (pos.depth <= 2) {
        console.log(`  GW${pos.userId}: sponsor=GW${sponsorId}, ${parentBinaryText}, tech=${pos.isTechAccount}`);
      }
    }
    
    console.log(`📊 Итого: ${structure.positions.length} позиций, ${misplaced} на 1-й линии со СПОНСОРОМ ≠ ROOT`);
    console.log('═══════════════════════════════════════════════');
  },

  getPositionTypeSync(nodeSponsorId, isTechAccount) {
    if (isTechAccount || nodeSponsorId.toString() === '7777777') {
      return 'technical';
    }
    return 'partner';
  },

  getEmptyStructure(userAddress, level) {
    return {
      root: {
        address: userAddress,
        userId: 'N/A',
        level: level,
        maxLevel: 0,
        rank: (_t ? _t('ranks.nobody') : 'Nobody'),
        leftChildId: '0',
        rightChildId: '0',
        sponsorId: '0',
        parentBinaryId: '0',
        isTechAccount: false
      },
      positions: []
    };
  },

  // ═══════════════════════════════════════════════════════════════
  // РЕНДЕРИНГ МАТРИЦЫ (визуальные 7 слотов: 1-2-4)
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
    if (levelSpan) levelSpan.textContent = `Lv.${nodeData.maxLevel || 0}`;
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
  // ТАБЛИЦА ПОЗИЦИЙ — 1 вызов matrixNodes на узел (из кеша)
  // ═══════════════════════════════════════════════════════════════
  async renderMatrixTable(structure) {
    const tableBody = document.getElementById('matrixTableBody');
    if (!tableBody) return;

    const levelPositions = structure.positions
      .filter(p => p.depth === this.state.currentLevel)
      .filter(p => p.address && p.address !== ethers.constants.AddressZero);

    const maxPositionsOnLevel = Math.pow(2, this.state.currentLevel);

    const currentLevelEl = document.getElementById('currentMatrixLevel');
    const maxPosEl = document.getElementById('maxPositionsInfo');
    if (currentLevelEl) currentLevelEl.textContent = this.state.currentLevel;
    if (maxPosEl) maxPosEl.textContent = maxPositionsOnLevel;

    if (levelPositions.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#ffd700;">Line ${this.state.currentLevel} empty (max ${maxPositionsOnLevel} positions)</td></tr>`;
      return;
    }

    const positionsData = await Promise.all(
      levelPositions.map(async (p, index) => {
        const userId = p.userId || 'N/A';
        
        let sponsorId = p.sponsorId ? `GW${p.sponsorId}` : '-';
        let date = '-';
        
        // Данные из кеша — без лишних RPC
        const nodeData = await this.getNodeData(userId);
        if (nodeData) {
          const sid = nodeData[2].toString();
          sponsorId = sid !== '0' ? `GW${sid}` : '-';
          
          const timestamp = Number(nodeData[6]);
          if (timestamp > 0) {
            date = new Date(timestamp * 1000).toLocaleDateString('ru-RU');
          }
        }

        return {
          num: index + 1,
          id: userId !== 'N/A' && userId !== '0' ? `GW${userId}` : 'N/A',
          address: p.address,
          sponsorId,
          date,
          level: p.maxLevel || 0,
          rank: (_t ? _t('common.member') : 'Member')
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
      0: (_t ? _t('ranks.nobody') : 'Nobody'),
      1: (_t ? _t('ranks.bronze') : 'Bronze 🥉'),
      2: (_t ? _t('ranks.silver') : 'Silver 🥈'),
      3: (_t ? _t('ranks.gold') : 'Gold 🥇'),
      4: (_t ? _t('ranks.platinum') : 'Platinum 💎')
    };
    return ranks[rankId] || (_t ? _t('ranks.nobody') : 'Nobody');
  },

  // ═══════════════════════════════════════════════════════════════
  // СТАТИСТИКА
  // ═══════════════════════════════════════════════════════════════
  updateMatrixStats(structure) {
    const allPositions = [structure.root, ...structure.positions]
      .filter(p => p.address && p.address !== ethers.constants.AddressZero);

    const total = allPositions.length;
    const fromPartners = allPositions.filter(p => p.type === 'partner' && !p.isTechAccount).length;
    const fromCharity = allPositions.filter(p => p.type === 'charity').length;
    const fromTechnical = allPositions.filter(p => p.type === 'technical' || p.isTechAccount).length;

    this.state.stats = { totalPositions: total, fromPartners, fromCharity, fromTechnical };

    const totalEl = document.getElementById('totalActivePositions');
    const partnersEl = document.getElementById('partnerPositions');
    const charityEl = document.getElementById('charityPositions');
    const technicalEl = document.getElementById('technicalPositions');

    if (totalEl) totalEl.textContent = total;
    if (partnersEl) partnersEl.textContent = fromPartners;
    if (charityEl) charityEl.textContent = fromCharity;
    if (technicalEl) technicalEl.textContent = fromTechnical;
  },

  // ═══════════════════════════════════════════════════════════════
  // МОДАЛЬНОЕ ОКНО
  // ═══════════════════════════════════════════════════════════════
  async showNodeModal(node) {
    if (!node.address || node.address === ethers.constants.AddressZero) {
      app.showNotification('Position available', 'info');
      return;
    }

    const nodeUserId = node.userId;
    const currentLevel = this.state.currentLevel;
    const self = this;

    let sponsorId = node.sponsorId ? `GW${node.sponsorId}` : '-';
    if (!node.sponsorId || node.sponsorId === '0') {
      const nd = await this.getNodeData(node.userId);
      if (nd) {
        const sid = nd[2].toString();
        sponsorId = sid !== '0' ? `GW${sid}` : '-';
      }
    }

    let rank = (_t ? _t('common.member') : 'Member');
    try {
      const leaderPool = await app.getContract('GlobalWayLeaderPool');
      const rankInfo = await leaderPool.getUserRankInfo(node.address);
      rank = this.getRankName(Number(rankInfo.rank));
    } catch (e) {}

    const oldModal = document.getElementById('nodeModal');
    if (oldModal) oldModal.remove();

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'nodeModal';
    modalOverlay.style.cssText = 'display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; align-items:center; justify-content:center;';

    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background:linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border:2px solid #ffd700; border-radius:15px; padding:25px; max-width:400px; width:90%; position:relative;';

    const closeX = document.createElement('span');
    closeX.innerHTML = '&times;';
    closeX.style.cssText = 'position:absolute; top:10px; right:15px; font-size:28px; color:#ffd700; cursor:pointer;';

    const header = document.createElement('div');
    header.style.cssText = 'text-align:center; margin-bottom:20px;';
    header.innerHTML = '<h2 style="color:#ffd700; margin:0;">Position Info</h2>';

    const content = document.createElement('div');
    content.style.cssText = 'color:#fff; line-height:2;';
    content.innerHTML = `
      <p><strong>ID:</strong> <span style="color:#ffd700;">${nodeUserId !== 'N/A' && nodeUserId !== '0' ? 'GW' + nodeUserId : 'N/A'}</span></p>
      <p><strong>Address:</strong> ${app.formatAddress(node.address)}</p>
      <p><strong>Sponsor:</strong> ${sponsorId}</p>
      <p><strong>Level:</strong> ${node.maxLevel}</p>
      <p><strong>Rank:</strong> ${rank}</p>
      <p><strong>Type:</strong> ${this.getTypeLabel(node.type, node.isTechAccount)}</p>
    `;

    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = 'display:flex; gap:10px; margin-top:25px;';

    const viewMatrixBtn = document.createElement('button');
    viewMatrixBtn.textContent = '🌐 Matrix';
    viewMatrixBtn.style.cssText = 'flex:1; padding:14px 15px; background:linear-gradient(135deg, #ffd700, #ffaa00); color:#000; border:none; border-radius:8px; font-weight:bold; cursor:pointer; font-size:13px;';

    const closeModalBtn = document.createElement('button');
    closeModalBtn.textContent = '✕ Close';
    closeModalBtn.style.cssText = 'flex:1; padding:14px 15px; background:transparent; color:#ffd700; border:2px solid #ffd700; border-radius:8px; font-weight:bold; cursor:pointer; font-size:13px;';

    const closeModal = () => {
      const m = document.getElementById('nodeModal');
      if (m) m.remove();
    };

    closeX.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeModal(); });
    closeModalBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeModal(); });

    if (nodeUserId && nodeUserId !== 'N/A' && nodeUserId !== '0') {
      viewMatrixBtn.addEventListener('click', async (e) => {
        e.preventDefault(); e.stopPropagation();
        closeModal();
        try {
          await self.loadMatrixData(nodeUserId, currentLevel, true);
        } catch (err) {
          app.showNotification(_t('notifications.matrixError'), 'error');
        }
      });
    } else {
      viewMatrixBtn.disabled = true;
      viewMatrixBtn.style.opacity = '0.5';
      viewMatrixBtn.style.cursor = 'not-allowed';
    }

    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    buttonsDiv.appendChild(viewMatrixBtn);
    buttonsDiv.appendChild(closeModalBtn);
    modalContent.appendChild(closeX);
    modalContent.appendChild(header);
    modalContent.appendChild(content);
    modalContent.appendChild(buttonsDiv);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
  },

  getTypeLabel(type, isTechAccount) {
    if (isTechAccount || type === 'technical') return '🔵 Technical';
    if (type === 'partner') return '🟢 Partner';
    return '⚪ Available';
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
        if (!/^\d+$/.test(userId)) {
          app.showNotification('Enter valid ID', 'error');
          return;
        }
        try {
          await self.loadMatrixData(userId, self.state.currentLevel, true);
        } catch (err) {
          app.showNotification(_t('notifications.userNotFound'), 'error');
        }
      });

      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBtn.click();
      });
    }
  },

  async refresh() {
    this._maxLevelCache = {};
    this._maxLevelCacheTime = {};
    this._nodeCache = {};
    this._nodeCacheTime = {};
    await this.loadMatrixData(this.state.viewingUserId, this.state.currentLevel, false);
  }
};

window.matrixModule = matrixModule;
