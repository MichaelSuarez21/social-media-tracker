import React, { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}

export default function PageHeader({ title, description, icon, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
      <div className="flex items-start">
        {icon && (
          <div className="mr-3 text-2xl mt-1">{icon}</div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && (
            <p className="text-gray-400 mt-1">{description}</p>
          )}
        </div>
      </div>
      
      {actions && (
        <div className="md:ml-auto">
          {actions}
        </div>
      )}
    </div>
  );
} 