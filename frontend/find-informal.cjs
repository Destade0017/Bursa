const fs = require('fs');
const path = require('path');

const informalWords = [
  'yay', 'oops', 'awesome', 'gotcha', 'whoops', 'woohoo', 'cool',
  'uh oh', 'yikes', 'super', 'boom', 'bam', 'voila', 'ta-da'
];

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath);
    } else if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        // Find informal words
        const words = line.toLowerCase().match(/[a-z]+/g) || [];
        const foundWords = words.filter(w => informalWords.includes(w));
        
        // Find emojis
        const foundEmojis = line.match(emojiRegex);
        
        if (foundWords.length > 0 || foundEmojis) {
          console.log(`${filePath}:${i + 1}`);
          if (foundWords.length > 0) console.log(`  Informal words: ${foundWords.join(', ')}`);
          if (foundEmojis) console.log(`  Emojis: ${foundEmojis.join('')}`);
          console.log(`  Line: ${line.trim()}`);
        }
      });
    }
  }
}

walk('./src/components');
