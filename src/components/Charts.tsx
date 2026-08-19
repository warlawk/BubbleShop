/**
 * Chart components for business analytics and day-end summaries
 * Uses Chart.js to display profit trends, sales data, and business metrics
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartData,
  type ChartOptions
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useMemo } from 'react';
import { fmt } from '../game/data';
import type { GameState } from '../game/types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Profit over time chart showing daily profit/loss trend
 * @param history - Array of daily profit values
 * @param days - Number of days to display
 */
export interface ProfitChartProps {
  history: number[];
  days?: number;
  height?: number;
}

export function ProfitChart({ history, days = 7, height = 200 }: ProfitChartProps) {
  const data = useMemo<ChartData<'line'>>(() => {
    const recentHistory = history.slice(-days);
    const labels = recentHistory.map((_, i) => `Day ${history.length - days + i + 1}`);

    return {
      labels,
      datasets: [
        {
          label: 'Daily Profit',
          data: recentHistory,
          borderColor: '#2eb84c',
          backgroundColor: 'rgba(46, 184, 76, 0.2)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#2eb84c',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  }, [history, days]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Profit Trend',
        font: {
          family: 'Display',
          size: 16,
          weight: 'bold'
        },
        color: '#1b2a5e'
      },
      tooltip: {
        backgroundColor: 'rgba(27, 42, 94, 0.95)',
        titleFont: { family: 'Display', size: 14, weight: 'bold' },
        bodyFont: { family: 'Sans', size: 13 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => `${context.parsed.y >= 0 ? '+' : ''}${fmt(context.parsed.y)}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(27, 42, 94, 0.1)'
        },
        ticks: {
          callback: (value) => `$${value}`,
          font: { family: 'Sans', size: 11 },
          color: '#1b2a5e'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: { family: 'Sans', size: 11 },
          color: '#1b2a5e'
        }
      }
    }
  };

  return (
    <div style={{ height: `${height}px`, position: 'relative' }}>
      <Line data={data} options={options} />
    </div>
  );
}

/**
 * Revenue vs Expenses comparison chart
 * @param revenue - Array of daily revenue values
 * @param expenses - Array of daily expense values
 * @param days - Number of days to display
 */
export interface RevenueExpensesChartProps {
  revenue: number[];
  expenses: number[];
  days?: number;
  height?: number;
}

export function RevenueExpensesChart({
  revenue,
  expenses,
  days = 7,
  height = 200
}: RevenueExpensesChartProps) {
  const data = useMemo<ChartData<'bar'>>(() => {
    const recentRevenue = revenue.slice(-days);
    const recentExpenses = expenses.slice(-days);
    const labels = recentRevenue.map((_, i) => `Day ${revenue.length - days + i + 1}`);

    return {
      labels,
      datasets: [
        {
          label: 'Revenue',
          data: recentRevenue,
          backgroundColor: '#2eb84c',
          borderColor: '#1b2a5e',
          borderWidth: 2,
          borderRadius: 6,
          barPercentage: 0.7
        },
        {
          label: 'Expenses',
          data: recentExpenses,
          backgroundColor: '#e63946',
          borderColor: '#1b2a5e',
          borderWidth: 2,
          borderRadius: 6,
          barPercentage: 0.7
        }
      ]
    };
  }, [revenue, expenses, days]);

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { family: 'Display', size: 13, weight: 'bold' },
          color: '#1b2a5e',
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      title: {
        display: true,
        text: 'Revenue vs Expenses',
        font: {
          family: 'Display',
          size: 16,
          weight: 'bold'
        },
        color: '#1b2a5e'
      },
      tooltip: {
        backgroundColor: 'rgba(27, 42, 94, 0.95)',
        titleFont: { family: 'Display', size: 14, weight: 'bold' },
        bodyFont: { family: 'Sans', size: 13 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => `${context.dataset.label}: ${fmt(context.parsed.y)}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(27, 42, 94, 0.1)'
        },
        ticks: {
          callback: (value) => `$${value}`,
          font: { family: 'Sans', size: 11 },
          color: '#1b2a5e'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: { family: 'Sans', size: 11 },
          color: '#1b2a5e'
        }
      }
    }
  };

  return (
    <div style={{ height: `${height}px`, position: 'relative' }}>
      <Bar data={data} options={options} />
    </div>
  );
}

/**
 * Sales breakdown by product category
 * @param salesData - Object mapping product names to sales amounts
 * @param height - Chart height in pixels
 */
export interface SalesBreakdownChartProps {
  salesData: Record<string, number>;
  height?: number;
}

export function SalesBreakdownChart({ salesData, height = 250 }: SalesBreakdownChartProps) {
  const colors = [
    '#e63946',
    '#f1faee',
    '#a8dadc',
    '#457b9d',
    '#1d3557',
    '#ffb703',
    '#fb8500',
    '#2ec4b6',
    '#cbf3f0',
    '#ffbf69'
  ];

  const data = useMemo<ChartData<'doughnut'>>(() => {
    const entries = Object.entries(salesData).filter(([_, value]) => value > 0);
    const labels = entries.map(([key]) => key);
    const values = entries.map(([_, value]) => value);

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors.slice(0, entries.length),
          borderColor: '#1b2a5e',
          borderWidth: 2
        }
      ]
    };
  }, [salesData]);

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: { family: 'Display', size: 12, weight: 'bold' },
          color: '#1b2a5e',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15
        }
      },
      title: {
        display: true,
        text: 'Sales by Product',
        font: {
          family: 'Display',
          size: 16,
          weight: 'bold'
        },
        color: '#1b2a5e'
      },
      tooltip: {
        backgroundColor: 'rgba(27, 42, 94, 0.95)',
        titleFont: { family: 'Display', size: 14, weight: 'bold' },
        bodyFont: { family: 'Sans', size: 13 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => `${context.label}: ${fmt(context.parsed as number)} (${((context.parsed as number) / Object.values(salesData).reduce((a, b) => a + b, 0) * 100).toFixed(1)}%)`
        }
      }
    }
  };

  return (
    <div style={{ height: `${height}px`, position: 'relative' }}>
      <Doughnut data={data} options={options} />
    </div>
  );
}

