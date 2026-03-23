import React, { useMemo } from 'react';
import { Card, Row, Col, Statistic, Tag, Space, Typography, Divider, Empty, Progress, Tooltip } from 'antd';
import {
  TrophyOutlined,
  WarningOutlined,
  FireOutlined,
  RiseOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import type { IPOStock } from '../types';
import strategyService from '../services/strategyService';

const { Text, Title } = Typography;

interface StrategyPlansProps {
  capital: number;
  ipoStocks: IPOStock[];
}

const StrategyPlans: React.FC<StrategyPlansProps> = ({ capital, ipoStocks }) => {
  const parseMarketCap = (marketCap: string | undefined): number | null => {
    if (!marketCap) return null;
    const match = marketCap.match(/([\d.]+)/);
    if (match) {
      return parseFloat(match[1]);
    }
    return null;
  };

  const estimateWinRate = (
    marginMultiple: number | undefined,
    publicSharesRatio: number | undefined,
    is18C: boolean = false,
    ipo?: IPOStock
  ): {
    rate: number;
    level: string;
    color: string;
    description: string;
  } => {
    if (!marginMultiple || marginMultiple <= 0) {
      // marginMultiple 不可用时，尝试用 IPO 完整数据估算中签率
      if (ipo) {
        const issuePrice = parseFloat(ipo.issuePrice);
        const sharesPerLot = ipo.sharesPerLot || 100;
        const marketCapStr = ipo.marketCap;
        const marketCapMatch = marketCapStr ? marketCapStr.match(/([\d.]+)/) : null;
        const marketCapValue = marketCapMatch ? parseFloat(marketCapMatch[1]) * 100000000 : 0;

        // 使用 strategyService 估算（默认申购金额 10 万港币，1倍融资）
        const defaultSubscription = 100000;
        const winRateResult = strategyService.estimateWinRate(ipo, defaultSubscription, 1);

        if (winRateResult.winRate > 0) {
          const levelMap: Record<string, { level: string; color: string }> = {
            '极低': { level: '极低', color: '#ff4d4f' },
            '较低': { level: '较低', color: '#fa8c16' },
            '中等': { level: '中等', color: '#faad14' },
            '较高': { level: '较高', color: '#52c41a' },
            '高': { level: '高', color: '#1890ff' },
            '很高': { level: '很高', color: '#722ed1' }
          };

          // 根据甲组/乙组和一手中签率推断等级
          let level = '中等';
          let color = '#faad14';
          const oneHandRate = winRateResult.oneHandWinRate * 100;

          if (oneHandRate >= 30) { level = '很高'; color = '#722ed1'; }
          else if (oneHandRate >= 15) { level = '高'; color = '#1890ff'; }
          else if (oneHandRate >= 8) { level = '较高'; color = '#52c41a'; }
          else if (oneHandRate >= 3) { level = '中等'; color = '#faad14'; }
          else if (oneHandRate >= 1) { level = '较低'; color = '#fa8c16'; }
          else { level = '极低'; color = '#ff4d4f'; }

          return {
            rate: winRateResult.winRate * 100,
            level,
            color,
            description: `${winRateResult.groupType}，一手中签率约${oneHandRate.toFixed(2)}%，基于招股数据估算（无孖展数据）`
          };
        }
      }

      return {
        rate: 0,
        level: '暂无孖展数据',
        color: '#8c8c8c',
        description: '暂无孖展数据，无法估算'
      };
    }

    const publicRatio = (publicSharesRatio || 10) / 100;

    let effectivePublicRatio = publicRatio;
    
    if (is18C) {
      if (marginMultiple >= 100) {
        effectivePublicRatio = Math.min(0.5, publicRatio * 5);
      } else if (marginMultiple >= 50) {
        effectivePublicRatio = Math.min(0.4, publicRatio * 3);
      } else if (marginMultiple >= 20) {
        effectivePublicRatio = Math.min(0.3, publicRatio * 2);
      }
    } else {
      if (marginMultiple >= 100) {
        effectivePublicRatio = Math.min(0.5, publicRatio * 3);
      } else if (marginMultiple >= 50) {
        effectivePublicRatio = Math.min(0.4, publicRatio * 2);
      } else if (marginMultiple >= 20) {
        effectivePublicRatio = Math.min(0.3, publicRatio * 1.5);
      }
    }

    const totalSubscription = marginMultiple + 1;
    let winRate = (effectivePublicRatio / totalSubscription) * 100;

    winRate = Math.min(winRate, 100);
    winRate = Math.max(winRate, 0.1);

    let level: string;
    let color: string;
    let description: string;

    if (marginMultiple >= 100) {
      level = '极低';
      color = '#ff4d4f';
      description = is18C 
        ? `18C公司孖展${marginMultiple.toFixed(0)}倍，回拨后公开发售比例增加，预计中签率约${winRate.toFixed(2)}%`
        : `孖展${marginMultiple.toFixed(0)}倍，预计回拨后中签率约${winRate.toFixed(2)}%`;
    } else if (marginMultiple >= 50) {
      level = '较低';
      color = '#fa8c16';
      description = `孖展${marginMultiple.toFixed(0)}倍，预计中签率约${winRate.toFixed(2)}%`;
    } else if (marginMultiple >= 20) {
      level = '中等';
      color = '#faad14';
      description = `孖展${marginMultiple.toFixed(0)}倍，预计中签率约${winRate.toFixed(2)}%`;
    } else if (marginMultiple >= 10) {
      level = '较高';
      color = '#52c41a';
      description = `孖展${marginMultiple.toFixed(0)}倍，预计中签率约${winRate.toFixed(2)}%`;
    } else if (marginMultiple >= 5) {
      level = '高';
      color = '#1890ff';
      description = `孖展${marginMultiple.toFixed(0)}倍，预计中签率约${winRate.toFixed(2)}%`;
    } else {
      level = '很高';
      color = '#722ed1';
      description = `孖展${marginMultiple.toFixed(1)}倍，预计中签率约${winRate.toFixed(2)}%`;
    }

    return { rate: winRate, level, color, description };
  };

  const recommendedStocks = useMemo(() => {
    const now = new Date();
    console.log('[StrategyPlans] ipoStocks:', ipoStocks.map(s => ({ 
      code: s.stockCode, 
      name: s.stockName, 
      marginMultiple: s.marginMultiple, 
      publicSharesRatio: s.publicSharesRatio,
      is18C: s.is18C 
    })));
    return ipoStocks
      .filter(ipo => {
        if (!ipo.subscriptionEndDate) return true;
        return new Date(ipo.subscriptionEndDate) >= now;
      })
      .filter(ipo => ipo.score && ipo.score >= 55)
      .sort((a, b) => {
        const scoreDiff = (b.score || 0) - (a.score || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return (a.marginMultiple || 0) - (b.marginMultiple || 0);
      })
      .slice(0, 6);
  }, [ipoStocks]);

  const stats = useMemo(() => {
    const now = new Date();
    const activeStocks = ipoStocks.filter(ipo => {
      if (!ipo.subscriptionEndDate) return true;
      return new Date(ipo.subscriptionEndDate) >= now;
    });
    
    const aGrade = activeStocks.filter(ipo => ipo.grade && ['A+', 'A', 'A-'].includes(ipo.grade)).length;
    const bGrade = activeStocks.filter(ipo => ipo.grade && ['B+', 'B'].includes(ipo.grade)).length;
    const avgScore = activeStocks.length > 0
      ? activeStocks.reduce((sum, ipo) => sum + (ipo.score || 0), 0) / activeStocks.length
      : 0;

    const avgMarginMultiple = activeStocks.reduce((sum, ipo) => sum + (ipo.marginMultiple || 0), 0) / (activeStocks.length || 1);
    
    return { total: activeStocks.length, aGrade, bGrade, avgScore, avgMarginMultiple };
  }, [ipoStocks]);

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      'A+': '#ff4d4f', 'A': '#ff7a45', 'A-': '#fa8c16',
      'B+': '#faad14', 'B': '#52c41a', 'B-': '#73d13d',
      'C+': '#1890ff', 'C': '#69c0ff', 'D': '#8c8c8c'
    };
    return colors[grade] || '#8c8c8c';
  };

  const getScoreProgress = (score: number) => {
    if (score >= 85) return { percent: 100, color: '#ff4d4f' };
    if (score >= 75) return { percent: 85, color: '#fa8c16' };
    if (score >= 65) return { percent: 70, color: '#faad14' };
    if (score >= 55) return { percent: 55, color: '#52c41a' };
    return { percent: 40, color: '#1890ff' };
  };

  if (capital === 0) {
    return (
      <Card style={{ marginBottom: 24 }}>
        <Empty description="请先设置资金总量" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <TrophyOutlined style={{ color: '#faad14', fontSize: 20 }} />
          <Title level={4} style={{ margin: 0 }}>智能策略推荐</Title>
          <Tag color="blue">基于评分+孖展数据</Tag>
        </Space>
      }
      style={{ marginBottom: 24 }}
    >
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small" style={{ background: '#f6ffed' }}>
            <Statistic
              title="申购中"
              value={stats.total}
              suffix="只"
              prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ background: '#fff2e8' }}>
            <Statistic
              title="A级(推荐)"
              value={stats.aGrade}
              suffix="只"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ background: '#e6f7ff' }}>
            <Statistic
              title="B级(可参与)"
              value={stats.bGrade}
              suffix="只"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="平均孖展"
              value={stats.avgMarginMultiple.toFixed(1)}
              suffix="x"
            />
          </Card>
        </Col>
      </Row>

      {recommendedStocks.length === 0 ? (
        <Empty description="暂无符合条件的推荐新股" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          <Divider style={{ margin: '16px 0' }}>推荐申购 (按评分排序)</Divider>
          <Row gutter={[16, 16]}>
            {recommendedStocks.map((ipo, index) => {
              const winRateInfo = estimateWinRate(ipo.marginMultiple, ipo.publicSharesRatio, ipo.is18C, ipo);
              
              return (
                <Col xs={24} sm={12} md={8} lg={recommendedStocks.length <= 3 ? 8 : 6} key={ipo.stockCode}>
                  <Card
                    size="small"
                    hoverable
                    style={{
                      borderLeft: `4px solid ${getGradeColor(ipo.grade || 'C')}`,
                      background: index === 0 ? '#fffbe6' : '#fff'
                    }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size={4}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space>
                          {index === 0 && <FireOutlined style={{ color: '#ff4d4f' }} />}
                          <Text strong>{ipo.stockName}</Text>
                        </Space>
                        <Tag color={getGradeColor(ipo.grade || 'C')} style={{ fontWeight: 'bold' }}>
                          {ipo.grade} ({ipo.score})
                        </Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>{ipo.stockCode} · {ipo.industry}</Text>
                      
                      <Progress
                        percent={getScoreProgress(ipo.score || 0).percent}
                        size="small"
                        showInfo={false}
                        strokeColor={getScoreProgress(ipo.score || 0).color}
                      />

                      <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 4 }}>
                        <Space>
                          <Text type="secondary" style={{ fontSize: 11 }}>孖展:</Text>
                          {ipo.marginMultiple ? (
                            <Tag color={winRateInfo.color} style={{ fontSize: 11 }}>
                              {ipo.marginMultiple.toFixed(1)}x
                            </Tag>
                          ) : (
                            <Text type="secondary" style={{ fontSize: 11 }}>暂无</Text>
                          )}
                        </Space>
                        <Tooltip title={winRateInfo.description}>
                          <Tag 
                            style={{ 
                              fontSize: 11, 
                              cursor: 'pointer',
                              background: winRateInfo.color + '20',
                              border: `1px solid ${winRateInfo.color}`,
                              color: winRateInfo.color
                            }}
                          >
                            中签率: {winRateInfo.level}
                            <QuestionCircleOutlined style={{ marginLeft: 4, fontSize: 10 }} />
                          </Tag>
                        </Tooltip>
                      </Space>

                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          截止: {ipo.subscriptionEndDate || '-'}
                        </Text>
                        {ipo.strategy?.recommendation && (
                          <Tag color={ipo.strategy.recommendation.includes('推荐') ? 'green' : 'blue'} style={{ fontSize: 11 }}>
                            {ipo.strategy.recommendation}
                          </Tag>
                        )}
                      </Space>
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </>
      )}

      <Card style={{ marginTop: 16, background: '#fff7e6', border: '1px solid #ffd591' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong style={{ color: '#fa8c16' }}>
            <WarningOutlined style={{ marginRight: 8 }} />
            中签率说明:
          </Text>
          <Text>• 中签率基于孖展倍数估算，考虑回拨机制影响</Text>
          <Text>• 孖展倍数越高，中签率越低，但可能触发回拨提高公开发售比例</Text>
          <Text>• 孖展≥100x: 极低(预计回拨) | 50-99x: 较低 | 20-49x: 中等 | 10-19x: 较高 | 5-9x: 高 | &lt;5x: 很高</Text>
          <Text type="danger">⚠️ 估算仅供参考，实际中签率以券商公布为准</Text>
        </Space>
      </Card>
    </Card>
  );
};

export default StrategyPlans;
