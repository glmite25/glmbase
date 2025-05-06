import { syncProfilesToMembers } from "@/utils/syncProfilesToMembers";

(async () => {
  console.log("Starting sync of profiles to members...");
  const result = await syncProfilesToMembers();
  console.log("Sync result:", result);
  if (result.success) {
    console.log(`✅ Success: ${result.message}`);
  } else {
    console.error(`❌ Error: ${result.message}`);
  }
})();
