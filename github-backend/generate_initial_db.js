const fs = require('fs');
const path = require('path');

const SEED_DATA_PATH = path.join(__dirname, '..', 'src', 'utils', 'seedData.ts');
const OUTPUT_FILE = path.join(__dirname, 'airlines_data.json');

console.log('Generating initial database from seedData.ts...');

try {
  const seedContent = fs.readFileSync(SEED_DATA_PATH, 'utf8');
  
  const blocks = seedContent.match(/\{[\s\S]*?\}/g) || [];
  
  const results = [];
  
  for (const block of blocks) {
    const iataMatch = /iataCode:\s*'([^']*)'/i.exec(block);
    if (!iataMatch) continue; // Не авиакомпания
    
    const iataCode = iataMatch[1];
    const urlMatch = /registrationUrl:\s*(?:'([^']*)'|null)/i.exec(block);
    const url = urlMatch ? (urlMatch[1] || null) : null;
    
    const hoursMatch = /checkInHoursBefore:\s*(\d+)/i.exec(block);
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 24; // по дефолту 24 часа
    
    results.push({
      iataCode,
      success: true,
      hours,
      url
    });
  }

  const outputData = {
    lastUpdated: new Date().toISOString(),
    airlines: results
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2), 'utf8');
  console.log(`✅ Success! Generated ${results.length} airlines in ${OUTPUT_FILE}`);
} catch (error) {
  console.error('❌ Failed to generate initial database:', error);
  process.exit(1);
}
