/**
 * IPO表格列定义
 * 包含申购/即将上市、今日上市的列配置
 */

import React from 'react';
import {Tag, Space, Progress, Modal, Divider, Card, Typography, Button} from 'antd';
import {
  TrophyOutlined,
  FireOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  RobotOutlined,
  FundOutlined
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
          styles={{ body: { padding: '12px 16px', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' } }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Text type="secondary" style={{ fontSize: 11, marginBottom: 8, display: 'block' }}>
              每个评分项都包含详细打分原因，说明为什么获得相应分数
            </Text>
            {items.map((item, index) => (
              <div key={index} style={{ marginBottom: 12, borderBottom: index < items.length - 1 ? '1px dashed #f0f0f0' : 'none', paddingBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text strong style={{ fontSize: 13 }}>{item.label}</Text>
                    <Tag color={item.value >= item.maxScore * 0.8 ? 'green' : item.value >= item.maxScore * 0.6 ? 'blue' : item.value >= item.maxScore * 0.4 ? 'orange' : 'red'}>
                      +{item.value}/{item.maxScore}分
                    </Tag>
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{item.description}</Text>
                </div>
                <div style={{ backgroundColor: '#fafafa', padding: '8px 12px', borderRadius: 4 }}>
                  <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.5 }}>
                    <strong>打分原因:</strong> {item.reason || '未提供详细打分原因'}
                  </Text>
                </div>
              </div>
            ))}
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text strong style={{ fontSize: 14 }}>总分</Text>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  基于以上{items.length}个维度综合评分
                </Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Tag color="green" style={{ fontWeight: 'bold', fontSize: 14 }}>
                  {total}分
                </Tag>
                <Tag
                  color={getGradeColor(grade)}
                  icon={getGradeIcon(grade)}
                  style={{ fontWeight: 'bold', fontSize: 14 }}
                >
                  {grade}级
                </Tag>
              </div>
            </div>

            {/* LLM 评分依据与策略建议 */}
            {record.llmScoringReason && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <Card
                  size="small"
                  title={<Space><RobotOutlined style={{ color: '#722ed1' }} /><Text strong style={{ color: '#722ed1' }}>AI 评分依据</Text></Space>}
                  style={{ backgroundColor: '#fafafa', border: '1px solid #d3b3ff' }}
                  styles={{ body: { padding: '12px' } }}
                >
                  <Text style={{ fontSize: 12, lineHeight: 1.6 }}>
                    {record.llmScoringReason}
                  </Text>
                </Card>
              </>
            )}

            {record.strategy && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <Card
                  size="small"
                  title={<Space><FundOutlined style={{ color: '#1890ff' }} /><Text strong>AI 策略建议</Text></Space>}
                  style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}
                  styles={{ body: { padding: '12px' } }}
                >
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <div>
                      <Text strong style={{ fontSize: 12 }}>总体建议：</Text>
                      <Text style={{ fontSize: 12 }}>{record.strategy.recommendation || '未提供'}</Text>
                    </div>
                    <div>
                      <Text strong style={{ fontSize: 12 }}>具体操作：</Text>
                      <Text style={{ fontSize: 12 }}>{record.strategy.action || '未提供'}</Text>
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div>
                        <Text strong style={{ fontSize: 12 }}>风险等级：</Text>
                        <Tag color={
                          record.strategy.riskLevel === '低' ? 'green' :
                          record.strategy.riskLevel === '中' || record.strategy.riskLevel === '中高' ? 'orange' : 'red'
                        } style={{ marginLeft: 4 }}>
                          {record.strategy.riskLevel || '未知'}
                        </Tag>
                      </div>
                      <div>
                        <Text strong style={{ fontSize: 12 }}>预期收益：</Text>
                        <Tag color={
                          record.strategy.expectedReturn === '高' ? 'green' :
                          record.strategy.expectedReturn === '中' ? 'blue' :
                          record.strategy.expectedReturn === '中高' ? 'orange' : 'default'
                        } style={{ marginLeft: 4 }}>
                          {record.strategy.expectedReturn || '未知'}
                        </Tag>
                      </div>
                    </div>
                  </Space>
                </Card>
              </>
            )}
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
              评分维度: 赛道与细分行业(20) + 公司规模(15) + 业绩与成长性(18) + 估值与定价(15) + 发行中介与结构(22) + 合规与风险(10)
            </Text>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#f50" style={{ fontWeight: 'bold', flexShrink: 0 }}>S</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>80分以上</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                顶级优质港股标的。赛道稀缺且成长空间巨大；顶级发行中介阵容；业绩持续高增长；估值显著低于同行；合规记录完美。
              </Text>
              <TextSuccess style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2 }}>
                建议：全力融资申购，重仓配置
              </TextSuccess>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#52c41a" style={{ fontWeight: 'bold', flexShrink: 0 }}>A+</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>75-79分</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                顶级港股标的。赛道前景明确且竞争格局良好；强大发行中介支持；业绩稳定增长；估值合理或略低于同行。
              </Text>
              <TextSuccess style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2 }}>
                建议：积极融资申购，中等仓位
              </TextSuccess>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#52c41a" style={{ fontWeight: 'bold', flexShrink: 0 }}>A</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>70-74分</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                优质港股标的。赛道具备成长性；有知名保荐人支持；业绩表现良好；估值与行业相当；风险较低。
              </Text>
              <Text style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2, color: '#1890ff' }}>
                建议：融资申购为主，关注市场情绪
              </Text>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#52c41a" style={{ fontWeight: 'bold', flexShrink: 0 }}>A-</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>65-69分</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                良好港股标的。赛道有成长空间；有保荐人支持；商业模式清晰，护城河中等；估值合理或略高。
              </Text>
              <Text style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2, color: '#1890ff' }}>
                建议：现金申购为主，适量融资
              </Text>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#1890ff" style={{ fontWeight: 'bold', flexShrink: 0 }}>B+</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>60-64分</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                中上港股标的。赛道有成长潜力；保荐人资质中等；商业模式可行；估值略高或合理；需关注风险点。
              </Text>
              <Text style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2, color: '#1890ff' }}>
                建议：现金申购为主，少量融资
              </Text>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#1890ff" style={{ fontWeight: 'bold', flexShrink: 0 }}>B</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>55-59分</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                中等港股标的。行业竞争激烈；保荐人资质一般；商业模式普通；估值偏高；存在一定风险。
              </Text>
              <Text style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2, color: '#faad14' }}>
                建议：少量现金申购，保持关注
              </Text>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#1890ff" style={{ fontWeight: 'bold', flexShrink: 0 }}>B-</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>50-54分</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                中下港股标的。行业前景一般；缺乏明显优势；保荐人实力有限；估值明显偏高；风险较高。
              </Text>
              <Text style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2, color: '#faad14' }}>
                建议：谨慎参与或不参与
              </Text>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#faad14" style={{ fontWeight: 'bold', flexShrink: 0 }}>C+</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>45-49分</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                较差港股标的。行业前景不明；商业模式不清晰；保荐人资质较差；估值显著偏高；多风险因素。
              </Text>
              <TextDanger style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2 }}>
                建议：不推荐申购
              </TextDanger>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#faad14" style={{ fontWeight: 'bold', flexShrink: 0 }}>C</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>40-44分</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                差港股标的。行业前景黯淡；竞争力弱；保荐人实力不足；估值昂贵；重大风险暴露。
              </Text>
              <TextDanger style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2 }}>
                建议：不参与
              </TextDanger>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#faad14" style={{ fontWeight: 'bold', flexShrink: 0 }}>C-</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>35-39分</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                风险较高标的。基本面问题较多；发行结构复杂；估值过高；合规风险高。
              </Text>
              <TextDanger style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2 }}>
                建议：坚决不参与
              </TextDanger>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#ff4d4f" style={{ fontWeight: 'bold', flexShrink: 0 }}>D+</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>30-34分</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                高风险标的。多风险因素并存；盈利前景差；发行结构不合理；合规问题。
              </Text>
              <TextDanger style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2 }}>
                建议：避免参与
              </TextDanger>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#ff4d4f" style={{ fontWeight: 'bold', flexShrink: 0 }}>D</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>25-29分</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                极高风险标的。基本面严重问题；发行风险高；重大合规瑕疵；商业模式不可持续。
              </Text>
              <TextDanger style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2 }}>
                建议：坚决不参与
              </TextDanger>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#ff4d4f" style={{ fontWeight: 'bold', flexShrink: 0 }}>D-</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>20-24分</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                极高风险标的。多重大风险；不建议申购；存在退市风险。
              </Text>
              <TextDanger style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2 }}>
                建议：坚决不参与
              </TextDanger>
            </div>
            <Divider style={{ margin: '4px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color="#8c8c8c" style={{ fontWeight: 'bold', flexShrink: 0 }}>F</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>20分以下</Text>
              </div>
              <Text style={{ fontSize: 12, display: 'block', marginLeft: 4 }}>
                不合格标的。基本面或发行存在重大缺陷；不建议申购；极高风险。
              </Text>
              <TextDanger style={{ fontSize: 11, display: 'block', marginLeft: 4, marginTop: 2 }}>
                建议：坚决不参与
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
  onScoreClick: (record: IPOStock) => void,
  onAIWorkflowClick?: (record: IPOStock) => void
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
    title: 'AI分析',
    key: 'aiAnalysis',
    width: 90,
    render: (_: any, record: IPOStock) => (
      <Button
        type="link"
        size="small"
        onClick={() => onAIWorkflowClick && onAIWorkflowClick(record)}
        icon={<RobotOutlined />}
        style={{ color: '#722ed1' }}
      >
        深度分析
      </Button>
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
