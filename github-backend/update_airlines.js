const fs = require('fs');
const path = require('path');

const SEED_FILE = path.join(__dirname, 'seed_list.json');
const OUTPUT_FILE = path.join(__dirname, 'airlines_data.json');

const TAVILY_KEY = process.env.TAVILY_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!TAVILY_KEY || !GEMINI_KEY) {
  console.error("❌ ERROR: TAVILY_API_KEY and GEMINI_API_KEY environment variables must be set.");
  process.exit(1);
}

// Простой sleep для предотвращения Rate Limits
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function searchWithTavily(query) {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query: query,
        search_depth: "basic",
        max_results: 3
      })
    });

    const data = await response.json();
    if (data.detail && data.detail.error) {
      throw new Error(`Tavily error: ${data.detail.error}`);
    }

    return data.results?.map(r => 
      `Source: ${r.url}\nTitle: ${r.title}\nContent: ${r.content}\n`
    ).join('\n---\n') || '';
  } catch (error) {
    console.error(`  [Tavily] Search failed for query "${query}":`, error.message);
    return '';
  }
}

async function analyzeWithGemini(searchContext, airline) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
  
  const prompt = `
    Analyze this search result and extract current check-in rules for airline: ${airline.name} (${airline.iataCode}).
    SEARCH CONTEXT:
    ${searchContext}
    
    CRITICAL ACCURACY INSTRUCTIONS:
    1. PRIORITIZE OFFICIAL DOMAINS: Highly prioritize search results originating directly from the airline's official website.
    2. USE TRUSTWORTHY FALLBACKS: If the official domain results are missing, use reputable third-party travel websites.
    3. VERIFY DISCREPANCIES: Direct official domain information is the absolute source of truth.
    4. BE EXACT: Extract the EXACT number of hours stated for STANDARD flights. For example, Air France is 30 hours, Lufthansa is 23 hours. Do NOT guess or assume 24/48 if the text explicitly says 30 or 23. If the text says "30 hours before", return 30.

    RETURN ONLY JSON:
    {
      "success": true,
      "hours": 30,
      "url": "https://..."
    }
    IMPORTANT: Return success as false ONLY if there is absolutely no reliable information.
  `;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini status: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    return JSON.parse(rawText.trim());
  } catch (error) {
    console.error(`  [Gemini] Analysis failed for ${airline.name}:`, error.message);
    return null;
  }
}

async function main() {
  console.log("✈️ Starting Airline Rules Central Update Service...");
  
  if (!fs.existsSync(SEED_FILE)) {
    console.error(`❌ ERROR: Seed file not found at ${SEED_FILE}`);
    process.exit(1);
  }

  const airlines = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
  console.log(`📋 Found ${airlines.length} airlines to scan.`);

  const results = [];
  const timestamp = new Date().toISOString();

  // Сканируем последовательно с задержкой 1.5с, чтобы не упираться в лимиты API
  for (let i = 0; i < airlines.length; i++) {
    const airline = airlines[i];
    console.log(`[${i + 1}/${airlines.length}] Processing ${airline.name} (${airline.iataCode})...`);

    const query = `when does online check-in open for ${airline.name} (${airline.iataCode}) hours before departure`;
    const searchContext = await searchWithTavily(query);

    if (!searchContext) {
      console.log(`  ⚠️ No search context found. Skipping.`);
      results.push({
        iataCode: airline.iataCode,
        success: false,
        reason: "No internet search results"
      });
      continue;
    }

    await sleep(1000); // Небольшая пауза между API

    const result = await analyzeWithGemini(searchContext, airline);

    if (result && result.success && result.hours) {
      console.log(`  ✅ Success: ${result.hours}h, URL: ${result.url || 'None'}`);
      results.push({
        iataCode: airline.iataCode,
        success: true,
        hours: Math.round(result.hours),
        url: result.url || null
      });
    } else {
      console.log(`  ❌ Failed to extract accurate data.`);
      results.push({
        iataCode: airline.iataCode,
        success: false,
        reason: "Failed to analyze rules"
      });
    }

    // Задержка перед следующей авиакомпанией (профилактика Rate Limit)
    await sleep(1500);
  }

  const outputData = {
    lastUpdated: timestamp,
    airlines: results
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2), 'utf8');
  console.log(`🎉 Successfully updated ${airlines.length} airlines. Data saved to ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error("❌ Fatal main execution error:", err);
  process.exit(1);
});
