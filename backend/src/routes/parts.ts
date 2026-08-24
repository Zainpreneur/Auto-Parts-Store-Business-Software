import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../lib/errors";

const router = Router();
router.use(requireAuth);

// GET /api/parts?q=&categoryId=&supplierId=&lowStock=true&make=&model=&page=&pageSize=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string) || "";
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const supplierId = req.query.supplierId ? Number(req.query.supplierId) : undefined;
    const lowStock = req.query.lowStock === "true";
    const make = req.query.make as string | undefined;
    const model = req.query.model as string | undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Math.min(Number(req.query.pageSize), 100) : 25;

    const where: any = {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q } },
                { sku: { contains: q } },
                { brand: { contains: q } },
                { description: { contains: q } },
              ],
            }
          : {},
        categoryId ? { categoryId } : {},
        supplierId ? { supplierId } : {},
        make || model
          ? {
              fitments: {
                some: {
                  ...(make ? { make: { contains: make } } : {}),
                  ...(model ? { model: { contains: model } } : {}),
                },
              },
            }
          : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.part.findMany({
        where,
        include: { category: true, supplier: true, fitments: true },
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.part.count({ where }),
    ]);

    const filtered = lowStock ? items.filter((p) => p.quantity <= p.reorderLevel) : items;

    res.json({ items: filtered, total, page, pageSize });
  })
);

router.get(
  "/low-stock",
  asyncHandler(async (_req, res) => {
    const parts = await prisma.part.findMany({
      include: { category: true, supplier: true },
      orderBy: { quantity: "asc" },
    });
    res.json(parts.filter((p) => p.quantity <= p.reorderLevel));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const part = await prisma.part.findUniqueOrThrow({
      where: { id: Number(req.params.id) },
      include: { category: true, supplier: true, fitments: true },
    });
    res.json(part);
  })
);

const fitmentSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  yearFrom: z.number().int().optional(),
  yearTo: z.number().int().optional(),
});

const partSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  brand: z.string().optional(),
  categoryId: z.number().int().optional().nullable(),
  supplierId: z.number().int().optional().nullable(),
  costPrice: z.number().nonnegative().default(0),
  sellingPrice: z.number().nonnegative().default(0),
  quantity: z.number().int().nonnegative().default(0),
  reorderLevel: z.number().int().nonnegative().default(5),
  location: z.string().optional(),
  imageUrl: z.string().optional(),
  fitments: z.array(fitmentSchema).optional(),
});

router.post(
  "/",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = partSchema.parse(req.body);
    const { fitments, ...partData } = data;
    const part = await prisma.part.create({
      data: {
        ...partData,
        fitments: fitments ? { create: fitments } : undefined,
      },
      include: { fitments: true, category: true, supplier: true },
    });
    if (part.quantity > 0) {
      await prisma.stockMovement.create({
        data: { partId: part.id, type: "IN", quantity: part.quantity, reason: "Initial stock", userId: req.user!.id },
      });
    }
    res.status(201).json(part);
  })
);

router.patch(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = partSchema.partial().parse(req.body);
    const { fitments, ...partData } = data;

    const part = await prisma.$transaction(async (tx) => {
      if (fitments) {
        await tx.fitment.deleteMany({ where: { partId: id } });
        await tx.fitment.createMany({ data: fitments.map((f) => ({ ...f, partId: id })) });
      }
      return tx.part.update({
        where: { id },
        data: partData,
        include: { fitments: true, category: true, supplier: true },
      });
    });
    res.json(part);
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    await prisma.part.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

const adjustSchema = z.object({
  quantity: z.number().int(),
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  reason: z.string().optional(),
});

// Manual stock adjustment (damage, stock count correction, etc.)
router.post(
  "/:id/adjust-stock",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { quantity, type, reason } = adjustSchema.parse(req.body);

    const part = await prisma.part.findUniqueOrThrow({ where: { id } });
    const delta = type === "OUT" ? -Math.abs(quantity) : Math.abs(quantity);
    const newQuantity = type === "ADJUSTMENT" ? quantity : part.quantity + delta;
    if (newQuantity < 0) throw ApiError.badRequest("Resulting stock quantity cannot be negative");

    const [updated] = await prisma.$transaction([
      prisma.part.update({ where: { id }, data: { quantity: newQuantity } }),
      prisma.stockMovement.create({
        data: {
          partId: id,
          type,
          quantity: type === "ADJUSTMENT" ? newQuantity - part.quantity : delta,
          reason,
          userId: req.user!.id,
        },
      }),
    ]);
    res.json(updated);
  })
);

router.get(
  "/:id/stock-movements",
  asyncHandler(async (req, res) => {
    const movements = await prisma.stockMovement.findMany({
      where: { partId: Number(req.params.id) },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    });
    res.json(movements);
  })
);

export default router;
