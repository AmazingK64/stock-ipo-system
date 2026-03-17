import React from 'react';
import { ConfigProvider, Layout, Typography } from 'antd';

const { Header, Content } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ background: '#1890ff' }}>
          <Title level={3} style={{ color: '#fff', margin: 0, lineHeight: '64px' }}>
            港股打新策略系统
          </Title>
        </Header>
        <Content style={{ padding: '50px', background: '#f0f2f5' }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
            <Title level={2}>系统正在加载...</Title>
            <p>如果您看到这个页面,说明React和Ant Design已正常工作。</p>
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
