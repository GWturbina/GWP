/* jshint esversion: 8 */
/* global CONFIG, web3Manager, ethers */

/**
 * GlobalWay Contracts Manager
 * ПОЛНОСТЬЮ ПЕРЕПИСАНО НА ОСНОВЕ РЕАЛЬНЫХ ABI
 * Версия: 3.0
 * Дата: 01.11.2025
 */

class ContractsManager {
  constructor() {
    this.contracts = {};
    this.initialized = false;
  }

  /**
   * Инициализация всех 10 контрактов
   */
  async init() {
    if (!web3Manager.connected) {
      throw new Error('Wallet not connected');
    }

    console.log('📄 Initializing contracts...');

    try {
      // Загрузить все ABI
      const response = await fetch('./contracts/contracts-full-compact.json');
      if (!response.ok) {
        throw new Error('Failed to load contracts');
      }
      
      const data = await response.json();
      const abis = data.contracts || data;

      // Инициализация GWTToken
      this.contracts.gwtToken = new ethers.Contract(
        CONFIG.CONTRACTS.GWTToken,
        abis.GWTToken?.abi || abis.GWTToken,
        web3Manager.signer
      );

      // Инициализация GlobalWay (MAIN)
      this.contracts.globalWay = new ethers.Contract(
        CONFIG.CONTRACTS.GlobalWay,
        abis.GlobalWay?.abi || abis.GlobalWay,
        web3Manager.signer
      );

      // Инициализация Marketing
      this.contracts.marketing = new ethers.Contract(
        CONFIG.CONTRACTS.Marketing,
        abis.GlobalWayMarketing?.abi || abis.Marketing,
        web3Manager.signer
      );

      // Инициализация LeaderPool
      this.contracts.leaderPool = new ethers.Contract(
        CONFIG.CONTRACTS.LeaderPool,
        abis.GlobalWayLeaderPool?.abi || abis.LeaderPool,
        web3Manager.signer
      );

      // Инициализация Investment
      this.contracts.investment = new ethers.Contract(
        CONFIG.CONTRACTS.Investment,
        abis.GlobalWayInvestment?.abi || abis.Investment,
        web3Manager.signer
      );

      // Инициализация Quarterly
      this.contracts.quarterly = new ethers.Contract(
        CONFIG.CONTRACTS.Quarterly,
        abis.GlobalWayQuarterly?.abi || abis.Quarterly,
        web3Manager.signer
      );

      // Инициализация TechAccounts
      this.contracts.techAccounts = new ethers.Contract(
        CONFIG.CONTRACTS.TechAccounts,
        abis.GlobalWayTechAccounts?.abi || abis.TechAccounts,
        web3Manager.signer
      );

      // Инициализация Bridge
      this.contracts.bridge = new ethers.Contract(
        CONFIG.CONTRACTS.Bridge,
        abis.GlobalWayBridge?.abi || abis.Bridge,
        web3Manager.signer
      );

      // Инициализация Stats
      this.contracts.stats = new ethers.Contract(
        CONFIG.CONTRACTS.Stats,
        abis.GlobalWayStats?.abi || abis.Stats,
        web3Manager.signer
      );

      // Инициализация Governance
      this.contracts.governance = new ethers.Contract(
        CONFIG.CONTRACTS.Governance,
        abis.GlobalWayGovernance?.abi || abis.Governance,
        web3Manager.signer
      );

      this.initialized = true;
      console.log('✅ All 10 contracts initialized');

    } catch (error) {
      console.error('❌ Contracts initialization failed:', error);
      throw error;
    }
  }

  // ==========================================
  // GLOBALWAY - Основной контракт
  // ==========================================

