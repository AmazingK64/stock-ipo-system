/**
 * IPO表格列定义
 * 包含申购/即将上市、今日上市的列配置
 */

import React from 'react';
import { Tag, Space, Progress } from 'antd';
import {
  TrophyOutlined,
  FireOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import type { IPOStock } from '../types';

// 扩展的IPOStock类型
export interface ExtendedIPOStock extends IPOStock {
  status?: 'subscribe' | 'upcoming' | 'today_listed' | 'recent_listed' | 'unknown';
  currentPrice?: string;
  change?: string;
  changeRate?: string;
  openingPrice?: string;
  highPrice?: string;
  lowPrice?: string;
  turnover?: string;
  daysToListing?: number;
}

/** 评分颜色 */
export const getGradeColor = (grade: string): string => {
  if (grade.startsWith('A')) return '#52c41a';
  if (grade.startsWith('B')) return '#1890ff';
  if (grade.startsWith('C')) return '#faad14';
  return '#ff4d4f';
};

/** 评分图标 */
export const getGradeIcon = (grade: string) => {
  if (grade.startsWith('A')) return <TrophyOutlined style={{ color: '#52c41a' }} />;
  if (grade.startsWith('B')) return <FireOutlined style={{ color: '#1890ff' }} />;
  if (grade.startsWith('C')) return <WarningOutlined style={{ color: '#faad14' }} />;
  return <WarningOutlined style={{ color: '#ff4d4f' }} />;
};

/** 判断股票是否已截止 */
export const isClosed = (subscriptionEndDate: string): boolean => {
  if (!subscriptionEndDate || subscriptionEndDate === '--') return false;
  return new Date(subscriptionEndDate) <= new Date();
};

/** 涨跌颜色 */
export const getChangeColor = (change: string): string => {
  if (!change) return '#000';
  return change.startsWith('+') || change.startsWith('升') ? '#ff4d4f' : '#52c41a';
};

/** 辅助组件 - 文字 */
const TextSecondary: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <span style={{ color: '#999', ...style }}>{children}</span>
);

/** 辅助组件 - 成功文字 */
const TextSuccess: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: '#52c41a' }}>{children}</span>
);

/** 辅助组件 - 危险文字 */
const TextDanger: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: '#ff4d4f' }}>{children}</span>
);

/** 表格列定义 - 申购/即将上市 */
export const ipoColumns = [
  {
    title: '股票代码',
    dataIndex: 'stockCode',
    key: 'stockCode',
    width: 100,
    render: (text: string) => <strong style={{ color: '#1890ff' }}>{text}</strong>
  },
  {
    title: '股票名称',
    dataIndex: 'stockName',
    key: 'stockName',
    width: 130,
    render: (text: string) => <strong>{text}</strong>
  },
  {
    title: '行业',
    dataIndex: 'industry',
    key: 'industry',
    width: 120,
    render: (text: string) => text ? <Tag color="blue">{text}</Tag> : <TextSecondary>-</TextSecondary>
  },
  {
    title: '发行价',
    dataIndex: 'issuePrice',
    key: 'issuePrice',
    width: 90,
    render: (text: string) => <span>HK${text}</span>
  },
  {
    title: '每手股数',
    dataIndex: 'sharesPerLot',
    key: 'sharesPerLot',
    width: 110,
    render: (sharesPerLot: number, record: IPOStock) => {
      const issuePrice = parseFloat(record.issuePrice) || 0;
      const lots = sharesPerLot || 100;
      const entryFee = issuePrice * lots;
      return (
        <Space direction="vertical" size={0}>
          <strong style={{ color: '#1890ff' }}>{lots}股/手</strong>
          <TextSecondary style={{ fontSize: 11 }}>
            HK${entryFee.toFixed(2)}
          </TextSecondary>
        </Space>
      );
    }
  },
  {
    title: '市值',
    dataIndex: 'marketCap',
    key: 'marketCap',
    width: 90,
    render: (text: string) => <TextSecondary>{text || '-'}</TextSecondary>
  },
  {
    title: '保荐人',
    dataIndex: 'underwriter',
    key: 'underwriter',
    width: 100,
    render: (text: string) => text ? <Tag color="purple">{text}</Tag> : <TextSecondary>-</TextSecondary>
  },
  {
    title: '评分',
    dataIndex: 'score',
    key: 'score',
    width: 120,
    render: (score: number) => (
      <Progress
        percent={score || 0}
        size="small"
        strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
      />
    ),
    sorter: (a: IPOStock, b: IPOStock) => (a.score || 0) - (b.score || 0),
  },
  {
    title: '等级',
    dataIndex: 'grade',
    key: 'grade',
    width: 80,
    render: (grade: string) => (
      <Tag
        color={getGradeColor(grade)}
        icon={getGradeIcon(grade)}
        style={{ fontSize: 14, padding: '4px 8px', fontWeight: 'bold' }}
      >
        {grade || 'N/A'}
      </Tag>
    ),
  },
  {
    title: '上市日期',
    dataIndex: 'listingDate',
    key: 'listingDate',
    width: 110,
    render: (date: string, record: ExtendedIPOStock) => (
      <Space direction="vertical" size={0}>
        <span>{date || '-'}</span>
        {record.daysToListing && (
          <Tag color="orange" icon={<CalendarOutlined />}>
            {record.daysToListing}日后
          </Tag>
        )}
      </Space>
    )
  },
  {
    title: '申购状态',
    dataIndex: 'subscriptionEndDate',
    key: 'subscriptionStatus',
    width: 100,
    render: (endDate: string) => {
      const closed = isClosed(endDate);
      return (
        closed ? (
          <Tag color="default" icon={<ClockCircleOutlined />}>已截止</Tag>
        ) : (
          <Tag color="success" icon={<CheckCircleOutlined />}>申购中</Tag>
        )
      );
    }
  }
];

