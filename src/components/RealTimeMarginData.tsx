import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Space, Typography, Alert, Statistic, Row, Col, Empty, Spin, Button, message } from 'antd';
import { 
  FireOutlined, 
  ThunderboltOutlined, 
  InfoCircleOutlined,
  RiseOutlined,
  WarningOutlined,
  ReloadOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

const MARGIN_DATA_CACHE_KEY = 'ipo_margin_data_cache';
const MARGIN_DATA_EXPIRY_KEY = 'ipo_margin_data_expiry';

interface MarginData {
  stockCode: string;
  stockName: string;
  industry: string;
  marginMultiple?: number;
  marginAmount?: number;
  subscriptionEndDate: string;
  listingDate: string;
  issuePrice: string;
  marketCap?: string;
  offeringShares?: number;
  sharesPerLot?: number;
}

interface CachedData {
  data: MarginData[];
  lastUpdate: string;
  cachedAt: number;
}

const RealTimeMarginData: React.FC = () => {
  const [data, setData] = useState<MarginData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    loadCachedData();
  }, []);

  const loadCachedData = () => {
    try {
      const cached = localStorage.getItem(MARGIN_DATA_CACHE_KEY);
      if (cached) {
        const parsed: CachedData = JSON.parse(cached);
        if (parsed.data && parsed.data.length > 0) {
          setData(parsed.data);
          setLastUpdate(parsed.lastUpdate);
          setHasLoaded(true);
          setIsFromCache(true);
          console.log('[MarginData] 从缓存加载孖展数据:', parsed.data.length, '条');
        }
      }
    } catch (err) {
      console.warn('[MarginData] 读取缓存失败:', err);
    }
  };

  const saveCachedData = (newData: MarginData[], updateTime: string) => {
    try {
      const cacheData: CachedData = {
        data: newData,
        lastUpdate: updateTime,
        cachedAt: Date.now()
      };
      localStorage.setItem(MARGIN_DATA_CACHE_KEY, JSON.stringify(cacheData));
      console.log('[MarginData] 孖展数据已缓存');
    } catch (err) {
      console.warn('[MarginData] 缓存保存失败:', err);
    }
  };

  const parseMarketCap = (marketCap: string | undefined): number | null => {
    if (!marketCap) return null;
    const match = marketCap.match(/([\d.]+)/);
    if (match) {
      return parseFloat(match[1]);
    }
    return null;
  };

  const parseIssuePrice = (issuePrice: string | undefined): number | null => {
    if (!issuePrice) return null;
    const match = issuePrice.match(/([\d.]+)/);
    if (match) {
      return parseFloat(match[1]);
    }
    return null;
  };

  const calculateMarginAmount = (ipo: MarginData): number | null => {
    if (!ipo.marginMultiple || ipo.marginMultiple <= 0) return null;

    const marketCapValue = parseMarketCap(ipo.marketCap);
    if (marketCapValue && marketCapValue > 0) {
      return ipo.marginMultiple * marketCapValue;
    }

    if (ipo.offeringShares && ipo.offeringShares > 0) {
      const price = parseIssuePrice(ipo.issuePrice);
      if (price && price > 0) {
        const publicOfferAmount = (ipo.offeringShares * price) / 100000000;
        return ipo.marginMultiple * publicOfferAmount;
      }
    }

    return null;
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:3001/api/subscribe-list', {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(60000)
      });
      
      if (!response.ok) {
        throw new Error(`API响应错误: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const now = new Date();
        const updateTime = new Date().toLocaleString('zh-CN');
        const activeData = result.data
          .filter((ipo: any) => {
            if (!ipo.subscriptionEndDate) return true;
            return new Date(ipo.subscriptionEndDate) >= now;
          })
          .map((ipo: any) => {
            const marginData: MarginData = {
              stockCode: ipo.stockCode,
              stockName: ipo.stockName,
              industry: ipo.industry || '',
              marginMultiple: ipo.marginMultiple,
              marginAmount: ipo.marginAmount,
              subscriptionEndDate: ipo.subscriptionEndDate,
              listingDate: ipo.listingDate,
              issuePrice: ipo.issuePrice,
              marketCap: ipo.marketCap,
              offeringShares: ipo.offeringShares,
              sharesPerLot: ipo.sharesPerLot
            };

            if (!marginData.marginAmount && marginData.marginMultiple) {
              const calculated = calculateMarginAmount(marginData);
              if (calculated) {
                marginData.marginAmount = calculated;
              }
            }

            return marginData;
          });
        
        setData(activeData);
        setLastUpdate(updateTime);
        setHasLoaded(true);
        setIsFromCache(false);

        saveCachedData(activeData, updateTime);
        
        message.success(`获取到 ${activeData.length} 条申购数据`);
      } else {
        throw new Error('数据为空');
      }
    } catch (error: any) {
      console.error('加载实时数据失败:', error);
      setError(error.message || '获取数据失败');
      message.error('获取数据失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const getHeatTag = (marginMultiple: number) => {
    if (marginMultiple > 100) return <Tag color="#ff4d4f" icon={<FireOutlined />}>超热门</Tag>;
    if (marginMultiple > 50) return <Tag color="#fa8c16">热门</Tag>;
    if (marginMultiple > 20) return <Tag color="#faad14">较热</Tag>;
    if (marginMultiple > 10) return <Tag color="#52c41a">一般</Tag>;
    return <Tag color="#1890ff">冷门</Tag>;
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
      width: 100,
      ellipsis: true,
    },
    {
      title: '孖展倍数',
      dataIndex: 'marginMultiple',
      key: 'marginMultiple',
      width: 120,
      sorter: (a: MarginData, b: MarginData) => (a.marginMultiple || 0) - (b.marginMultiple || 0),
      defaultSortOrder: 'descend' as const,
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
      width: 100,
      sorter: (a: MarginData, b: MarginData) => (a.marginAmount || 0) - (b.marginAmount || 0),
      render: (value: number) => {
        if (!value) return <Text type="secondary">-</Text>;
        if (value >= 100) {
          return <Text strong style={{ color: '#ff4d4f' }}>{value.toFixed(1)}亿</Text>;
        }
        return <Text>{value.toFixed(1)}亿</Text>;
      }
    },
    {
      title: '集资规模',
      dataIndex: 'marketCap',
      key: 'marketCap',
      width: 100,
      render: (value: string) => <Text type="secondary">{value || '-'}</Text>
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
            {data.length > 0 && <Tag color="blue">申购中: {data.length}只</Tag>}
            {isFromCache && (
              <Tag color="orange" icon={<ClockCircleOutlined />}>缓存数据</Tag>
            )}
          </Space>
          <Space>
            {lastUpdate && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {isFromCache ? '缓存时间: ' : '更新: '}{lastUpdate}
              </Text>
            )}
            <Button 
              type="primary"
              icon={<ReloadOutlined spin={loading} />}
              onClick={handleRefresh}
              loading={loading}
              size="small"
            >
              {loading ? '获取中...' : '刷新数据'}
            </Button>
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
      ) : !hasLoaded ? (
        <Empty 
          description="点击右上角「刷新数据」按钮获取实时孖展数据" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新数据
          </Button>
        </Empty>
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
                <Text>• 孖展金额 = 孖展倍数 × 集资规模（根据招股书数据计算）</Text>
                <Text>• 数据来源: AiPO数据网 (aipo.myiqdii.com)</Text>
                <Text>• 数据自动缓存，点击「刷新数据」获取最新数据</Text>
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
