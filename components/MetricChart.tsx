import React from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';
import { MetricPoint } from '../types';

interface Props {
  data: MetricPoint[];
  color: string;
  height?: number;
}

const MetricChart: React.FC<Props> = ({ data, color, height = 40 }) => {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <YAxis domain={[0, 100]} hide />
          <defs>
            <linearGradient id={`splitColor${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={`url(#splitColor${color})`}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MetricChart;