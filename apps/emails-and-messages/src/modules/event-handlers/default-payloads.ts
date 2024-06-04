import { MessageEventTypes } from "./message-event-types";
import {
  OrderDetailsFragment,
  OrderCreatedWebhookPayloadFragment,
  OrderConfirmedWebhookPayloadFragment,
  OrderCancelledWebhookPayloadFragment,
  OrderFulfilledWebhookPayloadFragment,
  OrderFullyPaidWebhookPayloadFragment,
  InvoiceSentWebhookPayloadFragment,
  GiftCardSentWebhookPayloadFragment,
  OrderRefundedWebhookPayloadFragment,
} from "../../../generated/graphql";
import { NotifyEventPayload } from "../../pages/api/webhooks/notify";

const exampleOrderPayload: OrderDetailsFragment = {
  id: "T3JkZXI6NTdiNTBhNDAtYzRmYi00YjQzLWIxODgtM2JhZmRlMTc3MGQ5",
  number: "198",
  userEmail: "adrian.king@example.com",
  metadata: [
    {
      key: "metadata-example",
      value: "Example value",
    },
  ],
  privateMetadata: [
    {
      key: "private-metadata-example",
      value: "Example value for private metadata",
    },
  ],
  channel: {
    slug: "default-channel",
  },
  user: {
    email: "adrian.king@example.com",
    firstName: "Adrian",
    lastName: "King",
  },
  billingAddress: {
    streetAddress1: "59314 Mary Well Suite 281",
    streetAddress2: "",
    city: "METROPOLIS",
    postalCode: "71653",
    country: {
      country: "United States of America",
    },
  },
  shippingAddress: {
    streetAddress1: "59314 Mary Well Suite 281",
    streetAddress2: "",
    city: "METROPOLIS",
    postalCode: "71653",
    country: {
      country: "United States of America",
    },
  },
  lines: [
    {
      id: "T3JkZXJMaW5lOjNkNjc4OWE3LWUyNWItNDBlMi1iNjk2LTdmMzA0ZWFjOWI2OQ==",
      productName: "Black Hoodie",
      variantName: "XL",
      isShippingRequired: false,
      quantity: 1,
      thumbnail: {
        url: "https://placehold.jp/150x150.png",
        alt: "",
      },
      unitPrice: {
        gross: {
          currency: "USD",
          amount: 5,
        },
      },
      totalPrice: {
        gross: {
          currency: "USD",
          amount: 5,
        },
      },
      variant: {
        product: {
          attributes: [
            {
              values: [
                {
                  id: "QXR0cmlidXRlOjE=",
                  slug: "country",
                  file: {
                    url: "https://klsjdlfk",
                    contentType: null,
                  },
                  name: "France",
                },
              ],
              attribute: {
                id: "QXR0cmlidXRlOjE=",
                slug: "country",
                name: "Country",
              },
            },
            {
              values: [],
              attribute: {
                id: "QXR0cmlidXRlOjE=",
                slug: "brand",
                name: "Brand",
              },
            },
            {
              values: [
                {
                  name: "0.75",
                  id: "QXR0cmlidXRlOjE=",
                  slug: "country",
                  file: {
                    url: "https://klsjdlfk",
                    contentType: null,
                  },
                },
              ],
              attribute: {
                id: "QXR0cmlidXRlOjE=",
                slug: "size",
                name: "Size",
              },
            },
            {
              values: [
                {
                  name: "White",
                  id: "QXR0cmlidXRlOjE=",
                  slug: "country",
                  file: {
                    url: "https://klsjdlfk",
                    contentType: null,
                  },
                },
              ],
              attribute: {
                id: "QXR0cmlidXRlOjE=",
                slug: "type",
                name: "Type",
              },
            },
            {
              values: [],
              attribute: {
                id: "QXR0cmlidXRlOjE=",
                slug: "browse-by",
                name: "Browse By",
              },
            },
            {
              values: [
                {
                  name: "Jura",
                  id: "QXR0cmlidXRlOjE=",
                  slug: "country",
                  file: {
                    url: "https://klsjdlfk",
                    contentType: null,
                  },
                },
              ],
              attribute: {
                id: "QXR0cmlidXRlOjE=",
                slug: "region",
                name: "Region",
              },
            },
            {
              values: [
                {
                  name: "2018",
                  id: "QXR0cmlidXRlOjE=",
                  slug: "country",
                  file: {
                    url: "https://klsjdlfk",
                    contentType: null,
                  },
                },
              ],
              attribute: {
                name: "Vintage",
                id: "QXR0cmlidXRlOjE=",
                slug: "vintage",
              },
            },
          ],
          privateMetadata: [
            {
              key: "Service Charge Percentage To Customer",
              value: "6",
            },
          ],
        },
      },
      unitDiscount: {
        currency: "USD",
        amount: 5,
      },
      translatedVariantName: "",
      translatedProductName: "",
      quantityFulfilled: 0,
      quantityToFulfill: 0,
      taxRate: 0,
      unitDiscountValue: undefined,
    },
    {
      id: "T3JkZXJMaW5lOjVhYmEzMTBkLTZkMzEtNDNlNy1hZjAyLTdlNGUwM2UzYmI4ZA==",
      productName: "Code Division T-shirt",
      variantName: "L",
      quantity: 1,
      isShippingRequired: false,
      thumbnail: {
        url: "https://placehold.jp/150x150.png",
        alt: "",
      },
      unitPrice: {
        gross: {
          currency: "USD",
          amount: 5,
        },
      },
      totalPrice: {
        gross: {
          currency: "USD",
          amount: 5,
        },
      },
      variant: {
        product: {
          attributes: [
            {
              values: [
                {
                  name: "France",
                  id: "QXR0cmlidXRlOjE=",
                  slug: "country",
                  file: {
                    url: "https://klsjdlfk",
                    contentType: null,
                  },
                },
              ],
              attribute: {
                name: "Country",
                id: "QXR0cmlidXRlOjE=",
                slug: "country",
              },
            },
            {
              values: [],
              attribute: {
                name: "Brand",
                id: "QXR0cmlidXRlOjE=",
                slug: "brand",
              },
            },
            {
              values: [
                {
                  name: "0.75",
                  id: "QXR0cmlidXRlOjE=",
                  slug: "country",
                  file: {
                    url: "https://klsjdlfk",
                    contentType: null,
                  },
                },
              ],
              attribute: {
                name: "Size",
                id: "QXR0cmlidXRlOjE=",
                slug: "size",
              },
            },
            {
              values: [
                {
                  name: "White",
                  id: "QXR0cmlidXRlOjE=",
                  slug: "country",
                  file: {
                    url: "https://klsjdlfk",
                    contentType: null,
                  },
                },
              ],
              attribute: {
                name: "Type",
                id: "QXR0cmlidXRlOjE=",
                slug: "type",
              },
            },
            {
              values: [],
              attribute: {
                name: "Browse By",
                id: "QXR0cmlidXRlOjE=",
                slug: "browse-by",
              },
            },
            {
              values: [
                {
                  name: "Jura",
                  id: "QXR0cmlidXRlOjE=",
                  slug: "country",
                  file: {
                    url: "https://klsjdlfk",
                    contentType: null,
                  },
                },
              ],
              attribute: {
                name: "Region",
                id: "QXR0cmlidXRlOjE=",
                slug: "region",
              },
            },
            {
              values: [
                {
                  name: "2018",
                  id: "QXR0cmlidXRlOjE=",
                  slug: "country",
                  file: {
                    url: "https://klsjdlfk",
                    contentType: null,
                  },
                },
              ],
              attribute: {
                name: "Vintage",
                id: "QXR0cmlidXRlOjE=",
                slug: "vintage",
              },
            },
          ],
          privateMetadata: [
            {
              key: "Service Charge Percentage To Customer",
              value: "6",
            },
          ],
        },
      },
      unitDiscount: {
        currency: "USD",
        amount: 5,
      },
      translatedVariantName: "",
      translatedProductName: "",
      quantityFulfilled: 0,
      quantityToFulfill: 0,
      taxRate: 0,
      unitDiscountValue: undefined,
    },
  ],
  subtotal: {
    gross: {
      amount: 10,
      currency: "USD",
    },
  },
  shippingPrice: {
    gross: {
      amount: 61.62,
      currency: "USD",
    },
  },
  total: {
    gross: {
      amount: 71.62,
      currency: "USD",
    },
  },
};

