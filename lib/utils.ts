import { format, subDays, subWeeks, subMonths } from 'date-fns';

// Format a date string
export function formatDate(date: Date | string, formatStr: string = 'MMM d, yyyy'): string {
  try {
    return format(new Date(date), formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

// Generate dates for the past n days/weeks/months
export function generateDateLabels(
  timeframe: 'day' | 'week' | 'month',
  count: number
): string[] {
  const today = new Date();
  const result: string[] = [];
  
  for (let i = count - 1; i >= 0; i--) {
    let date: Date;
    
    if (timeframe === 'day') {
      date = subDays(today, i);
      result.push(format(date, 'MMM d'));
    } else if (timeframe === 'week') {
      date = subWeeks(today, i);
      result.push(format(date, 'MMM d'));
    } else if (timeframe === 'month') {
      date = subMonths(today, i);
      result.push(format(date, 'MMM yyyy'));
    }
  }
  
  return result;
}

// Format a number with K/M/B suffix
export function formatNumber(num: number): string {
  if (num === null || num === undefined) return '0';
  
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  
  return num.toString();
}

// Calculate percentage change
export function percentChange(current: number, previous: number): number {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

// Generate a random integer between min and max (inclusive)
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate sample data for development purposes
export function generateSampleData(
  timeframe: 'day' | 'week' | 'month',
  count: number,
  min: number,
  max: number,
  trend: 'up' | 'down' | 'stable' = 'up'
): number[] {
  const result: number[] = [];
  let value = randomInt(min, min + (max - min) / 3);
  
  for (let i = 0; i < count; i++) {
    result.push(value);
    
    if (trend === 'up') {
      // Upward trend with some randomness
      value += randomInt(-Math.floor(max * 0.05), Math.floor(max * 0.1));
    } else if (trend === 'down') {
      // Downward trend with some randomness
      value -= randomInt(-Math.floor(max * 0.05), Math.floor(max * 0.1));
    } else {
      // Stable trend with some randomness
      value += randomInt(-Math.floor(max * 0.05), Math.floor(max * 0.05));
    }
    
    // Make sure we stay within bounds
    value = Math.max(min, Math.min(max, value));
  }
  
  return result;
} 