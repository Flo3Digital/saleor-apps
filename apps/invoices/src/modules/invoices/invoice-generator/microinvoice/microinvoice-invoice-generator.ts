import { InvoiceGenerator } from "../invoice-generator";
import { Order, OrderPayloadFragment } from "../../../../../generated/graphql";
import { SellerShopConfig } from "../../../app-configuration/schema-v1/app-config-v1";
import { AddressV2Shape } from "../../../app-configuration/schema-v2/app-config-schema.v2";
const Microinvoice = require("microinvoice");

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

    const microinvoiceInstance = new Microinvoice({
      /*
       * style: {
       *   header: {
       *     image: {
       *       path: "https://www.liquidcollectionhk.com/logo/logo.svg",
       *       width: 100,
       *       height: 38,
       *     },
       *   },
       * },
       */
      data: {
        invoice: {
          name: `Invoice ${invoiceNumber}`,

          header: [
            {
              label: "Order number",
              value: order.number,
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
                `Customer email - ${order.userEmail}`,
                order.billingAddress?.companyName,
                order.billingAddress?.phone,
                `${order.billingAddress?.streetAddress1}`,
                `${order.billingAddress?.streetAddress2}`,
                `${order.billingAddress?.postalCode} ${order.billingAddress?.city}`,
                order.billingAddress?.country.country,
              ],
            },
            /*
             * {
             *   label: "Tax Identifier",
             *   value: "todo",
             * },
             */
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
              weight: "bold",
              color: "secondary",
            },
            {
              value: "All returns or refunds my be previously approved in writing by the Company.",
              weight: "bold",
              color: "secondary",
            },
            {
              value:
                "Customers are requested to examine the goods at the time of delivery. If any deficiency and/or breakage is noticed please let our authorized delivery person know at once.",
              weight: "bold",
              color: "secondary",
            },
            {
              value:
                "No claims can be made once our authorized delivery person is no more in contact with the delivery.",
              weight: "bold",
              color: "secondary",
            },
            {
              value: "All prices are in Hong Kong Dollars or otherwise indicated.",
              weight: "bold",
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
              ...order.lines.map((line) => {
                return [
                  {
                    value: line.productName,
                  },
                  {
                    value: line.quantity,
                  },
                  {
                    value: line.totalPrice.gross.amount,
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