  /**
   * Получить информацию о пользователе
   * ABI: users(address) view returns (UserInfo)
   */
  async getUserInfo(address) {
    try {
      const user = await this.contracts.globalWay.users(address);
      
      return {
        id: user.id || '',
        sponsorId: user.sponsorId || '',
        refAddress: user.refAddress || ethers.constants.AddressZero,
        registrationTime: user.registrationTime ? user.registrationTime.toNumber() : 0,
        rankLevel: Number(user.rankLevel) || 0,
        activeLevel: Number(user.activeLevel) || 0,
        partnersCount: Number(user.partnersCount) || 0,
        isActive: Boolean(user.isActive),
        isBlocked: Boolean(user.isBlocked),
        isCharity: Boolean(user.isCharity),
        isTechnical: Boolean(user.isTechnical)
      };
    } catch (error) {
      console.error('getUserInfo error:', error);
      return {
        id: '',
        sponsorId: '',
        refAddress: ethers.constants.AddressZero,
        registrationTime: 0,
        rankLevel: 0,
        activeLevel: 0,
        partnersCount: 0,
        isActive: false,
        isBlocked: false,
        isCharity: false,
        isTechnical: false
      };
    }
  }

  /**
   * Проверка регистрации пользователя
   */
  async isUserRegistered(address) {
    try {
      const userInfo = await this.getUserInfo(address);
      return userInfo.id !== '' && userInfo.registrationTime > 0;
    } catch (error) {
      console.error('isUserRegistered error:', error);
      return false;
    }
  }

  /**
   * Проверка активности уровня
   * ABI: isLevelActive(address user, uint8 level) view returns (bool)
   */
  async isLevelActive(address, level) {
    try {
      return await this.contracts.globalWay.isLevelActive(address, level);
    } catch (error) {
      console.error('isLevelActive error:', error);
      return false;
    }
  }

  /**
   * Регистрация нового пользователя
   * ABI: register(address referrer) payable
   */
  async register(refAddress) {
    try {
      const price = ethers.utils.parseEther(CONFIG.LEVEL_PRICES[0]);
      
      console.log('📝 Registering user with referrer:', refAddress);
      console.log('💰 Payment:', CONFIG.LEVEL_PRICES[0], 'BNB');
      
      const tx = await this.contracts.globalWay.register(refAddress, {
        value: price,
        gasLimit: CONFIG.GAS_LIMITS.register || 500000
      });
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Registration successful');
      
      return receipt;
    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw error;
    }
  }

  /**
   * Активация уровня (покупка)
   * ABI: activateLevel(uint8 level) payable
   */
  async buyLevel(level) {
    try {
      const price = ethers.utils.parseEther(CONFIG.LEVEL_PRICES[level - 1]);
      
      console.log(`💰 Buying Level ${level} for ${CONFIG.LEVEL_PRICES[level - 1]} BNB`);
      
      const tx = await this.contracts.globalWay.activateLevel(level, {
        value: price,
        gasLimit: CONFIG.GAS_LIMITS.buyLevel || 600000
      });
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Level activated');
      
      return receipt;
    } catch (error) {
      console.error('❌ buyLevel failed:', error);
      throw error;
    }
  }

  /**
   * Пакетная активация уровней
   * ABI: activateBulkLevels(uint8 maxLevel) payable
   */
  async buyBulkLevels(upToLevel) {
    try {
      // Рассчитать общую стоимость
      let totalCost = 0;
      for (let i = 0; i < upToLevel; i++) {
        totalCost += parseFloat(CONFIG.LEVEL_PRICES[i]);
      }
      
      const price = ethers.utils.parseEther(totalCost.toFixed(4));
      
      console.log(`💰 Buying Levels 1-${upToLevel} for ${totalCost.toFixed(4)} BNB`);
      
      const tx = await this.contracts.globalWay.activateBulkLevels(upToLevel, {
        value: price,
        gasLimit: CONFIG.GAS_LIMITS.buyBulkLevels || 1000000
      });
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Bulk levels activated');
      
      return receipt;
    } catch (error) {
      console.error('❌ buyBulkLevels failed:', error);
      throw error;
    }
  }

  /**
   * Получить адрес по User ID
   * ABI: idToAddress(string userId) view returns (address)
   */
  async getAddressByUserId(userId) {
    try {
      return await this.contracts.globalWay.idToAddress(userId);
    } catch (error) {
      console.error('getAddressByUserId error:', error);
      return ethers.constants.AddressZero;
    }
  }

