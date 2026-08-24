import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../lib/errors";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;

    const sales = await prisma.sale.findMany({
      where: {
        customerId,
        createdAt: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      include: { customer: true, user: { select: { name: true } }, items: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(sales);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const sale = await prisma.sale.findUniqueOrThrow({
      where: { id: Number(req.params.id) },
      include: { customer: true, user: { select: { name: true } }, items: { include: { part: true } } },
    });
    res.json(sale);
  })
);

const itemSchema = z.object({
  partId: z.number().int(),
  quantity: z.number().int().positive(),
});

const createSchema = z.object({
  customerId: z.number().int().optional().nullable(),
  items: z.array(itemSchema).min(1),
  taxRate: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  paymentMethod: z.enum(["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "OTHER"]).default("CASH"),
});

async function nextInvoiceNumber(): Promise<string> {
  const count = await prisma.sale.count();
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count + 1).padStart(5, "0")}`;
}

// Creates a POS sale: validates stock, decrements it, logs stock movements, and
// records the invoice in a single transaction so partial sales can't happen.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);

    const parts = await prisma.part.findMany({ where: { id: { in: data.items.map((i) => i.partId) } } });
    const partMap = new Map(parts.map((p) => [p.id, p]));

    let subtotal = 0;
    for (const item of data.items) {
      const part = partMap.get(item.partId);
      if (!part) throw ApiError.badRequest(`Part ${item.partId} not found`);
      if (part.quantity < item.quantity) {
        throw ApiError.badRequest(`Insufficient stock for "${part.name}" (available: ${part.quantity})`);
      }
      subtotal += part.sellingPrice * item.quantity;
    }

    const taxAmount = (subtotal - data.discount) * (data.taxRate / 100);
    const total = subtotal - data.discount + taxAmount;
    const invoiceNumber = await nextInvoiceNumber();

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: data.customerId ?? undefined,
          userId: req.user!.id,
          subtotal,
          taxRate: data.taxRate,
          taxAmount,
          discount: data.discount,
          total,
          paymentMethod: data.paymentMethod,
          items: {
            create: data.items.map((item) => {
              const part = partMap.get(item.partId)!;
              return {
                partId: item.partId,
                quantity: item.quantity,
                unitPrice: part.sellingPrice,
                lineTotal: part.sellingPrice * item.quantity,
              };
            }),
          },
        },
        include: { items: { include: { part: true } }, customer: true },
      });

      for (const item of data.items) {
        await tx.part.update({ where: { id: item.partId }, data: { quantity: { decrement: item.quantity } } });
        await tx.stockMovement.create({
          data: {
            partId: item.partId,
            type: "OUT",
            quantity: item.quantity,
            reason: `Sale ${invoiceNumber}`,
            userId: req.user!.id,
          },
        });
      }

      return created;
    });

    res.status(201).json(sale);
  })
);

// Void a sale and restock its items (admin/manager only).
router.post(
  "/:id/void",
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const sale = await prisma.sale.findUniqueOrThrow({ where: { id }, include: { items: true } });
    if (sale.status !== "COMPLETED") throw ApiError.badRequest("Only completed sales can be voided");

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        await tx.part.update({ where: { id: item.partId }, data: { quantity: { increment: item.quantity } } });
        await tx.stockMovement.create({
          data: {
            partId: item.partId,
            type: "IN",
            quantity: item.quantity,
            reason: `Void sale ${sale.invoiceNumber}`,
            userId: req.user!.id,
          },
        });
      }
      return tx.sale.update({ where: { id }, data: { status: "VOID" } });
    });

    res.json(updated);
  })
);

export default router;
