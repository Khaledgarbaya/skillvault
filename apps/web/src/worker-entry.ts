import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { handleScanQueue } from "./lib/scan-queue/consumer";

const fetch = createStartHandler(defaultStreamHandler);

export default {
  fetch,
  queue: handleScanQueue,
};
