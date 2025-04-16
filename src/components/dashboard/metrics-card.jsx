// src/components/dashboard/metrics-card.jsx
import { ArrowUp, ArrowDown } from "lucide-react";

export default function MetricsCard({ title, value, icon, change, timeframe }) {
  // Determine if change is positive or negative
  const isPositive = change > 0;
  const isNegative = change < 0;
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          
          {change && (
            <div className="mt-2 flex items-center">
              {isPositive && (
                <div className="flex items-center text-green-600">
                  <ArrowUp className="h-4 w-4 mr-1" />
                  <span>{Math.abs(change)}%</span>
                </div>
              )}
              
              {isNegative && (
                <div className="flex items-center text-red-600">
                  <ArrowDown className="h-4 w-4 mr-1" />
                  <span>{Math.abs(change)}%</span>
                </div>
              )}
              
              {change === 0 && (
                <span className="text-gray-500">No change</span>
              )}
              
              {timeframe && (
                <span className="text-gray-500 text-sm ml-1">
                  vs {timeframe}
                </span>
              )}
            </div>
          )}
        </div>
        
        {icon && (
          <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            {typeof icon === 'string' ? (
              <span className="text-2xl">{icon}</span>
            ) : (
              icon
            )}
          </div>
        )}
      </div>
    </div>
  );
}