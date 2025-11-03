/* jshint esversion: 8 */

/**
 * GlobalWay DApp Configuration
 * Version: 2.0 - Production Ready
 * Network: opBNB Mainnet
 * Date: 03.11.2025
 */

const CONFIG = {
  // ========================================
  // NETWORK CONFIGURATION
  // ========================================
  NETWORK: {
    name: 'opBNB Mainnet',
    chainId: 204,
    chainIdHex: '0xCC',
    rpcUrl: 'https://opbnb-mainnet-rpc.bnbchain.org',
    explorer: 'https://opbnbscan.com',
    currency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    }
  },

  // ========================================
  // CONTRACT ADDRESSES (из чек-листа деплоя)
  // ========================================
  CONTRACTS: {
    // Основные контракты
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

  // ========================================
  // SYSTEM WALLETS
  // ========================================
  WALLETS: {
    TREASURY: '0xE58f778236C1D3cCecf14eC1274761559685a336',
    OPS: '0x956C8350b874D01D32236Eb2944089B54C3b9670',
    DEV: '0xF8C5504dc1e5165a0748A3DC410384BfCBab13Dd',
    CHARITY: '0x09c3bD32EB0617e29E41382b738c4E3Cc932A611',
    TOKENOMICS: '0xbDC29886c91878C1ba9ce0626Da5E1961324354F'
  },

  // ========================================
  // ADMIN ADDRESSES
  // ========================================
  ADMIN: {
    // Owner (Multisig)
    owner: '0x7261b8aeaee2f806f64001596a67d68f2055acd2',
    
    // Founders (ROOT + 3 основателя)
    founders: [
      '0x03284a899147f5a07f82c622f34df92198671635', // FOUNDER1 (ROOT)
      '0x9b49bd9c9458615e11c051afd1ebe983563b67ee', // FOUNDER2
      '0xc2b58114cbc873cf360f7a673e4d8ee25d1431e7'  // FOUNDER3
    ]
  },

  // ========================================
  // LEVEL PRICES (в BNB)
  // ========================================
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

  // ========================================
  // TOKEN REWARDS (GWT токены за уровни)
  // ========================================
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

  // ========================================
  // QUARTERLY SETTINGS
  // ========================================
  QUARTERLY: {
    FEE: '0.075', // 0.075 BNB
    INTERVAL: 7776000, // 90 дней в секундах
    GRACE_PERIOD: 864000 // 10 дней grace period
  },

  // ========================================
  // MATRIX SETTINGS
  // ========================================
  MATRIX: {
    MAX_LEVEL: 12,
    POSITIONS_PER_LEVEL: [
      2,     // Level 1: 2 positions
      4,     // Level 2: 4 positions
      8,     // Level 3: 8 positions
      16,    // Level 4: 16 positions
      32,    // Level 5: 32 positions
      64,    // Level 6: 64 positions
      128,   // Level 7: 128 positions
      256,   // Level 8: 256 positions
      512,   // Level 9: 512 positions
      1024,  // Level 10: 1024 positions
      2048,  // Level 11: 2048 positions
      4096   // Level 12: 4096 positions
    ]
  },

  // ========================================
  // BONUS PERCENTAGES
  // ========================================
  BONUSES: {
    DIRECT: 10,        // 10% за прямых партнеров (уровни 1-4)
    PARTNER: 2,        // 2% от всех уровней партнерской программы
    MATRIX: 48,        // 48% от матрицы
    CHARITY: 10,       // 10% на благотворительность
    DEVELOPMENT: 2     // 2% на развитие
  },

  // ========================================
  // RANK REQUIREMENTS
  // ========================================
  RANKS: {
    NONE: { level: 0, name: 'None' },
    BRONZE: { level: 1, name: 'Bronze', requirement: '3 partners with Level 4+' },
    SILVER: { level: 2, name: 'Silver', requirement: '3 Bronze + team volume' },
    GOLD: { level: 3, name: 'Gold', requirement: '3 Silver + team volume' },
    PLATINUM: { level: 4, name: 'Platinum', requirement: '3 Gold + team volume' }
  },

  // ========================================
  // PROJECTS CONFIG
  // ========================================
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
      id: 'EV',
      name: 'EcoVillages',
      description: 'Eco-settlements and sustainable living',
      logo: 'assets/icons/EcoVillages.png',
      status: 'planning',
      requiredLevel: 12,
      prefix: 'EV'
    }
  ],

  // ========================================
  // GAS LIMITS
  // ========================================
  GAS_LIMITS: {
    register: 500000,
    activateLevel: 400000,
    activateBulkLevels: 800000,
    payQuarterly: 300000,
    withdrawReferral: 250000,
    withdrawMatrix: 250000,
    claimRankBonus: 300000,
    buyTokens: 300000,
    sellTokens: 300000,
    approve: 100000,
    transfer: 100000
  },

  // ========================================
  // TIMEOUTS (в миллисекундах)
  // ========================================
  TIMEOUTS: {
    transaction: 120000,      // 2 минуты на транзакцию
    provider: 10000,          // 10 секунд ожидание провайдера
    safePalInjection: 10000,  // 10 секунд ожидание SafePal
    modal: 3000,              // 3 секунды показ модалки
    notification: 3000        // 3 секунды уведомление
  },

  // ========================================
  // UI SETTINGS
  // ========================================
  UI: {
    autoUpdateInterval: 30000,       // 30 секунд автообновление
    notificationDuration: 3000,      // 3 секунды уведомления
    loaderDelay: 500,                // 0.5 секунды задержка лоадера
    modalAnimationDuration: 300,     // 0.3 секунды анимация модалки
    debounceDelay: 500               // 0.5 секунды debounce
  },

  // ========================================
  // QR CODE SETTINGS
  // ========================================
  QR_CONFIG: {
    size: 256,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: 3, // QRCode.CorrectLevel.H
    logo: 'assets/icons/logo-32x32.png',
    logoWidth: 48,
    logoHeight: 48
  },

  // ========================================
  // TOKEN SETTINGS
  // ========================================
  TOKEN: {
    name: 'GlobalWay Token',
    symbol: 'GWT',
    decimals: 18,
    totalSupply: '1000000000', // 1 миллиард
    initialPrice: '0.01', // $0.01
    minTradingPrice: '0.01' // Минимальная цена для торговли
  },

  // ========================================
  // PAGINATION
  // ========================================
  PAGINATION: {
    partnersPerPage: 50,
    transactionsPerPage: 50,
    matrixPerPage: 50
  },

  // ========================================
  // DATE FORMATS
  // ========================================
  DATE_FORMATS: {
    short: 'DD.MM.YYYY',
    long: 'DD.MM.YYYY HH:mm:ss',
    time: 'HH:mm:ss'
  },

  // ========================================
  // API ENDPOINTS (если будут использоваться)
  // ========================================
  API: {
    priceOracle: 'https://api.globalway.io/price',
    statistics: 'https://api.globalway.io/stats',
    events: 'https://api.globalway.io/events'
  },

  // ========================================
  // FEATURE FLAGS
  // ========================================
  FEATURES: {
    tokenTrading: false,      // Торговля токенами (пока отключена)
    governance: false,        // Голосование (пока отключено)
    projects: false,          // Проекты (пока отключены)
    staking: false            // Стейкинг (пока отключен)
  },

  // ========================================
  // ERROR MESSAGES
  // ========================================
  ERRORS: {
    WALLET_NOT_CONNECTED: 'Please connect your wallet first',
    WRONG_NETWORK: 'Please switch to opBNB network',
    USER_NOT_REGISTERED: 'Please register first',
    INSUFFICIENT_BALANCE: 'Insufficient BNB balance',
    TRANSACTION_REJECTED: 'Transaction was rejected',
    INVALID_ADDRESS: 'Invalid address format',
    INVALID_SPONSOR: 'Invalid sponsor ID',
    LEVEL_NOT_ACTIVE: 'This level is not activated yet',
    QUARTERLY_NOT_DUE: 'Quarterly payment is not due yet'
  },

  // ========================================
  // SUCCESS MESSAGES
  // ========================================
  SUCCESS: {
    WALLET_CONNECTED: 'Wallet connected successfully!',
    REGISTRATION_COMPLETE: 'Registration completed! Welcome to GlobalWay!',
    LEVEL_ACTIVATED: 'Level activated successfully!',
    QUARTERLY_PAID: 'Quarterly payment successful!',
    WITHDRAWAL_SUCCESS: 'Withdrawal completed successfully!',
    TRANSACTION_SENT: 'Transaction sent. Waiting for confirmation...',
    TRANSACTION_CONFIRMED: 'Transaction confirmed!'
  },

  // ========================================
  // VALIDATION
  // ========================================
  VALIDATION: {
    MIN_USER_ID_LENGTH: 10,        // GW + 7 цифр + запас
    MAX_USER_ID_LENGTH: 15,
    USER_ID_PREFIX: 'GW',
    USER_ID_REGEX: /^GW\d{7,}$/,
    ADDRESS_REGEX: /^0x[a-fA-F0-9]{40}$/
  }
};

// ========================================
// ЭКСПОРТ
// ========================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
