import { APL, AuthData } from "@saleor/app-sdk/APL";
import { Request } from "retes";
import { toNextHandler } from "retes/adapter";
import { withMethod } from "retes/middleware";
import { Response } from "retes/response";
import { saleorApp } from "../../../saleor-app";

interface GetAppIdProperties {
  saleorApiUrl: string;
  token: string;
}

type GetIdResponseType = {
  data?: {
    app?: {
      id: string;
    };
  };
};

type MaybePromise<T> = T | PromiseLike<T>;
type MiddlewareHandler = (request: Request) => MaybePromise<Response>;

const getAppId = async ({
  saleorApiUrl,
  token,
}: GetAppIdProperties): Promise<string | undefined> => {
  try {
    const response = await fetch(saleorApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
          {
            app{
              id
            }
          }
          `,
      }),
    });

    if (response.status !== 200) {
      return undefined;
    }
    const body = (await response.json()) as GetIdResponseType;
    const appId = body.data?.app?.id;

    return appId;
  } catch (e) {
    return undefined;
  }
};

const createRegisterHandlerResponseBody = (
  success?: boolean,
  error?: { code: string; message: string } | undefined
) => ({
  success,
  error,
});

const handleHookError = (error: unknown) => {
  if (error instanceof RegisterCallbackError) {
    return new Response(
      createRegisterHandlerResponseBody(false, {
        code: "REGISTER_HANDLER_HOOK_ERROR",
        message: error.message,
      }),
      { status: error.status }
    );
  }
  return Response.InternalServerError("Error during app installation");
};

const RegisterCallbackError = class extends Error {
  status: number;
  constructor(errorParams: { message: string | undefined; status: number }) {
    super(errorParams.message);
    this.status = 500;
    if (errorParams.status) {
      this.status = errorParams.status;
    }
  }
};

const createCallbackError = (params: { message: string | undefined; status: number }) => {
  throw new RegisterCallbackError(params);
};

const withAuthTokenRequired =
  (handler: MiddlewareHandler): MiddlewareHandler =>
  async (request: Request): Promise<Response> => {
    const authToken = request.params.auth_token;

    if (!authToken) {
      // debug("Found missing authToken param");
      return Response.BadRequest({
        success: false,
        message: "Missing auth token.",
      });
    }
    return handler(request);
  };

const createAppRegisterHandler = ({
  apl,
  // allowedSaleorUrls,
  onRequestStart,
}: {
  apl: APL;
  // allowedSaleorUrls: string[];
  onRequestStart?: (
    req: Request,
    context: {
      authToken: string;
      saleorApiUrl: string;
      saleorDomain: string;
      respondWithError: (params: any) => void;
    }
  ) => Promise<void>;
}) => {
  const baseHandler: MiddlewareHandler = async (request: Request): Promise<Response> => {
    // debug2("Request received");
    const authToken = request.params.auth_token;
    const saleorDomain = String(process.env.SALEOR_API_DOMAIN);
    const saleorApiUrl = String(process.env.SALEOR_API_URL);

    if (onRequestStart) {
      // debug2('Calling "onRequestStart" hook');
      try {
        await onRequestStart(request, {
          authToken,
          saleorApiUrl,
          saleorDomain,
          respondWithError: createCallbackError,
        });
      } catch (e) {
        // debug2('"onRequestStart" hook thrown error: %o', e);
        return handleHookError(e);
      }
    }
    /*
     * if (!validateAllowSaleorUrls(saleorApiUrl, allowedSaleorUrls)) {
     *   // debug2("Validation of URL %s against allowSaleorUrls param resolves to false, throwing");
     *   return Response.Forbidden(
     *     createRegisterHandlerResponseBody(false, {
     *       code: "SALEOR_URL_PROHIBITED",
     *       message: "This app expects to be installed only in allowed saleor instances",
     *     })
     *   );
     * }
     */
    const { configured: aplConfigured } = await apl.isConfigured();

    if (!aplConfigured) {
      // debug2("The APL has not been configured");
      return new Response(
        createRegisterHandlerResponseBody(false, {
          code: "APL_NOT_CONFIGURED",
          message: "APL_NOT_CONFIGURED. App is configured properly. Check APL docs for help.",
        }),
        {
          status: 503,
        }
      );
    }
    return Response.OK(createRegisterHandlerResponseBody(true));
  };

  return toNextHandler([withMethod("POST"), withAuthTokenRequired, baseHandler]);
};

// Assuming you have the necessary imports and definitions...
const myCreateAppRegisterHandler = createAppRegisterHandler({
  apl: saleorApp.apl,
  // allowedSaleorUrls: [String(process.env.SALEOR_API_DOMAIN)], // Add this line. Modify as per your requirement
  onRequestStart: async (
    request: Request,
    context: { saleorDomain: string; authToken: string; saleorApiUrl: string }
  ): Promise<void> => {
    /*
     * This function will be called when Auth APL is saved
     * Add more logic as needed...
     */
    if (context.saleorDomain && context.authToken && context.saleorApiUrl) {
      const appId = String(
        await getAppId({
          saleorApiUrl: String(process.env.SALEOR_API_URL),
          token: context.authToken,
        })
      );

      const authData: AuthData = {
        domain: String(process.env.SALEOR_API_DOMAIN),
        token: context.authToken,
        saleorApiUrl: String(process.env.SALEOR_API_URL),
        appId: appId,
        jwks: await (async () => {
          const response = await fetch(
            `${String(process.env.SALEOR_API_DOMAIN)}/.well-known/jwks.json`
          );

          if (!response.ok) throw new Error("Network response was not ok");
          const data = await response.json();

          return JSON.stringify(data);
        })(),
      };

      return saleorApp.apl.set(authData);
    }
    return new Promise(() => {});
  },
});

export default myCreateAppRegisterHandler;

// import { createAppRegisterHandler } from "@saleor/app-sdk/handlers/next";

// import { saleorApp } from "../../../saleor-app";

// const allowedUrlsPattern = process.env.ALLOWED_DOMAIN_PATTERN;

// /**
//  * Required endpoint, called by Saleor to install app.
//  * It will exchange tokens with app, so saleorApp.apl will contain token
//  */
// export default createAppRegisterHandler({
//   apl: saleorApp.apl,
//   /**
//    * Prohibit installation from Saleors other than specified by the regex.
//    * Regex source is ENV so if ENV is not set, all installations will be allowed.
//    */
//   // allowedSaleorUrls: [
//   //   (url) => {
//   //     if (allowedUrlsPattern) {
//   //       const regex = new RegExp(allowedUrlsPattern);

/*
 *   //       return regex.test(url);
 *   //     }
 */

/*
 *   //     return true;
 *   //   },
 *   // ],
 * });
 */
