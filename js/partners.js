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
      app.showNotification('Ошибка загрузки партнеров', 'error');
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
  async loadTeamStats() {
    try {
      const address = app.state.userAddress;
      console.log('📊 Loading team stats for', address);
      
      // 1. Лично приглашённых - из MatrixRegistry.getDirectReferrals
      const directReferrals = await this.contracts.matrixRegistry.getDirectReferrals(address);
      const validDirect = directReferrals.filter(r => r && r !== ethers.constants.AddressZero);
      const personalCount = validDirect.length;
      console.log('👥 Direct referrals (1st line):', personalCount);
      
      // 2. Собираем ВСЮ команду по всем 12 уровням — оптимизированный BFS
      const allTeamSet = new Set(); // Set для O(1) проверки дубликатов
      let activeCount = 0;
      
      // BFS по уровням — загружаем пакетами для скорости
      let currentLevelAddrs = validDirect.map(a => a.toLowerCase());
      
      // Добавляем первую линию
      for (const addr of currentLevelAddrs) {
        allTeamSet.add(addr);
      }
      
      for (let depth = 1; depth <= 12; depth++) {
        if (currentLevelAddrs.length === 0) break;
        
        let nextLevelAddrs = [];
        
        // Пакетная загрузка рефералов для текущего уровня
        const batchSize = 5;
        for (let i = 0; i < currentLevelAddrs.length; i += batchSize) {
          const batch = currentLevelAddrs.slice(i, i + batchSize);
          
          const batchResults = await Promise.all(
            batch.map(async (addr) => {
              try {
                const refs = await this.contracts.matrixRegistry.getDirectReferrals(addr);
                return refs.filter(r => r && r !== ethers.constants.AddressZero);
              } catch (e) {
                return [];
              }
            })
          );
          
          for (const refs of batchResults) {
            for (const refAddr of refs) {
              const lower = refAddr.toLowerCase();
              if (!allTeamSet.has(lower)) {
                allTeamSet.add(lower);
                nextLevelAddrs.push(lower);
              }
            }
          }
        }
        
        console.log(`  Level ${depth}: ${currentLevelAddrs.length} partners, next: ${nextLevelAddrs.length}`);
        currentLevelAddrs = nextLevelAddrs;
      }
      
      // 3. Проверяем активность пакетами
      const allAddrs = Array.from(allTeamSet);
      const activeBatchSize = 10;
      
      for (let i = 0; i < allAddrs.length; i += activeBatchSize) {
        const batch = allAddrs.slice(i, i + activeBatchSize);
        const results = await Promise.all(
          batch.map(async (addr) => {
            try {
              const maxLevel = await this.contracts.globalWay.getUserMaxLevel(addr);
              return Number(maxLevel) >= 1;
            } catch (e) {
              return false;
            }
          })
        );
        activeCount += results.filter(Boolean).length;
      }
      
      console.log('📊 Total team:', allTeamSet.size);
      console.log('📊 Active partners:', activeCount);

      this.state.stats = {
        personal: personalCount,
        active: activeCount,
        total: allTeamSet.size
      };

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
      tableBody.innerHTML = '<tr><td colspan="8" class="no-data">Загрузка...</td></tr>';

      // Получаем партнёров на нужной глубине
      const referrals = await this.getPartnersAtDepth(address, depth);
    
      console.log(`📋 Found ${referrals.length} partners at depth ${depth}`);

      if (referrals.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="no-data">Партнеры не найдены</td></tr>';
        return;
      }

      // Получаем детали для каждого партнера (максимум 100 для производительности)
      const limitedReferrals = referrals.slice(0, 100);
      
      const partnersData = await Promise.all(
        limitedReferrals.map(refAddress => this.getPartnerDetails(refAddress))
      );
  
      // Обновляем таблицу
      tableBody.innerHTML = partnersData.map((partner, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${partner.id}</td>
          <td>${app.formatAddress(partner.address)}</td>
          <td>${partner.sponsorId}</td>
          <td>${partner.date}</td>
          <td>${partner.level}</td>
          <td>${partner.team}</td>
          <td><span class="badge badge-${partner.rank.toLowerCase().replace(' ', '-')}">${partner.rank}</span></td>
        </tr>
      `).join('');

      this.state.partners = partnersData;
      console.log(`✅ Loaded ${partnersData.length} partners for level ${depth}`);

    } catch (error) {
      console.error('❌ Error loading partners:', error);
      const tableBody = document.getElementById('partnersTable');
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="8" class="no-data">Ошибка загрузки</td></tr>';
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПОЛУЧИТЬ ПАРТНЁРОВ НА ОПРЕДЕЛЁННОЙ ГЛУБИНЕ
  // Использует MatrixRegistry.getDirectReferrals()
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
      
      // Для глубины > 1 - идём рекурсивно
      let currentLevel = [address];
      
      for (let depth = 1; depth <= targetDepth; depth++) {
        let nextLevel = [];
        
        for (const addr of currentLevel) {
          try {
            const refs = await this.contracts.matrixRegistry.getDirectReferrals(addr);
            const validRefs = refs.filter(r => r && r !== ethers.constants.AddressZero);
            nextLevel.push(...validRefs);
          } catch (e) {
            console.warn(`Error getting refs for ${addr}:`, e.message);
          }
        }
        
        console.log(`  Level ${depth}: ${nextLevel.length} partners`);
        
        if (depth === targetDepth) {
          return nextLevel;
        }
        
        currentLevel = nextLevel;
        
        // Если текущий уровень пустой, дальше искать нечего
        if (currentLevel.length === 0) {
          return [];
        }
      }
      
      return [];
      
    } catch (error) {
      console.error('❌ Error getting partners at depth:', error);
      return [];
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПОЛУЧИТЬ ДЕТАЛИ ПАРТНЁРА
  // ═══════════════════════════════════════════════════════════════
  async getPartnerDetails(address) {
    try {
      // 1. ID пользователя
      const userId = await this.contracts.matrixRegistry.getUserIdByAddress(address);
      const id = userId.toString() !== '0' ? `GW${userId.toString()}` : app.formatAddress(address);

      // 2. Спонсор из UserInfo
      let sponsorId = '-';
      try {
        const userInfo = await this.contracts.matrixRegistry.getUserInfo(address);
        const sponsorUserId = userInfo.sponsorId || userInfo[2];
        sponsorId = sponsorUserId.toString() !== '0' ? `GW${sponsorUserId.toString()}` : '-';
      } catch (e) {
        // Fallback через matrixNodes
        try {
          const node = await this.contracts.matrixRegistry.matrixNodes(userId);
          const sid = node[2].toString();
          sponsorId = sid !== '0' ? `GW${sid}` : '-';
        } catch (e2) {}
      }

      // 3. Максимальный уровень (пакеты)
      let maxLevel = 0;
      try {
        maxLevel = Number(await this.contracts.globalWay.getUserMaxLevel(address));
      } catch (e) {}

      // 4. Прямая команда (количество прямых рефералов)
      let team = 0;
      try {
        const refs = await this.contracts.matrixRegistry.getDirectReferrals(address);
        team = refs.filter(r => r && r !== ethers.constants.AddressZero).length;
      } catch (e) {}

      // 5. Ранг
      let rank = 'Никто';
      try {
        const rankInfo = await this.contracts.leaderPool.getUserRankInfo(address);
        rank = this.getRankName(Number(rankInfo.rank));
      } catch (e) {}

      // 6. Дата активации
      const date = await this.getActivationDate(address, userId);

      return {
        address,
        id,
        sponsorId,
        level: maxLevel,
        team,
        rank,
        date
      };
    } catch (error) {
      console.error('❌ Error getting partner details:', error);
      return {
        address,
        id: app.formatAddress(address),
        sponsorId: '-',
        level: 0,
        team: 0,
        rank: 'Никто',
        date: '-'
      };
    }
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
      0: 'Никто',
      1: 'Бронза 🥉',
      2: 'Серебро 🥈',
      3: 'Золото 🥇',
      4: 'Платина 💎'
    };
    return ranks[rankId] || 'Никто';
  },

  async refresh() {
    console.log('🔄 Refreshing partners data...');
    await this.loadAllData();
  }
};

window.partnersModule = partnersModule;
