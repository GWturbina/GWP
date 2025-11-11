// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Partners Module
// Партнерская структура: 12 уровней глубины, статистика, квалификация
// ═══════════════════════════════════════════════════════════════════

const partnersModule = {
  // Контракты
  contracts: {},
  
  // Состояние
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
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  async init() {
    console.log('👥 Initializing Partners...');
    
    try {
      if (!app.state.userAddress) {
        app.showNotification('Подключите кошелек', 'error');
        return;
      }

      // Загружаем контракты
      await this.loadContracts();

      // Создаем кнопки уровней
      this.createLevelButtons();

      // Загружаем данные
      await this.loadAllData();

      // Инициализируем UI
      this.initUI();

      console.log('✅ Partners loaded');
    } catch (error) {
      console.error('❌ Partners init error:', error);
      app.showNotification('Ошибка загрузки партнеров', 'error');
    }
  },

  // Загрузка контрактов
  async loadContracts() {
    this.contracts.globalWay = await app.getContract('GlobalWay');
    this.contracts.helper = await app.getContract('GlobalWayHelper');
    this.contracts.marketing = await app.getContract('GlobalWayMarketing');
    this.contracts.stats = await app.getContract('GlobalWayStats');
    this.contracts.leaderPool = await app.getContract('GlobalWayLeaderPool');
  },

  // ═══════════════════════════════════════════════════════════════
  // ЗАГРУЗКА ДАННЫХ
  // ═══════════════════════════════════════════════════════════════
  async loadAllData() {
    await Promise.all([
      this.loadTeamStats(),
      this.loadQualification(),
      this.loadEarnings(),
      this.loadPartnersByLevel(this.state.currentLevel)
    ]);
  },

  // Статистика команды
  async loadTeamStats() {
    try {
      const address = app.state.userAddress;
      
      // ПРАВИЛЬНО: Используем callStatic для view функций
      const result = await this.contracts.stats.callStatic.getUserStructureStats(address);
      
      // result[0] = directReferrals count
      // result[1] = all referrals array
      // result[2] = activeLevels
      // result[3] = levelStatus array

      this.state.stats = {
        personal: Number(result[0]),
        active: Number(result[2]),
        total: result[1] ? result[1].length : 0
      };

      this.updateStatsUI();
    } catch (error) {
      console.error('Error loading team stats:', error);
      this.state.stats = { personal: 0, active: 0, total: 0 };
    }
  },

  // Квалификация
  async loadQualification() {
    try {
      const address = app.state.userAddress;
      const [rankQualified, progress] = 
        await this.contracts.helper.getUserQualificationStatus(address);

      this.state.qualification = {
        bronze: { 
          achieved: rankQualified[0], 
          progress: Number(progress[0]) 
        },
        silver: { 
          achieved: rankQualified[1], 
          progress: Number(progress[1]) 
        },
        gold: { 
          achieved: rankQualified[2], 
          progress: Number(progress[2]) 
        },
        platinum: { 
          achieved: rankQualified[3], 
          progress: Number(progress[3]) 
        }
      };

      this.updateQualificationUI();
    } catch (error) {
      console.error('Error loading qualification:', error);
    }
  },

  // Доходы
  async loadEarnings() {
    try {
      const address = app.state.userAddress;

      // Получаем события бонусов
      const directBonus = 0; // TODO: Fix filters
      const partnerBonus = 0; // TODO: Fix filters
      const matrixBonus = 0; // TODO: Fix filters
      const leadershipBonus = 0; // TODO: Fix filters

      this.state.earnings = {
        direct: directBonus,
        partner: partnerBonus,
        matrix: matrixBonus,
        leadership: leadershipBonus,
        total: (
          parseFloat(directBonus) + 
          parseFloat(partnerBonus) + 
          parseFloat(matrixBonus) + 
          parseFloat(leadershipBonus)
        ).toFixed(4)
      };

      this.updateEarningsUI();
    } catch (error) {
      console.error('Error loading earnings:', error);
    }
  },

  // Партнеры по уровню
  async loadPartnersByLevel(depth) {
    try {
      const address = app.state.userAddress;
      const tableBody = document.getElementById('partnersTable');
      
      if (!tableBody) return;

      tableBody.innerHTML = '<tr><td colspan="8" class="no-data">Загрузка...</td></tr>';

      // Получаем партнеров на указанной глубине
      const referrals = await this.contracts.helper.getReferralsByDepth(address, depth);

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

    } catch (error) {
      console.error('Error loading partners:', error);
      const tableBody = document.getElementById('partnersTable');
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="8" class="no-data">Ошибка загрузки</td></tr>';
      }
    }
  },

  // Получить детали партнера
  async getPartnerDetails(address) {
    try {
      // ID
      const userID = await this.contracts.helper.getUserID(address);
      const id = userID !== '' ? `GW${userID}` : app.formatAddress(address);

      // Спонсор
      const sponsor = await this.contracts.globalWay.getUserSponsor(address);
      const sponsorID = await this.contracts.helper.getUserID(sponsor);
      const sponsorId = sponsorID !== '' ? `GW${sponsorID}` : app.formatAddress(sponsor);

      // ✅ ИСПРАВЛЕНО: Уровень с проверкой Founder статуса
      let maxLevel = 0;
      
      // Сначала проверяем isFounder
      const isFounder = await this.contracts.helper.isFounder(address);
      
      if (isFounder) {
        // Founders должны иметь 12
        maxLevel = 12;
        console.log(`✅ Founder detected: ${address}, setting maxLevel = 12`);
      } else {
        // Обычный getUserMaxLevel
        maxLevel = Number(await this.contracts.globalWay.getUserMaxLevel(address));
      }
      
      // Если все еще 0 - проверяем альтернативными способами
      if (maxLevel === 0) {
        const isRegistered = await this.contracts.globalWay.isUserRegistered(address);
        if (!isRegistered) {
          console.warn(`❌ User not registered: ${address}`);
        } else {
          console.warn(`⚠️ Registered but maxLevel = 0: ${address}`);
        }
      }

      // Прямая команда
      const referrals = await this.contracts.globalWay.getUserReferrals(address);
      const team = referrals.length;

      // ✅ ИСПРАВЛЕНО: Ранг с проверкой Founder
      let rank = 'Никто';
      if (isFounder) {
        rank = 'Платина ⭐';
      } else {
        const [rankQualified] = await this.contracts.helper.getUserQualificationStatus(address);
        rank = this.getRankName(rankQualified);
      }

      // Дата активации (первая покупка)
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
      console.error('Address:', address);
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

  // ═══════════════════════════════════════════════════════════════
  // РАСЧЕТ ДОХОДОВ
  // ═══════════════════════════════════════════════════════════════
  
  // Прямой бонус (10%)
  async calculateDirectBonus(address) {
    try {
      const filter = this.contracts.marketing.filters.ReferralBonusPaid(null, address);
      const events = await this.contracts.marketing.queryFilter(filter, -100000);

      let total = 0n;
      for (const event of events) {
        // Проверяем что это прямой бонус (от direct referral)
        const from = event.args.from;
        const sponsor = await this.contracts.globalWay.getUserSponsor(from);
        
        if (sponsor.toLowerCase() === address.toLowerCase()) {
          total += event.args.amount;
        }
      }

      return ethers.utils.formatEther(total);
    } catch (error) {
      console.error('Error calculating direct bonus:', error);
      return '0';
    }
  },

  // Партнерский бонус (2% × 12 уровней)
  async calculatePartnerBonus(address) {
    try {
      const filter = this.contracts.marketing.filters.ReferralBonusPaid(null, address);
      const events = await this.contracts.marketing.queryFilter(filter, -100000);

      let total = 0n;
      for (const event of events) {
        // Все бонусы кроме прямых
        const from = event.args.from;
        const sponsor = await this.contracts.globalWay.getUserSponsor(from);
        
        if (sponsor.toLowerCase() !== address.toLowerCase()) {
          total += event.args.amount;
        }
      }

      return ethers.utils.formatEther(total);
    } catch (error) {
      console.error('Error calculating partner bonus:', error);
      return '0';
    }
  },

  // Матричный бонус (48%)
  async calculateMatrixBonus(address) {
    try {
      const filter = this.contracts.marketing.filters.MatrixBonusPaid(null, address);
      const events = await this.contracts.marketing.queryFilter(filter, -100000);

      let total = 0n;
      for (const event of events) {
        total += event.args.amount;
      }

      return ethers.utils.formatEther(total);
    } catch (error) {
      console.error('Error calculating matrix bonus:', error);
      return '0';
    }
  },

  // Лидерский бонус
  async calculateLeadershipBonus(address) {
    try {
      const filter = this.contracts.leaderPool.filters.RewardDistributed(address);
      const events = await this.contracts.leaderPool.queryFilter(filter, -100000);

      let total = 0n;
      for (const event of events) {
        total += event.args.amount;
      }

      return ethers.utils.formatEther(total);
    } catch (error) {
      console.error('Error calculating leadership bonus:', error);
      return '0';
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ОБНОВЛЕНИЕ UI
  // ═══════════════════════════════════════════════════════════════
  
  updateStatsUI() {
    const { personal, active, total } = this.state.stats;

    document.getElementById('personalInvites').textContent = personal;
    document.getElementById('activePartners').textContent = active;
    document.getElementById('totalTeam').textContent = total;
  },

  updateQualificationUI() {
    const ranks = ['bronze', 'silver', 'gold', 'platinum'];
    
    ranks.forEach(rank => {
      const badge = document.getElementById(`${rank}Qual`);
      const qual = this.state.qualification[rank];
      
      if (badge) {
        if (qual.achieved) {
          badge.classList.add('achieved');
          badge.querySelector('.progress').style.width = '100%';
        } else {
          badge.classList.remove('achieved');
          badge.querySelector('.progress').style.width = `${qual.progress}%`;
        }
      }
    });
  },

  updateEarningsUI() {
    const { direct, partner, matrix, leadership, total } = this.state.earnings;

    document.getElementById('directBonus').textContent = `${app.formatNumber(direct)} BNB`;
    document.getElementById('partnerBonus').textContent = `${app.formatNumber(partner)} BNB`;
    document.getElementById('matrixBonus').textContent = `${app.formatNumber(matrix)} BNB`;
    document.getElementById('leadershipBonus').textContent = `${app.formatNumber(leadership)} BNB`;
    document.getElementById('totalEarned').textContent = `${app.formatNumber(total)} BNB`;
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
  },

  async selectLevel(level) {
    // Обновляем активную кнопку
    document.querySelectorAll('#partnerLevels .level-btn').forEach((btn, index) => {
      btn.classList.toggle('active', index + 1 === level);
    });

    this.state.currentLevel = level;

    // Обновляем информацию об уровне
    document.getElementById('currentLevelNum').textContent = level;
    document.getElementById('currentLevelCost').textContent = `${CONFIG.LEVEL_PRICES[level - 1]} BNB`;

    // Загружаем партнеров
    await this.loadPartnersByLevel(level);
  },

  initUI() {
    // Уже инициализировано через createLevelButtons
  },

  // ═══════════════════════════════════════════════════════════════
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ═══════════════════════════════════════════════════════════════
  
  getRankName(rankQualified) {
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
window.partnersModule = partnersModule;
