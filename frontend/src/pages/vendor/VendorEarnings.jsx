import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FiDollarSign, FiTrendingUp, FiCalendar, FiDownload, FiFilter } from 'react-icons/fi';
import { vendorAPI } from '../../services/api';

const EarningsChart = ({ data, title }) => (
  <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
    <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-900">{item.period}</span>
              <span className="text-sm font-semibold text-gray-900">${item.amount}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 bg-brand-blue rounded-full"
                style={{ width: `${(item.amount / Math.max(...data.map(d => d.amount))) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const VendorEarnings = () => {
  const { vendorData, loading } = useOutletContext();
  const [timeRange, setTimeRange] = useState('week');
  const [earnings, setEarnings] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        setIsLoading(true);
        // Get orders for earnings calculation
        const ordersResponse = await vendorAPI.getOrders();
        const orders = ordersResponse.data || [];

        // Calculate earnings by time period
        const now = new Date();
        let periods = [];

        switch (timeRange) {
          case 'day':
            periods = Array.from({ length: 24 }, (_, i) => {
              const hour = now.getHours() - (23 - i);
              return hour >= 0 ? hour : hour + 24;
            }).map(hour => ({
              period: `${hour.toString().padStart(2, '0')}:00`,
              amount: 0
            }));
            break;
          case 'week':
            periods = Array.from({ length: 7 }, (_, i) => {
              const date = new Date(now);
              date.setDate(date.getDate() - (6 - i));
              return {
                period: date.toLocaleDateString('en-US', { weekday: 'short' }),
                amount: 0
              };
            });
            break;
          case 'month':
            periods = Array.from({ length: 30 }, (_, i) => {
              const date = new Date(now);
              date.setDate(date.getDate() - (29 - i));
              return {
                period: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                amount: 0
              };
            });
            break;
          default:
            periods = [];
        }

        // Calculate earnings from completed orders
        const completedOrders = orders.filter(order => order.status === 'delivered');
        completedOrders.forEach(order => {
          const orderDate = new Date(order.created_at);
          let periodIndex;

          switch (timeRange) {
            case 'day':
              periodIndex = orderDate.getHours();
              break;
            case 'week':
              const dayDiff = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
              periodIndex = 6 - dayDiff;
              break;
            case 'month':
              const monthDay = orderDate.getDate() - 1;
              periodIndex = 29 - monthDay;
              break;
            default:
              periodIndex = -1;
          }

          if (periodIndex >= 0 && periodIndex < periods.length) {
            periods[periodIndex].amount += parseFloat(order.total_amount || 0);
          }
        });

        setEarnings(periods);

        // Mock payout data (in a real app, this would come from a separate API)
        setPayouts([
          {
            id: 'PO-001',
            date: '2024-01-15',
            amount: 1250.50,
            status: 'completed',
            method: 'Bank Transfer'
          },
          {
            id: 'PO-002',
            date: '2024-01-08',
            amount: 890.25,
            status: 'completed',
            method: 'PayPal'
          },
          {
            id: 'PO-003',
            date: '2024-01-01',
            amount: 1456.75,
            status: 'completed',
            method: 'Bank Transfer'
          }
        ]);
      } catch (error) {
        console.error('Error fetching earnings:', error);
        // Fallback to mock data
        setEarnings([
          { period: 'Mon', amount: 1250 },
          { period: 'Tue', amount: 890 },
          { period: 'Wed', amount: 1456 },
          { period: 'Thu', amount: 980 },
          { period: 'Fri', amount: 1670 },
          { period: 'Sat', amount: 2100 },
          { period: 'Sun', amount: 1890 }
        ]);
        setPayouts([
          {
            id: 'PO-001',
            date: '2024-01-15',
            amount: 1250.50,
            status: 'completed',
            method: 'Bank Transfer'
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEarnings();
  }, [timeRange]);

  const totalEarnings = earnings.reduce((sum, earning) => sum + earning.amount, 0);
  const pendingPayouts = payouts.filter(p => p.status === 'pending').length;
  const completedPayouts = payouts.filter(p => p.status === 'completed').length;

  if (loading || isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-gray-200 rounded-lg"></div>
          <div className="h-80 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track your revenue and manage payouts
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-2">
          <FiDownload className="h-5 w-5 text-gray-400" />
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue">
            Download Report
          </button>
        </div>
      </div>

      {/* Time Range Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <FiFilter className="h-5 w-5 text-gray-400" />
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Time Range:</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="block w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-sm rounded-md"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Earnings</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                ${totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-50">
              <FiDollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Completed Payouts</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{completedPayouts}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-50">
              <FiTrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Payouts</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{pendingPayouts}</p>
            </div>
            <div className="p-3 rounded-full bg-amber-50">
              <FiCalendar className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EarningsChart
          data={earnings}
          title="Earnings Overview"
        />

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Payouts</h3>
          <div className="space-y-4">
            {payouts.map((payout) => (
              <div key={payout.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{payout.id}</p>
                  <p className="text-sm text-gray-500">{payout.method} • {new Date(payout.date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    ${payout.amount.toFixed(2)}
                  </p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    payout.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {payout.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <button className="text-sm font-medium text-brand-blue hover:text-brand-blue/80">
              View All Payouts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorEarnings;
