// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Configuration
// opBNB Mainnet (Chain ID: 204)
// Deployed: November 23, 2025
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
  // SMART CONTRACTS ADDRESSES - НОВЫЙ ДЕПЛОЙ
  // ═══════════════════════════════════════════════════════════════
  CONTRACTS: {
    // 1️⃣ Registry & Matrix
    MatrixRegistry: '0x430D2A235EDA59Cd289aCBf2F3CfB8a335024037',
    
    // 2️⃣ Token
    GWTToken: '0xD393a7c770e66000F42D91F9353C775E9a1c0895',
    
    // 3️⃣ Core системный контракт
    GlobalWay: '0x17dafd5f2eC1F042274f6A6d3F8B7Bf31299589F',
    
    // 4️⃣ Partner Program
    PartnerProgram: '0xA657E363126F0aa6607959ba73B6A4B2409cCB2e',
    
    // 5️⃣ Matrix Payments
    MatrixPayments: '0x9D89F7e88Ac26500F5784a7580f7453120c98ADb',
    
    // 6️⃣ Quarterly Payments
    QuarterlyPayments: '0x49f8aFf9bCFA1eBDBF66c789e65E6D39420B0FF4',
    
    // 7️⃣ Investment Pool
    GlobalWayInvestment: '0x4274e4412c1047b8300CC5A5dF2495e8986e40A1',
    
    // 8️⃣ Leader Pool
    GlobalWayLeaderPool: '0x5fBaCc773F75c95B95CBD3B9f483a22D15AAB1B4',
    
    // 9️⃣ Governance
    GlobalWayGovernance: '0xec5D65016E5B982C312627E2ffC111A3A4178037',
    
    // 🔟 Bridge
    GlobalWayBridge: '0x806BA9ced6AeD93562fCdc8a9Ef9c9d1bC75b7F9',
    
    // 1️⃣1️⃣ Stats
    GlobalWayStats: '0x98fcaAa0ab14Adc54C0Fe6785200A4612FFC6E19'
  },

  // ═══════════════════════════════════════════════════════════════
  // ABI FILES - Пути к отдельным ABI файлам на хостинге
  // ═══════════════════════════════════════════════════════════════
  ABI_PATHS: {
    // 1️⃣ Registry & Matrix
    MatrixRegistry: './contracts/abis/MatrixRegistry.json',
    MatrixPayments: './contracts/abis/MatrixPayments.json',
    
    // 2️⃣ Token
    GWTToken: './contracts/abis/GWTToken.json',
    
    // 3️⃣ Core
    GlobalWay: './contracts/abis/GlobalWay.json',
    
    // 4️⃣ Payment Systems
    PartnerProgram: './contracts/abis/PartnerProgram.json',
    QuarterlyPayments: './contracts/abis/QuarterlyPayments.json',
    
    // 5️⃣ Pools
    GlobalWayInvestment: './contracts/abis/GlobalWayInvestment.json',
    GlobalWayLeaderPool: './contracts/abis/GlobalWayLeaderPool.json',
    
    // 6️⃣ Governance & Stats
    GlobalWayGovernance: './contracts/abis/GlobalWayGovernance.json',
    GlobalWayStats: './contracts/abis/GlobalWayStats.json',
    
    // 7️⃣ Bridge
    GlobalWayBridge: './contracts/abis/GlobalWayBridge.json'
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
  // ADMIN - ОБНОВЛЁННЫЕ АДРЕСА
  // ═══════════════════════════════════════════════════════════════
  ADMIN: {
    // Owner (главный администратор - deployer)
    owner: '0x7bCD1753868895971E12448412cB3216d47884c8',
    
    // Guardians (3 человека с правами governance)
    guardians: [
      '0x48635e0ad72cf5e8e8ad722fd7d823ec7cb197d1', // Guardian 1
      '0xde4fb5fb406c6356247bea6b4822b9b2e2c7fccf', // Guardian 2
      '0x5e2572d9a414667babcd5c7b59ca643b09e48e46'  // Guardian 3
    ],
    
    // Directors (6 человек для Bridge голосований)
    directors: [
      '0x48635e0ad72cf5e8e8ad722fd7d823ec7cb197d1', // Director 1
      '0xde4fb5fb406c6356247bea6b4822b9b2e2c7fccf', // Director 2
      '0x5e2572d9a414667babcd5c7b59ca643b09e48e46', // Director 3
      '0x3Faa7fB3698D746AdA965Cae9d8e133BEf1fBc01', // Director 4
      '0x3f7ED3960147a3A6f23B52D5707160Be0951F863', // Director 5
      '0x372d4c15bfd4e28241399853ab2ad59ef837e44d'  // Director 6
    ],
    
    // Treasury addresses
    treasury: '0x11dac11d92147b70b03e43a9c02fffe4ec366bc7',
    charity: '0x81d94f0b3252148f55bb77464041eb90c6d97439',
    tokenomics: '0xcfefcd8080b3109314aa0a211b7ba00f9cc8e380',
    development: '0xfdb4e5da1de4a108812b54fb5386da410fd26825'
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
    enableBridge: true, // включен
    debugMode: false
  },

  // ═══════════════════════════════════════════════════════════════
  // VOTING SYSTEM
  // ═══════════════════════════════════════════════════════════════
  VOTING: {
    totalGuardians: 3,           // Всего guardians (Governance)
    requiredVotesGovernance: 3,  // Нужно 3 из 3 для Governance
    totalDirectors: 6,           // Всего directors (Bridge)
    requiredVotesBridge: 4,      // Нужно 4 из 6 для Bridge
    votingPeriod: 7 * 24 * 60 * 60, // 7 дней в секундах
    quorum: 3                    // Минимум голосов для кворума
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

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
