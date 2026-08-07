const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

// Initialize Gemini SDK with API key if available
const apiKey = process.env.GEMINI_API_KEY || 'demo-key';
const genAI = new GoogleGenerativeAI(apiKey);

// Schema for Natural Language Expense Extraction
const expenseExtractionSchema = {
  type: SchemaType.OBJECT,
  properties: {
    description: { type: SchemaType.STRING, description: 'Short 1-4 word description of the expense' },
    amount: { type: SchemaType.NUMBER, description: 'Total numeric amount spent' },
    category: {
      type: SchemaType.STRING,
      description:
        'Must be one of: Food & Dining, Groceries, Milk & Daily Essentials, Electricity, Internet, Water, Gas, Rent, Maid & Cleaning, Transport, Household, Entertainment, Subscriptions, Repairs, Other',
    },
    mentionedMemberNames: {
      type: SchemaType.ARRAY,
      description: 'List of room member names explicitly mentioned as participants. If "everyone" or "all", leave empty array or include "all".',
      items: { type: SchemaType.STRING },
    },
  },
  required: ['description', 'amount', 'category', 'mentionedMemberNames'],
};

/**
 * Natural language expense parsing
 */
const extractExpenseData = async (naturalText, roomMembers) => {
  if (!process.env.GEMINI_API_KEY) {
    // Fallback parser if API key is not provided
    const match = naturalText.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i);
    const amount = match ? parseFloat(match[1]) : 0;
    return {
      description: naturalText.replace(/\d+/g, '').trim() || 'Shared Expense',
      amount,
      category: 'Other',
      participantIds: roomMembers.map((m) => m._id.toString()),
    };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: expenseExtractionSchema,
      },
    });

    const membersInfo = roomMembers.map((m) => `${m.name} (ID: ${m._id})`).join(', ');

    const prompt = `
      Extract shared expense details from this text: "${naturalText}".
      Room members available: [${membersInfo}].
      If the text implies everyone shared it (e.g. "for everyone", "for all of us", "bought milk"), return mentionedMemberNames as ["all"].
    `;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());

    // Business validation: match names to member IDs
    let participantIds = [];
    if (!parsed.mentionedMemberNames || parsed.mentionedMemberNames.includes('all') || parsed.mentionedMemberNames.length === 0) {
      participantIds = roomMembers.map((m) => m._id.toString());
    } else {
      participantIds = roomMembers
        .filter((m) =>
          parsed.mentionedMemberNames.some((name) => name.toLowerCase().includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(name.toLowerCase()))
        )
        .map((m) => m._id.toString());

      if (participantIds.length === 0) {
        participantIds = roomMembers.map((m) => m._id.toString());
      }
    }

    return {
      description: parsed.description || 'Shared Expense',
      amount: parsed.amount || 0,
      category: parsed.category || 'Other',
      participantIds,
    };
  } catch (error) {
    console.error('AI Expense Extraction Error:', error);
    // Graceful fallback
    const match = naturalText.match(/(\d+(?:\.\d+)?)/);
    const amount = match ? parseFloat(match[1]) : 0;
    return {
      description: naturalText.trim(),
      amount,
      category: 'Other',
      participantIds: roomMembers.map((m) => m._id.toString()),
    };
  }
};

/**
 * Receipt OCR text parsing
 */
const extractReceiptItems = async (rawReceiptText) => {
  if (!process.env.GEMINI_API_KEY) {
    return {
      storeName: 'Grocery Store',
      totalAmount: 250,
      items: [
        { name: 'Milk', price: 60 },
        { name: 'Bread', price: 40 },
        { name: 'Eggs', price: 150 },
      ],
    };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `
      Extract receipt line items from this raw text or OCR output:
      "${rawReceiptText}"
      Return JSON format: { "storeName": string, "totalAmount": number, "items": [{ "name": string, "price": number }] }
    `;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (error) {
    console.error('AI Receipt Error:', error);
    return { storeName: 'Store', totalAmount: 0, items: [] };
  }
};

/**
 * Fact-based "Ask SplitSense" natural language Q&A query engine
 */
const answerAskSplitSense = async (userQuestion, verifiedContextData) => {
  if (!process.env.GEMINI_API_KEY) {
    return `Based on your room data: ${JSON.stringify(verifiedContextData.summary || verifiedContextData)}.`;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
      You are Ask SplitSense, a friendly household financial assistant for flatmates.
      Answer the user's question accurately using ONLY the factual database records provided below.
      Do NOT invent or fabricate any numbers or debts.
      
      User Question: "${userQuestion}"

      Verified Household Database Context:
      ${JSON.stringify(verifiedContextData, null, 2)}
      
      Provide a concise, direct 2-3 sentence answer with clear bullet points if listing debts.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Ask SplitSense Error:', error);
    return 'Could not process question at this time. Please check your room dashboard.';
  }
};

/**
 * Generate monthly spending insights
 */
const generateFinancialInsights = async (monthlySummaryData) => {
  if (!process.env.GEMINI_API_KEY) {
    return 'Your household has tracked shared expenses effectively this month. Keep up the good momentum!';
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
      Here is the monthly household expenditure summary for a group of flatmates:
      ${JSON.stringify(monthlySummaryData)}

      Write a concise 2-sentence insight. Highlight the top expenditure category and offer a practical flatmate budgeting tip.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return 'Expenses tracked successfully for your room!';
  }
};

module.exports = {
  extractExpenseData,
  extractReceiptItems,
  answerAskSplitSense,
  generateFinancialInsights,
};
