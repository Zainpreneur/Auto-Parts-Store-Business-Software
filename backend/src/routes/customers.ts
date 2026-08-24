import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string) || "";
    const customers = await prisma.customer.findMany({
      where: q
        ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] }
        : undefined,
      orderBy: { name: "asc" },
    });
    res.json(customers);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: Number(req.params.id) },
      include: { sales: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    res.json(customer);
  })
);

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const customer = await prisma.customer.create({ data });
    res.status(201).json(customer);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = schema.partial().parse(req.body);
    const customer = await prisma.customer.update({ where: { id: Number(req.params.id) }, data });
    res.json(customer);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.customer.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

export default router;
