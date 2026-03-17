import React, { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Button, message, Statistic, Row, Col } from 'antd';
import { WalletOutlined, SyncOutlined, DollarOutlined } from '@ant-design/icons';
import ipoService from '../services/ipoService';

interface CapitalManagementProps {
  onCapitalUpdate?: (amount: number) => void;
}

const CapitalManagement: React.FC<CapitalManagementProps> = ({ onCapitalUpdate }) => {
  const [form] = Form.useForm();
  const [capital, setCapital] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    loadCapital();
  }, []);

  const loadCapital = async () => {
    const amount = await ipoService.getCapital();
    setCapital(amount);
    form.setFieldsValue({ capital: amount });
    if (onCapitalUpdate) {
      onCapitalUpdate(amount);
    }
  };

  const handleSubmit = async (values: { capital: number }) => {
    setLoading(true);
    try {
      const success = await ipoService.updateCapital(values.capital);
      if (success) {
        message.success('资金总量更新成功');
        setCapital(values.capital);
        if (onCapitalUpdate) {
          onCapitalUpdate(values.capital);
        }
      } else {
        message.error('更新失败');
      }
    } catch (error) {
      message.error('更新失败');
    }
    setLoading(false);
  };

  return (
    <Card 
      style={{ 
        marginBottom: 24,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none',
        borderRadius: 16,
        boxShadow: '0 8px 24px rgba(102, 126, 234, 0.25)'
      }}
    >
      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <div style={{ color: '#fff' }}>
            <h2 style={{ color: '#fff', marginBottom: 16, fontSize: 24 }}>
              <WalletOutlined style={{ marginRight: 8 }} />
              资金管理
            </h2>
            <Statistic
              title={<span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>当前资金总量</span>}
              value={capital}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="HKD"
              valueStyle={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}
            />
          </div>
        </Col>
        <Col xs={24} md={12}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            style={{ marginTop: 8 }}
          >
            <Form.Item
              name="capital"
              label={<span style={{ color: '#fff', fontWeight: 500 }}>更新资金总量</span>}
              rules={[{ required: true, message: '请输入资金总量' }]}
            >
              <InputNumber
                style={{ width: '100%', borderRadius: 8 }}
                size="large"
                min={0}
                precision={2}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value!.replace(/\$\s?|(,*)/g, '') as any}
                placeholder="请输入资金总量(HKD)"
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  fontWeight: 'bold',
                  borderRadius: 8
                }}
              >
                <SyncOutlined style={{ marginRight: 8 }} />
                更新资金
              </Button>
            </Form.Item>
          </Form>
        </Col>
      </Row>
    </Card>
  );
};

export default CapitalManagement;
