import { connectDB, disconnectDB } from "../config/db";
import { User } from "../models/User";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx src/scripts/promoteToAdmin.ts <email>");
    process.exit(1);
  }

  await connectDB();

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    console.error(`No user found with email ${email}`);
    await disconnectDB();
    process.exit(1);
  }

  user.role = "admin";
  await user.save();

  console.log(`✅ ${user.username} (${user.email}) is now an admin.`);

  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to promote user:", err);
  process.exit(1);
});
