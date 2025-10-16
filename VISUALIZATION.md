# 📊 Data Visualization System

**Status:** ✅ Fully Implemented with Chart.js Integration
**Architecture:** Server-side chart generation + Client-side rendering
**Supported Charts:** Bar, Line, Pie, Scatter, Area, Doughnut

---

## 🎯 What This Solves

**Challenge:** How do you visualize database query results and data analysis in a user-friendly way?

**Solution:** Intelligent visualization system that:
- ✅ Automatically suggests optimal chart types based on data characteristics
- ✅ Creates charts from database query results with one API call
- ✅ Renders charts in chat interface using Chart.js
- ✅ Supports custom chart configurations for advanced use cases

---

## 🌐 Chart Types

### Bar Chart 📊
**Best For:** Comparing categories, showing distributions
**Example Use:** Sales by region, product comparisons, monthly revenue

```json
{
  "type": "bar",
  "data": {
    "labels": ["Jan", "Feb", "Mar", "Apr"],
    "datasets": [{
      "label": "Revenue",
      "data": [12500, 15800, 13200, 17900]
    }]
  }
}
```

### Line Chart 📈
**Best For:** Trends over time, time series data
**Example Use:** Stock prices, temperature changes, growth metrics

```json
{
  "type": "line",
  "data": {
    "labels": ["Week 1", "Week 2", "Week 3", "Week 4"],
    "datasets": [{
      "label": "Users",
      "data": [1200, 1850, 2100, 2450]
    }]
  }
}
```

### Pie Chart 🥧
**Best For:** Proportions, percentages, parts of a whole
**Example Use:** Market share, budget allocation, survey results

```json
{
  "type": "pie",
  "data": {
    "labels": ["Product A", "Product B", "Product C"],
    "datasets": [{
      "data": [30, 45, 25]
    }]
  }
}
```

### Scatter Chart ⚡
**Best For:** Correlations, relationships between variables
**Example Use:** Price vs sales, age vs income, performance metrics

```json
{
  "type": "scatter",
  "data": {
    "datasets": [{
      "label": "Sales vs Price",
      "data": [
        {"x": 10, "y": 120},
        {"x": 15, "y": 95},
        {"x": 20, "y": 75}
      ]
    }]
  }
}
```

### Area Chart 📉
**Best For:** Cumulative trends, volume over time
**Example Use:** Total revenue, accumulated downloads, traffic volume

### Doughnut Chart 🍩
**Best For:** Similar to pie but with center space for labels
**Example Use:** Resource usage, category breakdown

---

## 🚀 API Usage

### Create Chart from Database Query

**Endpoint:** `POST /visualization/from-query`

```javascript
// Execute database query
const queryResult = await fetch('http://localhost:3000/database/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    connectionId: 'db_123',
    query: 'SELECT city, COUNT(*) as customer_count FROM customers GROUP BY city'
  })
});

const queryData = await queryResult.json();

// Create visualization
const vizResult = await fetch('http://localhost:3000/visualization/from-query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    queryResults: queryData.rows,
    chartType: 'bar',
    xField: 'city',
    yField: 'customer_count',
    title: 'Customers by City'
  })
});

const chart = await vizResult.json();
// Returns: { success: true, chartId: 'chart_...', chartConfig: {...} }
```

### Create Custom Chart

**Endpoint:** `POST /visualization/create`

```javascript
const response = await fetch('http://localhost:3000/visualization/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'line',
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      {
        label: '2024 Revenue',
        data: [125000, 185000, 210000, 245000],
        borderColor: '#0000FF',
        backgroundColor: '#ADD8E6'
      }
    ],
    title: 'Quarterly Revenue 2024'
  })
});
```

### Get Chart Suggestions

**Endpoint:** `POST /visualization/suggest`

```javascript
const response = await fetch('http://localhost:3000/visualization/suggest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: [
      { date: '2024-01-01', sales: 1250 },
      { date: '2024-01-02', sales: 1890 },
      { date: '2024-01-03', sales: 2100 }
    ]
  })
});

const suggestion = await response.json();
// Returns:
// {
//   recommended: 'line',
//   reason: 'Data contains time/date fields, line chart shows trends over time',
//   alternatives: ['area', 'bar']
// }
```

### List All Charts

**Endpoint:** `GET /visualization/charts`

```javascript
const response = await fetch('http://localhost:3000/visualization/charts');
const data = await response.json();
// Returns: { charts: [ { id: 'chart_...', config: {...} } ] }
```

---

## 💬 Chat Interface Integration

Charts are automatically rendered in the chat interface when AI includes chart markup:

```markdown
Here's your sales data visualized:

```chart
{
  "type": "bar",
  "data": {
    "labels": ["Jan", "Feb", "Mar"],
    "datasets": [{
      "label": "Sales",
      "data": [12500, 15800, 13200]
    }]
  },
  "options": {
    "title": "Monthly Sales"
  }
}
```
```

The chat interface will detect this and render an interactive Chart.js visualization.

---

## 🤖 AI Tool Integration

### For AI Assistants

```javascript
{
  "name": "visualize_data",
  "description": "Create a chart/graph from data",
  "input_schema": {
    "type": "object",
    "properties": {
      "data": {
        "type": "array",
        "description": "Array of data points"
      },
      "chart_type": {
        "type": "string",
        "enum": ["bar", "line", "pie", "scatter", "area", "doughnut"]
      },
      "title": {
        "type": "string",
        "description": "Chart title"
      }
    }
  }
}
```

**Example AI Workflow:**

```
User: "Show me customer distribution by city"

AI:
1. Query database for customer counts by city
2. Call visualize_data tool with results
3. Render chart in chat
4. Explain insights from the visualization
```

---

## 🎨 Customization

### Color Themes

