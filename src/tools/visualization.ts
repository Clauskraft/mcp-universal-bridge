/**
 * Visualization and Graphics Tool
 *
 * Creates charts, graphs, and visual representations of data
 * Integrates with database queries and AI responses
 */

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'doughnut';
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string;
      borderWidth?: number;
    }>;
  };
  options?: {
    title?: string;
    width?: number;
    height?: number;
    responsive?: boolean;
    legend?: boolean;
  };
}

export interface VisualizationResult {
  success: boolean;
  chartId: string;
  chartConfig: ChartConfig;
  timestamp: Date;
  error?: string;
}

/**
 * Visualization Manager
 */
class VisualizationManager {
  private charts: Map<string, ChartConfig> = new Map();

  /**
   * Create a chart from database query results
   */
  createChartFromQuery(queryResults: any[], chartType: ChartConfig['type'], options?: {
    xField: string;
    yField: string;
    groupField?: string;
    title?: string;
  }): VisualizationResult {
    const chartId = `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      if (!queryResults || queryResults.length === 0) {
        return {
          success: false,
          chartId,
          chartConfig: {} as ChartConfig,
          timestamp: new Date(),
          error: 'No data available for visualization',
        };
      }

      // Extract labels and data from query results
      const labels = queryResults.map(row => String(row[options?.xField || 'name'] || row.id || ''));
      const dataValues = queryResults.map(row => {
        const value = row[options?.yField || 'value'] || row.amount || 0;
        return typeof value === 'number' ? value : parseFloat(value) || 0;
      });

      const chartConfig: ChartConfig = {
        type: chartType,
        data: {
          labels,
          datasets: [{
            label: options?.title || 'Data',
            data: dataValues,
            backgroundColor: this.getColors(chartType, dataValues.length),
            borderColor: '#0000FF',
            borderWidth: 2,
          }],
        },
        options: {
          title: options?.title,
          width: 800,
          height: 400,
          responsive: true,
          legend: true,
        },
      };

      this.charts.set(chartId, chartConfig);

      console.log(`📊 Chart created: ${chartId} (${chartType})`);

      return {
        success: true,
        chartId,
        chartConfig,
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        success: false,
        chartId,
        chartConfig: {} as ChartConfig,
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Create a custom chart from provided data
   */
  createChart(config: ChartConfig): VisualizationResult {
    const chartId = `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Validate config
      if (!config.data || !config.data.labels || !config.data.datasets) {
        throw new Error('Invalid chart configuration: missing data, labels, or datasets');
      }

      // Set defaults
      const chartConfig: ChartConfig = {
        ...config,
        options: {
          width: 800,
          height: 400,
          responsive: true,
          legend: true,
          ...config.options,
        },
      };

      this.charts.set(chartId, chartConfig);

      console.log(`📊 Custom chart created: ${chartId} (${config.type})`);

      return {
        success: true,
        chartId,
        chartConfig,
        timestamp: new Date(),
      };
    } catch (error: any) {
      return {
        success: false,
        chartId,
        chartConfig: {} as ChartConfig,
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  /**
   * Get chart by ID
   */
  getChart(chartId: string): ChartConfig | undefined {
    return this.charts.get(chartId);
  }

  /**
   * List all charts
   */
  getAllCharts(): Array<{ id: string; config: ChartConfig }> {
    return Array.from(this.charts.entries()).map(([id, config]) => ({ id, config }));
  }

  /**
   * Delete a chart
   */
  deleteChart(chartId: string): boolean {
    return this.charts.delete(chartId);
  }

  /**
   * Generate colors for chart
   */
  private getColors(chartType: ChartConfig['type'], count: number): string | string[] {
    const colors = [
      '#0000FF', // TDC Blue
      '#00008B', // TDC Dark Blue
      '#ADD8E6', // TDC Light Blue
      '#4169E1', // Royal Blue
      '#1E90FF', // Dodger Blue
      '#6495ED', // Cornflower Blue
      '#87CEEB', // Sky Blue
      '#87CEFA', // Light Sky Blue
    ];

    if (chartType === 'pie' || chartType === 'doughnut') {
      // Return array of colors for pie charts
      return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
    } else {
      // Return single color for other chart types
      return colors[0];
    }
  }

  /**
   * Analyze data and suggest best chart type
   */
  suggestChartType(data: any[]): {
    recommended: ChartConfig['type'];
    reason: string;
    alternatives: ChartConfig['type'][];
  } {
    if (!data || data.length === 0) {
      return {
        recommended: 'bar',
        reason: 'No data available, defaulting to bar chart',
        alternatives: ['line', 'pie'],
      };
    }

    // Detect data characteristics
    const hasNumericValues = data.every(row => {
      const values = Object.values(row);
      return values.some(v => typeof v === 'number');
    });

    const hasTimeData = data.some(row => {
      const keys = Object.keys(row);
      return keys.some(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('time'));
    });

    const hasCategorical = data.length <= 10;

    // Suggest based on characteristics
    if (hasTimeData) {
      return {
        recommended: 'line',
        reason: 'Data contains time/date fields, line chart shows trends over time',
        alternatives: ['area', 'bar'],
      };
    } else if (hasCategorical && hasNumericValues) {
      return {
        recommended: 'bar',
        reason: 'Categorical data with numeric values, bar chart compares categories',
        alternatives: ['pie', 'doughnut'],
      };
    } else if (data.length <= 8 && hasNumericValues) {
      return {
        recommended: 'pie',
        reason: 'Small dataset with numeric values, pie chart shows proportions',
        alternatives: ['doughnut', 'bar'],
      };
    } else {
      return {
        recommended: 'bar',
        reason: 'General purpose visualization for this data',
        alternatives: ['line', 'scatter'],
      };
    }
  }
}

// Export singleton instance
export const visualizationManager = new VisualizationManager();

/**
 * Visualization tool definitions for AI
 */
export const visualizationTools = [
  {
    name: 'create_chart_from_query',
    description: 'Create a chart/graph from database query results. Automatically visualizes data in the specified chart type.',
    input_schema: {
      type: 'object',
      properties: {
        query_results: {
          type: 'array',
          description: 'Array of data rows from database query',
        },
        chart_type: {
          type: 'string',
          enum: ['bar', 'line', 'pie', 'scatter', 'area', 'doughnut'],
          description: 'Type of chart to create',
        },
        x_field: {
          type: 'string',
          description: 'Field name to use for X-axis (labels)',
        },
        y_field: {
          type: 'string',
          description: 'Field name to use for Y-axis (values)',
        },
        title: {
          type: 'string',
          description: 'Chart title',
        },
      },
      required: ['query_results', 'chart_type'],
    },
  },
  {
    name: 'create_custom_chart',
    description: 'Create a custom chart with full control over data and styling',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['bar', 'line', 'pie', 'scatter', 'area', 'doughnut'],
          description: 'Type of chart to create',
        },
        labels: {
          type: 'array',
          description: 'Array of labels for X-axis',
        },
        datasets: {
          type: 'array',
          description: 'Array of datasets with label and data',
        },
        title: {
          type: 'string',
          description: 'Chart title',
        },
      },
      required: ['type', 'labels', 'datasets'],
    },
  },
  {
    name: 'suggest_chart_type',
    description: 'Analyze data and get recommendation for best chart type',
    input_schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          description: 'Array of data rows to analyze',
        },
      },
      required: ['data'],
    },
  },
  {
    name: 'list_charts',
    description: 'List all created charts',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];
