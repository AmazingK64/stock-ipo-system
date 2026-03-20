import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button, message, Space, ConfigProvider, Popconfirm } from 'antd';
import { ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import CapitalManagement from './components/CapitalManagement';
import IPOList from './components/IPOList';
import AllocationStrategy from './components/AllocationStrategy';
import StrategyPlans from './components/StrategyPlans';
import RealTimeMarginData from './components/RealTimeMarginData';
import ipoService from './services/ipoService';
import db from './db/database';
import scheduler from './utils/scheduler';
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
    // 启动定时任务
    scheduler.start();

    // 组件卸载时停止定时任务
    return () => {
      scheduler.stop();
    };
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
    const needRefresh = stocks.length === 0 ||
                        hasDuplicates ||
                        !stocks[0].dataDate ||
                        stocks[0].dataDate !== today;

    if (needRefresh) {
      // 只在需要时刷新数据(静默刷新,不显示消息)
      console.log('需要刷新数据:', {
        hasData: stocks.length > 0,
        hasDuplicates,
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
              onClick={() => refreshIPOData(true)}
              loading={refreshing}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                fontWeight: 'bold'
              }}
            >
              刷新数据
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
