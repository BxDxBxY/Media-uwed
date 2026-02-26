const { PrismaClient } = require("@prisma/client");
console.log("--- DIAGNOSTIC START ---");
try {
  console.log("Instantiating PrismaClient with no arguments...");
  const prisma = new PrismaClient();
  console.log("PrismaClient instantiated.");

  console.log("Attempting count()...");
  prisma.article
    .count()
    .then((c) => console.log("Count Success:", c))
    .catch((e) => {
      console.error("Count Error");
      console.error("Message:", e.message);
      console.error("Stack:", e.stack);
    })
    .finally(() => {
      prisma.$disconnect().catch(() => {});
      console.log("--- DIAGNOSTIC END ---");
    });
} catch (e) {
  console.error("Constructor Error:", e.message);
  console.error("Stack:", e.stack);
}
