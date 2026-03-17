import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tag, Space, Typography, Divider, Table, Empty, Tooltip, Badge } from 'antd';
import { 
  TrophyOutlined, 
  ThunderboltOutlined, 
  DollarOutlined, 
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PercentageOutlined
} from '@ant-design/icons';
import strategyService, { type StrategyPlan } from '../services/strategyService';
import type { IPOStock, Allocation } from '../types';

const { Text } = Typography;

interface StrategyPlansProps {
  capital: number;
  ipoStocks: IPOStock[];
}

const StrategyPlans: React.FC<StrategyPlansProps> = ({ capital, ipoStocks }) => {
  const [plans, setPlans] = useState<StrategyPlan[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (capital > 0 && ipoStocks.length > 0) {
      setLoading(true);
      // 模拟计算延迟
      setTimeout(() => {
        const topPlans = strategyService.generateTopStrategies(ipoStocks, capital);
        setPlans(topPlans);
        setLoading(false);
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
      render: (value: number) => (
        <Text strong>{strategyService.formatMoney(value)}</Text>
      )
    },
    {
      title: '融资倍数',
      dataIndex: 'financingMultiplier',
      key: 'financingMultiplier',
      width: 100,
      render: (value: number) => (
        <Tag color="purple">{value}x</Tag>
      )
    },
    {
      title: '申购总额',
      dataIndex: 'totalSubscription',
      key: 'totalSubscription',
      width: 140,
      render: (value: number) => (
        <Text strong style={{ color: '#52c41a' }}>
          {strategyService.formatMoney(value)}
        </Text>
      )
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

  if (capital === 0) {
    return (
      <Card
        title={
          <Space>
            <TrophyOutlined style={{ color: '#faad14', fontSize: 20 }} />
            <Text strong style={{ fontSize: 18 }}>智能策略方案</Text>
          </Space>
        }
        style={{ borderRadius: 16, boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)' }}
      >
        <Empty description="请先设置资金总量" />
      </Card>
    );
  }

  if (loading) {
    return (
      <Card
        title={
          <Space>
            <TrophyOutlined style={{ color: '#faad14', fontSize: 20 }} />
            <Text strong style={{ fontSize: 18 }}>智能策略方案</Text>
          </Space>
        }
        style={{ borderRadius: 16, boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)' }}
        loading={loading}
      >
        <Empty description="正在计算最优策略..." />
      </Card>
    );
  }

  if (plans.length === 0) {
    return (
      <Card
        title={
          <Space>
            <TrophyOutlined style={{ color: '#faad14', fontSize: 20 }} />
            <Text strong style={{ fontSize: 18 }}>智能策略方案</Text>
          </Space>
        }
        style={{ borderRadius: 16, boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)' }}
      >
        <Empty description="暂无符合条件的A级及以上新股" />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <TrophyOutlined style={{ color: '#faad14', fontSize: 20 }} />
          <Text strong style={{ fontSize: 18 }}>智能策略方案 (仅推荐A级及以上)</Text>
        </Space>
      }
      style={{ 
        marginBottom: 24,
        borderRadius: 16,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
      }}
    >
      {/* 策略说明 */}
      <Card 
        style={{ 
          marginBottom: 24, 
          background: '#e6f7ff',
          border: '1px solid #91d5ff',
          borderRadius: 8
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong style={{ color: '#0050b3' }}>
            <ThunderboltOutlined style={{ marginRight: 8 }} />
            智能策略说明:
          </Text>
          <Text>• 仅推荐A级及以上的优质新股(评分≥70分)</Text>
          <Text>• 结合保荐人历史保荐成功率、平均收益率等数据综合评分</Text>
          <Text>• 考虑资金锁定机会成本(3天)、融资费用(99港币/笔)、交易费用等</Text>
          <Text>• 自动生成最优、次优、第三优三个方案供参考</Text>
          <Text type="warning">⚠️ 投资有风险,策略仅供参考,请根据自身风险承受能力决策</Text>
        </Space>
      </Card>

      {/* 展示三个方案 */}
      {plans.map((plan, planIndex) => (
        <Card
          key={planIndex}
          style={{
            marginBottom: 24,
            border: `2px solid ${getRankColor(plan.rank)}`,
            borderRadius: 12,
            position: 'relative'
          }}
          title={
            <Space>
              {getRankIcon(plan.rank)}
              <Text strong style={{ fontSize: 16, color: getRankColor(plan.rank) }}>
                {plan.rank}
              </Text>
              <Badge count={plan.combinations.length} 
                style={{ backgroundColor: getRankColor(plan.rank) }}
                showZero={false}
              />
              <Text type="secondary">({plan.combinations.map(ipo => ipo.stockName).join(' + ')})</Text>
            </Space>
          }
        >
          {/* 核心指标 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="自有资金"
                value={plan.totalCapital}
                precision={2}
                prefix="HK$"
                valueStyle={{ color: '#1890ff', fontSize: 18 }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="总融资额"
                value={plan.totalFinancing}
                precision={2}
                prefix="HK$"
                valueStyle={{ color: '#722ed1', fontSize: 18 }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="预期净收益"
                value={plan.netReturn}
                precision={2}
                prefix="HK$"
                valueStyle={{ color: '#52c41a', fontSize: 18, fontWeight: 'bold' }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="收益率"
                value={plan.returnRate * 100}
                precision={2}
                suffix="%"
                prefix={<PercentageOutlined />}
                valueStyle={{ color: '#52c41a', fontSize: 18, fontWeight: 'bold' }}
              />
            </Col>
          </Row>

          <Divider />

          {/* 中签概率分析 */}
          <Card 
            style={{ 
              marginBottom: 20,
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: 8
            }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Text strong style={{ color: '#52c41a', fontSize: 16 }}>
                  <PercentageOutlined style={{ marginRight: 8 }} />
                  中签概率分析(考虑绿鞋红鞋机制、一手党优势)
                </Text>
              </Space>
              <Row gutter={[16, 8]}>
                {plan.winProbability.details.map((detail, idx) => (
                  <Col xs={24} sm={12} md={8} key={idx}>
                    <Card 
                      size="small"
                      style={{ 
                        background: '#fff',
                        border: '1px solid #d9f7be'
                      }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color="blue">{detail.stockName}</Tag>
                          <Tag color={detail.groupType === '甲组' ? 'green' : 'orange'}>
                            {detail.groupType}
                          </Tag>
                          {detail.financingMultiplier > 1 && (
                            <Tag color="purple">{detail.financingMultiplier}x孖展</Tag>
                          )}
                        </Space>
                        
                        {/* 股票特色标签 */}
                        <Space wrap>
                          {detail.isLeader && (
                            <Tag color="gold" icon={<TrophyOutlined />}>行业龙头</Tag>
                          )}
                          {detail.hasGreenshoe && (
                            <Tag color="cyan">绿鞋机制</Tag>
                          )}
                          {detail.industryScore >= 12 && (
                            <Tag color="volcano">热门赛道</Tag>
                          )}
                        </Space>
                        
                        <Divider style={{ margin: '8px 0' }} />
                        
                        <Space direction="vertical" size={0} style={{ width: '100%' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            申购手数: <Text strong>{detail.subscriptionLots}手</Text>
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            申购金额: HK${detail.subscriptionAmount.toFixed(0)}
                          </Text>
                          
                          <Divider style={{ margin: '8px 0' }} />
                          
                          {/* 一手党中签率 */}
                          {detail.groupType === '甲组' && (
                            <>
                              <Text strong style={{ color: '#722ed1', fontSize: 13 }}>
                                一手党中签率: {(detail.oneHandPartyRate * 100).toFixed(1)}%
                              </Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                (申购1手的散户中签概率)
                              </Text>
                            </>
                          )}
                          
                          {/* 一手中签率 */}
                          <Text strong style={{ color: '#52c41a' }}>
                            一手中签率: {(detail.oneHandWinRate * 100).toFixed(1)}%
                          </Text>
                          
                          {/* 综合中签率 */}
                          <Text style={{ color: '#1890ff', fontWeight: 'bold' }}>
                            综合中签率: {(detail.estimatedWinRate * 100).toFixed(1)}%
                          </Text>
                          
                          <Divider style={{ margin: '8px 0' }} />
                          
                          {/* 预期中签 */}
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            预期中签: 
                          </Text>
                          <Text strong style={{ fontSize: 14 }}>
                            {detail.expectedLots}手 ({detail.expectedShares.toLocaleString()}股)
                          </Text>
                        </Space>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
              <Space direction="vertical" size={0} style={{ width: '100%', marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  * 中签率基于认购倍数、甲/乙组分配规则、绿鞋红鞋机制、一手党保护等因素估算
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  * 红鞋机制: 港交所保护散户,甲组至少50%配售比例,热门股甚至更高
                </Text>
                <Text type="warning" style={{ fontSize: 12 }}>
                  ⚠️ 孖展倍数越高,竞争越激烈,实际中签手数可能远低于申购手数
                </Text>
                <Text type="success" style={{ fontSize: 12 }}>
                  ✅ 绿鞋机制: 上市30天内价格稳定,破发风险低,中签价值更高
                </Text>
              </Space>
            </Space>
          </Card>

          <Divider />

          {/* 成本分析 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={12} md={6}>
              <Tooltip title="资金锁定3天的利息损失(按年化4%计算)">
                <Statistic
                  title={<><ClockCircleOutlined /> 机会成本</>}
                  value={plan.costs.opportunityCost}
                  precision={2}
                  prefix="HK$"
                  valueStyle={{ color: '#faad14', fontSize: 14 }}
                />
              </Tooltip>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Tooltip title="融资申购费用(99港币/笔)">
                <Statistic
                  title={<><DollarOutlined /> 融资费用</>}
                  value={plan.costs.financingFee}
                  precision={2}
                  prefix="HK$"
                  valueStyle={{ color: '#faad14', fontSize: 14 }}
                />
              </Tooltip>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Tooltip title="中签后卖出的交易成本(佣金+印花税+交易费)">
                <Statistic
                  title={<><WarningOutlined /> 交易费用</>}
                  value={plan.costs.tradingFee}
                  precision={2}
                  prefix="HK$"
                  valueStyle={{ color: '#faad14', fontSize: 14 }}
                />
              </Tooltip>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="总成本"
                value={plan.costs.totalCost}
                precision={2}
                prefix="HK$"
                valueStyle={{ color: '#ff4d4f', fontSize: 14, fontWeight: 'bold' }}
              />
            </Col>
          </Row>

          <Divider />

          {/* 风险等级 */}
          <Space style={{ marginBottom: 16 }}>
            <Text strong>风险等级:</Text>
            <Tag color={getRiskColor(plan.riskLevel)} style={{ fontSize: 14, padding: '4px 12px' }}>
              {plan.riskLevel}
            </Tag>
            <Divider type="vertical" />
            <Text strong>预期收益:</Text>
            <Text type="success" strong>{strategyService.formatMoney(plan.expectedReturn)}</Text>
          </Space>

          {/* 分配详情表格 */}
          <Table
            columns={columns}
            dataSource={plan.allocations}
            rowKey="stockCode"
            pagination={false}
            scroll={{ x: 800 }}
            size="small"
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <Text strong>合计</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <Text strong style={{ color: '#1890ff' }}>
                      {strategyService.formatMoney(plan.totalCapital)}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} />
                  <Table.Summary.Cell index={4}>
                    <Text strong style={{ color: '#52c41a' }}>
                      {strategyService.formatMoney(plan.totalSubscription)}
                    </Text>
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
              <Tag key={ipo.stockCode} color="blue">
                {ipo.stockName} - {ipo.underwriter}
              </Tag>
            ))}
          </Space>
        </Card>
      ))}

      {/* 投资建议 */}
      {plans.length > 0 && (
        <Card 
          style={{ 
            marginTop: 24,
            background: '#fff7e6',
            border: '1px solid #ffd591',
            borderRadius: 8
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong style={{ color: '#fa8c16' }}>
              <WarningOutlined style={{ marginRight: 8 }} />
              重要提示:
            </Text>
            <Text>• 以上策略基于历史数据和模型计算,不构成投资建议</Text>
            <Text>• 中签率受市场情绪、申购人数等因素影响,实际可能偏离预期</Text>
            <Text>• 融资申购需承担利息成本和更大的风险,请谨慎决策</Text>
            <Text>• 建议根据自身风险承受能力选择合适的方案</Text>
            <Text type="danger">⚠️ 新股投资存在破发风险,请理性投资</Text>
          </Space>
        </Card>
      )}
    </Card>
  );
};

export default StrategyPlans;
