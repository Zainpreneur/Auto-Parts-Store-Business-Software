import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [todaySales, monthSales, partsCount, customersCount, allParts, recentSales] = await Promise.all([
      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfToday }, status: "COMPLETED" },
        _sum: { total: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: startOfMonth }, status: "COMPLETED" },
        _sum: { total: true },
        _count: true,
      }),
      prisma.part.count(),
      prisma.customer.count(),
      prisma.part.findMany({ select: { quantity: true, reorderLevel: true, costPrice: true } }),
      prisma.sale.findMany({
        where: { status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { customer: true, items: true },
      }),
    ]);

    const lowStockCount = allParts.filter((p) => p.quantity <= p.reorderLevel).length;
    const inventoryValue = allParts.reduce((sum, p) => sum + p.quantity * p.costPrice, 0);

    res.json({
      todayRevenue: todaySales._sum.total || 0,
      todayOrders: todaySales._count,
      monthRevenue: monthSales._sum.total || 0,
      monthOrders: monthSales._count,
      partsCount,
      customersCount,
      lowStockCount,
      inventoryValue,
      recentSales,
    });
  })
);

// Daily revenue for the last N days (default 14) for charting.
router.get(
  "/sales-trend",
  asyncHandler(async (req, res) => {
    const days = req.query.days ? Number(req.query.days) : 14;
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    since.setHours(0, 0, 0, 0);

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: since }, status: "COMPLETED" },
      select: { createdAt: true, total: true },
    });

    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const sale of sales) {
      const key = sale.createdAt.toISOString().slice(0, 10);
      buckets.set(key, (buckets.get(key) || 0) + sale.total);
    }

    res.json(Array.from(buckets.entries()).map(([date, revenue]) => ({ date, revenue })));
  })
);

router.get(
  "/top-parts",
  asyncHandler(async (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 5;
    const grouped = await prisma.saleItem.groupBy({
      by: ["partId"],
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    });
    const parts = await prisma.part.findMany({ where: { id: { in: grouped.map((g) => g.partId) } } });
    const partMap = new Map(parts.map((p) => [p.id, p]));
    res.json(
      grouped.map((g) => ({
        part: partMap.get(g.partId),
        quantitySold: g._sum.quantity || 0,
        revenue: g._sum.lineTotal || 0,
      }))
    );
  })
);

export default router;
