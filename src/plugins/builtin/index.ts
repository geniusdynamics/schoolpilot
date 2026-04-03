/**
 * Builtin Plugins Index
 * 
 * Exports all builtin plugin manifests for automatic registration.
 */

export { manifest as whitelabelManifest } from './whitelabel';
export { manifest as gradingEngineManifest } from './grading-engine';
export { manifest as feeCalculatorManifest } from './fee-calculator';

export { default as whitelabelModule } from './whitelabel';
export { default as gradingEngineModule } from './grading-engine';
export { default as feeCalculatorModule } from './fee-calculator';
