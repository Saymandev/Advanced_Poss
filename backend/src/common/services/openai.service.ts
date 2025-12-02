import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private openai: OpenAI | null = null;
  private isEnabled = false;

  private getValidModel(configuredModel: string): string {
    // List of valid OpenAI models
    const validModels = [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-4-0125-preview',
      'gpt-4-1106-preview',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
    ];

    // Check if configured model is valid
    if (validModels.includes(configuredModel)) {
      return configuredModel;
    }

    // Handle common invalid model names
    const modelMap: Record<string, string> = {
      'gpt-4': 'gpt-4o-mini', // gpt-4 doesn't exist, use gpt-4o-mini
      'gpt4': 'gpt-4o-mini',
      'gpt4-turbo': 'gpt-4-turbo',
    };

    if (modelMap[configuredModel.toLowerCase()]) {
      const fallbackModel = modelMap[configuredModel.toLowerCase()];
      this.logger.warn(
        `⚠️ Invalid OpenAI model "${configuredModel}" configured. Falling back to "${fallbackModel}". ` +
        `Valid models: ${validModels.join(', ')}`
      );
      return fallbackModel;
    }

    // Default fallback
    this.logger.warn(
      `⚠️ Unknown OpenAI model "${configuredModel}". Using default "gpt-4o-mini". ` +
      `Valid models: ${validModels.join(', ')}`
    );
    return 'gpt-4o-mini';
  }

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('openai.apiKey');
    const configuredModel = this.configService.get<string>('openai.model') || 'gpt-4o-mini';
    const model = this.getValidModel(configuredModel);

    if (apiKey) {
      try {
        this.openai = new OpenAI({
          apiKey: apiKey,
        });
        this.isEnabled = true;
        this.logger.log(`✅ OpenAI service initialized with model: ${model}`);
        if (configuredModel !== model) {
          this.logger.warn(`⚠️ Model corrected from "${configuredModel}" to "${model}"`);
        }
      } catch (error) {
        this.logger.warn(`⚠️ Failed to initialize OpenAI service: ${error.message}`);
        this.isEnabled = false;
      }
    } else {
      this.logger.warn('⚠️ OpenAI API key not found. AI features will use rule-based recommendations.');
    }
  }

  /**
   * Check if OpenAI is enabled and available
   */
  isAvailable(): boolean {
    return this.isEnabled && this.openai !== null;
  }

  /**
   * Generate AI-powered menu optimization recommendations
   */
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
      const configuredModel = this.configService.get<string>('openai.model') || 'gpt-4o-mini';
      const model = this.getValidModel(configuredModel);
      
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
  "suggestedPrice": number (must be a valid price),
  "reasoning": "Brief explanation (1-2 sentences) of your recommendation based on the data",
  "confidence": number (0-1, where 1 is highest confidence),
  "expectedImpact": {
    "revenue": number (estimated monthly revenue change in $),
    "profit": number (estimated monthly profit change in $),
    "orders": number (estimated change in orders per month)
  }
}

Guidelines:
- If demand is high (>7) and price is below average, consider increasing price
- If demand is low (<3) and price is above average, consider decreasing price
- If no sales for 60+ days, recommend removing the item
- If item is new (never sold), suggest promotional pricing (10-15% discount)
- Ensure profit margins remain healthy (>20% preferred)
- Be realistic with expected impact numbers

Return ONLY valid JSON, no additional text.`;

      const completion = await this.openai.chat.completions.create({
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
      if (!responseContent) {
        this.logger.warn('OpenAI returned empty response');
        return null;
      }

      const result = JSON.parse(responseContent);
      
      // Validate and normalize the response
      return {
        recommendation: result.recommendation || 'maintain_price',
        suggestedPrice: Math.max(0.01, parseFloat(result.suggestedPrice) || context.currentPrice),
        reasoning: result.reasoning || 'AI analysis completed.',
        confidence: Math.max(0, Math.min(1, parseFloat(result.confidence) || 0.6)),
        expectedImpact: {
          revenue: parseFloat(result.expectedImpact?.revenue) || 0,
          profit: parseFloat(result.expectedImpact?.profit) || 0,
          orders: parseFloat(result.expectedImpact?.orders) || 0,
        },
      };
    } catch (error) {
      this.logger.error(`Error calling OpenAI API: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Generate AI-powered demand predictions
   */
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
      const configuredModel = this.configService.get<string>('openai.model') || 'gpt-4o-mini';
      const model = this.getValidModel(configuredModel);

      const prompt = `You are an expert restaurant demand forecasting consultant. Predict the demand for the next 7 days for this menu item.

Menu Item: ${context.itemName}
Category: ${context.category || 'N/A'}

Historical Data (last 90 days):
- Last 30 days: ${context.historicalData.last30Days} orders
- Last 90 days: ${context.historicalData.last90Days} orders
- Average per day: ${context.historicalData.averagePerDay.toFixed(2)}
- Peak hours: ${context.historicalData.peakHours.join(', ')}
- Peak days: ${context.historicalData.peakDays.join(', ')}
- Trend: ${context.historicalData.trend}

Please provide a JSON response with the following structure:
{
  "predictedDemand": number (predicted orders for next 7 days),
  "confidence": number (0-1, confidence in the prediction),
  "factors": {
    "timeOfDay": number (0-1, impact of time of day),
    "dayOfWeek": number (0-1, impact of day of week),
    "season": number (0-1, seasonal factors),
    "events": number (0-1, special events impact),
    "trends": number (0-1, overall trend impact)
  },
  "recommendations": ["recommendation1", "recommendation2", ...]
}

Return ONLY valid JSON, no additional text.`;

      const completion = await this.openai.chat.completions.create({
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
      if (!responseContent) {
        return null;
      }

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
        recommendations: Array.isArray(result.recommendations) 
          ? result.recommendations 
          : ['Monitor demand patterns for optimization opportunities'],
      };
    } catch (error) {
      this.logger.error(`Error calling OpenAI API for demand prediction: ${error.message}`, error.stack);
      return null;
    }
  }
}

