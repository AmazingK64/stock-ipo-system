import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tag, Space, Typography, Divider, Table, Empty, Badge, Radio, Button, Modal, message } from 'antd';
import { 
  TrophyOutlined, 
  ThunderboltOutlined, 
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  CheckOutlined,
  LineChartOutlined,
  DollarOutlined
} from '@ant-design/icons';
import strategyService, { type StrategyPlan } from '../services/strategyService';
import type { IPOStock, Allocation, SimilarCompany } from '../types';

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
      style={{ marginBottom: 24 }}
    >
      {/* 方案选择器 */}
      <Card style={{ marginBottom: 16, background: '#f0f2f5' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>选择方案:</Text>
          <Radio.Group value={selectedPlanIndex} onChange={e => handlePlanSelect(e.target.value)}>
            {plans.map((plan, index) => (
              <Radio.Button key={index} value={index}>
                <Space>
                  {getRankIcon(plan.rank)}
                  <span>{plan.rank}</span>
                  <Tag color={getRankColor(plan.rank)}>{(plan.returnRate * 100).toFixed(1)}%</Tag>
                </Space>
              </Radio.Button>
            ))}
          </Radio.Group>
          <Button type="primary" icon={<CheckOutlined />} onClick={handleConfirmPlan} disabled={plans.length === 0}>
            确认选择此方案
          </Button>
        </Space>
      </Card>

      {/* 展示三个方案 */}
      {plans.map((plan, planIndex) => (
        <Card
          key={planIndex}
          style={{
            marginBottom: 24,
            border: selectedPlanIndex === planIndex ? `3px solid ${getRankColor(plan.rank)}` : `2px solid ${getRankColor(plan.rank)}`,
            borderRadius: 12,
            position: 'relative',
            background: selectedPlanIndex === planIndex ? '#fffbe6' : '#fff'
          }}
          extra={
            selectedPlanIndex === planIndex && (
              <Tag color="gold" icon={<CheckOutlined />}>已选择</Tag>
            )
          }
          title={
            <Space>
              {getRankIcon(plan.rank)}
              <Text strong style={{ fontSize: 16, color: getRankColor(plan.rank) }}>
                {plan.rank}
              </Text>
              <Badge count={plan.combinations.length} style={{ backgroundColor: getRankColor(plan.rank) }} showZero={false} />
              <Text type="secondary">({plan.combinations.map(ipo => ipo.stockName).join(' + ')})</Text>
            </Space>
          }
        >
          {/* 核心指标 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={12} md={6}>
              <Statistic title="自有资金" value={plan.totalCapital} precision={2} prefix="HK$" valueStyle={{ color: '#1890ff', fontSize: 18 }} />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic title="总融资额" value={plan.totalFinancing} precision={2} prefix="HK$" valueStyle={{ color: '#722ed1', fontSize: 18 }} />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic title="预期净收益" value={plan.netReturn} precision={2} prefix="HK$" valueStyle={{ color: '#52c41a', fontSize: 18, fontWeight: 'bold' }} />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic title="收益率" value={plan.returnRate * 100} precision={2} suffix="%" valueStyle={{ color: '#52c41a', fontSize: 18, fontWeight: 'bold' }} />
            </Col>
          </Row>

          <Divider />

          {/* 同行业历史表现 */}
          {plan.combinations.some(ipo => ipo.similarCompanies && ipo.similarCompanies.length > 0) && (
            <>
              <Card style={{ marginBottom: 20, background: '#e6f7ff', border: '1px solid #91d5ff' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong style={{ color: '#0050b3', fontSize: 16 }}>
                    <HistoryOutlined style={{ marginRight: 8 }} />
                    同行业历史表现参考
                  </Text>
                  <Row gutter={[16, 8]}>
                    {plan.combinations.map(ipo => (
                      ipo.similarCompanies && ipo.similarCompanies.length > 0 && (
                        <Col xs={24} sm={12} md={8} key={ipo.stockCode}>
                          <Card size="small" style={{ background: '#fff' }}>
                            <Space direction="vertical" style={{ width: '100%' }}>
                              <Space>
                                <Tag color="blue">{ipo.stockName}</Tag>
                                <Button size="small" icon={<LineChartOutlined />} onClick={() => showHistoryModal(ipo)}>
                                  查看详情
                                </Button>
                              </Space>
                              <Space size="large">
                                <div>
                                  <Text type="secondary" style={{ fontSize: 11 }}>首日平均涨幅</Text>
                                  <div>
                                    <Text strong style={{ color: ipo.industryHistoryReturn && ipo.industryHistoryReturn > 0 ? '#52c41a' : '#ff4d4f' }}>
                                      {ipo.industryHistoryReturn ? `${(ipo.industryHistoryReturn * 100).toFixed(1)}%` : '暂无数据'}
                                    </Text>
                                  </div>
                                </div>
                              </Space>
                              {ipo.hasAShare && (
                                <Tag color="orange">A+H股</Tag>
                              )}
                            </Space>
                          </Card>
                        </Col>
                      )
                    ))}
                  </Row>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    * 历史数据仅供参考，不代表未来表现
                  </Text>
                </Space>
              </Card>
              <Divider />
            </>
          )}

          {/* 中签概率分析 */}
          <Card style={{ marginBottom: 20, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong style={{ color: '#52c41a', fontSize: 16 }}>
                <CheckCircleOutlined style={{ marginRight: 8 }} />
                中签概率分析
              </Text>
              <Row gutter={[16, 8]}>
                {plan.winProbability.details.map((detail, idx) => (
                  <Col xs={24} sm={12} md={8} key={idx}>
                    <Card size="small" style={{ background: '#fff', border: '1px solid #d9f7be' }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color="blue">{detail.stockName}</Tag>
                          <Tag color={detail.groupType === '甲组' ? 'green' : 'orange'}>{detail.groupType}</Tag>
                          {detail.financingMultiplier > 1 && <Tag color="purple">{detail.financingMultiplier}x孖展</Tag>}
                        </Space>
                        
                        <Space wrap>
                          {detail.isLeader && <Tag color="gold" icon={<TrophyOutlined />}>行业龙头</Tag>}
                          {detail.hasGreenshoe && <Tag color="cyan">绿鞋机制</Tag>}
                          {detail.industryScore >= 12 && <Tag color="volcano">热门赛道</Tag>}
                        </Space>
                        
                        <Divider style={{ margin: '8px 0' }} />
                        
                        <Space direction="vertical" size={0} style={{ width: '100%' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>申购手数: <Text strong>{detail.subscriptionLots}手</Text></Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>申购金额: HK${detail.subscriptionAmount.toFixed(0)}</Text>
                          
                          <Divider style={{ margin: '8px 0' }} />
                          
                          {detail.groupType === '甲组' && (
                            <>
                              <Text strong style={{ color: '#722ed1', fontSize: 13 }}>
                                一手党中签率: {(detail.oneHandPartyRate * 100).toFixed(1)}%
                              </Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>(申购1手的散户中签概率)</Text>
                            </>
                          )}
                          
                          <Text strong style={{ color: '#52c41a' }}>一手中签率: {(detail.oneHandWinRate * 100).toFixed(1)}%</Text>
                          <Text style={{ color: '#1890ff', fontWeight: 'bold' }}>综合中签率: {(detail.estimatedWinRate * 100).toFixed(1)}%</Text>
                          
                          <Divider style={{ margin: '8px 0' }} />
                          
                          <Text type="secondary" style={{ fontSize: 12 }}>预期中签:</Text>
                          <Text strong style={{ fontSize: 14 }}>{detail.expectedLots}手 ({detail.expectedShares.toLocaleString()}股)</Text>
                        </Space>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
              <Space direction="vertical" size={0} style={{ width: '100%', marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>* 中签率基于认购倍数、甲/乙组分配规则、绿鞋红鞋机制、一手党保护等因素估算</Text>
                <Text type="warning" style={{ fontSize: 12 }}>⚠️ 孖展倍数越高,竞争越激烈,实际中签手数可能远低于申购手数</Text>
                <Text type="success" style={{ fontSize: 12 }}>✅ 绿鞋机制: 上市30天内价格稳定,破发风险低,中签价值更高</Text>
              </Space>
            </Space>
          </Card>

          <Divider />

          {/* 成本分析 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={12} md={6}>
              <Statistic title={<><ClockCircleOutlined /> 机会成本</>} value={plan.costs.opportunityCost} precision={2} prefix="HK$" valueStyle={{ color: '#faad14', fontSize: 14 }} />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic title={<><DollarOutlined /> 融资费用</>} value={plan.costs.financingFee} precision={2} prefix="HK$" valueStyle={{ color: '#faad14', fontSize: 14 }} />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic title={<><WarningOutlined /> 交易费用</>} value={plan.costs.tradingFee} precision={2} prefix="HK$" valueStyle={{ color: '#faad14', fontSize: 14 }} />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic title="总成本" value={plan.costs.totalCost} precision={2} prefix="HK$" valueStyle={{ color: '#ff4d4f', fontSize: 14, fontWeight: 'bold' }} />
            </Col>
          </Row>

          <Divider />

          {/* 风险等级 */}
          <Space style={{ marginBottom: 16 }}>
            <Text strong>风险等级:</Text>
            <Tag color={getRiskColor(plan.riskLevel)} style={{ fontSize: 14, padding: '4px 12px' }}>{plan.riskLevel}</Tag>
            <Divider type="vertical" />
            <Text strong>预期收益:</Text>
            <Text type="success" strong>{strategyService.formatMoney(plan.expectedReturn)}</Text>
          </Space>

          {/* 分配详情表格 */}
          <Table columns={columns} dataSource={plan.allocations} rowKey="stockCode" pagination={false} scroll={{ x: 800 }} size="small" 
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={2}><Text strong>合计</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <Text strong style={{ color: '#1890ff' }}>{strategyService.formatMoney(plan.totalCapital)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} />
                  <Table.Summary.Cell index={4}>
                    <Text strong style={{ color: '#52c41a' }}>{strategyService.formatMoney(plan.totalSubscription)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} />
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />

          {/* 保荐人信息 */}
          <Divider />
          <Space wrap>
            <Text strong>保荐人信息:</Text>
            {plan.combinations.map(ipo => (
              <Tag key={ipo.stockCode} color="blue">{ipo.stockName} - {ipo.underwriter}</Tag>
            ))}
          </Space>
        </Card>
      ))}

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
