/**
 * Price Feed Service
 * Integrated with MetaAPI for real-time prices
 */

// MetaAPI Configuration
const METAAPI_TOKEN = process.env.METAAPI_TOKEN || '';
const METAAPI_ACCOUNT_ID = process.env.METAAPI_ACCOUNT_ID || '5fa758ec-b241-4c97-81c4-9de3a3bc1f04';
const METAAPI_BASE_URL = 'https://mt-client-api-v1.new-york.agiliumtrade.ai';

// All tradable instruments organized by category - 100+ instruments
export const INSTRUMENTS = {
  forex: [
    // Major Pairs
    { symbol: 'EURUSD', name: 'Euro/Dollar', icon: '🇪🇺' },
    { symbol: 'GBPUSD', name: 'Pound/Dollar', icon: '🇬🇧' },
    { symbol: 'USDJPY', name: 'Dollar/Yen', icon: '🇯🇵' },
    { symbol: 'USDCHF', name: 'Dollar/Franc', icon: '🇨🇭' },
    { symbol: 'AUDUSD', name: 'Aussie/Dollar', icon: '🇦🇺' },
    { symbol: 'NZDUSD', name: 'Kiwi/Dollar', icon: '🇳🇿' },
    { symbol: 'USDCAD', name: 'Dollar/Loonie', icon: '🇨🇦' },
    // Cross Pairs
    { symbol: 'EURGBP', name: 'Euro/Pound', icon: '🇪🇺' },
    { symbol: 'EURJPY', name: 'Euro/Yen', icon: '💶' },
    { symbol: 'EURCHF', name: 'Euro/Franc', icon: '🇪🇺' },
    { symbol: 'EURAUD', name: 'Euro/Aussie', icon: '🇪🇺' },
    { symbol: 'EURCAD', name: 'Euro/Loonie', icon: '🇪🇺' },
    { symbol: 'EURNZD', name: 'Euro/Kiwi', icon: '🇪🇺' },
    { symbol: 'GBPJPY', name: 'Pound/Yen', icon: '💷' },
    { symbol: 'GBPCHF', name: 'Pound/Franc', icon: '🇬🇧' },
    { symbol: 'GBPAUD', name: 'Pound/Aussie', icon: '🇬🇧' },
    { symbol: 'GBPCAD', name: 'Pound/Loonie', icon: '🇬🇧' },
    { symbol: 'GBPNZD', name: 'Pound/Kiwi', icon: '🇬🇧' },
    { symbol: 'AUDJPY', name: 'Aussie/Yen', icon: '🇦🇺' },
    { symbol: 'AUDCHF', name: 'Aussie/Franc', icon: '🇦🇺' },
    { symbol: 'AUDCAD', name: 'Aussie/Loonie', icon: '🇦🇺' },
    { symbol: 'AUDNZD', name: 'Aussie/Kiwi', icon: '🇦🇺' },
    { symbol: 'NZDJPY', name: 'Kiwi/Yen', icon: '🇳🇿' },
    { symbol: 'NZDCHF', name: 'Kiwi/Franc', icon: '🇳🇿' },
    { symbol: 'NZDCAD', name: 'Kiwi/Loonie', icon: '🇳🇿' },
    { symbol: 'CADJPY', name: 'Loonie/Yen', icon: '🇨🇦' },
    { symbol: 'CADCHF', name: 'Loonie/Franc', icon: '🇨🇦' },
    { symbol: 'CHFJPY', name: 'Franc/Yen', icon: '🇨🇭' },
    // Exotic Pairs
    { symbol: 'USDZAR', name: 'Dollar/Rand', icon: '🇿🇦' },
    { symbol: 'USDMXN', name: 'Dollar/Peso', icon: '🇲🇽' },
    { symbol: 'USDTRY', name: 'Dollar/Lira', icon: '🇹🇷' },
    { symbol: 'USDSEK', name: 'Dollar/Krona', icon: '🇸🇪' },
    { symbol: 'USDNOK', name: 'Dollar/Krone', icon: '🇳🇴' },
    { symbol: 'USDDKK', name: 'Dollar/Krone', icon: '🇩🇰' },
    { symbol: 'USDPLN', name: 'Dollar/Zloty', icon: '🇵🇱' },
    { symbol: 'USDHUF', name: 'Dollar/Forint', icon: '🇭🇺' },
    { symbol: 'USDCZK', name: 'Dollar/Koruna', icon: '🇨🇿' },
    { symbol: 'USDSGD', name: 'Dollar/Singapore', icon: '🇸🇬' },
    { symbol: 'USDHKD', name: 'Dollar/Hong Kong', icon: '🇭🇰' },
    { symbol: 'USDCNH', name: 'Dollar/Yuan', icon: '🇨🇳' },
    { symbol: 'USDINR', name: 'Dollar/Rupee', icon: '🇮🇳' },
    { symbol: 'USDTHB', name: 'Dollar/Baht', icon: '🇹🇭' },
    { symbol: 'EURPLN', name: 'Euro/Zloty', icon: '🇪🇺' },
    { symbol: 'EURTRY', name: 'Euro/Lira', icon: '🇪🇺' },
    { symbol: 'EURSEK', name: 'Euro/Krona', icon: '🇪🇺' },
    { symbol: 'EURNOK', name: 'Euro/Krone', icon: '🇪🇺' },
    { symbol: 'EURHUF', name: 'Euro/Forint', icon: '🇪🇺' },
    { symbol: 'EURCZK', name: 'Euro/Koruna', icon: '🇪🇺' },
    { symbol: 'GBPZAR', name: 'Pound/Rand', icon: '🇬🇧' },
  ],
  crypto: [
    { symbol: 'BTCUSD', name: 'Bitcoin', icon: '₿' },
    { symbol: 'ETHUSD', name: 'Ethereum', icon: '⟠' },
    { symbol: 'LTCUSD', name: 'Litecoin', icon: 'Ł' },
    { symbol: 'XRPUSD', name: 'Ripple', icon: '✕' },
    { symbol: 'SOLUSD', name: 'Solana', icon: '◎' },
    { symbol: 'DOGEUSD', name: 'Dogecoin', icon: '🐕' },
    { symbol: 'BNBUSD', name: 'BNB', icon: '🔶' },
    { symbol: 'ADAUSD', name: 'Cardano', icon: '💠' },
    { symbol: 'DOTUSD', name: 'Polkadot', icon: '⚫' },
    { symbol: 'MATICUSD', name: 'Polygon', icon: '🔮' },
    { symbol: 'AVAXUSD', name: 'Avalanche', icon: '🔺' },
    { symbol: 'LINKUSD', name: 'Chainlink', icon: '🔗' },
    { symbol: 'ATOMUSD', name: 'Cosmos', icon: '⚛️' },
    { symbol: 'UNIUSD', name: 'Uniswap', icon: '🦄' },
    { symbol: 'XLMUSD', name: 'Stellar', icon: '⭐' },
    { symbol: 'TRXUSD', name: 'Tron', icon: '🔴' },
    { symbol: 'SHIBUSD', name: 'Shiba Inu', icon: '🐕' },
    { symbol: 'NEARUSD', name: 'NEAR Protocol', icon: '🌐' },
    { symbol: 'ICPUSD', name: 'Internet Computer', icon: '♾️' },
    { symbol: 'FILUSD', name: 'Filecoin', icon: '📁' },
    { symbol: 'APTUSD', name: 'Aptos', icon: '🔷' },
    { symbol: 'ARBUSD', name: 'Arbitrum', icon: '🔵' },
    { symbol: 'OPUSD', name: 'Optimism', icon: '🔴' },
    { symbol: 'PEPEUSD', name: 'Pepe', icon: '🐸' },
    { symbol: 'SUIUSD', name: 'Sui', icon: '💧' },
  ],
  commodities: [
    // Precious Metals
    { symbol: 'XAUUSD', name: 'Gold', icon: '🥇' },
    { symbol: 'XAGUSD', name: 'Silver', icon: '🥈' },
    { symbol: 'XPTUSD', name: 'Platinum', icon: '⚪' },
    { symbol: 'XPDUSD', name: 'Palladium', icon: '🔘' },
    // Energy
    { symbol: 'XTIUSD', name: 'WTI Crude Oil', icon: '🛢️' },
    { symbol: 'XBRUSD', name: 'Brent Crude', icon: '🛢️' },
    { symbol: 'XNGUSD', name: 'Natural Gas', icon: '🔥' },
    // Agricultural
    { symbol: 'WHEATUSD', name: 'Wheat', icon: '🌾' },
    { symbol: 'CORNUSD', name: 'Corn', icon: '🌽' },
    { symbol: 'SOYBEANUSD', name: 'Soybean', icon: '🫘' },
    { symbol: 'COFFEEUSD', name: 'Coffee', icon: '☕' },
    { symbol: 'SUGARUSD', name: 'Sugar', icon: '🍬' },
    { symbol: 'COTTONUSD', name: 'Cotton', icon: '🧶' },
    { symbol: 'COCOAUSD', name: 'Cocoa', icon: '🍫' },
    // Metals
    { symbol: 'COPPERUSD', name: 'Copper', icon: '🔶' },
  ],
  indices: [
    // US Indices
    { symbol: 'US30', name: 'Dow Jones 30', icon: '📊' },
    { symbol: 'US500', name: 'S&P 500', icon: '📈' },
    { symbol: 'US100', name: 'Nasdaq 100', icon: '💻' },
    { symbol: 'US2000', name: 'Russell 2000', icon: '📉' },
    // European Indices
    { symbol: 'DE40', name: 'DAX 40', icon: '🇩🇪' },
    { symbol: 'UK100', name: 'FTSE 100', icon: '🇬🇧' },
    { symbol: 'FR40', name: 'CAC 40', icon: '🇫🇷' },
    { symbol: 'EU50', name: 'Euro Stoxx 50', icon: '🇪🇺' },
    { symbol: 'ES35', name: 'IBEX 35', icon: '🇪🇸' },
    { symbol: 'IT40', name: 'FTSE MIB', icon: '🇮🇹' },
    { symbol: 'NL25', name: 'AEX 25', icon: '🇳🇱' },
    { symbol: 'CH20', name: 'SMI 20', icon: '🇨🇭' },
    // Asian Indices
    { symbol: 'JP225', name: 'Nikkei 225', icon: '🇯🇵' },
    { symbol: 'HK50', name: 'Hang Seng 50', icon: '🇭🇰' },
    { symbol: 'CN50', name: 'China A50', icon: '🇨🇳' },
    { symbol: 'AU200', name: 'ASX 200', icon: '🇦🇺' },
    { symbol: 'SG30', name: 'SGX 30', icon: '🇸🇬' },
    { symbol: 'IN50', name: 'Nifty 50', icon: '🇮🇳' },
    // Volatility
    { symbol: 'VIX', name: 'Volatility Index', icon: '📈' },
  ],
  stocks: [
    // US Tech Stocks
    { symbol: 'AAPL', name: 'Apple Inc', icon: '🍎' },
    { symbol: 'MSFT', name: 'Microsoft', icon: '💻' },
    { symbol: 'GOOGL', name: 'Alphabet', icon: '🔍' },
    { symbol: 'AMZN', name: 'Amazon', icon: '📦' },
    { symbol: 'NVDA', name: 'NVIDIA', icon: '🎮' },
    { symbol: 'META', name: 'Meta Platforms', icon: '📱' },
    { symbol: 'TSLA', name: 'Tesla', icon: '🚗' },
    { symbol: 'NFLX', name: 'Netflix', icon: '🎬' },
    { symbol: 'AMD', name: 'AMD', icon: '💾' },
    { symbol: 'INTC', name: 'Intel', icon: '🔧' },
    { symbol: 'CRM', name: 'Salesforce', icon: '☁️' },
    { symbol: 'ORCL', name: 'Oracle', icon: '🗄️' },
    { symbol: 'ADBE', name: 'Adobe', icon: '🎨' },
    { symbol: 'PYPL', name: 'PayPal', icon: '💳' },
    { symbol: 'UBER', name: 'Uber', icon: '🚕' },
    // Finance
    { symbol: 'JPM', name: 'JPMorgan Chase', icon: '🏦' },
    { symbol: 'BAC', name: 'Bank of America', icon: '🏦' },
    { symbol: 'WFC', name: 'Wells Fargo', icon: '🏦' },
    { symbol: 'GS', name: 'Goldman Sachs', icon: '🏦' },
    { symbol: 'MS', name: 'Morgan Stanley', icon: '🏦' },
    { symbol: 'V', name: 'Visa', icon: '💳' },
    { symbol: 'MA', name: 'Mastercard', icon: '💳' },
    // Healthcare
    { symbol: 'JNJ', name: 'Johnson & Johnson', icon: '💊' },
    { symbol: 'PFE', name: 'Pfizer', icon: '💊' },
    { symbol: 'UNH', name: 'UnitedHealth', icon: '🏥' },
    // Consumer
    { symbol: 'KO', name: 'Coca-Cola', icon: '🥤' },
    { symbol: 'PEP', name: 'PepsiCo', icon: '🥤' },
    { symbol: 'MCD', name: 'McDonalds', icon: '🍔' },
    { symbol: 'SBUX', name: 'Starbucks', icon: '☕' },
    { symbol: 'NKE', name: 'Nike', icon: '👟' },
    { symbol: 'DIS', name: 'Disney', icon: '🏰' },
  ],
};

