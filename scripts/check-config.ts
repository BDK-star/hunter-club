import { config } from "dotenv";

import { parseServerEnvironment } from "../src/platform/config/server";

config({ path: ".env.local", quiet: true });
parseServerEnvironment(process.env);
process.stdout.write("Server environment is valid.\n");