  // ==========================================
  // MARKETING - Реферальные и матричные выплаты
  // ==========================================

  /**
   * Получить балансы пользователя
   * ABI: getUserBalances(address user) view returns (uint256 referral, uint256 matrix, uint256 total)
   */
  async getUserBalances(address) {
    try {
      const balances = await this.contracts.marketing.getUserBalances(address);
      
      return {
        referralBalance: balances.referralBalance || balances[0],
        matrixBalance: balances.matrixBalance || balances[1],
        totalBalance: balances.totalBalance || balances[2]
      };
    } catch (error) {
      console.error('getUserBalances error:', error);
      return {
        referralBalance: ethers.BigNumber.from(0),
        matrixBalance: ethers.BigNumber.from(0),
        totalBalance: ethers.BigNumber.from(0)
      };
    }
  }

  /**
   * Вывод реферальных средств
   * ABI: withdrawReferral()
   */
  async withdrawReferral() {
    try {
      const tx = await this.contracts.marketing.withdrawReferral({
        gasLimit: CONFIG.GAS_LIMITS.withdraw || 300000
      });
      
      const receipt = await tx.wait();
      console.log('✅ Referral withdrawal successful');
      return receipt;
    } catch (error) {
      console.error('withdrawReferral error:', error);
      throw error;
    }
  }

  /**
   * Вывод матричных средств
   * ABI: withdrawMatrix()
   */
  async withdrawMatrix() {
    try {
      const tx = await this.contracts.marketing.withdrawMatrix({
        gasLimit: CONFIG.GAS_LIMITS.withdraw || 300000
      });
      
      const receipt = await tx.wait();
      console.log('✅ Matrix withdrawal successful');
      return receipt;
    } catch (error) {
      console.error('withdrawMatrix error:', error);
      throw error;
    }
  }

  /**
   * Вывод ВСЕХ средств из Marketing (referral + matrix)
   */
  async withdrawMarketing() {
    try {
      // Вызываем обе функции последовательно
      await this.withdrawReferral();
      await this.withdrawMatrix();
      
      console.log('✅ Marketing withdrawal complete');
      return { success: true };
    } catch (error) {
      console.error('withdrawMarketing error:', error);
      throw error;
    }
  }

  // ==========================================
  // LEADERPOOL - Лидерские бонусы
  // ==========================================

  /**
   * Получить информацию о ранге
   * ABI: getUserRankInfo(address user) view returns (RankInfo)
   */
  async getUserRankInfo(address) {
    try {
      const rankInfo = await this.contracts.leaderPool.getUserRankInfo(address);
      
      return {
        currentRank: Number(rankInfo.currentRank) || 0,
        rankBalance: rankInfo.rankBalance || ethers.BigNumber.from(0),
        totalEarned: rankInfo.totalEarned || ethers.BigNumber.from(0),
        qualifiedPartners: Number(rankInfo.qualifiedPartners) || 0,
        teamVolume: rankInfo.teamVolume || ethers.BigNumber.from(0)
      };
    } catch (error) {
      console.error('getUserRankInfo error:', error);
      return {
        currentRank: 0,
        rankBalance: ethers.BigNumber.from(0),
        totalEarned: ethers.BigNumber.from(0),
        qualifiedPartners: 0,
        teamVolume: ethers.BigNumber.from(0)
      };
    }
  }

  /**
   * Вывод лидерских бонусов
   * ABI: claimRankBonus()
   */
  async withdrawLeaderPool() {
    try {
      const tx = await this.contracts.leaderPool.claimRankBonus({
        gasLimit: CONFIG.GAS_LIMITS.withdraw || 300000
      });
      
      const receipt = await tx.wait();
      console.log('✅ Leader Pool withdrawal successful');
      return receipt;
    } catch (error) {
      console.error('withdrawLeaderPool error:', error);
      throw error;
    }
  }

