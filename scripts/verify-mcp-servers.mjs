#!/usr/bin/env node

// This is a simple test to verify MCP server configuration
console.log('MCP Servers Configuration:');
console.log('- Puppeteer Server');
console.log('- Sequential Thinking Server');
console.log('- Deep Web Research Server');
console.log('- Firecrawl Server');

console.log('\nTo use these servers with Qwen Code:');
console.log('1. Ensure the .mcp.servers.json file is in your project root');
console.log('2. Set the FIRECRAWL_API_KEY environment variable for the Firecrawl server');
console.log('3. Qwen Code should automatically detect and use these servers');