// Test script for news ingestion pipeline
// Run with: node test-pipeline.js

const BASE_URL = "http://localhost:3000";

async function testEndpoint(name, url, method = "GET") {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`   ${method} ${url}`);

  try {
    const response = await fetch(url, { method });
    const data = await response.json();

    if (response.ok) {
      console.log(`   ✅ Success (${response.status})`);
      console.log(`   Response:`, JSON.stringify(data, null, 2));
      return { success: true, data };
    } else {
      console.log(`   ❌ Failed (${response.status})`);
      console.log(`   Error:`, JSON.stringify(data, null, 2));
      return { success: false, data };
    }
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runPipeline() {
  console.log("🚀 Starting News Ingestion Pipeline Test\n");
  console.log("=".repeat(60));

  // 1. Health Check
  await testEndpoint("Health Check", `${BASE_URL}/api/health`);

  // 2. Seed Sources
  await testEndpoint(
    "Seed Sources",
    `${BASE_URL}/api/admin/sources/seed`,
    "POST",
  );

  // 3. Pull RSS Feeds
  console.log("\n⏳ Pulling RSS feeds (this may take 10-30 seconds)...");
  await testEndpoint("Pull RSS Feeds", `${BASE_URL}/api/cron/pull`, "POST");

  // 4. Process Articles
  await testEndpoint(
    "Process Articles",
    `${BASE_URL}/api/cron/process`,
    "POST",
  );

  // 5. Get Articles
  await testEndpoint(
    "Get Articles (Page 1)",
    `${BASE_URL}/api/articles?page=1&limit=5`,
  );

  // 6. Final Health Check
  await testEndpoint("Final Health Check", `${BASE_URL}/api/health`);

  console.log("\n" + "=".repeat(60));
  console.log("✨ Pipeline test complete!\n");
}

runPipeline().catch(console.error);
