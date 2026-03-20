import React, { useState, useMemo } from 'react';
import { Card, Table, Statistic, Row, Col, Tag, Space, Typography, Empty, Divider, Button, Modal } from 'antd';
import { ThunderboltOutlined, CalculatorOutlined, CalendarOutlined, HistoryOutlined } from '@ant-design/icons';
import ipoService from '../services/ipoService';
import type { IPOStock, Allocation } from '../types';

const { Text } = Typography;

interface AllocationStrategyProps {
  capital: number;
  ipoStocks: IPOStock[];
}

const AllocationStrategy: React.FC<AllocationStrategyProps> = ({ capital, ipoStocks }) => {
  const [modalVisible, setModalVisible] = useState(false);

  // 使用 useMemo 计算分配结果，避免在 effect 中多次 setState
  const { allocations, totalFinancing, currentAndFutureAllocations, historicalAllocations } = useMemo(() => {
    if (capital <= 0 || ipoStocks.length === 0) {
      return {
        allocations: [] as Allocation[],
        totalFinancing: 0,
        currentAndFutureAllocations: [] as Allocation[],
        historicalAllocations: [] as Allocation[]
      };
    }

    const result = ipoService.calculateAllocation(capital, ipoStocks);
    const totalFin = result.reduce((sum, item) => sum + item.financingAmount, 0);

    // 分离当前/未来批次和历史批次(基于申购截止日期)
    const now = new Date();
    const current: Allocation[] = [];
    const historical: Allocation[] = [];

    result.forEach(allocation => {
      if (allocation.subscriptionEndDate) {
        const subscriptionEndDate = new Date(allocation.subscriptionEndDate);
        if (subscriptionEndDate >= now) {
          current.push(allocation);
        } else {
          historical.push(allocation);
        }
      } else {
        // 没有申购截止日期的当作当前批次
        current.push(allocation);
      }
    });

    return {
      allocations: result,
      totalFinancing: totalFin,
      currentAndFutureAllocations: current,
      historicalAllocations: historical
    };
  }, [capital, ipoStocks]);

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
      title: '资金分配',
      dataIndex: 'capitalAllocation',
      key: 'capitalAllocation',
      width: 140,
      render: (value: number) => (
        <Statistic
          value={value}
          precision={2}
          prefix="HK$"
          valueStyle={{ fontSize: 14 }}
        />
      )
    },
    {
      title: '融资倍数',
      dataIndex: 'financingMultiplier',
      key: 'financingMultiplier',
      width: 100,
      render: (value: number) => (
        <Tag color="purple" style={{ fontSize: 14, padding: '4px 12px' }}>
          {value}x
        </Tag>
      )
    },
    {
      title: '融资金额',
      dataIndex: 'financingAmount',
      key: 'financingAmount',
      width: 140,
      render: (value: number) => (
        <Statistic
          value={value}
          precision={2}
          prefix="HK$"
          valueStyle={{ fontSize: 14, color: '#722ed1' }}
        />
      )
    },
    {
      title: '申购总额',
      dataIndex: 'totalSubscription',
      key: 'totalSubscription',
      width: 140,
      render: (value: number) => (
        <Statistic
          value={value}
          precision={2}
          prefix="HK$"
          valueStyle={{ fontSize: 14, color: '#52c41a', fontWeight: 'bold' }}
        />
      )
    },
    {
      title: '分配比例',
      dataIndex: 'allocationRatio',
      key: 'allocationRatio',
      width: 120,
      render: (value: number) => (
        <Tag color="blue" style={{ fontSize: 14 }}>
          {(value * 100).toFixed(1)}%
        </Tag>
      )
    },
    {
      title: '申购股数',
      dataIndex: 'shares',
      key: 'shares',
      width: 120,
      render: (value: number, record: Allocation) => {
        // 从ipoStocks中查找对应的股票信息获取sharesPerLot
        const ipo = ipoStocks.find(s => s.stockCode === record.stockCode);
        const sharesPerLot = ipo?.sharesPerLot || 100;
        const lots = Math.floor(value / sharesPerLot);
        return (
          <Space direction="vertical" size={0}>
            <Text strong>{value.toLocaleString()}股</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              ({lots}手)
            </Text>
          </Space>
        );
      }
    }
  ];

  // 按申购截止日期分组显示
  const groupAllocationsByDate = (allocationList: Allocation[]) => {
    return allocationList.reduce((acc, allocation) => {
      const date = allocation.subscriptionEndDate || allocation.listingDate || '未知';
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(allocation);
      return acc;
    }, {} as Record<string, Allocation[]>);
  };

  // 渲染批次表格
  const renderBatchTables = (groupedAllocations: Record<string, Allocation[]>, isHistory = false) => {
    return Object.entries(groupedAllocations).map(([subscriptionEndDate, batchAllocations]) => {
      const batchTotalCapital = batchAllocations.reduce((sum, item) => sum + item.capitalAllocation, 0);
      const batchTotalFinancing = batchAllocations.reduce((sum, item) => sum + item.financingAmount, 0);
      
      return (
        <div key={subscriptionEndDate} style={{ marginBottom: 24 }}>
          <Divider titlePlacement="left">
            <Space>
              <CalendarOutlined style={{ color: '#1890ff' }} />
              <Text strong style={{ fontSize: 16 }}>
                申购截止日期: {subscriptionEndDate}
              </Text>
              <Tag color="blue">{batchAllocations.length}只新股</Tag>
              <Tag color="green">
                申购总额: HK${(batchTotalCapital + batchTotalFinancing).toFixed(2)}
              </Tag>
              {isHistory && <Tag color="orange">已截止</Tag>}
            </Space>
          </Divider>
          
          <Table
            columns={columns}
            dataSource={batchAllocations}
            rowKey="ipoStockId"
            pagination={false}
            scroll={{ x: 1000 }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <Text strong>本批次合计</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <Text strong style={{ color: '#1890ff' }}>
                      HK${batchTotalCapital.toFixed(2)}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} />
                  <Table.Summary.Cell index={4}>
                    <Text strong style={{ color: '#722ed1' }}>
                      HK${batchTotalFinancing.toFixed(2)}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5}>
                    <Text strong style={{ color: '#52c41a' }}>
                      HK${(batchTotalCapital + batchTotalFinancing).toFixed(2)}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} colSpan={2} />
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        </div>
      );
    });
  };

  // 统计信息
  const currentGroupedAllocations = groupAllocationsByDate(currentAndFutureAllocations);
  const historicalGroupedAllocations = groupAllocationsByDate(historicalAllocations);
  const currentBatchesCount = Object.keys(currentGroupedAllocations).length;
  const historicalBatchesCount = Object.keys(historicalGroupedAllocations).length;

  return (
    <>
      <Card
        style={{
          marginTop: 32,
          marginBottom: 24,
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <CalculatorOutlined style={{ color: '#1890ff', fontSize: 20 }} />
              <Text strong style={{ fontSize: 16 }}>融资分配策略</Text>
            </Space>
            <Button
              type="primary"
              icon={<CalculatorOutlined />}
              onClick={() => setModalVisible(true)}
            >
              查看分配详情
            </Button>
          </Space>
          
          {capital === 0 ? (
            <Empty description="请先设置资金总量" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : allocations.length === 0 ? (
            <Empty description="暂无符合条件的优质新股(B级及以上)" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Space wrap>
              <Tag color="blue" style={{ fontSize: 13, padding: '4px 12px' }}>
                当前批次: {currentBatchesCount}个
              </Tag>
              {historicalBatchesCount > 0 && (
                <Tag color="orange" style={{ fontSize: 13, padding: '4px 12px' }}>
                  历史批次: {historicalBatchesCount}个
                </Tag>
              )}
              <Tag color="green" style={{ fontSize: 13, padding: '4px 12px' }}>
                自有资金: HK${capital.toLocaleString()}
              </Tag>
              <Tag color="purple" style={{ fontSize: 13, padding: '4px 12px' }}>
                融资总额: HK${totalFinancing.toLocaleString()}
              </Tag>
              <Tag color="cyan" style={{ fontSize: 13, padding: '4px 12px' }}>
                申购总额: HK${(capital + totalFinancing).toLocaleString()}
              </Tag>
            </Space>
          )}
        </Space>
      </Card>

      {/* 分配详情弹窗 */}
      <Modal
        title={
          <Space>
            <CalculatorOutlined style={{ color: '#1890ff' }} />
            <Text>融资分配策略详情</Text>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={1400}
      >
        <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {capital === 0 ? (
            <Empty description="请先设置资金总量" />
          ) : allocations.length === 0 ? (
            <Empty description="暂无符合条件的优质新股(B级及以上)" />
          ) : (
            <>
              {/* 统计卡片 */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                  <Card 
                    style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none'
                    }}
                  >
                    <Statistic
                      title={<span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>自有资金</span>}
                      value={capital}
                      precision={2}
                      prefix="HK$"
                      valueStyle={{ color: '#fff', fontSize: 20 }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card 
                    style={{ 
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      border: 'none'
                    }}
                  >
                    <Statistic
                      title={<span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>融资总额</span>}
                      value={totalFinancing}
                      precision={2}
                      prefix="HK$"
                      valueStyle={{ color: '#fff', fontSize: 20 }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card 
                    style={{ 
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      border: 'none'
                    }}
                  >
                    <Statistic
                      title={<span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>申购总额</span>}
                      value={capital + totalFinancing}
                      precision={2}
                      prefix="HK$"
                      valueStyle={{ color: '#fff', fontSize: 20 }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* 当前和未来批次 */}
              {currentAndFutureAllocations.length > 0 && (
                <>
                  <Divider titlePlacement="left">
                    <Space>
                      <CalendarOutlined style={{ color: '#52c41a' }} />
                      <Text strong>当前/未来申购批次</Text>
                      <Tag color="green">{currentBatchesCount}个批次</Tag>
                    </Space>
                  </Divider>
                  {renderBatchTables(currentGroupedAllocations)}
                </>
              )}

              {/* 历史批次 */}
              {historicalAllocations.length > 0 && (
                <>
                  <Divider titlePlacement="left">
                    <Space>
                      <HistoryOutlined style={{ color: '#fa8c16' }} />
                      <Text strong>历史批次</Text>
                      <Tag color="orange">{historicalBatchesCount}个批次</Tag>
                    </Space>
                  </Divider>
                  {renderBatchTables(historicalGroupedAllocations, true)}
                </>
              )}

              {/* 策略说明 */}
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
                    <ThunderboltOutlined style={{ marginRight: 8 }} />
                    策略说明:
                  </Text>
                  <Text>• 同一批次上市的新股资金不冲突,可同时申购</Text>
                  <Text>• 不同批次上市的新股,资金需要等上一批次上市后才能用于下一批次</Text>
                  <Text>• 系统按申购截止日期分组,每批独立分配资金</Text>
                  <Text>• 融资倍数: A+级别10倍, A级别7倍, B+级别4倍, 最高不超过10倍</Text>
                  <Text type="warning">⚠️ 例如: 5万资金 + 10倍融资 = 最高可申购50万新股</Text>
                  <Text type="warning">⚠️ 提示: 融资申购需承担利息成本,请根据风险承受能力调整</Text>
                </Space>
              </Card>
            </>
          )}
        </div>
      </Modal>
    </>
  );
};

export default AllocationStrategy;