/** 表格列定义 - 今日上市(实时行情) */
export const quoteColumns = [
  {
    title: '股票代码',
    dataIndex: 'stockCode',
    key: 'stockCode',
    width: 100,
    render: (text: string) => <strong style={{ color: '#1890ff' }}>{text}</strong>
  },
  {
    title: '股票名称',
    dataIndex: 'stockName',
    key: 'stockName',
    width: 130,
    render: (text: string) => <strong>{text}</strong>
  },
  {
    title: '发行价',
    dataIndex: 'issuePrice',
    key: 'issuePrice',
    width: 90,
    render: (text: string) => <TextSecondary>上市价: HK${text}</TextSecondary>
  },
  {
    title: '当前价',
    dataIndex: 'currentPrice',
    key: 'currentPrice',
    width: 110,
    render: (price: string) => (
      <strong style={{ fontSize: 16, color: '#ff4d4f' }}>
        HK${price || '-'}
      </strong>
    )
  },
  {
    title: '涨跌额',
    dataIndex: 'change',
    key: 'change',
    width: 100,
    render: (change: string) => (
      <span style={{ color: getChangeColor(change), fontWeight: 'bold' }}>
        {change || '-'}
      </span>
    )
  },
  {
    title: '涨跌幅',
    dataIndex: 'changeRate',
    key: 'changeRate',
    width: 100,
    render: (rate: string) => {
      const isUp = rate?.startsWith('+') || rate?.startsWith('升');
      return (
        <Tag color={isUp ? 'red' : 'green'} style={{ fontWeight: 'bold' }}>
          {isUp ? <RiseOutlined /> : null} {rate || '-'}
        </Tag>
      );
    }
  },
  {
    title: '开盘价',
    dataIndex: 'openingPrice',
    key: 'openingPrice',
    width: 90,
    render: (text: string) => <span>HK${text || '-'}</span>
  },
  {
    title: '最高价',
    dataIndex: 'highPrice',
    key: 'highPrice',
    width: 90,
    render: (text: string) => <TextSuccess>HK${text || '-'}</TextSuccess>
  },
  {
    title: '最低价',
    dataIndex: 'lowPrice',
    key: 'lowPrice',
    width: 90,
    render: (text: string) => <TextDanger>HK${text || '-'}</TextDanger>
  },
  {
    title: '成交额',
    dataIndex: 'turnover',
    key: 'turnover',
    width: 100,
    render: (text: string) => <TextSecondary>{text || '-'}</TextSecondary>
  }
];