const orderCreatedPayload: OrderCreatedWebhookPayloadFragment = {
  order: exampleOrderPayload,
};

const orderConfirmedPayload: OrderConfirmedWebhookPayloadFragment = {
  order: exampleOrderPayload,
};

const orderCancelledPayload: OrderCancelledWebhookPayloadFragment = {
  order: exampleOrderPayload,
};

const orderFulfilledPayload: OrderFulfilledWebhookPayloadFragment = {
  order: exampleOrderPayload,
};

const orderFullyPaidPayload: OrderFullyPaidWebhookPayloadFragment = {
  order: exampleOrderPayload,
};

const orderRefundedPayload: OrderRefundedWebhookPayloadFragment = {
  order: exampleOrderPayload,
};

const invoiceSentPayload: InvoiceSentWebhookPayloadFragment = {
  invoice: {
    id: "SW52b2ljZToxMDE=",
    metadata: [
      {
        key: "metadata-example",
        value: "Example value",
      },
    ],
    privateMetadata: [
      {
        key: "private-metadata-example",
        value: "Example value for private metadata",
      },
    ],
    message: null,
    externalUrl: null,
    url: "https://example.com/media/invoices/invoice-1032023-order-57b50a40-c4fb-4b43-b188-3bafde1770d9-fa968541-02fa-4317-b121-7205.pdf",
    order: {
      id: "T3JkZXI6NTdiNTBhNDAtYzRmYi00YjQzLWIxODgtM2JhZmRlMTc3MGQ5",
    },
  },
  order: exampleOrderPayload,
};

