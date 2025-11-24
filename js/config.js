// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Configuration
// opBNB Mainnet (Chain ID: 204)
// Deployed: November 24, 2025
// ═══════════════════════════════════════════════════════════════════

const CONFIG = {
  // ═══════════════════════════════════════════════════════════════
  // NETWORK
  // ═══════════════════════════════════════════════════════════════
  NETWORK: {
    name: 'opBNB Mainnet',
    chainId: 204,
    chainIdHex: '0xCC',
    rpcUrl: 'https://opbnb-mainnet-rpc.bnbchain.org',
    blockExplorer: 'https://opbnbscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // SMART CONTRACTS ADDRESSES - ФИНАЛЬНЫЙ ДЕПЛОЙ 25.11.2025
  // ═══════════════════════════════════════════════════════════════
  CONTRACTS: {
    GWTToken: '0x542Ca6F390ad8ab73C9BA10d9e3CE4FDFfda2261',
    MatrixRegistry: '0x36ffc948b4c81aB941b23ba5Ce1feEbF1673fFE0',
    GlobalWay: '0xad1519AD4351dd22b6e97637b06053eBED65d475',
    PartnerProgram: '0xc005b178C6D5c695085D7C9BD38cDEC91CEcF1B3',
    MatrixPayments: '0x25437453c67938a0D340Ab62c70Cfb5e1Ceb72e2',
    QuarterlyPayments: '0xD3E69A69c31A3f4Acf24C5eE78D946A9B64F844d',
    GlobalWayInvestment: '0xaF43e7A232dCb3DAF1c923d081ea8567aA9DB25a',
    GlobalWayLeaderPool: '0x070CD1F46c1d8a8fCa52baf1a5Ab58e1437a4B76',
    GlobalWayGovernance: '0xBf6b247933CD5Cd7F144A218b879A986fB008029',
    GlobalWayBridge: '0x398C03828cA494e2125B2aFE284af9A255e0f56a',
    GlobalWayStats: '0x27815548acf27d5B53462615151eFc3Ab7F4FD7e'
  },

  // ═══════════════════════════════════════════════════════════════
  // ROOT ID - ДЛЯ ПЕРВЫХ РЕГИСТРАЦИЙ
  // ═══════════════════════════════════════════════════════════════
  ROOT_ID: '7622603',

  // ═══════════════════════════════════════════════════════════════
  // ABI FILES - Относительные пути от js/config.js
  // ═══════════════════════════════════════════════════════════════
  ABI_PATHS: {
    GWTToken: '../contracts/abis/GWTToken.json',
    MatrixRegistry: '../contracts/abis/MatrixRegistry.json',
    MatrixPayments: '../contracts/abis/MatrixPayments.json',
    GlobalWay: '../contracts/abis/GlobalWay.json',
    PartnerProgram: '../contracts/abis/PartnerProgram.json',
    QuarterlyPayments: '../contracts/abis/QuarterlyPayments.json',
    GlobalWayInvestment: '../contracts/abis/GlobalWayInvestment.json',
    GlobalWayLeaderPool: '../contracts/abis/GlobalWayLeaderPool.json',
    GlobalWayGovernance: '../contracts/abis/GlobalWayGovernance.json',
    GlobalWayStats: '../contracts/abis/GlobalWayStats.json',
    GlobalWayBridge: '../contracts/abis/GlobalWayBridge.json'
  },

  // ═══════════════════════════════════════════════════════════════
  // LEVEL PRICES (в BNB)
  // ═══════════════════════════════════════════════════════════════
  LEVEL_PRICES: [
    '0.0015',  // Level 1
    '0.003',   // Level 2
    '0.006',   // Level 3
    '0.012',   // Level 4
    '0.024',   // Level 5
    '0.048',   // Level 6
    '0.096',   // Level 7
    '0.192',   // Level 8
    '0.384',   // Level 9
    '0.768',   // Level 10
    '1.536',   // Level 11
    '3.072'    // Level 12
  ],

  // ═══════════════════════════════════════════════════════════════
  // TOKEN REWARDS (GWT за каждый уровень)
  // ═══════════════════════════════════════════════════════════════
  TOKEN_REWARDS: [
    5,      // Level 1  -> 5 GWT
    5,      // Level 2  -> 5 GWT
    10,     // Level 3  -> 10 GWT
    15,     // Level 4  -> 15 GWT
    35,     // Level 5  -> 35 GWT
    75,     // Level 6  -> 75 GWT
    150,    // Level 7  -> 150 GWT
    300,    // Level 8  -> 300 GWT
    600,    // Level 9  -> 600 GWT
    1200,   // Level 10 -> 1200 GWT
    2400,   // Level 11 -> 2400 GWT
    4500    // Level 12 -> 4500 GWT
  ],

  // ═══════════════════════════════════════════════════════════════
  // QUARTERLY PAYMENT (в BNB)
  // ═══════════════════════════════════════════════════════════════
  QUARTERLY_COST: '0.075',
  QUARTERLY_PERIOD: 90, // дней

  // ═══════════════════════════════════════════════════════════════
  // RANK LEVELS
  // ═══════════════════════════════════════════════════════════════
  RANKS: {
    NONE: { id: 0, name: 'Никто', maxLevel: 0 },
    BRONZE: { id: 1, name: 'Бронза 🥉', maxLevel: 4 },
    SILVER: { id: 2, name: 'Серебро 🥈', maxLevel: 7 },
    GOLD: { id: 3, name: 'Золото 🥇', maxLevel: 10 },
    PLATINUM: { id: 4, name: 'Платина 💎', maxLevel: 12 }
  },

  // ═══════════════════════════════════════════════════════════════
  // ADMIN
  // ═══════════════════════════════════════════════════════════════
  ADMIN: {
    owner: '0x7bCD1753868895971E12448412cB3216d47884c8',
    
    guardians: [
      '0x48635e0ad72cf5e8e8ad722fd7d823ec7cb197d1',
      '0xde4fb5fb406c6356247bea6b4822b9b2e2c7fccf',
      '0x5e2572d9a414667babcd5c7b59ca643b09e48e46'
    ],
    
    directors: [
      '0x48635e0ad72cf5e8e8ad722fd7d823ec7cb197d1',
      '0xde4fb5fb406c6356247bea6b4822b9b2e2c7fccf',
      '0x5e2572d9a414667babcd5c7b59ca643b09e48e46',
      '0x3Faa7fB3698D746AdA965Cae9d8e133BEf1fBc01',
      '0x3f7ED3960147a3A6f23B52D5707160Be0951F863',
      '0x372d4c15bfd4e28241399853ab2ad59ef837e44d'
    ],
    
    treasury: '0x11dac11d92147b70b03e43a9c02fffe4ec366bc7',
    charity: '0x81d94f0b3252148f55bb77464041eb90c6d97439',
    tokenomics: '0xcfefcd8080b3109314aa0a211b7ba00f9cc8e380',
    development: '0xfdb4e5da1de4a108812b54fb5386da410fd26825'
  },

  // ═══════════════════════════════════════════════════════════════
  // UI SETTINGS
  // ═══════════════════════════════════════════════════════════════
  UI: {
    notificationDuration: 3000,
    refreshInterval: 30000,
    maxRecentTransactions: 50,
    defaultLanguage: 'ru'
  },

  // ═══════════════════════════════════════════════════════════════
  // CACHE SETTINGS
  // ═══════════════════════════════════════════════════════════════
  CACHE: {
    tokenPriceDuration: 30000,
    userDataDuration: 10000,
    statsDataDuration: 60000
  },

  // ═══════════════════════════════════════════════════════════════
  // GAS SETTINGS
  // ═══════════════════════════════════════════════════════════════
  GAS: {
    register: 500000,
    buyLevel: 800000,
    payQuarterly: 800000,
    withdraw: 300000,
    defaultGasPrice: '0.001',
    maxGasPrice: '0.01'
  },

  // ═══════════════════════════════════════════════════════════════
  // FEATURES FLAGS
  // ═══════════════════════════════════════════════════════════════
  FEATURES: {
    enableAutoRegister: true,
    enableQuarterlyPayments: true,
    enableTokenRewards: true,
    enableVoting: true,
    enableBridge: true,
    debugMode: false
  },

  // ═══════════════════════════════════════════════════════════════
  // VOTING SYSTEM
  // ═══════════════════════════════════════════════════════════════
  VOTING: {
    totalGuardians: 3,
    requiredVotesGovernance: 3,
    totalDirectors: 6,
    requiredVotesBridge: 4,
    votingPeriod: 7 * 24 * 60 * 60,
    quorum: 3
  },

  // ═══════════════════════════════════════════════════════════════
  // EXTERNAL LINKS
  // ═══════════════════════════════════════════════════════════════
  LINKS: {
    telegram: 'https://t.me/globalway_official',
    twitter: 'https://twitter.com/globalway_club',
    documentation: 'https://docs.globalway.club',
    support: 'https://support.globalway.club',
    whitepaper: 'https://globalway.club/whitepaper.pdf'
  },

  // ═══════════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════════
  VALIDATION: {
    minSponsorLevel: 1,
    minWithdrawAmount: '0.001',
    maxLevels: 12
  }
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

CONFIG.getContractAddress = function(contractName) {
  return this.CONTRACTS[contractName];
};

CONFIG.getABIPath = function(contractName) {
  return this.ABI_PATHS[contractName];
};

CONFIG.getLevelPrice = function(level) {
  if (level < 1 || level > 12) return null;
  return this.LEVEL_PRICES[level - 1];
};

CONFIG.getTokenReward = function(level) {
  if (level < 1 || level > 12) return 0;
  return this.TOKEN_REWARDS[level - 1];
};

CONFIG.getRankByLevel = function(maxLevel) {
  if (maxLevel >= 12) return this.RANKS.PLATINUM;
  if (maxLevel >= 10) return this.RANKS.GOLD;
  if (maxLevel >= 7) return this.RANKS.SILVER;
  if (maxLevel >= 4) return this.RANKS.BRONZE;
  return this.RANKS.NONE;
};

CONFIG.hasAdminAccess = function(address) {
  const addr = address.toLowerCase();
  return addr === this.ADMIN.owner.toLowerCase() ||
         this.ADMIN.guardians.some(g => g.toLowerCase() === addr);
};

CONFIG.isGuardian = function(address) {
  const addr = address.toLowerCase();
  return this.ADMIN.guardians.some(g => g.toLowerCase() === addr);
};

CONFIG.isDirector = function(address) {
  const addr = address.toLowerCase();
  return this.ADMIN.directors.some(d => d.toLowerCase() === addr);
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
