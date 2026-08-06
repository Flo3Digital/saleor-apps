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
 * Vercel Functions (Node.js and Edge) inject a global `waitUntil` that extends
 * the request lifetime until the passed Promise settles.  We call it directly
 * so we don’t need to add `@vercel/functions` as a dependency.
 */
const waitUntil = (promise: Promise<unknown>) => {
  const globalWaitUntil = (globalThis as any).waitUntil;

  if (typeof globalWaitUntil === "function") {
    globalWaitUntil(promise);
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
  try {
    const client = createGraphQLClient({
      saleorApiUrl: authData.saleorApiUrl,
      token: authData.token,
    });

    const hashedInvoiceName = hashInvoiceFilename(invoiceName, orderId);

    logger.debug({ hashedInvoiceName });

    const hashedInvoiceFileName = `${hashedInvoiceName}.pdf`;
    const tempPdfLocation = await resolveTempPdfFileLocation(hashedInvoiceFileName);

    logger.debug({ tempPdfLocation }, "Resolved PDF location for temporary files");

    Sentry.addBreadcrumb({
      message: "Calculated invoice file location",
      data: {
        invoiceFile: tempPdfLocation,
      },
      level: "debug",
    });

    let appConfigV2 =
      (await new GetAppConfigurationV2Service({
        saleorApiUrl: authData.saleorApiUrl,
        apiClient: client,
      }).getConfiguration()) ?? new AppConfigV2();

    const address: AddressV2Shape | null =
      appConfigV2.getChannelsOverrides()[order.channel.slug] ??
      (await new ShopInfoFetcher(client).fetchShopInfo().then(shopInfoQueryToAddressShape));

    if (!address) {
      Sentry.addBreadcrumb({
        message: "Address not configured",
        level: "debug",
      });

      logger.warn("Address not configured, skipping invoice generation");
      return;
    }

    const PdfInvoiceGenerator = new PdfLibInvoiceGenerator();
    const fileUnit8Array = await PdfInvoiceGenerator.createPdf({
      order,
      invoiceNumber: invoiceName,
      filename: tempPdfLocation,
      companyAddressData: address,
    });

    Sentry.addBreadcrumb({
      message: "Generated invoice file",
      level: "debug",
    });

    const uploader = new SaleorInvoiceUploader(client);

    const uploadedFileUrl = await uploader.upload(fileUnit8Array.pdfBytes, `${invoiceName}.pdf`);

    Sentry.addBreadcrumb({
      message: "Uploaded file to Saleor",
      level: "debug",
    });

    logger.info("Uploaded file to storage, will notify Saleor now");
    logger.debug({ uploadedFileUrl });

    await new InvoiceCreateNotifier(client).notifyInvoiceCreated(
      orderId,
      invoiceName,
      uploadedFileUrl
    );

    Sentry.addBreadcrumb({
      message: "Notified Saleor about invoice creation",
      level: "debug",
      data: {
        orderId,
        invoiceName,
      },
    });

    logger.info("Invoice generation completed successfully");
  } catch (e) {
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
  const { authData, payload, baseUrl } = context;
  const logger = createLogger({ domain: authData.saleorApiUrl, url: baseUrl });

  Sentry.configureScope((s) => {
    s.setTag("saleorApiUrl", authData.saleorApiUrl);
  });

  const order = payload.order;

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

  /*
   * Use Vercel waitUntil to keep the function alive after returning 200.
   * This prevents Saleor from retrying the webhook while the invoice is being generated.
   */
  waitUntil(generateInvoice({ authData, order, invoiceName, orderId, logger }));

  return res.status(200).end("Invoice generation started");
};

export default invoiceRequestedWebhook.createHandler(handler);

export const config = {
  api: {
    bodyParser: false,
  },
};
