/**
 * IPO列表组件 - 精简版
 * 负责展示新股数据的Tab列表
 */

import React, { useState, useMemo } from 'react';
import { Card, Tabs, Space, Typography } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';
import type { IPOStock, RealtimeQuote } from '../types';
import { createIPOTabItems } from './IPOTabs';
import { ScoreDetailModal, type ExtendedIPOStock } from './IPOColumns';

const { Text } = Typography;

interface IPOListProps {
  ipoStocks: IPOStock[];
  loading: boolean;
  realtimeQuotes?: RealtimeQuote[];
}

interface GroupedStocks {
  subscribe: ExtendedIPOStock[];
  upcoming: ExtendedIPOStock[];
  todayListed: RealtimeQuote[];
  recentListed: ExtendedIPOStock[];
}

const IPOList: React.FC<IPOListProps> = ({ ipoStocks, loading, realtimeQuotes = [] }) => {
  const [activeTab, setActiveTab] = useState<string>('upcoming');
  const [scoreDetailVisible, setScoreDetailVisible] = useState(false);
  const [selectedIPO, setSelectedIPO] = useState<IPOStock | null>(null);

  /** 点击评分显示详情 */
  const handleScoreClick = (record: IPOStock) => {
    setSelectedIPO(record);
    setScoreDetailVisible(true);
  };

  /** 根据状态分组股票 */
  const groupedStocks = useMemo(() => {
    const groups: GroupedStocks = {
      subscribe: [],
      upcoming: [],
      todayListed: realtimeQuotes,
      recentListed: []
    };

    const now = new Date();

    ipoStocks.forEach(ipo => {
      // 使用后端返回的status字段
      const status = (ipo as ExtendedIPOStock).status || 'unknown';
      const extendedIPO = ipo as ExtendedIPOStock;

      // 计算距离上市天数
      if (ipo.listingDate) {
        const listingDate = new Date(ipo.listingDate);
        const daysToList = Math.ceil((listingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        extendedIPO.daysToListing = daysToList;
      }

      // 根据状态分组
      switch (status) {
        case 'subscribe':
          groups.subscribe.push(extendedIPO);
          break;
        case 'upcoming':
          groups.upcoming.push(extendedIPO);
          break;
        case 'today_listed':
          // 今日上市的股票在realtimeQuotes中
          break;
        case 'recent_listed':
          groups.recentListed.push(extendedIPO);
          break;
        default:
          // 如果status为unknown，根据日期判断
          console.warn(`[IPOList] 股票 ${ipo.stockCode} 状态未知，尝试根据日期判断`);
          if (ipo.listingDate) {
            const listingDate = new Date(ipo.listingDate);
            if (listingDate > now) {
              groups.upcoming.push(extendedIPO);
            } else {
              groups.recentListed.push(extendedIPO);
            }
          } else {
            groups.subscribe.push(extendedIPO);
          }
      }
    });

    return groups;
  }, [ipoStocks, realtimeQuotes]);

  /** Tab配置 */
  const tabItems = createIPOTabItems({
    groupedStocks,
    loading,
    rowKey: 'id',
    onScoreClick: handleScoreClick
  });

  /** 统计数据 */
  const totalCount = ipoStocks.length;
  const upcomingCount = groupedStocks.upcoming.length;
  const subscribeCount = groupedStocks.subscribe.length;

  return (
    <>
      <Card
        title={
          <Space>
            <TrophyOutlined style={{ color: '#1890ff', fontSize: 20 }} />
            <Text strong style={{ fontSize: 18 }}>新股数据</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              (共 {totalCount} 只 | 申购中 {subscribeCount} 只 | 即将上市 {upcomingCount} 只)
            </Text>
          </Space>
        }
        style={{
          marginBottom: 24,
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Card>

      {/* 评分详情弹窗 */}
      <ScoreDetailModal
        visible={scoreDetailVisible}
        record={selectedIPO}
        onClose={() => setScoreDetailVisible(false)}
      />
    </>
  );
};

export default IPOList;