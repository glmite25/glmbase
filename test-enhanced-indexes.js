// Test script for enhanced index optimization
// Task 4.3: Validate query performance with new index structure

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testEnhancedIndexes() {
  console.log('📊 Testing Enhanced Index Performance...\n');

  try {
    // Test 1: Validate index existence and effectiveness
    console.log('1️⃣ Validating enhanced indexes...');
    const { data: indexValidation, error: validationError } = await supabase
      .rpc('validate_enhanced_indexes');

    if (validationError) {
      console.error('❌ Index validation error:', validationError);
    } else {
      console.log('✅ Index validation results:');
      indexValidation.forEach(result => {
        const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : result.status === 'WARNING' ? '⚠️' : 'ℹ️';
        console.log(`   ${icon} ${result.validation_check}: ${result.details}`);
      });
    }

    // Test 2: Analyze index usage statistics
    console.log('\n2️⃣ Analyzing index usage statistics...');
    const { data: indexUsage, error: usageError } = await supabase
      .rpc('analyze_enhanced_index_usage');

    if (usageError) {
      console.error('❌ Index usage analysis error:', usageError);
    } else {
      console.log('✅ Index usage statistics (top 10):');
      const topIndexes = indexUsage.slice(0, 10);
      topIndexes.forEach(index => {
        console.log(`   📈 ${index.index_name}: ${index.index_scans} scans, ${index.index_size}, ${index.usage_ratio}% efficiency`);
      });
      
      if (indexUsage.length > 10) {
        console.log(`   ... and ${indexUsage.length - 10} more indexes`);
      }
    }

    // Test 3: Find unused indexes
    console.log('\n3️⃣ Checking for unused indexes...');
    const { data: unusedIndexes, error: unusedError } = await supabase
      .rpc('find_unused_enhanced_indexes');

    if (unusedError) {
      console.error('❌ Unused index check error:', unusedError);
    } else {
      if (unusedIndexes.length === 0) {
        console.log('✅ No unused indexes found - all indexes are being utilized');
      } else {
        console.log('⚠️ Found unused indexes:');
        unusedIndexes.forEach(index => {
          console.log(`   🗑️ ${index.index_name} (${index.index_size}) - consider removal`);
        });
      }
    }

    // Test 4: Get index recommendations
    console.log('\n4️⃣ Getting index recommendations...');
    const { data: recommendations, error: recommendError } = await supabase
      .rpc('get_enhanced_index_recommendations');

    if (recommendError) {
      console.error('❌ Index recommendations error:', recommendError);
    } else {
      if (recommendations.length === 0) {
        console.log('✅ No additional index recommendations - current setup is optimal');
      } else {
        console.log('💡 Index recommendations:');
        recommendations.forEach(rec => {
          console.log(`   ${rec.recommendation_type}: ${rec.suggestion} (${rec.reason})`);
        });
      }
    }

    // Test 5: Count indexes on each table
    console.log('\n5️⃣ Counting indexes on enhanced tables...');
    const { data: memberIndexes, error: memberIndexError } = await supabase
      .from('pg_indexes')
      .select('indexname, indexdef')
      .eq('tablename', 'members_enhanced')
      .eq('schemaname', 'public');

    if (memberIndexError) {
      console.error('❌ Members index count error:', memberIndexError);
    } else {
      console.log(`✅ Enhanced members table has ${memberIndexes.length} indexes:`);
      memberIndexes.forEach(index => {
        const indexType = index.indexdef.includes('USING GIN') ? 'GIN' : 
                         index.indexdef.includes('USING BTREE') ? 'BTREE' : 
                         index.indexdef.includes('UNIQUE') ? 'UNIQUE' : 'STANDARD';
        console.log(`   🔍 ${index.indexname} (${indexType})`);
      });
    }

    const { data: profileIndexes, error: profileIndexError } = await supabase
      .from('pg_indexes')
      .select('indexname, indexdef')
      .eq('tablename', 'profiles')
      .eq('schemaname', 'public');

    if (profileIndexError) {
      console.error('❌ Profiles index count error:', profileIndexError);
    } else {
      console.log(`✅ Profiles table has ${profileIndexes.length} indexes:`);
      profileIndexes.forEach(index => {
        const indexType = index.indexdef.includes('USING GIN') ? 'GIN' : 
                         index.indexdef.includes('USING BTREE') ? 'BTREE' : 
                         index.indexdef.includes('UNIQUE') ? 'UNIQUE' : 'STANDARD';
        console.log(`   🔍 ${index.indexname} (${indexType})`);
      });
    }

    // Test 6: Performance test queries
    console.log('\n6️⃣ Running performance test queries...');
    
    // Test query 1: Active members by category
    const start1 = Date.now();
    const { data: activeMembers, error: query1Error } = await supabase
      .from('members_enhanced')
      .select('id, fullname, category')
      .eq('isactive', true)
      .limit(100);
    const time1 = Date.now() - start1;

    if (query1Error) {
      console.error('❌ Query 1 error:', query1Error);
    } else {
      console.log(`✅ Query 1 (active members): ${activeMembers.length} results in ${time1}ms`);
    }

    // Test query 2: Members by church unit
    const start2 = Date.now();
    const { data: churchMembers, error: query2Error } = await supabase
      .from('members_enhanced')
      .select('id, fullname, churchunit')
      .not('churchunit', 'is', null)
      .eq('isactive', true)
      .limit(50);
    const time2 = Date.now() - start2;

    if (query2Error) {
      console.error('❌ Query 2 error:', query2Error);
    } else {
      console.log(`✅ Query 2 (church unit members): ${churchMembers.length} results in ${time2}ms`);
    }

    // Test query 3: Search by name (should use text index)
    const start3 = Date.now();
    const { data: nameSearch, error: query3Error } = await supabase
      .from('members_enhanced')
      .select('id, fullname, email')
      .ilike('fullname', '%a%')
      .eq('isactive', true)
      .limit(20);
    const time3 = Date.now() - start3;

    if (query3Error) {
      console.error('❌ Query 3 error:', query3Error);
    } else {
      console.log(`✅ Query 3 (name search): ${nameSearch.length} results in ${time3}ms`);
    }

    // Test query 4: Pastor assignments
    const start4 = Date.now();
    const { data: pastorAssignments, error: query4Error } = await supabase
      .from('members_enhanced')
      .select('id, fullname, assignedto')
      .not('assignedto', 'is', null)
      .eq('isactive', true)
      .limit(30);
    const time4 = Date.now() - start4;

    if (query4Error) {
      console.error('❌ Query 4 error:', query4Error);
    } else {
      console.log(`✅ Query 4 (pastor assignments): ${pastorAssignments.length} results in ${time4}ms`);
    }

    // Test query 5: Recent members (date range)
    const start5 = Date.now();
    const { data: recentMembers, error: query5Error } = await supabase
      .from('members_enhanced')
      .select('id, fullname, joindate')
      .gte('joindate', '2024-01-01')
      .eq('isactive', true)
      .limit(25);
    const time5 = Date.now() - start5;

    if (query5Error) {
      console.error('❌ Query 5 error:', query5Error);
    } else {
      console.log(`✅ Query 5 (recent members): ${recentMembers.length} results in ${time5}ms`);
    }

    // Calculate average query time
    const avgTime = (time1 + time2 + time3 + time4 + time5) / 5;
    console.log(`📊 Average query time: ${avgTime.toFixed(2)}ms`);

    // Test 7: Check for pg_trgm extension (needed for text search indexes)
    console.log('\n7️⃣ Checking for required extensions...');
    const { data: extensions, error: extError } = await supabase
      .from('pg_extension')
      .select('extname')
      .eq('extname', 'pg_trgm');

    if (extError) {
      console.error('❌ Extension check error:', extError);
    } else {
      if (extensions.length > 0) {
        console.log('✅ pg_trgm extension is installed (enables trigram text search)');
      } else {
        console.log('⚠️ pg_trgm extension not found - text search indexes may not be optimal');
      }
    }

    // Test 8: Table statistics
    console.log('\n8️⃣ Checking table statistics...');
    const { data: memberStats, error: statsError } = await supabase
      .from('pg_stat_user_tables')
      .select('n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup')
      .eq('relname', 'members_enhanced')
      .eq('schemaname', 'public')
      .single();

    if (statsError) {
      console.error('❌ Table statistics error:', statsError);
    } else {
      console.log('✅ Enhanced members table statistics:');
      console.log(`   📊 Live tuples: ${memberStats.n_live_tup}`);
      console.log(`   📊 Dead tuples: ${memberStats.n_dead_tup}`);
      console.log(`   📊 Inserts: ${memberStats.n_tup_ins}`);
      console.log(`   📊 Updates: ${memberStats.n_tup_upd}`);
      console.log(`   📊 Deletes: ${memberStats.n_tup_del}`);
      
      if (memberStats.n_dead_tup > memberStats.n_live_tup * 0.1) {
        console.log('   ⚠️ High dead tuple ratio - consider running VACUUM');
      }
    }

    // Test 9: Update table statistics
    console.log('\n9️⃣ Updating table statistics...');
    const { data: statsUpdate, error: statsUpdateError } = await supabase
      .rpc('maintain_enhanced_table_stats');

    if (statsUpdateError) {
      console.error('❌ Statistics update error:', statsUpdateError);
    } else {
      console.log('✅ Table statistics updated:', statsUpdate);
    }

    console.log('\n🎉 Enhanced index testing completed!');

    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`   • Enhanced members table: ${memberIndexes?.length || 'N/A'} indexes`);
    console.log(`   • Profiles table: ${profileIndexes?.length || 'N/A'} indexes`);
    console.log(`   • Average query time: ${avgTime.toFixed(2)}ms`);
    console.log(`   • Unused indexes: ${unusedIndexes?.length || 0}`);
    console.log(`   • Recommendations: ${recommendations?.length || 0}`);

  } catch (error) {
    console.error('❌ Test execution error:', error);
  }
}

