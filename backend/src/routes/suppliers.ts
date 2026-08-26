import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string) || "";
    const suppliers = await prisma.supplier.findMany({
      where: q ? { name: { contains: q } } : undefined,
      orderBy: { name: "asc" },
      include: { _count: { select: { parts: true, purchaseOrders: true } } },
    });
    res.json(suppliers);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: Number(req.params.id) } });
    res.json(supplier);
  })
);

const schema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
});

router.post(
  "/",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const supplier = await prisma.supplier.create({ data });
    res.status(201).json(supplier);
  })
);

router.patch(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = schema.partial().parse(req.body);
    const supplier = await prisma.supplier.update({ where: { id: Number(req.params.id) }, data });
    res.json(supplier);
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    await prisma.supplier.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

export default router;
