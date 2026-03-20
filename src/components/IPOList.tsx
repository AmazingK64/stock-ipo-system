import React, { useState, useMemo } from 'react';
import { Card, Table, Tag, Progress, Space, Typography, Switch, Alert } from 'antd';
import { TrophyOutlined, FireOutlined, WarningOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { IPOStock } from '../types';

const { Text } = Typography;

interface IPOListProps {
  ipoStocks: IPOStock[];
  loading: boolean;
}

const IPOList: React.FC<IPOListProps> = ({ ipoStocks, loading }) => {
  const [hideClosed, setHideClosed] = useState(true); // 默认隐藏已截止股票

  // 过滤已截止股票
  const filteredStocks = useMemo(() => {
    const now = new Date();
    if (!hideClosed) {
      return ipoStocks;
    }
    return ipoStocks.filter(ipo => {
      const subscriptionEnd = new Date(ipo.subscriptionEndDate);
      return subscriptionEnd > now;
    });
  }, [ipoStocks, hideClosed]);

  // 统计已截止股票数量
  const closedCount = useMemo(() => {
    const now = new Date();
    return ipoStocks.filter(ipo => new Date(ipo.subscriptionEndDate) <= now).length;
  }, [ipoStocks]);

  const getGradeColor = (grade: string): string => {
    if (grade.startsWith('A')) return '#52c41a';
    if (grade.startsWith('B')) return '#1890ff';
    if (grade.startsWith('C')) return '#faad14';
    return '#ff4d4f';
  };

  const getGradeIcon = (grade: string) => {
    if (grade.startsWith('A')) return <TrophyOutlined style={{ color: '#52c41a' }} />;
    if (grade.startsWith('B')) return <FireOutlined style={{ color: '#1890ff' }} />;
    if (grade.startsWith('C')) return <WarningOutlined style={{ color: '#faad14' }} />;
    return <WarningOutlined style={{ color: '#ff4d4f' }} />;
  };

  // 判断股票是否已截止
  const isClosed = (subscriptionEndDate: string): boolean => {
    return new Date(subscriptionEndDate) <= new Date();
  };

  const columns = [
    {
      title: '股票代码',
      dataIndex: 'stockCode',
      key: 'stockCode',
      width: 120,
      render: (text: string) => <Text strong style={{ color: '#1890ff' }}>{text}</Text>
    },
    {
      title: '股票名称',
      dataIndex: 'stockName',
      key: 'stockName',
      width: 150,
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: '行业',
      dataIndex: 'industry',
      key: 'industry',
      width: 120,
      render: (text: string) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '发行价',
      dataIndex: 'issuePrice',
      key: 'issuePrice',
      width: 100,
      render: (text: string) => <Text>{`HK$${text}`}</Text>
    },
    {
      title: '每手股数',
      dataIndex: 'sharesPerLot',
      key: 'sharesPerLot',
      width: 110,
      render: (sharesPerLot: number, record: IPOStock) => {
        const issuePrice = parseFloat(record.issuePrice);
        const entryFee = issuePrice * sharesPerLot;
        return (
          <Space direction="vertical" size={0}>
            <Text strong style={{ color: '#1890ff' }}>{sharesPerLot}股/手</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              入场费: HK${entryFee.toFixed(2)}
            </Text>
          </Space>
        );
      }
    },
    {
      title: '市值',
      dataIndex: 'marketCap',
      key: 'marketCap',
      width: 100,
      render: (text: string) => <Text>{text}</Text>
    },
    {
      title: 'PE比率',
      dataIndex: 'peRatio',
      key: 'peRatio',
      width: 100,
      render: (value: number) => <Text>{value.toFixed(2)}</Text>
    },
    {
      title: '保荐人',
      dataIndex: 'underwriter',
      key: 'underwriter',
      width: 120,
      render: (text: string) => <Tag color="purple">{text}</Tag>
    },
    {
      title: '评分',
      dataIndex: 'score',
      key: 'score',
      width: 150,
      render: (score: number) => (
        <Progress 
          percent={score} 
          size="small" 
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
        />
      ),
      sorter: (a: IPOStock, b: IPOStock) => a.score - b.score,
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
          style={{ fontSize: 14, padding: '4px 12px', fontWeight: 'bold' }}
        >
          {grade}
        </Tag>
      ),
      sorter: (a: IPOStock, b: IPOStock) => a.score - b.score,
    },
    {
      title: '建议',
      dataIndex: 'strategy',
      key: 'recommendation',
      width: 120,
      render: (strategy: any) => (
        <Tag 
          color={strategy.recommendation === '强烈推荐' ? 'success' : 
                 strategy.recommendation === '推荐' ? 'processing' : 
                 strategy.recommendation === '谨慎' ? 'warning' : 'error'}
        >
          {strategy.recommendation}
        </Tag>
      )
    },
    {
      title: '预期收益',
      dataIndex: 'strategy',
      key: 'expectedReturn',
      width: 100,
      render: (strategy: any) => <Text type="success">{strategy.expectedReturn}</Text>
    },
    {
      title: '风险等级',
      dataIndex: 'strategy',
      key: 'riskLevel',
      width: 100,
      render: (strategy: any) => (
        <Tag color={
          strategy.riskLevel === '低' ? 'success' : 
          strategy.riskLevel === '中' ? 'processing' : 'error'
        }>
          {strategy.riskLevel}
        </Tag>
      )
    },
    {
      title: '申购日期',
      dataIndex: 'subscriptionStartDate',
      key: 'subscriptionDate',
      width: 200,
      render: (_: any, record: IPOStock) => {
        const closed = isClosed(record.subscriptionEndDate);
        return (
          <Space direction="vertical" size={0}>
            <Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.subscriptionStartDate} ~ {record.subscriptionEndDate}
              </Text>
              {closed ? (
                <Tag color="default" icon={<ClockCircleOutlined />}>已截止</Tag>
              ) : (
                <Tag color="success" icon={<CheckCircleOutlined />}>申购中</Tag>
              )}
            </Space>
          </Space>
        );
      }
    },
    {
      title: '上市日期',
      dataIndex: 'listingDate',
      key: 'listingDate',
      width: 120,
    }
  ];

  return (
    <Card
      title={
        <Space>
          <TrophyOutlined style={{ color: '#1890ff', fontSize: 20 }} />
          <Text strong style={{ fontSize: 18 }}>新股打新推荐</Text>
          {closedCount > 0 && (
            <Tag color="default">{closedCount}只已截止</Tag>
          )}
        </Space>
      }
      extra={
        <Space>
          <Text type="secondary">隐藏已截止</Text>
          <Switch size="small" checked={hideClosed} onChange={setHideClosed} />
        </Space>
      }
      style={{
        marginBottom: 24,
        borderRadius: 16,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
      }}
    >
      {hideClosed && closedCount > 0 && (
        <Alert
          message={`已隐藏 ${closedCount} 只已截止申购的新股，切换右上角开关可查看全部`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Table
        columns={columns}
        dataSource={filteredStocks}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 只新股`
        }}
        scroll={{ x: 1600 }}
        rowClassName={(record) => {
          if (record.grade.startsWith('A')) return 'row-highlight-a';
          if (record.grade.startsWith('B')) return 'row-highlight-b';
          return '';
        }}
      />
    </Card>
  );
};

export default IPOList;
