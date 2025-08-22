const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Set no-cache headers to ensure version is always fresh
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    try {
        const versionPath = path.join(process.cwd(), 'version.json');
        const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
        res.status(200).json(versionData);
    } catch (error) {
        res.status(500).json({ error: 'Could not read version data' });
    }
};