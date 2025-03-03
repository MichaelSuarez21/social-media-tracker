'use client';

import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { formatDate } from '@/lib/utils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface MetricsChartProps {
  title: string;
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
    }[];
  };
  timeframe?: 'day' | 'week' | 'month';
  height?: number;
}

export default function MetricsChart({
  title,
  data,
  timeframe = 'week',
  height = 300,
}: MetricsChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);

  // Chart.js options
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#eee',
          font: {
            family: 'var(--font-geist-sans)',
          },
        },
      },
      title: {
        display: true,
        text: title,
        color: '#fff',
        font: {
          family: 'var(--font-geist-sans)',
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(26, 26, 34, 0.9)',
        titleColor: '#fff',
        bodyColor: '#eee',
        borderColor: 'rgba(65, 66, 78, 0.9)',
        borderWidth: 1,
        padding: 10,
        bodyFont: {
          family: 'var(--font-geist-sans)',
        },
        titleFont: {
          family: 'var(--font-geist-sans)',
          weight: 'bold',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#aaa',
          font: {
            family: 'var(--font-geist-sans)',
          },
        },
        grid: {
          color: 'rgba(65, 66, 78, 0.3)',
        },
      },
      y: {
        ticks: {
          color: '#aaa',
          font: {
            family: 'var(--font-geist-sans)',
          },
        },
        grid: {
          color: 'rgba(65, 66, 78, 0.3)',
        },
        beginAtZero: true,
      },
    },
    elements: {
      line: {
        tension: 0.3, // Smooth curves
      },
      point: {
        radius: 3,
        hoverRadius: 5,
      },
    },
  };

  return (
    <div style={{ height: `${height}px` }} className="w-full bg-dark-500 rounded-lg p-4 border border-dark-400">
      <Line ref={chartRef} options={options} data={data} />
    </div>
  );
} 