const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const destDir = path.join(__dirname, 'www');

// Create www folder if it doesn't exist
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir);
    console.log('Created www/ directory.');
}

const filesToCopy = [
    'index.html',
    'manifest.json',
    'service-worker.js',
    'icon-192.png',
    'icon-512.png'
];

filesToCopy.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);
    
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied ${file} to www/`);
    } else {
        console.warn(`Warning: Source file ${file} does not exist!`);
    }
});

console.log('Static asset bundling completed successfully.');
