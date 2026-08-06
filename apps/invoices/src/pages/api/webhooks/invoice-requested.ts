import { NextWebhookApiHandler, SaleorAsyncWebhook } from "@saleor/app-sdk/handlers/next";
import { gql } from "urql";
import { saleorApp } from "../../../saleor-app";
import {
  InvoiceRequestedPayloadFragment,
  OrderPayloadFragment,
} from "../../../../generated/graphql";
import { SaleorInvoiceUploader } from "../../../modules/invoices/invoice-uploader/saleor-invoice-uploader";
import { InvoiceCreateNotifier } from "../../../modules/invoices/invoice-create-notifier/invoice-create-notifier";
import {
  InvoiceNumberGenerationStrategy,
  InvoiceNumberGenerator,
} from "../../../modules/invoices/invoice-number-generator/invoice-number-generator";
import { MicroinvoiceInvoiceGenerator } from "../../../modules/invoices/invoice-generator/microinvoice/microinvoice-invoice-generator";
import { hashInvoiceFilename } from "../../../modules/invoices/invoice-file-name/hash-invoice-filename";
import { resolveTempPdfFileLocation } from "../../../modules/invoices/invoice-file-name/resolve-temp-pdf-file-location";
import { createGraphQLClient, createLogger, Logger } from "@saleor/apps-shared";
import { SALEOR_API_URL_HEADER } from "@saleor/app-sdk/const";
import { GetAppConfigurationV2Service } from "../../../modules/app-configuration/schema-v2/get-app-configuration.v2.service";
import { ShopInfoFetcher } from "../../../modules/shop-info/shop-info-fetcher";
import { z } from "zod";
import {
  AddressV2Schema,
  AddressV2Shape,
} from "../../../modules/app-configuration/schema-v2/app-config-schema.v2";
import { ConfigV1ToV2MigrationService } from "../../../modules/app-configuration/schema-v2/config-v1-to-v2-migration.service";
import { shopInfoQueryToAddressShape } from "../../../modules/shop-info/shop-info-query-to-address-shape";

import * as Sentry from "@sentry/nextjs";
import { AppConfigV2 } from "../../../modules/app-configuration/schema-v2/app-config";
import { PdfLibInvoiceGenerator } from "../../../modules/invoices/invoice-generator/pdf-lib/pdfLibInvoiceGenerator";

const OrderPayload = gql`
  fragment Address on Address {
    id
    country {
      country
      code
    }
    companyName
    cityArea
    countryArea
    streetAddress1
    streetAddress2
    postalCode
    phone
    firstName
    lastName
    city
  }

  fragment Money on Money {
    amount
    currency
  }

  fragment TaxedMoney on TaxedMoney {
    currency
    gross {
      ...Money
    }
    net {
      ...Money
    }
    tax {
      ...Money
    }
  }

  fragment OrderPayload on Order {
    shippingPrice {
      ...TaxedMoney
    }
    shippingMethodName
    number
    userEmail
    id
    billingAddress {
      ...Address
    }
    shippingAddress {
      ...Address
    }
    created
    fulfillments {
      created
    }
    status
    number
    total {
      ...TaxedMoney
    }
    channel {
      slug
    }
    lines {
      productName
      variantName
      quantity
      totalPrice {
        ...TaxedMoney
      }
      variant {
        product {
          attributes {
            attribute {
              name
            }
            values {
              name
            }
          }
        }
      }
    }
    shippingPrice {
      ...TaxedMoney
    }
    shippingMethodName
    paymentStatusDisplay
  }
`;

export const InvoiceCreatedPayloadFragment = gql`
  ${OrderPayload}

  fragment InvoiceRequestedPayload on InvoiceRequested {
    invoice {
      id
    }
    order {
      ... on Order {
        ...OrderPayload
      }
    }
  }
`;

const InvoiceRequestedSubscription = gql`
  ${InvoiceCreatedPayloadFragment}

  subscription InvoiceRequested {
    event {
      ...InvoiceRequestedPayload
    }
  }
`;