// Flatten all symbols
export const ALL_SYMBOLS = [
  ...INSTRUMENTS.forex,
  ...INSTRUMENTS.crypto,
  ...INSTRUMENTS.commodities,
  ...INSTRUMENTS.indices,
  ...INSTRUMENTS.stocks,
];

export interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  time: Date;
  change24h?: number;
}

// Price cache - can be populated by external API; falls back to static prices until then.
const priceCache: Map<string, PriceData> = new Map();

// Live price cache with last update time
let lastFetchTime = 0;
const FETCH_INTERVAL = 1000; // 1 second - faster updates for real-time trading
const PRIORITY_FETCH_INTERVAL = 500; // 500ms for priority symbols
let initialFetchDone = false;
let batchFetchInProgress = false;
let continuousFetchRunning = false;

// Static fallback mid prices (used when no external API is configured)
const STATIC_MID: Record<string, number> = {
  // Major Forex
  EURUSD: 1.0427, GBPUSD: 1.2530, USDJPY: 156.40, USDCHF: 0.8952,
  AUDUSD: 0.6240, NZDUSD: 0.5635, USDCAD: 1.4385,
  // Cross Forex
  EURGBP: 0.8320, EURJPY: 163.10, EURCHF: 0.9340, EURAUD: 1.6710,
  EURCAD: 1.5010, EURNZD: 1.8510, GBPJPY: 195.95, GBPCHF: 1.1230,
  GBPAUD: 2.0080, GBPCAD: 1.8040, GBPNZD: 2.2250, AUDJPY: 97.60,
  AUDCHF: 0.5585, AUDCAD: 0.8975, AUDNZD: 1.1080, NZDJPY: 88.10,
  NZDCHF: 0.5040, NZDCAD: 0.8100, CADJPY: 108.70, CADCHF: 0.6225,
  CHFJPY: 174.60,
  // Exotic Forex
  USDZAR: 18.15, USDMXN: 20.25, USDTRY: 35.20, USDSEK: 11.05,
  USDNOK: 11.35, USDDKK: 7.10, USDPLN: 4.08, USDHUF: 395.50,
  USDCZK: 24.10, USDSGD: 1.3550, USDHKD: 7.7850, USDCNH: 7.30,
  USDINR: 84.50, USDTHB: 34.20, EURPLN: 4.26, EURTRY: 36.70,
  EURSEK: 11.52, EURNOK: 11.84, EURHUF: 412.50, EURCZK: 25.15,
  GBPZAR: 22.75,
  // Crypto
  BTCUSD: 97000, ETHUSD: 3450, LTCUSD: 105, XRPUSD: 2.25,
  SOLUSD: 190, DOGEUSD: 0.32, BNBUSD: 680, ADAUSD: 0.95,
  DOTUSD: 7.50, MATICUSD: 0.55, AVAXUSD: 42, LINKUSD: 23,
  ATOMUSD: 9.50, UNIUSD: 14.50, XLMUSD: 0.42, TRXUSD: 0.25,
  SHIBUSD: 0.000023, NEARUSD: 5.50, ICPUSD: 11.50, FILUSD: 5.80,
  APTUSD: 9.80, ARBUSD: 0.85, OPUSD: 2.10, PEPEUSD: 0.000019,
  SUIUSD: 4.50,
  // Commodities - Updated Dec 2024
  XAUUSD: 2620.00, XAGUSD: 29.85, XPTUSD: 940.00, XPDUSD: 920.00,
  XTIUSD: 69.50, XBRUSD: 72.95, XNGUSD: 3.25,
  WHEATUSD: 550, CORNUSD: 450, SOYBEANUSD: 1000, COFFEEUSD: 320,
  SUGARUSD: 21.50, COTTONUSD: 72, COCOAUSD: 11500, COPPERUSD: 4.15,
  // Indices
  US30: 42840, US500: 5930, US100: 21150, US2000: 2250,
  DE40: 19885, UK100: 8150, FR40: 7350, EU50: 4850,
  ES35: 11450, IT40: 34200, NL25: 875, CH20: 11650,
  JP225: 38800, HK50: 19650, CN50: 12100, AU200: 8250,
  SG30: 3650, IN50: 23500, VIX: 18.50,
  // Stocks
  AAPL: 248.50, MSFT: 435.20, GOOGL: 192.80, AMZN: 225.40,
  NVDA: 135.80, META: 610.50, TSLA: 420.30, NFLX: 890.20,
  AMD: 125.40, INTC: 20.50, CRM: 340.80, ORCL: 175.60,
  ADBE: 485.30, PYPL: 88.50, UBER: 62.80,
  JPM: 245.80, BAC: 46.20, WFC: 72.50, GS: 580.40, MS: 118.90,
  V: 315.60, MA: 525.80, JNJ: 145.20, PFE: 26.80, UNH: 520.40,
  KO: 62.50, PEP: 152.80, MCD: 290.50, SBUX: 88.40, NKE: 78.20,
  DIS: 112.60,
};

