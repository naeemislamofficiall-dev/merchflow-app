import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { saveRate } from "../src/services/currency.service";


const RATES = [
  { fromCode: "USD", toCode: "BDT", rate: 120 },
  { fromCode: "EUR", toCode: "BDT", rate: 130 },
];

async function main() {
  for (const r of RATES) {
    await saveRate({ ...r, rateDate: new Date(), source: "SEED" });
  }
  console.log(`Rates seeded: ${RATES.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());