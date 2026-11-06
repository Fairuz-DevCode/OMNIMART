import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Bell,
  ArrowUpRight,
  ShoppingBag,
  Package,
  Users,
  DollarSign,
  ChevronDown,
  Filter,
  Activity,
  ShieldCheck,
  Check,
  QrCode,
  XCircle,
  Lock,
  Layers,
  Clock,
  Download,
  Plus,
  TrendingUp,
  TrendingDown,
  LayoutDashboard,
  Box,
  ShoppingBasket,
  Tag,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import ManageProduct from './ManageProduct';
import ManageOrders from './ManageOrders';
import ManageDiscount from './ManageDiscount';
import { useAdminDashboard } from '../hooks/useAdminDashboard';

import featureBasket from '../../../assets/img/feature-basket.jpg';

// Sparkline Configs & Data for Shadcn UI Chart
const whiteSparklineConfig = {
  trend: {
    label: 'Trend',
    color: '#ffffff',
  },
} satisfies ChartConfig;

const greenSparklineConfig = {
  trend: {
    label: 'Trend',
    color: '#10b981',
  },
} satisfies ChartConfig;

const redSparklineConfig = {
  trend: {
    label: 'Trend',
    color: '#f43f5e',
  },
} satisfies ChartConfig;

const sparklineUpData = [
  { val: 15 }, { val: 28 }, { val: 18 }, { val: 32 }, { val: 25 }, { val: 38 }, { val: 42 }
];

const sparklineDownData = [
  { val: 42 }, { val: 35 }, { val: 38 }, { val: 24 }, { val: 28 }, { val: 18 }, { val: 14 }
];

// Sparkline Component powered by Shadcn UI Chart Container & AreaChart
const ShadcnSparkline: React.FC<{
  config: ChartConfig;
  data: { val: number }[];
  color: string;
  gradientId: string;
}> = ({ config, data, color, gradientId }) => (
  <div className="w-20 h-9 flex items-center justify-end">
    <ChartContainer config={config} className="h-9 w-20">
      <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="val"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          fillOpacity={1}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  </div>
);

// Data Transaksi Mingguan untuk Chart Penjualan Kategori
const weeklySalesData = [
  { day: 'MON', sales: 4400, valDisplay: 'Rp 4.400.000' },
  { day: 'TUE', sales: 4550, valDisplay: 'Rp 4.550.000' },
  { day: 'WED', sales: 4520, valDisplay: 'Rp 4.520.000' },
  { day: 'THU', sales: 4680, valDisplay: 'Rp 4.680.000' },
  { day: 'FRI', sales: 4645.8, valDisplay: 'Rp 4.645.800', highlight: true },
  { day: 'SAT', sales: 4410, valDisplay: 'Rp 4.410.000' },
  { day: 'SUN', sales: 4520, valDisplay: 'Rp 4.520.000' },
];

// Data Pie/Donut Chart Sales by Category
const categoryPieData = [
  { category: 'sneakers', value: 34000, color: '#059669', label: 'Sneakers', count: '34,000' },
  { category: 'apparel', value: 25500, color: '#10b981', label: 'Apparel', count: '25,500' },
  { category: 'accessories', value: 25600, color: '#34d399', label: 'Accessories', count: '25,600' },
  { category: 'boots', value: 17000, color: '#6ee7b7', label: 'Boots', count: '17,000' },
];

const chartConfig = {
  sales: {
    label: 'Penjualan Kategori',
    color: '#059669',
  },
} satisfies ChartConfig;

const pieChartConfig = {
  sneakers: {
    label: 'Sneakers',
    color: '#059669',
  },
  apparel: {
    label: 'Apparel',
    color: '#10b981',
  },
  accessories: {
    label: 'Accessories',
    color: '#34d399',
  },
  boots: {
    label: 'Boots & Formal',
    color: '#6ee7b7',
  },
} satisfies ChartConfig;

// Top Products List Data
const topProductsData = [
  {
    id: 1,
    name: 'New Balance 550 Grey',
    sold: '142 sold',
    price: 'Rp 1.850.000',
    image: featureBasket,
  },
];

// Recent Orders List Data
const recentOrdersData = [
  {
    id: 1,
    product: 'New Balance 990v6 Grey',
    image: featureBasket,
    date: 'May 2, 2026',
    status: 'Received',
    price: 'Rp 3.850.000',
    customer: 'Alex Turner',
  },
];