// Static spread (in price units). We keep it stable so closed markets don't "move".
const STATIC_SPREAD: Record<string, number> = {
  // Forex majors
  EURUSD: 0.00015, GBPUSD: 0.0002, USDJPY: 0.02, USDCHF: 0.0002,
  AUDUSD: 0.0002, NZDUSD: 0.00025, USDCAD: 0.0002,
  // Forex crosses
  EURGBP: 0.0002, EURJPY: 0.03, EURCHF: 0.0003, EURAUD: 0.0004,
  EURCAD: 0.0004, EURNZD: 0.0005, GBPJPY: 0.04, GBPCHF: 0.0004,
  GBPAUD: 0.0005, GBPCAD: 0.0005, GBPNZD: 0.0006, AUDJPY: 0.03,
  AUDCHF: 0.0003, AUDCAD: 0.0003, AUDNZD: 0.0003, NZDJPY: 0.03,
  NZDCHF: 0.0003, NZDCAD: 0.0003, CADJPY: 0.03, CADCHF: 0.0003,
  CHFJPY: 0.04,
  // Forex exotics
  USDZAR: 0.02, USDMXN: 0.02, USDTRY: 0.05, USDSEK: 0.005,
  USDNOK: 0.005, USDDKK: 0.003, USDPLN: 0.003, USDHUF: 0.5,
  USDCZK: 0.02, USDSGD: 0.0003, USDHKD: 0.0005, USDCNH: 0.005,
  USDINR: 0.05, USDTHB: 0.02, EURPLN: 0.004, EURTRY: 0.06,
  EURSEK: 0.006, EURNOK: 0.006, EURHUF: 0.6, EURCZK: 0.03,
  GBPZAR: 0.03,
  // Crypto
  BTCUSD: 30, ETHUSD: 2, LTCUSD: 0.2, XRPUSD: 0.01,
  SOLUSD: 0.3, DOGEUSD: 0.0005, BNBUSD: 1.5, ADAUSD: 0.005,
  DOTUSD: 0.05, MATICUSD: 0.003, AVAXUSD: 0.2, LINKUSD: 0.1,
  ATOMUSD: 0.05, UNIUSD: 0.08, XLMUSD: 0.002, TRXUSD: 0.001,
  SHIBUSD: 0.0000001, NEARUSD: 0.03, ICPUSD: 0.06, FILUSD: 0.03,
  APTUSD: 0.05, ARBUSD: 0.004, OPUSD: 0.01, PEPEUSD: 0.0000001,
  SUIUSD: 0.02,
  // Commodities
  XAUUSD: 0.5, XAGUSD: 0.03, XPTUSD: 2, XPDUSD: 3,
  XTIUSD: 0.05, XBRUSD: 0.05, XNGUSD: 0.01,
  WHEATUSD: 2, CORNUSD: 1.5, SOYBEANUSD: 3, COFFEEUSD: 1,
  SUGARUSD: 0.1, COTTONUSD: 0.3, COCOAUSD: 50, COPPERUSD: 0.02,
  // Indices
  US30: 5, US500: 0.5, US100: 2, US2000: 1,
  DE40: 2, UK100: 2, FR40: 1.5, EU50: 1,
  ES35: 5, IT40: 15, NL25: 0.5, CH20: 5,
  JP225: 20, HK50: 10, CN50: 8, AU200: 3,
  SG30: 2, IN50: 10, VIX: 0.1,
  // Stocks
  AAPL: 0.1, MSFT: 0.2, GOOGL: 0.1, AMZN: 0.1,
  NVDA: 0.1, META: 0.3, TSLA: 0.2, NFLX: 0.5,
  AMD: 0.1, INTC: 0.02, CRM: 0.2, ORCL: 0.1,
  ADBE: 0.3, PYPL: 0.05, UBER: 0.03,
  JPM: 0.1, BAC: 0.02, WFC: 0.04, GS: 0.3, MS: 0.06,
  V: 0.2, MA: 0.3, JNJ: 0.08, PFE: 0.02, UNH: 0.3,
  KO: 0.03, PEP: 0.08, MCD: 0.15, SBUX: 0.05, NKE: 0.04,
  DIS: 0.06,
};

