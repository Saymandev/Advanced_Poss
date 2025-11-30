# AI Integration Guide

This system now supports **real AI-powered recommendations** using OpenAI GPT, while maintaining a fallback to rule-based recommendations when AI is not configured.

## How It Works

### Current System (Rule-Based)
The system currently uses **statistical analysis and rule-based logic**:
- Calculates demand scores from sales data
- Applies predefined rules (if demand > 7 and price < avg, suggest increase)
- No external AI APIs required
- Works immediately without configuration

### With AI Integration (OpenAI)
When OpenAI API key is configured, the system uses **GPT-4/GPT-3.5** for:
- More intelligent pricing recommendations
- Context-aware reasoning
- Better prediction accuracy
- Personalized suggestions based on multiple factors

The system automatically:
- ✅ Uses AI when OpenAI is available
- ✅ Falls back to rule-based when AI is unavailable
- ✅ Hybrid approach: AI for complex cases, rules for simple ones

## Setup Instructions

### 1. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-...`)

### 2. Add to Environment Variables

Add to your `.env` file in the backend directory:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini  # Options: gpt-4o-mini, gpt-4-turbo-preview, gpt-3.5-turbo
```

**Recommended Models:**
- `gpt-4o-mini` - Best balance of cost and quality (recommended)
- `gpt-4-turbo-preview` - Higher quality, more expensive
- `gpt-3.5-turbo` - Cheaper but less accurate

### 3. Restart Backend Server

```bash
cd backend
npm run start:dev
```

You should see in the logs:
```
✅ OpenAI service initialized with model: gpt-4o-mini
```

Or if no API key:
```
⚠️ OpenAI API key not found. AI features will use rule-based recommendations.
```

## Features Enhanced by AI

### 1. Menu Optimization Suggestions
- **AI-Powered**: Analyzes sales trends, demand patterns, and market context
- **Better Reasoning**: Provides detailed explanations for recommendations
- **Higher Confidence**: More accurate predictions

### 2. Demand Predictions
- **Trend Analysis**: AI understands seasonal patterns
- **Factor Analysis**: Better understanding of time/day/event impacts
- **Smart Recommendations**: Context-aware suggestions

## Cost Considerations

### Pricing (as of 2024)
- **gpt-4o-mini**: ~$0.15 per 1M input tokens, $0.60 per 1M output tokens
- **gpt-4-turbo**: ~$10 per 1M input tokens, $30 per 1M output tokens
- **gpt-3.5-turbo**: ~$0.50 per 1M input tokens, $1.50 per 1M output tokens

### Estimated Costs
For a restaurant with 20 menu items:
- Each optimization request: ~2,000 tokens
- Cost per request (gpt-4o-mini): ~$0.001 (less than 1 cent)
- Monthly cost (100 requests/day): ~$3/month

### Cost Optimization Tips
1. Use `gpt-4o-mini` for best balance
2. Cache AI responses for similar items
3. Use batch processing for multiple items
4. Set up rate limiting to control costs

## Architecture

```
┌─────────────────────────────────────────┐
│         AI Service Layer                │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────┐                  │
│  │  OpenAIService   │                  │
│  │  (AI API Calls)  │                  │
│  └──────────────────┘                  │
│           │                             │
│           ▼                             │
│  ┌──────────────────┐                  │
│  │    AiService     │                  │
│  │  (Business Logic)│                  │
│  └──────────────────┘                  │
│           │                             │
│           ▼                             │
│  ┌──────────────────┐                  │
│  │ Rule-Based Logic │ (Fallback)       │
│  │  (No AI needed)  │                  │
│  └──────────────────┘                  │
└─────────────────────────────────────────┘
```

## Testing

### Test Without AI
The system works perfectly without OpenAI - it uses rule-based recommendations.

### Test With AI
1. Add OpenAI API key to `.env`
2. Restart backend
3. Check logs for "✅ OpenAI service initialized"
4. Visit `/dashboard/ai-menu-optimization`
5. Recommendations should show AI-powered reasoning

## Troubleshooting

### AI Not Working?
1. Check API key is correct in `.env`
2. Verify key has credits/quota
3. Check backend logs for errors
4. System will automatically use rule-based fallback

### High Costs?
1. Switch to `gpt-4o-mini` model
2. Reduce frequency of AI calls
3. Implement caching
4. Use rule-based for simple cases

## Future Enhancements

Possible improvements:
- [ ] Batch AI requests for multiple items
- [ ] Cache AI responses
- [ ] Support for other AI providers (Anthropic, Google AI)
- [ ] Fine-tuned models for restaurant data
- [ ] Cost tracking and limits

## Notes

- The system is **fully functional without AI** - OpenAI is optional
- AI enhances recommendations but doesn't break functionality
- All AI calls are async and won't block the system
- Errors in AI calls automatically fall back to rule-based logic

