import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Space, Typography, Alert, Progress, Statistic, Row, Col } from 'antd';
import { 
  FireOutlined, 
  ThunderboltOutlined, 
  SyncOutlined,
  InfoCircleOutlined,
  UserOutlined,
  RiseOutlined
} from '@ant-design/icons';
import realTimeDataService, { type RealTimeIPOData } from '../services/realTimeDataService';

const { Text, Title } = Typography;

const RealTimeMarginData: React.FC = () => {
  const [data, setData] = useState<RealTimeIPOData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const realTimeData = await realTimeDataService.fetchRealTimeIPOData();
      setData(realTimeData);
      setLastUpdate(new Date().toLocaleString('zh-CN'));
    } catch (error) {
      console.error('加载实时数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // 每5分钟自动刷新一次
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getHeatTag = (publicMultiple: number) => {
    const heat = realTimeDataService.getHeatLevel(0, publicMultiple);
    return (
      <Tag color={heat.color} icon={publicMultiple > 50 ? <FireOutlined /> : undefined}>
        {heat.level}
      </Tag>
    );
  };

  const columns = [
    {
      title: '股票代码',
      dataIndex: 'stockCode',
      key: 'stockCode',
      width: 100,
      render: (text: string) => <Text strong style={{ color: '#1890ff' }}>{text}</Text>
    },
    {
      title: '股票名称',
      dataIndex: 'stockName',
      key: 'stockName',
      width: 120,
    },
    {
      title: '行业',
      dataIndex: 'industry',
      key: 'industry',
      width: 150,
      ellipsis: true,
    },
    {
      title: '孖展倍数',
      dataIndex: 'marginMultiple',
      key: 'marginMultiple',
      width: 120,
      sorter: (a: RealTimeIPOData, b: RealTimeIPOData) => (a.marginMultiple || 0) - (b.marginMultiple || 0),
      render: (value: number) => {
        const color = value > 100 ? '#ff4d4f' : value > 50 ? '#fa8c16' : '#52c41a';
        return (
          <Text strong style={{ color, fontSize: 14 }}>
            {value ? `${value.toFixed(1)}x` : '-'}
          </Text>
        );
      }
    },
    {
      title: '孖展金额',
      dataIndex: 'marginAmount',
      key: 'marginAmount',
      width: 120,
      sorter: (a: RealTimeIPOData, b: RealTimeIPOData) => (a.marginAmount || 0) - (b.marginAmount || 0),
      render: (value: number) => (
        <Text>{value ? `${value.toFixed(1)}亿` : '-'}</Text>
      )
    },
    {
      title: '公开发售倍数',
      dataIndex: 'publicSubscriptionMultiple',
      key: 'publicSubscriptionMultiple',
      width: 140,
      sorter: (a: RealTimeIPOData, b: RealTimeIPOData) => 
        (a.publicSubscriptionMultiple || 0) - (b.publicSubscriptionMultiple || 0),
      render: (value: number) => {
        if (!value) return <Text>-</Text>;
        return (
          <Space direction="vertical" size={0}>
            <Text strong style={{ color: value > 100 ? '#ff4d4f' : '#1890ff' }}>
              {value.toFixed(1)}x
            </Text>
            {getHeatTag(value)}
          </Space>
        );
      }
    },
    {
      title: '一手中签率',
      dataIndex: 'oneHandWinRate',
      key: 'oneHandWinRate',
      width: 120,
      render: (value: number) => {
        if (!value) return <Text>-</Text>;
        const percent = (value * 100).toFixed(1);
        const color = value > 0.5 ? '#52c41a' : value > 0.1 ? '#faad14' : '#ff4d4f';
        return (
          <Space direction="vertical" size={0}>
            <Text strong style={{ color }}>{percent}%</Text>
            <Progress 
              percent={parseFloat(percent)} 
              size="small" 
              showInfo={false}
              strokeColor={color}
            />
          </Space>
        );
      }
    },
    {
      title: '申购人数',
      dataIndex: 'subscriptionCount',
      key: 'subscriptionCount',
      width: 120,
      render: (value: number) => (
        <Space>
          <UserOutlined />
          <Text>{value ? value.toLocaleString() : '-'}</Text>
        </Space>
      )
    },
    {
      title: '招股截止',
      dataIndex: 'subscriptionEndDate',
      key: 'subscriptionEndDate',
      width: 120,
      render: (date: string) => {
        const isNear = new Date(date).getTime() - Date.now() < 24 * 60 * 60 * 1000;
        return (
          <Text type={isNear ? 'danger' : undefined} strong={isNear}>
            {date}
          </Text>
        );
      }
    }
  ];

  return (
    <Card
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <ThunderboltOutlined style={{ color: '#1890ff', fontSize: 20 }} />
            <Title level={4} style={{ margin: 0 }}>实时孖展数据</Title>
            <Tag color="blue">数据来源: AiPO / AASTOCKS / ETNet</Tag>
          </Space>
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              最后更新: {lastUpdate}
            </Text>
            <SyncOutlined 
              spin={loading} 
              onClick={loadData}
              style={{ cursor: 'pointer', color: '#1890ff' }}
            />
          </Space>
        </Space>
      }
      style={{ marginBottom: 24 }}
    >
      <Alert
        message="数据说明"
        description={
          <Space direction="vertical" size={0}>
            <Text>• 孖展倍数: 融资认购金额 / 公开发售金额,反映市场申购热度</Text>
            <Text>• 公开发售倍数: 整体认购金额 / 公开发售金额,包含现金和融资</Text>
            <Text>• 一手中签率: 申购1手的成功概率,热门股通常低于10%</Text>
            <Text type="warning">⚠️ 数据每5分钟自动刷新,孖展倍数会随时间变化</Text>
          </Space>
        }
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      {/* 统计概览 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="正在招股"
              value={data.length}
              suffix="只"
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="热门股(>50x)"
              value={data.filter(d => (d.publicSubscriptionMultiple || 0) > 50).length}
              suffix="只"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="总孖展金额"
              value={data.reduce((sum, d) => sum + (d.marginAmount || 0), 0).toFixed(1)}
              suffix="亿"
              precision={1}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="平均孖展倍数"
              value={data.length > 0 
                ? (data.reduce((sum, d) => sum + (d.marginMultiple || 0), 0) / data.length).toFixed(1)
                : 0
              }
              suffix="x"
            />
          </Card>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="stockCode"
        loading={loading}
        pagination={false}
        scroll={{ x: 1200 }}
        size="small"
      />
    </Card>
  );
};

export default RealTimeMarginData;
