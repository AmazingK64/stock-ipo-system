import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button, message, Space, ConfigProvider, Popconfirm, Tooltip } from 'antd';
import { ReloadOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import CapitalManagement from './components/CapitalManagement';
import IPOList from './components/IPOList';
import AllocationStrategy from './components/AllocationStrategy';
import StrategyPlans from './components/StrategyPlans';
import RealTimeMarginData from './components/RealTimeMarginData';
import ipoService from './services/ipoService';
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const capitalAmount = await ipoService.getCapital();
    let stocks = await ipoService.getAllIPOStocks();

    // 检查是否有重复数据
    const stockCodes = stocks.map(s => s.stockCode);
    const hasDuplicates = stockCodes.length !== new Set(stockCodes).size;

    // 检查数据日期是否是今天
    const today = new Date().toISOString().split('T')[0];
    // 检查是否有必要字段缺失（如新增了字段后旧数据未包含）
    const hasMissingFields = stocks.length > 0 && !stocks[0].companyValue && !stocks[0].totalLots;
    const needRefresh = stocks.length === 0 ||
                        hasDuplicates ||
                        hasMissingFields ||
                        !stocks[0].dataDate ||
                        stocks[0].dataDate !== today;

    if (needRefresh) {
      // 只在需要时刷新数据(静默刷新,不显示消息)
      console.log('需要刷新数据:', {
        hasData: stocks.length > 0,
        hasDuplicates,
        hasMissingFields,
        dataDate: stocks[0]?.dataDate,
        today
      });
      await refreshIPOData(false);
      stocks = await ipoService.getAllIPOStocks();
    } else {
      console.log('使用历史数据,无需刷新');
    }

    // 获取今日上市实时行情
    const quotes = await ipoService.fetchTodayListedQuotes();
    setRealtimeQuotes(quotes);

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

  /**
   * 刷新数据并同时更新招股书库
   * 下载正在招股的招股书，剔除已过期不再招股的招股书
   */
  const refreshWithProspectus = async () => {
    setRefreshing(true);
    try {
      // 1. 先刷新新股数据
      const success = await ipoService.refreshIPOData();
      if (success) {
        const stocks = await ipoService.getAllIPOStocks();
        const quotes = await ipoService.fetchTodayListedQuotes();
        setRealtimeQuotes(quotes);
        setIPOStocks(stocks);
        message.success('新股数据刷新成功');
      } else {
        message.warning('新股数据刷新失败，继续更新招股书...');
      }

      // 2. 后台更新招股书库（不阻塞UI）
      try {
        const response = await fetch('http://localhost:3001/api/prospectus/update', {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(300000) // 5分钟超时（PDF下载较慢）
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
      } catch (err) {
        console.warn('招股书更新失败:', err);
        // 不阻塞主流程，仅后台提示
      }
    } catch (error) {
      message.error('刷新失败');
    }
    setRefreshing(false);
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
          </Space>
          <Space>
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
              onClick={refreshWithProspectus}
              loading={refreshing}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                fontWeight: 'bold'
              }}
            >
              <Tooltip title="刷新新股数据并同步下载最新招股书">
                刷新数据
              </Tooltip>
            </Button>
          </Space>
        </Header>

        <Content style={{ padding: '40px 50px', background: '#f0f2f5' }}>
          <div style={{ maxWidth: 1600, margin: '0 auto' }}>
            <CapitalManagement onCapitalUpdate={handleCapitalUpdate} />
            
            {/* 实时孖展数据 */}
            <RealTimeMarginData />
            
            <StrategyPlans capital={capital} ipoStocks={ipoStocks} />
            
            <AllocationStrategy capital={capital} ipoStocks={ipoStocks} />
            
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
    </ConfigProvider>
  );
};

export default App;
