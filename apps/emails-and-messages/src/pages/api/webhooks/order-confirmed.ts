import { NextWebhookApiHandler, SaleorAsyncWebhook } from "@saleor/app-sdk/handlers/next";
import { gql } from "urql";
import { saleorApp } from "../../../saleor-app";
import { createLogger, createGraphQLClient } from "@saleor/apps-shared";
import {
  OrderConfirmedWebhookPayloadFragment,
  OrderDetailsFragmentDoc,
} from "../../../../generated/graphql";
import { sendEventMessages } from "../../../modules/event-handlers/send-event-messages";

const OrderConfirmedWebhookPayload = gql`
  ${OrderDetailsFragmentDoc}
  fragment OrderConfirmedWebhookPayload on OrderConfirmed {
    order {
      ...OrderDetails
    }
  }
`;

const OrderConfirmedGraphqlSubscription = gql`
  ${OrderConfirmedWebhookPayload}
  subscription OrderConfirmed {
    event {
      ...OrderConfirmedWebhookPayload
    }
  }
`;

export const orderConfirmedWebhook = new SaleorAsyncWebhook<OrderConfirmedWebhookPayloadFragment>({
  name: "Order Confirmed in Saleor",
  webhookPath: "api/webhooks/order-confirmed",
  asyncEvent: "ORDER_CONFIRMED",
  apl: saleorApp.apl,
  subscriptionQueryAst: OrderConfirmedGraphqlSubscription,
});

const logger = createLogger({
  name: orderConfirmedWebhook.webhookPath,
});

const ORDER_DETAILS_FRAGMENT = gql`
  fragment OrderDetailsFragment on Order {
    id
    number
    userEmail
    channel {
      slug
    }
    metadata {
      key
      value
    }
    privateMetadata {
      key
      value
    }
    user {
      email
      firstName
      lastName
    }
    billingAddress {
      streetAddress1
      city
      postalCode
      country {
        country
      }
    }
    shippingAddress {
      streetAddress1
      city
      postalCode
      country {
        country
      }
    }
    lines {
      id
      isShippingRequired
      productName
      variantName
      quantity
      variant {
        product {
          attributes {
            attribute {
              id
              name
              slug
            }
            values {
              id
              name
              slug
              file {
                url
                contentType
              }
            }
          }
          privateMetadata {
            key
            value
          }
        }
      }
      thumbnail {
        url
        alt
      }
      unitPrice {
        gross {
          currency
          amount
        }
      }
      totalPrice {
        gross {
          currency
          amount
        }
      }
      unitDiscount {
        amount
        currency
      }
      translatedVariantName
      translatedProductName

      metafields
      privateMetafields
      productSku
      productVariantId
      quantityFulfilled
      quantityToFulfill
      taxClassName
      taxRate
      unitDiscountReason
      unitDiscountType
      unitDiscountValue
    }
    subtotal {
      gross {
        amount
        currency
      }
    }
    shippingPrice {
      gross {
        amount
        currency
      }
    }
    total {
      gross {
        amount
        currency
      }
    }
  }
`;

const GET_ORDER_DETAILS_QUERY = gql`
  query GetOrderDetails($id: ID!) {
    order(id: $id) {
      ...OrderDetailsFragment
    }
  }
  ${ORDER_DETAILS_FRAGMENT}
`;

const handler: NextWebhookApiHandler<OrderConfirmedWebhookPayloadFragment> = async (
  req,
  res,
  context
) => {
  logger.debug("Webhook received");

  const { payload, authData } = context;
  const { order } = payload;

  if (!order) {
    logger.error("No order data payload");
    return res.status(200).end();
  }

  const recipientEmail = order.userEmail || order.user?.email;

  if (!recipientEmail?.length) {
    logger.error(`The order ${order.number} had no email recipient set. Aborting.`);
    return res
      .status(200)
      .json({ error: "Email recipient has not been specified in the event payload." });
  }

  const channel = order.channel.slug;
  const client = createGraphQLClient({
    saleorApiUrl: authData.saleorApiUrl,
    token: authData.token,
  });

  const getOrderDetails = async (id: string) => {
    const result = await client.query(GET_ORDER_DETAILS_QUERY, { id: id }).toPromise();

    const orderDetails = result.data.order;
    const variant = orderDetails?.variant ? orderDetails : {};

    return { ...order, variant: variant };
  };

  const orderWithFullDetails = await getOrderDetails(order.id);

  await sendEventMessages({
    authData,
    channel,
    client,
    event: "ORDER_CONFIRMED",
    payload: { order: orderWithFullDetails },
    recipientEmail,
  });

  return res.status(200).json({ message: "The event has been handled" });
};

export default orderConfirmedWebhook.createHandler(handler);

export const config = {
  api: {
    bodyParser: false,
  },
};
