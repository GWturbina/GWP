/* jshint esversion: 8 */
/* global CONFIG, web3Manager, ethers */

/**
 * ContractsManager - Full Integration with 10 Smart Contracts
 * Version: 2.0 - Production Ready
 * Date: 03.11.2025
 */

class ContractsManager {
  constructor() {
    this.contracts = {};
    this.abis = {};
    this.initialized = false;
  }

  /**
   * Загрузка всех ABI из ОТДЕЛЬНЫХ JSON файлов
   * 🔥 ИСПРАВЛЕНО: Загружаем 10 отдельных файлов, а не один большой!
   */
  async loadABIs() {
    console.log('📄 Loading contract ABIs from separate files...');
    
    try {
      // Список всех контрактов и их файлов
      // 🔥 ИСПРАВЛЕНО: Используем абсолютные пути для совместимости с SafePal
      const baseUrl = window.location.origin;
      const contractFiles = {
        GlobalWay: `${baseUrl}/contracts/abis/GlobalWay.json`,
        GWTToken: `${baseUrl}/contracts/abis/GWTToken.json`,
        Marketing: `${baseUrl}/contracts/abis/GlobalWayMarketing.json`,
        LeaderPool: `${baseUrl}/contracts/abis/GlobalWayLeaderPool.json`,
        Investment: `${baseUrl}/contracts/abis/GlobalWayInvestment.json`,
        Quarterly: `${baseUrl}/contracts/abis/GlobalWayQuarterly.json`,
        TechAccounts: `${baseUrl}/contracts/abis/GlobalWayTechAccounts.json`,
        Bridge: `${baseUrl}/contracts/abis/GlobalWayBridge.json`,
        Stats: `${baseUrl}/contracts/abis/GlobalWayStats.json`,
        Governance: `${baseUrl}/contracts/abis/GlobalWayGovernance.json`
      };
      
      // Загружаем все файлы параллельно
      const loadPromises = Object.entries(contractFiles).map(async ([name, path]) => {
        try {
          console.log(`  ⏳ Loading ${name}...`);
          const response = await fetch(path);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          
          // Файл может быть в двух форматах:
          // 1. Просто массив ABI: [...]
          // 2. Объект с полем abi: { abi: [...] }
          let abi;
          if (Array.isArray(data)) {
            abi = data;
          } else if (data.abi && Array.isArray(data.abi)) {
            abi = data.abi;
          } else {
            throw new Error(`Invalid ABI format in ${path}`);
          }
          
          console.log(`  ✓ ${name}: ${abi.length} functions/events`);
          return { name, abi };
          
        } catch (error) {
          console.error(`  ❌ Failed to load ${name} from ${path}:`, error);
          throw error;
        }
      });
      
      // Ждём загрузки всех файлов
      const results = await Promise.all(loadPromises);
      
      // Сохраняем все ABI
      this.abis = {};
      for (const { name, abi } of results) {
        this.abis[name] = abi;
      }
      
      console.log('✅ All 10 ABIs loaded successfully!');
      
    } catch (error) {
      console.error('❌ Failed to load ABIs:', error);
      throw error;
    }
  }

  /**
   * Инициализация всех контрактов
   */
  async init() {
    if (!web3Manager.connected) {
      throw new Error('Wallet not connected');
    }
    
    if (this.initialized) {
      console.warn('⚠️ Contracts already initialized');
      return;
    }
    
    console.log('🔗 Initializing contracts...');
    
    try {
      // Загрузить ABI если ещё не загружены
      if (Object.keys(this.abis).length === 0) {
        await this.loadABIs();
      }
      
      // Инициализировать каждый контракт
      this.contracts.globalWay = new ethers.Contract(
        CONFIG.CONTRACTS.GlobalWay,
        this.abis.GlobalWay,
        web3Manager.signer
      );
      console.log('  ✓ GlobalWay initialized');
      
      this.contracts.token = new ethers.Contract(
        CONFIG.CONTRACTS.GWTToken,
        this.abis.GWTToken,
        web3Manager.signer
      );
      console.log('  ✓ GWTToken initialized');
      
      this.contracts.marketing = new ethers.Contract(
        CONFIG.CONTRACTS.Marketing,
        this.abis.Marketing,
        web3Manager.signer
      );
      console.log('  ✓ Marketing initialized');
      
      this.contracts.leaderPool = new ethers.Contract(
        CONFIG.CONTRACTS.LeaderPool,
        this.abis.LeaderPool,
        web3Manager.signer
      );
      console.log('  ✓ LeaderPool initialized');
      
      this.contracts.investment = new ethers.Contract(
        CONFIG.CONTRACTS.Investment,
        this.abis.Investment,
        web3Manager.signer
      );
      console.log('  ✓ Investment initialized');
      
      this.contracts.quarterly = new ethers.Contract(
        CONFIG.CONTRACTS.Quarterly,
        this.abis.Quarterly,
        web3Manager.signer
      );
      console.log('  ✓ Quarterly initialized');
      
      this.contracts.techAccounts = new ethers.Contract(
        CONFIG.CONTRACTS.TechAccounts,
        this.abis.TechAccounts,
        web3Manager.signer
      );
      console.log('  ✓ TechAccounts initialized');
      
      this.contracts.bridge = new ethers.Contract(
        CONFIG.CONTRACTS.Bridge,
        this.abis.Bridge,
        web3Manager.signer
      );
      console.log('  ✓ Bridge initialized');
      
      this.contracts.stats = new ethers.Contract(
        CONFIG.CONTRACTS.Stats,
        this.abis.Stats,
        web3Manager.signer
      );
      console.log('  ✓ Stats initialized');
      
      this.contracts.governance = new ethers.Contract(
        CONFIG.CONTRACTS.Governance,
        this.abis.Governance,
        web3Manager.signer
      );
      console.log('  ✓ Governance initialized');
      
      this.initialized = true;
      console.log('✅ All 10 contracts initialized successfully');
      
    } catch (error) {
      console.error('❌ Contract initialization failed:', error);
      throw error;
    }
  }

