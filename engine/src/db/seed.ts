import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await Bun.password.hash(
    process.env.ADMIN_PASSWORD || "admin123"
  );

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminPassword,
      name: "Administrator",
      role: "admin",
      isActive: true,
    },
  });

  console.log("Created admin user:", admin.username);

  // Create sample CS user
  const csPassword = await Bun.password.hash("cs123");

  const cs = await prisma.user.upsert({
    where: { username: "cs" },
    update: {},
    create: {
      username: "cs",
      passwordHash: csPassword,
      name: "Customer Service",
      role: "cs",
      isActive: true,
      csStatus: {
        create: {
          status: "offline",
          maxChats: 5,
          currentChats: 0,
        },
      },
    },
  });

  console.log("Created CS user:", cs.username);

  // Create sample canned responses
  const responses = [
    {
      title: "Greeting",
      content: "Hello! Welcome to HeraDesk. How can I help you?",
      shortcut: "/greeting",
      category: "General",
      isGlobal: true,
    },
    {
      title: "Thank You",
      content:
        "Thank you for contacting us. Is there anything else I can help you with?",
      shortcut: "/thanks",
      category: "General",
      isGlobal: true,
    },
    {
      title: "Wait",
      content:
        "Please wait a moment, I'm checking the information for you.",
      shortcut: "/wait",
      category: "General",
      isGlobal: true,
    },
  ];

  for (const response of responses) {
    await prisma.cannedResponse.create({
      data: response,
    });
  }

  console.log("Created canned responses");

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
