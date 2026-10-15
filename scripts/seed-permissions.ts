import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { ALL_PERMISSION_KEYS } from "../src/lib/permission-keys";

// সব permission ডাটাবেসে বসায় (আগে থাকলে ডুপ্লিকেট হয় না)
async function main() {
  for (const key of ALL_PERMISSION_KEYS) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, label: key },
    });
  }
  console.log(`Permissions seeded: ${ALL_PERMISSION_KEYS.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());