function buildStaticPrice(symbol: string): PriceData {
  const mid = STATIC_MID[symbol] ?? 1;
  const spread = STATIC_SPREAD[symbol] ?? 0.001;
  const bid = mid - spread / 2;
  const ask = mid + spread / 2;
  return {
    symbol,
    bid,
    ask,
    spread,
    time: new Date(),
    change24h: 0,
  };
}

// Tick-engine symbol mapping
const TICK_ENGINE_SYMBOL_MAP: Record<string, string> = {
  'XAU/USD': 'XAUUSD', 'EUR/USD': 'EURUSD', 'GBP/USD': 'GBPUSD',
  'USD/JPY': 'USDJPY', 'USD/CHF': 'USDCHF', 'AUD/USD': 'AUDUSD',
  'USD/CAD': 'USDCAD', 'NZD/USD': 'NZDUSD', 'BTC/USD': 'BTCUSD',
  'ETH/USD': 'ETHUSD',
};

class PriceFeedService {
  private initialized = false;
  private apiUrl: string = '';
  private apiKey: string = '';
  private fetchingPrices = false;
  private tickEngineConnected = false;
  private metaApiWsConnected = false;
  private metaApiWs: any = null;
  private subscribedSymbols: Set<string> = new Set();

  // Configure the external API
  configure(apiUrl: string, apiKey?: string) {
    this.apiUrl = apiUrl;
    if (apiKey) this.apiKey = apiKey;
    console.log('[PriceFeed] Configured with API:', apiUrl);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    console.log('[PriceFeed] Initializing...');
    this.initialized = true;
    
    // Try to connect to tick-engine WebSocket first (faster, no rate limits)
    this.connectToTickEngine();
    
    // Connect to MetaAPI WebSocket for real-time streaming
    this.connectToMetaApiWebSocket();
    
    // Also fetch from MetaAPI REST as backup
    this.fetchLivePrices();
    this.startContinuousFetch();
    this.startPriorityFetch();
  }

