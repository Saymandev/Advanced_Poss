import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class DeepSeekService {
  private readonly logger = new Logger(DeepSeekService.name);
  private deepseek: OpenAI | null = null;
  private isEnabled = false;
  private dynamicModel: string | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('deepseek.apiKey');
    const baseUrl = this.configService.get<string>('deepseek.baseUrl') || 'https://api.deepseek.com';

    if (apiKey) {
      try {
        this.deepseek = new OpenAI({
          apiKey: apiKey,
          baseURL: baseUrl,
        });
        this.isEnabled = true;
        this.logger.log(`✅ DeepSeek service initialized with baseURL: ${baseUrl}`);
      } catch (error) {
        this.logger.warn(`⚠️ Failed to initialize DeepSeek service: ${error.message}`);
        this.isEnabled = false;
      }
    } else {
      this.logger.warn('⚠️ DeepSeek API key not found. AI features will fallback to other providers.');
    }
  }

  updateConfig(config: { apiKey?: string; model?: string; baseUrl?: string }) {
    if (config.apiKey) {
      this.deepseek = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl || 'https://api.deepseek.com',
      });
      this.isEnabled = true;
      if (config.model) {
        this.dynamicModel = config.model;
      }
      this.logger.log(`✅ DeepSeek configuration updated dynamically`);
    }
  }

  isAvailable(): boolean {
    return this.isEnabled && this.deepseek !== null;
  }

  async generateMenuOptimizationRecommendation(context: {
    itemName: string;
    currentPrice: number;
    demandScore: number;
    popularityScore: number;
    profitMargin: number;
    totalQuantity: number;
    orderCount: number;
    daysSinceLastOrder: number;
    avgPrice: number;
    category?: string;
    salesData?: {
      last30Days: number;
      last90Days: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    };
  }): Promise<{
    recommendation: 'increase_price' | 'decrease_price' | 'maintain_price' | 'remove_item' | 'add_item';
    suggestedPrice: number;
    reasoning: string;
    confidence: number;
    expectedImpact: {
      revenue: number;
      profit: number;
      orders: number;
    };
  } | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const model = this.configService.get<string>('deepseek.model') || 'deepseek-chat';
      
      const prompt = `You are an expert restaurant menu pricing consultant. Analyze the following menu item data and provide a pricing recommendation.

Menu Item: ${context.itemName}
Category: ${context.category || 'N/A'}
Current Price: $${context.currentPrice.toFixed(2)}

Performance Metrics:
- Demand Score: ${context.demandScore.toFixed(1)}/10
- Popularity Score: ${context.popularityScore.toFixed(1)}/5
- Total Quantity Sold: ${context.totalQuantity}
- Order Count: ${context.orderCount}
- Days Since Last Order: ${context.daysSinceLastOrder === 999 ? 'Never' : context.daysSinceLastOrder}
- Average Price in Category: $${context.avgPrice.toFixed(2)}
- Profit Margin: ${context.profitMargin.toFixed(1)}%
${context.salesData ? `- Sales Trend (last 30 days): ${context.salesData.trend}` : ''}

Please provide a JSON response with the following structure:
{
  "recommendation": "increase_price" | "decrease_price" | "maintain_price" | "remove_item",
  "suggestedPrice": number,
  "reasoning": "Brief explanation",
  "confidence": number (0-1),
  "expectedImpact": {
    "revenue": number,
    "profit": number,
    "orders": number
  }
}

Guidelines:
- If demand is high (>7) and price is below average, consider increasing price
- If demand is low (<3) and price is above average, consider decreasing price
- If no sales for 60+ days, recommend removing the item
- Ensure profit margins remain healthy (>20% preferred)

Return ONLY valid JSON.`;

      const completion = await this.deepseek.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert restaurant menu pricing consultant. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) return null;

      const result = JSON.parse(responseContent);
      
      return {
        recommendation: result.recommendation || 'maintain_price',
        suggestedPrice: Math.max(0.01, parseFloat(result.suggestedPrice) || context.currentPrice),
        reasoning: result.reasoning || 'DeepSeek analysis completed.',
        confidence: Math.max(0, Math.min(1, parseFloat(result.confidence) || 0.6)),
        expectedImpact: {
          revenue: parseFloat(result.expectedImpact?.revenue) || 0,
          profit: parseFloat(result.expectedImpact?.profit) || 0,
          orders: parseFloat(result.expectedImpact?.orders) || 0,
        },
      };
    } catch (error) {
      this.logger.error(`Error calling DeepSeek API: ${error.message}`);
      return null;
    }
  }

  async generateDemandPrediction(context: {
    itemName: string;
    category?: string;
    historicalData: {
      last30Days: number;
      last90Days: number;
      averagePerDay: number;
      peakHours: number[];
      peakDays: number[];
      trend: 'increasing' | 'decreasing' | 'stable';
    };
  }): Promise<{
    predictedDemand: number;
    confidence: number;
    factors: {
      timeOfDay: number;
      dayOfWeek: number;
      season: number;
      events: number;
      trends: number;
    };
    recommendations: string[];
  } | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const model = this.configService.get<string>('deepseek.model') || 'deepseek-chat';

      const prompt = `You are an expert restaurant demand forecasting consultant. Predict the demand for the next 7 days for this menu item.

Menu Item: ${context.itemName}
Category: ${context.category || 'N/A'}

Historical Data (last 90 days):
- Last 30 days: ${context.historicalData.last30Days} orders
- Last 90 days: ${context.historicalData.last90Days} orders
- Average per day: ${context.historicalData.averagePerDay.toFixed(2)}
- Trend: ${context.historicalData.trend}

Please provide a JSON response with the following structure:
{
  "predictedDemand": number,
  "confidence": number (0-1),
  "factors": {
    "timeOfDay": number,
    "dayOfWeek": number,
    "season": number,
    "events": number,
    "trends": number
  },
  "recommendations": ["rec1", "rec2"]
}

Return ONLY valid JSON.`;

      const completion = await this.deepseek.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert restaurant demand forecasting consultant. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) return null;

      const result = JSON.parse(responseContent);
      
      return {
        predictedDemand: Math.max(0, parseInt(result.predictedDemand) || 0),
        confidence: Math.max(0, Math.min(1, parseFloat(result.confidence) || 0.5)),
        factors: {
          timeOfDay: Math.max(0, Math.min(1, parseFloat(result.factors?.timeOfDay) || 0.5)),
          dayOfWeek: Math.max(0, Math.min(1, parseFloat(result.factors?.dayOfWeek) || 0.5)),
          season: Math.max(0, Math.min(1, parseFloat(result.factors?.season) || 0.5)),
          events: Math.max(0, Math.min(1, parseFloat(result.factors?.events) || 0.5)),
          trends: Math.max(0, Math.min(1, parseFloat(result.factors?.trends) || 0.5)),
        },
        recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
      };
    } catch (error) {
      this.logger.error(`Error calling DeepSeek API for demand prediction: ${error.message}`);
      return null;
    }
  }

  async generateExecutiveSummary(salesData: any): Promise<{ summary: string; insights: string[]; recommendations: string[] } | null> {
    if (!this.isEnabled || (!this.deepseek)) return null;
    
    try {
      const prompt = `
You are an expert restaurant/retail business consultant. Analyze the following sales data and provide a concise executive summary, 3 key insights, and 3 actionable recommendations.
Data: ${JSON.stringify(salesData)}

Respond strictly in JSON format matching this structure:
{
  "summary": "A 2-3 sentence overview of business performance",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}
`;

      const aiClient = this.deepseek;
      const model = this.configService.get('deepseek.model') || 'deepseek-chat';

      const response = await aiClient.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`Error generating executive summary: ${error.message}`);
      return null;
    }
  }

  async predictSalesTrend(historicalData: any): Promise<{ trend: string; predictedGrowth: number; anomalies: string[] } | null> {
    if (!this.isEnabled || (!this.deepseek)) return null;

    try {
      const prompt = `
You are a data scientist analyzing sales time-series data for a retail/restaurant business.
Historical Data (Daily Revenue): ${JSON.stringify(historicalData)}

Analyze the seasonality and predict the short-term trend.
Respond strictly in JSON format matching this structure:
{
  "trend": "upward|downward|stable",
  "predictedGrowth": <number representing percentage, e.g. 5.5 for 5.5% growth>,
  "anomalies": ["anomaly 1", "anomaly 2"]
}
`;

      const aiClient = this.deepseek;
      const model = this.configService.get('deepseek.model') || 'deepseek-chat';

      const response = await aiClient.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`Error predicting sales trend: ${error.message}`);
      return null;
    }
  }

  async generateShiftAnalysis(workPeriodData: any, salesSummary: any): Promise<{
    executiveSummary: string;
    discrepancyAlerts: string[];
    actionableInsights: string[];
  } | null> {
    if (!this.isEnabled || !this.deepseek) return null;

    try {
      const prompt = `
You are an expert restaurant/retail business consultant and auditor. Analyze the following Work Period (Shift) data and Sales Summary.

Work Period Details:
${JSON.stringify({
  startTime: workPeriodData.startTime,
  endTime: workPeriodData.endTime,
  duration: workPeriodData.duration,
  openingBalance: workPeriodData.openingBalance,
  closingBalance: workPeriodData.closingBalance,
  status: workPeriodData.status,
})}

Sales Summary:
${JSON.stringify({
  totalOrders: salesSummary.totalOrders,
  grossSales: salesSummary.grossSales,
  refundTotal: salesSummary.refundTotal,
  netSales: salesSummary.netSales,
  voidCount: salesSummary.voidCount,
  cancelCount: salesSummary.cancelCount,
  paymentMethods: salesSummary.paymentMethods,
})}

Please provide an analysis of this shift. Focus on performance, any cash or payment anomalies (e.g. comparing opening balance and cash sales to actual closing balance), and actionable recommendations.

Respond strictly in JSON format matching this structure:
{
  "executiveSummary": "A concise 2-3 sentence overview of the shift's performance and operations.",
  "discrepancyAlerts": ["Alert 1 (e.g. cash variance)", "Alert 2 (e.g. high voids)"],
  "actionableInsights": ["Insight 1 (e.g. staffing suggestion)", "Insight 2 (e.g. peak time management)"]
}
`;

      const model = this.dynamicModel || this.configService.get('deepseek.model') || 'deepseek-chat';

      const response = await this.deepseek.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: 'You are an expert restaurant shift auditor and consultant. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
        max_tokens: 600,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return null;
      
      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`Error generating shift analysis: ${error.message}`);
      return null;
    }
  }
}
