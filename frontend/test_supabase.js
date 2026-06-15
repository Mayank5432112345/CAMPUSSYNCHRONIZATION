const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://eznrxzbievvkyjvvdeps.supabase.co';
const supabaseAnonKey = 'sb_publishable_CYlm2RpUSVgMsDN3xlyDaQ_urG9RBhv';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Querying profiles...");
  const { data, error } = await supabase.from('profiles').select('id').limit(1);
  if (error) {
    console.error("Error querying profiles:", error);
  } else {
    console.log("Success! Profiles table is accessible. Data:", data);
  }
}

test();
