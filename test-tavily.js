require('dotenv').config();
const fetch = require('node-fetch');

async function test() {
  const query = "Air France official website online check-in opens hours before departure";
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.EXPO_PUBLIC_TAVILY_API_KEY,
      query: query,
      search_depth: "basic",
      max_results: 3
    })
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
