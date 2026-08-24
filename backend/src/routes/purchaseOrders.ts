import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../lib/errors";

const router = Router();
router.use(requireAuth, requireRole("ADMIN", "MANAGER"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const orders = await prisma.purchaseOrder.findMany({
      where: status ? { status: status as any } : undefined,
      include: { supplier: true, items: { include: { part: true } } },
      orderBy: { orderDate: "desc" },
    });
    res.json(orders);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: Number(req.params.id) },
      include: { supplier: true, items: { include: { part: true } } },
    });
    res.json(order);
  })
);

const itemSchema = z.object({
  partId: z.number().int(),
  quantity: z.number().int().positive(),
  unitCost: z.number().nonnegative(),
});

const createSchema = z.object({
  supplierId: z.number().int(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const order = await prisma.purchaseOrder.create({
      data: {
        supplierId: data.supplierId,
        notes: data.notes,
        status: "ORDERED",
        items: { create: data.items },
      },
      include: { supplier: true, items: { include: { part: true } } },
    });
    res.status(201).json(order);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = createSchema.partial().parse(req.body);
    const order = await prisma.purchaseOrder.update({
      where: { id: Number(req.params.id) },
      data: { supplierId: data.supplierId, notes: data.notes },
      include: { supplier: true, items: { include: { part: true } } },
    });
    res.json(order);
  })
);

router.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const order = await prisma.purchaseOrder.update({
      where: { id: Number(req.params.id) },
      data: { status: "CANCELLED" },
    });
    res.json(order);
  })
);

// Marks a PO received, increases stock for each line item, and logs stock movements.
router.post(
  "/:id/receive",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const order = await prisma.purchaseOrder.findUniqueOrThrow({
      where: { id },
      include: { items: true },
    });
    if (order.status === "RECEIVED") throw ApiError.badRequest("Purchase order already received");
    if (order.status === "CANCELLED") throw ApiError.badRequest("Cannot receive a cancelled purchase order");

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.part.update({
          where: { id: item.partId },
          data: { quantity: { increment: item.quantity }, costPrice: item.unitCost },
        });
        await tx.stockMovement.create({
          data: {
            partId: item.partId,
            type: "IN",
            quantity: item.quantity,
            reason: `Received PO #${order.id}`,
            userId: req.user!.id,
          },
        });
      }
      return tx.purchaseOrder.update({
        where: { id },
        data: { status: "RECEIVED", receivedAt: new Date() },
        include: { supplier: true, items: { include: { part: true } } },
      });
    });

    res.json(updated);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.purchaseOrder.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

export default router;
