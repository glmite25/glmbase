// Simple test to verify genotype and address columns exist in members table
// Run this with: node test-database-columns.js

const { createClient } = require('@supabase/supabase-js');

// You'll need to set your Supabase URL and key
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseColumns() {
  console.log('Testing database columns...');
  
  try {
    // Test 1: Try to select genotype and address columns
    console.log('\n1. Testing column selection...');
    const { data, error } = await supabase
      .from('members')
      .select('id, fullname, email, genotype, address')
      .limit(3);
    
    if (error) {
      console.error('❌ Error selecting columns:', error.message);
      return;
    }
    
    console.log('✅ Successfully selected columns');
    console.log('Sample data:', data);
    
    // Test 2: Try to insert a test record with genotype and address
    console.log('\n2. Testing column insertion...');
    const testData = {
      email: `test-${Date.now()}@example.com`,
      fullname: 'Test User',
      genotype: 'AA',
      address: 'Test Address',
      category: 'Members',
      isactive: true,
      joindate: new Date().toISOString().split('T')[0]
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('members')
      .insert([testData])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Error inserting test record:', insertError.message);
      return;
    }
    
    console.log('✅ Successfully inserted test record with genotype and address');
    console.log('Inserted data:', insertData);
    
    // Clean up test record
    await supabase.from('members').delete().eq('id', insertData.id);
    console.log('✅ Test record cleaned up');
    
    console.log('\n🎉 All database column tests passed!');
    console.log('The genotype and address columns are working correctly.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testDatabaseColumns();