  // Connect to tick-engine WebSocket for real-time prices
  private connectToTickEngine(): void {
    if (typeof window !== 'undefined') return; // Skip on client side
    
    try {
      const WebSocket = require('ws');
      const ws = new WebSocket('ws://localhost:8766');
      
      ws.on('open', () => {
        console.log('[PriceFeed] Connected to tick-engine WebSocket');
        this.tickEngineConnected = true;
      });
      
      ws.on('message', (data: any) => {
        try {
          const msg = JSON.parse(data.toString());
          
          // Handle snapshot (initial prices)
          if (msg.type === 'snapshot' && msg.prices) {
            for (const [tickSymbol, price] of Object.entries(msg.prices) as [string, any][]) {
              const symbol = TICK_ENGINE_SYMBOL_MAP[tickSymbol] || tickSymbol.replace('/', '');
              if (price.b && price.a) {
                priceCache.set(symbol, {
                  symbol,
                  bid: price.b,
                  ask: price.a,
                  spread: price.a - price.b,
                  time: new Date(),
                  change24h: price.cp || 0,
                });
              }
            }
            console.log('[PriceFeed] Received price snapshot from tick-engine');
          }
          
          // Handle individual tick updates
          if (msg.s && msg.b && msg.a) {
            const symbol = TICK_ENGINE_SYMBOL_MAP[msg.s] || msg.s.replace('/', '');
            priceCache.set(symbol, {
              symbol,
              bid: msg.b,
              ask: msg.a,
              spread: msg.a - msg.b,
              time: new Date(msg.t || Date.now()),
              change24h: msg.cp || 0,
            });
          }
        } catch (e) {}
      });
      
      ws.on('close', () => {
        console.log('[PriceFeed] Tick-engine disconnected, reconnecting in 5s...');
        this.tickEngineConnected = false;
        setTimeout(() => this.connectToTickEngine(), 5000);
      });
      
      ws.on('error', (err: any) => {
        console.log('[PriceFeed] Tick-engine error:', err.message);
      });
    } catch (e: any) {
      console.log('[PriceFeed] Could not connect to tick-engine:', e.message);
    }
  }