  // ==========================================
  // INVESTMENT - Инвестиционный пул
  // ==========================================

  /**
   * Получить информацию об инвесторе
   * ABI: getInvestorInfo(address user) view returns (InvestorInfo)
   */
  async getInvestorInfo(address) {
    try {
      const info = await this.contracts.investment.getInvestorInfo(address);
      
      return {
        totalInvested: info.totalInvested || ethers.BigNumber.from(0),
        pendingRewards: info.pendingRewards || ethers.BigNumber.from(0),
        claimedRewards: info.claimedRewards || ethers.BigNumber.from(0),
        lastClaimTime: info.lastClaimTime ? info.lastClaimTime.toNumber() : 0
      };
    } catch (error) {
      console.error('getInvestorInfo error:', error);
      return {
        totalInvested: ethers.BigNumber.from(0),
        pendingRewards: ethers.BigNumber.from(0),
        claimedRewards: ethers.BigNumber.from(0),
        lastClaimTime: 0
      };
    }
  }

  /**
   * ПРИМЕЧАНИЕ: claimWeeklyReward() НЕ СУЩЕСТВУЕТ в ABI
   * Используем pendingRewards из getInvestorInfo
   * Реальная функция вывода - это распределение админом через distributeWeeklyRewards()
   */
  async withdrawInvestment() {
    try {
      console.warn('⚠️  Investment withdrawal is automatic via admin distributeWeeklyRewards()');
      // Показываем только информацию
      const info = await this.getInvestorInfo(web3Manager.address);
      return info;
    } catch (error) {
      console.error('withdrawInvestment error:', error);
      throw error;
    }
  }

  // ==========================================
  // QUARTERLY - Квартальная активность
  // ==========================================

  /**
   * Получить информацию о квартальной активности
   * ABI: getUserQuarterlyInfo(address user) view returns (QuarterlyInfo)
   */
  async getQuarterlyInfo(address) {
    try {
      const info = await this.contracts.quarterly.getUserQuarterlyInfo(address);
      
      return {
        lastPaymentTime: info.lastPaymentTime ? info.lastPaymentTime.toNumber() : 0,
        nextPaymentDue: info.nextPaymentDue ? info.nextPaymentDue.toNumber() : 0,
        currentQuarter: Number(info.currentQuarter) || 0,
        isPaid: Boolean(info.isPaid),
        totalPaid: Number(info.totalPaid) || 0,
        charityAccount: info.charityAccount || ethers.constants.AddressZero,
        techAccount1: info.techAccount1 || ethers.constants.AddressZero,
        techAccount2: info.techAccount2 || ethers.constants.AddressZero
      };
    } catch (error) {
      console.error('getQuarterlyInfo error:', error);
      return {
        lastPaymentTime: 0,
        nextPaymentDue: 0,
        currentQuarter: 0,
        isPaid: false,
        totalPaid: 0,
        charityAccount: ethers.constants.AddressZero,
        techAccount1: ethers.constants.AddressZero,
        techAccount2: ethers.constants.AddressZero
      };
    }
  }

  /**
   * Оплата квартальной активности
   * ABI: payQuarterlyActivity() payable
   */
  async payQuarterly() {
    try {
      const fee = ethers.utils.parseEther('0.075');
      
      console.log('💰 Paying quarterly activity: 0.075 BNB');
      
      const tx = await this.contracts.quarterly.payQuarterlyActivity({
        value: fee,
        gasLimit: CONFIG.GAS_LIMITS.payQuarterly || 500000
      });
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Quarterly payment successful');
      
      return receipt;
    } catch (error) {
      console.error('❌ payQuarterly failed:', error);
      throw error;
    }
  }

  // ==========================================
  // GWTTOKEN - Токен
  // ==========================================

  /**
   * Получить баланс токенов
   * ABI: balanceOf(address account) view returns (uint256)
   */
  async getTokenBalance(address) {
    try {
      return await this.contracts.gwtToken.balanceOf(address);
    } catch (error) {
      console.error('getTokenBalance error:', error);
      return ethers.BigNumber.from(0);
    }
  }