export const invoiceRequestedWebhook = new SaleorAsyncWebhook<InvoiceRequestedPayloadFragment>({
  name: "Invoice requested",
  webhookPath: "api/webhooks/invoice-requested",
  event: "INVOICE_REQUESTED",
  apl: saleorApp.apl,
  query: InvoiceRequestedSubscription,
  onError(error, req, res) {
    const saleorApiUrl = req.headers[SALEOR_API_URL_HEADER] as string;

    const logger = createLogger({ domain: saleorApiUrl });

    logger.error(error);
  },
});

const invoiceNumberGenerator = new InvoiceNumberGenerator();

/**
 * Inline waitUntil helper.
 * Mirrors @vercel/functions: Vercel injects a request context via
 * Symbol.for("@vercel/request-context").  Calling ctx.waitUntil(promise)
 * extends the function lifetime until the promise settles.
 */
const waitUntil = (promise: Promise<unknown>) => {
  const reqContextSymbol = Symbol.for("@vercel/request-context");
  const reqContext = (globalThis as any)[reqContextSymbol]?.get?.();

  if (reqContext && typeof reqContext.waitUntil === "function") {
    console.log("[invoice-requested] waitUntil: enqueued via @vercel/request-context");
    reqContext.waitUntil(promise);
  } else {
    console.warn(
      "[invoice-requested] waitUntil: NO request context found. Background task may be terminated early."
    );
  }
};

const generateInvoice = async ({
  authData,
  order,
  invoiceName,
  orderId,
  logger,
}: {
  authData: { saleorApiUrl: string; token: string };
  order: OrderPayloadFragment;
  invoiceName: string;
  orderId: string;
  logger: Logger;
}) => {
  console.log(`[invoice-requested] generateInvoice STARTED for orderId=${orderId}`);

  try {
    console.log(
      `[invoice-requested] Creating GraphQL client for saleorApiUrl=${authData.saleorApiUrl}`
    );
    const client = createGraphQLClient({
      saleorApiUrl: authData.saleorApiUrl,
      token: authData.token,
    });

    console.log(`[invoice-requested] GraphQL client created OK`);

    console.log(
      `[invoice-requested] Calculating hashed invoice name for invoiceName=${invoiceName}, orderId=${orderId}`
    );
    const hashedInvoiceName = hashInvoiceFilename(invoiceName, orderId);

    console.log(`[invoice-requested] hashedInvoiceName=${hashedInvoiceName}`);

    const hashedInvoiceFileName = `${hashedInvoiceName}.pdf`;

    console.log(`[invoice-requested] Resolving temp PDF location for ${hashedInvoiceFileName}`);
    const tempPdfLocation = await resolveTempPdfFileLocation(hashedInvoiceFileName);

    console.log(`[invoice-requested] tempPdfLocation=${tempPdfLocation}`);

    Sentry.addBreadcrumb({
      message: "Calculated invoice file location",
      data: {
        invoiceFile: tempPdfLocation,
      },
      level: "debug",
    });

    console.log(`[invoice-requested] Fetching app configuration V2`);
    let appConfigV2 =
      (await new GetAppConfigurationV2Service({
        saleorApiUrl: authData.saleorApiUrl,
        apiClient: client,
      }).getConfiguration()) ?? new AppConfigV2();

    console.log(`[invoice-requested] App configuration fetched OK`);

    console.log(`[invoice-requested] Resolving address for channel=${order.channel.slug}`);
    const address: AddressV2Shape | null =
      appConfigV2.getChannelsOverrides()[order.channel.slug] ??
      (await new ShopInfoFetcher(client).fetchShopInfo().then(shopInfoQueryToAddressShape));

    console.log(`[invoice-requested] Resolved address=${address ? "YES" : "NO"}`);

    if (!address) {
      console.warn(
        `[invoice-requested] Address not configured for channel=${order.channel.slug}. Skipping invoice.`
      );
      Sentry.addBreadcrumb({
        message: "Address not configured",
        level: "debug",
      });

      logger.warn("Address not configured, skipping invoice generation");
      return;
    }

    console.log(`[invoice-requested] Starting PDF generation for invoice=${invoiceName}`);
    const PdfInvoiceGenerator = new PdfLibInvoiceGenerator();
    const fileUnit8Array = await PdfInvoiceGenerator.createPdf({
      order,
      invoiceNumber: invoiceName,
      filename: tempPdfLocation,
      companyAddressData: address,
    });

    console.log(
      `[invoice-requested] PDF generation completed. pdfBytes length=${fileUnit8Array.pdfBytes.length}`
    );

    Sentry.addBreadcrumb({
      message: "Generated invoice file",
      level: "debug",
    });

    console.log(`[invoice-requested] Starting upload to Saleor for ${invoiceName}.pdf`);
    const uploader = new SaleorInvoiceUploader(client);
    const uploadedFileUrl = await uploader.upload(fileUnit8Array.pdfBytes, `${invoiceName}.pdf`);

    console.log(`[invoice-requested] Upload completed. uploadedFileUrl=${uploadedFileUrl}`);

    Sentry.addBreadcrumb({
      message: "Uploaded file to Saleor",
      level: "debug",
    });

    logger.info("Uploaded file to storage, will notify Saleor now");
    logger.debug({ uploadedFileUrl });

    console.log(`[invoice-requested] Notifying Saleor invoice created for orderId=${orderId}`);
    await new InvoiceCreateNotifier(client).notifyInvoiceCreated(
      orderId,
      invoiceName,
      uploadedFileUrl
    );
    console.log(`[invoice-requested] Saleor notified OK for orderId=${orderId}`);

    Sentry.addBreadcrumb({
      message: "Notified Saleor about invoice creation",
      level: "debug",
      data: {
        orderId,
        invoiceName,
      },
    });

    console.log(`[invoice-requested] generateInvoice SUCCESS for orderId=${orderId}`);
    logger.info("Invoice generation completed successfully");
  } catch (e) {
    const errorMessage = (e as any)?.message ?? "Unknown error";
    const errorStack = (e as any)?.stack ?? "";

    console.error(
      `[invoice-requested] generateInvoice FAILED for orderId=${orderId}: ${errorMessage}`
    );
    console.error(`[invoice-requested] Stack trace: ${errorStack}`);
    logger.error(e, "Error during invoice generation");
    Sentry.captureException(e);
  }
};