const accountConfirmationPayload: NotifyEventPayload = {
  user: {
    id: "VXNlcjoxOTY=",
    email: "user@example.com",
    first_name: "John",
    last_name: "Doe",
    is_staff: false,
    is_active: false,
    private_metadata: {},
    metadata: {},
    language_code: "en",
  },
  recipient_email: "user@example.com",
  token: "bmt4kc-d6e379b762697f6aa357527af36bb9f6",
  confirm_url:
    "http://example.com?email=user%40example.com&token=bmt4kc-d6e379b762697f6aa357527af36bb9f6",
  channel_slug: "default-channel",
  domain: "demo.saleor.cloud",
  site_name: "Saleor e-commerce",
  logo_url: "",
};

const accountPasswordResetPayload: NotifyEventPayload = {
  user: {
    id: "VXNlcjoxOTY=",
    email: "user@example.com",
    first_name: "John",
    last_name: "Doe",
    is_staff: false,
    is_active: false,
    private_metadata: {},
    metadata: {},
    language_code: "en",
  },
  recipient_email: "user@example.com",
  token: "bmt4kc-d6e379b762697f6aa357527af36bb9f6",
  reset_url:
    "http://example.com?email=user%40example.com&token=bmt4kc-d6e379b762697f6aa357527af36bb9f6",
  channel_slug: "default-channel",
  domain: "demo.saleor.cloud",
  site_name: "Saleor e-commerce",
  logo_url: "",
};

