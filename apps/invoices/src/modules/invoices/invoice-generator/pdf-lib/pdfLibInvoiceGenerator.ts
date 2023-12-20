import { InvoiceGenerator } from "../invoice-generator";
import {
  Order,
  OrderPayloadFragment,
  OrderPayloadFragmentDoc,
} from "../../../../../generated/graphql";
import { SellerShopConfig } from "../../../app-configuration/schema-v1/app-config-v1";
import { AddressV2Shape } from "../../../app-configuration/schema-v2/app-config-schema.v2";
import { createClient, dedupExchange, cacheExchange, fetchExchange, gql } from "urql";
import { PDFDocument, RGB, StandardFonts, rgb } from "pdf-lib";

/*
 * const saleorApiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
 * const client = createClient({
 *   url: saleorApiUrl || "",
 *   exchanges: [dedupExchange, cacheExchange, fetchExchange],
 * });
 */

/*
 * const ORDER_QUERY = gql`
 *   query OrderDetail($id: ID!) {
 *     order(id: $id) {
 *       id
 *       userEmail
 *       paymentStatusDisplay
 *       shippingMethodName
 *       lines {
 *         variant {
 *           product {
 *             attributes {
 *               attribute {
 *                 name
 *               }
 *               values {
 *                 name
 *               }
 *             }
 *           }
 *         }
 *         productName
 *         quantity
 *         totalPrice {
 *           gross {
 *             amount
 *             currency
 *           }
 *         }
 *       }
 *     }
 *   }
 * `;
 */

export class PdfLibInvoiceGenerator implements InvoiceGenerator {
  constructor(
    private settings = {
      locale: "en-US",
    }
  ) {}
  async createPdf(input: {
    order: OrderPayloadFragment;
    invoiceNumber: string;
    filename: string;
    companyAddressData: AddressV2Shape;
  }): Promise<void> {
    /*
     * const { invoiceNumber, order, companyAddressData, filename } = input;
     * const response = await client.query(ORDER_QUERY, { id: order.id }).toPromise();
     * const orderFromQuery = response.data?.order ? response.data.order : order;
     * const getAttributeValue = (attributes: any[] | undefined, name: string) => {
     *   if (!attributes) {
     *     return "";
     *   }
     *   const selectAttribute = attributes.filter((each) => {
     *     return each?.attribute?.name === name;
     *   });
     */

    /*
     *   if (selectAttribute.length > 0) {
     *     return selectAttribute[0]?.values[0]?.name;
     *   } else {
     *     return "";
     *   }
     * };
     */

    /*
     * const pdfDoc = await PDFDocument.create()
     * const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
     */

    /*
     * const page = pdfDoc.addPage()
     * const { width, height } = page.getSize();
     * const fontSize = 30;
     */

    /*
     * page.drawText('Creating PDFs in JavaScript is awesome!', {
     *   x: 50,
     *   y: height - 4 * fontSize,
     *   size: fontSize,
     *   font: timesRomanFont,
     *   color: rgb(0, 0.53, 0.71),
     * })
     */

    // const pdfBytes = await pdfDoc.save();

    // return pdf file here.
    return;
  }

