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

    // === 港股打新核心经验框架（来源于广姐资本实战分析）===
    // 经验1: 警惕高估值发行——PS超20倍+行业产能过剩=史诗级发行风险（瀚天天成案例）
    // 经验2: 增长质量比增长数字重要——收购驱动vs内生增长，补贴美化利润（瀚天天成案例）
    // 经验3: 客户集中度是致命风险——大客户流失可能导致营收断崖（瀚天天成案例）
    // 经验4: 行业短期周期vs长期趋势——碳化硅长期赛道好，但短期价格战惨烈（瀚天天成案例）
    // 经验5: 品牌授权/专利依赖风险——同仁堂医养商标授权风险案例
    // 经验6: 募资用途揭示真实意图——大量用于股东套现需警惕
    // 经验7: A/H股折价是安全垫——广合科技案例，有折价意味着向下空间有限
    // 经验8: 孖展倍数>100x时，优先打新策略而非融资策略——中签率太低

    // 获取关键数据
    const peRatio = ipoData.peRatio || 0;
    const psRatio = ipoData.marketCap && ipoData.revenue
      ? (parseFloat(ipoData.marketCap) / ipoData.revenue)
      : 0;
    const revenueGrowth = ipoData.revenueGrowth || 0;
    const netProfit = ipoData.netProfit || 0;
    const hasGreenshoe = ipoData.hasGreenshoe || false;
    const cornerstone = ipoData.cornerstone || false;
    const starInvestors = ipoData.starInvestors || [];
    const issuePrice = parseFloat(ipoData.issuePrice || '0');
    const marketCap = ipoData.marketCap || '未知';

    // Step 1: Fundamental Analysis（基本面分析师）
    const fundAnalysis: string[] = [
      `分析 ${ipoData.stockName} (${ipoData.stockCode}) 基本面`
    ];

    // 行业判断
    const industry = ipoData.industry || '未分类';
    const industryFlags: Record<string, string> = {
      '半导体': '硬科技赛道，长期受益国产替代，但短期需警惕产能过剩',
      '人工智能': '风口赛道，高估值高预期，需验证商业化落地',
      '生物医药': '高壁垒，但需关注管线进展和商业化能力',
      '新能源': '政策支持，但警惕周期性和竞争加剧',
      '医疗': '刚需行业，但需关注集采风险和扩张模式',
      '消费': '品牌为王，警惕过度依赖单一品牌或渠道'
    };
    const industryInsight = Object.entries(industryFlags).find(([key]) => industry.includes(key));
    fundAnalysis.push(`行业: ${industry}`);
    fundAnalysis.push(`行业判断: ${industryInsight ? industryInsight[1] : '需具体分析行业周期和竞争格局'}`);

    // 增长质量分析
    if (netProfit < 0 && revenueGrowth > 0) {
      fundAnalysis.push(`⚠️ 增长质量警示: 净利润亏损${Math.abs(netProfit)}亿，营收增长${(revenueGrowth * 100).toFixed(0)}%，需分辨是内生增长还是靠并购堆砌`);
    } else if (netProfit < 0 && revenueGrowth < 0) {
      fundAnalysis.push(`⚠️ 双降风险: 营收和利润双重下滑，需高度警惕`);
    } else if (netProfit > 0 && revenueGrowth > 0.3) {
      fundAnalysis.push(`✅ 增长质量优: 盈利且营收高增长${(revenueGrowth * 100).toFixed(0)}%，内生增长确定性较高`);
    }

    // 估值水位
    if (psRatio > 20) {
      fundAnalysis.push(`⚠️ PS估值偏高: 市销率约${psRatio.toFixed(1)}倍（行业产能过剩+高PS=史诗级发行风险）`);
    } else if (psRatio > 10) {
      fundAnalysis.push(`⚠️ PS估值偏贵: 市销率约${psRatio.toFixed(1)}倍，需高增长验证`);
    } else if (psRatio > 0) {
      fundAnalysis.push(`✅ PS估值合理: 市销率约${psRatio.toFixed(1)}倍`);
    }

    fundAnalysis.push(`市值: ${marketCap}亿港元 | 发行价: ${issuePrice > 0 ? `${issuePrice}港元` : '待定'}`);
    fundAnalysis.push(`基石投资者: ${cornerstone ? (starInvestors.length > 0 ? starInvestors.slice(0, 3).join('、') + '等' : '有') : '无基石'}`);

    // Step 2: Market Analysis（市场分析师）
    const marketAnalysis: string[] = [
      `行业赛道分析: ${industry}`,
    ];

    // 行业周期判断
    const hotKeywords = ['人工智能', '半导体', '新能源', '云计算', '生物医药'];
    const coldKeywords = ['房地产', '建筑', '煤炭', '纺织'];
    const isHotIndustry = hotKeywords.some(k => industry.includes(k));
    const isColdIndustry = coldKeywords.some(k => industry.includes(k));

    if (isHotIndustry) {
      marketAnalysis.push(`🔥 热门赛道: ${industry}，市场关注度高，但也要警惕高估值压力`);
    } else if (isColdIndustry) {
      marketAnalysis.push(`❄️ 冷门赛道: ${industry}，市场情绪低，申购需谨慎`);
    } else {
      marketAnalysis.push(`📊 一般赛道: ${industry}，关注结构性机会`);
    }

    // 竞争格局
    if (ipoData.isIndustryLeader) {
      marketAnalysis.push(`🏆 行业龙头地位确认，定价权较强`);
    } else {
      marketAnalysis.push(`⚠️ 非行业龙头，需关注市场竞争地位`);
    }

    marketAnalysis.push(`绿鞋保护: ${hasGreenshoe ? '✅ 有绿鞋，上市后30天价格稳定性较好' : '❌ 无绿鞋，需关注上市初期价格波动'}`);
    marketAnalysis.push(`孖展热度: ${ipoData.marginMultiple ? `${ipoData.marginMultiple}倍（>100倍为极热）` : '暂无数据，需持续关注'}`);

    // Step 3: Prospectus Analysis（招股书专家）
    const prospectusAnalysis: string[] = [
      `招股书深度分析: ${ipoData.stockName}`
    ];

    // 募资用途分析
    prospectusAnalysis.push(`募资用途: ${ipoData.strategy?.mainFactors?.[0] || '详见招股书'}`);
    prospectusAnalysis.push(`⚠️ 需关注: 募资是否主要用于研发/扩产（正面）还是股东套现（负面）`);

    // 财务真实性信号
    if (netProfit < 0) {
      const subsidyNote = netProfit < 0 && revenue > 0
        ? `，注意政府补贴是否美化报表（如瀚天天成1亿补贴覆盖亏损）`
        : '';
      prospectusAnalysis.push(`⚠️ 亏损企业: 净利润${netProfit}亿，需分析亏损原因和现金流${subsidyNote}`);
    }

    // AH折价分析
    if (ipoData.hasAShare && ipoData.ahDiscount) {
      const discount = parseFloat(ipoData.ahDiscount);
      if (discount >= 50) {
        prospectusAnalysis.push(`✅ A/H折价充足: H股较A股折价${discount}%，向下空间有限（广合科技模式）`);
      } else if (discount >= 20) {
        prospectusAnalysis.push(`⚠️ A/H折价一般: 折价${discount}%，安全垫有限`);
      }
    }

    // 客户风险
    prospectusAnalysis.push(`⚠️ 需核查: 大客户依赖度——瀚天天成案例最大客户采购额从6亿骤降至0`);

    // Step 4: Subscription Strategy（策略分析师）
    const strategyAnalysis: string[] = [];

    // 估值综合判断
    if (psRatio > 25 || peRatio > 50) {
      strategyAnalysis.push(`❌ 估值风险突出: PS${psRatio.toFixed(0)}倍或PE${peRatio}倍，发行价偏高`);
      strategyAnalysis.push(`策略建议: 降低申购优先级或放弃`);
    } else if (psRatio > 10 || peRatio > 25) {
      strategyAnalysis.push(`⚠️ 估值偏贵: 需要强劲增长才能支撑`);
      strategyAnalysis.push(`策略建议: 少量参与，控制仓位`);
    } else {
      strategyAnalysis.push(`✅ 估值合理: 具有一定上涨空间`);
      strategyAnalysis.push(`策略建议: 积极参与申购`);
    }

    // 孖展策略
    const marginMultiple = ipoData.marginMultiple || 0;
    if (marginMultiple > 100) {
      strategyAnalysis.push(`🔥 超高孖展(>100x): 中签率极低，优先考虑现金申购而非融资`);
    } else if (marginMultiple > 50) {
      strategyAnalysis.push(`📊 高孖展(>50x): 中签率较低，适量申购`);
    } else if (marginMultiple > 0) {
      strategyAnalysis.push(`✅ 正常孖展(<50x): 中签率相对较高，可以适量融资申购`);
    } else {
      strategyAnalysis.push(`⏳ 暂无孖展数据: 建议申购截止前一天再评估`);
    }

    // 仓位建议
    strategyAnalysis.push(`建议仓位: 不超过总资金的15-20%（单只股票）`);
    strategyAnalysis.push(`时间窗口: ${marginMultiple > 50 ? '截止前1天申购，避免融资利息损失' : '可考虑融资申购提升中签率'}`);

    // Step 5: Final Conclusion（结论复盘师）
    // 综合前面4步生成最终结论
    const score = ipoData.score || 0;
    const grade = ipoData.grade || 'C';
    const isHotSector = isHotIndustry && psRatio < 15;
    const hasValuationSupport = ipoData.ahDiscount && parseFloat(ipoData.ahDiscount) >= 30;
    const hasFundamentalRisk = (netProfit < 0 && revenueGrowth < 0) || psRatio > 25;

    let recommendation = '';
    let riskLevel = '';
    let expectedReturn = '';

    if (hasFundamentalRisk) {
      recommendation = '⚠️ 谨慎/不建议申购';
      riskLevel = '高风险';
      expectedReturn = '基本面存在较大不确定性';
    } else if (score >= 80 || (isHotSector && hasValuationSupport)) {
      recommendation = '✅ 强烈推荐申购';
      riskLevel = '低风险';
      expectedReturn = '优质标的，预期首日涨幅15-25%';
    } else if (score >= 70 || isHotSector) {
      recommendation = '✅ 推荐申购';
      riskLevel = '中低风险';
      expectedReturn = '首日涨幅预期8-15%';
    } else if (score >= 55) {
      recommendation = '⚠️ 可适度参与';
      riskLevel = '中等风险';
      expectedReturn = '首日涨幅预期5-10%';
    } else {
      recommendation = '❌ 不建议申购';
      riskLevel = '较高风险';
      expectedReturn = '风险大于机会';
    }

    // 最终综合评分展示
    const conclusion = [
      `📊 综合分析结论: ${ipoData.stockName}(${ipoData.stockCode})`,
      ``,
      `【评分】: ${score}分 / ${grade}级`,
      `【建议】: ${recommendation}`,
      `【风险等级】: ${riskLevel}`,
      `【预期收益】: ${expectedReturn}`,
      ``,
      `【核心判断依据】`,
      isHotSector ? `✅ 热门赛道 + ${psRatio < 15 ? '合理估值' : '偏贵估值'}` : `📊 非热门赛道，需精选个股`,
      hasValuationSupport ? `✅ A/H折价提供向下保护` : ``,
      hasGreenshoe ? `✅ 绿鞋机制降低破发风险` : `⚠️ 无绿鞋，需警惕上市波动`,
      cornerstone && starInvestors.length >= 3 ? `✅ 知名基石投资者背书` : ``,
      hasFundamentalRisk ? `⚠️ 基本面存在重大风险点` : `✅ 未发现重大基本面风险`,
    ].filter(Boolean);

    // Run all analyses
    await simulateAnalysis(0, fundAnalysis, isHotIndustry ? "赛道优秀，但需警惕高估值" : "基本面需具体分析", Math.min(95, score > 0 ? score + 5 : 75));
    await simulateAnalysis(1, marketAnalysis, isHotIndustry ? "市场热度高，机会与风险并存" : "市场情绪一般，谨慎选股", Math.min(90, score > 0 ? score - 3 : 70));
    await simulateAnalysis(2, prospectusAnalysis, hasFundamentalRisk ? "招股书存在重大风险点" : "招股书披露未见重大异常", Math.min(85, score > 0 ? score : 75));
    await simulateAnalysis(3, strategyAnalysis, recommendation.startsWith('✅') ? "建议积极参与" : recommendation.startsWith('⚠️') ? "建议控制仓位" : "建议观望", Math.min(90, score > 0 ? score : 72));
    await simulateAnalysis(4, conclusion, recommendation.replace(/[✅❌⚠️]/g, '').trim(), score > 0 ? score : 75);

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
              <Text>发行市值: <Text strong>{ipoData.marketCap} 亿港元</Text></Text>
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