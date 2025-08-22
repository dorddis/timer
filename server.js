const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/version', (req, res) => {
    try {
        // Set no-cache headers to ensure version is always fresh
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
        const versionData = JSON.parse(fs.readFileSync('version.json', 'utf8'));
        res.json(versionData);
    } catch (error) {
        res.status(500).json({ error: 'Could not read version data' });
    }
});

app.listen(PORT, () => {
    console.log(`Timer server running at http://localhost:${PORT}`);
});