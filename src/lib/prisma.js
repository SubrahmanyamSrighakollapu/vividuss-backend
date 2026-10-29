const { PrismaClient } = require("@prisma/client");
const { transactions } = require("./publicationContext");
const client = new PrismaClient();
// Enabled mutation wrappers bind existing service helpers to ONE transaction.
// Off-mode queries do not touch any publication tables or new scalar columns.
module.exports = new Proxy(client, {
  get(target, key) {
    const tx = transactions.getStore();
    if (tx && key === "$transaction") return operation =>
      Array.isArray(operation) ? Promise.all(operation) : operation(tx);
    const owner = tx || target;
    const value = owner[key];
    return typeof value === "function" ? value.bind(owner) : value;
  },
});
