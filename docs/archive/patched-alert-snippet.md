# Certificate expiry -> Alerts page

File: src/services/alert.service.ts

`return alerts` er THEEK AGE (Line overloaded loop-er pore) ei block ta paste korun:

```ts
    // Certificate expired (HIGH) ba 30 diner moddhe expire hobe (MEDIUM)
    {
      const horizon = new Date(today.getTime() + 30 * 86_400_000);
      const certs = await prisma.certificate.findMany({
        where: { companyId: user.companyId, expiryDate: { lt: horizon } },
        select: { id: true, typeId: true, expiryDate: true },
        orderBy: { expiryDate: "asc" },
        take: 200,
      });
      const types = await prisma.certificateType.findMany({
        where: { id: { in: certs.map((c) => c.typeId).filter((x): x is string => !!x) } },
        select: { id: true, code: true },
      });
      const typeCode = new Map(types.map((t) => [t.id, t.code]));
      for (const c of certs) {
        if (!c.expiryDate) continue;
        const expired = c.expiryDate < today;
        const label = (c.typeId && typeCode.get(c.typeId)) || "Certificate";
        alerts.push({
          id: `cert:${c.id}`,
          severity: expired ? "HIGH" : "MEDIUM",
          category: "Compliance",
          title: expired ? "Certificate expired" : "Certificate expiring soon",
          message: `${label} ${expired ? "expired on" : "expires on"} ${c.expiryDate.toISOString().slice(0, 10)}`,
          href: "/compliance",
          entityType: "Certificate",
          entityId: c.id,
          since: c.expiryDate,
        });
      }
    }
```

Note:
- Ei block shudhu `Certificate.companyId / typeId / expiryDate` ar `CertificateType.code` use kore (apnar migration-er index theke ei field gulo nishchit).
- Certificate-er status (REVOKED/SUPERSEDED) filter kora nai: ami apnar schema dekhini. Schema pathale filter add kore dibo.
- `href: "/compliance"` page ta ami Step B-te apnar asol schema diye likhbo. Tar age link 404 dibe.
