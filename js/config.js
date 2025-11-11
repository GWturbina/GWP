// Configuration for GlobalWay DApp
const CONFIG = {
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

  // ✅ ИСПРАВЛЕНО: НОВЫЕ адреса контрактов (деплой 10.11.2025)
  CONTRACTS: {
    GlobalWay: '0x974fFA4e51458AA72C6262B59Af610844db27548',  // ✅ НОВЫЙ
    GlobalWayHelper: '0x45bC9af2381CF2FB4fC638E21c0035f9c8C64D8B',  // ✅ НОВЫЙ
    GlobalWayMarketing: '0xe1C604A8E8C2b885773cC4c67E483f29bfcCf91C',  // ✅ НОВЫЙ
    GlobalWayQuarterly: '0x09fE6e69e9Eaf1c54dE953c0dC31edfD22115CC7',  // ✅ НОВЫЙ
    GlobalWayLeaderPool: '0x8a6D429D12cE2bac90cAe52697e985948C4dE620',  // БЕЗ ИЗМЕНЕНИЙ
    GlobalWayInvestment: '0xa17162c8aC8EE6AD7aA04C229aC266c7D421eA92',  // БЕЗ ИЗМЕНЕНИЙ
    GlobalWayStats: '0xFA66Fa17a8e6232edD4e675F0732dAdDCd79aA9C',  // БЕЗ ИЗМЕНЕНИЙ
    GlobalWayBridge: '0x93d0f02298C646BB10E6de3e79fb91f23702348F',  // БЕЗ ИЗМЕНЕНИЙ
    GlobalWayGovernance: '0x197971D4cD31DE685c7Aa2F24bc2E4aA23A8ac59',  // БЕЗ ИЗМЕНЕНИЙ
    GlobalWayTechAccounts: '0x616eDDa302bD4D47aC4B889BAF4c141f80A65D09',  // БЕЗ ИЗМЕНЕНИЙ
    GWTToken: '0xdd263e6bC806A2DDf45b3F7212Ddcd4938724E4E'  // БЕЗ ИЗМЕНЕНИЙ
  },

  // Системные кошельки
  WALLETS: {
    treasury: '0xE58f778236C1D3cCecf14eC1274761559685a336',
    charity: '0x09c3bD32EB0617e29E41382b738c4E3Cc932A611',
    tokenomics: '0xbDC29886c91878C1ba9ce0626Da5E1961324354F'
  },

  // Администраторы
  ADMIN: {
    owner: '0x7261b8aeaee2f806f64001596a67d68f2055acd2',
    
    // ✅ ИСПРАВЛЕНО: Основатели с ID
    founders: [
      {
        address: '0x03284a899147f5a07f82c622f34df92198671635',
        id: '7777777'  // Позиция 1 в матрице
      },
      {
        address: '0x9b49bd9c9458615e11c051afd1ebe983563b67ee',
        id: '5555555'  // Позиция 2 в матрице
      },
      {
        address: '0xc2b58114cbc873cf360f7a673e4d8ee25d1431e7',
        id: '9999999'  // Позиция 3 в матрице
      },
      {
        address: '0xa3496caCC8523421Dd151f1d92A456c2daFa28c2',
        id: '2290631'  // ✅ ИСПРАВЛЕНО: Добавлен ID - Позиция 4 в матрице
      }
    ],
    
    board: [
      '0x11c4FA4126f9B373c4b9A2D43986Cd331E32d2fA',
      '0x0AB97e3934b1Afc9F1F6447CCF676E4f1D8B9639',
      '0x0561671297Eed07accACB41b4882ED61e87E3644',
      '0x012E0B2b502FE0131Cb342117415a43d59094D6d',
      '0x15b546a61865bdc46783ACfc50c3101a1121c69B',
      '0xB5986B808dad481ad86D63DF152cC0ad7B473e48',
      '0x4d2C77e59538deFe89E3B2951680547FC24aD52C',
      '0xAB17aDbe29c4E1d695C239206682B02ebdB3f707'
    ]
  },

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

  LEVEL_PRICES: [
    '0.0015',  // 1
    '0.003',   // 2
    '0.006',   // 3
    '0.012',   // 4
    '0.024',   // 5
    '0.048',   // 6
    '0.096',   // 7
    '0.192',   // 8
    '0.384',   // 9
    '0.768',   // 10
    '1.536',   // 11
    '3.072'    // 12
  ],

  TOKEN_REWARDS: [
    5,     // 1
    5,     // 2
    10,    // 3
    15,    // 4
    35,    // 5
    75,    // 6
    150,   // 7
    300,   // 8
    600,   // 9
    1200,  // 10
    2400,  // 11
    4500   // 12
  ],

  QUARTERLY_COST: '0.075',

  DEEP_LINKS: {
    safepal: 'safepal://wc?uri=',
    metamask: 'https://metamask.app.link/dapp/'
  },

  QR_CONFIG: {
    size: 256,
    logo: 'assets/icons/logo-32x32.png'
  }
};
