// ABOUTME: Comprehensive test data generation script for all school management modules
// ABOUTME: Generates target amounts: 500+ students, 100+ staff, 1000+ books, 25+ clubs, complete financial and academic data

const { writeFile } = require('fs').promises;
const { AdministrationGenerator } = require('./src/services/dataGeneration/generators/AdministrationGenerator.ts');
const { LibraryGenerator } = require('./src/services/dataGeneration/generators/LibraryGenerator.ts');
const { FinancialGenerator } = require('./src/services/dataGeneration/generators/FinancialGenerator.ts');
const { ClubsGenerator } = require('./src/services/dataGeneration/generators/ClubsGenerator.ts');
const { AcademicsGenerator } = require('./src/services/dataGeneration/generators/AcademicsGenerator.ts');
const { CommunicationGenerator } = require('./src/services/dataGeneration/generators/CommunicationGenerator.ts');
const { EnhancedLibraryGenerator } = require('./src/services/dataGeneration/generators/EnhancedLibraryGenerator.js');
const { EnhancedFinancialGenerator } = require('./src/services/dataGeneration/generators/EnhancedFinancialGenerator.js');


console.log('🚀 Starting Comprehensive School Data Generation');
console.log('=' .repeat(70));
console.log('📊 Target Data Volumes:');
console.log('   • Students: 500+');
console.log('   • Staff: 100+');
console.log('   • Books: 1000+');
console.log('   • Clubs: 25+');
console.log('   • Financial Transactions: Complete fee structures & supplier management');
console.log('   • Academic Data: Detailed subject hierarchies & assessment frameworks');
console.log('=' .repeat(70));

class ComprehensiveDataGenerator {
  constructor() {
    this.generators = {
      administration: new AdministrationGenerator({ 
        targetStudentCount: 500, 
        targetStaffCount: 100 
      }),
      library: new LibraryGenerator({ 
        targetBookCount: 300 
      }),
      enhancedLibrary: new EnhancedLibraryGenerator({ 
        targetBookCount: 700 
      }),
      financial: new FinancialGenerator({ 
        targetTransactionCount: 200 
      }),
      enhancedFinancial: new EnhancedFinancialGenerator({ 
        targetSupplierCount: 50, 
        targetTransactionCount: 300 
      }),
      clubs: new ClubsGenerator({ 
        targetClubCount: 25 
      }),
      academics: new AcademicsGenerator({ 
        targetSubjectCount: 30 
      }),
      communication: new CommunicationGenerator({ 
        targetMessageCount: 200 
      })
    };
    
    this.generatedData = {};
    this.statistics = {
      totalRecords: 0,
      moduleStats: {},
      generationTime: 0,
      errors: []
    };
  }
  
  async generateModuleData(moduleName, generator) {
    console.log(`\n📦 Generating ${moduleName} data...`);
    const startTime = Date.now();
    
    try {
      const data = await generator.generate();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Group data by table
      const tableStats = {};
      let totalRecords = 0;
      
      data.forEach(item => {
        if (!tableStats[item.table]) {
          tableStats[item.table] = 0;
        }
        tableStats[item.table]++;
        totalRecords++;
      });
      
      this.generatedData[moduleName] = data;
      this.statistics.moduleStats[moduleName] = {
        totalRecords,
        tables: tableStats,
        generationTime: duration,
        success: true
      };
      
      this.statistics.totalRecords += totalRecords;
      
      console.log(`   ✅ ${moduleName}: ${totalRecords} records in ${duration}ms`);
      
      // Show table breakdown
      Object.entries(tableStats).forEach(([table, count]) => {
        console.log(`      • ${table}: ${count} records`);
      });
      
      return data;
      
    } catch (error) {
      console.log(`   ❌ ${moduleName}: ${error.message}`);
      this.statistics.errors.push({
        module: moduleName,
        error: error.message
      });
      
      this.statistics.moduleStats[moduleName] = {
        totalRecords: 0,
        success: false,
        error: error.message
      };
      
      return [];
    }
  }
  
  async generateAllData() {
    const overallStartTime = Date.now();
    
    console.log('\n🔄 Starting data generation for all modules...');
    
    // Generate data for each module
    for (const [moduleName, generator] of Object.entries(this.generators)) {
      await this.generateModuleData(moduleName, generator);
    }
    
    const overallEndTime = Date.now();
    this.statistics.generationTime = overallEndTime - overallStartTime;
    
    return this.generatedData;
  }
  
  validateDataTargets() {
    console.log('\n🎯 Validating Data Generation Targets...');
    
    const targets = {
      students: { target: 500, actual: 0 },
      staff: { target: 100, actual: 0 },
      books: { target: 1000, actual: 0 },
      clubs: { target: 25, actual: 0 },
      subjects: { target: 30, actual: 0 },
      transactions: { target: 500, actual: 0 }
    };
    
    // Count actual records across all modules
    Object.values(this.generatedData).forEach(moduleData => {
      moduleData.forEach(item => {
        switch (item.table) {
          case 'students':
            targets.students.actual++;
            break;
          case 'staff':
            targets.staff.actual++;
            break;
          case 'books':
          case 'book_copies':
            targets.books.actual++;
            break;
          case 'clubs':
            targets.clubs.actual++;
            break;
          case 'subjects':
            targets.subjects.actual++;
            break;
          case 'financial_transactions':
          case 'student_fees':
          case 'payments':
          case 'purchase_orders':
            targets.transactions.actual++;
            break;
        }
      });
    });
    
    // Validate targets
    const validationResults = {};
    Object.entries(targets).forEach(([category, data]) => {
      const achieved = data.actual >= data.target;
      validationResults[category] = {
        target: data.target,
        actual: data.actual,
        achieved: achieved,
        percentage: Math.round((data.actual / data.target) * 100)
      };
      
      const status = achieved ? '✅' : '⚠️';
      console.log(`   ${status} ${category}: ${data.actual}/${data.target} (${validationResults[category].percentage}%)`);
    });
    
    return validationResults;
  }
  
