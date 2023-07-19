import { APL, AplConfiguredResult, AplReadyResult, AuthData } from "@saleor/app-sdk/APL";
import { Redis } from "@upstash/redis";

/**
 * RedisAPL implements the APL interface and provides methods for interacting with Redis.
 */
export class RedisAPL implements APL {
  restURL: string;
  restToken: string;
  redis: Redis;

  /**
   * Constructs a new RedisAPL instance.
   */
  constructor() {
    this.restURL = String(process.env.UPSTASH_URL);
    this.restToken = String(process.env.UPSTASH_TOKEN);
    this.redis = new Redis({
      url: this.restURL,
      token: this.restToken,
    });
  }
  /**
   * Gets the authentication data for a Saleor API URL.
   * @param saleorApiUrl - The Saleor API URL to get authentication data for.
   * @returns The authentication data for the Saleor API URL, or undefined if it does not exist.
   */
  async get(saleorApiUrl: string): Promise<AuthData | undefined> {
    const result: AuthData | null | undefined = await this.redis.get(saleorApiUrl);

    if (result?.domain && result?.token && result?.saleorApiUrl && result?.appId && result?.jwks) {
      return {
        domain: result.domain,
        token: result.token,
        saleorApiUrl: result.saleorApiUrl,
        appId: result.appId,
        jwks: result.jwks,
      };
    }
    return void 0;
  }

  /**
   * Sets the authentication data for a Saleor API URL.
   * @param authData - The authentication data to set.
   * @returns A Promise that resolves when the authentication data has been set.
   */
  async set(authData: AuthData): Promise<void> {
    console.log("authData in redis-apl file", authData);
    const data = JSON.stringify(authData);

    await this.redis.set(String(authData.saleorApiUrl), String(data));
  }

  /**
   * Deletes the authentication data for a Saleor API URL.
   * @param saleorApiUrl - The Saleor API URL to delete authentication data for.
   */
  async delete(saleorApiUrl: string): Promise<void> {
    await this.redis.del(saleorApiUrl);
  }

  /**
   * Gets all authentication data.
   * @returns An empty array.
   */
  async getAll() {
    return [];
  }

  /**
   * Checks if RedisAPL is ready.
   * @returns A Promise that resolves with an AplReadyResult object.
   */
  async isReady(): Promise<AplReadyResult> {
    return new Promise((resolve, reject) => {
      /*
       * your logic here...
       * if everything is ok:
       */
      resolve({ ready: true });
      // if there's an error:
      resolve({ ready: false, error: new Error("App Not Yet Ready") });
    });
  }

  /**
   * Checks if RedisAPL is configured.
   * @returns A Promise that resolves with an AplConfiguredResult object.
   */
  async isConfigured(): Promise<AplConfiguredResult> {
    return new Promise((resolve, reject) => {
      /*
       * your logic here...
       * if everything is ok:
       */
      resolve({ configured: true });
      // if there's an error:
      resolve({ configured: false, error: new Error("App Not Configured Correctly") });
    });
  }
}
