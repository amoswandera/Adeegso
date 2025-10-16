import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FiTrendingUp, FiDollarSign, FiShoppingBag, FiUsers, FiClock, FiPieChart, FiBarChart2, FiCalendar, FiStar, FiAlertTriangle } from 'react-icons/fi';
import { vendorAPI } from '../../services/api';

// Mock data - replace with actual API calls
const generateSalesData = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map(day => ({
    day,
    sales: Math.floor(Math.random() * 1000) + 500,
    orders: Math.floor(Math.random() * 50) + 20,
  }));
};

const generateTopProducts = () => {
  const products = [
    'Margherita Pizza',
    'Pepperoni Pizza',
    'Caesar Salad',
    'Garlic Bread',
    'Pasta Alfredo',
    'Tiramisu',
    'Soda',
  ];
  
  return products.map(name => ({
    name,
    sales: Math.floor(Math.random() * 100) + 20,
    revenue: (Math.random() * 1000 + 200).toFixed(2),
  })).sort((a, b) => b.sales - a.sales).slice(0, 5);
};

const StatCard = ({ title, value, change, icon: Icon, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
          <div className={`mt-2 inline-flex items-center text-sm font-medium ${
            change >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {change >= 0 ? (
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ) : (
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            {Math.abs(change)}% from last week
          </div>
        </div>
        <div className={`p-3 rounded-full ${colors[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

const AnalyticsChart = ({ data, title, color = 'blue' }) => {
  const colors = {
    blue: { bg: 'bg-blue-100', fill: 'fill-blue-500' },
    green: { bg: 'bg-green-100', fill: 'fill-green-500' },
    purple: { bg: 'bg-purple-100', fill: 'fill-purple-500' },
  };
  
  const maxValue = Math.max(...data.map(item => item.value));
  
  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <div className="flex items-end space-x-2 h-40">
        {data.map((item, index) => {
          const height = (item.value / maxValue) * 100 || 10; // Minimum height of 10%
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full flex justify-center">
                <div 
                  className={`w-3/4 rounded-t ${colors[color].bg} ${colors[color].fill}`}
                  style={{ height: `${height}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-500 mt-2">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Analytics = () => {
  const { vendorData, loading } = useOutletContext();
  const [timeRange, setTimeRange] = useState('week');
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      try {
        // Use the new analytics endpoint
        const analyticsResponse = await vendorAPI.getAnalytics();
        const analyticsData = analyticsResponse.data;

        if (analyticsData) {
          // Update stats with real data from backend
          setStats(prevStats => prevStats.map(stat => {
            switch (stat.title) {
              case 'Total Revenue':
                return {
                  ...stat,
                  value: `$${parseFloat(analyticsData.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                };
              case 'Total Orders':
                return { ...stat, value: (analyticsData.total_orders || 0).toString() };
              case 'Average Order Value':
                return { ...stat, value: `$${parseFloat(analyticsData.average_order_value || 0).toFixed(2)}` };
              case 'New Customers':
                return { ...stat, value: Math.floor((analyticsData.total_orders || 0) * 0.3).toString() };
              default:
                return stat;
            }
          }));

          // Update sales data from backend
          if (analyticsData.daily_sales && analyticsData.daily_sales.length > 0) {
            setSalesData(analyticsData.daily_sales.map(day => ({
              day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
              sales: parseFloat(day.revenue || 0),
              orders: day.orders || 0
            })));
          }

          // Update top products from backend
          if (analyticsData.top_products && analyticsData.top_products.length > 0) {
            setTopProducts(analyticsData.top_products.map(product => ({
              name: product.name,
              sales: product.quantity || 0,
              revenue: parseFloat(product.revenue || 0).toFixed(2)
            })));
          }
        }
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        // Fallback to existing logic if analytics endpoint fails
        try {
          // Fetch orders for analytics data as fallback
          const ordersResponse = await vendorAPI.getOrders();
          const orders = ordersResponse.data || [];

          // Calculate real stats from orders data
          const totalRevenue = orders
            .filter(order => order.status === 'delivered')
            .reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);

          const totalOrders = orders.length;
          const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

          // Mock customer count for now (could be calculated from unique customers)
          const newCustomers = Math.floor(totalOrders * 0.3);

          // Update stats with real data
          setStats(prevStats => prevStats.map(stat => {
            switch (stat.title) {
              case 'Total Revenue':
                return { ...stat, value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` };
              case 'Total Orders':
                return { ...stat, value: totalOrders.toString() };
              case 'Average Order Value':
                return { ...stat, value: `$${avgOrderValue.toFixed(2)}` };
              case 'New Customers':
                return { ...stat, value: newCustomers.toString() };
              default:
                return stat;
            }
          }));

          // Generate sales data based on orders
          const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date.toISOString().split('T')[0];
          });

          const salesByDay = last7Days.map(date => {
            const dayOrders = orders.filter(order =>
              order.created_at.split('T')[0] === date
            );
            const dayRevenue = dayOrders.reduce((sum, order) =>
              sum + parseFloat(order.total_amount || 0), 0
            );
            const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
            return {
              day: dayName,
              sales: dayRevenue,
              orders: dayOrders.length
            };
          });

          setSalesData(salesByDay);

          // Generate top products from order items
          const productSales = {};
          orders.forEach(order => {
            order.items?.forEach(item => {
              const productName = item.product?.name || 'Unknown Product';
              const revenue = parseFloat(item.price || 0) * item.quantity;
              if (!productSales[productName]) {
                productSales[productName] = { sales: 0, revenue: 0 };
              }
              productSales[productName].sales += item.quantity;
              productSales[productName].revenue += revenue;
            });
          });

          const topProductsData = Object.entries(productSales)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 5)
            .map(product => ({
              ...product,
              revenue: product.revenue.toFixed(2)
            }));

          setTopProducts(topProductsData);
        } catch (fallbackError) {
          console.error('Fallback analytics fetch also failed:', fallbackError);
          // Final fallback to mock data
          setSalesData(generateSalesData());
          setTopProducts(generateTopProducts());
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [timeRange]);

  const stats = [
    {
      title: 'Total Revenue',
      value: `$${(Math.random() * 10000 + 5000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: Math.floor(Math.random() * 20) - 5,
      icon: FiDollarSign,
      color: 'green',
    },
    {
      title: 'Total Orders',
      value: Math.floor(Math.random() * 500) + 100,
      change: Math.floor(Math.random() * 15) + 5,
      icon: FiShoppingBag,
      color: 'blue',
    },
    {
      title: 'Average Order Value',
      value: `$${(Math.random() * 50 + 20).toFixed(2)}`,
      change: Math.floor(Math.random() * 10) - 2,
      icon: FiTrendingUp,
      color: 'purple',
    },
    {
      title: 'New Customers',
      value: Math.floor(Math.random() * 50) + 10,
      change: Math.floor(Math.random() * 25) + 5,
      icon: FiUsers,
      color: 'amber',
    },
  ];

  const orderStatusData = [
    { label: 'Completed', value: Math.floor(Math.random() * 100) + 50 },
    { label: 'Processing', value: Math.floor(Math.random() * 20) + 5 },
    { label: 'Cancelled', value: Math.floor(Math.random() * 10) + 1 },
  ];

  const categoryData = [
    { label: 'Pizza', value: Math.floor(Math.random() * 100) + 50 },
    { label: 'Pasta', value: Math.floor(Math.random() * 70) + 30 },
    { label: 'Salads', value: Math.floor(Math.random() * 50) + 20 },
    { label: 'Desserts', value: Math.floor(Math.random() * 40) + 10 },
    { label: 'Drinks', value: Math.floor(Math.random() * 60) + 20 },
  ];

  if (loading || isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-80 bg-gray-200 rounded-lg"></div>
            <div className="h-80 bg-gray-200 rounded-lg"></div>
            <div className="h-80 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track your restaurant's performance and key metrics
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                timeRange === 'day'
                  ? 'bg-brand-blue text-white border-brand-blue'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setTimeRange('day')}
            >
              Today
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium border-t border-b ${
                timeRange === 'week'
                  ? 'bg-brand-blue text-white border-brand-blue'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setTimeRange('week')}
            >
              This Week
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
                timeRange === 'month'
                  ? 'bg-brand-blue text-white border-brand-blue'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setTimeRange('month')}
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            icon={stat.icon}
            color={stat.color}
          />
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Sales Overview</h3>
              <div className="flex items-center text-sm text-gray-500">
                <FiCalendar className="mr-2 h-4 w-4" />
                <span>Last 7 days</span>
              </div>
            </div>
            <div className="h-64">
              <div className="flex items-end h-48 space-x-1">
                {salesData.map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex justify-center">
                      <div 
                        className="w-3/4 bg-blue-100 rounded-t"
                        style={{ height: `${(day.sales / 1500) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 mt-2">{day.day}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between text-xs text-gray-500">
                <span>${Math.min(...salesData.map(d => d.sales)).toLocaleString()}</span>
                <span>${Math.max(...salesData.map(d => d.sales)).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Orders by Status</h3>
          <div className="space-y-4">
            {orderStatusData.map((status, index) => {
              const total = orderStatusData.reduce((sum, item) => sum + item.value, 0);
              const percentage = Math.round((status.value / total) * 100);
              
              return (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{status.label}</span>
                    <span className="text-gray-500">{status.value} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        status.label === 'Completed' ? 'bg-green-500' : 
                        status.label === 'Processing' ? 'bg-blue-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Selling Items</h3>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-medium">
                  {index + 1}
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm font-medium text-gray-900">${product.revenue}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${(product.sales / 150) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{product.sales} orders</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Sales by Category</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="relative w-48 h-48">
              {categoryData.map((category, index) => {
                const total = categoryData.reduce((sum, item) => sum + item.value, 0);
                const percentage = (category.value / total) * 100;
                const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];
                const radius = 60;
                const circumference = 2 * Math.PI * radius;
                const offset = circumference - (percentage / 100) * circumference;
                const rotation = categoryData
                  .slice(0, index)
                  .reduce((sum, item) => sum + (item.value / total) * 360, 0);
                
                return (
                  <div 
                    key={index}
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      '--offset': offset,
                      '--circumference': circumference,
                      '--color': colors[index % colors.length],
                    }}
                  >
                    <svg className="w-full h-full" viewBox="0 0 200 200">
                      <circle
                        cx="100"
                        cy="100"
                        r={radius}
                        fill="none"
                        stroke="#E5E7EB"
                        strokeWidth="40"
                      />
                      <circle
                        cx="100"
                        cy="100"
                        r={radius}
                        fill="none"
                        stroke={colors[index % colors.length]}
                        strokeWidth="40"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        transform={`rotate(-90 100 100)`}
                        style={{
                          transition: 'stroke-dashoffset 0.5s ease',
                        }}
                      />
                    </svg>
                  </div>
                );
              })}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">
                  {categoryData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                </span>
                <span className="text-sm text-gray-500">Total Sales</span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {categoryData.map((category, index) => {
              const total = categoryData.reduce((sum, item) => sum + item.value, 0);
              const percentage = Math.round((category.value / total) * 100);
              const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];
              
              return (
                <div key={index} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: colors[index % colors.length] }}
                  ></div>
                  <span className="text-sm text-gray-700">{category.label}</span>
                  <span className="ml-auto text-sm font-medium text-gray-900">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          <button className="text-sm font-medium text-brand-blue hover:text-brand-blue/80">
            View All
          </button>
        </div>
        <div className="space-y-4">
          {[
            { 
              id: 1, 
              type: 'order', 
              title: 'New order received', 
              description: 'Order #ORD-1042 for $45.99', 
              time: '2 minutes ago',
              icon: <FiShoppingBag className="h-5 w-5 text-green-500" />
            },
            { 
              id: 2, 
              type: 'payment', 
              title: 'Payment processed', 
              description: '$125.00 from John Doe', 
              time: '1 hour ago',
              icon: <FiDollarSign className="h-5 w-5 text-blue-500" />
            },
            { 
              id: 3, 
              type: 'review', 
              title: 'New review received', 
              description: '4.5 ★ for Pepperoni Pizza', 
              time: '3 hours ago',
              icon: <FiStar className="h-5 w-5 text-amber-500" />
            },
            { 
              id: 4, 
              type: 'inventory', 
              title: 'Low stock alert', 
              description: 'Only 2 Margherita Pizzas left', 
              time: '5 hours ago',
              icon: <FiAlertTriangle className="h-5 w-5 text-red-500" />
            },
          ].map((activity) => (
            <div key={activity.id} className="flex items-start pb-4 border-b border-gray-100 last:border-0 last:pb-0">
              <div className="flex-shrink-0 mt-1">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  {activity.icon}
                </div>
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{activity.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
