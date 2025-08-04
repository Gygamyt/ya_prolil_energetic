import "dotenv/config";
import { readAndTrim } from "../src/sheets.ts";

async function main() {
    try {
        const rows = await readAndTrim("AQA Benchinfo");
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error("Error reading sheet:", err);
    }
}

main();
