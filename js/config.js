/* jshint esversion: 8 */
// GlobalWay DApp Configuration
// Оновлено: 31.10.2025

const CONFIG = {
  // Мережа opBNB Mainnet
  NETWORK: {
    chainId: 204,
    chainIdHex: '0xCC',
    name: 'opBNB Mainnet',
    rpcUrl: 'https://opbnb-mainnet-rpc.bnbchain.org',
    explorer: 'https://opbnbscan.com',
    currency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    }
  },

  // ✅ АДРЕСИ КОНТРАКТІВ (opBNB Mainnet)
  CONTRACTS: {
    GWTToken: '0xdd263e6bC806A2DDf45b3F7212Ddcd4938724E4E',
    GlobalWay: '0xAc6D3f7a61ddC95C09d635514F97E628CA9BD5e1',
    Marketing: '0xe6Ed003fa33be17c9Cb20771615D45fE3184be2D',
    LeaderPool: '0x8a6D429D12cE2bac90cAe52697e985948C4dE620',
    Investment: '0xa17162c8aC8EE6AD7aA04C229aC266c7D421eA92',
    Quarterly: '0x5d96AA82E423239bB17bf80275f791AD4B3da073',
    TechAccounts: '0x616eDDa302bD4D47aC4B889BAF4c141f80A65D09',
    Bridge: '0x93d0f02298C646BB10E6de3e79fb91f23702348F',
    Stats: '0xFA66Fa17a8e6232edD4e675F0732dAdDCd79aA9C',
    Governance: '0x197971D4cD31DE685c7Aa2F24bc2E4aA23A8ac59'
  },

  // ✅ ШЛЯХИ ДО ABI ФАЙЛІВ (окремі файли для кожного контракту)
  ABI_FILES: {
    GWTToken: './contracts/abis/GWTToken.json',
    GlobalWay: './contracts/abis/GlobalWay.json',
    Marketing: './contracts/abis/GlobalWayMarketing.json',
    LeaderPool: './contracts/abis/GlobalWayLeaderPool.json',
    Investment: './contracts/abis/GlobalWayInvestment.json',
    Quarterly: './contracts/abis/GlobalWayQuarterly.json',
    TechAccounts: './contracts/abis/GlobalWayTechAccounts.json',
    Bridge: './contracts/abis/GlobalWayBridge.json',
    Stats: './contracts/abis/GlobalWayStats.json',
    Governance: './contracts/abis/GlobalWayGovernance.json'
  },

  // Системні кошельки
  WALLETS: {
    TREASURY: '0xE58f778236C1D3cCecf14eC1274761559685a336',    // Казна/доходи
    OPS: '0x956C8350b874D01D32236Eb2944089B54C3b9670',         // Операційний резерв
    DEV: '0xF8C5504dc1e5165a0748A3DC410384BfCBab13Dd',         // Development
    CHARITY: '0x09c3bD32EB0617e29E41382b738c4E3Cc932A611',     // Charity
    TOKENOMICS: '0xbDC29886c91878C1ba9ce0626Da5E1961324354F'   // Tokenomics
  },

  // Адміністративні акаунти
  ADMIN: {
    owner: '0x7261b8aeaee2f806f64001596a67d68f2055acd2',       // Multisig власник
    
    // 3 Founders (активовані з Platinum рангом)
    founders: [
      '0x03284a899147f5a07f82c622f34df92198671635',  // Founder F1 (ROOT)
      '0x9b49bd9c9458615e11c051afd1ebe983563b67ee',  // Founder F2
      '0xc2b58114cbc873cf360f7a673e4d8ee25d1431e7'   // Founder F3
    ],
    
    // 8 Board Directors
    board: [
      '0x11c4FA4126f9B373c4b9A2D43986Cd331E32d2fA',  // Board B1
      '0x0AB97e3934b1Afc9F1F6447CCF676E4f1D8B9639',  // Board B2
      '0x0561671297Eed07accACB41b4882ED61e87E3644',  // Board B3
      '0x012E0B2b502FE0131Cb342117415a43d59094D6d',  // Board B4
      '0x15b546a61865bdc46783ACfc50c3101a1121c69B',  // Board B5
      '0xB5986B808dad481ad86D63DF152cC0ad7B473e48',  // Board B6
      '0x4d2C77e59538deFe89E3B2951680547FC24aD52C',  // Board B7
      '0xAB17aDbe29c4E1d695C239206682B02ebdB3f707'   // Board B8
    ]
  },

  // Проекти екосистеми
  PROJECTS: [
    {
      id: 'CG',
      name: 'KardGift',
      description: 'Gift card marketplace and exchange platform',
      logo: 'assets/icons/CardGift.png',
      status: 'development',
      requiredLevel: 1,
      prefix: 'CG'
    },
    {
      id: 'GT',
      name: 'GlobalTub',
      description: 'Decentralized video streaming platform',
      logo: 'assets/icons/GlobalTub.png',
      status: 'development',
      requiredLevel: 4,
      prefix: 'GT'
    },
    {
      id: 'GM',
      name: 'GlobalMarket',
      description: 'P2P marketplace for goods and services',
      logo: 'assets/icons/GlobalMarket.png',
      status: 'coming',
      requiredLevel: 4,
      prefix: 'GM'
    },
    {
      id: 'GG',
      name: 'GlobalGame',
      description: 'Play-to-earn gaming ecosystem',
      logo: 'assets/icons/GlobalGame.png',
      status: 'coming',
      requiredLevel: 7,
      prefix: 'GG'
    },
    {
      id: 'GS',
      name: 'GlobalSocial',
      description: 'Decentralized social network',
      logo: 'assets/icons/GlobalSocial.png',
      status: 'planning',
      requiredLevel: 7,
      prefix: 'GS'
    },
    {
      id: 'GB',
      name: 'GlobalBank',
      description: 'DeFi banking and lending platform',
      logo: 'assets/icons/GlobalBank.png',
      status: 'planning',
      requiredLevel: 10,
      prefix: 'GB'
    },
    {
      id: 'GE',
      name: 'GlobalEdu',
      description: 'Educational platform and certification',
      logo: 'assets/icons/GlobalEdu.png',
      status: 'planning',
      requiredLevel: 10,
      prefix: 'GE'
    },
    {
      id: 'GL',
      name: 'EcoVillages',
      description: 'Eco-settlements and sustainable living',
      logo: 'assets/icons/EcoVillages.png',
      status: 'planning',
      requiredLevel: 12,
      prefix: 'GL'
    }
  ],

  // Ціни рівнів (в BNB)
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

  // Нагороди токенами GWT за рівні
  TOKEN_REWARDS: [
    5,      // Level 1
    5,      // Level 2
    10,     // Level 3
    15,     // Level 4
    35,     // Level 5
    75,     // Level 6
    150,    // Level 7
    300,    // Level 8
    600,    // Level 9
    1200,   // Level 10
    2400,   // Level 11
    4500    // Level 12
  ],

  // Вартість квартальної активності
  QUARTERLY_COST: '0.075',

  // Deep-links для мобільних гаманців
  DEEP_LINKS: {
    safepal: 'safepal://wc?uri=',
    safepalAndroid: 'safepalwallet://open?url='
  },

  // Конфігурація QR-коду
  QR_CONFIG: {
    size: 256,
    logo: 'assets/icons/logo-32x32.png',
    colorDark: '#000000',
    colorLight: '#ffffff'
  },

  // Ранги та їх назви
  RANKS: {
    0: 'None',
    1: 'Bronze',
    2: 'Silver',
    3: 'Gold',
    4: 'Platinum'
  },

  // Умови для рангів
  RANK_REQUIREMENTS: {
    bronze: {
      personalPartners: 3,
      withLevel: 4
    },
    silver: {
      bronzePartners: 3,
      teamVolume: '10'  // BNB
    },
    gold: {
      silverPartners: 3,
      teamVolume: '50'  // BNB
    },
    platinum: {
      goldPartners: 3,
      teamVolume: '200'  // BNB
    }
  },

  // Таймаути та затримки
  TIMEOUTS: {
    transactionConfirmation: 60000,  // 60 секунд
    walletConnection: 30000,          // 30 секунд
    safePalInjection: 5000,           // 5 секунд
    notificationDisplay: 3000,        // 3 секунди
    loaderDelay: 500                  // 0.5 секунди
  },

  // Gas limits для транзакцій
  GAS_LIMITS: {
    register: 500000,
    buyLevel: 500000,
    buyBulkLevels: 1000000,
    payQuarterly: 300000,
    withdraw: 300000,
    tokenBuy: 300000,
    tokenSell: 300000,
    adminAction: 500000
  },

  // Локальне сховище ключі
  STORAGE_KEYS: {
    walletAddress: 'walletAddress',
    walletConnected: 'walletConnected',
    sponsorId: 'sponsorId',
    language: 'language',
    lastVisit: 'lastVisit'
  },

  // Версія конфігурації (для кешування)
  VERSION: '2.0.0',
  BUILD_DATE: '2025-10-31'
};

// Експорт для використання в інших модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