export const Dashboard: React.FC = () => {
  const { loading, stats } = useAdminDashboard();
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'discounts'>('overview');

  if (loading) return <LoadingSpinner text="Memuat Pusat Komando Admin..." />;

  const auditLogs = [
    {
      time: '28/09 14:41:03',
      actor: 'fafa.ops (SuperAdmin)',
      action: 'UPDATE_PRICE_BATCH',
      target: 'SKU: STX-CBL-BRN-04',
      status: 'SUCCESS (200)',
      statusColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      time: '28/09 13:20:18',
      actor: 'dimas.curator (Inspector)',
      action: 'NFC_TAG_ISSUED',
      target: 'OID: SX-882109',
      status: 'SUCCESS (200)',
      statusColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      time: '28/09 11:05:44',
      actor: 'asia.gateway (System)',
      action: 'PAYMENT_WEBHOOK',
      target: 'VR: 02741300218',
      status: 'SETTLED',
      statusColor: 'bg-blue-100 text-blue-800',
    },
    {
      time: '28/09 09:12:30',
      actor: 'guest.attempt (Unknown)',
      action: 'FAILED_AUTH_CHALLENGE',
      target: 'IP: 180.229.181.4',
      status: 'BLOCKED (401)',
      statusColor: 'bg-red-100 text-red-800',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7f9] text-gray-900 py-6 px-4 sm:px-6 lg:px-8 font-body">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 1. GLOBAL TOP HEADER NAVBAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-xs">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tight text-gray-900">
              Dashboard Overview
            </h1>
            <p className="text-xs text-gray-400 font-label mt-0.5">
              Welcome back! Your streetwear store's performance view
            </p>
          </div>

          {/* Search Bar Input */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 md:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search users, orders, products..."
                className="w-full bg-gray-50 border border-gray-100 text-xs font-medium rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all text-gray-700 placeholder-gray-400"
              />
            </div>

            {/* Notification Bell Icon */}
            <button className="relative p-2.5 bg-gray-50 hover:bg-gray-100 rounded-full border border-gray-100 text-gray-600 transition-colors cursor-pointer">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
            </button>

            {/* Admin Profile User Badge */}
            <div className="flex items-center gap-3 pl-2 border-l border-gray-100">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-emerald-600/20">
                FA
              </div>
              <div className="hidden sm:block text-left">
                <h4 className="text-xs font-extrabold text-gray-900 leading-tight">Admin User</h4>
                <p className="text-[10px] text-gray-400 font-label">admin@company.com</p>
              </div>
            </div>
          </div>
        </div>

        {/* TAB CONTROL SECTION FOR OVERVIEW / MANAGEMENT */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'products'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
          >
            <Box className="w-4 h-4" />
            <span>Kelola Produk ({stats.totalProducts})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'orders'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
          >
            <ShoppingBasket className="w-4 h-4" />
            <span>Kelola Pesanan</span>
          </button>

          <button
            onClick={() => setActiveTab('discounts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'discounts'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
          >
            <Tag className="w-4 h-4" />
            <span>Voucher & Diskon</span>
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* 2. TOP EXECUTIVE 4 STAT CARDS ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

              {/* CARD 1: Total Revenue (Solid Emerald Highlighted Card) */}
              <div className="bg-emerald-600 text-white p-5 rounded-3xl shadow-lg shadow-emerald-600/25 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs font-bold text-white/90 font-label">Total Revenue</span>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors">
                      <ArrowUpRight className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black font-headline tracking-tight text-white mb-1">
                    Rp 842.650.000
                  </h3>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs font-semibold text-emerald-100 font-label flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-white" />
                    <span>↑ 18.2% this week</span>
                  </span>
                  <ShadcnSparkline config={whiteSparklineConfig} data={sparklineUpData} color="#ffffff" gradientId="gradWhite" />
                </div>
              </div>

              {/* CARD 2: Total Orders */}
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
                        <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <span className="text-xs font-bold text-gray-500 font-label">Total Orders</span>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                      <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black font-headline tracking-tight text-gray-900 mb-1">
                    3,842
                  </h3>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs font-bold text-emerald-600 font-label flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>↑ 12.5% this week</span>
                  </span>
                  <ShadcnSparkline config={greenSparklineConfig} data={sparklineUpData} color="#10b981" gradientId="gradGreen1" />
                </div>
              </div>

              {/* CARD 3: Total Product */}
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center">
                        <Package className="w-3.5 h-3.5 text-purple-600" />
                      </div>
                      <span className="text-xs font-bold text-gray-500 font-label">Total Product</span>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                      <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black font-headline tracking-tight text-gray-900 mb-1">
                    1,247
                  </h3>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs font-bold text-rose-500 font-label flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>↓ 2.3% this week</span>
                  </span>
                  <ShadcnSparkline config={redSparklineConfig} data={sparklineDownData} color="#f43f5e" gradientId="gradRed" />
                </div>
              </div>

              {/* CARD 4: Active Customers */}
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-rose-600" />
                      </div>
                      <span className="text-xs font-bold text-gray-500 font-label">Active Customers</span>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                      <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black font-headline tracking-tight text-gray-900 mb-1">
                    8,234
                  </h3>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs font-bold text-emerald-600 font-label flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>↑ 24.6% this week</span>
                  </span>
                  <ShadcnSparkline config={greenSparklineConfig} data={sparklineUpData} color="#10b981" gradientId="gradGreen2" />
                </div>
              </div>

            </div>

            {/* 3. MIDDLE SECTION (SALES BY CATEGORY AREA & DONUT CHART) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* LEFT CARD: Sales By Category Line/Area Chart */}
              <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-base font-extrabold font-headline text-gray-900">
                        Sales By Category
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl font-black font-headline text-gray-900">
                          Rp 18.200.820
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                          <span>8.24%</span>
                        </span>
                      </div>
                    </div>

                    <div className="relative">
                      <select className="appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl px-3.5 py-1.5 pr-8 cursor-pointer focus:outline-none transition-all">
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Chart Container */}
                  <div className="w-full h-60 pt-4 relative">
                    <ChartContainer config={chartConfig} className="h-56 w-full">
                      <AreaChart data={weeklySalesData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>

                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />

                        <XAxis
                          dataKey="day"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          className="text-[10px] font-label font-bold text-gray-400"
                        />

                        <YAxis
                          domain={[4300, 4800]}
                          width={60}
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(val) => `Rp ${val}`}
                          className="text-[10px] font-label font-bold text-gray-400"
                        />

                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              indicator="dot"
                              formatter={(value) => (
                                <span className="font-bold text-gray-900">Rp {value?.toLocaleString()}</span>
                              )}
                            />
                          }
                        />

                        <Area
                          type="monotone"
                          dataKey="sales"
                          stroke="#059669"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#emeraldGradient)"
                        />
                      </AreaChart>
                    </ChartContainer>

                    {/* Active Floating Pill Badge matching screenshot */}
                    <div className="absolute top-14 left-[58%] -translate-x-1/2 bg-emerald-600 text-white font-mono text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-lg shadow-emerald-600/30 flex items-center gap-1 border border-white/20">
                      <span>Rp 4.645.800</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT CARD: Sales By Category Donut Chart */}
              <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-extrabold font-headline text-gray-900">
                      Sales By Category
                    </h2>

                    <div className="relative">
                      <select className="appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl px-3.5 py-1.5 pr-8 cursor-pointer focus:outline-none transition-all">
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Donut Chart with Center Badge */}
                  <div className="relative w-full h-48 flex items-center justify-center">
                    <ChartContainer config={pieChartConfig} className="mx-auto aspect-square h-48 w-full">
                      <PieChart>
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent hideLabel indicator="dot" />}
                        />
                        <Pie
                          data={categoryPieData}
                          dataKey="value"
                          nameKey="category"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {categoryPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>

                    {/* Center Text inside Donut */}
                    <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-xl font-black font-headline text-gray-900 leading-none">
                        16,100
                      </span>
                      <span className="mt-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        + 45%
                      </span>
                    </div>
                  </div>

                  {/* Category Legend Badges */}
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-label">
                    {categoryPieData.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50/70 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-gray-600 font-bold text-[11px]">{cat.label}</span>
                        </div>
                        <span className="font-extrabold text-gray-900 text-[11px]">{cat.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-label">
                  <span className="text-gray-400 font-medium">Total Number of Sales</span>
                  <span className="font-black text-gray-900 text-sm">3,400,031</span>
                </div>
              </div>

            </div>

            {/* 4. BOTTOM SECTION (TOP PRODUCTS & RECENT ORDERS) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* LEFT CARD: Top Products */}
              <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-extrabold font-headline text-gray-900">
                      Top Products
                    </h2>

                    <div className="relative">
                      <select className="appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl px-3.5 py-1.5 pr-8 cursor-pointer focus:outline-none transition-all">
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {topProductsData.map((prod) => (
                      <div key={prod.id} className="p-3 bg-gray-50/80 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-gray-100/60 transition-colors">
                        <div className="flex items-center gap-3">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-11 h-11 rounded-xl object-cover border border-gray-200 shadow-xs"
                          />
                          <div>
                            <h4 className="text-xs font-extrabold text-gray-900 leading-tight">
                              {prod.name}
                            </h4>
                            <p className="text-[10px] text-gray-400 font-label mt-0.5">
                              {prod.sold}
                            </p>
                          </div>
                        </div>

                        <span className="text-xs font-black font-headline text-gray-900">
                          {prod.price}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button className="w-full mt-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl text-xs font-bold font-label transition-colors cursor-pointer border border-gray-200/80">
                  Lihat Semua Katalog Top Seller
                </button>
              </div>

              {/* RIGHT CARD: Recent Orders */}
              <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-extrabold font-headline text-gray-900">
                    Recent Order
                  </h2>

                  <button className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-bold transition-all cursor-pointer">
                    <Filter className="w-3.5 h-3.5 text-gray-500" />
                    <span>Filter</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="w-full text-left text-xs font-body border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 text-gray-400 font-label font-bold text-[11px] border-b border-gray-100">
                        <th className="py-3 px-3.5">#</th>
                        <th className="py-3 px-3.5">Product</th>
                        <th className="py-3 px-3.5">Date</th>
                        <th className="py-3 px-3.5">Status</th>
                        <th className="py-3 px-3.5">Price</th>
                        <th className="py-3 px-3.5">Customer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white text-xs">
                      {recentOrdersData.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3.5 px-3.5 font-bold text-gray-400">{order.id}</td>
                          <td className="py-3.5 px-3.5">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={order.image}
                                alt={order.product}
                                className="w-8 h-8 rounded-lg object-cover border border-gray-200"
                              />
                              <span className="font-extrabold text-gray-900">{order.product}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3.5 text-gray-500 font-label">{order.date}</td>
                          <td className="py-3.5 px-3.5">
                            <span className="px-3 py-1 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-3.5 font-black font-headline text-gray-900">
                            {order.price}
                          </td>
                          <td className="py-3.5 px-3.5 font-medium text-gray-700 font-label">
                            {order.customer}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* 5. AUDIT LOG ACCESS & VAULT SECURITY (SUPER ADMIN TRAIL) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-6">
              <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-sm font-extrabold font-headline text-gray-900">
                        Kredensial Super Admin
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-label bg-emerald-100 text-emerald-800">
                      ROOT LEVEL
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                          FA
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900">Faris Al-Kautsar</h4>
                          <p className="text-[10px] text-gray-400 font-mono">auth.ops@streetwear.id</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-gray-200 rounded-md text-[9px] font-bold text-gray-700">
                        Tier 1 Owner
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-label">
                  <span>Status Verifikasi: <strong className="text-emerald-600">98.4%</strong></span>
                  <span>v2.4.1</span>
                </div>
              </div>

              <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-extrabold font-headline text-gray-900">
                      Audit Log Akses & Keamanan Vault
                    </h3>
                  </div>
                  <span className="text-xs text-emerald-600 font-bold font-label cursor-pointer hover:underline">Unduh Log System</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="w-full text-left text-xs font-body border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 text-gray-400 font-label font-bold text-[10px] border-b border-gray-100">
                        <th className="py-2.5 px-3">TIMESTAMP</th>
                        <th className="py-2.5 px-3">AKTOR</th>
                        <th className="py-2.5 px-3">AKSI OPERASI</th>
                        <th className="py-2.5 px-3">TARGET</th>
                        <th className="py-2.5 px-3 text-center">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white font-mono text-[10px]">
                      {auditLogs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-2.5 px-3 text-gray-400">{log.time}</td>
                          <td className="py-2.5 px-3 font-bold text-gray-900">{log.actor}</td>
                          <td className="py-2.5 px-3 text-gray-700">{log.action}</td>
                          <td className="py-2.5 px-3 text-gray-500">{log.target}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] ${log.statusColor}`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </>
        )}

        {activeTab === 'products' && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
            <ManageProduct />
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
            <ManageOrders />
          </div>
        )}

        {activeTab === 'discounts' && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
            <ManageDiscount />
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
