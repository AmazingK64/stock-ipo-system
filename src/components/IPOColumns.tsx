/**
 * IPO表格列定义
 * 包含申购/即将上市、今日上市的列配置
 */

import React from 'react';
import { Tag, Space, Progress, Modal, Divider, Card, Typography } from 'antd';
import {
  TrophyOutlined,
  FireOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  CalendarOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import type { IPOStock } from '../types';
import ipoScoringService from '../services/ipoScoring';

const { Text } = Typography;

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
const TextSuccess: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <span style={{ color: '#52c41a', ...style }}>{children}</span>
);

/** 辅助组件 - 危险文字 */
const TextDanger: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <span style={{ color: '#ff4d4f', ...style }}>{children}</span>
);

/** 获取评分详情 */
export const getScoreDetails = (record: IPOStock): {
  items: Array<{ label: string; value: number; maxScore: number; description: string }>;
  total: number;
} => {
  // 委托给评分服务
  return ipoScoringService.getScoreDetails(record);
};

/** 评分详情弹窗组件 */
export const ScoreDetailModal: React.FC<{
  visible: boolean;
  record: IPOStock | null;
  onClose: () => void;
}> = ({ visible, record, onClose }) => {
  if (!record) return null;
  
  const { items, total } = getScoreDetails(record);
  const grade = record.grade || 'N/A';
  
  return (
    <Modal
      title={
        <Space>
          <InfoCircleOutlined style={{ color: '#1890ff' }} />
          <span>评分详情 - {record.stockCode} {record.stockName}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={950}
      centered
    >
      <div style={{ display: 'flex', gap: 16, maxHeight: 'calc(100vh - 200px)' }}>
        {/* 左侧: 评分细则 */}
        <Card 
          title={<Text strong>评分细则</Text>}
          size="small"
          style={{ flex: 1.4 }}
          styles={{ body: { padding: '12px 16px' } }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            {items.map((item, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Text strong style={{ width: 72, flexShrink: 0 }}>{item.label}</Text>
                <Tag color="blue" style={{ flexShrink: 0 }}>
                  +{item.value}/{item.maxScore}分
                </Tag>
                <TextSecondary style={{ fontSize: 12, flex: 1 }}>{item.description}</TextSecondary>
              </div>
            ))}
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Text strong style={{ width: 60, flexShrink: 0, fontSize: 14 }}>总分</Text>
              <Tag color="green" style={{ fontWeight: 'bold' }}>
                {total}分
              </Tag>
              <Tag
                color={getGradeColor(grade)}
                icon={getGradeIcon(grade)}
                style={{ fontWeight: 'bold' }}
              >
                {grade}
              </Tag>
            </div>
          </Space>
        </Card>

        {/* 右侧: 等级说明 */}
        <Card
          title={<Text strong>等级说明</Text>}
          size="small"
          style={{ flex: 1.2, overflow: 'hidden' }}
          styles={{ body: { padding: '12px 16px', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' } }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
              评分维度: 行业热度(30) + 保荐人(18) + 投资者(16) + 商业模式(17) + 估值(10) + 绿鞋(5) + AH折价(2) + 盈利(2)
            </Text>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#52c41a" style={{ fontWeight: 'bold', flexShrink: 0 }}>A+</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>80分以上</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                顶级优质标的。行业领先且风口明确；顶级保荐人+知名基石加持；商业模式清晰，护城河宽；估值便宜或合理。
              </Text>
              <TextSuccess style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2 }}>
                建议：可融资申购，积极参与
              </TextSuccess>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#52c41a" style={{ fontWeight: 'bold', flexShrink: 0 }}>A</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>72-79分</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                优质标的。行业前景良好，有一定竞争力；知名保荐人；有基石投资者；商业模式清晰，估值合理。
              </Text>
              <TextSuccess style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2 }}>
                建议：可融资申购，建议参与
              </TextSuccess>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#52c41a" style={{ fontWeight: 'bold', flexShrink: 0 }}>A-</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>65-71分</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                良好标的。行业有一定成长空间；有保荐人支持；商业模式较清晰，护城河中等；估值相对合理。
              </Text>
              <TextSuccess style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2 }}>
                建议：可适度参与，优先现金申购
              </TextSuccess>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#1890ff" style={{ fontWeight: 'bold', flexShrink: 0 }}>B+</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>58-64分</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                中上水平。行业前景尚可；保荐人资质普通；商业模式一般，护城河窄；估值略高。
              </Text>
              <Text style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2, color: '#1890ff' }}>
                建议：谨慎参与，优先现金申购
              </Text>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#1890ff" style={{ fontWeight: 'bold', flexShrink: 0 }}>B</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>48-57分</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                中等水平。行业竞争较激烈；保荐人资质一般；商业模式不突出；估值偏高。
              </Text>
              <Text style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2, color: '#1890ff' }}>
                建议：少量参与或不参与
              </Text>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#1890ff" style={{ fontWeight: 'bold', flexShrink: 0 }}>B-</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>38-47分</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                中下水平。行业前景不明朗；缺乏明显竞争优势；保荐人实力有限；估值偏高。
              </Text>
              <Text style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2, color: '#faad14' }}>
                建议：观望为主
              </Text>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#faad14" style={{ fontWeight: 'bold', flexShrink: 0 }}>C+</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>28-37分</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                较差标的。行业前景欠佳；缺乏核心竞争力；保荐人资质较差；估值明显偏高。
              </Text>
              <TextDanger style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2 }}>
                建议：谨慎或不参与
              </TextDanger>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#faad14" style={{ fontWeight: 'bold', flexShrink: 0 }}>C</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>18-27分</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                差标的。行业前景黯淡；竞争力薄弱；保荐人实力不足；估值显著偏高。
              </Text>
              <TextDanger style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2 }}>
                建议：不参与
              </TextDanger>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#ff4d4f" style={{ fontWeight: 'bold', flexShrink: 0 }}>D</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>18分以下</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                风险极高。基本面较差或信息不充分。
              </Text>
              <TextDanger style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2 }}>
                建议：不参与
              </TextDanger>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            <Text type="secondary" style={{ fontSize: 11 }}>
              预期收益仅供参考,投资需谨慎
            </Text>
          </Space>
        </Card>
      </div>
    </Modal>
  );
};

