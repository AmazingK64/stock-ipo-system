import Dexie, { type Table } from 'dexie';
import type { IPOStock, Capital, Allocation, IPOHistory } from '../types';

// 创建本地数据库
class IPODatabase extends Dexie {
  capital!: Table<Capital>;
  ipoStocks!: Table<IPOStock>;
  allocation!: Table<Allocation>;
  history!: Table<IPOHistory>;

  constructor() {
    super('IPOStrategyDB');
    this.version(1).stores({
      capital: '++id, amount, updatedAt',
      ipoStocks: '++id, stockCode, stockName, listingDate, issuePrice, subscriptionStartDate, subscriptionEndDate, score, grade, strategy, createdAt',
      allocation: '++id, ipoStockId, capitalAllocation, financingAmount, allocationRatio, createdAt',
      history: '++id, ipoStockId, status, profit, createdAt'
    });
  }
}

const db = new IPODatabase();

export default db;
