// ═══════════════════════════════════════════════════════════════════
// GlobalWay DApp - Configuration
// opBNB Mainnet (Chain ID: 204)
// Deployed: February 13, 2026 (v2.1)
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
  // SMART CONTRACTS ADDRESSES - GWP v2.1 ДЕПЛОЙ 13.02.2026
  // ═══════════════════════════════════════════════════════════════
  CONTRACTS: {
    GWTToken: '0x933B0Cb1f43170f3F0fcf082572CC931D6e93b5F',
    MatrixRegistry: '0xD62945edFF7605dFc77A4bF607c96Da72E03cd0C',
    GlobalWay: '0xe8e2af46AEEec1B51B335f10C5912620B1a2707F',
    SafeVaultGW: '0xc22592F84557e73f9e19C6B0fB13C3717E4cD92e',
    PartnerProgram: '0x390409BA8b64052D160e259816E5B6472e51b2ae',
    MatrixPayments: '0xDf37d4cc11a01bcB57F2e8cD56234325a6ce8EDf',
    QuarterlyPayments: '0x10dd3Fbaf52Be26Ee3606DC5984Cb7D10f017EA4',
    GlobalWayLeaderPool: '0x8C645586aeBEa151737cDC3E4C6adFaA9AbEABCF',
    GlobalWayInvestment: '0xa54a71BceeDaBB743f046217535A6F0dF9C8647C',
    GlobalWayBridge: '0x4489851e530924eB25e684E6b97c7C47364780F5',
    GlobalWayStats: '0x1c5A63AfC7dd0b057B9dcAA3B6B47B4078a5A808',
    GlobalWayGovernance: '0xf81FC745A4234eCaC8FBd639D45e104a4d694587'
  },

  // ═══════════════════════════════════════════════════════════════
  // ROOT ID - ДЛЯ ПЕРВЫХ РЕГИСТРАЦИЙ
  // ═══════════════════════════════════════════════════════════════
  ROOT_ID: '9729645',

  // ═══════════════════════════════════════════════════════════════
  // ABI FILES - Относительные пути от js/config.js
  // ═══════════════════════════════════════════════════════════════
  ABI_PATHS: {
    GWTToken: '../contracts/abis/GWTToken.json',
    MatrixRegistry: '../contracts/abis/MatrixRegistry.json',
    MatrixPayments: '../contracts/abis/MatrixPayments.json',
    GlobalWay: '../contracts/abis/GlobalWay.json',
    SafeVaultGW: '../contracts/abis/SafeVaultGW.json',
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
  // RANKS — синхронизировано с MatrixPayments.sol:
  // NO_RANK_MAX_LEVEL = 9, SILVER = 10, GOLD = 11, PLATINUM = 12
  // Bronze удалён (в контракте Bronze = NoRank = 9, без отличий)
  RANKS: {
    NONE: { id: 0, name: 'Без ранга', maxLevel: 9, requirements: 'Нет требований' },
    SILVER: { id: 2, name: 'Серебро 🥈', maxLevel: 10, requirements: '3 реферала с L6+' },
    GOLD: { id: 3, name: 'Золото 🥇', maxLevel: 11, requirements: '4 реферала с L7+' },
    PLATINUM: { id: 4, name: 'Платина 💎', maxLevel: 12, requirements: '5 рефералов с L8+' }
  },

  // ═══════════════════════════════════════════════════════════════
  // ADMIN
  // ═══════════════════════════════════════════════════════════════
  ADMIN: {
    owner: '0x2dac0b8bf4846CcC44258a23AcB4f2B1Dd6Db5cE',
    
    guardians: [
      '0x7bCD1753868895971E12448412cB3216d47884c8',
      '0x48635e0ad72cf5e8e8ad722fd7d823ec7cb197d1',
      '0xde4fb5fb406c6356247bea6b4822b9b2e2c7fccf',
      '0x5e2572d9a414667babcd5c7b59ca643b09e48e46'
    ],
    
    directors: [
      '0x7bCD1753868895971E12448412cB3216d47884c8',
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
    register: 1000000,
    buyLevel: 3500000,
    payQuarterly: 2000000,
    withdraw: 300000,
    buyTokens: 500000,
    createSellOrder: 300000,
    buyFromOrder: 500000,
    cancelOrder: 200000,
    approve: 100000,
    defaultGasPrice: "0.001",
    maxGasPrice: "0.01"
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
  // REFERRAL SYSTEM - Directions, Domains, Anti-Ban
  // ═══════════════════════════════════════════════════════════════
  REFERRAL: {
    // Направления экосистемы (добавляй новые по мере роста)
    directions: {
      gw: {
        name: 'GlobalWay',
        shortName: 'GW',
        icon: '🌐',
        color: '#00d4ff',
        gradient: 'linear-gradient(135deg, #0a1628 0%, #0d2847 50%, #0a4a7a 100%)',
        description: 'Decentralized MLM Platform on opBNB',
        descriptionRu: 'Децентрализованная платформа на opBNB',
        landingPage: 'ref/gw.html',
        logo: 'assets/icons/logo.png'
      },
      cg: {
        name: 'CardGift',
        shortName: 'CG',
        icon: '🎴',
        color: '#ff6b9d',
        gradient: 'linear-gradient(135deg, #1a0a2e 0%, #3d1552 50%, #6b2fa0 100%)',
        description: 'Digital Greeting Cards Platform',
        descriptionRu: 'Платформа цифровых открыток',
        landingPage: 'ref/cg.html',
        logo: 'assets/icons/CardGift.png'
      },
      nss: {
        name: 'NSS',
        shortName: 'NSS',
        icon: '💱',
        color: '#00ff88',
        gradient: 'linear-gradient(135deg, #0a2818 0%, #0d4730 50%, #0a7a4a 100%)',
        description: 'Crypto Exchange & P2P Platform',
        descriptionRu: 'Криптообменник и P2P платформа',
        landingPage: 'ref/nss.html',
        logo: 'assets/icons/GlobalBank.png'
      }
    },

    // DApp домены для антибана (добавляй по мере создания)
    // Формат: домен -> активен/нет
    domains: [
      { url: 'https://gwp-navy.vercel.app', active: true, primary: true },
      // Добавь DApp домены после создания:
      // { url: 'https://globalway.on.fleek.co', active: true },
      // { url: 'https://gw-dapp.eth.limo', active: true },
      // { url: 'https://globalway.ipfs.io', active: true },
    ],

    // Настройки антибана
    antiBan: {
      enabled: true,
      rotateOnShare: true,        // Менять домен при каждом шаринге
      maxLinksPerDomain: 50,      // Макс ссылок на один домен
      fallbackDomain: 'https://gwp-navy.vercel.app'
    },

    // OG Preview настройки
    ogDefaults: {
      siteName: 'GlobalWay Ecosystem',
      image: 'assets/icons/icon-512x512.png',
      imageWidth: 1200,
      imageHeight: 630
    }
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
  if (maxLevel >= 11) return this.RANKS.GOLD;
  if (maxLevel >= 10) return this.RANKS.SILVER;
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
