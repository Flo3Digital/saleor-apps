import { InvoiceGenerator } from "../invoice-generator";
import {
  Order,
  OrderPayloadFragment,
  OrderPayloadFragmentDoc,
} from "../../../../../generated/graphql";
import { SellerShopConfig } from "../../../app-configuration/schema-v1/app-config-v1";
import { AddressV2Shape } from "../../../app-configuration/schema-v2/app-config-schema.v2";
import { createClient, dedupExchange, cacheExchange, fetchExchange, gql } from "urql";
const Microinvoice = require("microinvoice");
const saleorApiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
const client = createClient({
  url: saleorApiUrl || "",
  exchanges: [dedupExchange, cacheExchange, fetchExchange],
});

const ORDER_QUERY = gql`
  query OrderDetail($id: ID!) {
    order(id: $id) {
      id
      userEmail
      paymentStatusDisplay
      shippingMethodName
      lines {
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
        productName
        quantity
        totalPrice {
          gross {
            amount
            currency
          }
        }
      }
    }
  }
`;

export class MicroinvoiceInvoiceGenerator implements InvoiceGenerator {
  constructor(
    private settings = {
      locale: "en-US",
    }
  ) {}
  async generate(input: {
    order: OrderPayloadFragment;
    invoiceNumber: string;
    filename: string;
    companyAddressData: AddressV2Shape;
  }): Promise<void> {
    const { invoiceNumber, order, companyAddressData, filename } = input;
    const response = await client.query(ORDER_QUERY, { id: order.id }).toPromise();
    const orderFromQuery = response.data?.order ? response.data.order : order;
    const getAttributeValue = (attributes: any[] | undefined, name: string) => {
      if (!attributes) {
        return "";
      }
      const selectAttribute = attributes.filter((each) => {
        return each?.attribute?.name === name;
      });

      if (selectAttribute.length > 0) {
        return selectAttribute[0]?.values[0]?.name;
      } else {
        return "";
      }
    };

    const microinvoiceInstance = new Microinvoice({
      style: {
        header: {
          image: {
            path: "/vercel.svg",
            width: 100,
            height: 38,
          },
        },
      },
      data: {
        invoice: {
          name: `Invoice ${invoiceNumber}`,

          header: [
            {
              label: "Order number",
              value: `${order.number}`,
            },
            {
              label: "Date",
              value: Intl.DateTimeFormat(this.settings.locale, {
                dateStyle: "medium",
                timeStyle: "medium",
              }).format(new Date(order.created)),
            },
          ],

          currency: order.total.currency,

          customer: [
            {
              label: "Customer",
              value: [
                `${order.billingAddress?.firstName} ${order.billingAddress?.lastName}`,
                `${orderFromQuery?.userEmail}`,
                order.billingAddress?.companyName,
                order.billingAddress?.phone,
                `${order.billingAddress?.streetAddress1}`,
                `${order.billingAddress?.streetAddress2}`,
                `${order.billingAddress?.postalCode} ${order.billingAddress?.city}`,
                order.billingAddress?.country.country,
              ],
            },
            {
              label: "PAYMENT STATUS",
              value: orderFromQuery?.paymentStatusDisplay,
            },
            {
              label: "SHIPMENT METHOD",
              value: orderFromQuery?.shippingMethodName,
            },
          ],

          seller: [
            {
              label: "Seller",
              value: [
                companyAddressData.companyName,
                companyAddressData.streetAddress1,
                companyAddressData.streetAddress2,
                `${companyAddressData.postalCode} ${companyAddressData.city}`,
                companyAddressData.cityArea,
                companyAddressData.country,
                companyAddressData.countryArea,
              ],
            },
            /*
             * {
             *   label: "Tax Identifier",
             *   value: "todo",
             * },
             */
          ],

          legal: [
            {
              value: "TERMS AND CONDITIONS",
              weight: "bold",
              color: "primary",
            },
            {
              value:
                "Opened original cases are non-refundable. Opened or damaged bottles are non refundable.",
              weight: "normal",
              color: "secondary",
            },
            {
              value: "All returns or refunds my be previously approved in writing by the Company.",
              weight: "normal",
              color: "secondary",
            },
            {
              value:
                "Customers are requested to examine the goods at the time of delivery. If any deficiency and/or breakage is noticed please let our authorized delivery person know at once.",
              weight: "normal",
              color: "secondary",
            },
            {
              value:
                "No claims can be made once our authorized delivery person is no more in contact with the delivery.",
              weight: "normal",
              color: "secondary",
            },
            {
              value: "All prices are in Hong Kong Dollars or otherwise indicated.",
              weight: "normal",
              color: "secondary",
            },
          ],
          details: {
            header: [
              {
                value: "Description",
              },
              {
                value: "Quantity",
              },
              {
                value: "Subtotal",
              },
            ],

            parts: [
              ...orderFromQuery?.lines?.map((line: any) => {
                return [
                  {
                    value: `${line?.productName} (Size - ${getAttributeValue(
                      line?.variant?.product?.attributes,
                      "Size"
                    )} , Vintage - ${getAttributeValue(
                      line?.variant?.product?.attributes,
                      "Vintage"
                    )})`,
                  },
                  {
                    value: line?.quantity,
                  },
                  {
                    value: line?.totalPrice?.gross?.amount,
                    price: true,
                  },
                ];
              }),
              [
                {
                  value: order.shippingMethodName,
                },
                {
                  value: "-",
                },
                {
                  value: order.shippingPrice.gross.amount,
                  price: true,
                },
              ],
            ],

            total: [
              {
                label: "Total net",
                value: order.total.net.amount,
                price: true,
              },
              {
                label: "Tax value",
                value: order.total.tax.amount,
                price: true,
              },
              {
                label: "Total with tax",
                value: order.total.gross.amount,
                price: true,
              },
            ],
          },
        },
      },
    });

    return microinvoiceInstance.generate(filename);
  }
}
