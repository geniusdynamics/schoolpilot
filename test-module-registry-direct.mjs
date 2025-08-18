import { moduleRegistry } from "./src/core/moduleRegistry.js";
import { initializeModules } from "./src/core/moduleLoader.js";

console.log("Testing module registry directly...");

// Test module registry methods
console.log("All modules:", moduleRegistry.getAllModules());
console.log("Enabled modules:", moduleRegistry.getEnabledModules());
console.log("Navigation items:", moduleRegistry.getNavigationItems());

// Test module initialization
console.log("Initializing modules...");
initializeModules().then(() => {
  console.log("Modules initialized");
  console.log("All modules after init:", moduleRegistry.getAllModules());
  console.log("Enabled modules after init:", moduleRegistry.getEnabledModules());
  console.log("Navigation items after init:", moduleRegistry.getNavigationItems());
}).catch(error => {
  console.error("Module initialization failed:", error);
});
