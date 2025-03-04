import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}

export default function LoadingSpinner({ 
  size = 'medium', 
  color = 'text-blue-500',
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    medium: 'w-8 h-8 border-3',
    large: 'w-12 h-12 border-4'
  };
  
  const sizeClass = sizeClasses[size];
  
  return (
    <div className={`${className} flex justify-center items-center`}>
      <div className={`${sizeClass} ${color} border-t-transparent border-solid border-blue-500 rounded-full animate-spin`}></div>
    </div>
  );
} 