  // Connect to MetaAPI WebSocket for real-time streaming prices
  private connectToMetaApiWebSocket(): void {
    if (typeof window !== 'undefined') return; // Skip on client side
    if (!METAAPI_TOKEN || !METAAPI_ACCOUNT_ID) {
      console.log('[PriceFeed] MetaAPI credentials not configured, skipping WebSocket');
      return;
    }

    try {
      const WebSocket = require('ws');
      // MetaAPI streaming WebSocket endpoint
      const wsUrl = `wss://mt-client-api-v1.new-york.agiliumtrade.ai/ws`;
      
      this.metaApiWs = new WebSocket(wsUrl);
      
      this.metaApiWs.on('open', () => {
        console.log('[PriceFeed] Connected to MetaAPI WebSocket');
        this.metaApiWsConnected = true;
        
        // Authenticate with MetaAPI
        this.metaApiWs.send(JSON.stringify({
          type: 'authenticate',
          accountId: METAAPI_ACCOUNT_ID,
          token: METAAPI_TOKEN,
        }));
        
        // Subscribe to priority symbols for real-time ticks
        const prioritySymbols = ['XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD', 'USDJPY', 'ETHUSD', 'XAGUSD'];
        prioritySymbols.forEach(symbol => {
          this.subscribeToSymbol(symbol);
        });
      });
      
      this.metaApiWs.on('message', (data: any) => {
        try {
          const msg = JSON.parse(data.toString());
          
          // Handle price/tick updates from MetaAPI
          if (msg.type === 'prices' || msg.type === 'tick' || msg.type === 'quote') {
            const symbol = msg.symbol;
            if (symbol && msg.bid && msg.ask) {
              priceCache.set(symbol, {
                symbol,
                bid: msg.bid,
                ask: msg.ask,
                spread: msg.ask - msg.bid,
                time: new Date(msg.time || msg.brokerTime || Date.now()),
                change24h: 0,
              });
            }
          }
          
          // Handle synchronization packet with prices
          if (msg.type === 'synchronization' && msg.prices) {
            for (const price of msg.prices) {
              if (price.symbol && price.bid && price.ask) {
                priceCache.set(price.symbol, {
                  symbol: price.symbol,
                  bid: price.bid,
                  ask: price.ask,
                  spread: price.ask - price.bid,
                  time: new Date(price.time || Date.now()),
                  change24h: 0,
                });
              }
            }
          }
          
          // Handle authenticated response
          if (msg.type === 'authenticated') {
            console.log('[PriceFeed] MetaAPI WebSocket authenticated');
          }
        } catch (e) {
          // Ignore parse errors
        }
      });
      
      this.metaApiWs.on('close', () => {
        console.log('[PriceFeed] MetaAPI WebSocket disconnected, reconnecting in 3s...');
        this.metaApiWsConnected = false;
        this.subscribedSymbols.clear();
        setTimeout(() => this.connectToMetaApiWebSocket(), 3000);
      });
      
      this.metaApiWs.on('error', (err: any) => {
        console.log('[PriceFeed] MetaAPI WebSocket error:', err.message);
      });
    } catch (e: any) {
      console.log('[PriceFeed] Could not connect to MetaAPI WebSocket:', e.message);
    }
  }