  async createTestPdf(): Promise<{ pdfDataUri: string; pdfBytes: Uint8Array }> {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    const page = pdfDoc.addPage([1000, 1100]);
    const { width, height } = page.getSize();
    const fontSize = {
      xs: 10,
      sm: 12,
      base: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
    };
    const cellPadding = 50;

    //header
    page.drawRectangle({
      x: cellPadding,
      y: height - 150,
      width: 900,
      height: 100,
      color: rgb(35 / 255, 38 / 255, 62 / 255),
    });

    //logo section
    const url = "/lc_logo.png";
    const arrayBuffer = await fetch(url).then((res) => res.arrayBuffer());
    const image4 = await pdfDoc.embedPng(arrayBuffer);

    page.drawImage(image4, {
      y: height - 135,
      x: cellPadding,
      width: 210,
      height: 70,
    });

    //second section
    const secondSectionSecondCellLeft = 150 + cellPadding;
    const secondSctionThirdCellLeft = 500 + cellPadding;

    const secondSectionFirstColumn = ({
      x,
      y,
      size,
      color,
      width,
    }: {
      x?: number | undefined;
      y?: number | undefined;
      size?: number | undefined;
      color?: RGB | undefined;
      width?: number | undefined;
    }) => {
      return {
        x: x ? x : cellPadding,
        y: y ? y : height - 250,
        size: size ? size : fontSize.base,
        color: color ? color : rgb(0, 0, 0),
        width: width,
      };
    };
    const secondSectionSecondColumn = ({
      x,
      y,
      size,
      color,
    }: {
      x?: number | undefined;
      y?: number | undefined;
      size?: number | undefined;
      color?: RGB | undefined;
    }) => {
      return {
        x: x ? x : secondSectionSecondCellLeft,
        y: y ? y : height - 250,
        size: size ? size : fontSize.base,
        color: color ? color : rgb(0, 0, 0),
      };
    };

    const secondSectionThirdColumn = ({
      x,
      y,
      size,
      color,
    }: {
      x?: number | undefined;
      y?: number | undefined;
      size?: number | undefined;
      color?: RGB | undefined;
    }) => {
      return {
        x: x ? x : 870,
        y: y ? y : height - 250,
        size: size ? size : fontSize.base,
        color: color ? color : rgb(0, 0, 0),
      };
    };

    page.drawText("INVOICE", secondSectionFirstColumn({ size: fontSize.md }));
    page.drawText("102399", secondSectionSecondColumn({ size: fontSize.md }));
    page.drawText("12.12.2024", secondSectionThirdColumn({ size: fontSize.md }));

    page.drawText("Order:", secondSectionFirstColumn({ y: height - 280 }));
    page.drawText("302", secondSectionSecondColumn({ y: height - 280 }));

    page.drawText("Amount:", secondSectionFirstColumn({ y: height - 300 }));
    page.drawText("HKD 770", secondSectionSecondColumn({ y: height - 300 }));

    page.drawText("CUSTOMER", secondSectionFirstColumn({ y: height - 360, size: fontSize.lg }));

    page.drawText("Name:", secondSectionFirstColumn({ y: height - 390 }));
    page.drawText("Tha Toe Saung", secondSectionSecondColumn({ y: height - 390 }));

    page.drawText("Email:", secondSectionFirstColumn({ y: height - 410 }));
    page.drawText("dev@flo3.digital", secondSectionSecondColumn({ y: height - 410 }));

    page.drawText("Company Name", secondSectionFirstColumn({ y: height - 430 }));
    page.drawText("Flo3", secondSectionSecondColumn({ y: height - 430 }));

    page.drawText("Phone", secondSectionFirstColumn({ y: height - 450 }));
    page.drawText("09773159335", secondSectionSecondColumn({ y: height - 450 }));

    page.drawText("Address", secondSectionFirstColumn({ y: height - 470 }));
    page.drawText("Khay Mar St", secondSectionSecondColumn({ y: height - 470 }));

    page.drawText("Post Code", secondSectionFirstColumn({ y: height - 490 }));
    page.drawText("08101", secondSectionSecondColumn({ y: height - 490 }));

    page.drawText("City", secondSectionFirstColumn({ y: height - 510 }));
    page.drawText("Taungoo", secondSectionSecondColumn({ y: height - 510 }));

    page.drawText("Country", secondSectionFirstColumn({ y: height - 530 }));
    page.drawText("Hong Kong", secondSectionSecondColumn({ y: height - 530 }));

    page.drawText(
      "SHIPPING METHOD",
      secondSectionFirstColumn({ y: height - 250, x: secondSctionThirdCellLeft, size: fontSize.md })
    );
    page.drawText(
      "Kowlon",
      secondSectionFirstColumn({ y: height - 270, x: secondSctionThirdCellLeft })
    );

    page.drawText(
      "PAYMENT STATUS",
      secondSectionFirstColumn({ y: height - 320, size: fontSize.md, x: secondSctionThirdCellLeft })
    );
    page.drawText(
      "Not Charged",
      secondSectionFirstColumn({ y: height - 340, x: secondSctionThirdCellLeft })
    );

    page.drawText(
      "TERMS AND CONDITION",
      secondSectionFirstColumn({ y: height - 800, size: fontSize.md })
    );
    page.drawText(
      "Opened original cases are non-refundable. Opened or damaged bottles are non refundable.",
      secondSectionFirstColumn({ y: height - 830 })
    );
    page.drawText(
      "All returns or refunds my be previously approved in writing by the Company. Customers are requested to examine the goods at the time of delivery.",
      secondSectionFirstColumn({ y: height - 850 })
    );
    page.drawText(
      "If any deficiency and/or breakage is noticed please let our authorized delivery person know at once.",
      secondSectionFirstColumn({ y: height - 870 })
    );
    page.drawText(
      "No claims can be made once our authorized delivery person is no more in contact with the delivery. ",
      secondSectionFirstColumn({ y: height - 890 })
    );
    page.drawText(
      " All prices are in Hong Kong Dollars or otherwise indicated.",
      secondSectionFirstColumn({ y: height - 910 })
    );

    const pdfDataUri = await pdfDoc.saveAsBase64({ dataUri: true });

    console.log("pdf dta uri", pdfDataUri);
    const pdfBytes = await pdfDoc.save();

    // return pdf file here.
    return { pdfDataUri, pdfBytes };
  }
}