const accountChangeEmailRequestPayload: NotifyEventPayload = {
  user: {
    id: "VXNlcjoxOTY=",
    email: "user@example.com",
    first_name: "John",
    last_name: "Doe",
    is_staff: false,
    is_active: false,
    private_metadata: {},
    metadata: {},
    language_code: "en",
  },
  recipient_email: "user@example.com",
  token: "bmt4kc-d6e379b762697f6aa357527af36bb9f6",
  old_email: "test@example.com1",
  new_email: "new.email@example.com1",
  redirect_url:
    "http://example.com?email=user%40example.com&token=bmt4kc-d6e379b762697f6aa357527af36bb9f6",
  channel_slug: "default-channel",
  domain: "demo.saleor.cloud",
  site_name: "Saleor e-commerce",
  logo_url: "",
};

const accountChangeEmailConfirmPayload: NotifyEventPayload = {
  user: {
    id: "VXNlcjoxOTY=",
    email: "user@example.com",
    first_name: "John",
    last_name: "Doe",
    is_staff: false,
    is_active: false,
    private_metadata: {},
    metadata: {},
    language_code: "en",
  },
  recipient_email: "user@example.com",
  token: "bmt4kc-d6e379b762697f6aa357527af36bb9f6",
  channel_slug: "default-channel",
  domain: "demo.saleor.cloud",
  site_name: "Saleor e-commerce",
  logo_url: "",
};

const accountDeletePayload: NotifyEventPayload = {
  user: {
    id: "VXNlcjoxOTY=",
    email: "user@example.com",
    first_name: "John",
    last_name: "Doe",
    is_staff: false,
    is_active: false,
    private_metadata: {},
    metadata: {},
    language_code: "en",
  },
  recipient_email: "user@example.com",
  token: "bmt4kc-d6e379b762697f6aa357527af36bb9f6",
  delete_url:
    "http://example.com?email=user%40example.com&token=bmt4kc-d6e379b762697f6aa357527af36bb9f6",
  channel_slug: "default-channel",
  domain: "demo.saleor.cloud",
  site_name: "Saleor e-commerce",
  logo_url: "",
};

// TODO: UPDATE WITH BETTER DATA
const giftCardSentPayload: GiftCardSentWebhookPayloadFragment = {
  channel: "default_channel",
  sentToEmail: "user@example.com",
  giftCard: {
    code: "XXXX",
    metadata: [
      {
        key: "metadata-example",
        value: "Example value",
      },
    ],
    privateMetadata: [
      {
        key: "private-metadata-example",
        value: "Example value for private metadata",
      },
    ],
    tags: [],
    created: "2021-03-16T13:12:00+00:00",
    currentBalance: {
      amount: 100,
      currency: "USD",
    },
    id: "R2lmdENhcmQ6MjI=",
    initialBalance: {
      amount: 100,
      currency: "USD",
    },
    isActive: true,
    lastUsedOn: null,
    displayCode: "XXXX-XXXX-XXXX-XXXX",
    last4CodeChars: "XXXX",
    expiryDate: "2021-03-16T13:12:00+00:00",
    usedByEmail: null,
    usedBy: null,
  },
};

export const examplePayloads: Record<MessageEventTypes, any> = {
  ACCOUNT_CHANGE_EMAIL_CONFIRM: accountChangeEmailConfirmPayload,
  ACCOUNT_CHANGE_EMAIL_REQUEST: accountChangeEmailRequestPayload,
  ACCOUNT_CONFIRMATION: accountConfirmationPayload,
  ACCOUNT_DELETE: accountDeletePayload,
  ACCOUNT_PASSWORD_RESET: accountPasswordResetPayload,
  GIFT_CARD_SENT: giftCardSentPayload,
  INVOICE_SENT: invoiceSentPayload,
  ORDER_CANCELLED: orderCancelledPayload,
  ORDER_CONFIRMED: orderConfirmedPayload,
  ORDER_CREATED: orderCreatedPayload,
  ORDER_FULFILLED: orderFulfilledPayload,
  ORDER_FULLY_PAID: orderFullyPaidPayload,
  ORDER_REFUNDED: orderRefundedPayload,
};
