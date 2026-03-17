import React, { useState, useEffect } from 'react';
import { Card, Table, Statistic, Row, Col, Tag, Space, Typography, Empty, Divider } from 'antd';
import { ThunderboltOutlined, CalculatorOutlined, CalendarOutlined } from '@ant-design/icons';
import ipoService from '../services/ipoService';
import type { IPOStock, Allocation } from '../types';

const { Text } = Typography;

interface AllocationStrategyProps {
  capital: number;
  ipoStocks: IPOStock[];
}

const AllocationStrategy: React.FC<AllocationStrategyProps> = ({ capital, ipoStocks }) => {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [totalFinancing, setTotalFinancing] = useState<number>(0);

  useEffect(() => {
    if (capital > 0 && ipoStocks.length > 0) {
      const result = ipoService.calculateAllocation(capital, ipoStocks);
      setAllocations(result);
      
      const totalFin = result.reduce((sum, item) => sum + item.financingAmount, 0);
      setTotalFinancing(totalFin);
    }
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

  // 按上市日期分组显示
  const groupedAllocations = allocations.reduce((acc, allocation) => {
    const date = allocation.listingDate || '未知';
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(allocation);
    return acc;
  }, {} as Record<string, Allocation[]>);

  if (capital === 0) {
    return (
      <Card
        title={
          <Space>
            <CalculatorOutlined style={{ color: '#1890ff', fontSize: 20 }} />
            <Text strong style={{ fontSize: 18 }}>融资分配策略</Text>
          </Space>
        }
        style={{ borderRadius: 16, boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)' }}
      >
        <Empty description="请先设置资金总量" />
      </Card>
    );
  }

  if (allocations.length === 0) {
    return (
      <Card
        title={
          <Space>
            <CalculatorOutlined style={{ color: '#1890ff', fontSize: 20 }} />
            <Text strong style={{ fontSize: 18 }}>融资分配策略</Text>
          </Space>
        }
        style={{ borderRadius: 16, boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)' }}
      >
        <Empty description="暂无符合条件的优质新股(B级及以上)" />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <CalculatorOutlined style={{ color: '#1890ff', fontSize: 20 }} />
          <Text strong style={{ fontSize: 18 }}>融资分配策略 (按上市批次)</Text>
        </Space>
      }
      style={{ 
        marginBottom: 24,
        borderRadius: 16,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
      }}
    >
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

      {/* 按批次显示 */}
      {Object.entries(groupedAllocations).map(([listingDate, batchAllocations]) => {
        const batchTotalCapital = batchAllocations.reduce((sum, item) => sum + item.capitalAllocation, 0);
        const batchTotalFinancing = batchAllocations.reduce((sum, item) => sum + item.financingAmount, 0);
        
        return (
          <div key={listingDate} style={{ marginBottom: 24 }}>
            <Divider orientation={'left' as any}>
              <Space>
                <CalendarOutlined style={{ color: '#1890ff' }} />
                <Text strong style={{ fontSize: 16 }}>
                  上市日期: {listingDate}
                </Text>
                <Tag color="blue">{batchAllocations.length}只新股</Tag>
                <Tag color="green">
                  申购总额: HK${(batchTotalCapital + batchTotalFinancing).toFixed(2)}
                </Tag>
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
      })}

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
          <Text>• 系统按上市日期分组,每批独立分配资金</Text>
          <Text>• 融资倍数: A+级别10倍, A级别7倍, B+级别4倍, 最高不超过10倍</Text>
          <Text type="warning">⚠️ 例如: 5万资金 + 10倍融资 = 最高可申购50万新股</Text>
          <Text type="warning">⚠️ 提示: 融资申购需承担利息成本,请根据风险承受能力调整</Text>
        </Space>
      </Card>
    </Card>
  );
};

export default AllocationStrategy;
