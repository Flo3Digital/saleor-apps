import { createLogger, Logger } from "../../../lib/logger";
import { AvataxClient } from "../avatax-client";
import { AvataxValidationErrorResolver } from "./avatax-validation-error-resolver";

export class AvataxAuthValidationService {
  private logger: Logger;

  constructor(private avataxClient: AvataxClient) {
    this.logger = createLogger({
      name: "AvataxAuthValidationService",
    });
  }

  async validate() {
    try {
      const result = await this.avataxClient.ping();

      if (!result.authenticated) {
        throw new Error("Invalid Avatax credentials.");
      }
    } catch (error) {
      const errorResolver = new AvataxValidationErrorResolver();

      throw errorResolver.resolve(error);
    }
  }
}
