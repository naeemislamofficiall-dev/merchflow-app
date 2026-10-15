import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError } from "@/lib/business-rules";
import { writeAudit } from "@/lib/audit";
import type { SessionUser } from "@/lib/permissions";

// মুদ্রা ও এক্সচেঞ্জ রেট (স্পেক সেকশন ১২ ও ৬১)
// রেটের মানে: ১ একক fromCode = rate একক toCode (যেমন USD→BDT = 120)

type Num = number | string | Prisma.Decimal;

// তারিখ থেকে সময় বাদ দিয়ে শুধু দিন রাখে (ExchangeRate.rateDate হলো @db.Date)
export function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

// নির্দিষ্ট দিনে (বা তার আগের সবচেয়ে কাছের দিনে) from→to রেট।
// সরাসরি রেট না থাকলে উল্টো রেট (to→from) থেকে 1 ÷ রেট হিসাব করে।
export async function getRate(fromCode: string, toCode: string, date: Date = new Date()) {
  const from = fromCode.trim().toUpperCase();
  const to = toCode.trim().toUpperCase();
  const day = toDateOnly(date);

  if (from === to) return { rate: new Prisma.Decimal(1), rateDate: day };

  const [direct, inverse] = await Promise.all([
    prisma.exchangeRate.findFirst({
      where: { fromCode: from, toCode: to, rateDate: { lte: day } },
      orderBy: { rateDate: "desc" },
    }),
    prisma.exchangeRate.findFirst({
      where: { fromCode: to, toCode: from, rateDate: { lte: day } },
      orderBy: { rateDate: "desc" },
    }),
  ]);

  // দুটো থাকলে যেটার তারিখ নতুন সেটা, সমান হলে সরাসরিটা
  if (direct && (!inverse || direct.rateDate >= inverse.rateDate)) {
    return { rate: new Prisma.Decimal(direct.rate), rateDate: direct.rateDate };
  }
  if (inverse) {
    return { rate: new Prisma.Decimal(1).div(inverse.rate), rateDate: inverse.rateDate };
  }
  throw new BusinessRuleError(
    `NO_EXCHANGE_RATE: No exchange rate found for ${from} to ${to} on or before ${day.toISOString().slice(0, 10)}. Add one first.`
  );
}

// রেট জমা (একই from/to/তারিখে থাকলে আপডেট)। user দিলে audit লেখা হয়।
export async function saveRate(
  input: { fromCode: string; toCode: string; rate: Num; rateDate: Date; source?: string },
  user?: SessionUser
) {
  const fromCode = input.fromCode.trim().toUpperCase();
  const toCode = input.toCode.trim().toUpperCase();
  if (fromCode === toCode) {
    throw new BusinessRuleError("From and To currency must be different");
  }

  let rate: Prisma.Decimal;
  try {
    rate = new Prisma.Decimal(input.rate);
  } catch {
    throw new BusinessRuleError("Rate must be a number");
  }
  if (!rate.isFinite() || rate.lte(0)) {
    throw new BusinessRuleError("Rate must be greater than zero");
  }

  const rateDate = toDateOnly(input.rateDate);
  const where = { fromCode_toCode_rateDate: { fromCode, toCode, rateDate } };
  const before = await prisma.exchangeRate.findUnique({ where });

  const row = await prisma.exchangeRate.upsert({
    where,
    update: { rate, source: input.source ?? "MANUAL", createdById: user?.id },
    create: {
      fromCode,
      toCode,
      rate,
      rateDate,
      source: input.source ?? "MANUAL",
      createdById: user?.id,
    },
  });

  if (user) {
    await writeAudit({
      user,
      action: before ? "UPDATE" : "CREATE",
      entity: "ExchangeRate",
      entityId: row.id,
      before,
      after: row,
    });
  }
  return row;
}

// কোম্পানির বেস মুদ্রা (Company.currency, ডিফল্ট BDT)
export async function getBaseCurrency(companyId: string): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { currency: true },
  });
  if (!company) throw new BusinessRuleError("Company not found");
  return company.currency;
}

// যেকোনো মুদ্রার টাকার অঙ্ক বেস মুদ্রায় রূপান্তর করে ওই মুহূর্তের রেটসহ ফেরত দেয়।
// Order, Costing, PO, Quotation এটা দিয়ে নিজের baseCurrency/exchangeRate/rateDate/base...Amount বসায়।
export async function snapshotMoney(input: {
  amount: Num;
  currency: string;
  companyId: string;
  date?: Date;
}) {
  const baseCurrency = await getBaseCurrency(input.companyId);
  const { rate, rateDate } = await getRate(input.currency, baseCurrency, input.date ?? new Date());
  return {
    baseCurrency,
    exchangeRate: rate,
    rateDate,
    baseAmount: new Prisma.Decimal(input.amount).mul(rate).toDecimalPlaces(4),
  };
}