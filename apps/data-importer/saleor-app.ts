/**
 * This file exports a `SaleorApp` instance that is initialized with an `APL` instance.
 * The `APL` instance is selected based on the value of the `APL` environment variable.
 *
 * The `APL` instances available are:
 * - `FileAPL`: stores auth data in a `.auth-data.json` file.
 * - `UpstashAPL`: stores auth data in Upstash.
 * - `RedisAPL`: stores auth data in Redis.
 * - `SaleorCloudAPL`: stores auth data in Saleor Cloud.
 *
 * The `SaleorApp` instance is exported as `saleorApp`.
 *
 * @see https://github.com/saleor/saleor-app-sdk/blob/main/docs/apl.md
 */
import { SaleorApp } from "@saleor/app-sdk/saleor-app";
import { APL, FileAPL, SaleorCloudAPL, UpstashAPL } from "@saleor/app-sdk/APL";
import { RedisAPL } from "./src/lib/APL/RedisAPL";
/**
 * By default auth data are stored in the `.auth-data.json` (FileAPL).
 * For multi-tenant applications and deployments please use UpstashAPL.
 *
 * To read more about storing auth data, read the
 * [APL documentation](https://github.com/saleor/saleor-app-sdk/blob/main/docs/apl.md)
 */

export let apl: APL;
switch (process.env.APL) {
  case "upstash":
    console.log("Using Upstash APL");
    // Require `UPSTASH_URL` and `UPSTASH_TOKEN` environment variables
    apl = new UpstashAPL();
    break;
  case "redis":
    console.log("Using Redis Upstash APL - (same but with Redis Upstash npm package)");
    // Require `UPSTASH_URL` and `UPSTASH_TOKEN` environment variables
    apl = new RedisAPL();
    break;
  case "saleor-cloud": {
    if (!process.env.REST_APL_ENDPOINT || !process.env.REST_APL_TOKEN) {
      throw new Error("Rest APL is not configured - missing env variables. Check saleor-app.ts");
    }

    apl = new SaleorCloudAPL({
      resourceUrl: process.env.REST_APL_ENDPOINT,
      token: process.env.REST_APL_TOKEN,
    });

    break;
  }
  default:
    apl = new FileAPL();
}

export const saleorApp = new SaleorApp({
  apl,
});
