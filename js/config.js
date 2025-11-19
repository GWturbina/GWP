// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Configuration
// opBNB Mainnet (Chain ID: 204)
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
  // SMART CONTRACTS ADDRESSES
  // ═══════════════════════════════════════════════════════════════
  CONTRACTS: {
    // Core системный контракт
    GlobalWay: '0x742F2200BAb0c175c107c576E3Eb9E5A8ab7Ba4b',
    
    // Registry & Matrix
    MatrixRegistry: '0x1EFa7cfB85c101b523C1d3e502BB855a1f8915fc',
    MatrixPayments: '0x5fD0CA4BF93C31F186B5e846FC5863E84dEeE27f',
    
    // Payment Systems
    PartnerProgram: '0x8B01C9FCD9Afd87d69F8F9b5A0Fe2B020D50Dc1A',
    QuarterlyPayments: '0x51E8a64BE6E55A563c1BB73b203DE2EB6B83f7a3',
    
    // Pools
    InvestmentPool: '0x8f30D312fA5F8E6A30D6c1C6F6e0a73c535c358c',
    LeaderPool: '0xC0992D079D123D3c69C98B3Be71978C2e93b5710',
    
    // Token
    GWTToken: '0x2E3B2c4227575296b8CE68D1fa186aC8941D8C86',
    
    // Управление и статистика
    GlobalWayGovernance: '0xdFC8426F64CE058758652dF47aC3Ba06D77e228b',
    GlobalWayStats: '0x92b0Fd7cc3926aE08CEcD1Ca2C99e1df28Cf9c0e',
    GlobalWayBridge: '0x9C6eb5c63F5d1eCC8Ad27EA773F0a70cE0bC7d6F',
    
    // Tokenomics
    GlobalWayTokenomics: '0xbDC29886c91878C1ba9ce0626Da5E1961324354F'
  },

  // ═══════════════════════════════════════════════════════════════
  // ABI FILES - Пути к отдельным ABI файлам на хостинге
  // ═══════════════════════════════════════════════════════════════
  ABI_PATHS: {
    GlobalWay: './contracts/abis/GlobalWay.json',
    MatrixRegistry: './contracts/abis/MatrixRegistry.json',
    MatrixPayments: './contracts/abis/MatrixPayments.json',
    PartnerProgram: './contracts/abis/PartnerProgram.json',
    QuarterlyPayments: './contracts/abis/QuarterlyPayments.json',
    InvestmentPool: './contracts/abis/InvestmentPool.json',
    LeaderPool: './contracts/abis/LeaderPool.json',
    GWTToken: './contracts/abis/GWTToken.json',
    GlobalWayGovernance: './contracts/abis/GlobalWayGovernance.json',
    GlobalWayStats: './contracts/abis/GlobalWayStats.json',
    GlobalWayBridge: './contracts/abis/GlobalWayBridge.json',
    GlobalWayTokenomics: './contracts/abis/GlobalWayTokenomics.json'
  },

  // ═══════════════════════════════════════════════════════════════
  // LEVEL PRICES (в BNB)
  // ═══════════════════════════════════════════════════════════════
  LEVEL_PRICES: [
    '0.001',   // Level 1
    '0.002',   // Level 2
    '0.004',   // Level 3
    '0.008',   // Level 4
    '0.016',   // Level 5
    '0.032',   // Level 6
    '0.064',   // Level 7
    '0.128',   // Level 8
    '0.256',   // Level 9
    '0.512',   // Level 10
    '1.024',   // Level 11
    '2.048'    // Level 12
  ],

  // ═══════════════════════════════════════════════════════════════
  // TOKEN REWARDS (GWT за каждый уровень)
  // ═══════════════════════════════════════════════════════════════
  TOKEN_REWARDS: [
    5,      // Level 1
    10,     // Level 2
    20,     // Level 3
    40,     // Level 4
    80,     // Level 5
    160,    // Level 6
    320,    // Level 7
    640,    // Level 8
    1280,   // Level 9
    2560,   // Level 10
    5120,   // Level 11
    10240   // Level 12
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
    // Owner (главный администратор)
    owner: '0x7261b8aeaee2f806f64001596a67d68f2055acd2',
    
    // Founders с правами админки (только 1, 2, 3)
    founders: [
      '0x03284a899147f5a07f82c622f34df92198671635', // Founder 1
      '0x9b49bd9c9458615e11c051afd1ebe983563b67ee', // Founder 2
      '0xc2b58114cbc873cf360f7a673e4d8ee25d1431e7'  // Founder 3
    ],
    
    // Founder 4 (БЕЗ прав админки, но в составе board)
    founder4: '0xa3496cacc8523421dd151f1d92a456c2dafa28c2',
    
    // Board members (директора для голосования) - всего 7 человек
    board: [
      '0x03284a899147f5a07f82c622f34df92198671635', // Founder 1
      '0x9b49bd9c9458615e11c051afd1ebe983563b67ee', // Founder 2
      '0xc2b58114cbc873cf360f7a673e4d8ee25d1431e7', // Founder 3
      '0x372d4c15bfd4e28241399853ab2ad59ef837e44d', // Director 1
      '0xa3496cacc8523421dd151f1d92a456c2dafa28c2', // Founder 4 (Director 2)
      '0x28041d893ea97ab71dee19fceaae0822e96fc0b5', // Director 3
      '0x8603aaee4d81c85ac03d81cd06b23a1979a02444'  // Director 4
    ],
    
    // Treasury addresses
    charity: '0x742F2200BAb0c175c107c576E3Eb9E5A8ab7Ba4b',
    development: '0x742F2200BAb0c175c107c576E3Eb9E5A8ab7Ba4b'
  },

  // ═══════════════════════════════════════════════════════════════
  // UI SETTINGS
  // ═══════════════════════════════════════════════════════════════
  UI: {
    notificationDuration: 3000, // ms
    refreshInterval: 30000, // ms (30 sec)
    maxRecentTransactions: 50,
    defaultLanguage: 'ru'
  },

  // ═══════════════════════════════════════════════════════════════
  // CACHE SETTINGS
  // ═══════════════════════════════════════════════════════════════
  CACHE: {
    tokenPriceDuration: 30000, // 30 sec
    userDataDuration: 10000,   // 10 sec
    statsDataDuration: 60000   // 60 sec
  },

  // ═══════════════════════════════════════════════════════════════
  // GAS SETTINGS
  // ═══════════════════════════════════════════════════════════════
  GAS: {
    // Gas limits для разных операций
    register: 500000,
    buyLevel: 800000,
    payQuarterly: 800000,
    withdraw: 300000,
    
    // Gas price (в gwei)
    defaultGasPrice: '0.001', // 0.001 gwei для opBNB
    maxGasPrice: '0.01'       // максимум 0.01 gwei
  },

  // ═══════════════════════════════════════════════════════════════
  // FEATURES FLAGS
  // ═══════════════════════════════════════════════════════════════
  FEATURES: {
    enableAutoRegister: true,
    enableQuarterlyPayments: true,
    enableTokenRewards: true,
    enableVoting: true,
    enableBridge: false, // временно отключен
    debugMode: false
  },

  // ═══════════════════════════════════════════════════════════════
  // VOTING SYSTEM
  // ═══════════════════════════════════════════════════════════════
  VOTING: {
    totalBoardMembers: 7,        // Всего членов board
    requiredVotes: 5,             // Нужно 5 из 7 для принятия решения
    votingPeriod: 7 * 24 * 60 * 60, // 7 дней в секундах
    quorum: 5                     // Минимум голосов для кворума
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
    minWithdrawAmount: '0.001', // BNB
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

// Проверка прав доступа
CONFIG.hasAdminAccess = function(address) {
  const addr = address.toLowerCase();
  return addr === this.ADMIN.owner.toLowerCase() ||
         this.ADMIN.founders.some(f => f.toLowerCase() === addr);
};

CONFIG.isBoardMember = function(address) {
  const addr = address.toLowerCase();
  return this.ADMIN.board.some(b => b.toLowerCase() === addr);
};

CONFIG.isFounder4 = function(address) {
  return address.toLowerCase() === this.ADMIN.founder4.toLowerCase();
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
