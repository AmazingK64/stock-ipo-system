import React, { useMemo } from 'react';
import { Card, Row, Col, Statistic, Tag, Space, Typography, Divider, Empty, Progress } from 'antd';
import {
  TrophyOutlined,
  WarningOutlined,
  FireOutlined,
  RiseOutlined
} from '@ant-design/icons';
import type { IPOStock } from '../types';

const { Text, Title } = Typography;

interface StrategyPlansProps {
  capital: number;
  ipoStocks: IPOStock[];
}

const StrategyPlans: React.FC<StrategyPlansProps> = ({ capital, ipoStocks }) => {
  const recommendedStocks = useMemo(() => {
    const now = new Date();
    return ipoStocks
      .filter(ipo => {
        if (!ipo.subscriptionEndDate) return true;
        return new Date(ipo.subscriptionEndDate) >= now;
      })
      .filter(ipo => ipo.score && ipo.score >= 65)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);
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
    
    return { total: activeStocks.length, aGrade, bGrade, avgScore };
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
          <Tag color="blue">A-/B级新股</Tag>
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
              title="平均评分"
              value={stats.avgScore.toFixed(0)}
              suffix="分"
            />
          </Card>
        </Col>
      </Row>

      {recommendedStocks.length === 0 ? (
        <Empty description="暂无符合条件的推荐新股" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          <Divider style={{ margin: '16px 0' }}>推荐申购</Divider>
          <Row gutter={[16, 16]}>
            {recommendedStocks.map((ipo, index) => (
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
            ))}
          </Row>
        </>
      )}

      <Card style={{ marginTop: 16, background: '#fff7e6', border: '1px solid #ffd591' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong style={{ color: '#fa8c16' }}>
            <WarningOutlined style={{ marginRight: 8 }} />
            投资提示:
          </Text>
          <Text>• 推荐基于AI评分，综合考虑行业赛道、基本面、估值等多维度因素</Text>
          <Text>• 热门赛道（AI、半导体、机器人、创新药）的亏损公司不因亏损扣分</Text>
          <Text>• 传统医疗/中医类公司评分较低，多为"捞钱"型IPO</Text>
          <Text type="danger">⚠️ 新股投资存在破发风险，请理性投资</Text>
        </Space>
      </Card>
    </Card>
  );
};

export default StrategyPlans;
