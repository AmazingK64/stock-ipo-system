import React, { useState, useEffect } from 'react';
import { Modal, Steps, Card, Typography, Button, Spin, Alert, Divider, Space, Tag } from 'antd';
import { 
  BankOutlined, 
  LineChartOutlined, 
  FileTextOutlined, 
  FundOutlined, 
  CheckCircleOutlined 
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface IPOStock {
  stockCode: string;
  stockName: string;
  industry?: string;
  marketCap?: number;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  listingDate?: string;
  issuePrice?: number;
  totalLots?: number;
  marginMultiple?: number;
  prospectusUrl?: string;
  [key: string]: any;
}

interface WorkflowStep {
  title: string;
  description: string;
  employee: string;
  icon: React.ReactNode;
  status?: 'wait' | 'process' | 'finish' | 'error';
  content?: string;
  analysis?: string[];
  recommendation?: string;
  score?: number; // 0-100 score for this step
}

interface AIWorkflowProps {
  visible: boolean;
  onClose: () => void;
  ipoData: IPOStock | null | undefined;
}

const AIWorkflow: React.FC<AIWorkflowProps> = ({ visible, onClose, ipoData }) => {
  // 如果没有数据，显示空状态
  if (!ipoData) {
    return (
      <Modal
        title="AI打新工作流分析"
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
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    { 
      title: '基本面分析', 
      description: '判断公司基本面质量',
      employee: '1号员工 - 基本面分析师',
      icon: <BankOutlined />,
      status: 'wait'
    },
    { 
      title: '市场行情分析', 
      description: '分析市场行情与股票前景',
      employee: '2号员工 - 市场分析师',
      icon: <LineChartOutlined />,
      status: 'wait'
    },
    { 
      title: '招股书分析', 
      description: '深度分析企业的招股书',
      employee: '3号员工 - 招股书专家',
      icon: <FileTextOutlined />,
      status: 'wait'
    },
    { 
      title: '打新策略', 
      description: '判断是否应该打新及策略',
      employee: '4号员工 - 策略分析师',
      icon: <FundOutlined />,
      status: 'wait'
    },
    { 
      title: '最终结论', 
      description: '复盘总结与最终建议',
      employee: '5号员工 - 结论复盘师',
      icon: <CheckCircleOutlined />,
      status: 'wait'
    }
  ]);

  // Simulate AI analysis workflow
  const runAIWorkflow = async () => {
    setIsRunning(true);
    setCurrentStep(0);
    
    // Reset all steps
    const resetSteps = workflowSteps.map(step => ({ ...step, status: 'wait' }));
    setWorkflowSteps(resetSteps);
    
    // Step 1: Fundamental Analysis
    await simulateAnalysis(0, [
      `分析 ${ipoData.stockName} (${ipoData.stockCode}) 基本面`,
      `行业类型: ${ipoData.industry || '未分类'}`,
      `市值预估: ${ipoData.marketCap ? `${ipoData.marketCap.toLocaleString()} 亿港元` : '未公布'}`,
      `发行价格: ${ipoData.issuePrice ? `$${ipoData.issuePrice}` : '待定'}`,
      `基本面评分: 85/100 (根据行业地位和财务数据)`
    ], "基本面良好，属于行业领先企业", 85);

    // Step 2: Market Analysis
    await simulateAnalysis(1, [
      "当前市场环境: 港股IPO市场回暖",
      "同类股票表现: 近3个月平均涨幅15%",
      "行业热度: 高增长行业受到追捧",
      "风险因素: 需要注意市场波动风险",
      "市场前景评分: 78/100"
    ], "市场环境有利于打新，但需关注短期波动", 78);

    // Step 3: Prospectus Analysis
    await simulateAnalysis(2, [
      "招股书关键数据提取完成",
      "财务数据: 过去3年营收复合增长率25%",
      "募资用途: 主要用于研发和市场扩张",
      "股东结构: 创始人持股比例较高",
      "风险披露: 常规行业风险，无重大诉讼",
      "招股书质量评分: 92/100"
    ], "招股书披露详细，财务数据健康", 92);

    // Step 4: Subscription Strategy
    await simulateAnalysis(3, [
      "申购额度分析: 建议申购金额 50-100万港元",
      "中签率预估: 约2-5%（基于历史数据）",
      "价格区间: 发行价处于合理区间",
      "时间窗口: 申购截止前2天最佳",
      "风险控制: 建议分散申购，控制单只股票仓位",
      "策略评分: 88/100"
    ], "建议参与申购，控制仓位在总投资10%以内", 88);

    // Step 5: Final Conclusion
    await simulateAnalysis(4, [
      "综合评分: 86/100 (加权平均)",
      "投资建议: ✅ 推荐申购",
      "预期收益: 首日涨幅预计15-25%",
      "风险等级: 中低风险",
      "持仓建议: 持有1-3个月获利了结",
      "监控要点: 关注上市后流动性"
    ], "综合评估为优质打新标的，建议积极参与", 86);

    setIsRunning(false);
  };

  const simulateAnalysis = async (stepIndex: number, analysis: string[], recommendation: string, score: number) => {
    return new Promise<void>(resolve => {
      setTimeout(() => {
        const newSteps = [...workflowSteps];
        newSteps[stepIndex] = {
          ...newSteps[stepIndex],
          status: 'finish',
          content: analysis.join('\n'),
          analysis,
          recommendation,
          score
        };
        setWorkflowSteps(newSteps);
        setCurrentStep(stepIndex + 1);
        resolve();
      }, 2000);
    });
  };

  useEffect(() => {
    if (visible && ipoData) {
      runAIWorkflow();
    }
  }, [visible, ipoData]);

  const renderStepContent = (step: WorkflowStep, index: number) => {
    if (step.status === 'wait') {
      return (
        <Card>
          <Paragraph>等待 {step.employee} 开始分析...</Paragraph>
        </Card>
      );
    }

    return (
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>分析师:</Text> <Tag color="blue">{step.employee}</Tag>
          </div>
          
          {step.score && (
            <div>
              <Text strong>本环节评分:</Text> <Tag color={step.score >= 80 ? 'success' : step.score >= 60 ? 'warning' : 'error'}>
                {step.score}/100
              </Tag>
            </div>
          )}

          {step.analysis && step.analysis.length > 0 && (
            <div>
              <Text strong>分析要点:</Text>
              <ul style={{ marginTop: 8, marginBottom: 8 }}>
                {step.analysis.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {step.recommendation && (
            <Alert
              message="分析师建议"
              description={step.recommendation}
              type={step.score && step.score >= 80 ? 'success' : step.score && step.score >= 60 ? 'info' : 'warning'}
              showIcon
            />
          )}
        </Space>
      </Card>
    );
  };

  const getOverallScore = () => {
    const finishedSteps = workflowSteps.filter(step => step.score !== undefined);
    if (finishedSteps.length === 0) return 0;
    const total = finishedSteps.reduce((sum, step) => sum + (step.score || 0), 0);
    return Math.round(total / finishedSteps.length);
  };

  const overallScore = getOverallScore();

  return (
    <Modal
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>AI打新工作流分析</Title>
          <Tag color="purple">协同AI分析</Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="back" onClick={onClose}>
          关闭
        </Button>,
        <Button
          key="restart"
          type="primary"
          onClick={runAIWorkflow}
          loading={isRunning}
        >
          {isRunning ? '分析中...' : '重新分析'}
        </Button>
      ]}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>{ipoData.stockName} ({ipoData.stockCode})</Title>
                <Text type="secondary">AI协同打新分析报告</Text>
              </div>
              {overallScore > 0 && (
                <div>
                  <Text strong>综合评分: </Text>
                  <Tag color={
                    overallScore >= 85 ? 'success' : 
                    overallScore >= 70 ? 'blue' : 
                    overallScore >= 60 ? 'orange' : 'red'
                  } size="large" style={{ fontSize: '16px' }}>
                    {overallScore}/100
                  </Tag>
                </div>
              )}
            </div>
            
            {ipoData.industry && (
              <Text>所属行业: <Tag color="purple">{ipoData.industry}</Tag></Text>
            )}
            
            {ipoData.marketCap && (
              <Text>发行市值: <Text strong>{ipoData.marketCap.toLocaleString()} 亿港元</Text></Text>
            )}
          </Space>
        </Card>

        <Steps current={currentStep} size="small">
          {workflowSteps.map((step, index) => (
            <Step
              key={step.title}
              title={step.title}
              description={step.description}
              icon={step.icon}
              status={step.status}
            />
          ))}
        </Steps>

        <Divider />

        {isRunning ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: 16 }}>
              {workflowSteps[currentStep]?.employee} 正在分析中...
            </Paragraph>
          </div>
        ) : (
          <div>
            {workflowSteps.map((step, index) => (
              <div key={step.title} style={{ marginBottom: 16 }}>
                {renderStepContent(step, index)}
              </div>
            ))}
          </div>
        )}

        {overallScore > 0 && !isRunning && (
          <Card type="inner" title="最终投资建议">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Alert
                message={
                  overallScore >= 80 ? "强烈推荐申购" :
                  overallScore >= 70 ? "建议申购" :
                  overallScore >= 60 ? "谨慎申购" :
                  "不建议申购"
                }
                type={
                  overallScore >= 80 ? "success" :
                  overallScore >= 70 ? "info" :
                  overallScore >= 60 ? "warning" : "error"
                }
                showIcon
                description={
                  overallScore >= 80 ? "优质打新标的，预期收益良好，风险可控" :
                  overallScore >= 70 ? "值得参与，但需关注市场波动风险" :
                  overallScore >= 60 ? "可以参与，但建议降低申购金额" :
                  "风险较高，不建议参与申购"
                }
              />
              
              <div>
                <Text strong>申购策略:</Text>
                <Paragraph style={{ marginTop: 8 }}>
                  {overallScore >= 80 && "✅ 积极申购：建议申购金额为可用资金的15-20%"}
                  {overallScore >= 70 && overallScore < 80 && "✅ 适度申购：建议申购金额为可用资金的10-15%"}
                  {overallScore >= 60 && overallScore < 70 && "⚠️ 谨慎申购：建议申购金额不超过可用资金的5-10%"}
                  {overallScore < 60 && "❌ 观望：不建议申购，等待更好机会"}
                </Paragraph>
              </div>

              <div>
                <Text strong>风险提示:</Text>
                <Paragraph style={{ marginTop: 8 }}>
                  1. 股市有风险，投资需谨慎<br />
                  2. 本分析基于AI算法，仅供参考<br />
                  3. 实际申购需结合个人风险承受能力<br />
                  4. 关注上市首日流动性风险
                </Paragraph>
              </div>
            </Space>
          </Card>
        )}
      </Space>
    </Modal>
  );
};

export default AIWorkflow;