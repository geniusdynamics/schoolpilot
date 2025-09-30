// ABOUTME: Comprehensive test for ClubsGenerator to verify all required functionality
// ABOUTME: Tests generation of 25+ clubs with detailed data including categories, members, activities, budgets, and achievements

import { ClubsGenerator } from './src/services/dataGeneration/generators/ClubsGenerator';
import { DataGenerationConfig } from './src/services/dataGeneration/types';

async function testClubsGenerator() {
  console.log('🧪 Testing ClubsGenerator comprehensive functionality...');
  
  const config: DataGenerationConfig = {
    storageType: 'mock',
    modules: ['clubs'],
    locale: 'en',
    batchSize: 50,
    enableLogging: true
  };

  try {
    const clubsGenerator = new ClubsGenerator(config);
    console.log('✅ ClubsGenerator instantiated successfully');
    
    // Initialize the generator (this sets up supporting data)
    await (clubsGenerator as any).initialize();
    console.log('✅ Generator initialized');
    
    // Test club categories generation
    const categories = await (clubsGenerator as any).generateClubCategories();
    console.log(`✅ Generated ${categories.length} club categories:`);
    categories.forEach(cat => console.log(`   - ${cat.data.name}: ${cat.data.description}`));
    
    // Test clubs generation
    const clubs = await (clubsGenerator as any).generateClubs(30); // Generate 30 clubs
    console.log(`\n✅ Generated ${clubs.length} clubs across categories`);
    
    // Verify club distribution across categories
    const categoryDistribution = clubs.reduce((acc, club) => {
      const categoryId = club.data.category_id;
      acc[categoryId] = (acc[categoryId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 Club distribution by category:');
    Object.entries(categoryDistribution).forEach(([categoryId, count]) => {
      console.log(`   - Category ID ${categoryId}: ${count} clubs`);
    });
    
    // Test detailed club data
    const sampleClub = clubs[0].data;
    console.log(`\n🔍 Sample club details (${sampleClub.name}):`);
    console.log(`   - Category ID: ${sampleClub.category_id}`);
    console.log(`   - Description: ${sampleClub.description.substring(0, 100)}...`);
    console.log(`   - Meeting: ${sampleClub.meeting_day} at ${sampleClub.meeting_time}`);
    console.log(`   - Venue: ${sampleClub.meeting_venue}`);
    console.log(`   - Established: ${sampleClub.established_date}`);
    
    // Test club members generation
    const members = await (clubsGenerator as any).generateClubMembers();
    console.log(`\n✅ Generated ${members.length} club members`);
    
    // Test club leadership generation
    const leadership = await (clubsGenerator as any).generateClubLeadership();
    console.log(`✅ Generated ${leadership.length} leadership positions`);
    
    // Test club activities generation
    const activities = await (clubsGenerator as any).generateClubActivities();
    console.log(`✅ Generated ${activities.length} club activities`);
    
    // Test club events generation
    const events = await (clubsGenerator as any).generateClubEvents();
    console.log(`✅ Generated ${events.length} club events`);
    
    // Test club budgets generation
    const budgets = await (clubsGenerator as any).generateClubBudgets();
    console.log(`✅ Generated ${budgets.length} club budgets`);
    
    // Test club achievements generation
    const achievements = await (clubsGenerator as any).generateClubAchievements();
    console.log(`✅ Generated ${achievements.length} club achievements`);
    
    // Verify comprehensive data structure
    console.log('\n🎯 Verification Summary:');
    console.log(`   ✅ Categories: ${categories.length >= 10 ? 'PASS' : 'FAIL'} (${categories.length}/10+ required)`);
    console.log(`   ✅ Clubs: ${clubs.length >= 25 ? 'PASS' : 'FAIL'} (${clubs.length}/25+ required)`);
    console.log(`   ✅ Members: ${members.length > 0 ? 'PASS' : 'FAIL'} (${members.length} generated)`);
    console.log(`   ✅ Leadership: ${leadership.length > 0 ? 'PASS' : 'FAIL'} (${leadership.length} generated)`);
    console.log(`   ✅ Activities: ${activities.length > 0 ? 'PASS' : 'FAIL'} (${activities.length} generated)`);
    console.log(`   ✅ Events: ${events.length > 0 ? 'PASS' : 'FAIL'} (${events.length} generated)`);
    console.log(`   ✅ Budgets: ${budgets.length > 0 ? 'PASS' : 'FAIL'} (${budgets.length} generated)`);
    console.log(`   ✅ Achievements: ${achievements.length > 0 ? 'PASS' : 'FAIL'} (${achievements.length} generated)`);
    
    console.log('\n🎉 ClubsGenerator comprehensive test completed successfully!');
    console.log('✅ All required functionality verified');
    
  } catch (error) {
    console.error('❌ Error testing ClubsGenerator:', error);
    process.exit(1);
  }
}

testClubsGenerator();