/**
 * TODO
 * Refactor - extract smaller pieces
 * Test
 * More logs
 * Extract service
 */
export const handler: NextWebhookApiHandler<InvoiceRequestedPayloadFragment> = async (
  req,
  res,
  context
) => {
  console.log(`[invoice-requested] Handler STARTED for event INVOICE_REQUESTED`);

  const { authData, payload, baseUrl } = context;

  console.log(
    `[invoice-requested] Context: baseUrl=${baseUrl}, saleorApiUrl=${authData.saleorApiUrl}`
  );

  const logger = createLogger({ domain: authData.saleorApiUrl, url: baseUrl });

  Sentry.configureScope((s) => {
    s.setTag("saleorApiUrl", authData.saleorApiUrl);
  });

  const order = payload.order;

  console.log(
    `[invoice-requested] Order from payload: orderId=${order.id}, orderNumber=${order.number}, channel=${order.channel.slug}`
  );

  logger.info({ orderId: order.id }, "Received event INVOICE_REQUESTED");
  logger.debug(order, "Order from payload:");

  const orderId = order.id;

  const invoiceString = "LC";
  const createdDate = new Date(order.created);

  const add0 = (num: string) => {
    return num?.length < 2 ? `0${num}` : num;
  };

  const invoiceName =
    invoiceString +
    createdDate.getFullYear().toString() +
    "-" +
    add0(String(createdDate.getMonth() + 1)) +
    add0(createdDate.getDate().toString()) +
    "-" +
    order.number;

  console.log(`[invoice-requested] Generated invoiceName=${invoiceName} for orderId=${orderId}`);

  /*
   * Use Vercel waitUntil to keep the function alive after returning 200.
   * This prevents Saleor from retrying the webhook while the invoice is being generated.
   */
  console.log(`[invoice-requested] Calling waitUntil for background invoice generation`);
  waitUntil(generateInvoice({ authData, order, invoiceName, orderId, logger }));
  console.log(`[invoice-requested] waitUntil called, returning 200 to Saleor`);

  return res.status(200).end("Invoice generation started");
};

export default invoiceRequestedWebhook.createHandler(handler);

export const config = {
  api: {
    bodyParser: false,
  },
};
