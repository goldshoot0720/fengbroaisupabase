export const FENG_FINANCE_INSTRUMENTS = [
  {
    id: 'nikkei-225',
    name: 'Nikkei 225 Index',
    symbol: '.N225',
    group: 'Asia Index',
    url: 'https://www.cnbc.com/quotes/.N225'
  },
  {
    id: 'kospi',
    name: 'KOSPI Index',
    symbol: '.KS11',
    group: 'Asia Index',
    url: 'https://www.cnbc.com/quotes/.KS11?qsearchterm=kospi',
    alertThreshold: 12682,
    alertLabel: '好想贏韓國'
  },
  {
    id: 'tsmc',
    name: 'Taiwan Semiconductor Manufacturing Co., Ltd.',
    symbol: '2330.TW',
    group: 'Taiwan Stock',
    url: 'https://tw.stock.yahoo.com/quote/2330.TW',
    source: 'Yahoo Finance',
    alertThreshold: 3333,
    alertLabel: '33電'
  },
  {
    id: 'sk-hynix',
    name: 'SK hynix Inc.',
    symbol: '000660.KS',
    group: 'Korea Stock',
    url: 'https://tw.stock.yahoo.com/quote/000660.KS',
    source: 'Yahoo Finance',
    alertThreshold: 11110000,
    alertLabel: '8位數'
  },
  {
    id: 'samsung-electronics',
    name: 'Samsung Electronics Co., Ltd.',
    symbol: '005930.KS',
    group: 'Korea Stock',
    url: 'https://hk.finance.yahoo.com/quote/005930.KS/',
    source: 'Yahoo Finance',
    alertThreshold: 1110000,
    alertLabel: '7位數'
  },
  {
    id: 'brent',
    name: 'ICE Brent Crude',
    symbol: '@LCO.1',
    group: 'Commodity',
    url: 'https://www.cnbc.com/quotes/@LCO.1'
  },
  {
    id: 'us-30y',
    name: 'U.S. 30 Year Treasury',
    symbol: 'US30Y',
    group: 'Rates',
    url: 'https://www.cnbc.com/quotes/US30Y'
  },
  {
    id: 'gold',
    name: 'Gold COMEX',
    symbol: '@GC.1',
    group: 'Commodity',
    url: 'https://www.cnbc.com/quotes/@GC.1'
  },
  {
    id: 'dow',
    name: 'Dow Jones Industrial Average',
    symbol: '.DJI',
    group: 'U.S. Index',
    url: 'https://www.cnbc.com/quotes/.DJI'
  },
  {
    id: 'sp500',
    name: 'S&P 500 Index',
    symbol: '.SPX',
    group: 'U.S. Index',
    url: 'https://www.cnbc.com/quotes/.SPX'
  },
  {
    id: 'nasdaq',
    name: 'NASDAQ Composite',
    symbol: '.IXIC',
    group: 'U.S. Index',
    url: 'https://www.cnbc.com/quotes/.IXIC'
  },
  {
    id: 'vix',
    name: 'CBOE Volatility Index',
    symbol: '.VIX',
    group: 'Volatility',
    url: 'https://www.cnbc.com/quotes/.VIX'
  },
  {
    id: 'bitcoin',
    name: 'Bitcoin/USD Coin Metrics',
    symbol: 'BTC.CM=',
    group: 'Crypto',
    url: 'https://www.cnbc.com/quotes/BTC.CM='
  },
  {
    id: 'ether',
    name: 'Ether/USD Coin Metrics',
    symbol: 'ETH.CM=',
    group: 'Crypto',
    url: 'https://www.cnbc.com/quotes/ETH.CM='
  },
  {
    id: 'shiller-pe',
    name: 'Shiller PE Ratio',
    symbol: 'CAPE',
    group: 'Valuation',
    url: 'https://www.multpl.com/shiller-pe',
    source: 'Multpl'
  }
]
