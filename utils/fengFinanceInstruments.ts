export const FENG_FINANCE_INSTRUMENTS = [
  {
    id: 'nikkei-225',
    name: 'Nikkei 225 Index',
    labelAlias: '日経平均株価',
    symbol: '.N225',
    group: 'Asia Index',
    url: 'https://www.cnbc.com/quotes/.N225',
    youtubeUrl: 'https://www.youtube.com/results?search_query=%E6%97%A5%E7%B5%8C%E5%B9%B3%E5%9D%87%E6%A0%AA%E4%BE%A1'
  },
  {
    id: 'kospi',
    name: 'KOSPI Index',
    labelAlias: '코스피',
    symbol: '.KS11',
    group: 'Asia Index',
    url: 'https://www.cnbc.com/quotes/.KS11?qsearchterm=kospi',
    youtubeUrl: 'https://www.youtube.com/results?search_query=%EC%BD%94%EC%8A%A4%ED%94%BC',
    alertThreshold: 12682,
    alertLabel: 'KOSPI target'
  },
  {
    id: 'tsmc',
    name: 'Taiwan Semiconductor Manufacturing Co., Ltd.',
    symbol: '2330.TW',
    group: 'Taiwan Stock',
    url: 'https://tw.stock.yahoo.com/quote/2330.TW',
    source: 'Yahoo Finance',
    alertThreshold: 3333,
    alertLabel: 'TSMC target'
  },
  {
    id: 'sk-hynix',
    name: 'SK hynix Inc.',
    symbol: '000660.KS',
    group: 'Korea Stock',
    url: 'https://tw.stock.yahoo.com/quote/000660.KS',
    source: 'Yahoo Finance',
    alertThreshold: 11110000,
    alertLabel: 'SK Hynix target'
  },
  {
    id: 'samsung-electronics',
    name: 'Samsung Electronics Co., Ltd.',
    symbol: '005930.KS',
    group: 'Korea Stock',
    url: 'https://hk.finance.yahoo.com/quote/005930.KS/',
    source: 'Yahoo Finance',
    alertThreshold: 1110000,
    alertLabel: 'Samsung target'
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
    labelAlias: "Roaring '20s",
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
    labelAlias: '科技泡沫',
    symbol: '.IXIC',
    group: 'U.S. Index',
    url: 'https://www.cnbc.com/quotes/.IXIC'
  },
  {
    id: 'philadelphia-semiconductor',
    name: 'Philadelphia Semiconductor Index',
    labelAlias: '半導體泡沫',
    symbol: '.SOX',
    group: 'U.S. Index',
    url: 'https://www.cnbc.com/quotes/.SOX'
  },
  {
    id: 'berkshire-hathaway-a',
    name: 'Berkshire Hathaway Inc Class A',
    labelAlias: '巴菲特',
    symbol: 'BRK.A',
    group: 'U.S. Stock',
    url: 'https://www.cnbc.com/quotes/BRK.A'
  },
  {
    id: 'berkshire-hathaway-b',
    name: 'Berkshire Hathaway Inc Class B',
    labelAlias: '巴菲特',
    symbol: 'BRK.B',
    group: 'U.S. Stock',
    url: 'https://www.cnbc.com/quotes/BRK.B'
  },
  {
    id: 'micron',
    name: 'Micron Technology Inc',
    labelAlias: 'AI泡沫',
    symbol: 'MU',
    group: 'U.S. Stock',
    url: 'https://www.cnbc.com/quotes/MU'
  },
  {
    id: 'spacex',
    name: 'SpaceX',
    labelAlias: '人類泡沫',
    symbol: 'SPCX',
    group: 'U.S. Stock',
    url: 'https://www.cnbc.com/quotes/SPCX'
  },
  {
    id: 'apple',
    name: 'Apple Inc',
    labelAlias: '手機泡沫',
    symbol: 'AAPL',
    group: 'U.S. Stock',
    url: 'https://www.cnbc.com/quotes/AAPL'
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