  /**
   * Получить цену токена
   * ABI: currentPrice() view returns (uint256)
   */
  async getTokenPrice() {
    try {
      return await this.contracts.gwtToken.currentPrice();
    } catch (error) {
      console.error('getTokenPrice error:', error);
      return ethers.BigNumber.from(0);
    }
  }

  /**
   * Купить токены
   * ABI: buyTokens(uint256 amount) payable
   */
  async buyTokens(amount) {
    try {
      const price = await this.getTokenPrice();
      const cost = price.mul(amount);
      
      const tx = await this.contracts.gwtToken.buyTokens(amount, {
        value: cost,
        gasLimit: CONFIG.GAS_LIMITS.buyTokens || 400000
      });
      
      const receipt = await tx.wait();
      console.log('✅ Tokens purchased');
      return receipt;
    } catch (error) {
      console.error('buyTokens error:', error);
      throw error;
    }
  }

  /**
   * Продать токены
   * ABI: sellTokens(uint256 amount)
   */
  async sellTokens(amount) {
    try {
      const tx = await this.contracts.gwtToken.sellTokens(amount, {
        gasLimit: CONFIG.GAS_LIMITS.sellTokens || 400000
      });
      
      const receipt = await tx.wait();
      console.log('✅ Tokens sold');
      return receipt;
    } catch (error) {
      console.error('sellTokens error:', error);
      throw error;
    }
  }

  // ==========================================
  // STATS - Статистика
  // ==========================================

  /**
   * Получить полную статистику пользователя
   * ABI: getUserFullStats(address user) view returns (UserFullStats)
   */
  async getUserFullStats(address) {
    try {
      return await this.contracts.stats.getUserFullStats(address);
    } catch (error) {
      console.error('getUserFullStats error:', error);
      return null;
    }
  }

  /**
   * Получить структуру команды
   * ABI: getUserStructureStats(address user) view returns (StructureStats)
   */
  async getUserStructureStats(address) {
    try {
      return await this.contracts.stats.getUserStructureStats(address);
    } catch (error) {
      console.error('getUserStructureStats error:', error);
      return null;
    }
  }

  /**
   * Получить глобальную статистику
   * ABI: getGlobalStats() view returns (GlobalStats)
   */
  async getGlobalStats() {
    try {
      return await this.contracts.stats.getGlobalStats();
    } catch (error) {
      console.error('getGlobalStats error:', error);
      return null;
    }
  }

  // ==========================================
  // BRIDGE - Проекты
  // ==========================================

  /**
   * Проверить доступ к проекту
   * ABI: checkUserAccess(address user, string projectId) view returns (bool)
   */
  async checkUserAccess(projectId) {
    try {
      return await this.contracts.bridge.checkUserAccess(web3Manager.address, projectId);
    } catch (error) {
      console.error('checkUserAccess error:', error);
      return false;
    }
  }

  /**
   * Получить статус доступа
   * ABI: getUserAccessStatus(address user, string projectId) view returns (AccessStatus)
   */
  async getUserAccessStatus(projectId) {
    try {
      return await this.contracts.bridge.getUserAccessStatus(web3Manager.address, projectId);
    } catch (error) {
      console.error('getUserAccessStatus error:', error);
      return null;
    }
  }

  /**
   * Получить все проекты
   * ABI: getAllProjects() view returns (Project[])
   */
  async getAllProjects() {
    try {
      return await this.contracts.bridge.getAllProjects();
    } catch (error) {
      console.error('getAllProjects error:', error);
      return [];
    }
  }

  /**
   * Получить проект по ID
   * ABI: getProject(string projectId) view returns (Project)
   */
  async getProject(projectId) {
    try {
      return await this.contracts.bridge.getProject(projectId);
    } catch (error) {
      console.error('getProject error:', error);
      return null;
    }
  }
}

// Глобальный экземпляр
const contracts = new ContractsManager();
