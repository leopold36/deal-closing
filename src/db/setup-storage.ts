import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

async function setupStorage() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Create the documents bucket (public so files can be read)
  const { data, error } = await supabase.storage.createBucket("documents", {
    public: true,
  });

  if (error) {
    if (error.message?.includes("already exists")) {
      console.log("Bucket 'documents' already exists.");
    } else {
      console.error("Failed to create bucket:", error.message);
      process.exit(1);
    }
  } else {
    console.log("Created bucket:", data.name);
  }

  process.exit(0);
}

setupStorage();
