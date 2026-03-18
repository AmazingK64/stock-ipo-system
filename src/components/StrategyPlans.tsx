import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tag, Space, Typography, Divider, Button, Modal, message, Empty } from 'antd';
import {
  TrophyOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  HistoryOutlined,
  CheckOutlined
} from '@ant-design/icons';
import strategyService, { type StrategyPlan } from '../services/strategyService';
import type { IPOStock, SimilarCompany } from '../types';

const { Text } = Typography;

interface StrategyPlansProps {
  capital: number;
  ipoStocks: IPOStock[];
  onPlanSelect?: (plan: StrategyPlan) => void;
}

const StrategyPlans: React.FC<StrategyPlansProps> = ({ capital, ipoStocks, onPlanSelect }) => {
  const [plans, setPlans] = useState<StrategyPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number>(0);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedStock, setSelectedStock] = useState<IPOStock | null>(null);

  useEffect(() => {
    if (capital > 0 && ipoStocks.length > 0) {
      setLoading(true);
      setTimeout(() => {
        const topPlans = strategyService.generateTopStrategies(ipoStocks, capital);
        setPlans(topPlans);
        setLoading(false);
        if (topPlans.length > 0 && selectedPlanIndex >= topPlans.length) {
          setSelectedPlanIndex(0);
        }
      }, 500);
    } else {
      setPlans([]);
    }
  }, [capital, ipoStocks]);

  const getRankIcon = (rank: string) => {
    if (rank === '最优方案') return <TrophyOutlined style={{ color: '#faad14', fontSize: 24 }} />;
    if (rank === '次优方案') return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} />;
    return <ThunderboltOutlined style={{ color: '#1890ff', fontSize: 24 }} />;
  };

  const getRankColor = (rank: string) => {
    if (rank === '最优方案') return '#faad14';
    if (rank === '次优方案') return '#52c41a';
    return '#1890ff';
  };

  const getRiskColor = (riskLevel: string) => {
    if (riskLevel === '低') return '#52c41a';
    if (riskLevel === '中低') return '#73d13d';
    if (riskLevel === '中') return '#faad14';
    return '#ff4d4f';
  };

  const handlePlanSelect = (index: number) => {
    setSelectedPlanIndex(index);
    if (onPlanSelect && plans[index]) {
      onPlanSelect(plans[index]);
    }
  };

  const handleConfirmPlan = () => {
    const plan = plans[selectedPlanIndex];
    if (plan) {
      message.success(`已选择${plan.rank}`);
      if (onPlanSelect) {
        onPlanSelect(plan);
      }
    }
  };

  const showHistoryModal = (stock: IPOStock) => {
    setSelectedStock(stock);
    setHistoryModalVisible(true);
  };

  const renderHistoryData = (stock: IPOStock) => {
    if (!stock.similarCompanies || stock.similarCompanies.length === 0) {
      return <Text type="secondary">暂无历史数据</Text>;
    }

    return (
      <Table
        dataSource={stock.similarCompanies}
        rowKey="stockCode"
        size="small"
        pagination={false}
        columns={[
          {
            title: '公司',
            dataIndex: 'stockName',
            render: (name: string, record: SimilarCompany) => (
              <Space direction="vertical" size={0}>
                <Text strong>{name}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>{record.stockCode}</Text>
              </Space>
            )
          },
          {
            title: '首日涨幅',
            dataIndex: 'firstDayReturn',
            render: (value: number) => (
              <Text style={{ color: value >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 'bold' }}>
                {value >= 0 ? '+' : ''}{(value * 100).toFixed(1)}%
              </Text>
            )
          },
          {
            title: '首周涨幅',
            dataIndex: 'firstWeekReturn',
            render: (value: number) => (
              <Text style={{ color: value >= 0 ? '#52c41a' : '#ff4d4f' }}>
                {value >= 0 ? '+' : ''}{(value * 100).toFixed(1)}%
              </Text>
            )
          },
          {
            title: '首月涨幅',
            dataIndex: 'firstMonthReturn',
            render: (value: number) => (
              <Text style={{ color: value >= 0 ? '#52c41a' : '#ff4d4f' }}>
                {value >= 0 ? '+' : ''}{(value * 100).toFixed(1)}%
              </Text>
            )
          }
        ]}
      />
    );
  };

  if (capital === 0) {
    return (
      <Card title={<Space><TrophyOutlined style={{ color: '#faad14', fontSize: 20 }} /><Text strong style={{ fontSize: 18 }}>智能策略方案</Text></Space>}>
        <Empty description="请先设置资金总量" />
      </Card>
    );
  }

  if (loading) {
    return (
      <Card title={<Space><TrophyOutlined style={{ color: '#faad14', fontSize: 20 }} /><Text strong style={{ fontSize: 18 }}>智能策略方案</Text></Space>} loading={loading}>
        <Empty description="正在计算最优策略..." />
      </Card>
    );
  }

  if (plans.length === 0) {
    return (
      <Card title={<Space><TrophyOutlined style={{ color: '#faad14', fontSize: 20 }} /><Text strong style={{ fontSize: 18 }}>智能策略方案 (仅推荐A级及以上且仍在申购期)</Text></Space>}>
        <Empty description="暂无符合条件的A级及以上新股，或已过申购截止日期" />
      </Card>
    );
  }

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
      title: '自有资金',
      dataIndex: 'capitalAllocation',
      key: 'capitalAllocation',
      width: 120,
      render: (value: number) => <Text strong>{strategyService.formatMoney(value)}</Text>
    },
    {
      title: '融资倍数',
      dataIndex: 'financingMultiplier',
      key: 'financingMultiplier',
      width: 100,
      render: (value: number) => <Tag color="purple">{value}x</Tag>
    },
    {
      title: '申购总额',
      dataIndex: 'totalSubscription',
      key: 'totalSubscription',
      width: 140,
      render: (value: number) => <Text strong style={{ color: '#52c41a' }}>{strategyService.formatMoney(value)}</Text>
    },
    {
      title: '申购股数',
      dataIndex: 'shares',
      key: 'shares',
      width: 120,
      render: (value: number, record: Allocation) => {
        const ipo = ipoStocks.find(s => s.stockCode === record.stockCode);
        const sharesPerLot = ipo?.sharesPerLot || 100;
        const lots = Math.floor(value / sharesPerLot);
        return (
          <Space direction="vertical" size={0}>
            <Text strong>{value.toLocaleString()}股</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>({lots}手)</Text>
          </Space>
        );
      }
    }
  ];

  return (
    <Card
      title={
        <Space>
          <TrophyOutlined style={{ color: '#faad14', fontSize: 20 }} />
          <Text strong style={{ fontSize: 18 }}>智能策略方案 (仅推荐A级及以上且仍在申购期)</Text>
        </Space>
      }
      style={{ marginBottom: 32 }}
    >
      {plans.length === 0 ? (
        <Empty description="暂无符合条件的A级及以上新股，或已过申购截止日期" />
      ) : (
        <>
          {/* 横向紧凑的三个方案 */}
          <Row gutter={[16, 16]}>
            {plans.map((plan, planIndex) => (
              <Col xs={24} md={8} key={planIndex}>
                <Card
                  hoverable
                  onClick={() => handlePlanSelect(planIndex)}
                  style={{
                    height: '100%',
                    border: selectedPlanIndex === planIndex ? `3px solid ${getRankColor(plan.rank)}` : `1px solid #d9d9d9`,
                    borderRadius: 12,
                    background: selectedPlanIndex === planIndex ? '#fffbe6' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  bodyStyle={{ padding: 16 }}
                >
                  {/* 方案标题 */}
                  <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <Space direction="vertical" size={4}>
                      {getRankIcon(plan.rank)}
                      <Text strong style={{ fontSize: 16, color: getRankColor(plan.rank) }}>
                        {plan.rank}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {plan.combinations.map(ipo => ipo.stockName).join(' + ')}
                      </Text>
                    </Space>
                  </div>

                  <Divider style={{ margin: '12px 0' }} />

                  {/* 核心指标 */}
                  <Space direction="vertical" style={{ width: '100%' }} size={8}>
                    <Row gutter={8}>
                      <Col span={12}>
                        <Statistic
                          title={<Text type="secondary" style={{ fontSize: 11 }}>自有资金</Text>}
                          value={plan.totalCapital}
                          precision={0}
                          prefix="HK$"
                          valueStyle={{ fontSize: 14, color: '#1890ff' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title={<Text type="secondary" style={{ fontSize: 11 }}>收益率</Text>}
                          value={plan.returnRate * 100}
                          precision={1}
                          suffix="%"
                          valueStyle={{ fontSize: 14, color: '#52c41a', fontWeight: 'bold' }}
                        />
                      </Col>
                    </Row>

                    <Row gutter={8}>
                      <Col span={12}>
                        <Statistic
                          title={<Text type="secondary" style={{ fontSize: 11 }}>净收益</Text>}
                          value={plan.netReturn}
                          precision={0}
                          prefix="HK$"
                          valueStyle={{ fontSize: 14, color: '#52c41a' }}
                        />
                      </Col>
                      <Col span={12}>
                        <div>
                          <Text type="secondary" style={{ fontSize: 11 }}>风险等级</Text>
                          <div>
                            <Tag color={getRiskColor(plan.riskLevel)} style={{ marginTop: 4 }}>
                              {plan.riskLevel}
                            </Tag>
                          </div>
                        </div>
                      </Col>
                    </Row>

                    {/* 快速查看中签率 */}
                    <div>
                      <Text type="secondary" style={{ fontSize: 11 }}>中签率</Text>
                      <div style={{ marginTop: 4 }}>
                        {plan.winProbability.details.slice(0, 2).map((detail, idx) => (
                          <Tag key={idx} style={{ marginBottom: 4, fontSize: 11 }}>
                            {detail.stockName}: {(detail.estimatedWinRate * 100).toFixed(1)}%
                          </Tag>
                        ))}
                        {plan.winProbability.details.length > 2 && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            +{plan.winProbability.details.length - 2}只
                          </Text>
                        )}
                      </div>
                    </div>
                  </Space>

                  {/* 选中标识 */}
                  {selectedPlanIndex === planIndex && (
                    <div style={{ marginTop: 12, textAlign: 'center' }}>
                      <Tag color="gold" icon={<CheckOutlined />}>已选择</Tag>
                    </div>
                  )}
                </Card>
              </Col>
            ))}
          </Row>

          {/* 确认按钮 */}
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Button 
              type="primary" 
              size="large"
              icon={<CheckOutlined />} 
              onClick={handleConfirmPlan}
              style={{
                width: 200,
                height: 48,
                fontSize: 16,
                fontWeight: 'bold',
                background: getRankColor(plans[selectedPlanIndex]?.rank || '最优方案'),
                border: 'none'
              }}
            >
              确认选择此方案
            </Button>
          </div>

          {/* 展开详情按钮 */}
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Button 
              type="link"
              onClick={() => {
                const plan = plans[selectedPlanIndex];
                if (plan) {
                  setSelectedStock(plan.combinations[0]);
                  setHistoryModalVisible(true);
                }
              }}
            >
              查看选中方案详细数据 →
            </Button>
          </div>
        </>
      )}

      {/* 历史数据模态框 */}
      <Modal
        title={<Space><HistoryOutlined />{selectedStock?.stockName} - 同行业历史表现</Space>}
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedStock && renderHistoryData(selectedStock)}
      </Modal>

      {/* 投资建议 */}
      {plans.length > 0 && (
        <Card style={{ marginTop: 24, background: '#fff7e6', border: '1px solid #ffd591' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong style={{ color: '#fa8c16' }}>
              <WarningOutlined style={{ marginRight: 8 }} />
              重要提示:
            </Text>
            <Text>• 以上策略基于历史数据和模型计算,不构成投资建议</Text>
            <Text>• 中签率受市场情绪、申购人数等因素影响,实际可能偏离预期</Text>
            <Text>• 融资申购需承担利息成本和更大的风险,请谨慎决策</Text>
            <Text type="danger">⚠️ 新股投资存在破发风险,请理性投资</Text>
          </Space>
        </Card>
      )}
    </Card>
  );
};

export default StrategyPlans;
