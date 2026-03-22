import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Space, Typography, Alert, Progress, Statistic, Row, Col, Empty, Spin } from 'antd';
import { 
  FireOutlined, 
  ThunderboltOutlined, 
  SyncOutlined,
  InfoCircleOutlined,
  UserOutlined,
  RiseOutlined,
  WarningOutlined
} from '@ant-design/icons';
import ipoService from '../services/ipoService';
import type { IPOStock } from '../types';

const { Text, Title } = Typography;

interface MarginData {
  stockCode: string;
  stockName: string;
  industry: string;
  marginMultiple?: number;
  marginAmount?: number;
  subscriptionEndDate: string;
  listingDate: string;
  issuePrice: string;
  score?: number;
  grade?: string;
}

const RealTimeMarginData: React.FC = () => {
  const [data, setData] = useState<MarginData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [error, setError] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:3001/api/subscribe-list', {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        throw new Error(`API响应错误: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const now = new Date();
        const activeData = result.data
          .filter((ipo: any) => {
            if (!ipo.subscriptionEndDate) return true;
            return new Date(ipo.subscriptionEndDate) >= now;
          })
          .map((ipo: any) => ({
            stockCode: ipo.stockCode,
            stockName: ipo.stockName,
            industry: ipo.industry || '',
            marginMultiple: ipo.marginMultiple,
            marginAmount: ipo.marginAmount,
            subscriptionEndDate: ipo.subscriptionEndDate,
            listingDate: ipo.listingDate,
            issuePrice: ipo.issuePrice,
            score: ipo.score,
            grade: ipo.grade
          }));
        
        setData(activeData);
        setLastUpdate(new Date().toLocaleString('zh-CN'));
      } else {
        throw new Error('数据为空');
      }
    } catch (error: any) {
      console.error('加载实时数据失败:', error);
      setError(error.message || '获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getHeatTag = (marginMultiple: number) => {
    if (marginMultiple > 100) return <Tag color="#ff4d4f" icon={<FireOutlined />}>超热门</Tag>;
    if (marginMultiple > 50) return <Tag color="#fa8c16">热门</Tag>;
    if (marginMultiple > 20) return <Tag color="#faad14">较热</Tag>;
    if (marginMultiple > 10) return <Tag color="#52c41a">一般</Tag>;
    return <Tag color="#1890ff">冷门</Tag>;
  };

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      'A+': '#ff4d4f', 'A': '#ff7a45', 'A-': '#fa8c16',
      'B+': '#faad14', 'B': '#52c41a', 'B-': '#73d13d',
      'C+': '#1890ff', 'C': '#69c0ff', 'D': '#8c8c8c'
    };
    return colors[grade] || '#8c8c8c';
  };

  const columns = [
    {
      title: '股票代码',
      dataIndex: 'stockCode',
      key: 'stockCode',
      width: 90,
      render: (text: string) => <Text strong style={{ color: '#1890ff' }}>{text}</Text>
    },
    {
      title: '股票名称',
      dataIndex: 'stockName',
      key: 'stockName',
      width: 100,
    },
    {
      title: '行业',
      dataIndex: 'industry',
      key: 'industry',
      width: 120,
      ellipsis: true,
    },
    {
      title: '评分',
      dataIndex: 'grade',
      key: 'grade',
      width: 80,
      render: (grade: string, record: MarginData) => (
        <Tag color={getGradeColor(grade)} style={{ fontWeight: 'bold' }}>
          {grade || '-'} {record.score ? `(${record.score})` : ''}
        </Tag>
      )
    },
    {
      title: '孖展倍数',
      dataIndex: 'marginMultiple',
      key: 'marginMultiple',
      width: 100,
      sorter: (a: MarginData, b: MarginData) => (a.marginMultiple || 0) - (b.marginMultiple || 0),
      render: (value: number) => {
        if (!value) return <Text type="secondary">暂无</Text>;
        const color = value > 100 ? '#ff4d4f' : value > 50 ? '#fa8c16' : '#52c41a';
        return (
          <Space>
            <Text strong style={{ color, fontSize: 14 }}>{value.toFixed(1)}x</Text>
            {getHeatTag(value)}
          </Space>
        );
      }
    },
    {
      title: '孖展金额',
      dataIndex: 'marginAmount',
      key: 'marginAmount',
      width: 90,
      render: (value: number) => value ? <Text>{value.toFixed(1)}亿</Text> : <Text type="secondary">-</Text>
    },
    {
      title: '申购截止',
      dataIndex: 'subscriptionEndDate',
      key: 'subscriptionEndDate',
      width: 100,
      render: (date: string) => {
        if (!date) return <Text>-</Text>;
        const isNear = new Date(date).getTime() - Date.now() < 24 * 60 * 60 * 1000;
        const isPassed = new Date(date) < new Date();
        return (
          <Text type={isPassed ? 'secondary' : isNear ? 'danger' : undefined} strong={isNear}>
            {date}
          </Text>
        );
      }
    },
    {
      title: '上市日期',
      dataIndex: 'listingDate',
      key: 'listingDate',
      width: 100,
      render: (date: string) => <Text>{date || '-'}</Text>
    }
  ];

  const hotStocks = data.filter(d => (d.marginMultiple || 0) > 50);
  const totalMargin = data.reduce((sum, d) => sum + (d.marginAmount || 0), 0);
  const avgMargin = data.length > 0 
    ? data.reduce((sum, d) => sum + (d.marginMultiple || 0), 0) / data.length 
    : 0;

  return (
    <Card
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <ThunderboltOutlined style={{ color: '#1890ff', fontSize: 20 }} />
            <Title level={4} style={{ margin: 0 }}>实时孖展数据</Title>
            <Tag color="blue">申购中: {data.length}只</Tag>
          </Space>
          <Space>
            {lastUpdate && <Text type="secondary" style={{ fontSize: 12 }}>更新: {lastUpdate}</Text>}
            <SyncOutlined 
              spin={loading} 
              onClick={loadData}
              style={{ cursor: 'pointer', color: '#1890ff', fontSize: 16 }}
            />
          </Space>
        </Space>
      }
      style={{ marginBottom: 24 }}
    >
      {error && (
        <Alert
          message="数据获取提示"
          description={`无法获取实时孖展数据: ${error}。请确保后端服务正在运行。`}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>正在获取实时数据...</Text>
        </div>
      ) : data.length === 0 ? (
        <Empty description="暂无申购中的新股" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small" style={{ background: '#f6ffed' }}>
                <Statistic
                  title="申购中"
                  value={data.length}
                  suffix="只"
                  prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ background: hotStocks.length > 0 ? '#fff2e8' : '#fafafa' }}>
                <Statistic
                  title="热门股(>50x)"
                  value={hotStocks.length}
                  suffix="只"
                  valueStyle={{ color: hotStocks.length > 0 ? '#ff4d4f' : '#8c8c8c' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="总孖展金额"
                  value={totalMargin.toFixed(1)}
                  suffix="亿"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="平均孖展倍数"
                  value={avgMargin.toFixed(1)}
                  suffix="x"
                />
              </Card>
            </Col>
          </Row>

          <Table
            columns={columns}
            dataSource={data}
            rowKey="stockCode"
            pagination={false}
            scroll={{ x: 900 }}
            size="small"
          />

          <Alert
            message="数据说明"
            description={
              <Space direction="vertical" size={0}>
                <Text>• 孖展倍数: 融资认购金额 / 公开发售金额，反映市场申购热度</Text>
                <Text>• 评分由AI根据行业赛道、基本面、估值等多维度综合评估</Text>
                <Text type="warning">⚠️ 数据仅供参考，投资需谨慎</Text>
              </Space>
            }
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ marginTop: 16 }}
          />
        </>
      )}
    </Card>
  );
};

export default RealTimeMarginData;
