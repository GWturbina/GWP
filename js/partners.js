// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Partners Module
// Партнерская структура: 12 уровней глубины, статистика, квалификация
// ПОЛНОСТЬЮ ПЕРЕПИСАН под новые контракты
// Date: 2025-01-19
// ═══════════════════════════════════════════════════════════════════

const partnersModule = {
  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  contracts: {},
  
  state: {
    currentLevel: 1,
    partners: [],
    stats: {
      personal: 0,
      active: 0,
      total: 0
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
  // СТАТИСТИКА КОМАНДЫ
  // ═══════════════════════════════════════════════════════════════
  async loadTeamStats() {
    try {
      const address = app.state.userAddress;
      console.log('📊 Loading team stats...');
      
      // ✅ ИСПРАВЛЕНО: getUserStructureStats возвращает (directReferrals, activeLevels, levelStatus[12])
      const result = await this.contracts.stats.getUserStructureStats(address);
      
      // result[0] = directReferrals (uint256)
      // result[1] = activeLevels (uint256)  
      // result[2] = levelStatus (bool[12])
      
      const directReferrals = Number(result[0]);
      const activeLevels = Number(result[1]);
      
      // Подсчитываем общее количество в структуре через GlobalWay
      let totalInStructure = directReferrals;
      try {
        const allReferrals = await this.contracts.globalWay.getUserReferrals(address);
        totalInStructure = allReferrals.length;
      } catch (e) {
        console.warn('⚠️ Could not get total referrals:', e);
      }

      this.state.stats = {
        personal: directReferrals,
        active: activeLevels,
        total: totalInStructure
      };

      console.log('✅ Team stats loaded:', this.state.stats);
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

      // Получаем текущий ранг из LeaderPool
      const rankInfo = await this.contracts.leaderPool.getUserRankInfo(address);
      const rankNum = Number(rankInfo.rank);

      // Устанавливаем достижения на основе ранга
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

      console.log('✅ Qualification loaded:', this.state.qualification);
      this.updateQualificationUI();
      
    } catch (error) {
      console.error('❌ Error loading qualification:', error);
      this.state.qualification = {
        bronze: { achieved: false, progress: 0 },
        silver: { achieved: false, progress: 0 },
        gold: { achieved: false, progress: 0 },
        platinum: { achieved: false, progress: 0 }
      };
      this.updateQualificationUI();
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ДОХОДЫ
  // ═══════════════════════════════════════════════════════════════
  async loadEarnings() {
    try {
      const address = app.state.userAddress;
      console.log('💰 Loading earnings...');

      // ✅ ИСПОЛЬЗУЕМ GlobalWayStats.getUserBalances()
      try {
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
      const address = app.state.userAddress;
      
      // Стоимость уровня
      const cost = CONFIG.LEVEL_PRICES[level - 1];
      
      // Всего заработано на этом уровне (можно взять из событий)
      let earned = '0';
      try {
        // Можно получить из PartnerProgram события для этого уровня
        // Пока используем общую статистику
        earned = this.state.earnings.total;
      } catch (e) {
        console.warn('⚠️ Could not get level earnings:', e);
      }

      this.state.levelInfo = {
        level,
        cost,
        earned
      };

      this.updateLevelInfoUI();
      
    } catch (error) {
      console.error('❌ Error loading level info:', error);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПАРТНЕРЫ ПО УРОВНЮ ГЛУБИНЫ
  // ═══════════════════════════════════════════════════════════════
  async loadPartnersByLevel(depth) {
    try {
      const address = app.state.userAddress;
      const tableBody = document.getElementById('partnersTable');
    
      if (!tableBody) return;

      console.log(`📋 Loading partners for depth ${depth}...`);
      tableBody.innerHTML = '<tr><td colspan="8" class="no-data">Загрузка...</td></tr>';

      // Получаем партнёров на нужной глубине
      let referrals = await this.getPartnersAtDepth(address, depth);
    
      // Ограничиваем для производительности
      referrals = referrals.slice(0, 50);

      if (referrals.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="no-data">Партнеры не найдены</td></tr>';
        return;
      }

      // Получаем детали для каждого партнера
      const partnersData = await Promise.all(
        referrals.map(refAddress => this.getPartnerDetails(refAddress))
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
          <td><span class="badge badge-${partner.rank.toLowerCase()}">${partner.rank}</span></td>
        </tr>
      `).join('');

      this.state.partners = partnersData;
      console.log(`✅ Loaded ${partnersData.length} partners`);

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
  // ═══════════════════════════════════════════════════════════════
  async getPartnersAtDepth(address, targetDepth, currentDepth = 1) {
    try {
      console.log(`🔍 getPartnersAtDepth: addr=${address.slice(0,10)}..., target=${targetDepth}, current=${currentDepth}`);
      
      const directRefs = await this.getDirectReferrals(address);
      console.log(`  📦 Найдено рефералов: ${directRefs.length}`);
      
      if (currentDepth === targetDepth) {
        console.log(`  ✅ Достигли глубины ${targetDepth}, возвращаем ${directRefs.length} рефералов`);
        return directRefs;
      }
    
      // Ещё не достигли — идём глубже
      let result = [];
      for (let ref of directRefs) {
        const subRefs = await this.getPartnersAtDepth(ref, targetDepth, currentDepth + 1);
        result.push(...subRefs);
      }
    
      console.log(`  📊 Итого на глубине ${targetDepth}: ${result.length}`);
      return result;
    } catch (error) {
      console.error('❌ Error getting partners at depth:', error);
      return [];
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПОЛУЧИТЬ ПРЯМЫХ РЕФЕРАЛОВ
  // ═══════════════════════════════════════════════════════════════
  async getDirectReferrals(address) {
    try {
      console.log(`  🔗 getDirectReferrals для ${address.slice(0,10)}...`);
      const referrals = await this.contracts.globalWay.getDirectReferrals(address);
      console.log(`  🔗 Результат: ${referrals.length} рефералов`, referrals);
      return referrals;
    } catch (error) {
      console.error('❌ Error getting direct referrals:', error);
      return [];
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ПОЛУЧИТЬ ДЕТАЛИ ПАРТНЕРА
  // ═══════════════════════════════════════════════════════════════
  async getPartnerDetails(address) {
    try {
      // 1. ID пользователя
      const userId = await this.contracts.matrixRegistry.getUserIdByAddress(address);
      const id = userId.toString() !== '0' ? `GW${userId.toString()}` : app.formatAddress(address);

      // 2. Спонсор
      let sponsorId = '-';
      try {
        const userInfo = await this.contracts.matrixRegistry.getUserInfo(address);
        const sponsorUserId = userInfo.sponsorId;
        sponsorId = sponsorUserId.toString() !== '0' ? `GW${sponsorUserId.toString()}` : '-';
      } catch (e) {
        console.warn('⚠️ Could not get sponsor:', e);
      }

      // 3. Максимальный уровень
      let maxLevel = 0;
      try {
        maxLevel = Number(await this.contracts.globalWay.getUserMaxLevel(address));
      } catch (e) {
        console.warn('⚠️ Could not get max level:', e);
      }

      // 4. Прямая команда (считаем рефералов)
      let team = 0;
      try {
        const result = await this.contracts.stats.getUserStructureStats(address);
        team = Number(result[0]); // directReferrals
      } catch (e) {
        console.warn('⚠️ Could not get team count:', e);
      }

      // 5. Ранг
      let rank = 'Никто';
      try {
        const rankInfo = await this.contracts.leaderPool.getUserRankInfo(address);
        rank = this.getRankName(Number(rankInfo.rank));
      } catch (e) {
        console.warn('⚠️ Could not get rank:', e);
      }

      // 6. Дата активации
      const date = await this.getActivationDate(address);

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
  async getActivationDate(address) {
    try {
      // Используем событие LevelActivated (или LevelPurchased)
      const filter = this.contracts.globalWay.filters.LevelActivated(address, 1);
      const events = await this.contracts.globalWay.queryFilter(filter, -100000);
      
      if (events.length > 0) {
        const block = await events[0].getBlock();
        return new Date(block.timestamp * 1000).toLocaleDateString('ru-RU');
      }
      
      // Альтернативно - из MatrixRegistry
      const regFilter = this.contracts.matrixRegistry.filters.UserRegistered(address);
      const regEvents = await this.contracts.matrixRegistry.queryFilter(regFilter, -100000);
      
      if (regEvents.length > 0) {
        const block = await regEvents[0].getBlock();
        return new Date(block.timestamp * 1000).toLocaleDateString('ru-RU');
      }
      
      return '-';
    } catch (error) {
      console.warn('⚠️ Could not get activation date:', error);
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
        if (progressBar) {
          progressBar.style.width = '100%';
        }
      } else {
        badge.classList.remove('achieved');
        const progressBar = badge.querySelector('.progress');
        if (progressBar) {
          progressBar.style.width = `${qual.progress}%`;
        }
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
    const costEl = document.getElementById('currentLevelCost');
    const earnedEl = document.getElementById('currentLevelEarned');

    if (levelEl) levelEl.textContent = level;
    if (costEl) costEl.textContent = `${cost} BNB`;
    if (earnedEl) earnedEl.textContent = `${earned} BNB`;
  },

  // ═══════════════════════════════════════════════════════════════
  // UI ЭЛЕМЕНТЫ
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
    
    // Обновляем активную кнопку
    document.querySelectorAll('#partnerLevels .level-btn').forEach((btn, index) => {
      btn.classList.toggle('active', index + 1 === level);
    });

    this.state.currentLevel = level;

    // Обновляем информацию об уровне
    await this.loadLevelInfo(level);

    // Загружаем партнеров этого уровня
    await this.loadPartnersByLevel(level);
  },

  initUI() {
    console.log('🎨 Initializing Partners UI...');
    // Обработчики уже созданы через createLevelButtons
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

  // Обновление данных
  async refresh() {
    console.log('🔄 Refreshing partners data...');
    await this.loadAllData();
  }
};

// Экспорт в window
window.partnersModule = partnersModule;
