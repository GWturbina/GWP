/* jshint esversion: 8 */
/* global CONFIG, web3Manager, ethers, Utils */

/**
 * GlobalWay Contracts Manager - ПОВНІСТЮ ВИПРАВЛЕНА ВЕРСІЯ
 * Інтеграція всіх 10 смарт-контрактів з правильними функціями
 * 
 * Версія: 2.0 (Виправлена)
 * Дата: 01.11.2025
 */

class ContractsManager {
  constructor() {
    this.contracts = {};
    this.initialized = false;
  }

  /**
   * Ініціалізація всіх контрактів
   */
  async init() {
    if (!web3Manager.connected) {
      throw new Error('Wallet not connected');
    }

    if (this.initialized) {
      console.log('⚠️ Contracts already initialized');
      return;
    }

    console.log('📄 Initializing contracts...');

    try {
      // Ініціалізувати кожен контракт з його ABI
      await this.initializeContract('gwtToken', 'GWTToken');
      await this.initializeContract('globalWay', 'GlobalWay');
      await this.initializeContract('marketing', 'Marketing');
      await this.initializeContract('leaderPool', 'LeaderPool');
      await this.initializeContract('investment', 'Investment');
      await this.initializeContract('quarterly', 'Quarterly');
      await this.initializeContract('techAccounts', 'TechAccounts');
      await this.initializeContract('bridge', 'Bridge');
      await this.initializeContract('stats', 'Stats');
      await this.initializeContract('governance', 'Governance');

      this.initialized = true;
      console.log('✅ All 10 contracts initialized successfully');

    } catch (error) {
      console.error('❌ Contracts initialization failed:', error);
      throw error;
    }
  }

  /**
   * Ініціалізація окремого контракту
   */
  async initializeContract(key, name) {
    try {
      const address = CONFIG.CONTRACTS[name] || CONFIG.CONTRACTS[key];
      
      if (!address) {
        throw new Error(`Address not found for ${name}`);
      }

      if (!ethers.utils.isAddress(address)) {
        throw new Error(`Invalid address for ${name}: ${address}`);
      }

      // Завантажити ABI з JSON файлу
      const abiPath = `./contracts/abis/GlobalWay${name === 'GlobalWay' ? '' : name}.json`;
      const response = await fetch(abiPath);
      const abiData = await response.json();

      this.contracts[key] = new ethers.Contract(
        address,
        abiData.abi,
        web3Manager.signer
      );

      console.log(`✅ ${name} initialized at ${address}`);

    } catch (error) {
      console.error(`❌ Failed to initialize ${name}:`, error);
      throw error;
    }
  }

  // ==========================================
  // GLOBALWAY - Головний контракт
  // ==========================================

  /**
   * Отримати інформацію про користувача
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
        isBlocked: Boolean(user.isBlocked)
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
        isBlocked: false
      };
    }
  }

  /**
   * Отримати інформацію про рівень користувача
   */
  async getUserLevel(address, level) {
    try {
      const levelInfo = await this.contracts.globalWay.getUserLevelInfo(address, level);
      
      return {
        isActive: Boolean(levelInfo.isActive),
        activationTime: levelInfo.activationTime ? levelInfo.activationTime.toNumber() : 0,
        reactivations: Number(levelInfo.reactivations) || 0,
        partnersCount: Number(levelInfo.partnersCount) || 0,
        cyclesCount: Number(levelInfo.cyclesCount) || 0
      };
    } catch (error) {
      console.error('getUserLevel error:', error);
      return {
        isActive: false,
        activationTime: 0,
        reactivations: 0,
        partnersCount: 0,
        cyclesCount: 0
      };
    }
  }

