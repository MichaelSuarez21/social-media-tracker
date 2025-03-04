import { format, subDays, subWeeks, subMonths } from 'date-fns';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import logger from './logger';

/**
 * Format a date into a specified string format
 * @param date The date to format (Date object or date string)
 * @param formatStr The date-fns format string to use
 * @returns The formatted date string, or empty string on error
 */
export function formatDate(date: Date | string, formatStr: string = 'MMM d, yyyy'): string {
  try {
    return format(new Date(date), formatStr);
  } catch (error: any) {
    logger.error('utils', `Error formatting date: ${error.message || String(error)}`);
    return '';
  }
}

/**
 * Generate date labels for a chart over a specific timeframe
 * @param timeframe The timeframe to generate labels for (day, week, or month)
 * @param count The number of time periods to generate
 * @returns Array of formatted date strings
 */
export function generateDateLabels(
  timeframe: 'day' | 'week' | 'month',
  count: number
): string[] {
  try {
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
  } catch (error: any) {
    logger.error('utils', `Error generating date labels: ${error.message || String(error)}`);
    return [];
  }
}

/**
 * Format a number with K/M/B suffix for better readability
 * @param num The number to format
 * @returns Formatted number string with appropriate suffix
 */
export function formatNumber(num: number): string {
  try {
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
  } catch (error: any) {
    logger.error('utils', `Error formatting number: ${error.message || String(error)}`);
    return '0';
  }
}

/**
 * Calculate percentage change between two values
 * @param current The current value
 * @param previous The previous value to compare against
 * @returns The percentage change (positive for increase, negative for decrease)
 */
export function percentChange(current: number, previous: number): number {
  try {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  } catch (error: any) {
    logger.error('utils', `Error calculating percentage: ${error.message || String(error)}`);
    return 0;
  }
}

/**
 * Generate a random integer between min and max (inclusive)
 * @param min The minimum value
 * @param max The maximum value
 * @returns A random integer
 */
export function randomInt(min: number, max: number): number {
  try {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  } catch (error: any) {
    logger.error('utils', `Error generating random int: ${error.message || String(error)}`);
    return min;
  }
}

/**
 * Generate sample data for development and testing purposes
 * @param timeframe The timeframe to generate data for
 * @param count The number of data points to generate
 * @param min The minimum value
 * @param max The maximum value
 * @param trend The trend direction (up, down, or stable)
 * @returns Array of numbers representing sample data
 */
export function generateSampleData(
  timeframe: 'day' | 'week' | 'month',
  count: number,
  min: number,
  max: number,
  trend: 'up' | 'down' | 'stable' = 'up'
): number[] {
  try {
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
  } catch (error: any) {
    logger.error('utils', `Error generating sample data: ${error.message || String(error)}`);
    return Array(count).fill(min);
  }
}

/**
 * Utility function to conditionally join class names together
 * Combines clsx and tailwind-merge for optimal class name handling
 * @param inputs Class names or conditional class objects
 * @returns Merged className string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
} 