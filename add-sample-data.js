import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const sampleMembers = [
  {
    fullname: 'Pastor Ojide Lawrence',
    email: 'ojidelawrence@gmail.com',
    phone: null,
    category: 'Pastors',
    churchunit: 'Main Church',
    churchunits: ['Main Church', 'Leadership'],
    isactive: true
  },
  {
    fullname: 'Pastor John Smith',
    email: 'pastor.john@glm.org',
    phone: null,
    category: 'Pastors',
    churchunit: 'Youth Ministry',
    churchunits: ['Youth Ministry', 'Discipleship'],
    isactive: true
  },
  {
    fullname: 'Sister Mary Johnson',
    email: 'mary.johnson@glm.org',
    phone: null,
    category: 'Members',
    churchunit: '3H Media',
    churchunits: ['3H Media'],
    isactive: true
  },
  {
    fullname: 'Brother David Wilson',
    email: 'david.wilson@glm.org',
    phone: null,
    category: 'Members',
    churchunit: '3H Music',
    churchunits: ['3H Music', 'Praise Feet'],
    isactive: true
  },
  {
    fullname: 'Elder Sarah Brown',
    email: 'sarah.brown@glm.org',
    phone: null,
    category: 'Members',
    churchunit: 'TOF',
    churchunits: ['TOF', 'Leadership'],
    isactive: true
  },
  {
    fullname: 'Pastor Michael Davis',
    email: 'pastor.michael@glm.org',
    phone: null,
    category: 'Pastors',
    churchunit: 'Discipleship',
    churchunits: ['Discipleship', 'Teaching'],
    isactive: true
  },
  {
    fullname: 'Sister Grace Thompson',
    email: 'grace.thompson@glm.org',
    phone: null,
    category: 'Members',
    churchunit: 'Cloven Tongues',
    churchunits: ['Cloven Tongues'],
    isactive: true
  },
  {
    fullname: 'Brother James Anderson',
    email: 'james.anderson@glm.org',
    phone: null,
    category: 'Members',
    churchunit: '3H Security',
    churchunits: ['3H Security'],
    isactive: true
  }
];

async function addSampleData() {
  console.log('📝 Adding sample members data...');
  
  try {
    // First, check if data already exists
    const { data: existingData, error: checkError } = await supabase
      .from('members')
      .select('email')
      .in('email', sampleMembers.map(m => m.email));
    
    if (checkError) {
      console.error('❌ Error checking existing data:', checkError.message);
      return;
    }
    
    const existingEmails = existingData?.map(d => d.email) || [];
    const newMembers = sampleMembers.filter(m => !existingEmails.includes(m.email));
    
    if (newMembers.length === 0) {
      console.log('✅ Sample data already exists, skipping...');
      return;
    }
    
    console.log(`📊 Adding ${newMembers.length} new members...`);
    
    const { data, error } = await supabase
      .from('members')
      .insert(newMembers)
      .select();
    
    if (error) {
      console.error('❌ Error adding sample data:', error.message);
      return;
    }
    
    console.log(`✅ Successfully added ${data?.length || 0} members`);
    
    // Verify the data
    const { data: allMembers, error: countError } = await supabase
      .from('members')
      .select('id, fullname, category')
      .order('created_at', { ascending: false });
    
    if (countError) {
      console.error('❌ Error verifying data:', countError.message);
      return;
    }
    
    console.log(`📊 Total members in database: ${allMembers?.length || 0}`);
    console.log('Recent members:');
    allMembers?.slice(0, 5).forEach(member => {
      console.log(`  - ${member.fullname} (${member.category})`);
    });
    
  } catch (error) {
    console.error('💥 Failed to add sample data:', error);
  }
}

console.log('🎯 Adding Sample Data to GLM Database');
console.log('====================================');

addSampleData()
  .then(() => {
    console.log('✨ Sample data setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Sample data setup failed:', error);
    process.exit(1);
  });