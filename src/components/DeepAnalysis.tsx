import React, { useState, useEffect } from 'react';
import { Modal, Card, Typography, Button, Spin, Alert, Space, Tag, Divider, message } from 'antd';
import { 
  FileTextOutlined,
  RobotOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ShareAltOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

const { Title, Text, Paragraph } = Typography;

interface IPOStock {
  stockCode: string;
  stockName: string;
  industry?: string;
  marketCap?: number | string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  listingDate?: string;
  issuePrice?: number | string;
  totalLots?: number;
  marginMultiple?: number;
  prospectusUrl?: string;
  profitability?: string;
  revenue?: number;
  netProfit?: number;
  revenueGrowth?: number;
  grossMargin?: number;
  netMargin?: number;
  roe?: number;
  sharesPerLot?: number;
  publicSharesRatio?: number;
  cornerstoneInvestors?: string;
  cornerstoneRatio?: number;
  [key: string]: any;
}

interface DeepAnalysisProps {
  visible: boolean;
  onClose: () => void;
  ipoData: IPOStock | null | undefined;
}

interface AnalysisResult {
  title: string;
  content: string;
  stockCode: string;
  stockName: string;
  generatedAt: string;
  dataSource: string;
}

const DeepAnalysis: React.FC<DeepAnalysisProps> = ({ visible, onClose, ipoData }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (visible && ipoData) {
      fetchAnalysis();
    }
  }, [visible, ipoData]);

  const fetchAnalysis = async () => {
    if (!ipoData) return;

    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch('http://localhost:3001/api/deep-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ipoData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API响应错误: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setAnalysis(result.data);
      } else {
        throw new Error(result.error || '获取分析失败');
      }
    } catch (err: any) {
      console.error('深度分析失败:', err);
      if (err.name === 'AbortError') {
        setError('分析超时，请重试');
        message.error('深度分析超时，AI生成时间过长');
      } else {
        setError(err.message || '分析失败，请重试');
        message.error('深度分析失败: ' + (err.message || '未知错误'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAnalysis(null);
    setError('');
    onClose();
  };

  const handleShare = () => {
    if (analysis) {
      const text = `${analysis.title}\n\n${analysis.content}`;
      navigator.clipboard.writeText(text).then(() => {
        message.success('分析文章已复制到剪贴板');
      }).catch(() => {
        message.error('复制失败');
      });
    }
  };

  if (!ipoData) {
    return (
      <Modal
        title="深度分析"
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="back" onClick={onClose}>
            关闭
          </Button>
        ]}
      >
        <Alert
          message="暂无数据"
          description="请选择一只IPO股票进行分析"
          type="warning"
          showIcon
        />
      </Modal>
    );
  }

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined style={{ color: '#722ed1' }} />
          <Title level={4} style={{ margin: 0 }}>深度分析</Title>
          <Tag color="purple">AI生成</Tag>
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      width={900}
      style={{ top: 20 }}
      footer={[
        <Button key="back" onClick={handleClose}>
          关闭
        </Button>,
        analysis && (
          <Button 
            key="share" 
            icon={<ShareAltOutlined />}
            onClick={handleShare}
          >
            复制文章
          </Button>
        ),
        <Button
          key="refresh"
          type="primary"
          onClick={fetchAnalysis}
          loading={loading}
          icon={<RobotOutlined />}
        >
          {loading ? '分析中...' : '重新分析'}
        </Button>
      ].filter(Boolean)}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card size="small">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>{ipoData.stockName} ({ipoData.stockCode})</Title>
                <Text type="secondary">AI深度分析报告</Text>
              </div>
              {ipoData.industry && (
                <Tag color="blue">{ipoData.industry}</Tag>
              )}
            </div>
            
            <Space wrap>
              {ipoData.marketCap && (
                <Text>市值: <Text strong>{ipoData.marketCap}亿港元</Text></Text>
              )}
              {ipoData.issuePrice && (
                <Text>发行价: <Text strong>{ipoData.issuePrice}港元</Text></Text>
              )}
              {ipoData.marginMultiple && (
                <Text>孖展: <Tag color={ipoData.marginMultiple > 50 ? 'red' : 'green'}>{ipoData.marginMultiple}倍</Tag></Text>
              )}
            </Space>
          </Space>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: 24, color: '#666' }}>
              <RobotOutlined style={{ marginRight: 8 }} />
              AI正在分析中，请稍候...
            </Paragraph>
            <Text type="secondary" style={{ fontSize: 12 }}>
              正在搜索网络信息并生成专业分析文章
            </Text>
          </div>
        )}

        {error && !loading && (
          <Alert
            message="分析失败"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={fetchAnalysis}>
                重试
              </Button>
            }
          />
        )}

        {analysis && !loading && (
          <>
            <div style={{ 
              padding: '16px 24px', 
              background: '#f6f8fa', 
              borderRadius: 8,
              marginBottom: 16 
            }}>
              <Space>
                <FileTextOutlined style={{ color: '#1890ff' }} />
                <Text strong style={{ fontSize: 16 }}>{analysis.title}</Text>
              </Space>
              <div style={{ marginTop: 8 }}>
                <Space split={<Divider type="vertical" />}>
                  <Text type="secondary">
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    生成时间: {new Date(analysis.generatedAt).toLocaleString('zh-CN')}
                  </Text>
                  <Tag color={analysis.dataSource === 'ai_analysis' ? 'green' : 'orange'}>
                    {analysis.dataSource === 'ai_analysis' ? 'AI分析' : '基础分析'}
                  </Tag>
                </Space>
              </div>
            </div>

            <div className="markdown-body" style={{ 
              padding: '0 8px',
              maxHeight: '60vh',
              overflowY: 'auto'
            }}>
              <ReactMarkdown
                components={{
                  h1: ({ children }: { children?: React.ReactNode }) => (
                    <Title level={2} style={{ marginTop: 24, marginBottom: 16, borderBottom: '1px solid #e8e8e8', paddingBottom: 8 }}>
                      {children}
                    </Title>
                  ),
                  h2: ({ children }: { children?: React.ReactNode }) => (
                    <Title level={3} style={{ marginTop: 20, marginBottom: 12 }}>
                      {children}
                    </Title>
                  ),
                  h3: ({ children }: { children?: React.ReactNode }) => (
                    <Title level={4} style={{ marginTop: 16, marginBottom: 8 }}>
                      {children}
                    </Title>
                  ),
                  p: ({ children }: { children?: React.ReactNode }) => (
                    <Paragraph style={{ marginBottom: 12, lineHeight: 1.8 }}>
                      {children}
                    </Paragraph>
                  ),
                  ul: ({ children }: { children?: React.ReactNode }) => (
                    <ul style={{ marginBottom: 12, paddingLeft: 24 }}>{children}</ul>
                  ),
                  ol: ({ children }: { children?: React.ReactNode }) => (
                    <ol style={{ marginBottom: 12, paddingLeft: 24 }}>{children}</ol>
                  ),
                  li: ({ children }: { children?: React.ReactNode }) => (
                    <li style={{ marginBottom: 4, lineHeight: 1.8 }}>{children}</li>
                  ),
                  blockquote: ({ children }: { children?: React.ReactNode }) => (
                    <div style={{ 
                      borderLeft: '4px solid #1890ff', 
                      paddingLeft: 16, 
                      margin: '16px 0',
                      background: '#f0f5ff',
                      padding: '12px 16px',
                      borderRadius: '0 4px 4px 0'
                    }}>
                      {children}
                    </div>
                  ),
                  table: ({ children }: { children?: React.ReactNode }) => (
                    <div style={{ overflowX: 'auto', margin: '16px 0' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }: { children?: React.ReactNode }) => (
                    <th style={{ 
                      border: '1px solid #e8e8e8', 
                      padding: '8px 12px', 
                      background: '#fafafa',
                      textAlign: 'left'
                    }}>
                      {children}
                    </th>
                  ),
                  td: ({ children }: { children?: React.ReactNode }) => (
                    <td style={{ border: '1px solid #e8e8e8', padding: '8px 12px' }}>
                      {children}
                    </td>
                  ),
                  strong: ({ children }: { children?: React.ReactNode }) => (
                    <Text strong style={{ color: '#262626' }}>{children}</Text>
                  )
                }}
              >
                {analysis.content}
              </ReactMarkdown>
            </div>

            <Divider />

            <Alert
              message="免责声明"
              description="以上分析由AI自动生成，仅供参考，不构成投资建议。股市有风险，投资需谨慎。请根据个人风险承受能力做出投资决策。"
              type="warning"
              showIcon
              icon={<WarningOutlined />}
            />
          </>
        )}
      </Space>
    </Modal>
  );
};

export default DeepAnalysis;
