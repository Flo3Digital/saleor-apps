import { z } from "zod";
import { createLogger } from "../../lib/logger";
import { protectedClientProcedure } from "../trpc/protected-client-procedure";
import { router } from "../trpc/trpc-server";
import { AvataxClient } from "./avatax-client";
import { avataxConfigSchema, baseAvataxConfigSchema } from "./avatax-connection-schema";
import { AvataxAddressValidationService } from "./configuration/avatax-address-validation.service";
import { AvataxAuthValidationService } from "./configuration/avatax-auth-validation.service";
import { AvataxEditAddressValidationService } from "./configuration/avatax-edit-address-validation.service";
import { AvataxEditAuthValidationService } from "./configuration/avatax-edit-auth-validation.service";
import { PublicAvataxConnectionService } from "./configuration/public-avatax-connection.service";

const getInputSchema = z.object({
  id: z.string(),
});

const deleteInputSchema = z.object({
  id: z.string(),
});

const patchInputSchema = z.object({
  id: z.string(),
  value: avataxConfigSchema.deepPartial(),
});

const postInputSchema = z.object({
  value: avataxConfigSchema,
});

const protectedWithConnectionService = protectedClientProcedure.use(({ next, ctx }) =>
  next({
    ctx: {
      connectionService: new PublicAvataxConnectionService({
        appId: ctx.appId!,
        client: ctx.apiClient,
        saleorApiUrl: ctx.saleorApiUrl,
      }),
    },
  })
);

export const avataxConnectionRouter = router({
  verifyConnections: protectedWithConnectionService.query(async ({ ctx }) => {
    const logger = createLogger({
      name: "avataxConnectionRouter.verifyConnections",
    });

    logger.debug("Route verifyConnections called");

    await ctx.connectionService.verifyConnections();

    logger.info("Avatax connections were successfully verified");

    return { ok: true };
  }),
  getById: protectedWithConnectionService.input(getInputSchema).query(async ({ ctx, input }) => {
    const logger = createLogger({
      name: "avataxConnectionRouter.get",
    });

    logger.debug("Route get called");

    const result = await ctx.connectionService.getById(input.id);

    logger.info(`Avatax configuration with an id: ${result.id} was successfully retrieved`);

    return result;
  }),
  create: protectedWithConnectionService.input(postInputSchema).mutation(async ({ ctx, input }) => {
    const logger = createLogger({
      saleorApiUrl: ctx.saleorApiUrl,
      procedure: "avataxConnectionRouter.post",
    });

    logger.debug("Attempting to create configuration");

    const result = await ctx.connectionService.create(input.value);

    logger.info("Avatax configuration was successfully created");

    return result;
  }),
  delete: protectedWithConnectionService
    .input(deleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const logger = createLogger({
        saleorApiUrl: ctx.saleorApiUrl,
        procedure: "avataxConnectionRouter.delete",
      });

      logger.debug("Route delete called");

      const result = await ctx.connectionService.delete(input.id);

      logger.info(`Avatax configuration with an id: ${input.id} was deleted`);

      return result;
    }),
  update: protectedWithConnectionService
    .input(patchInputSchema)
    .mutation(async ({ ctx, input }) => {
      const logger = createLogger({
        saleorApiUrl: ctx.saleorApiUrl,
        procedure: "avataxConnectionRouter.patch",
      });

      logger.debug("Route patch called");

      const result = await ctx.connectionService.update(input.id, input.value);

      logger.info(`Avatax configuration with an id: ${input.id} was successfully updated`);

      return result;
    }),
  /*
   * There are separate methods for address validation for edit and create
   * because some form values in the edit form can be obfuscated.
   * When calling the "editValidateAddress", we are checking if the credentials
   * are obfuscated. If they are, we use the stored credentials and mix them with
   * unobfuscated values from the form.
   */
  editValidateAddress: protectedClientProcedure
    .input(z.object({ value: avataxConfigSchema, id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const logger = createLogger({
        saleorApiUrl: ctx.saleorApiUrl,
        procedure: "avataxConnectionRouter.editValidateAddress",
      });

      logger.debug("Route called");

      const addressValidationService = new AvataxEditAddressValidationService({
        appId: ctx.appId!,
        client: ctx.apiClient,
        saleorApiUrl: ctx.saleorApiUrl,
      });

      const result = await addressValidationService.validate(input.id, input.value);

      logger.info(`Avatax address was successfully validated`);

      return result;
    }),
  createValidateAddress: protectedWithConnectionService
    .input(postInputSchema)
    .mutation(async ({ ctx, input }) => {
      const logger = createLogger({
        saleorApiUrl: ctx.saleorApiUrl,
        procedure: "avataxConnectionRouter.createValidateAddress",
      });

      logger.debug("Route called");

      const avataxClient = new AvataxClient(input.value);

      const addressValidation = new AvataxAddressValidationService(avataxClient);

      const result = await addressValidation.validate(input.value.address);

      logger.info(`Avatax address was successfully validated`);

      return result;
    }),
  /*
   * There are separate methods for credentials validation for edit and create
   * because some form values in the edit form can be obfuscated.
   * When calling the "editValidateCredentials", we are checking if the credentials
   * are obfuscated. If they are, we use the stored credentials and mix them with
   * unobfuscated values from the form.
   */
  editValidateCredentials: protectedClientProcedure
    .input(z.object({ value: baseAvataxConfigSchema, id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const logger = createLogger({
        saleorApiUrl: ctx.saleorApiUrl,
        procedure: "avataxConnectionRouter.validateAuth",
      });

      const authValidation = new AvataxEditAuthValidationService({
        appId: ctx.appId!,
        client: ctx.apiClient,
        saleorApiUrl: ctx.saleorApiUrl,
      });

      await authValidation.validate(input.id, input.value);

      logger.info(`Avatax client was successfully validated`);
    }),
  createValidateCredentials: protectedClientProcedure
    .input(z.object({ value: baseAvataxConfigSchema }))
    .mutation(async ({ ctx, input }) => {
      const logger = createLogger({
        saleorApiUrl: ctx.saleorApiUrl,
        procedure: "avataxConnectionRouter.createValidateAuth",
      });

      const avataxClient = new AvataxClient(input.value);

      const authValidation = new AvataxAuthValidationService(avataxClient);

      const result = await authValidation.validate();

      logger.info(`Avatax client was successfully validated`);

      return result;
    }),
});
