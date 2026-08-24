import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const cashierPassword = await bcrypt.hash("cashier123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@autoparts.local" },
    update: {},
    create: {
      name: "Store Admin",
      email: "admin@autoparts.local",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "cashier@autoparts.local" },
    update: {},
    create: {
      name: "Front Desk Cashier",
      email: "cashier@autoparts.local",
      passwordHash: cashierPassword,
      role: "CASHIER",
    },
  });

  const categories = await Promise.all(
    ["Engine", "Brakes", "Suspension", "Electrical", "Filters", "Body & Exterior"].map((name) =>
      prisma.category.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  const supplierA = await prisma.supplier.create({
    data: {
      name: "Global Auto Parts Distributors",
      contactName: "Jane Doe",
      email: "sales@gapd.example",
      phone: "+1-555-0100",
      address: "123 Industrial Ave, Detroit, MI",
    },
  });
  const supplierB = await prisma.supplier.create({
    data: {
      name: "Precision Brake Supply Co.",
      contactName: "Mike Chen",
      email: "orders@precisionbrake.example",
      phone: "+1-555-0142",
      address: "45 Commerce Blvd, Chicago, IL",
    },
  });

  const byName = (name: string) => categories.find((c) => c.name === name)!.id;

  const partsData = [
    {
      sku: "ENG-OIL-FLT-001",
      name: "Oil Filter - Standard",
      brand: "FilterMax",
      categoryId: byName("Filters"),
      supplierId: supplierA.id,
      costPrice: 3.5,
      sellingPrice: 8.99,
      quantity: 120,
      reorderLevel: 20,
      location: "A1-03",
      fitments: [
        { make: "Toyota", model: "Corolla", yearFrom: 2014, yearTo: 2020 },
        { make: "Toyota", model: "Camry", yearFrom: 2012, yearTo: 2019 },
      ],
    },
    {
      sku: "BRK-PAD-FR-010",
      name: "Front Brake Pads (Ceramic)",
      brand: "StopTech",
      categoryId: byName("Brakes"),
      supplierId: supplierB.id,
      costPrice: 18.0,
      sellingPrice: 42.99,
      quantity: 8,
      reorderLevel: 10,
      location: "B2-11",
      fitments: [{ make: "Honda", model: "Civic", yearFrom: 2016, yearTo: 2021 }],
    },
    {
      sku: "SUS-SHK-RR-005",
      name: "Rear Shock Absorber",
      brand: "RideRight",
      categoryId: byName("Suspension"),
      supplierId: supplierA.id,
      costPrice: 32.0,
      sellingPrice: 74.5,
      quantity: 15,
      reorderLevel: 5,
      location: "C1-02",
      fitments: [{ make: "Ford", model: "F-150", yearFrom: 2015, yearTo: 2020 }],
    },
    {
      sku: "ELE-BAT-12V-020",
      name: "12V Car Battery 60Ah",
      brand: "VoltPro",
      categoryId: byName("Electrical"),
      supplierId: supplierA.id,
      costPrice: 55.0,
      sellingPrice: 119.99,
      quantity: 25,
      reorderLevel: 6,
      location: "D3-01",
      fitments: [],
    },
    {
      sku: "ENG-SPK-PLG-030",
      name: "Iridium Spark Plug",
      brand: "SparkTech",
      categoryId: byName("Engine"),
      supplierId: supplierB.id,
      costPrice: 4.2,
      sellingPrice: 11.5,
      quantity: 4,
      reorderLevel: 15,
      location: "A2-07",
      fitments: [{ make: "Nissan", model: "Altima", yearFrom: 2013, yearTo: 2018 }],
    },
    {
      sku: "BDY-MIR-LH-002",
      name: "Left Side Mirror Assembly",
      brand: "ClearView",
      categoryId: byName("Body & Exterior"),
      supplierId: supplierA.id,
      costPrice: 22.0,
      sellingPrice: 48.0,
      quantity: 10,
      reorderLevel: 4,
      location: "E1-05",
      fitments: [{ make: "Toyota", model: "Corolla", yearFrom: 2014, yearTo: 2020 }],
    },
  ];

  for (const p of partsData) {
    const { fitments, ...rest } = p;
    const existing = await prisma.part.findUnique({ where: { sku: p.sku } });
    if (existing) continue;
    await prisma.part.create({
      data: { ...rest, fitments: { create: fitments } },
    });
  }

  const customer = await prisma.customer.create({
    data: { name: "Walk-in Customer", email: null, phone: null, address: null },
  });

  console.log("Seed complete.");
  console.log("---------------------------------------------");
  console.log("Admin login:   admin@autoparts.local / admin123");
  console.log("Cashier login: cashier@autoparts.local / cashier123");
  console.log("---------------------------------------------");
  void admin;
  void customer;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
