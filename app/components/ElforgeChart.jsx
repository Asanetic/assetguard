'use client';

import {
  LineChart, BarChart, AreaChart, PieChart,
  Line, Bar, Area, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell , Legend
} from 'recharts';
import { toNum } from '../MosyUtils/hiveUtils';

export default function ElforgeChart({
  chartType = 'line',             // 'line' | 'bar' | 'area' | 'pie' | 'doughnut'
  data = [],
  dataKey = 'name',               // x-axis key or label
  valueKey = 'value',             // for pie/doughnut
  series = [],                    // for line/bar/area: [{ key, color, name }]
  colors = [],                    // for pie/doughnut
  height = 300,
}) {

  const brightColors = [
    '#FF6B6B', // vibrant red
    '#FFD93D', // sunny yellow
    '#6BCB77', // lime green
    '#4D96FF', // vivid blue
    '#FF922B', // orange
    '#845EC2', // purple
    '#00C9A7', // teal
    '#FFC75F', // golden
    '#F9F871', // bright lemon
    '#FF5E78', // strawberry
    '#3ABEFF', // sky blue
    '#B967FF', // lavender pop
    '#FF7B54', // coral
    '#4ECDC4', // mint
    '#C34A36', // burnt orange
  ];

   const defaultColors = brightColors
   const renderLegendText = (value) => {

    const safeValue = String(value || '');
  
    const maxLength = 7;
  
    const isTrimmed = safeValue.length > maxLength;
  
    const displayText = isTrimmed
      ? safeValue.slice(0, maxLength) + '…'
      : safeValue;
  
    return (
      <span title={safeValue}>
        {displayText}
      </span>
    );
  
  };
  
  
  if (chartType === 'pie' || chartType === 'doughnut') {
    return (
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <PieChart>
          <Tooltip
            formatter={(value) => toNum(value)}
            labelFormatter={(name) => `${name}`}
          />
          <Pie
              data={data}
              dataKey={valueKey}
              nameKey={dataKey}
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={chartType === 'doughnut' ? 60 : 0}
              paddingAngle={5}
              label={({value }) => `${toNum(value)}`}
              >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={(colors && colors[index]) || defaultColors[index % defaultColors.length]}
                />
              ))}
            </Pie>
            <Legend
            layout="vertical"
            verticalAlign="middle"
            align="right"
            iconType="circle"
            formatter={renderLegendText}            
          />
      </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const ChartComponent = {
    line: LineChart,
    bar: BarChart,
    area: AreaChart,
  }[chartType];

  const RenderElement = {
    line: (key, color, name) => (
      <Line type="monotone" dataKey={key} stroke={color} name={name || key} key={key} />
    ),
    bar: (key, color, name) => (
      <Bar dataKey={key} fill={color} name={name || key} key={key} barSize={40}  barCategoryGap="15%" />
    ),
    area: (key, color, name) => (
      <Area type="monotone" dataKey={key} stroke={color} fill={color} name={name || key} key={key} />
    ),
  }[chartType];

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ChartComponent data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={dataKey} />
          <YAxis tickFormatter={(value) => toNum(value)} />
          <Tooltip
            formatter={(value) => toNum(value)}
            labelFormatter={(name) => `${name}`}
          />

          {series.map(({ key, color, name }) => RenderElement(key, color, name))}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}
