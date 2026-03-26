// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Partners Module - ИСПРАВЛЕННАЯ ВЕРСИЯ
// Партнёрская программа: 12 уровней глубины
// ПРАВИЛЬНАЯ ЛОГИКА: данные берутся из MatrixRegistry.getDirectReferrals()
// ═══════════════════════════════════════════════════════════════════

const partnersModule = {
  contracts: {},
  
  state: {
    currentLevel: 1,
    partners: [],
    stats: {
      personal: 0,    // Лично приглашённых (первая линия)
      active: 0,      // Активных партнёров (с пакетами)
      total: 0        // Общая команда
    },
    qualification: {
      bronze: { achieved: false, progress: 0 },
      silver: { achieved: false, progress: 0 },
      gold: { achieved: false, progress: 0 },
      platinum: { achieved: false, progress: 0 }
    },
    earnings: {
      direct: '0',
      partner: '0',
      matrix: '0',
      leadership: '0',
      total: '0'
    },
    levelInfo: {
      level: 1,
      cost: CONFIG.LEVEL_PRICES[0],
      earned: '0'
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('👥 Initializing Partners...');
    
    try {
      if (!app.state.userAddress) {
        console.log('⚠️ No user address');
        return;
      }

      await this.loadContracts();
      this.createLevelButtons();
      await this.loadAllData();
      this.initUI();

      console.log('✅ Partners loaded');
    } catch (error) {
      console.error('❌ Partners init error:', error);
      app.showNotification(_t('notifications.partnersError'), 'error');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА КОНТРАКТОВ
  // ═══════════════════════════════════════════════════════════════
  async loadContracts() {
    console.log('📥 Loading contracts for partners...');
    
    this.contracts.matrixRegistry = await app.getContract('MatrixRegistry');
    this.contracts.globalWay = await app.getContract('GlobalWay');
    this.contracts.partnerProgram = await app.getContract('PartnerProgram');
    this.contracts.matrixPayments = await app.getContract('MatrixPayments');
    this.contracts.stats = await app.getContract('GlobalWayStats');
    this.contracts.leaderPool = await app.getContract('GlobalWayLeaderPool');
    
    console.log('✅ All partner contracts loaded');
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА ВСЕХ ДАННЫХ
  // ═══════════════════════════════════════════════════════════════
  async loadAllData() {
    await Promise.all([
      this.loadTeamStats(),
      this.loadQualification(),
      this.loadEarnings(),
      this.loadLevelInfo(this.state.currentLevel),
      this.loadPartnersByLevel(this.state.currentLevel)
    ]);
  },

  // ═══════════════════════════════════════════════════════════════
  // СТАТИСТИКА КОМАНДЫ - ИСПРАВЛЕННАЯ
  // ═══════════════════════════════════════════════════════════════
  // Кеш для статистики команды (120 секунд)
  _teamStatsCache: null,
  _teamStatsCacheTime: 0,
  _TEAM_STATS_TTL: 120000,

  async loadTeamStats() {
    try {
      const address = app.state.userAddress;
      
      // Проверяем кеш
      const now = Date.now();
      if (this._teamStatsCache && (now - this._teamStatsCacheTime) < this._TEAM_STATS_TTL) {
        console.log('📊 Team stats from cache');
        this.state.stats = this._teamStatsCache;
        this.updateStatsUI();
        return;
      }
      
      console.log('📊 Loading team stats for', address);
      const mc = window.Multicall3;
      
      // 1. Лично приглашённых
      const directReferrals = await this.contracts.matrixRegistry.getDirectReferrals(address);
      const validDirect = directReferrals.filter(r => r && r !== ethers.constants.AddressZero);
      const personalCount = validDirect.length;
      console.log('👥 Direct referrals (1st line):', personalCount);
      
      // 2. BFS по 12 уровням с Multicall3 (вместо последовательных вызовов)
      const allTeamSet = new Set();
      let currentLevelAddrs = validDirect.map(a => a.toLowerCase());
      
      for (const addr of currentLevelAddrs) {
        allTeamSet.add(addr);
      }
      
      for (let depth = 1; depth <= 12; depth++) {
        if (currentLevelAddrs.length === 0) break;
        
        // Один Multicall3 батч для всего уровня
        const calls = currentLevelAddrs.map(addr => ({
          contract: this.contracts.matrixRegistry,
          method: 'getDirectReferrals',
          args: [addr]
        }));
        
        const results = await mc.batchCall(calls);
        
        let nextLevelAddrs = [];
        for (const refs of results) {
          if (refs && Array.isArray(refs)) {
            for (const refAddr of refs) {
              if (refAddr && refAddr !== ethers.constants.AddressZero) {
                const lower = refAddr.toLowerCase();
                if (!allTeamSet.has(lower)) {
                  allTeamSet.add(lower);
                  nextLevelAddrs.push(lower);
                }
              }
            }
          }
        }
        
        console.log(`  Level ${depth}: ${currentLevelAddrs.length} → ${nextLevelAddrs.length}`);
        currentLevelAddrs = nextLevelAddrs;
      }
      
      // 3. Проверяем активность ОДНИМ батчем Multicall3
      const allAddrs = Array.from(allTeamSet);
      let activeCount = 0;
      
      if (allAddrs.length > 0) {
        const activeCalls = allAddrs.map(addr => ({
          contract: this.contracts.globalWay,
          method: 'getUserMaxLevel',
          args: [addr]
        }));
        
        const activeResults = await mc.batchCall(activeCalls);
        activeCount = activeResults.filter(r => r != null && Number(r) >= 1).length;
      }
      
      console.log('📊 Total team:', allTeamSet.size, '| Active:', activeCount);

      this.state.stats = {
        personal: personalCount,
        active: activeCount,
        total: allTeamSet.size
      };
      
      // Сохраняем в кеш
      this._teamStatsCache = { ...this.state.stats };
      this._teamStatsCacheTime = Date.now();

      console.log('✅ Team stats:', this.state.stats);
      this.updateStatsUI();
      
    } catch (error) {
      console.error('❌ Error loading team stats:', error);
      this.state.stats = { personal: 0, active: 0, total: 0 };
      this.updateStatsUI();
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // КВАЛИФИКАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async loadQualification() {
    try {
      const address = app.state.userAddress;
      console.log('🏆 Loading qualification...');

      const rankInfo = await this.contracts.leaderPool.getUserRankInfo(address);
      const rankNum = Number(rankInfo.rank);

      this.state.qualification = {
        bronze: { 
          achieved: rankNum >= 1, 
          progress: rankNum >= 1 ? 100 : 0 
        },
        silver: { 
          achieved: rankNum >= 2, 
          progress: rankNum >= 2 ? 100 : (rankNum === 1 ? 50 : 0)
        },
        gold: { 
          achieved: rankNum >= 3, 
          progress: rankNum >= 3 ? 100 : (rankNum === 2 ? 50 : 0)
        },
        platinum: { 
          achieved: rankNum >= 4, 
          progress: rankNum >= 4 ? 100 : (rankNum === 3 ? 50 : 0)
        }
      };

      console.log('✅ Qualification loaded, rank:', rankNum);
      this.updateQualificationUI();
      
    } catch (error) {
      console.error('❌ Error loading qualification:', error);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАРАБОТОК - ОРИГИНАЛЬНЫЙ КОД
  // ═══════════════════════════════════════════════════════════════
  async loadEarnings() {
    try {
      const address = app.state.userAddress;
      console.log('💰 Loading earnings...');

      try {
        // Основной способ: через GlobalWayStats.getUserBalances
        const balances = await this.contracts.stats.getUserBalances(address);
        // balances: (partnerFromSponsor, partnerFromUpline, matrixEarnings, 
        //            matrixFrozen, pensionBalance, leaderBalance, totalBalance)
        
        const direct = ethers.utils.formatEther(balances[0]); // от спонсора
        const partner = ethers.utils.formatEther(balances[1]); // от вышестоящих
        const matrix = ethers.utils.formatEther(balances[2]); // матричные
        const leadership = ethers.utils.formatEther(balances[5]); // лидерские

        const total = (
          parseFloat(direct) + 
          parseFloat(partner) + 
          parseFloat(matrix) + 
          parseFloat(leadership)
        ).toFixed(4);

        this.state.earnings = {
          direct,
          partner,
          matrix,
          leadership,
          total
        };
        
        console.log('✅ Earnings loaded from GlobalWayStats:', this.state.earnings);
      } catch (e) {
        console.warn('⚠️ Could not get earnings from Stats, trying individual contracts:', e);
        
        // Фолбек: получаем из отдельных контрактов
        const [fromSponsor, fromUpline, totalPartner] = 
          await this.contracts.partnerProgram.getUserEarnings(address);
        
        const direct = ethers.utils.formatEther(fromSponsor);
        const partner = ethers.utils.formatEther(fromUpline);
        
        // Matrix earnings
        let matrix = '0';
        try {
          const matrixEarnings = await this.contracts.matrixPayments.totalEarnedFromMatrix(address);
          matrix = ethers.utils.formatEther(matrixEarnings);
        } catch (e2) {
          console.warn('⚠️ Could not get matrix earnings:', e2);
        }
        
        // Leader earnings  
        let leadership = '0';
        try {
          const pendingReward = await this.contracts.leaderPool.pendingRewards(address);
          leadership = ethers.utils.formatEther(pendingReward);
        } catch (e2) {
          console.warn('⚠️ Could not get leader earnings:', e2);
        }

        const total = (
          parseFloat(direct) + 
          parseFloat(partner) + 
          parseFloat(matrix) + 
          parseFloat(leadership)
        ).toFixed(4);

        this.state.earnings = {
          direct,
          partner,
          matrix,
          leadership,
          total
        };
      }

      console.log('✅ Earnings loaded:', this.state.earnings);
      this.updateEarningsUI();
      
    } catch (error) {
      console.error('❌ Error loading earnings:', error);
      this.state.earnings = {
        direct: '0',
        partner: '0',
        matrix: '0',
        leadership: '0',
        total: '0'
      };
      this.updateEarningsUI();
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ИНФОРМАЦИЯ О ТЕКУЩЕМ УРОВНЕ
  // ═══════════════════════════════════════════════════════════════
  async loadLevelInfo(level) {
    try {
      const cost = CONFIG.LEVEL_PRICES[level - 1];
      const earned = this.state.earnings.total;

      this.state.levelInfo = { level, cost, earned };
      this.updateLevelInfoUI();
      
    } catch (error) {
      console.error('❌ Error loading level info:', error);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПАРТНЁРЫ ПО УРОВНЮ ГЛУБИНЫ - ИСПРАВЛЕННАЯ
  // Уровень 1 = первая линия (прямые рефералы)
  // Уровень 2 = вторая линия (рефералы рефералов)
  // И так далее до 12
  // ═══════════════════════════════════════════════════════════════
  async loadPartnersByLevel(depth) {
    try {
      const address = app.state.userAddress;
      const tableBody = document.getElementById('partnersTable');
    
      if (!tableBody) return;

      console.log(`📋 Loading partners for depth ${depth}...`);
      tableBody.innerHTML = '<tr><td colspan="8" class="no-data">' + _t('common.loading') + '</td></tr>';

      // Получаем партнёров на нужной глубине (через Multicall3)
      const referrals = await this.getPartnersAtDepth(address, depth);
    
      console.log(`📋 Found ${referrals.length} partners at depth ${depth}`);

      if (referrals.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="no-data">No partners found</td></tr>';
        return;
      }

      // Получаем детали ПАКЕТНО через Multicall3 (максимум 100)
      const limitedReferrals = referrals.slice(0, 100);
      const partnersData = await this.getPartnerDetailsBatch(limitedReferrals);
  
      // Обновляем таблицу
      const esc = window.escapeHtml;
      tableBody.innerHTML = partnersData.map((partner, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${esc(partner.id)}</td>
          <td>${esc(app.formatAddress(partner.address))}</td>
          <td>${esc(partner.sponsorId)}</td>
          <td>${esc(partner.date)}</td>
          <td>${esc(partner.level)}</td>
          <td>${esc(partner.team)}</td>
          <td><span class="badge badge-${esc(partner.rank.toLowerCase().replace(/[^a-z0-9-]/g, ''))}">${esc(partner.rank)}</span></td>
        </tr>
      `).join('');

      this.state.partners = partnersData;
      console.log(`✅ Loaded ${partnersData.length} partners for level ${depth}`);

    } catch (error) {
      console.error('❌ Error loading partners:', error);
      const tableBody = document.getElementById('partnersTable');
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="8" class="no-data">' + _t('common.loadError') + '</td></tr>';
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПОЛУЧИТЬ ПАРТНЁРОВ НА ОПРЕДЕЛЁННОЙ ГЛУБИНЕ
  // Использует Multicall3 для батч-загрузки getDirectReferrals
  // ═══════════════════════════════════════════════════════════════
  async getPartnersAtDepth(address, targetDepth) {
    try {
      console.log(`🔍 getPartnersAtDepth: target=${targetDepth}`);
      
      // Для глубины 1 - просто возвращаем прямых рефералов
      if (targetDepth === 1) {
        const refs = await this.contracts.matrixRegistry.getDirectReferrals(address);
        const validRefs = refs.filter(addr => addr && addr !== ethers.constants.AddressZero);
        console.log(`  ✅ Level 1: ${validRefs.length} direct referrals`);
        return validRefs;
      }
      
      // Для глубины > 1 — BFS с Multicall3 на каждом уровне
      let currentLevel = [address];
      
      for (let depth = 1; depth <= targetDepth; depth++) {
        if (currentLevel.length === 0) return [];

        // Батч-запрос getDirectReferrals для всех адресов текущего уровня
        const calls = currentLevel.map(addr => ({
          contract: this.contracts.matrixRegistry,
          method: 'getDirectReferrals',
          args: [addr]
        }));
        
        const results = await window.Multicall3.batchCall(calls);
        
        let nextLevel = [];
        for (const refs of results) {
          if (refs && Array.isArray(refs)) {
            const valid = refs.filter(r => r && r !== ethers.constants.AddressZero);
            nextLevel.push(...valid);
          }
        }
        
        console.log(`  Level ${depth}: ${currentLevel.length} parents → ${nextLevel.length} children`);
        
        if (depth === targetDepth) {
          return nextLevel;
        }
        
        currentLevel = nextLevel;
      }
      
      return [];
      
    } catch (error) {
      console.error('❌ Error getting partners at depth:', error);
      return [];
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПАКЕТНАЯ ЗАГРУЗКА ДЕТАЛЕЙ ПАРТНЁРОВ (Multicall3)
  // ~600 RPC → 2-3 batch-вызова
  // ═══════════════════════════════════════════════════════════════
  async getPartnerDetailsBatch(addresses) {
    const mc = window.Multicall3;
    const reg = this.contracts.matrixRegistry;
    const gw = this.contracts.globalWay;
    const lp = this.contracts.leaderPool;
    const defaultRank = (_t ? _t('ranks.nobody') : 'Nobody');

    // ─── Раунд 1: собираем ВСЕ вызовы для всех адресов в ОДИН батч ───
    // Для каждого адреса: getUserIdByAddress + getUserInfo + getUserMaxLevel + getDirectReferrals + getUserRankInfo
    const round1Calls = [];
    const CALLS_PER_ADDR = 5;
    
    for (const addr of addresses) {
      round1Calls.push({ contract: reg, method: 'getUserIdByAddress', args: [addr] });
      round1Calls.push({ contract: reg, method: 'getUserInfo', args: [addr] });
      round1Calls.push({ contract: gw,  method: 'getUserMaxLevel', args: [addr] });
      round1Calls.push({ contract: reg, method: 'getDirectReferrals', args: [addr] });
      round1Calls.push({ contract: lp,  method: 'getUserRankInfo', args: [addr] });
    }
    
    console.log(`⚡ Multicall3: ${round1Calls.length} calls in one batch (was ${round1Calls.length} individual RPCs)`);
    const round1Results = await mc.batchCall(round1Calls);

    // ─── Раунд 2: matrixNodes(userId) для дат ───
    const round2Calls = [];
    const userIds = [];
    
    for (let i = 0; i < addresses.length; i++) {
      const userId = round1Results[i * CALLS_PER_ADDR]; // getUserIdByAddress result
      const uid = userId ? userId.toString() : '0';
      userIds.push(uid);
      
      if (uid !== '0') {
        round2Calls.push({ contract: reg, method: 'matrixNodes', args: [uid] });
      } else {
        round2Calls.push(null);
      }
    }
    
    // Фильтруем null и запоминаем маппинг
    const validR2 = [];
    const validR2Map = [];
    round2Calls.forEach((call, idx) => {
      if (call) {
        validR2Map.push(idx);
        validR2.push(call);
      }
    });
    
    const round2Results = validR2.length > 0 ? await mc.batchCall(validR2) : [];
    
    // Раскладываем обратно
    const nodeResults = new Array(addresses.length).fill(null);
    validR2Map.forEach((origIdx, resultIdx) => {
      nodeResults[origIdx] = round2Results[resultIdx];
    });

    // ─── Собираем результаты ───
    const partnersData = [];
    
    for (let i = 0; i < addresses.length; i++) {
      const addr = addresses[i];
      const base = i * CALLS_PER_ADDR;
      
      const userId = round1Results[base];
      const userInfo = round1Results[base + 1];
      const maxLevel = round1Results[base + 2];
      const directRefs = round1Results[base + 3];
      const rankInfo = round1Results[base + 4];
      const nodeData = nodeResults[i];
      
      // ID
      const uid = userId ? userId.toString() : '0';
      const id = uid !== '0' ? `GW${uid}` : app.formatAddress(addr);
      
      // Sponsor
      let sponsorId = '-';
      if (userInfo) {
        try {
          const sid = (userInfo.sponsorId || userInfo[2]).toString();
          sponsorId = sid !== '0' ? `GW${sid}` : '-';
        } catch (e) {}
      }
      
      // Level
      let level = 0;
      if (maxLevel != null) {
        try { level = Number(maxLevel); } catch (e) {}
      }
      
      // Team
      let team = 0;
      if (directRefs && Array.isArray(directRefs)) {
        team = directRefs.filter(r => r && r !== ethers.constants.AddressZero).length;
      }
      
      // Rank
      let rank = defaultRank;
      if (rankInfo) {
        try { rank = this.getRankName(Number(rankInfo.rank || rankInfo[0])); } catch (e) {}
      }
      
      // Date
      let date = '-';
      if (nodeData) {
        try {
          const regTime = Number(nodeData[6]); // registeredAt
          if (regTime > 0) {
            date = new Date(regTime * 1000).toLocaleDateString('ru-RU');
          }
        } catch (e) {}
      }
      
      partnersData.push({ address: addr, id, sponsorId, level, team, rank, date });
    }
    
    return partnersData;
  },

  // ═══════════════════════════════════════════════════════════════
  // ПОЛУЧИТЬ ДЕТАЛИ ПАРТНЁРА (fallback для единичных запросов)
  // ═══════════════════════════════════════════════════════════════
  async getPartnerDetails(address) {
    const batch = await this.getPartnerDetailsBatch([address]);
    return batch[0];
  },

  // ═══════════════════════════════════════════════════════════════
  // ПОЛУЧИТЬ ДАТУ АКТИВАЦИИ
  // ═══════════════════════════════════════════════════════════════
  async getActivationDate(address, userId) {
    try {
      // Из matrixNodes.registeredAt
      if (userId && userId.toString() !== '0') {
        const node = await this.contracts.matrixRegistry.matrixNodes(userId);
        const registrationTime = Number(node[6]); // registeredAt
        
        if (registrationTime > 0) {
          return new Date(registrationTime * 1000).toLocaleDateString('ru-RU');
        }
      }
      
      return '-';
    } catch (error) {
      return '-';
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ОБНОВЛЕНИЕ UI
  // ═══════════════════════════════════════════════════════════════
  
  updateStatsUI() {
    const { personal, active, total } = this.state.stats;

    const personalEl = document.getElementById('personalInvites');
    const activeEl = document.getElementById('activePartners');
    const totalEl = document.getElementById('totalTeam');

    if (personalEl) personalEl.textContent = personal;
    if (activeEl) activeEl.textContent = active;
    if (totalEl) totalEl.textContent = total;
  },

  updateQualificationUI() {
    const ranks = ['bronze', 'silver', 'gold', 'platinum'];
    
    ranks.forEach(rank => {
      const badge = document.getElementById(`${rank}Qual`);
      if (!badge) return;
      
      const qual = this.state.qualification[rank];
      
      if (qual.achieved) {
        badge.classList.add('achieved');
        const progressBar = badge.querySelector('.progress');
        if (progressBar) progressBar.style.width = '100%';
      } else {
        badge.classList.remove('achieved');
        const progressBar = badge.querySelector('.progress');
        if (progressBar) progressBar.style.width = `${qual.progress}%`;
      }
    });
  },

  updateEarningsUI() {
    const { direct, partner, matrix, leadership, total } = this.state.earnings;

    const directEl = document.getElementById('directBonus');
    const partnerEl = document.getElementById('partnerBonus');
    const matrixEl = document.getElementById('matrixBonus');
    const leadershipEl = document.getElementById('leadershipBonus');
    const totalEl = document.getElementById('totalEarned');

    if (directEl) directEl.textContent = `${app.formatNumber(direct, 4)} BNB`;
    if (partnerEl) partnerEl.textContent = `${app.formatNumber(partner, 4)} BNB`;
    if (matrixEl) matrixEl.textContent = `${app.formatNumber(matrix, 4)} BNB`;
    if (leadershipEl) leadershipEl.textContent = `${app.formatNumber(leadership, 4)} BNB`;
    if (totalEl) totalEl.textContent = `${app.formatNumber(total, 4)} BNB`;
  },

  updateLevelInfoUI() {
    const { level, cost, earned } = this.state.levelInfo;

    const levelEl = document.getElementById('currentLevelNum');
    const costEl = document.getElementById('levelCost');
    const earnedEl = document.getElementById('levelEarned');

    if (levelEl) levelEl.textContent = level;
    if (costEl) costEl.textContent = `${cost} BNB`;
    if (earnedEl) earnedEl.textContent = `${app.formatNumber(earned, 4)} BNB`;
  },

  // ═══════════════════════════════════════════════════════════════
  // КНОПКИ УРОВНЕЙ
  // ═══════════════════════════════════════════════════════════════
  createLevelButtons() {
    const container = document.getElementById('partnerLevels');
    if (!container) return;

    container.innerHTML = '';

    for (let level = 1; level <= 12; level++) {
      const btn = document.createElement('button');
      btn.className = `level-btn ${level === 1 ? 'active' : ''}`;
      btn.textContent = level;
      btn.onclick = () => this.selectLevel(level);
      container.appendChild(btn);
    }

    console.log('✅ Level buttons created');
  },

  async selectLevel(level) {
    console.log(`🔘 Selected level ${level}`);
    
    document.querySelectorAll('#partnerLevels .level-btn').forEach((btn, index) => {
      btn.classList.toggle('active', index + 1 === level);
    });

    this.state.currentLevel = level;
    await this.loadLevelInfo(level);
    await this.loadPartnersByLevel(level);
  },

  initUI() {
    console.log('🎨 Initializing Partners UI...');
  },

  // ═══════════════════════════════════════════════════════════════
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ═══════════════════════════════════════════════════════════════
  
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

  async refresh() {
    console.log('🔄 Refreshing partners data...');
    await this.loadAllData();
  }
};

window.partnersModule = partnersModule;