  generateSummaryReport() {
    console.log('\n' + '=' .repeat(70));
    console.log('📊 COMPREHENSIVE DATA GENERATION SUMMARY');
    console.log('=' .repeat(70));
    
    console.log(`\n📈 OVERALL STATISTICS:`);
    console.log(`   Total Records Generated: ${this.statistics.totalRecords.toLocaleString()}`);
    console.log(`   Total Generation Time: ${this.statistics.generationTime}ms`);
    console.log(`   Successful Modules: ${Object.values(this.statistics.moduleStats).filter(m => m.success).length}`);
    console.log(`   Failed Modules: ${this.statistics.errors.length}`);
    
    if (this.statistics.errors.length > 0) {
      console.log(`\n❌ GENERATION ERRORS:`);
      this.statistics.errors.forEach(error => {
        console.log(`   • ${error.module}: ${error.error}`);
      });
    }
    
    console.log(`\n📦 MODULE BREAKDOWN:`);
    Object.entries(this.statistics.moduleStats).forEach(([module, stats]) => {
      if (stats.success) {
        console.log(`   ✅ ${module}: ${stats.totalRecords} records (${stats.generationTime}ms)`);
        Object.entries(stats.tables).forEach(([table, count]) => {
          console.log(`      • ${table}: ${count}`);
        });
      } else {
        console.log(`   ❌ ${module}: Failed - ${stats.error}`);
      }
    });
    
    // Validate targets
    const validation = this.validateDataTargets();
    
    console.log(`\n🎯 TARGET ACHIEVEMENT:`);
    const allTargetsMet = Object.values(validation).every(v => v.achieved);
    
    if (allTargetsMet) {
      console.log('🎉 All data generation targets achieved!');
    } else {
      console.log('⚠️  Some targets not fully met - consider adjusting generator parameters.');
    }
    
    console.log(`\n💾 STORAGE RECOMMENDATIONS:`);
    console.log(`   • SQLite OPFS: Recommended for production with ${this.statistics.totalRecords.toLocaleString()} records`);
    console.log(`   • Livestore: Excellent for real-time collaborative features`);
    console.log(`   • PouchDB: Perfect for offline-first school management`);
    console.log(`   • localStorage: Suitable for testing and development`);
    
    console.log(`\n🔗 CROSS-MODULE RELATIONSHIPS:`);
    console.log(`   • Student-Academic: Enrollments, grades, assessments`);
    console.log(`   • Student-Library: Book loans, reservations, fines`);
    console.log(`   • Student-Financial: Fee structures, payments, balances`);
    console.log(`   • Student-Clubs: Memberships, activities, leadership roles`);
    console.log(`   • Staff-Academic: Subject assignments, class management`);
    console.log(`   • Staff-Clubs: Supervision, mentoring, coordination`);
    
    return {
      totalRecords: this.statistics.totalRecords,
      generationTime: this.statistics.generationTime,
      moduleStats: this.statistics.moduleStats,
      targetValidation: validation,
      allTargetsMet: allTargetsMet,
      errors: this.statistics.errors
    };
  }
  
  async saveDataToFiles() {
    console.log('\n💾 Saving generated data to files...');
    
    try {
      // Save complete dataset
      await writeFile(
        'comprehensive_school_data.json',
        JSON.stringify(this.generatedData, null, 2)
      );
      
      // Save statistics
      await writeFile(
        'data_generation_statistics.json',
        JSON.stringify(this.statistics, null, 2)
      );
      
      // Save data by module for easier analysis
      for (const [moduleName, data] of Object.entries(this.generatedData)) {
        await writeFile(
          `data_${moduleName}.json`,
          JSON.stringify(data, null, 2)
        );
      }
      
      console.log('   ✅ All data files saved successfully');
      console.log('   📁 Files created:');
      console.log('      • comprehensive_school_data.json (complete dataset)');
      console.log('      • data_generation_statistics.json (generation stats)');
      Object.keys(this.generatedData).forEach(module => {
        console.log(`      • data_${module}.json (${module} module data)`);
      });
      
    } catch (error) {
      console.error('   ❌ Failed to save data files:', error.message);
      throw error;
    }
  }
}

// Main execution function
async function generateComprehensiveSchoolData() {
  const generator = new ComprehensiveDataGenerator();
  
  try {
    // Generate all data
    await generator.generateAllData();
    
    // Generate and display summary report
    const summary = generator.generateSummaryReport();
    
    // Save data to files
    await generator.saveDataToFiles();
    
    console.log('\n✨ Comprehensive school data generation completed successfully!');
    
    return summary;
    
  } catch (error) {
    console.error('❌ Comprehensive data generation failed:', error);
    throw error;
  }
}

// Execute if run directly
if (require.main === module) {
  generateComprehensiveSchoolData()
    .then(summary => {
      if (summary.allTargetsMet && summary.errors.length === 0) {
        console.log('\n🎊 All targets achieved with no errors!');
        process.exit(0);
      } else if (summary.errors.length === 0) {
        console.log('\n🎯 Data generation completed with some targets partially met.');
        process.exit(0);
      } else {
        console.log('\n⚠️  Data generation completed with some errors.');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('💥 Generation failed:', error);
      process.exit(1);
    });
}

module.exports = { ComprehensiveDataGenerator, generateComprehensiveSchoolData };