import { runIngestionPipeline } from "~/lib/pipeline/ingest";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  const startTime = Date.now();

  console.log("=".repeat(60));
  console.log(`[run-ingestion] Starting at ${new Date().toISOString()}`);
  console.log(`[run-ingestion] Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log("=".repeat(60));

  const result = await runIngestionPipeline({ dryRun });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("=".repeat(60));
  console.log(`[run-ingestion] Finished at ${new Date().toISOString()}`);
  console.log(`[run-ingestion] Duration: ${elapsed}s`);
  console.log(`[run-ingestion] Repos processed: ${result.totalRepos}`);
  console.log(`[run-ingestion] Issues processed: ${result.totalIssues}`);
  console.log(`[run-ingestion] Errors: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log("[run-ingestion] Error summary:");
    for (const error of result.errors.slice(0, 20)) {
      console.log(`  - ${error}`);
    }
    if (result.errors.length > 20) {
      console.log(`  ... and ${result.errors.length - 20} more`);
    }
  }

  console.log("=".repeat(60));
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error("[run-ingestion] Fatal error:", err);
    process.exit(1);
  });
