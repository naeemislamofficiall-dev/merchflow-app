import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type DecimalInput = string | number | Prisma.Decimal;
const D = (v: DecimalInput) => new Prisma.Decimal(v);

export type MoneySnapshot = {
  amount: Prisma.Decimal;
  currency: string;
  baseCurrency: string;
  exchangeRate: Prisma.Decimal;
  rateDate: Date;
  baseAmount: Prisma.Decimal;
};

// সময়ের অংশ বাদ দিয়ে শুধু তারিখ রাখে (রেট-এর তারিখ @db.Date)
export function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

// Company-র base currency (Company.currency)
export async function getBaseCurrency(companyId: string): Promise<string> {
  const c = await prisma.company.findUnique({
    where: { id: companyId },
    select: { currency: true },
  });
  if (!c) throw new Error("Company not found");
  return c.currency;
}

// ওই তারিখের বা তার আগের সবচেয়ে নতুন রেট। সরাসরি না পেলে উল্টো রেট থেকে বের করে
export async function getRate(from: string, to: string, date: Date = new Date()) {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  const day = toDateOnly(date);

  if (f === t) return { rate: D(1), rateDate: day };

  const direct = await prisma.exchangeRate.findFirst({
    where: { fromCode: f, toCode: t, rateDate: { lte: day } },
    orderBy: { rateDate: "desc" },
  });
  if (direct) return { rate: D(direct.rate.toString()), rateDate: direct.rateDate };

  const inverse = await prisma.exchangeRate.findFirst({
    where: { fromCode: t, toCode: f, rateDate: { lte: day } },
    orderBy: { rateDate: "desc" },
  });
  if (inverse) {
    return { rate: D(1).div(D(inverse.rate.toString())), rateDate: inverse.rateDate };
  }

  throw new Error(`NO_EXCHANGE_RATE: ${f}->${t} on/before ${day.toISOString().slice(0, 10)}`);
}

/**
 * লেনদেন সেভ করার সময় একবার ডাকো, ফলাফল row-তে রেখে দাও।
 * পুরনো লেনদেন কখনো আজকের রেট দিয়ে আবার হিসাব করা যাবে না (সেকশন ৬১)।
 *
 * ব্যবহার (PO-র উদাহরণ):
 *   const s = await snapshotMoney({ amount: total, currency: po.currency, companyId });
 *   data: { baseCurrency: s.baseCurrency, exchangeRate: s.exchangeRate,
 *           rateDate: s.rateDate, baseTotal: s.baseAmount }
 */
export async function snapshotMoney(input: {
  amount: DecimalInput;
  currency: string;
  companyId: string;
  date?: Date;
}): Promise<MoneySnapshot> {
  const baseCurrency = await getBaseCurrency(input.companyId);
  const { rate, rateDate } = await getRate(input.currency, baseCurrency, input.date);

  const cur = await prisma.currency.findUnique({ where: { code: baseCurrency } });
  const decimals = cur?.decimals ?? 2;

  const amount = D(input.amount);
  return {
    amount,
    currency: input.currency.toUpperCase(),
    baseCurrency,
    exchangeRate: rate,
    rateDate,
    baseAmount: amount.mul(rate).toDecimalPlaces(decimals),
  };
}

// রেট সেভ (একই জোড়া ও তারিখে থাকলে আপডেট) আর Audit-এ লেখা
export async function saveRate(input: {
  fromCode: string;
  toCode: string;
  rate: number | string;
  rateDate: Date;
  userId?: string;
}) {
  const fromCode = input.fromCode.toUpperCase();
  const toCode = input.toCode.toUpperCase();

  if (!/^[A-Z]{3}$/.test(fromCode) || !/^[A-Z]{3}$/.test(toCode)) {
    throw new Error("Currency code must be 3 letters");
  }
  if (fromCode === toCode) throw new Error("From and To currency must differ");
  const rate = D(input.rate);
  if (!rate.gt(0)) throw new Error("Rate must be greater than zero");

  const rateDate = toDateOnly(input.rateDate);
  const key = { fromCode_toCode_rateDate: { fromCode, toCode, rateDate } };
  const existing = await prisma.exchangeRate.findUnique({ where: key });

  const row = await prisma.exchangeRate.upsert({
    where: key,
    update: { rate, createdById: input.userId ?? null },
    create: { fromCode, toCode, rate, rateDate, createdById: input.userId ?? null },
  });

  await prisma.auditLog.create({
    data: {
      actorId: input.userId ?? null,
      action: "EXCHANGE_RATE_SAVED",
      entity: "ExchangeRate",
      entityId: row.id,
      before: existing ? { rate: existing.rate.toString() } : undefined,
      after: { fromCode, toCode, rate: rate.toString(), rateDate: rateDate.toISOString() },
    },
  });

  return row;
}

export async function listRates(take = 50) {
  return prisma.exchangeRate.findMany({
    orderBy: [{ rateDate: "desc" }, { fromCode: "asc" }],
    take,
  });
}

export async function listCurrencies() {
  return prisma.currency.findMany({ where: { isActive: true }, orderBy: { code: "asc" } });
}