/** 表格列定义 - 申购/即将上市 */
export const getIPOColumns = (
  onScoreClick: (record: IPOStock) => void
) => [
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
    width: 120,
    render: (text: string) => <strong>{text}</strong>
  },
  {
    title: '行业',
    dataIndex: 'industry',
    key: 'industry',
    width: 110,
    render: (text: string) => text ? <Tag color="blue">{text}</Tag> : <TextSecondary>-</TextSecondary>
  },
  {
    title: '发行价',
    dataIndex: 'issuePrice',
    key: 'issuePrice',
    width: 85,
    render: (text: string) => text && text !== '待定' ? <span>HK${text}</span> : <TextSecondary>待定</TextSecondary>
  },
  {
    title: '每手股数',
    dataIndex: 'sharesPerLot',
    key: 'sharesPerLot',
    width: 100,
    render: (sharesPerLot: number, record: IPOStock) => {
      const issuePrice = parseFloat(record.issuePrice) || 0;
      const lots = sharesPerLot || 100;
      const entryFee = issuePrice * lots;
      return (
        <Space direction="vertical" size={0}>
          <strong style={{ color: '#1890ff' }}>{lots}股/手</strong>
          <TextSecondary style={{ fontSize: 11 }}>
            {issuePrice > 0 ? `HK${entryFee.toFixed(0)}` : '-'}
          </TextSecondary>
        </Space>
      );
    }
  },
  {
    title: '集资规模',
    dataIndex: 'marketCap',
    key: 'marketCap',
    width: 95,
    render: (text: string) => text && text !== '待定' ? <TextSecondary>{text}</TextSecondary> : <TextSecondary>-</TextSecondary>
  },
  {
    title: '公司估值',
    dataIndex: 'companyValue',
    key: 'companyValue',
    width: 95,
    render: (text: string) => text && text !== '待定' ? <TextSecondary>{text}</TextSecondary> : <TextSecondary>-</TextSecondary>
  },
  {
    title: '发售手数',
    dataIndex: 'totalLots',
    key: 'totalLots',
    width: 95,
    render: (totalLots: number) => {
      if (!totalLots || totalLots === 0) return <TextSecondary>-</TextSecondary>;
      return (
        <TextSecondary>
          {totalLots >= 10000 
            ? `${(totalLots / 10000).toFixed(1)}万手` 
            : `${totalLots}手`}
        </TextSecondary>
      );
    }
  },
  {
    title: '保荐人',
    dataIndex: 'underwriter',
    key: 'underwriter',
    width: 95,
    render: (text: string) => text && text !== '待定' ? <Tag color="purple">{text}</Tag> : <TextSecondary>-</TextSecondary>
  },
  {
    title: '评分',
    dataIndex: 'score',
    key: 'score',
    width: 110,
    render: (score: number, record: IPOStock) => (
      <div 
        style={{ cursor: 'pointer' }}
        onClick={() => onScoreClick(record)}
      >
        <Progress
          percent={score || 0}
          size="small"
          strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
          format={(percent) => (
            <span style={{ fontSize: 12 }}>
              {percent}分 <InfoCircleOutlined style={{ fontSize: 10, marginLeft: 2 }} />
            </span>
          )}
        />
      </div>
    ),
    sorter: (a: IPOStock, b: IPOStock) => (a.score || 0) - (b.score || 0),
  },
  {
    title: '等级',
    dataIndex: 'grade',
    key: 'grade',
    width: 70,
    render: (grade: string, record: IPOStock) => (
      <div 
        style={{ cursor: 'pointer' }}
        onClick={() => onScoreClick(record)}
      >
        <Tag
          color={getGradeColor(grade)}
          icon={getGradeIcon(grade)}
          style={{ fontSize: 14, padding: '4px 8px', fontWeight: 'bold' }}
        >
          {grade || 'N/A'}
        </Tag>
      </div>
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

// 保留旧的导出以兼容
export const ipoColumns = getIPOColumns(() => {});

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