// Function to benchmark specific queries
async function benchmarkQueries(iterations = 10) {
  console.log(`\n🏃 Running query benchmark (${iterations} iterations)...\n`);

  const queries = [
    {
      name: 'Active Members by Category',
      query: () => supabase
        .from('members_enhanced')
        .select('id, fullname, category')
        .eq('isactive', true)
        .eq('category', 'Members')
        .limit(50)
    },
    {
      name: 'Pastor Assignments',
      query: () => supabase
        .from('members_enhanced')
        .select('id, fullname, assignedto')
        .not('assignedto', 'is', null)
        .eq('isactive', true)
        .limit(30)
    },
    {
      name: 'Church Unit Members',
      query: () => supabase
        .from('members_enhanced')
        .select('id, fullname, churchunit')
        .not('churchunit', 'is', null)
        .eq('isactive', true)
        .limit(40)
    },
    {
      name: 'Name Search',
      query: () => supabase
        .from('members_enhanced')
        .select('id, fullname, email')
        .ilike('fullname', '%john%')
        .eq('isactive', true)
        .limit(20)
    },
    {
      name: 'Recent Members',
      query: () => supabase
        .from('members_enhanced')
        .select('id, fullname, joindate')
        .gte('joindate', '2024-01-01')
        .eq('isactive', true)
        .limit(25)
    }
  ];

  for (const queryTest of queries) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      const { data, error } = await queryTest.query();
      const time = Date.now() - start;
      
      if (error) {
        console.error(`❌ ${queryTest.name} error:`, error);
        break;
      }
      
      times.push(time);
    }
    
    if (times.length === iterations) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      console.log(`📊 ${queryTest.name}:`);
      console.log(`   Average: ${avgTime.toFixed(2)}ms`);
      console.log(`   Min: ${minTime}ms, Max: ${maxTime}ms`);
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEnhancedIndexes().then(() => {
    // Optionally run benchmark
    if (process.argv.includes('--benchmark')) {
      return benchmarkQueries(5);
    }
  });
}

module.exports = { testEnhancedIndexes, benchmarkQueries };