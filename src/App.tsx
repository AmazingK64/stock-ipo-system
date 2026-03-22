import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button, message, Space, ConfigProvider, Popconfirm, Tooltip, Switch, Modal } from 'antd';
import { ReloadOutlined, DeleteOutlined, FileTextOutlined, SettingOutlined } from '@ant-design/icons';
import CapitalManagement from './components/CapitalManagement';
import IPOList from './components/IPOList';
import StrategyPlans from './components/StrategyPlans';
import RealTimeMarginData from './components/RealTimeMarginData';
import ipoService from './services/ipoService';
import ipoScoringService from './services/ipoScoring';
import db from './db/database';
import type { IPOStock, RealtimeQuote } from './types';
import './App.css';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

const App: React.FC = () => {
  const [capital, setCapital] = useState<number>(0);
  const [ipoStocks, setIPOStocks] = useState<IPOStock[]>([]);
  const [realtimeQuotes, setRealtimeQuotes] = useState<RealtimeQuote[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [updatingProspectus, setUpdatingProspectus] = useState<boolean>(false);
  const [settingsVisible, setSettingsVisible] = useState<boolean>(false);
  const [useHKStrategy, setUseHKStrategy] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // 应用评分策略
    ipoScoringService.setStrategy(useHKStrategy);
  }, [useHKStrategy]);

  const loadData = async () => {
    setLoading(true);
    // 仅从本地 IndexedDB 读取缓存，不自动请求后端
    const capitalAmount = await ipoService.getCapital();
    const stocks = await ipoService.getAllIPOStocks();
    console.log('[App] 读取本地缓存数据，共', stocks.length, '条（如需更新请点击"刷新数据"）');
    setCapital(capitalAmount);
    setIPOStocks(stocks);
    setLoading(false);
  };

  const refreshIPOData = async (showMessage = false) => {
    setRefreshing(true);
    try {
      const success = await ipoService.refreshIPOData();
      if (success) {
        if (showMessage) {
          message.success('新股数据刷新成功');
        }
        const stocks = await ipoService.getAllIPOStocks();
        // 同时刷新实时行情
        const quotes = await ipoService.fetchTodayListedQuotes();
        setRealtimeQuotes(quotes);
        setIPOStocks(stocks);
      } else {
        if (showMessage) {
          message.error('刷新失败');
        }
      }
    } catch (error) {
      if (showMessage) {
        message.error('刷新失败');
      }
    }
    setRefreshing(false);
  };

  const updateProspectus = async () => {
    setUpdatingProspectus(true);
    try {
      const response = await fetch('http://localhost:3001/api/prospectus/update', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(300000)
      });
      const result = await response.json();
      if (result.success) {
        const { newDownloads, deletedFiles } = result;
        const parts = [];
        if (newDownloads && newDownloads.length > 0) {
          parts.push(`新下载 ${newDownloads.length} 份招股书`);
        }
        if (deletedFiles && deletedFiles.length > 0) {
          parts.push(`清理 ${deletedFiles.length} 份过期招股书`);
        }
        if (parts.length > 0) {
          message.info(`招股书更新: ${parts.join('，')}`);
        } else {
          message.info('招股书已是最新，无需更新');
        }
      }
    } catch (error) {
      message.error('更新招股书失败');
    }
    setUpdatingProspectus(false);
  };

  const clearAndReload = async () => {
    try {
      // 清空数据库
      await db.ipoStocks.clear();
      message.success('数据库已清空,正在重新加载...');
      // 重新加载数据
      await refreshIPOData();
    } catch (error) {
      message.error('清空失败');
    }
  };

  const handleCapitalUpdate = (amount: number) => {
    setCapital(amount);
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Header 
          style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '0 50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
        >
          <Space>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>
              🎯 港股打新策略系统
            </Title>
            <Text type="secondary" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
              {useHKStrategy ? '港股专用评分策略' : '通用评分策略'}
            </Text>
          </Space>
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setSettingsVisible(true)}
              style={{ color: '#fff', background: 'rgba(255, 255, 255, 0.2)' }}
            >
              设置
            </Button>
            <Popconfirm
              title="清空数据库"
              description="确定要清空所有新股数据并重新加载吗?"
              onConfirm={clearAndReload}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="primary"
                icon={<DeleteOutlined />}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  fontWeight: 'bold'
                }}
              >
                清除重复
              </Button>
            </Popconfirm>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => refreshIPOData(true)}
              loading={refreshing}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                fontWeight: 'bold'
              }}
            >
              <Tooltip title="仅刷新申购中的新股数据">
                刷新数据
              </Tooltip>
            </Button>
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              onClick={updateProspectus}
              loading={updatingProspectus}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                fontWeight: 'bold'
              }}
            >
              <Tooltip title="手动更新招股书库">
                更新招股书
              </Tooltip>
            </Button>
          </Space>
        </Header>

        <Content style={{ padding: '40px 50px', background: '#f0f2f5' }}>
          <div style={{ maxWidth: 1600, margin: '0 auto' }}>
            <CapitalManagement onCapitalUpdate={handleCapitalUpdate} />
            
            <RealTimeMarginData />
            
            <StrategyPlans capital={capital} ipoStocks={ipoStocks} />
            
            <IPOList ipoStocks={ipoStocks} loading={loading} realtimeQuotes={realtimeQuotes} />
          </div>
        </Content>

        <Footer 
          style={{ 
            textAlign: 'center',
            background: '#fff',
            borderTop: '1px solid #e8e8e8'
          }}
        >
          <Space split={<Text type="secondary">|</Text>}>
            <Text type="secondary">
              港股打新策略系统 ©{new Date().getFullYear()}
            </Text>
            <Text type="secondary">
              数据来源: 香港交易所披露易
            </Text>
            <Text type="secondary">
              ⚠️ 仅供参考,投资需谨慎
            </Text>
          </Space>
        </Footer>
      </Layout>

      {/* 设置弹窗 */}
      <Modal
        title="系统设置"
        open={settingsVisible}
        onCancel={() => setSettingsVisible(false)}
        footer={[
          <Button key="close" onClick={() => setSettingsVisible(false)}>
            关闭
          </Button>
        ]}
        centered
      >
        <div style={{ padding: '20px 0' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text strong style={{ display: 'block' }}>评分策略选择</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  切换不同的评分算法来评估新股
                </Text>
              </div>
              <Switch
                checked={useHKStrategy}
                onChange={(checked) => setUseHKStrategy(checked)}
                checkedChildren="港股专用"
                unCheckedChildren="通用评分"
              />
            </div>
            
            <div style={{ marginTop: 16, padding: 16, background: '#f6f6f6', borderRadius: 8 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>当前策略说明:</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {useHKStrategy ? 
                  '港股 IPO 打新评分策略（优化精细版・总分 100）\n' +
                  '• 赛道与细分行业（20分）\n' +
                  '• 公司规模（市值/营收）（15分）\n' +
                  '• 业绩与成长性（18分）\n' +
                  '• 估值与定价（15分）\n' +
                  '• 发行中介与结构（22分）\n' +
                  '• 合规与风险（10分）'
                  :
                  '通用评分策略（总分 100）\n' +
                  '• 行业热度（35分）\n' +
                  '• 保荐人（20分）\n' +
                  '• 投资者背景（16分）\n' +
                  '• 商业模式（10分）\n' +
                  '• 估值合理性（10分）\n' +
                  '• 绿鞋机制（5分）\n' +
                  '• AH折价（2分）\n' +
                  '• 盈利能力（2分）'
                }
              </Text>
            </div>

            <div style={{ marginTop: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>AI工作流说明:</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                点击股票列表中的"深度分析"按钮可启动AI工作流，5个AI员工协同工作：
                1. 基本面分析
                2. 市场行情与前景复盘
                3. 招股书数据分析
                4. 打新策略决策
                5. 结论复盘与总结
              </Text>
            </div>
          </Space>
        </div>
      </Modal>
    </ConfigProvider>
  );
};

export default App;