  // ==========================================
  // GLOBALWAY CONTRACT - ОСНОВНОЙ КОНТРАКТ
  // ==========================================

  /**
   * Получить информацию о пользователе
   */
  async getUserInfo(address) {
    try {
      const user = await this.contracts.globalWay.users(address);
      
      return {
        id: user.id || '',
        sponsorId: user.sponsorId || '',
        refAddress: user.refAddress || ethers.constants.AddressZero,
        registrationTime: user.registrationTime ? user.registrationTime.toNumber() : 0,
        rankLevel: user.rankLevel ? user.rankLevel.toNumber() : 0,
        activeLevel: user.activeLevel ? user.activeLevel.toNumber() : 0,
        partnersCount: user.partnersCount ? user.partnersCount.toNumber() : 0,
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
   * Получить информацию об уровне
   */
  async getUserLevel(address, level) {
    try {
      const levelInfo = await this.contracts.globalWay.getUserLevelInfo(address, level);
      
      return {
        isActive: Boolean(levelInfo.isActive),
        activationTime: levelInfo.activationTime ? levelInfo.activationTime.toNumber() : 0,
        reactivations: levelInfo.reactivations ? levelInfo.reactivations.toNumber() : 0,
        partnersCount: levelInfo.partnersCount ? levelInfo.partnersCount.toNumber() : 0,
        cyclesCount: levelInfo.cyclesCount ? levelInfo.cyclesCount.toNumber() : 0,
        totalEarned: levelInfo.totalEarned ? ethers.utils.formatEther(levelInfo.totalEarned) : '0'
      };
    } catch (error) {
      console.error('getUserLevel error:', error);
      return {
        isActive: false,
        activationTime: 0,
        reactivations: 0,
        partnersCount: 0,
        cyclesCount: 0,
        totalEarned: '0'
      };
    }
  }

  /**
   * Проверка активности уровня
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
   */
  async register(sponsorAddress) {
    try {
      const price = ethers.utils.parseEther(CONFIG.LEVEL_PRICES[0]);
      
      console.log('📝 Registering user...');
      console.log('  Sponsor:', sponsorAddress);
      console.log('  Payment:', CONFIG.LEVEL_PRICES[0], 'BNB');
      
      // 🔥 ИСПРАВЛЕНО: Убрали жесткий gasLimit
      const tx = await this.contracts.globalWay.register(sponsorAddress, {
        value: price
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
   * Активация уровня
   */
  async activateLevel(level) {
    try {
      const price = ethers.utils.parseEther(CONFIG.LEVEL_PRICES[level - 1]);
      
      console.log(`📝 Activating Level ${level}...`);
      console.log('  Payment:', CONFIG.LEVEL_PRICES[level - 1], 'BNB');
      
      // 🔥 ИСПРАВЛЕНО: Убрали жесткий gasLimit для SafePal - пусть кошелек оценит
      const tx = await this.contracts.globalWay.activateLevel(level, {
        value: price
      });
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Level activated');
      
      return receipt;
    } catch (error) {
      console.error('❌ Level activation failed:', error);
      throw error;
    }
  }

  /**
   * Пакетная активация уровней
   */
  async activateBulkLevels(upToLevel) {
    try {
      // Рассчитать стоимость
      const totalPrice = await this.calculateBulkPrice(upToLevel);
      
      console.log(`📝 Activating Levels 1-${upToLevel}...`);
      console.log('  Total Payment:', ethers.utils.formatEther(totalPrice), 'BNB');
      
      // 🔥 ИСПРАВЛЕНО: Убрали жесткий gasLimit для SafePal - пусть кошелек оценит
      const tx = await this.contracts.globalWay.activateBulkLevels(upToLevel, {
        value: totalPrice
      });
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Bulk levels activated');
      
      return receipt;
    } catch (error) {
      console.error('❌ Bulk activation failed:', error);
      throw error;
    }
  }

  /**
   * Рассчитать стоимость пакета
   */
  async calculateBulkPrice(upToLevel) {
    try {
      return await this.contracts.globalWay.calculateBulkPrice(upToLevel);
    } catch (error) {
      // Fallback расчёт
      let total = ethers.BigNumber.from(0);
      for (let i = 0; i < upToLevel; i++) {
        total = total.add(ethers.utils.parseEther(CONFIG.LEVEL_PRICES[i]));
      }
      return total;
    }
  }

  /**
   * Получить прямых рефералов
   */
  async getDirectReferrals(address) {
    try {
      return await this.contracts.globalWay.getDirectReferrals(address);
    } catch (error) {
      console.error('getDirectReferrals error:', error);
      return [];
    }
  }

  /**
   * Получить спонсора
   */
  async getUserSponsor(address) {
    try {
      return await this.contracts.globalWay.getUserSponsor(address);
    } catch (error) {
      console.error('getUserSponsor error:', error);
      return ethers.constants.AddressZero;
    }
  }

  /**
   * Получить позицию в матрице
   */
  async getMatrixPosition(address, level) {
    try {
      const position = await this.contracts.globalWay.getMatrixPosition(address, level);
      
      return {
        id: position.id ? position.id.toNumber() : 0,
        parent: position.parent || ethers.constants.AddressZero,
        children: position.children || [],
        reinvestCount: position.reinvestCount ? position.reinvestCount.toNumber() : 0
      };
    } catch (error) {
      console.error('getMatrixPosition error:', error);
      return {
        id: 0,
        parent: ethers.constants.AddressZero,
        children: [],
        reinvestCount: 0
      };
    }
  }

  // ==========================================
  // STATS CONTRACT - СТАТИСТИКА
  // ==========================================

  /**
   * Получить глобальную статистику
   */
  async getGlobalStats() {
    try {
      const stats = await this.contracts.stats.getGlobalStats();
      
      return {
        totalUsers: stats.totalUsers ? stats.totalUsers.toNumber() : 0,
        activeUsers: stats.activeUsers ? stats.activeUsers.toNumber() : 0,
        totalVolume: stats.totalVolume ? ethers.utils.formatEther(stats.totalVolume) : '0',
        contractBalance: stats.contractBalance ? ethers.utils.formatEther(stats.contractBalance) : '0',
        totalTokensMinted: stats.totalTokensMinted ? ethers.utils.formatEther(stats.totalTokensMinted) : '0'
      };
    } catch (error) {
      console.error('getGlobalStats error:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalVolume: '0',
        contractBalance: '0',
        totalTokensMinted: '0'
      };
    }
  }

  /**
   * Получить полную статистику пользователя
   */
  async getUserFullStats(address) {
    try {
      const stats = await this.contracts.stats.getUserFullStats(address);
      
      return {
        totalEarned: stats.totalEarned ? ethers.utils.formatEther(stats.totalEarned) : '0',
        referralEarnings: stats.referralEarnings ? ethers.utils.formatEther(stats.referralEarnings) : '0',
        matrixEarnings: stats.matrixEarnings ? ethers.utils.formatEther(stats.matrixEarnings) : '0',
        leaderPoolEarnings: stats.leaderPoolEarnings ? ethers.utils.formatEther(stats.leaderPoolEarnings) : '0',
        quarterlyEarnings: stats.quarterlyEarnings ? ethers.utils.formatEther(stats.quarterlyEarnings) : '0',
        tokenBalance: stats.tokenBalance ? ethers.utils.formatEther(stats.tokenBalance) : '0',
        rank: stats.rank ? stats.rank.toNumber() : 0,
        partnersCount: stats.partnersCount ? stats.partnersCount.toNumber() : 0,
        teamSize: stats.teamSize ? stats.teamSize.toNumber() : 0
      };
    } catch (error) {
      console.error('getUserFullStats error:', error);
      return {
        totalEarned: '0',
        referralEarnings: '0',
        matrixEarnings: '0',
        leaderPoolEarnings: '0',
        quarterlyEarnings: '0',
        tokenBalance: '0',
        rank: 0,
        partnersCount: 0,
        teamSize: 0
      };
    }
  }

  /**
   * Получить статистику структуры
   */
  async getUserStructureStats(address) {
    try {
      const stats = await this.contracts.stats.getUserStructureStats(address);
      
      return {
        personalInvites: stats.personalInvites ? stats.personalInvites.toNumber() : 0,
        activePartners: stats.activePartners ? stats.activePartners.toNumber() : 0,
        totalTeam: stats.totalTeam ? stats.totalTeam.toNumber() : 0,
        teamVolume: stats.teamVolume ? ethers.utils.formatEther(stats.teamVolume) : '0'
      };
    } catch (error) {
      console.error('getUserStructureStats error:', error);
      return {
        personalInvites: 0,
        activePartners: 0,
        totalTeam: 0,
        teamVolume: '0'
      };
    }
  }

  /**
   * Получить информацию о балансах
   */
  async getUserBalances(address) {
    try {
      const balances = await this.contracts.stats.getUserBalances(address);
      
      return {
        referral: balances.referralBalance ? ethers.utils.formatEther(balances.referralBalance) : '0',
        matrix: balances.matrixBalance ? ethers.utils.formatEther(balances.matrixBalance) : '0',
        leaderPool: balances.leaderPoolBalance ? ethers.utils.formatEther(balances.leaderPoolBalance) : '0',
        investment: balances.investmentBalance ? ethers.utils.formatEther(balances.investmentBalance) : '0',
        total: balances.totalBalance ? ethers.utils.formatEther(balances.totalBalance) : '0'
      };
    } catch (error) {
      console.error('getUserBalances error:', error);
      return {
        referral: '0',
        matrix: '0',
        leaderPool: '0',
        investment: '0',
        total: '0'
      };
    }
  }

  // ==========================================
  // MARKETING CONTRACT - МАРКЕТИНГ
  // ==========================================

  /**
   * Вывод реферальных средств
   */
  async withdrawReferral() {
    try {
      console.log('💰 Withdrawing referral balance...');
      
      // 🔥 ИСПРАВЛЕНО: Убрали жесткий gasLimit
      const tx = await this.contracts.marketing.withdrawReferral();
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Referral withdrawal successful');
      
      return receipt;
    } catch (error) {
      console.error('❌ Referral withdrawal failed:', error);
      throw error;
    }
  }

  /**
   * Вывод матричных средств
   */
  async withdrawMatrix() {
    try {
      console.log('💰 Withdrawing matrix balance...');
      
      // 🔥 ИСПРАВЛЕНО: Убрали жесткий gasLimit
      const tx = await this.contracts.marketing.withdrawMatrix();
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Matrix withdrawal successful');
      
      return receipt;
    } catch (error) {
      console.error('❌ Matrix withdrawal failed:', error);
      throw error;
    }
  }

  // ==========================================
  // LEADERPO CONTRACT - ЛИДЕРСКИЙ ПУЛ
  // ==========================================

  /**
   * Получить информацию о лидере
   */
  async getLeaderInfo(address) {
    try {
      const info = await this.contracts.leaderPool.getLeaderInfo(address);
      
      return {
        rank: info.rank || 'None',
        dailyEarnings: info.dailyEarnings ? ethers.utils.formatEther(info.dailyEarnings) : '0',
        totalEarned: info.totalEarned ? ethers.utils.formatEther(info.totalEarned) : '0',
        nextDistribution: info.nextDistribution ? info.nextDistribution.toNumber() : 0
      };
    } catch (error) {
      console.error('getLeaderInfo error:', error);
      return {
        rank: 'None',
        dailyEarnings: '0',
        totalEarned: '0',
        nextDistribution: 0
      };
    }
  }

  /**
   * Получить информацию о ранге
   */
  async getUserRankInfo(address) {
    try {
      const rankInfo = await this.contracts.leaderPool.getUserRankInfo(address);
      
      return {
        currentRank: rankInfo.currentRank ? rankInfo.currentRank.toNumber() : 0,
        progress: rankInfo.progress ? rankInfo.progress.toNumber() : 0,
        qualifiedPartners: rankInfo.qualifiedPartners ? rankInfo.qualifiedPartners.toNumber() : 0,
        teamVolume: rankInfo.teamVolume ? ethers.utils.formatEther(rankInfo.teamVolume) : '0'
      };
    } catch (error) {
      console.error('getUserRankInfo error:', error);
      return {
        currentRank: 0,
        progress: 0,
        qualifiedPartners: 0,
        teamVolume: '0'
      };
    }
  }

  /**
   * Получить бонус ранга
   */
  async claimRankBonus() {
    try {
      console.log('💰 Claiming rank bonus...');
      
      // 🔥 ИСПРАВЛЕНО: Убрали жесткий gasLimit
      const tx = await this.contracts.leaderPool.claimRankBonus();
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Rank bonus claimed');
      
      return receipt;
    } catch (error) {
      console.error('❌ Claim rank bonus failed:', error);
      throw error;
    }
  }

  // ==========================================
  // QUARTERLY CONTRACT - КВАРТАЛЬНАЯ АКТИВНОСТЬ
  // ==========================================

  /**
   * Получить информацию о квартальной активности
   */
  async getUserQuarterlyInfo(address) {
    try {
      const info = await this.contracts.quarterly.getUserQuarterlyInfo(address);
      
      return {
        isActive: Boolean(info.isActive),
        lastPayment: info.lastPayment ? info.lastPayment.toNumber() : 0,
        nextPayment: info.nextPayment ? info.nextPayment.toNumber() : 0,
        currentQuarter: info.currentQuarter ? info.currentQuarter.toNumber() : 0,
        totalPaid: info.totalPaid ? ethers.utils.formatEther(info.totalPaid) : '0'
      };
    } catch (error) {
      console.error('getUserQuarterlyInfo error:', error);
      return {
        isActive: false,
        lastPayment: 0,
        nextPayment: 0,
        currentQuarter: 0,
        totalPaid: '0'
      };
    }
  }

  /**
   * Оплата квартальной активности
   */
  async payQuarterlyActivity() {
    try {
      const fee = ethers.utils.parseEther(CONFIG.QUARTERLY.FEE);
      
      console.log('💳 Paying quarterly activity...');
      console.log('  Fee:', CONFIG.QUARTERLY.FEE, 'BNB');
      
      // 🔥 ИСПРАВЛЕНО: Убрали жесткий gasLimit
      const tx = await this.contracts.quarterly.payQuarterlyActivity({
        value: fee
      });
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Quarterly payment successful');
      
      return receipt;
    } catch (error) {
      console.error('❌ Quarterly payment failed:', error);
      throw error;
    }
  }

  // ==========================================
  // INVESTMENT CONTRACT - ИНВЕСТИЦИОННЫЙ ПУЛ
  // ==========================================

  /**
   * Получить информацию об инвесторе
   */
  async getInvestorInfo(address) {
    try {
      const info = await this.contracts.investment.getInvestorInfo(address);
      
      return {
        totalInvested: info.totalInvested ? ethers.utils.formatEther(info.totalInvested) : '0',
        weeklyReward: info.weeklyReward ? ethers.utils.formatEther(info.weeklyReward) : '0',
        totalEarned: info.totalEarned ? ethers.utils.formatEther(info.totalEarned) : '0',
        lastClaim: info.lastClaim ? info.lastClaim.toNumber() : 0
      };
    } catch (error) {
      console.error('getInvestorInfo error:', error);
      return {
        totalInvested: '0',
        weeklyReward: '0',
        totalEarned: '0',
        lastClaim: 0
      };
    }
  }

  /**
   * Получить недельное вознаграждение инвестора
   */
  async claimWeeklyReward() {
    try {
      console.log('💰 Claiming weekly investment reward...');
      
      // 🔥 ИСПРАВЛЕНО: Убрали жесткий gasLimit
      const tx = await this.contracts.investment.withdraw();
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Weekly reward claimed');
      
      return receipt;
    } catch (error) {
      console.error('❌ Claim weekly reward failed:', error);
      throw error;
    }
  }

  // ==========================================
  // TOKEN CONTRACT - GWT ТОКЕН
  // ==========================================

  /**
   * Получить баланс токенов
   */
  async getTokenBalance(address) {
    try {
      const balance = await this.contracts.token.balanceOf(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('getTokenBalance error:', error);
      return '0';
    }
  }

  /**
   * Получить цену токена
   */
  async getTokenPrice() {
    try {
      const price = await this.contracts.token.currentPrice();
      return ethers.utils.formatEther(price);
    } catch (error) {
      console.error('getTokenPrice error:', error);
      return '0';
    }
  }

  /**
   * Покупка токенов
   */
  async buyTokens(amountBNB) {
    try {
      console.log('💰 Buying tokens...');
      console.log('  Amount:', amountBNB, 'BNB');
      
      const value = ethers.utils.parseEther(amountBNB.toString());
      
      // 🔥 ИСПРАВЛЕНО: Убрали жесткий gasLimit
      const tx = await this.contracts.token.buyTokens({
        value: value
      });
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Tokens purchased');
      
      return receipt;
    } catch (error) {
      console.error('❌ Token purchase failed:', error);
      throw error;
    }
  }

  /**
   * Продажа токенов
   */
  async sellTokens(amountGWT) {
    try {
      console.log('💰 Selling tokens...');
      console.log('  Amount:', amountGWT, 'GWT');
      
      const amount = ethers.utils.parseEther(amountGWT.toString());
      
      // 🔥 ИСПРАВЛЕНО: Убрали жесткий gasLimit
      const tx = await this.contracts.token.sellTokens(amount);
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Tokens sold');
      
      return receipt;
    } catch (error) {
      console.error('❌ Token sale failed:', error);
      throw error;
    }
  }

  /**
   * Получить статистику токенов
   */
  async getTokenStats() {
    try {
      const stats = await this.contracts.token.getTokenStats();
      
      return {
        totalSupply: stats.totalSupply ? ethers.utils.formatEther(stats.totalSupply) : '0',
        circulatingSupply: stats.circulatingSupply ? ethers.utils.formatEther(stats.circulatingSupply) : '0',
        totalBurned: stats.totalBurned ? ethers.utils.formatEther(stats.totalBurned) : '0',
        currentPrice: stats.currentPrice ? ethers.utils.formatEther(stats.currentPrice) : '0'
      };
    } catch (error) {
      console.error('getTokenStats error:', error);
      return {
        totalSupply: '0',
        circulatingSupply: '0',
        totalBurned: '0',
        currentPrice: '0'
      };
    }
  }

  // ==========================================
  // PARTNERS & TEAM FUNCTIONS - ПАРТНЁРЫ
  // ==========================================

  /**
   * Получить партнёров по уровню линии
   */
  async getPartnersByLevel(address, level) {
    try {
      // Получить партнёров с контракта Stats
      const partners = await this.contracts.stats.getPartnersByLevel(address, level);
      
      // Получить детальную информацию для каждого
      const partnersInfo = [];
      for (const partnerAddr of partners) {
        const info = await this.getUserInfo(partnerAddr);
        partnersInfo.push({
          address: partnerAddr,
          ...info
        });
      }
      
      return partnersInfo;
    } catch (error) {
      console.error('getPartnersByLevel error:', error);
      return [];
    }
  }

  /**
   * Получить всех прямых партнёров
   */
  async getDirectPartners(address) {
    try {
      const partners = await this.contracts.globalWay.getDirectReferrals(address);
      
      const partnersInfo = [];
      for (const partnerAddr of partners) {
        const info = await this.getUserInfo(partnerAddr);
        const levelInfo = await this.getUserLevel(partnerAddr, 1);
        
        partnersInfo.push({
          address: partnerAddr,
          ...info,
          activationDate: levelInfo.activationTime
        });
      }
      
      return partnersInfo;
    } catch (error) {
      console.error('getDirectPartners error:', error);
      return [];
    }
  }

  /**
   * Получить структуру команды для уровня
   */
  async getTeamStructure(address, maxLevel = 12) {
    try {
      const structure = [];
      
      for (let level = 1; level <= maxLevel; level++) {
        const partners = await this.getPartnersByLevel(address, level);
        structure.push({
          level,
          partners,
          count: partners.length
        });
      }
      
      return structure;
    } catch (error) {
      console.error('getTeamStructure error:', error);
      return [];
    }
  }

  // ==========================================
  // MATRIX FUNCTIONS - МАТРИЦА
  // ==========================================

  /**
   * Получить матрицу пользователя для уровня
   */
  async getUserMatrix(address, level) {
    try {
      const matrix = await this.contracts.globalWay.getUserMatrix(address, level);
      
      // Матрица возвращает массив из 7 позиций:
      // [0] - top (сам пользователь)
      // [1-2] - первая линия (2 позиции)
      // [3-6] - вторая линия (4 позиции)
      
      const matrixInfo = [];
      
      for (let i = 0; i < matrix.length; i++) {
        const addr = matrix[i];
        
        if (addr === ethers.constants.AddressZero) {
          matrixInfo.push({
            position: i,
            address: addr,
            isEmpty: true,
            type: 'Empty'
          });
        } else {
          const info = await this.getUserInfo(addr);
          matrixInfo.push({
            position: i,
            address: addr,
            isEmpty: false,
            ...info,
            type: info.isCharity ? 'Charity' : info.isTechnical ? 'Technical' : 'Partner'
          });
        }
      }
      
      return matrixInfo;
    } catch (error) {
      console.error('getUserMatrix error:', error);
      return [];
    }
  }

  /**
   * Получить участников матрицы для уровня (таблица)
   */
  async getMatrixMembers(address, level) {
    try {
      const members = await this.contracts.globalWay.getMatrixMembers(address, level);
      
      const membersInfo = [];
      for (const memberAddr of members) {
        const info = await this.getUserInfo(memberAddr);
        const levelInfo = await this.getUserLevel(memberAddr, level);
        
        membersInfo.push({
          address: memberAddr,
          ...info,
          activationDate: levelInfo.activationTime
        });
      }
      
      return membersInfo;
    } catch (error) {
      console.error('getMatrixMembers error:', error);
      return [];
    }
  }

  /**
   * Получить статистику матрицы
   */
  async getMatrixStats(address, level) {
    try {
      const stats = await this.contracts.globalWay.getMatrixStats(address, level);
      
      return {
        totalActive: stats.totalActive ? stats.totalActive.toNumber() : 0,
        fromPartners: stats.fromPartners ? stats.fromPartners.toNumber() : 0,
        fromCharity: stats.fromCharity ? stats.fromCharity.toNumber() : 0,
        fromTechnical: stats.fromTechnical ? stats.fromTechnical.toNumber() : 0,
        cyclesCompleted: stats.cyclesCompleted ? stats.cyclesCompleted.toNumber() : 0,
        totalEarned: stats.totalEarned ? ethers.utils.formatEther(stats.totalEarned) : '0'
      };
    } catch (error) {
      console.error('getMatrixStats error:', error);
      return {
        totalActive: 0,
        fromPartners: 0,
        fromCharity: 0,
        fromTechnical: 0,
        cyclesCompleted: 0,
        totalEarned: '0'
      };
    }
  }

  /**
   * Получить все позиции матрицы для пользователя
   * 🔥 НОВАЯ ФУНКЦИЯ: Правильная загрузка матрицы относительно пользователя
   * Показывает 2^N позиций для уровня N (без ограничения на 20 строк)
   */
  async getMatrixPositions(address, level) {
    try {
      console.log(`📊 Loading matrix positions for level ${level}...`);
      
      // Получаем базовую информацию о позиции пользователя
      const userPosition = await this.getMatrixPosition(address, level);
      const userInfo = await this.getUserInfo(address);
      
      // Массив для хранения всех позиций
      const positions = [];
      
      // Позиция 0: сам пользователь
      positions.push({
        position: 0,
        user: address,
        userId: userInfo.id || `GW${address.slice(2, 9)}`,
        placedBy: userPosition.parent || ethers.constants.AddressZero,
        isFilled: true,
        timestamp: userInfo.registrationTime,
        children: userPosition.children || []
      });
      
      // Определяем количество позиций для этого уровня
      // Уровень 1: 2 позиции, Уровень 2: 4 позиции, Уровень N: 2^N позиций
      const maxPositions = Math.pow(2, level);
      
      // Загружаем позиции детей рекурсивно
      await this.loadMatrixChildren(address, level, 0, positions, maxPositions);
      
      console.log(`✅ Loaded ${positions.length} positions for level ${level}`);
      
      return {
        level,
        positions,
        userAddress: address,
        totalPositions: positions.length,
        filledPositions: positions.filter(p => p.isFilled).length
      };
      
    } catch (error) {
      console.error('getMatrixPositions error:', error);
      return {
        level,
        positions: [],
        userAddress: address,
        totalPositions: 0,
        filledPositions: 0
      };
    }
  }
  
  /**
   * Рекурсивная загрузка детей в матрице
   */
  async loadMatrixChildren(rootAddress, level, currentPosition, positions, maxPositions) {
    // Проверяем, не превысили ли мы максимум позиций
    if (positions.length >= maxPositions + 1) return; // +1 для корневой позиции
    
    // Получаем позицию для текущего индекса
    const existingPosition = positions.find(p => p.position === currentPosition);
    if (!existingPosition || !existingPosition.children || existingPosition.children.length === 0) {
      return;
    }
    
    // Для каждого ребёнка
    for (let i = 0; i < existingPosition.children.length && i < 2; i++) {
      const childAddress = existingPosition.children[i];
      const childPositionIndex = currentPosition * 2 + i + 1;
      
      try {
        // Проверяем, заполнена ли позиция
        if (childAddress && childAddress !== ethers.constants.AddressZero) {
          const childInfo = await this.getUserInfo(childAddress);
          const childLevelInfo = await this.getUserLevel(childAddress, level);
          
          positions.push({
            position: childPositionIndex,
            user: childAddress,
            userId: childInfo.id || `GW${childAddress.slice(2, 9)}`,
            placedBy: existingPosition.user,
            isFilled: childLevelInfo.isActive,
            timestamp: childLevelInfo.activationTime,
            children: []
          });
          
          // Получаем детей этой позиции для дальнейшей рекурсии
          const childPosition = await this.getMatrixPosition(childAddress, level);
          if (childPosition.children && childPosition.children.length > 0) {
            const lastAdded = positions[positions.length - 1];
            lastAdded.children = childPosition.children;
            
            // Рекурсивно загружаем детей этой позиции
            await this.loadMatrixChildren(rootAddress, level, childPositionIndex, positions, maxPositions);
          }
        } else {
          // Пустая позиция
          positions.push({
            position: childPositionIndex,
            user: ethers.constants.AddressZero,
            userId: null,
            placedBy: existingPosition.user,
            isFilled: false,
            timestamp: 0,
            children: []
          });
        }
      } catch (error) {
        console.error(`Error loading position ${childPositionIndex}:`, error);
        // Добавляем пустую позицию в случае ошибки
        positions.push({
          position: childPositionIndex,
          user: ethers.constants.AddressZero,
          userId: null,
          placedBy: existingPosition.user,
          isFilled: false,
          timestamp: 0,
          children: []
        });
      }
    }
  }

  /**
   * Поиск пользователя в матрице по ID
   */
  async searchInMatrix(userId) {
    try {
      const address = await this.getAddressByUserId(userId);
      
      if (address === ethers.constants.AddressZero) {
        return null;
      }
      
      const info = await this.getUserInfo(address);
      return {
        address,
        ...info
      };
    } catch (error) {
      console.error('searchInMatrix error:', error);
      return null;
    }
  }

  // ==========================================
  // TRANSACTIONS & EVENTS - ТРАНЗАКЦИИ
  // ==========================================

  /**
   * Получить историю транзакций пользователя
   */
  async getTransactionHistory(address, filterType = 'all', limit = 50) {
    try {
      // Получаем события из Stats контракта
      const events = await this.contracts.stats.getUserEvents(address, limit);
      
      const transactions = [];
      
      for (const event of events) {
        const tx = {
          hash: event.transactionHash,
          type: event.eventType,
          level: event.level ? event.level.toNumber() : 0,
          amount: event.amount ? ethers.utils.formatEther(event.amount) : '0',
          timestamp: event.timestamp ? event.timestamp.toNumber() : 0,
          from: event.from || '',
          to: event.to || ''
        };
        
        // Фильтр
        if (filterType === 'all' || tx.type === filterType) {
          transactions.push(tx);
        }
      }
      
      return transactions;
    } catch (error) {
      console.error('getTransactionHistory error:', error);
      
      // Fallback: читаем события напрямую из блокчейна
      return await this.getEventsFromBlockchain(address, filterType, limit);
    }
  }

  /**
   * Получить события напрямую из блокчейна
   */
  async getEventsFromBlockchain(address, filterType, limit) {
    try {
      const transactions = [];
      
      // Определяем какие события слушать
      const eventFilters = {
        'all': [
          'UserRegistered',
          'LevelActivated',
          'ReferralBonusPaid',
          'MatrixBonusPaid',
          'QuarterlyPaid',
          'Withdrawal'
        ],
        'level': ['LevelActivated'],
        'partner': ['ReferralBonusPaid'],
        'matrix': ['MatrixBonusPaid'],
        'quarterly': ['QuarterlyPaid'],
        'withdrawal': ['Withdrawal']
      };
      
      const eventsToFetch = eventFilters[filterType] || eventFilters['all'];
      
      // Получаем текущий блок
      const currentBlock = await web3Manager.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Последние ~10000 блоков
      
      // Читаем события
      for (const eventName of eventsToFetch) {
        const filter = this.contracts.globalWay.filters[eventName](address);
        const events = await this.contracts.globalWay.queryFilter(filter, fromBlock, currentBlock);
        
        for (const event of events) {
          const block = await event.getBlock();
          
          transactions.push({
            hash: event.transactionHash,
            type: eventName,
            blockNumber: event.blockNumber,
            timestamp: block.timestamp,
            args: event.args
          });
        }
      }
      
      // Сортировка по времени (новые первые)
      transactions.sort((a, b) => b.timestamp - a.timestamp);
      
      // Ограничение
      return transactions.slice(0, limit);
      
    } catch (error) {
      console.error('getEventsFromBlockchain error:', error);
      return [];
    }
  }

  // ==========================================
  // ADMIN FUNCTIONS - АДМИНИСТРАТИВНЫЕ
  // ==========================================

  /**
   * Бесплатная регистрация (только Owner/Founders)
   */
  async freeRegister(userAddress, sponsorAddress) {
    try {
      if (!web3Manager.isAdmin()) {
        throw new Error('Only admin can perform free registration');
      }
      
      console.log('👑 Free registration...');
      console.log('  User:', userAddress);
      console.log('  Sponsor:', sponsorAddress);
      
      // 🔥 ИСПРАВЛЕНО: Убрали жесткий gasLimit
      const tx = await this.contracts.globalWay.freeRegister(userAddress, sponsorAddress);
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Free registration successful');
      
      return receipt;
    } catch (error) {
      console.error('❌ Free registration failed:', error);
      throw error;
    }
  }

  /**
   * Блокировка пользователя
   */
  async blockUser(userAddress, reason) {
    try {
      if (!web3Manager.isAdmin()) {
        throw new Error('Only admin can block users');
      }
      
      console.log('🚫 Blocking user...');
      console.log('  Address:', userAddress);
      console.log('  Reason:', reason);
      
      const tx = await this.contracts.globalWay.blockUser(userAddress, reason);
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ User blocked');
      
      return receipt;
    } catch (error) {
      console.error('❌ Block user failed:', error);
      throw error;
    }
  }

  /**
   * Разблокировка пользователя
   */
  async unblockUser(userAddress) {
    try {
      if (!web3Manager.isAdmin()) {
        throw new Error('Only admin can unblock users');
      }
      
      console.log('✅ Unblocking user...');
      console.log('  Address:', userAddress);
      
      const tx = await this.contracts.globalWay.unblockUser(userAddress);
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ User unblocked');
      
      return receipt;
    } catch (error) {
      console.error('❌ Unblock user failed:', error);
      throw error;
    }
  }

  /**
   * Присвоение кастомного ID
   */
  async assignCustomId(userAddress, customId) {
    try {
      if (!web3Manager.isOwner()) {
        throw new Error('Only owner can assign custom IDs');
      }
      
      console.log('🆔 Assigning custom ID...');
      console.log('  Address:', userAddress);
      console.log('  ID:', customId);
      
      const tx = await this.contracts.globalWay.assignCustomId(userAddress, customId);
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Custom ID assigned');
      
      return receipt;
    } catch (error) {
      console.error('❌ Assign ID failed:', error);
      throw error;
    }
  }

  /**
   * Пауза контракта
   */
  async pauseContract() {
    try {
      if (!web3Manager.isOwner()) {
        throw new Error('Only owner can pause contract');
      }
      
      console.log('⏸️ Pausing contract...');
      
      const tx = await this.contracts.globalWay.pause();
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Contract paused');
      
      return receipt;
    } catch (error) {
      console.error('❌ Pause failed:', error);
      throw error;
    }
  }

  /**
   * Снятие паузы контракта
   */
  async unpauseContract() {
    try {
      if (!web3Manager.isOwner()) {
        throw new Error('Only owner can unpause contract');
      }
      
      console.log('▶️ Unpausing contract...');
      
      const tx = await this.contracts.globalWay.unpause();
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Contract unpaused');
      
      return receipt;
    } catch (error) {
      console.error('❌ Unpause failed:', error);
      throw error;
    }
  }

  /**
   * Аварийный вывод средств
   */
  async emergencyWithdraw() {
    try {
      if (!web3Manager.isOwner()) {
        throw new Error('Only owner can perform emergency withdrawal');
      }
      
      if (!confirm('⚠️ EMERGENCY WITHDRAWAL\n\nThis will withdraw ALL funds from the contract!\n\nAre you absolutely sure?')) {
        throw new Error('Emergency withdrawal cancelled');
      }
      
      console.log('🚨 Emergency withdrawal...');
      
      const tx = await this.contracts.globalWay.emergencyWithdraw();
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Emergency withdrawal complete');
      
      return receipt;
    } catch (error) {
      console.error('❌ Emergency withdrawal failed:', error);
      throw error;
    }
  }

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================

  /**
   * Получить адрес по ID пользователя
   */
  async getAddressByUserId(userId) {
    try {
      return await this.contracts.globalWay.getAddressByUserId(userId);
    } catch (error) {
      console.error('getAddressByUserId error:', error);
      return ethers.constants.AddressZero;
    }
  }

  /**
   * Проверка валидности контрактов
   */
  isInitialized() {
    return this.initialized && Object.keys(this.contracts).length > 0;
  }

  /**
   * Получить контракт по имени
   */
  getContract(name) {
    return this.contracts[name];
  }

  /**
   * Получить все активные уровни пользователя
   */
  async getAllActiveLevels(address) {
    try {
      const activeLevels = [];
      
      for (let level = 1; level <= 12; level++) {
        const isActive = await this.isLevelActive(address, level);
        if (isActive) {
          activeLevels.push(level);
        }
      }
      
      return activeLevels;
    } catch (error) {
      console.error('getAllActiveLevels error:', error);
      return [];
    }
  }

  /**
   * Проверка можно ли купить уровень
   */
  async canBuyLevel(address, level) {
    try {
      // Уровень 1 всегда можно купить
      if (level === 1) {
        const isActive = await this.isLevelActive(address, 1);
        return !isActive;
      }
      
      // Для остальных уровней нужен предыдущий
      const previousActive = await this.isLevelActive(address, level - 1);
      const currentActive = await this.isLevelActive(address, level);
      
      return previousActive && !currentActive;
    } catch (error) {
      console.error('canBuyLevel error:', error);
      return false;
    }
  }
}

// Создать глобальный экземпляр
const contracts = new ContractsManager();

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContractsManager;
}