/**
 * Cumulative profit chart showing total earnings over time
 * @param history - Array of daily profit values
 * @param height - Chart height in pixels
 */
export interface CumulativeProfitChartProps {
  history: number[];
  height?: number;
}

export function CumulativeProfitChart({ history, height = 200 }: CumulativeProfitChartProps) {
  const cumulative = useMemo(() => {
    let sum = 0;
    return history.map((value) => {
      sum += value;
      return sum;
    });
  }, [history]);

  const data = useMemo<ChartData<'line'>>(() => {
    const labels = history.map((_, i) => `Day ${i + 1}`);

    return {
      labels,
      datasets: [
        {
          label: 'Cumulative Profit',
          data: cumulative,
          borderColor: '#457b9d',
          backgroundColor: 'rgba(69, 123, 157, 0.15)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#457b9d',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5
        }
      ]
    };
  }, [cumulative, history]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Total Earnings Over Time',
        font: {
          family: 'Display',
          size: 16,
          weight: 'bold'
        },
        color: '#1b2a5e'
      },
      tooltip: {
        backgroundColor: 'rgba(27, 42, 94, 0.95)',
        titleFont: { family: 'Display', size: 14, weight: 'bold' },
        bodyFont: { family: 'Sans', size: 13 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => `Total: ${fmt(context.parsed.y)}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(27, 42, 94, 0.1)'
        },
        ticks: {
          callback: (value) => `$${value}`,
          font: { family: 'Sans', size: 11 },
          color: '#1b2a5e'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: { family: 'Sans', size: 10 },
          color: '#1b2a5e',
          maxRotation: 45,
          autoSkip: true,
          maxTicksLimit: 10
        }
      }
    }
  };

  return (
    <div style={{ height: `${height}px`, position: 'relative' }}>
      <Line data={data} options={options} />
    </div>
  );
}

/**
 * Day summary stats card with mini chart
 * @param s - Current game state
 * @param todayProfit - Profit for the current day
 * @param weekAverage - Average profit over the last 7 days
 */
export interface DaySummaryStatsProps {
  s: GameState;
  todayProfit: number;
  weekAverage: number;
}

export function DaySummaryStats({ s, todayProfit, weekAverage }: DaySummaryStatsProps) {
  const profitTrend = todayProfit - weekAverage;
  const isPositive = profitTrend >= 0;

  return (
    <div className="bg-white rounded-xl border-2 border-[#1b2a5e] p-4 shadow-lg">
      <h4 className="font-display text-lg font-bold text-[#1b2a5e] mb-3">Today's Performance</h4>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-xs font-bold text-gray-500 uppercase">Today's Profit</p>
          <p className={`text-2xl font-display font-black ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{fmt(todayProfit)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-gray-500 uppercase">vs 7-Day Avg</p>
          <p className={`text-2xl font-display font-black ${profitTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {profitTrend >= 0 ? '+' : ''}{fmt(profitTrend)}
          </p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs font-bold text-gray-500">Cash on Hand: <span className="text-[#1b2a5e]">{fmt(s.cash)}</span></p>
        <p className="text-xs font-bold text-gray-500">Days Played: <span className="text-[#1b2a5e]">{s.day}</span></p>
      </div>
    </div>
  );
}
