// Test script to check localStorage state
import fs from 'fs';
import path from 'path';

// Create a simple HTML file to test localStorage
const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>LocalStorage Test</title>
</head>
<body>
    <h1>LocalStorage Test</h1>
    <div id="results"></div>
    <script>
        const results = document.getElementById('results');
        let html = '<h2>LocalStorage Contents:</h2><ul>';
        
        // Check both keys
        const dataMode = localStorage.getItem('dataMode');
        const appDataMode = localStorage.getItem('app_data_mode');
        
        html += '<li><strong>dataMode:</strong> ' + (dataMode || 'null') + '</li>';
        html += '<li><strong>app_data_mode:</strong> ' + (appDataMode || 'null') + '</li>';
        
        // Show all localStorage keys
        html += '</ul><h3>All LocalStorage Keys:</h3><ul>';
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            html += '<li><strong>' + key + ':</strong> ' + value + '</li>';
        }
        
        html += '</ul>';
        results.innerHTML = html;
        
        // Also log to console
        console.log('dataMode:', dataMode);
        console.log('app_data_mode:', appDataMode);
        console.log('All localStorage:', Object.fromEntries(Object.entries(localStorage)));
    </script>
</body>
</html>
`;

fs.writeFileSync('test_localstorage.html', testHtml);
console.log('Test file created: test_localstorage.html');
console.log('Open this file in your browser to check localStorage state.');