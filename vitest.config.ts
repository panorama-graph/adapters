import { defineConfig } from "vitest/config";

// Só os testes dos adaptadores: o example-seed é outro projeto, com os próprios testes.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
  },
});