  // Subscribe to a symbol for real-time updates via MetaAPI WebSocket
  private subscribeToSymbol(symbol: string): void {
    if (!this.metaApiWsConnected || !this.metaApiWs) return;
    if (this.subscribedSymbols.has(symbol)) return;
    
    try {
      this.metaApiWs.send(JSON.stringify({
        type: 'subscribe',
        accountId: METAAPI_ACCOUNT_ID,
        symbol: symbol,
      }));
      this.subscribedSymbols.add(symbol);
      console.log(`[PriceFeed] Subscribed to ${symbol} via MetaAPI WebSocket`);
    } catch (e) {
      // Ignore subscription errors
    }
  }

  // Start priority symbol fetching loop (faster than continuous fetch)
  private startPriorityFetch(): void {
    const priorityLoop = async () => {
      while (true) {
        // Only fetch via REST if WebSocket is not connected
        if (!this.metaApiWsConnected && !this.tickEngineConnected) {
          await this.fetchPrioritySymbolsFast();
        }
        await new Promise(resolve => setTimeout(resolve, PRIORITY_FETCH_INTERVAL));
      }
    };
    
    priorityLoop().catch(console.error);
  }

  // Fast fetch for priority symbols only (no rate limiting check)
  private async fetchPrioritySymbolsFast(): Promise<void> {
    if (!METAAPI_TOKEN || !METAAPI_ACCOUNT_ID) return;
    
    const prioritySymbols = ['XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD', 'USDJPY', 'ETHUSD'];
    
    // Fetch all in parallel for speed
    await Promise.all(prioritySymbols.map(async (symbol) => {
      try {
        const url = `${METAAPI_BASE_URL}/users/current/accounts/${METAAPI_ACCOUNT_ID}/symbols/${symbol}/current-price`;
        const res = await fetch(url, {
          headers: {
            'auth-token': METAAPI_TOKEN,
            'Accept': 'application/json',
          },
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.bid && data.ask) {
            priceCache.set(symbol, {
              symbol,
              bid: data.bid,
              ask: data.ask,
              spread: data.ask - data.bid,
              time: new Date(data.time || Date.now()),
              change24h: 0,
            });
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }));
  }

  // Start continuous background price fetching for real-time updates
  private startContinuousFetch(): void {
    if (continuousFetchRunning) return;
    continuousFetchRunning = true;
    
    const fetchLoop = async () => {
      while (continuousFetchRunning) {
        await this.fetchPrioritySymbols();
        await new Promise(resolve => setTimeout(resolve, FETCH_INTERVAL));
      }
    };
    
    fetchLoop().catch(console.error);
  }

  // Fetch only priority symbols for fastest updates
  private async fetchPrioritySymbols(): Promise<void> {
    if (!METAAPI_TOKEN || !METAAPI_ACCOUNT_ID) return;
    
    const prioritySymbols = ['XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD', 'USDJPY', 'ETHUSD'];
    
    const promises = prioritySymbols.map(async (symbol) => {
      try {
        const url = `${METAAPI_BASE_URL}/users/current/accounts/${METAAPI_ACCOUNT_ID}/symbols/${symbol}/current-price`;
        const res = await fetch(url, {
          headers: {
            'auth-token': METAAPI_TOKEN,
            'Accept': 'application/json',
          },
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.bid && data.ask) {
            const spread = data.ask - data.bid;
            priceCache.set(symbol, {
              symbol,
              bid: data.bid,
              ask: data.ask,
              spread,
              time: new Date(data.time || Date.now()),
              change24h: 0,
            });
          }
        }
      } catch (e) {
        // Ignore errors
      }
    });
    
    await Promise.all(promises);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // Fetch live prices from MetaAPI - optimized for speed
  private async fetchLivePrices(): Promise<void> {
    if (this.fetchingPrices) return;
    const now = Date.now();
    if (now - lastFetchTime < FETCH_INTERVAL) return;
    
    this.fetchingPrices = true;
    lastFetchTime = now;

    try {
      if (METAAPI_TOKEN && METAAPI_ACCOUNT_ID) {
        // Priority symbols - fetch in parallel for speed
        const prioritySymbols = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD'];
        
        // Fetch priority symbols in parallel
        const priorityPromises = prioritySymbols.map(async (symbol) => {
          try {
            const url = `${METAAPI_BASE_URL}/users/current/accounts/${METAAPI_ACCOUNT_ID}/symbols/${symbol}/current-price`;
            const res = await fetch(url, {
              headers: {
                'auth-token': METAAPI_TOKEN,
                'Accept': 'application/json',
              },
              cache: 'no-store',
            });
            if (res.ok) {
              const data = await res.json();
              if (data.bid && data.ask) {
                const spread = data.ask - data.bid;
                priceCache.set(symbol, {
                  symbol,
                  bid: data.bid,
                  ask: data.ask,
                  spread,
                  time: new Date(data.time || Date.now()),
                  change24h: 0,
                });
              }
            }
          } catch (e) {
            // Ignore fetch errors
          }
        });
        
        await Promise.all(priorityPromises);
        
        // Fetch remaining symbols in parallel batches
        const remainingSymbols = ALL_SYMBOLS.map(s => s.symbol).filter(s => !prioritySymbols.includes(s));
        const batchSize = 5;
        
        for (let i = 0; i < remainingSymbols.length; i += batchSize) {
          const batch = remainingSymbols.slice(i, i + batchSize);
          const batchPromises = batch.map(async (symbol) => {
            try {
              const res = await fetch(
                `${METAAPI_BASE_URL}/users/current/accounts/${METAAPI_ACCOUNT_ID}/symbols/${symbol}/current-price`,
                {
                  headers: {
                    'auth-token': METAAPI_TOKEN,
                    'Accept': 'application/json',
                  },
                  cache: 'no-store',
                }
              );
              if (res.ok) {
                const data = await res.json();
                if (data.bid && data.ask) {
                  const spread = data.ask - data.bid;
                  priceCache.set(symbol, {
                    symbol,
                    bid: data.bid,
                    ask: data.ask,
                    spread,
                    time: new Date(data.time || Date.now()),
                    change24h: 0,
                  });
                }
              }
            } catch (e) {
              // Ignore individual fetch errors
            }
          });
          await Promise.all(batchPromises);
        }
      }

      // Fallback: Fetch crypto prices from Coinbase in parallel
      const cryptoSymbols = ['BTC', 'ETH', 'LTC', 'XRP', 'SOL', 'DOGE'];
      const cryptoPromises = cryptoSymbols.map(async (crypto) => {
        const symbol = `${crypto}USD`;
        if (!priceCache.has(symbol) || (Date.now() - (priceCache.get(symbol)?.time.getTime() || 0)) > 10000) {
          try {
            const res = await fetch(`https://api.coinbase.com/v2/prices/${crypto}-USD/spot`, {
              headers: { 'Accept': 'application/json' },
              cache: 'no-store',
            });
            if (res.ok) {
              const data = await res.json();
              const price = parseFloat(data.data?.amount || '0');
              if (price > 0) {
                const spread = STATIC_SPREAD[symbol] || price * 0.001;
                STATIC_MID[symbol] = price;
                priceCache.set(symbol, {
                  symbol,
                  bid: price - spread / 2,
                  ask: price + spread / 2,
                  spread,
                  time: new Date(),
                  change24h: 0,
                });
              }
            }
          } catch (e) {
            // Ignore
          }
        }
      });
      await Promise.all(cryptoPromises);
    } catch (error) {
      console.error('[PriceFeed] Error fetching live prices:', error);
    } finally {
      this.fetchingPrices = false;
    }
  }

  // Update price from external source
  updatePrice(symbol: string, bid: number, ask: number, change24h?: number) {
    const spread = ask - bid;
    priceCache.set(symbol, {
      symbol,
      bid,
      ask,
      spread,
      time: new Date(),
      change24h: change24h || 0,
    });
  }

  // Get cached price
  async getPriceAsync(symbol: string): Promise<PriceData | null> {
    // Ensure initial fetch is done
    if (!initialFetchDone && METAAPI_TOKEN) {
      await this.fetchLivePrices();
      initialFetchDone = true;
    }
    return priceCache.get(symbol) || buildStaticPrice(symbol);
  }

  // Get cached price (sync - uses cache or fallback)
  getPrice(symbol: string): PriceData | null {
    // Try to fetch fresh prices periodically (async, don't await)
    this.fetchLivePrices();
    return priceCache.get(symbol) || buildStaticPrice(symbol);
  }

  // Get all cached prices
  async getPrices(symbols: string[]): Promise<PriceData[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const prices: PriceData[] = [];
    for (const symbol of symbols) {
      const price = this.getPrice(symbol);
      if (price) {
        prices.push(price);
      }
    }
    return prices;
  }

  // Get all available symbols
  getAvailableSymbols(): string[] {
    return ALL_SYMBOLS.map(s => s.symbol);
  }

  // Subscribe placeholder - implement with your API
  async subscribe(symbol: string): Promise<void> {
    // Will be implemented with new API
    void symbol;
  }
}

// Singleton instance
export const priceFeed = new PriceFeedService();
