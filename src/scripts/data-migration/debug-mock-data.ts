#!/usr/bin/env node

// ABOUTME: Debug script to inspect mock data structure

import * as academicsMockData from '../../modules/academics/data/mockData';
import * as administrationMockData from '../../modules/administration/data/mockData';
import * as financeMockData from '../../modules/finance/data/mockData';
import * as hrMockData from '../../modules/hr/data/mockData';
import * as inventoryMockData from '../../modules/inventory/data/mockData';
import * as libraryMockData from '../../modules/library/data/mockData';
import * as nutritionMockData from '../../modules/nutrition/data/mockData';

console.log('=== ACADEMICS MOCK DATA ===');
console.log('Keys:', Object.keys(academicsMockData));
console.log('initialMockSubjects:', Array.isArray(academicsMockData.initialMockSubjects) ? academicsMockData.initialMockSubjects.length : 'Not found');
console.log('initialMockStudents:', Array.isArray(academicsMockData.initialMockStudents) ? academicsMockData.initialMockStudents?.length : 'Not found');

console.log('\n=== ADMINISTRATION MOCK DATA ===');
console.log('Keys:', Object.keys(administrationMockData));

console.log('\n=== FINANCE MOCK DATA ===');
console.log('Keys:', Object.keys(financeMockData));

console.log('\n=== HR MOCK DATA ===');
console.log('Keys:', Object.keys(hrMockData));

console.log('\n=== INVENTORY MOCK DATA ===');
console.log('Keys:', Object.keys(inventoryMockData));

console.log('\n=== LIBRARY MOCK DATA ===');
console.log('Keys:', Object.keys(libraryMockData));

console.log('\n=== NUTRITION MOCK DATA ===');
console.log('Keys:', Object.keys(nutritionMockData));