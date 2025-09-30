// Test file to debug DataLayerSettingsPage import
console.log('Testing DataLayerSettingsPage import...');

try {
  // Test the exact path that should be used
  const path = './src/modules/settings/pages/DataLayerSettingsPage.tsx';
  console.log('Attempting to import from:', path);
  
  import(path)
    .then(module => {
      console.log('✅ Import successful!');
      console.log('Module:', module);
      console.log('Default export:', module.default);
      console.log('Default export type:', typeof module.default);
    })
    .catch(error => {
      console.error('❌ Import failed:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    });
} catch (error) {
  console.error('❌ Sync error:', error);
}

// Also test if the file exists using fetch
fetch('/src/modules/settings/pages/DataLayerSettingsPage.tsx')
  .then(response => {
    console.log('File fetch response status:', response.status);
    console.log('File fetch response ok:', response.ok);
    return response.text();
  })
  .then(content => {
    console.log('File content length:', content.length);
    console.log('File starts with:', content.substring(0, 100));
  })
  .catch(error => {
    console.error('❌ File fetch failed:', error);
  });