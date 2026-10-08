import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { translate } from "../src/lib/i18n";
import { formatMoney } from "../src/lib/money";
import { assertCompanyInScope, assertFactoryInScope } from "../src/lib/scope";
import { getRate, saveRate, toDateOnly } from "../src/services/currency.service";

async function pureChecks() {
  assert.equal(translate("en", "common.save"), "Save");
  assert.equal(translate("bn", "common.save"), "সংরক্ষণ");
  assert.equal(translate("bn", "no.such.key"), "no.such.key");
  assert.equal(translate("en", "greeting", { name: "Rahim" }), "Welcome, Rahim");

  assert.equal(formatMoney(1234.5, "USD", "en"), "$1,234.50");
  assert.match(formatMoney(1234.5, "BDT", "bn"), /১/);

  const scope = { userId: "u", level: "FACTORY" as const, companyIds: ["c1"], factoryIds: ["f1"] };
  assertCompanyInScope(scope, "c1");
  assertFactoryInScope(scope, "f1");
  assert.throws(() => assertCompanyInScope(scope, "c2"), /FORBIDDEN_SCOPE/);
  assert.throws(() => assertFactoryInScope(scope, "f2"), /FORBIDDEN_SCOPE/);

  console.log("OK  pure checks (ভাষা, টাকা, scope)");
}

async function dbChecks() {
  const day = new Date(2000, 0, 10);
  try {
    await saveRate({ fromCode: "TST", toCode: "TSB", rate: "100", rateDate: day });

    const direct = await getRate("TST", "TSB", new Date(2000, 0, 15));
    assert.equal(direct.rate.toString(), "100");

    const inverse = await getRate("TSB", "TST", new Date(2000, 0, 15));
    assert.equal(inverse.rate.toString(), "0.01");

    const same = await getRate("TST", "TST", day);
    assert.equal(same.rate.toString(), "1");

    await assert.rejects(() => getRate("TST", "TSB", new Date(1999, 11, 1)), /NO_EXCHANGE_RATE/);
    await assert.rejects(() => saveRate({ fromCode: "TST", toCode: "TST", rate: 1, rateDate: day }));
    await assert.rejects(() => saveRate({ fromCode: "TST", toCode: "TSB", rate: 0, rateDate: day }));

    console.log("OK  database checks (রেট খোঁজা, উল্টো রেট, এরর)");
  } finally {
    const rows = await prisma.exchangeRate.findMany({
      where: { fromCode: "TST", toCode: "TSB", rateDate: toDateOnly(day) },
      select: { id: true },
    });
    await prisma.auditLog.deleteMany({
      where: { entity: "ExchangeRate", entityId: { in: rows.map((r) => r.id) } },
    });
    await prisma.exchangeRate.deleteMany({ where: { fromCode: "TST", toCode: "TSB" } });
  }
}

async function main() {
  await pureChecks();
  try {
    await dbChecks();
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "ECONNREFUSED") {
      console.log("SKIP database checks: ডাটাবেসে পৌঁছানো যায়নি (ECONNREFUSED)");
      return;
    }
    throw e;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});