Default TDC CVI colors:
- Primary: `#0000FF` (TDC Blue)
- Dark: `#00008B` (TDC Dark Blue)
- Light: `#ADD8E6` (TDC Light Blue)

Custom colors:
```javascript
{
  datasets: [{
    backgroundColor: '#FF5733',
    borderColor: '#C70039',
    borderWidth: 2
  }]
}
```

### Chart Options

```javascript
{
  options: {
    title: 'My Chart Title',
    width: 800,
    height: 400,
    responsive: true,
    legend: true,
    scales: {
      y: {
        beginAtZero: true
      }
    },
    plugins: {
      tooltip: {
        enabled: true
      }
    }
  }
}
```

---

## 📊 Intelligent Chart Suggestions

The system analyzes your data and suggests the best chart type:

### Decision Logic

```typescript
// Time/Date Data → Line Chart
if (hasTimeData) {
  return {
    recommended: 'line',
    reason: 'Data contains time/date fields, line chart shows trends over time'
  };
}

// Categorical Data with Numbers → Bar Chart
if (hasCategorical && hasNumericValues) {
  return {
    recommended: 'bar',
    reason: 'Categorical data with numeric values, bar chart compares categories'
  };
}

// Small Dataset (<= 8 items) → Pie Chart
if (data.length <= 8 && hasNumericValues) {
  return {
    recommended: 'pie',
    reason: 'Small dataset with numeric values, pie chart shows proportions'
  };
}
```

---

## 💡 Real-World Examples

### Example 1: Sales Dashboard

```javascript
// Query sales data
const sales = await db.query('SELECT month, revenue FROM monthly_sales ORDER BY month');

// Visualize
const chart = await visualizationManager.createChartFromQuery(sales, 'line', {
  xField: 'month',
  yField: 'revenue',
  title: 'Monthly Revenue Trend'
});
```

**Result:** Beautiful line chart showing revenue trends

### Example 2: Customer Distribution

```javascript
// Query customer distribution
const customers = await db.query('SELECT city, COUNT(*) as count FROM customers GROUP BY city');

// Visualize with auto-suggestion
const suggestion = visualizationManager.suggestChartType(customers);
// Returns: 'bar' (best for categorical data)

const chart = await visualizationManager.createChartFromQuery(customers, suggestion.recommended, {
  xField: 'city',
  yField: 'count',
  title: 'Customers by City'
});
```

**Result:** Bar chart comparing customer counts across cities

### Example 3: Product Category Breakdown

```javascript
// Query product sales by category
const categories = await db.query('SELECT category, SUM(sales) as total FROM products GROUP BY category');

// Create pie chart for proportions
const chart = await visualizationManager.createChartFromQuery(categories, 'pie', {
  xField: 'category',
  yField: 'total',
  title: 'Sales by Product Category'
});
```

**Result:** Pie chart showing percentage of sales per category

---

## 🔧 Technical Implementation

### Server-Side Architecture

```
src/tools/visualization.ts
├── VisualizationManager
│   ├── createChartFromQuery()   # Auto-convert DB results
│   ├── createChart()             # Custom chart creation
│   ├── suggestChartType()        # Intelligent suggestions
│   └── getColors()               # TDC CVI color scheme
```

### Client-Side Rendering

```
dashboard/public/chat.html
├── Chart.js CDN                  # Chart library
├── renderChart()                 # Render chart in message
└── checkAndRenderCharts()        # Detect chart markup
```

---

## 🎓 Best Practices

### 1. Choose the Right Chart Type

- **Comparisons** → Bar Chart
- **Trends** → Line Chart
- **Proportions** → Pie/Doughnut Chart
- **Relationships** → Scatter Chart
- **Cumulative** → Area Chart

### 2. Use Intelligent Suggestions

```javascript
// Let the system choose
const suggestion = await visualizationManager.suggestChartType(data);
const chart = await visualizationManager.createChart({
  type: suggestion.recommended,
  data: processedData
});
```

### 3. Keep It Simple

- ✅ Clear labels and titles
- ✅ Appropriate colors (TDC CVI)
- ✅ Limited data points (< 20 for readability)
- ✅ Descriptive axis labels

### 4. Test with Real Data

```bash
# Use database tools to get real data
curl -X POST http://localhost:3000/database/query \
  -d '{"connectionId":"db_123", "query":"SELECT * FROM sales"}' \
  | jq '.rows' \
  | curl -X POST http://localhost:3000/visualization/from-query \
    -d @- \
    --header "Content-Type: application/json"
```

---

## 🔮 Future Enhancements

### Planned Features

- [ ] **Export Charts** - PNG, SVG, PDF export
- [ ] **Interactive Features** - Click to drill down, zoom, pan
- [ ] **Real-time Updates** - Live data streaming to charts
- [ ] **Advanced Chart Types** - Heatmaps, radar charts, candlestick
- [ ] **Chart Combinations** - Multi-axis, overlay charts
- [ ] **Annotations** - Add notes and markers to charts
- [ ] **Dashboard Builder** - Drag-and-drop chart arrangement
- [ ] **Sharing** - Share charts via URL or embed code

---

## 📝 Summary

**What We Built:**
📊 Complete data visualization system with intelligent chart suggestions

**Key Innovation:**
💡 Automatic chart type selection based on data characteristics

**Benefits:**
- ✅ 6 chart types covering all common use cases
- ✅ One-line database query → visualization
- ✅ Integrated with chat interface
- ✅ TDC CVI color scheme by default
- ✅ AI-powered chart suggestions

**Status:**
🚀 **Production-ready!** Running on http://localhost:3000/visualization

---

*Generated: October 16, 2025*
*Architecture: Server-side generation + Client-side Chart.js rendering*
*License: MIT*
