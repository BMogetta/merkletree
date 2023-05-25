import main  from "./main.ts";

Deno.bench(async function verifyMerkleProofWithOrder() {
  await main(10000, false)
});
