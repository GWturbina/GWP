/* jshint esversion: 8 */
/* global CONFIG, web3Manager, ethers, Utils */

/**
 * GlobalWay Contracts Manager
 * Інтеграція всіх 10 смарт-контрактів
 * 
 * Контракти:
 * 1. GWTToken - Токен GWT (ERC20)
 * 2. GlobalWay - Головний контракт (реєстрація, рівні, матриця)
 * 3. GlobalWayMarketing - Маркетинговий пул (25% від продажів)
 * 4. GlobalWayLeaderPool - Лідерський пул (5% розподіл по рангах)
 * 5. GlobalWayInvestment - Інвестиційний пул
 * 6. GlobalWayQuarterly - Квартальна активність
 * 7. GlobalWayTechAccounts - Технічні аккаунти
 * 8. GlobalWayBridge - Міст проектів
 * 9. GlobalWayStats - Статистика
 * 10. GlobalWayGovernance - Управління
 */

class ContractsManager {
  constructor() {
    this.contracts = {};
    this.abis = null;
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
      // Завантажити окремі ABI файли
      console.log('📥 Loading ABI files from /contracts/abis/...');
      
      const abiFiles = [
        { key: 'gwtToken', name: 'GWTToken', file: 'GWTToken.json' },
        { key: 'globalWay', name: 'GlobalWay', file: 'GlobalWay.json' },
        { key: 'marketing', name: 'GlobalWayMarketing', file: 'GlobalWayMarketing.json' },
        { key: 'leaderPool', name: 'GlobalWayLeaderPool', file: 'GlobalWayLeaderPool.json' },
        { key: 'investment', name: 'GlobalWayInvestment', file: 'GlobalWayInvestment.json' },
        { key: 'quarterly', name: 'GlobalWayQuarterly', file: 'GlobalWayQuarterly.json' },
        { key: 'techAccounts', name: 'GlobalWayTechAccounts', file: 'GlobalWayTechAccounts.json' },
        { key: 'bridge', name: 'GlobalWayBridge', file: 'GlobalWayBridge.json' },
        { key: 'stats', name: 'GlobalWayStats', file: 'GlobalWayStats.json' },
        { key: 'governance', name: 'GlobalWayGovernance', file: 'GlobalWayGovernance.json' }
      ];

      // Завантажити всі ABI
      for (const contract of abiFiles) {
        try {
          const response = await fetch(`./contracts/abis/${contract.file}`);
          if (!response.ok) {
            console.error(`❌ Failed to load ${contract.file}: HTTP ${response.status}`);
            throw new Error(`Failed to load ${contract.file}`);
          }
          
          const abiData = await response.json();
          const abi = abiData.abi || abiData; // Підтримка {abi:[]} або []
          
          console.log(`📋 Loaded ${contract.name} ABI (${abi.length} items)`);
          
          await this.initializeContract(contract.key, contract.name, abi);
          
        } catch (error) {
          console.error(`❌ Failed to initialize ${contract.name}:`, error);
          throw error;
        }
      }

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
  async initializeContract(key, name, abi) {
    try {
      const address = CONFIG.CONTRACTS[name] || CONFIG.CONTRACTS[name.toUpperCase()] || CONFIG.CONTRACTS[key] || CONFIG.CONTRACTS[key.toUpperCase()];
      
      if (!address) {
        throw new Error(`Address not found for ${name} in CONFIG.CONTRACTS`);
      }

      if (!ethers.utils.isAddress(address)) {
        throw new Error(`Invalid address for ${name}: ${address}`);
      }

      this.contracts[key] = new ethers.Contract(
        address,
        abi,
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
      
      // Структура: [isActive, refAddress, registrationTime, lastActivityTime, activeLevel, ???]
      return {
        isActive: user[0] || false,
        refAddress: user[1] || ethers.constants.AddressZero,
        registrationTime: user[2] ? user[2].toNumber() : 0,
        lastActivityTime: user[3] ? user[3].toNumber() : 0,
        activeLevel: user[4] ? user[4].toNumber() : 0,
        id: '',  // Немає в масиві
        sponsorId: '',  // Немає в масиві
        rankLevel: 0,  // Немає в масиві
        partnersCount: 0,  // Немає в масиві
        isBlocked: false
      };
    } catch (error) {
      console.error('getUserInfo error:', error);
      throw error;
    }
  }

  /**
   * Отримати інформацію про рівень користувача
   */
  async getUserLevel(address, level) {
    try {
      const levelInfo = await this.contracts.globalWay.getUserLevelInfo(address, level);
      
      return {
        isActive: levelInfo.isActive || false,
        activationTime: levelInfo.activationTime ? levelInfo.activationTime.toNumber() : 0,
        reactivations: levelInfo.reactivations || 0,
        partnersCount: levelInfo.partnersCount || 0,
        cyclesCount: levelInfo.cyclesCount || 0
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
        gasLimit: 500000
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
        gasLimit: 500000
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
      // Розрахувати загальну ціну
      let totalPrice = ethers.BigNumber.from(0);
      for (let i = 0; i < upToLevel; i++) {
        totalPrice = totalPrice.add(ethers.utils.parseEther(CONFIG.LEVEL_PRICES[i]));
      }
      
      console.log(`📝 Buying Levels 1-${upToLevel}`);
      console.log('💰 Total payment:', ethers.utils.formatEther(totalPrice), 'BNB');
      
      const tx = await this.contracts.globalWay.activateBulkLevels(upToLevel, {
        value: totalPrice,
        gasLimit: 1000000
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
   * Отримати адресу по User ID
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
   * Отримати матрицю користувача
   */
  async getUserMatrix(address, level) {
    try {
      // GlobalWay може мати функцію getUserMatrixPositions або подібну
      // Якщо немає - читаємо з events або структури
      const matrix = await this.contracts.globalWay.getUserMatrixPositions(address, level);
      return matrix;
    } catch (error) {
      console.error('getUserMatrix error:', error);
      // Повертаємо пусту матрицю 1-2-4 (7 позицій)
      return new Array(7).fill(ethers.constants.AddressZero);
    }
  }

  /**
   * Отримати партнерів користувача на рівні
   */
  async getUserPartners(address, level) {
    try {
      return await this.contracts.globalWay.getUserPartners(address, level);
    } catch (error) {
      console.error('getUserPartners error:', error);
      return [];
    }
  }

  /**
   * Отримати статистику команди
   */
  async getTeamStats(address) {
    try {
      const stats = await this.contracts.globalWay.getTeamStats(address);
      
      return {
        personalInvites: stats.personalInvites || 0,
        activePartners: stats.activePartners || 0,
        totalTeamSize: stats.totalTeamSize || 0
      };
    } catch (error) {
      console.error('getTeamStats error:', error);
      return {
        personalInvites: 0,
        activePartners: 0,
        totalTeamSize: 0
      };
    }
  }

  /**
   * Отримати інформацію про ранг
   */
  async getUserRankInfo(address) {
    try {
      const rankInfo = await this.contracts.globalWay.getUserRank(address);
      
      return {
        currentRank: rankInfo.currentRank || 0,
        qualifiedPartners: rankInfo.qualifiedPartners || 0,
        teamVolume: rankInfo.teamVolume || ethers.BigNumber.from(0)
      };
    } catch (error) {
      console.error('getUserRankInfo error:', error);
      return {
        currentRank: 0,
        qualifiedPartners: 0,
        teamVolume: ethers.BigNumber.from(0)
      };
    }
  }

  // ==========================================
  // QUARTERLY - Квартальна активність
  // ==========================================

  /**
   * Отримати інформацію про квартальні платежі
   */
  async getQuarterlyInfo(address) {
    try {
      const info = await this.contracts.quarterly.getUserQuarterlyInfo(address);
      
      return {
        lastPaymentTime: info.lastPaymentTime ? info.lastPaymentTime.toNumber() : 0,
        nextPaymentDue: info.nextPaymentDue ? info.nextPaymentDue.toNumber() : 0,
        currentQuarter: info.currentQuarter || 1,
        isPaid: info.isPaid || false,
        totalPaid: info.totalPaid || 0
      };
    } catch (error) {
      console.error('getQuarterlyInfo error:', error);
      return {
        lastPaymentTime: 0,
        nextPaymentDue: 0,
        currentQuarter: 1,
        isPaid: false,
        totalPaid: 0
      };
    }
  }

  /**
   * Оплата квартальної активності
   */
  async payQuarterlyActivity() {
    try {
      const fee = ethers.utils.parseEther(CONFIG.QUARTERLY_COST);
      
      console.log('📝 Paying quarterly activity');
      console.log('💰 Payment:', CONFIG.QUARTERLY_COST, 'BNB');
      
      const tx = await this.contracts.quarterly.payQuarterlyActivity({
        value: fee,
        gasLimit: 300000
      });
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Quarterly activity paid');
      
      return receipt;
    } catch (error) {
      console.error('❌ Quarterly payment failed:', error);
      throw error;
    }
  }

  /**
   * Перевірка чи може оплатити квартальну активність
   */
  async canPayQuarterly(address) {
    try {
      return await this.contracts.quarterly.canPayQuarterly(address);
    } catch (error) {
      console.error('canPayQuarterly error:', error);
      return false;
    }
  }

  // ==========================================
  // MARKETING POOL - Маркетинговий пул
  // ==========================================

  /**
   * Отримати баланс користувача в Marketing Pool
   */
  async getMarketingBalance(address) {
    try {
      const balances = await this.contracts.marketing.getUserBalances(address);
      return balances.availableBalance || ethers.BigNumber.from(0);
    } catch (error) {
      console.error('getMarketingBalance error:', error);
      return ethers.BigNumber.from(0);
    }
  }

  /**
   * Отримати заморожені кошти
   */
  async getFrozenFunds(address) {
    try {
      const frozen = await this.contracts.marketing.getFrozenFunds(address);
      return {
        amount: frozen.amount || ethers.BigNumber.from(0),
        unfreezeTime: frozen.unfreezeTime ? frozen.unfreezeTime.toNumber() : 0
      };
    } catch (error) {
      console.error('getFrozenFunds error:', error);
      return {
        amount: ethers.BigNumber.from(0),
        unfreezeTime: 0
      };
    }
  }

  /**
   * Виведення з Marketing Pool
   */
  async withdrawMarketing() {
    try {
      console.log('📝 Withdrawing from Marketing Pool');
      
      const tx = await this.contracts.marketing.withdraw({
        gasLimit: 300000
      });
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Withdrawal successful');
      
      return receipt;
    } catch (error) {
      console.error('❌ Marketing withdrawal failed:', error);
      throw error;
    }
  }

  // ==========================================
  // LEADER POOL - Лідерський пул
  // ==========================================

  /**
   * Отримати баланс у Leader Pool
   */
  async getLeaderBalance(address) {
    try {
      const balances = await this.contracts.leaderPool.getUserBalances(address);
      return balances.pendingRewards || ethers.BigNumber.from(0);
    } catch (error) {
      console.error('getLeaderBalance error:', error);
      return ethers.BigNumber.from(0);
    }
  }

  /**
   * Виведення з Leader Pool
   */
  async withdrawLeader() {
    try {
      console.log('📝 Withdrawing from Leader Pool');
      
      const tx = await this.contracts.leaderPool.claimRewards({
        gasLimit: 300000
      });
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Withdrawal successful');
      
      return receipt;
    } catch (error) {
      console.error('❌ Leader withdrawal failed:', error);
      throw error;
    }
  }

  /**
   * Отримати статистику Leader Pool
   */
  async getLeaderPoolStats() {
    try {
      return await this.contracts.leaderPool.getPoolStats();
    } catch (error) {
      console.error('getLeaderPoolStats error:', error);
      return {
        totalDistributed: ethers.BigNumber.from(0),
        totalParticipants: 0,
        lastDistributionTime: 0
      };
    }
  }

  // ==========================================
  // INVESTMENT POOL - Інвестиційний пул
  // ==========================================

  /**
   * Отримати баланс в Investment Pool
   */
  async getInvestmentBalance(address) {
    try {
      const info = await this.contracts.investment.getInvestorInfo(address);
      return info.pendingRewards || ethers.BigNumber.from(0);
    } catch (error) {
      console.error('getInvestmentBalance error:', error);
      return ethers.BigNumber.from(0);
    }
  }

  /**
   * Виведення з Investment Pool
   */
  async withdrawInvestment() {
    try {
      console.log('📝 Withdrawing from Investment Pool');
      
      const tx = await this.contracts.investment.claimRewards({
        gasLimit: 300000
      });
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Withdrawal successful');
      
      return receipt;
    } catch (error) {
      console.error('❌ Investment withdrawal failed:', error);
      throw error;
    }
  }

  // ==========================================
  // GWT TOKEN - Токен
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
   * Отримати ціну токена
   */
  async getTokenPrice() {
    try {
      const price = await this.contracts.gwtToken.getCurrentPrice();
      return price;
    } catch (error) {
      console.error('getTokenPrice error:', error);
      return ethers.BigNumber.from(0);
    }
  }

  /**
   * Отримати загальну емісію
   */
  async getTotalSupply() {
    try {
      return await this.contracts.gwtToken.totalSupply();
    } catch (error) {
      console.error('getTotalSupply error:', error);
      return ethers.BigNumber.from(0);
    }
  }

  /**
   * Отримати спалені токени
   */
  async getBurnedTokens() {
    try {
      return await this.contracts.gwtToken.totalBurned();
    } catch (error) {
      console.error('getBurnedTokens error:', error);
      return ethers.BigNumber.from(0);
    }
  }

  /**
   * Купівля токенів
   */
  async buyTokens(amount) {
    try {
      const amountWei = ethers.utils.parseEther(amount.toString());
      const price = await this.getTokenPrice();
      const cost = amountWei.mul(price).div(ethers.utils.parseEther('1'));
      
      console.log('📝 Buying tokens:', amount, 'GWT');
      console.log('💰 Cost:', ethers.utils.formatEther(cost), 'BNB');
      
      const tx = await this.contracts.gwtToken.buyTokens(amountWei, {
        value: cost,
        gasLimit: 300000
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
   * Продаж токенів
   */
  async sellTokens(amount) {
    try {
      const amountWei = ethers.utils.parseEther(amount.toString());
      
      console.log('📝 Selling tokens:', amount, 'GWT');
      
      const tx = await this.contracts.gwtToken.sellTokens(amountWei, {
        gasLimit: 300000
      });
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Tokens sold');
      
      return receipt;
    } catch (error) {
      console.error('❌ Token sale failed:', error);
      throw error;
    }
  }

  // ==========================================
  // STATS - Статистика
  // ==========================================

  /**
   * Отримати глобальну статистику
   */
  async getGlobalStats() {
    try {
      const stats = await this.contracts.stats.getGlobalStats();
      
      return {
        totalUsers: stats.totalUsers || 0,
        totalVolume: stats.totalVolume || ethers.BigNumber.from(0),
        totalLevelsActivated: stats.totalLevelsActivated || 0,
        totalWithdrawn: stats.totalWithdrawn || ethers.BigNumber.from(0)
      };
    } catch (error) {
      console.error('getGlobalStats error:', error);
      return {
        totalUsers: 0,
        totalVolume: ethers.BigNumber.from(0),
        totalLevelsActivated: 0,
        totalWithdrawn: ethers.BigNumber.from(0)
      };
    }
  }

  /**
   * Отримати повну статистику користувача
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
   * Отримати огляд контракту для Admin панелі
   */
  async getContractOverview() {
    try {
      const globalStats = await this.getGlobalStats();
      const contractBalance = await web3Manager.provider.getBalance(
        CONFIG.CONTRACTS.GlobalWay
      );
      
      return {
        totalUsers: globalStats.totalUsers,
        contractBalance: contractBalance,
        totalVolume: globalStats.totalVolume,
        totalLevelsActivated: globalStats.totalLevelsActivated
      };
    } catch (error) {
      console.error('getContractOverview error:', error);
      return {
        totalUsers: 0,
        contractBalance: ethers.BigNumber.from(0),
        totalVolume: ethers.BigNumber.from(0),
        totalLevelsActivated: 0
      };
    }
  }

  // ==========================================
  // BRIDGE - Міст проектів
  // ==========================================

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
   * Отримати активні проекти
   */
  async getActiveProjectsCount() {
    try {
      return await this.contracts.bridge.getActiveProjectsCount();
    } catch (error) {
      console.error('getActiveProjectsCount error:', error);
      return 0;
    }
  }

  /**
   * Отримати проект по ID
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
  // GOVERNANCE - Управління
  // ==========================================

  /**
   * Отримати список board members
   */
  async getBoardMembers() {
    try {
      const directors = await this.contracts.governance.getDirectors();
      return directors || [];
    } catch (error) {
      console.error('getBoardMembers error:', error);
      return [];
    }
  }

  /**
   * Додати board member (тільки Owner)
   */
  async addBoardMember(address) {
    try {
      console.log('📝 Adding board member:', address);
      
      const tx = await this.contracts.governance.addDirector(address, {
        gasLimit: 200000
      });
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Board member added');
      
      return receipt.transactionHash;
    } catch (error) {
      console.error('❌ Add board member failed:', error);
      throw error;
    }
  }

  /**
   * Видалити board member (потребує голосування)
   */
  async removeBoardMember(address) {
    try {
      console.log('📝 Removing board member:', address);
      
      const tx = await this.contracts.governance.removeDirector(address, {
        gasLimit: 200000
      });
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Board member removed');
      
      return receipt.transactionHash;
    } catch (error) {
      console.error('❌ Remove board member failed:', error);
      throw error;
    }
  }

  /**
   * Створити пропозицію на виведення коштів
   */
  async createWithdrawalProposal(recipient, amount, poolType, note) {
    try {
      console.log('📝 Creating withdrawal proposal');
      console.log('To:', recipient);
      console.log('Amount:', ethers.utils.formatEther(amount), 'BNB');
      console.log('Pool:', poolType);
      
      const tx = await this.contracts.governance.createWithdrawalProposal(
        recipient,
        amount,
        poolType,
        note,
        {
          gasLimit: 300000
        }
      );
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Proposal created');
      
      return receipt;
    } catch (error) {
      console.error('❌ Create proposal failed:', error);
      throw error;
    }
  }

  // ==========================================
  // ADMIN FUNCTIONS
  // ==========================================

  /**
   * Безкоштовна реєстрація (тільки Owner/Founders)
   */
  async freeRegister(address, sponsorAddress) {
    try {
      console.log('📝 Free registration');
      console.log('Address:', address);
      console.log('Sponsor:', sponsorAddress);
      
      const tx = await this.contracts.globalWay.freeRegister(address, sponsorAddress, {
        gasLimit: 500000
      });
      
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
   * Пауза контракту (тільки Owner)
   */
  async pauseContract() {
    try {
      const tx = await this.contracts.globalWay.pause({
        gasLimit: 100000
      });
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('pauseContract error:', error);
      throw error;
    }
  }

  /**
   * Відновити контракт (тільки Owner)
   */
  async unpauseContract() {
    try {
      const tx = await this.contracts.globalWay.unpause({
        gasLimit: 100000
      });
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('unpauseContract error:', error);
      throw error;
    }
  }

  /**
   * Підключити проект (тільки Owner)
   */
  async connectProject(projectId, contractAddress) {
    try {
      const tx = await this.contracts.bridge.addProject(projectId, contractAddress, {
        gasLimit: 200000
      });
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('connectProject error:', error);
      throw error;
    }
  }

  /**
   * Відключити проект (тільки Owner)
   */
  async disconnectProject(projectId) {
    try {
      const tx = await this.contracts.bridge.deactivateProject(projectId, {
        gasLimit: 200000
      });
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('disconnectProject error:', error);
      throw error;
    }
  }

  /**
   * Призначити User ID (тільки Owner)
   */
  async assignUserId(address, userId) {
    try {
      const tx = await this.contracts.globalWay.assignCustomId(address, userId, {
        gasLimit: 200000
      });
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('assignUserId error:', error);
      throw error;
    }
  }

  /**
   * Аварійне виведення (тільки Owner)
   */
  async emergencyWithdraw() {
    try {
      const tx = await this.contracts.globalWay.emergencyWithdraw({
        gasLimit: 300000
      });
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('emergencyWithdraw error:', error);
      throw error;
    }
  }

  /**
   * Обробити неактивних користувачів
   */
  async processInactiveUsers() {
    try {
      const tx = await this.contracts.quarterly.processInactiveUsers({
        gasLimit: 500000
      });
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('processInactiveUsers error:', error);
      throw error;
    }
  }

  /**
   * Заблокувати користувача (тільки Owner)
   */
  async blockUser(address, reason) {
    try {
      const tx = await this.contracts.globalWay.blockUser(address, reason, {
        gasLimit: 200000
      });
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('blockUser error:', error);
      throw error;
    }
  }

  /**
   * Замінити адресу користувача (тільки Owner)
   */
  async replaceUserAddress(oldAddress, newAddress) {
    try {
      const tx = await this.contracts.globalWay.replaceAddress(oldAddress, newAddress, {
        gasLimit: 300000
      });
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('replaceUserAddress error:', error);
      throw error;
    }
  }
}

// Створити глобальний екземпляр
const contracts = new ContractsManager();
