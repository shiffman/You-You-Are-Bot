import fs from 'fs';
import csv from 'csv-parser';

const inputCSV = 'data/training.csv';
const outputJSONL = 'data/tyyab.jsonl';
const jsonlData = [];

fs.createReadStream(inputCSV)
  .pipe(csv())
  .on('data', (row) => {
    const system = row.system.trim();
    const user = row.user.trim();
    const assistant = row.assistant.trim();
    const jsonObject = {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
        { role: 'assistant', content: assistant },
      ],
    };

    jsonlData.push(JSON.stringify(jsonObject));
  })
  .on('end', () => {
    fs.writeFileSync(outputJSONL, jsonlData.join('\n'), 'utf8');
    console.log(`Conversion complete! JSONL file saved as ${outputJSONL}`);
  })
  .on('error', (error) => {
    console.error('Error reading the CSV file:', error);
  });
