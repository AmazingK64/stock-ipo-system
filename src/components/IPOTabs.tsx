/**
 * IPO Tab配置
 * 定义四个Tab的内容和配置
 */

import { Table, Badge } from 'antd';
import {
  BankOutlined,
  CalendarOutlined,
  RiseOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import type { RealtimeQuote } from '../types';
import { ipoColumns, quoteColumns, type ExtendedIPOStock } from './IPOColumns';

// Tab数据接口
interface TabData {
  subscribe: ExtendedIPOStock[];
  upcoming: ExtendedIPOStock[];
  todayListed: RealtimeQuote[];
  recentListed: ExtendedIPOStock[];
}

interface IPOTabsProps {
  groupedStocks: TabData;
  loading: boolean;
  rowKey?: string;
}

/** Tab配置 */
export const createIPOTabItems = (props: IPOTabsProps) => {
  const { groupedStocks, loading, rowKey = 'id' } = props;

  return [
    {
      key: 'subscribe',
      label: (
        <span>
          <BankOutlined />
          申购中
          {groupedStocks.subscribe.length > 0 && (
            <Badge count={groupedStocks.subscribe.length} style={{ marginLeft: 8 }} />
          )}
        </span>
      ),
      children: (
        <Table
          columns={ipoColumns}
          dataSource={groupedStocks.subscribe}
          rowKey={rowKey}
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 只`
          }}
          scroll={{ x: 1300 }}
          rowClassName={(record) => {
            const grade = (record as ExtendedIPOStock).grade || '';
            if (grade.startsWith('A')) return 'row-highlight-a';
            if (grade.startsWith('B')) return 'row-highlight-b';
            return '';
          }}
          locale={{ emptyText: '暂无申购中的新股' }}
        />
      )
    },
    {
      key: 'upcoming',
      label: (
        <span>
          <CalendarOutlined />
          即将上市
          {groupedStocks.upcoming.length > 0 && (
            <Badge count={groupedStocks.upcoming.length} style={{ marginLeft: 8, backgroundColor: '#faad14' }} />
          )}
        </span>
      ),
      children: (
        <Table
          columns={ipoColumns}
          dataSource={groupedStocks.upcoming}
          rowKey={rowKey}
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 只`
          }}
          scroll={{ x: 1300 }}
          rowClassName={(record) => {
            const grade = (record as ExtendedIPOStock).grade || '';
            if (grade.startsWith('A')) return 'row-highlight-a';
            if (grade.startsWith('B')) return 'row-highlight-b';
            return '';
          }}
          locale={{ emptyText: '暂无即将上市的新股' }}
        />
      )
    },
    {
      key: 'todayListed',
      label: (
        <span>
          <RiseOutlined />
          今日上市
          {groupedStocks.todayListed.length > 0 && (
            <Badge count={groupedStocks.todayListed.length} style={{ marginLeft: 8, backgroundColor: '#ff4d4f' }} />
          )}
        </span>
      ),
      children: (
        <Table
          columns={quoteColumns}
          dataSource={groupedStocks.todayListed}
          rowKey="stockCode"
          loading={loading}
          pagination={false}
          rowClassName={() => 'row-today-listed'}
          locale={{ emptyText: '今日无新股上市' }}
        />
      )
    },
    {
      key: 'recentListed',
      label: (
        <span>
          <ClockCircleOutlined />
          近期上市
          {groupedStocks.recentListed.length > 0 && (
            <Badge count={groupedStocks.recentListed.length} style={{ marginLeft: 8 }} />
          )}
        </span>
      ),
      children: (
        <Table
          columns={ipoColumns}
          dataSource={groupedStocks.recentListed}
          rowKey={rowKey}
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 只`
          }}
          scroll={{ x: 1300 }}
          locale={{ emptyText: '暂无近期上市的股票' }}
        />
      )
    }
  ];
};