  /**
   * Реєстрація нового користувача
   */
  async register(refAddress) {
    try {
      const price = ethers.utils.parseEther(CONFIG.LEVEL_PRICES[0]);
      
      console.log('📝 Registering user with referrer:', refAddress);
      console.log('💰 Payment:', CONFIG.LEVEL_PRICES[0], 'BNB');
      
      const tx = await this.contracts.globalWay.register(refAddress, {
        value: price,
        gasLimit: CONFIG.GAS_LIMITS.register
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
   * Купівля окремого рівня
   */
  async buyLevel(level) {
    try {
      const price = ethers.utils.parseEther(CONFIG.LEVEL_PRICES[level - 1]);
      
      console.log(`📝 Buying Level ${level}`);
      console.log('💰 Payment:', CONFIG.LEVEL_PRICES[level - 1], 'BNB');
      
      const tx = await this.contracts.globalWay.activateLevel(level, {
        value: price,
        gasLimit: CONFIG.GAS_LIMITS.buyLevel
      });
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Level activated');
      
      return receipt;
    } catch (error) {
      console.error('❌ Buy level failed:', error);
      throw error;
    }
  }

  /**
   * Пакетна купівля рівнів
   */
  async buyBulkLevels(upToLevel) {
    try {
      let totalPrice = ethers.BigNumber.from(0);
      for (let i = 0; i < upToLevel; i++) {
        totalPrice = totalPrice.add(ethers.utils.parseEther(CONFIG.LEVEL_PRICES[i]));
      }
      
      console.log(`📝 Buying Levels 1-${upToLevel}`);
      console.log('💰 Total payment:', ethers.utils.formatEther(totalPrice), 'BNB');
      
      const tx = await this.contracts.globalWay.activateBulkLevels(upToLevel, {
        value: totalPrice,
        gasLimit: CONFIG.GAS_LIMITS.buyBulkLevels
      });
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Bulk levels activated');
      
      return receipt;
    } catch (error) {
      console.error('❌ Bulk buy failed:', error);
      throw error;
    }
  }

  /**
   * Отримати інформацію про матрицю
   */
  async getMatrixInfo(address, level) {
    try {
      return await this.contracts.globalWay.getMatrixInfo(address, level);
    } catch (error) {
      console.error('getMatrixInfo error:', error);
      return null;
    }
  }

  // ==========================================
  // GWTTOKEN - Токен
  // ==========================================

  /**
   * Отримати баланс токенів
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
   * Отримати поточну ціну токену
   */
  async getTokenPrice() {
    try {
      return await this.contracts.gwtToken.getCurrentPrice();
    } catch (error) {
      console.error('getTokenPrice error:', error);
      return ethers.BigNumber.from(0);
    }
  }

  /**
   * Купити токени
   */
  async buyTokens(amount) {
    try {
      const tx = await this.contracts.gwtToken.buyTokens({
        value: amount,
        gasLimit: CONFIG.GAS_LIMITS.tokenBuy
      });
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('buyTokens error:', error);
      throw error;
    }
  }

  /**
   * Продати токени
   */
  async sellTokens(amount) {
    try {
      const tx = await this.contracts.gwtToken.sellTokens(amount, {
        gasLimit: CONFIG.GAS_LIMITS.tokenSell
      });
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('sellTokens error:', error);
      throw error;
    }
  }

  // ==========================================
  // MARKETING - ВИПРАВЛЕНО!
  // ==========================================

  /**
   * Отримати баланси Marketing (ВИПРАВЛЕНО!)
   */
  async getMarketingBalances(address) {
    try {
      const balances = await this.contracts.marketing.getUserBalances(address);
      
      return {
        referralBalance: balances.referralBalance || ethers.BigNumber.from(0),
        matrixBalance: balances.matrixBalance || ethers.BigNumber.from(0),
        totalBalance: (balances.referralBalance || ethers.BigNumber.from(0))
          .add(balances.matrixBalance || ethers.BigNumber.from(0))
      };
    } catch (error) {
      console.error('getMarketingBalances error:', error);
      return {
        referralBalance: ethers.BigNumber.from(0),
        matrixBalance: ethers.BigNumber.from(0),
        totalBalance: ethers.BigNumber.from(0)
      };
    }
  }

  /**
   * Виведення Referral балансу
   */
  async withdrawReferral() {
    try {
      const tx = await this.contracts.marketing.withdrawReferral({
        gasLimit: CONFIG.GAS_LIMITS.withdraw
      });
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('withdrawReferral error:', error);
      throw error;
    }
  }

  /**
   * Виведення Matrix балансу
   */
  async withdrawMatrix() {
    try {
      const tx = await this.contracts.marketing.withdrawMatrix({
        gasLimit: CONFIG.GAS_LIMITS.withdraw
      });
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('withdrawMatrix error:', error);
      throw error;
    }
  }

  /**
   * Отримати заморожені кошти
   */
  async getFrozenFunds(address) {
    try {
      const frozenData = await this.contracts.marketing.getFrozenFunds(address);
      
      const funds = [];
      for (let i = 0; i < frozenData.levels.length; i++) {
        funds.push({
          level: Number(frozenData.levels[i]),
          amount: frozenData.amounts[i],
          timestamp: frozenData.timestamps[i] ? frozenData.timestamps[i].toNumber() : 0
        });
      }
      
      return funds;
    } catch (error) {
      console.error('getFrozenFunds error:', error);
      return [];
    }
  }

  // ==========================================
  // LEADER POOL - ВИПРАВЛЕНО!
  // ==========================================

  /**
   * Отримати інформацію про ранг (ВИПРАВЛЕНО!)
   */
  async getRankInfo(address) {
    try {
      const rankInfo = await this.contracts.leaderPool.getUserRankInfo(address);
      
      return {
        currentRank: Number(rankInfo.currentRank) || 0,
        qualificationTime: rankInfo.qualificationTime ? rankInfo.qualificationTime.toNumber() : 0,
        pendingReward: rankInfo.pendingReward || ethers.BigNumber.from(0),
        claimedReward: rankInfo.claimedReward || ethers.BigNumber.from(0),
        isQualified: Boolean(rankInfo.isQualified)
      };
    } catch (error) {
      console.error('getRankInfo error:', error);
      return {
        currentRank: 0,
        qualificationTime: 0,
        pendingReward: ethers.BigNumber.from(0),
        claimedReward: ethers.BigNumber.from(0),
        isQualified: false
      };
    }
  }

  /**
   * Виведення Leader Pool нагороди
   */
  async withdrawLeader() {
    try {
      const tx = await this.contracts.leaderPool.claimRankBonus({
        gasLimit: CONFIG.GAS_LIMITS.withdraw
      });
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('withdrawLeader error:', error);
      throw error;
    }
  }

  // ==========================================
  // INVESTMENT - ВИПРАВЛЕНО!
  // ==========================================

  /**
   * Отримати інформацію про інвестора (ВИПРАВЛЕНО!)
   */
  async getInvestorInfo(address) {
    try {
      const investorInfo = await this.contracts.investment.getInvestorInfo(address);
      
      return {
        totalInvested: investorInfo.totalInvested || ethers.BigNumber.from(0),
        pendingReward: investorInfo.pendingReward || ethers.BigNumber.from(0),
        claimedReward: investorInfo.claimedReward || ethers.BigNumber.from(0),
        lastClaimTime: investorInfo.lastClaimTime ? investorInfo.lastClaimTime.toNumber() : 0,
        isActive: Boolean(investorInfo.isActive)
      };
    } catch (error) {
      console.error('getInvestorInfo error:', error);
      return {
        totalInvested: ethers.BigNumber.from(0),
        pendingReward: ethers.BigNumber.from(0),
        claimedReward: ethers.BigNumber.from(0),
        lastClaimTime: 0,
        isActive: false
      };
    }
  }

  /**
   * Виведення Investment нагороди
   */
  async withdrawInvestment() {
    try {
      const tx = await this.contracts.investment.claimWeeklyReward({
        gasLimit: CONFIG.GAS_LIMITS.withdraw
      });
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('withdrawInvestment error:', error);
      throw error;
    }
  }

  // ==========================================
  // QUARTERLY
  // ==========================================

  /**
   * Оплата квартальної активності
   */
  async payQuarterly(charityRecipient = null) {
    try {
      const fee = ethers.utils.parseEther(CONFIG.QUARTERLY_COST);
      
      let tx;
      if (charityRecipient && ethers.utils.isAddress(charityRecipient)) {
        tx = await this.contracts.quarterly.payQuarterlyActivity(charityRecipient, {
          value: fee,
          gasLimit: CONFIG.GAS_LIMITS.payQuarterly
        });
      } else {
        tx = await this.contracts.quarterly.payQuarterlyActivityRegular({
          value: fee,
          gasLimit: CONFIG.GAS_LIMITS.payQuarterly
        });
      }
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('payQuarterly error:', error);
      throw error;
    }
  }

  /**
   * Перевірити чи можна оплатити квартальну активність
   */
  async canPayQuarterly(address) {
    try {
      const result = await this.contracts.quarterly.canPayQuarterly(address);
      
      return {
        can: Boolean(result.can),
        reason: result.reason || '',
        timeLeft: result.timeLeft ? result.timeLeft.toNumber() : 0
      };
    } catch (error) {
      console.error('canPayQuarterly error:', error);
      return {
        can: false,
        reason: 'Error checking',
        timeLeft: 0
      };
    }
  }

  /**
   * Виведення upline bonus
   */
  async withdrawUplineBonus() {
    try {
      const tx = await this.contracts.quarterly.withdrawUplineBonus({
        gasLimit: CONFIG.GAS_LIMITS.withdraw
      });
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('withdrawUplineBonus error:', error);
      throw error;
    }
  }

  // ==========================================
  // STATS CONTRACT - КЛЮЧОВІ ФУНКЦІЇ!
  // ==========================================

  /**
   * Отримати ПОВНУ статистику користувача
   * ЦЯ ФУНКЦІЯ ЗАМІНЮЄ БАГАТО ОКРЕМИХ ВИКЛИКІВ!
   */
  async getUserFullStats(address) {
    try {
      const stats = await this.contracts.stats.getUserFullStats(address);
      
      return {
        isRegistered: Boolean(stats.isRegistered),
        sponsor: stats.sponsor || ethers.constants.AddressZero,
        maxLevel: Number(stats.maxLevel) || 0,
        quarterlyActive: Boolean(stats.quarterlyActive),
        marketingReferralBalance: stats.marketingReferralBalance || ethers.BigNumber.from(0),
        marketingMatrixBalance: stats.marketingMatrixBalance || ethers.BigNumber.from(0),
        quarterlyBalance: stats.quarterlyBalance || ethers.BigNumber.from(0),
        investmentBalance: stats.investmentBalance || ethers.BigNumber.from(0),
        leaderBalance: stats.leaderBalance || ethers.BigNumber.from(0),
        totalPendingBalance: stats.totalPendingBalance || ethers.BigNumber.from(0),
        totalInvested: stats.totalInvested || ethers.BigNumber.from(0),
        totalInvestmentReceived: stats.totalInvestmentReceived || ethers.BigNumber.from(0),
        investmentROI: Number(stats.investmentROI) || 0
      };
    } catch (error) {
      console.error('getUserFullStats error:', error);
      throw error;
    }
  }

  /**
   * Отримати всі баланси користувача
   */
  async getUserBalances(address) {
    try {
      const balances = await this.contracts.stats.getUserBalances(address);
      
      return {
        referralBalance: balances.referralBalance || ethers.BigNumber.from(0),
        matrixBalance: balances.matrixBalance || ethers.BigNumber.from(0),
        quarterlyBalance: balances.quarterlyBalance || ethers.BigNumber.from(0),
        investmentPending: balances.investmentPending || ethers.BigNumber.from(0),
        leaderBalance: balances.leaderBalance || ethers.BigNumber.from(0),
        totalBalance: balances.totalBalance || ethers.BigNumber.from(0)
      };
    } catch (error) {
      console.error('getUserBalances error:', error);
      return {
        referralBalance: ethers.BigNumber.from(0),
        matrixBalance: ethers.BigNumber.from(0),
        quarterlyBalance: ethers.BigNumber.from(0),
        investmentPending: ethers.BigNumber.from(0),
        leaderBalance: ethers.BigNumber.from(0),
        totalBalance: ethers.BigNumber.from(0)
      };
    }
  }

  /**
   * Отримати квартальну статистику
   */
  async getUserQuarterlyStats(address) {
    try {
      const stats = await this.contracts.stats.getUserQuarterlyStats(address);
      
      return {
        lastPayment: stats.lastPayment ? stats.lastPayment.toNumber() : 0,
        quarterCount: Number(stats.quarterCount) || 0,
        nextPaymentTime: stats.nextPaymentTime ? stats.nextPaymentTime.toNumber() : 0,
        isActive: Boolean(stats.isActive),
        charityAccount: stats.charityAccount || ethers.constants.AddressZero,
        techAccount1: stats.techAccount1 || ethers.constants.AddressZero,
        techAccount2: stats.techAccount2 || ethers.constants.AddressZero,
        uplineBalance: stats.uplineBalance || ethers.BigNumber.from(0)
      };
    } catch (error) {
      console.error('getUserQuarterlyStats error:', error);
      return {
        lastPayment: 0,
        quarterCount: 0,
        nextPaymentTime: 0,
        isActive: false,
        charityAccount: ethers.constants.AddressZero,
        techAccount1: ethers.constants.AddressZero,
        techAccount2: ethers.constants.AddressZero,
        uplineBalance: ethers.BigNumber.from(0)
      };
    }
  }

  /**
   * Отримати статистику структури (ПАРТНЕРИ!)
   */
  async getUserStructureStats(address) {
    try {
      const stats = await this.contracts.stats.getUserStructureStats(address);
      
      return {
        directReferrals: Number(stats.directReferrals) || 0,
        referrals: stats.referrals || [],
        activeLevels: Number(stats.activeLevels) || 0,
        levelStatus: stats.levelStatus || []
      };
    } catch (error) {
      console.error('getUserStructureStats error:', error);
      return {
        directReferrals: 0,
        referrals: [],
        activeLevels: 0,
        levelStatus: []
      };
    }
  }

  /**
   * Отримати глобальну статистику
   */
  async getGlobalStats() {
    try {
      const stats = await this.contracts.stats.getGlobalStats();
      
      return {
        totalUsers: Number(stats.totalUsers) || 0,
        totalVolume: stats.totalVolume || ethers.BigNumber.from(0),
        investmentTotalInvestors: Number(stats.investmentTotalInvestors) || 0,
        investmentActiveInvestors: Number(stats.investmentActiveInvestors) || 0,
        investmentPoolBalance: stats.investmentPoolBalance || ethers.BigNumber.from(0),
        investmentTotalDistributed: stats.investmentTotalDistributed || ethers.BigNumber.from(0),
        leaderPoolTotalLeaders: Number(stats.leaderPoolTotalLeaders) || 0,
        leaderPoolActiveLeaders: Number(stats.leaderPoolActiveLeaders) || 0,
        leaderPoolBalance: stats.leaderPoolBalance || ethers.BigNumber.from(0),
        leaderPoolTotalDistributed: stats.leaderPoolTotalDistributed || ethers.BigNumber.from(0)
      };
    } catch (error) {
      console.error('getGlobalStats error:', error);
      throw error;
    }
  }

  // ==========================================
  // BRIDGE - Проекти
  // ==========================================

  /**
   * Перевірити доступ до проекту
   */
  async checkUserAccess(projectId, userAddress) {
    try {
      return await this.contracts.bridge.checkUserAccess(projectId, userAddress);
    } catch (error) {
      console.error('checkUserAccess error:', error);
      return null;
    }
  }

  /**
   * Отримати статус доступу користувача
   */
  async getUserAccessStatus(address) {
    try {
      return await this.contracts.bridge.getUserAccessStatus(address);
    } catch (error) {
      console.error('getUserAccessStatus error:', error);
      return null;
    }
  }

  /**
   * Отримати всі проекти
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
   * Отримати проект
   */
  async getProject(projectId) {
    try {
      return await this.contracts.bridge.getProject(projectId);
    } catch (error) {
      console.error('getProject error:', error);
      return null;
    }
  }

  // ==========================================
  // EVENTS PARSING - НОВІ ФУНКЦІЇ!
  // ==========================================

  /**
   * Отримати історію активацій рівнів
   */
  async getLevelActivationsHistory(address) {
    try {
      const filter = this.contracts.globalWay.filters.LevelActivated(address);
      const events = await this.contracts.globalWay.queryFilter(filter);
      
      const history = [];
      for (const event of events) {
        const block = await event.getBlock();
        history.push({
          level: Number(event.args.level),
          timestamp: block.timestamp,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash
        });
      }
      
      return history.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('getLevelActivationsHistory error:', error);
      return [];
    }
  }

  /**
   * Отримати історію квартальних платежів
   */
  async getQuarterlyPaymentsHistory(address) {
    try {
      const filter = this.contracts.quarterly.filters.QuarterlyPaid(address);
      const events = await this.contracts.quarterly.queryFilter(filter);
      
      const history = [];
      for (const event of events) {
        const block = await event.getBlock();
        history.push({
          quarter: Number(event.args.quarter),
          amount: event.args.amount,
          timestamp: block.timestamp,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash
        });
      }
      
      return history.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('getQuarterlyPaymentsHistory error:', error);
      return [];
    }
  }

  /**
   * Отримати матричні позиції для рівня
   */
  async getMatrixPositions(address, level) {
    try {
      const matrixInfo = await this.contracts.globalWay.getMatrixInfo(address, level);
      
      const positions = [];
      
      // Отримати Events для кожної позиції
      const filter = this.contracts.globalWay.filters.NewUserPlace(level, address);
      const events = await this.contracts.globalWay.queryFilter(filter);
      
      // Створити map позицій
      const positionMap = new Map();
      
      for (const event of events) {
        const position = Number(event.args.position);
        const user = event.args.user;
        const placedBy = event.args.placedBy || ethers.constants.AddressZero;
        const block = await event.getBlock();
        
        // Отримати ID користувача
        const userInfo = await this.getUserInfo(user);
        
        positionMap.set(position, {
          position,
          user,
          userId: userInfo.id,
          placedBy,
          timestamp: block.timestamp,
          isFilled: true
        });
      }
      
      // Заповнити всі 7 позицій
      for (let i = 0; i < 7; i++) {
        if (positionMap.has(i)) {
          positions.push(positionMap.get(i));
        } else {
          positions.push({
            position: i,
            user: ethers.constants.AddressZero,
            userId: '',
            placedBy: ethers.constants.AddressZero,
            timestamp: 0,
            isFilled: false
          });
        }
      }
      
      return {
        matrixInfo,
        positions
      };
    } catch (error) {
      console.error('getMatrixPositions error:', error);
      return {
        matrixInfo: null,
        positions: []
      };
    }
  }

  // ==========================================
  // ADMIN FUNCTIONS
  // ==========================================

  /**
   * Безкоштовна реєстрація
   */
  async freeRegister(address, sponsorAddress) {
    try {
      const tx = await this.contracts.globalWay.freeRegister(address, sponsorAddress, {
        gasLimit: CONFIG.GAS_LIMITS.adminAction
      });
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('freeRegister error:', error);
      throw error;
    }
  }

  /**
   * Заблокувати користувача
   */
  async blockUser(address, reason) {
    try {
      const tx = await this.contracts.globalWay.blockUser(address, reason, {
        gasLimit: CONFIG.GAS_LIMITS.adminAction
      });
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('blockUser error:', error);
      throw error;
    }
  }
}

// Створити глобальний екземпляр
const contracts = new ContractsManager();
