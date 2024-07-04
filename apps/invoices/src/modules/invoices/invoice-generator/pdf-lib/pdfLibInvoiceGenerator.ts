import { InvoiceGenerator } from "../invoice-generator";
import {
  Order,
  OrderPayloadFragment,
  OrderPayloadFragmentDoc,
} from "../../../../../generated/graphql";
import { SellerShopConfig } from "../../../app-configuration/schema-v1/app-config-v1";
import { AddressV2Shape } from "../../../app-configuration/schema-v2/app-config-schema.v2";
import { createClient, dedupExchange, cacheExchange, fetchExchange, gql } from "urql";
import { PDFDocument, PDFFont, RGB, StandardFonts, rgb } from "pdf-lib";
import { mockOrder } from "../../../../fixtures/mock-order";
import fontkit from "@pdf-lib/fontkit";

// import { input } from "@saleor/macaw-ui/dist/components/SearchInput/SearchInput.css";

const saleorApiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;

const client = createClient({
  url: saleorApiUrl || "",
  exchanges: [dedupExchange, cacheExchange, fetchExchange],
});

const ORDER_QUERY = gql`
  query OrderDetailForPdfLib($id: ID!) {
    order(id: $id) {
      id
      userEmail
      paymentStatusDisplay
      shippingMethodName
      shippingPrice {
        gross {
          amount
          currency
        }
      }
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
          pricing {
            price {
              gross {
                amount
                currency
              }
            }
          }
          sku
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
      total {
        net {
          currency
          amount
        }
        tax {
          currency
          amount
        }
        gross {
          currency
          amount
        }
      }
    }
  }
`;

function truncateText(inputText: string, maxWords: number) {
  const words = inputText;

  if (words.length > maxWords) {
    console.log("length of the word 1", words.length);
    return words.slice(0, maxWords) + "...";
  } else {
    console.log("length of the word 2", words.length);
    return inputText;
  }
}

async function stringToArray(longString: string, maxWords: number) {
  let result = [];

  for (let i = 0; i < longString?.length; i += maxWords) {
    result.push(longString.substring(i, i + maxWords));
  }
  return result;
}

const fetchFont = async (url: string): Promise<Uint8Array> => {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();

  return new Uint8Array(arrayBuffer);
};

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
  }): Promise<{ pdfDataUri: string; pdfBytes: Uint8Array }> {
    const { invoiceNumber, order, companyAddressData, filename } = input;

    console.log("invoice_number", invoiceNumber);
    const response = await client.query(ORDER_QUERY, { id: order.id }).toPromise();
    const orderFromQuery = response.data?.order ? response.data.order : order;
    const getAttributeValue = (attributes: any[] | undefined, name: string) => {
      if (!attributes) {
        return "";
      }
      const selectAttribute = attributes.filter((each) => {
        return each?.attribute?.name === name;
      });

      if (selectAttribute?.length > 0) {
        return selectAttribute[0]?.values[0]?.name;
      } else {
        return "";
      }
    };

    const pdfDoc = await PDFDocument.create();

    pdfDoc.registerFontkit(fontkit);

    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const fontBytes = await fetchFont(
      "https://saleor-apps-invoices.vercel.app/fonts/NotoSansSC_Light.ttf"
    );

    const chineseFont = await pdfDoc.embedFont(fontBytes);

    const page = pdfDoc.addPage([1000, 1500]);
    const { width, height } = page.getSize();
    const fontSize = {
      xs: 8,
      sm: 10,
      base: 10,
      md: 12,
      lg: 14,
      xl: 16,
      xxl: 20,
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
    const url = "https://www.liquidcollectionhk.com/logo/logo.png";
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
      font,
    }: {
      x?: number | undefined;
      y?: number | undefined;
      size?: number | undefined;
      color?: RGB | undefined;
      font?: PDFFont | undefined;
    }) => {
      return {
        x: x ? x : secondSectionSecondCellLeft,
        y: y ? y : height - 250,
        size: size ? size : fontSize.base,
        color: color ? color : rgb(0, 0, 0),
        font: font ? font : undefined,
      };
    };

    //header section
    const date = Intl.DateTimeFormat(this.settings.locale, {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(new Date(order.created));

    const headerSectionHeight = 270;
    const headerSectionDetail: { name: string; value: string }[] = [
      { name: "Order:", value: `${order.number}` },
      { name: "Date:", value: `${date}` },
    ];

    const createdDate = new Date(order.created);

    const add0 = (num: string) => {
      return num?.length < 2 ? `0${num}` : num;
    };

    let invoiceString = "LC";

    invoiceString =
      invoiceString +
      createdDate.getFullYear().toString() +
      "-" +
      add0(String(createdDate.getMonth() + 1)) +
      add0(createdDate.getDate().toString()) +
      "-" +
      order.number;

    page.drawText("INVOICE", secondSectionFirstColumn({ size: fontSize.md }));
    page.drawText(invoiceString, secondSectionSecondColumn({ size: fontSize.md }));
    headerSectionDetail.forEach((each, index) => {
      const currentSectionHeight = headerSectionHeight + index * 20;

      page.drawText(each.name, secondSectionFirstColumn({ y: height - currentSectionHeight }));
      page.drawText(each.value, secondSectionSecondColumn({ y: height - currentSectionHeight }));
    });

    //customer section
    const customerSectionHeight = 400;
    const customerSectionDetail: { name: string; value: string }[] = [
      {
        name: "Name:",
        value: `${order.shippingAddress?.firstName} ${order.shippingAddress?.lastName}`,
      },
      { name: "Email:", value: `${orderFromQuery.userEmail}` },
      { name: "Company Name:", value: `${order.shippingAddress?.companyName}` },
      { name: "Phone:", value: `${order.shippingAddress?.phone}` },
      {
        name: "Address:",
        value: `${order.shippingAddress?.streetAddress1}, ${order.shippingAddress?.streetAddress2}`,
      },
      { name: "Post Code:", value: `${order.shippingAddress?.postalCode}` },
      { name: "City:", value: `${order.shippingAddress?.city}` },
      { name: "Country/Area:", value: `${order.shippingAddress?.country?.country}` },
    ];

    page.drawText("CUSTOMER", secondSectionFirstColumn({ y: height - 380, size: fontSize.lg }));
    customerSectionDetail.forEach((each, index) => {
      const currentSectionHeight = customerSectionHeight + 10 + index * 20;

      page.drawText(each.name, secondSectionFirstColumn({ y: height - currentSectionHeight }));
      page.drawText(
        each.value,
        secondSectionSecondColumn({
          y: height - currentSectionHeight,
          font: each.name === "Address:" ? chineseFont : undefined,
        })
      );
    });

    //seller section

    /*
     * const sellerSectionHeight = 400;
     * const sellerSectionDetail: { name: string; value: string }[] = [
     *   { name: "Company Name:", value: `${companyAddressData.companyName}` },
     *   {
     *     name: "Company Address:",
     *     value: `${companyAddressData.streetAddress1},${companyAddressData.streetAddress2}`,
     *   },
     *   { name: "Company PostCode:", value: `${companyAddressData.postalCode}` },
     *   { name: "Company City:", value: `${companyAddressData.city}` },
     *   { name: "Company Country", value: `${companyAddressData.country}` },
     * ];
     */

    /*
     * page.drawText(
     *   "SELLER",
     *   secondSectionFirstColumn({ y: height - 380, x: secondSctionThirdCellLeft, size: fontSize.lg })
     * );
     * sellerSectionDetail.forEach((each, index) => {
     *   const currentSectionHeight = sellerSectionHeight + 10 + index * 20;
     */

    /*
     *   page.drawText(
     *     each.name,
     *     secondSectionFirstColumn({ y: height - currentSectionHeight, x: secondSctionThirdCellLeft })
     *   );
     *   page.drawText(
     *     each.value,
     *     secondSectionSecondColumn({
     *       y: height - currentSectionHeight,
     *       x: secondSctionThirdCellLeft + 150,
     *     })
     *   );
     * });
     */

    page.drawText(
      "SHIPPING METHOD",
      secondSectionFirstColumn({ y: height - 250, x: secondSctionThirdCellLeft, size: fontSize.md })
    );
    page.drawText(
      `${"HK island Free Delivery"} 
(for order HK$3000 or above, Surcharge for deliver
  to Kowloon HK$200 & New Territories HK$350)`,
      secondSectionFirstColumn({ y: height - 270, x: secondSctionThirdCellLeft })
    );

    page.drawText(
      "PAYMENT STATUS",
      secondSectionFirstColumn({ y: height - 380, size: fontSize.md, x: secondSctionThirdCellLeft })
    );
    page.drawText(
      `${orderFromQuery?.paymentStatusDisplay}`,
      secondSectionFirstColumn({ y: height - 400, x: secondSctionThirdCellLeft })
    );

    //table section

    const tableWidth = 900;
    const tableSectionHeight = 600;
    const tableRowSpacing = 50;

    const column1Spacing = 10;
    const column2Spacing = 150;
    const column3Spacing = 210;
    const column4Spacing = 560;
    const column5Spacing = 640;
    const column6Spacing = 720;
    const column7Spacing = 800;

    const column1Width = column2Spacing - column1Spacing; // 150
    const column2Width = column3Spacing - column2Spacing; // 330
    const column3Width = column4Spacing - column3Spacing; // 150
    const column4Width = column5Spacing - column4Spacing; // 150
    const column5Width = tableWidth - column5Spacing; // 150
    const column6Width = column7Spacing - column6Spacing; // 150
    const column7Width = tableWidth - column7Spacing; // 150
    const column8Width = tableWidth - column7Spacing; // 150
    const tableRow = ({
      row,
      column,
      size,
      color,
      customLineHeight,
      customLine = false,
    }: {
      row: number;
      column: number;
      size?: number | undefined;
      color?: RGB | undefined;
      customLineHeight?: number | undefined;
      customLine?: boolean | undefined;
    }) => {
      let columnSpacing = 0;
      let columnWidth = 0;

      if (column === 1) {
        columnSpacing = column1Spacing;
        columnWidth = column1Width;
      } else if (column === 2) {
        columnSpacing = column2Spacing;
        columnWidth = column2Width;
      } else if (column === 3) {
        columnSpacing = column3Spacing;
        columnWidth = column3Width;
      } else if (column === 4) {
        columnSpacing = column4Spacing;
        columnWidth = column4Width;
      } else if (column === 5) {
        columnSpacing = column5Spacing;
        columnWidth = column5Width;
      } else if (column === 6) {
        columnSpacing = column6Spacing;
        columnWidth = column6Width;
      } else if (column === 7) {
        columnSpacing = column7Spacing;
        columnWidth = column7Width;
      } else if (column === 8) {
        columnSpacing = column7Spacing;
        columnWidth = column8Width;
      }

      const x = cellPadding + columnSpacing;

      let y = 0;

      if (customLineHeight !== undefined) {
        y =
          height -
          (tableSectionHeight + row * tableRowSpacing) -
          customLineHeight * 13 +
          (customLine ? 17 : 0);
      } else {
        y = height - (tableSectionHeight + row * tableRowSpacing);
      }

      return {
        x: x,
        y: y,
        size: customLine ? fontSize.xs : size ? size : fontSize.base,
        color: color ? color : rgb(0, 0, 0),
        width: columnWidth,
      };
    };

    page.drawRectangle({
      x: cellPadding,
      y: height - (tableSectionHeight + (tableRowSpacing + 20)),
      width: tableWidth,
      height: 50,
      color: rgb(35 / 255, 38 / 255, 62 / 255),
    });

    const tableHeader = [
      "Item Code",
      "Quantity",
      "Description",
      "Vintage",
      "Format",
      "Unit Price",
      "Total",
    ];

    tableHeader.forEach((header, index) => {
      const row = 1;
      const column = index + 1;

      page.drawText(
        `${header}`,
        tableRow({ row: row, column: column, size: fontSize.md, color: rgb(1, 1, 1) })
      );
    });

    orderFromQuery?.lines?.forEach(async (line: any, index: number) => {
      const row = index + 2;
      const itemCode = line.variant?.sku ? line?.variant?.sku : "-";
      const quantity = line?.quantity;
      const description = line?.productName; //line?.productName;
      // const description = `<p>skdjf;klsjd;flkjs;lkfjssldkjf;lskjf;lksjflksjdflkdsjfl;<br />ksjf;lsjf;lsjflkjsflkjslfjslkfjlskfjlksjfl;ksjdflksjfl;dksj<p>skdjf;klsjd;flkjs;lkfjssldkjf;lskjf;lksjflksjdflkdsjfl;<br />ksjf;lsjf;lsjflkjsflkjslfjslkfjlskfjlksjfl;ksjdflksjfl;dksj`; //line?.productName;
      const descriptionArray = await stringToArray(description, 70);
      const vintage = getAttributeValue(line?.variant?.product?.attributes, "Vintage");
      const format = getAttributeValue(line?.variant?.product?.attributes, "Size");
      const subtotal = `${line?.totalPrice?.gross?.amount}`;
      const unitPrice = line.variant ? `${line?.variant?.pricing?.price?.gross?.amount}` : "-";
      const tableRowArray = [
        itemCode,
        quantity,
        descriptionArray,
        vintage,
        format,
        unitPrice,
        subtotal,
      ];

      tableRowArray.forEach((each, i) => {
        const column = i + 1;

        if (Array.isArray(each)) {
          each.forEach((eachLine, index) => {
            page.drawText(
              `${eachLine}`,
              tableRow({
                row: row,
                column: column,
                size: fontSize.base,
                customLineHeight: index,
                customLine: each?.length > 1,
              })
            );
          });
          page.drawRectangle({
            x: cellPadding,
            y: height - (tableSectionHeight + (row * tableRowSpacing + 20)),
            width: tableWidth,
            height: 1,
            color: rgb(35 / 255, 38 / 255, 62 / 255),
          });
          return;
        }

        page.drawText(`${each}`, tableRow({ row: row, column: column, size: fontSize.base }));
        page.drawRectangle({
          x: cellPadding,
          y: height - (tableSectionHeight + (row * tableRowSpacing + 20)),
          width: tableWidth,
          height: 1,
          color: rgb(35 / 255, 38 / 255, 62 / 255),
        });
      });
    });

    let currentRowToContinue: number = 2 + (orderFromQuery?.lines?.length || 0);

    if (orderFromQuery?.shippingMethodName && orderFromQuery.shippingPrice?.gross?.amount) {
      const tableRowArray = [
        orderFromQuery.shippingMethodName,
        "-",
        "-",
        "-",
        "-",
        "-",
        `${orderFromQuery.shippingPrice.gross.amount}`,
      ];

      tableRowArray.forEach((each, i) => {
        const column = i + 1;

        page.drawText(
          `${each}`,
          tableRow({ row: currentRowToContinue, column: column, size: fontSize.base })
        );
      });

      currentRowToContinue = currentRowToContinue + 1;
    }

    /*
     * if (orderFromQuery.total?.net) {
     *   page.drawText(`TOTAL NET`, tableRow({ row: currentRowToContinue, column: 4 }));
     *   page.drawText(
     *     `${orderFromQuery.total.net.amount} ${orderFromQuery.total.net.currency}`,
     *     tableRow({ row: currentRowToContinue, column: 5 })
     *   );
     *   currentRowToContinue = currentRowToContinue + 1;
     * }
     */

    /*
     * if (orderFromQuery.total?.tax) {
     *   page.drawText(`TOTAL TAX`, tableRow({ row: currentRowToContinue, column: 4 }));
     *   page.drawText(
     *     `${orderFromQuery.total.tax.amount} ${orderFromQuery.total.tax.currency}`,
     *     tableRow({ row: currentRowToContinue, column: 5 })
     *   );
     *   currentRowToContinue = currentRowToContinue + 1;
     * }
     */

    page.drawRectangle({
      x: cellPadding,
      y: height - (tableSectionHeight + (currentRowToContinue * tableRowSpacing + 20)),
      width: 900,
      height: 50,
      color: rgb(35 / 255, 38 / 255, 62 / 255),
    });

    if (orderFromQuery.total?.gross) {
      page.drawText(
        `GRAND TOTAL`,
        tableRow({ row: currentRowToContinue, column: 1, color: rgb(1, 1, 1) })
      );
      page.drawText(
        `${orderFromQuery.total.gross.currency} ${orderFromQuery.total.gross.amount}`,
        tableRow({ row: currentRowToContinue, column: 8, color: rgb(1, 1, 1) })
      );
      currentRowToContinue = currentRowToContinue + 1;
    }

    //payment deatails section
    const paymentSectionHeight = tableSectionHeight + currentRowToContinue * tableRowSpacing + 50;
    let paymentSectionHeightForFooter = 0;
    const paymentSectionDetail: { name: string; value: string }[] = [
      {
        name: "Bank name:",
        value: `The Hong Kong And Shanghai Banking Corporation Limited`,
      },
      { name: "Bank address:", value: `1 Queen's Road Central, Hong Kong` },
      { name: "SWIFT code:", value: `HSBCHKHHHKH` },
      { name: "Account name:", value: `Green Grand Limited` },
      {
        name: "Account number:",
        value: `741 385124 001`,
      },
      { name: "FPS ID:", value: `169 418 381` },
    ];

    page.drawText(
      "PAYMENT",
      secondSectionFirstColumn({ y: height - paymentSectionHeight, size: fontSize.lg })
    );
    paymentSectionHeightForFooter = 50 + paymentSectionDetail.length * 20;

    paymentSectionDetail.forEach((each, index) => {
      const currentSectionHeight = paymentSectionHeight + 20 + index * 20;

      page.drawText(each.name, secondSectionFirstColumn({ y: height - currentSectionHeight }));
      page.drawText(each.value, secondSectionSecondColumn({ y: height - currentSectionHeight }));
    });

    //footer section

    let footerSectionHeight = paymentSectionHeight + paymentSectionHeightForFooter;

    if (height - footerSectionHeight <= 300) {
      const page2 = pdfDoc.addPage([1000, 1500]);
      const { height } = page2.getSize();

      footerSectionHeight = 100;
      //create new pdf page
      page2.drawText(
        `TERMS AND CONDITION`,
        secondSectionFirstColumn({ y: height - footerSectionHeight, size: fontSize.md })
      );
      page2.drawText(
        "Opened original cases are non-refundable. Opened or damaged bottles are non refundable.",
        secondSectionFirstColumn({ y: height - (footerSectionHeight + 20) })
      );
      page2.drawText(
        "All returns or refunds must be previously approved in writing by the Company. Customers are requested to examine the goods at the time of delivery.",
        secondSectionFirstColumn({ y: height - (footerSectionHeight + 40) })
      );
      page2.drawText(
        "If any deficiency and/or breakage is noticed please let our authorized delivery person know at once.",
        secondSectionFirstColumn({ y: height - (footerSectionHeight + 60) })
      );
      page2.drawText(
        "No claims can be made once our authorized delivery person is no more in contact with the delivery. ",
        secondSectionFirstColumn({ y: height - (footerSectionHeight + 80) })
      );
      page2.drawText(
        " All prices are in Hong Kong Dollars or otherwise indicated.",
        secondSectionFirstColumn({ y: height - (footerSectionHeight + 100) })
      );

      const footerSectionHeightForBottom = footerSectionHeight + 200;

      page2.drawText(
        " A brand of Green Grand Ltd page2Height",
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom - 45, x: cellPadding }) //y 60
      );
      page2.drawText(
        `#2505B- The Centrium,`,
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom + 15, x: 440 }) //y 105
      );
      page2.drawText(
        `60 Wyndham Street- Central`,
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom - 15, x: 430 }) //y 105
      );
      page2.drawText(
        `HK SAR China`,
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom - 45, x: 460 }) //y 105
      );
      page2.drawText(
        `Tel: +852 6466 9196`,
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom - 45, x: 840 })
      ); //y 60
      page2.drawText(
        `Email: contact@liquidcollectionhk.com`,
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom - 15, x: 760 }) //y 90
      );
    } else {
      page.drawText(
        `TERMS AND CONDITION`,
        secondSectionFirstColumn({ y: height - footerSectionHeight, size: fontSize.md })
      );
      page.drawText(
        "Opened original cases are non-refundable. Opened or damaged bottles are non refundable.",
        secondSectionFirstColumn({ y: height - (footerSectionHeight + 20) })
      );
      page.drawText(
        "All returns or refunds must be previously approved in writing by the Company. Customers are requested to examine the goods at the time of delivery.",
        secondSectionFirstColumn({ y: height - (footerSectionHeight + 40) })
      );
      page.drawText(
        "If any deficiency and/or breakage is noticed please let our authorized delivery person know at once.",
        secondSectionFirstColumn({ y: height - (footerSectionHeight + 60) })
      );
      page.drawText(
        "No claims can be made once our authorized delivery person is no more in contact with the delivery. ",
        secondSectionFirstColumn({ y: height - (footerSectionHeight + 80) })
      );
      page.drawText(
        " All prices are in Hong Kong Dollars or otherwise indicated.",
        secondSectionFirstColumn({ y: height - (footerSectionHeight + 100) })
      );

      const footerSectionHeightForBottom = footerSectionHeight + 200;

      page.drawText(
        " A brand of Green Grand Ltd page2Height",
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom - 45, x: cellPadding }) //y 60
      );

      page.drawText(
        `#2505B- The Centrium,`,
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom + 15, x: 440 }) //y 105
      );
      page.drawText(
        `60 Wyndham Street- Central`,
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom - 15, x: 430 }) //y 105
      );
      page.drawText(
        `HK SAR China`,
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom - 45, x: 460 }) //y 105
      );

      page.drawText(
        `Tel: +852 6466 9196`,
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom - 45, x: 840 })
      ); //y 60
      page.drawText(
        `Email: contact@liquidcollectionhk.com`,
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom - 15, x: 760 }) //y 90
      );
    }

    const pdfDataUri = await pdfDoc.saveAsBase64({ dataUri: true });

    const pdfBytes = await pdfDoc.save();

    // return pdf file here.
    return { pdfDataUri, pdfBytes };
  }

  async createTestPdf(): Promise<{ pdfDataUri: string; pdfBytes: Uint8Array }> {
    const order = mockOrder;
    const response = await client
      .query(ORDER_QUERY, { id: "T3JkZXI6ZTQxNTMyMTctMWRlOS00ZjdjLWI2NWEtYWQ0Y2IyMTMzNTFl" })
      .toPromise();
    const orderFromQuery = response.data?.order ? response.data.order : order;
    const getAttributeValue = (attributes: any[] | undefined, name: string) => {
      if (!attributes) {
        return "";
      }
      const selectAttribute = attributes.filter((each) => {
        return each?.attribute?.name === name;
      });

      if (selectAttribute?.length > 0) {
        return selectAttribute[0]?.values[0]?.name;
      } else {
        return "";
      }
    };

    const pdfDoc = await PDFDocument.create();

    pdfDoc.registerFontkit(fontkit);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const fontBytes = await fetchFont("/fonts/HanyiSentyPine_Regular.ttf");
    const chineseFont = await pdfDoc.embedFont(fontBytes);

    const page = pdfDoc.addPage([1000, 1500]);
    const { width, height } = page.getSize();
    const fontSize = {
      xs: 8,
      sm: 10,
      base: 10,
      md: 12,
      lg: 14,
      xl: 16,
      xxl: 20,
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
    const url = "https://www.liquidcollectionhk.com/logo/logo.png";
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
      font,
    }: {
      x?: number | undefined;
      y?: number | undefined;
      size?: number | undefined;
      color?: RGB | undefined;
      font?: PDFFont | undefined;
    }) => {
      return {
        x: x ? x : secondSectionSecondCellLeft,
        y: y ? y : height - 250,
        size: size ? size : fontSize.base,
        color: color ? color : rgb(0, 0, 0),
        font: font ? font : undefined,
      };
    };

    //header section
    const date = Intl.DateTimeFormat(this.settings.locale, {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(new Date(order.created));

    const headerSectionHeight = 270;
    const headerSectionDetail: { name: string; value: string }[] = [
      { name: "Order:", value: `${order.number}` },
      { name: "Date:", value: `${date}` },
    ];

    const createdDate = new Date(order.created);

    const add0 = (num: string) => {
      return num?.length < 2 ? `0${num}` : num;
    };
    let invoiceString = "LC";

    invoiceString =
      invoiceString +
      createdDate.getFullYear().toString() +
      "-" +
      add0(String(createdDate.getMonth() + 1)) +
      add0(createdDate.getDate().toString()) +
      "-" +
      order.number;
    page.drawText("INVOICE", secondSectionFirstColumn({ size: fontSize.md }));
    console.log("order", response.data.order);
    page.drawText(invoiceString, secondSectionSecondColumn({ size: fontSize.md }));
    headerSectionDetail.forEach((each, index) => {
      const currentSectionHeight = headerSectionHeight + index * 20;

      page.drawText(each.name, secondSectionFirstColumn({ y: height - currentSectionHeight }));
      page.drawText(each.value, secondSectionSecondColumn({ y: height - currentSectionHeight }));
    });

    //customer section
    const customerSectionHeight = 400;
    const customerSectionDetail: { name: string; value: string }[] = [
      {
        name: "Name:",
        value: `${order.billingAddress?.firstName} ${order.billingAddress?.lastName}`,
      },
      { name: "Email:", value: `${orderFromQuery.userEmail}` },
      { name: "Company Name:", value: `${order.billingAddress?.companyName}` },
      { name: "Phone:", value: `${order.billingAddress?.phone}` },
      {
        name: "Address:",
        value: `${order.billingAddress?.streetAddress1} 觀塘鴻圖道43號鴻達工業大廈1103 室, ${order.billingAddress?.streetAddress2}`,
      },
      { name: "Post Code:", value: `${order.billingAddress?.postalCode}` },
      { name: "City:", value: `${order.billingAddress?.city}` },
      { name: "Country/Area:", value: `${order.billingAddress?.country?.country}` },
    ];

    page.drawText("CUSTOMER", secondSectionFirstColumn({ y: height - 380, size: fontSize.lg }));
    customerSectionDetail.forEach((each, index) => {
      const currentSectionHeight = customerSectionHeight + 10 + index * 20;

      page.drawText(each.name, secondSectionFirstColumn({ y: height - currentSectionHeight }));
      page.drawText(
        each.value,
        secondSectionSecondColumn({
          y: height - currentSectionHeight,
          font: each.name === "Address:" ? (chineseFont ? chineseFont : undefined) : undefined,
        })
      );
    });

    page.drawText(
      "SHIPPING METHOD",
      secondSectionFirstColumn({ y: height - 250, x: secondSctionThirdCellLeft, size: fontSize.md })
    );
    page.drawText(
      `${"HK island Free Delivery"} 
(for order HK$3000 or above, Surcharge for deliver
  to Kowloon HK$200 & New Territories HK$350)`,
      secondSectionFirstColumn({ y: height - 270, x: secondSctionThirdCellLeft })
    );

    page.drawText(
      "PAYMENT STATUS",
      secondSectionFirstColumn({ y: height - 380, size: fontSize.md, x: secondSctionThirdCellLeft })
    );
    page.drawText(
      `${orderFromQuery?.paymentStatusDisplay}`,
      secondSectionFirstColumn({ y: height - 400, x: secondSctionThirdCellLeft })
    );

    // //seller section

    /*
     * const sellerSectionHeight = 400;
     * const sellerSectionDetail: { name: string; value: string }[] = [
     *   { name: "Company Name:", value: `Liquid Collection` },
     *   { name: "Company Address:", value: `12 TST` },
     *   { name: "Company PostCode:", value: `0000` },
     *   { name: "Company City:", value: `Hong Kong` },
     *   { name: "Company Country", value: `Hong Kong Island` },
     * ];
     */

    /*
     * page.drawText(
     *   "SELLER",
     *   secondSectionFirstColumn({ y: height - 380, x: secondSctionThirdCellLeft, size: fontSize.lg })
     * );
     * sellerSectionDetail.forEach((each, index) => {
     *   const currentSectionHeight = sellerSectionHeight + 10 + index * 20;
     */

    /*
     *   page.drawText(
     *     each.name,
     *     secondSectionFirstColumn({ y: height - currentSectionHeight, x: secondSctionThirdCellLeft })
     *   );
     *   page.drawText(
     *     each.value,
     *     secondSectionSecondColumn({
     *       y: height - currentSectionHeight,
     *       x: secondSctionThirdCellLeft + 150,
     *     })
     *   );
     * });
     */

    //table section

    const tableWidth = 900;
    const tableSectionHeight = 600;
    const tableRowSpacing = 50;

    const column1Spacing = 10;
    const column2Spacing = 150;
    const column3Spacing = 210;
    const column4Spacing = 560;
    const column5Spacing = 640;
    const column6Spacing = 720;
    const column7Spacing = 800;

    const column1Width = column2Spacing - column1Spacing; // 150
    const column2Width = column3Spacing - column2Spacing; // 330
    const column3Width = column4Spacing - column3Spacing; // 150
    const column4Width = column5Spacing - column4Spacing; // 150
    const column5Width = tableWidth - column5Spacing; // 150
    const column6Width = column7Spacing - column6Spacing; // 150
    const column7Width = tableWidth - column7Spacing; // 150
    const column8Width = tableWidth - column7Spacing; // 150
    const tableRow = ({
      row,
      column,
      size,
      color,
      customLineHeight,
      customLine = false,
    }: {
      row: number;
      column: number;
      size?: number | undefined;
      color?: RGB | undefined;
      customLineHeight?: number | undefined;
      customLine?: boolean | undefined;
    }) => {
      let columnSpacing = 0;
      let columnWidth = 0;

      if (column === 1) {
        columnSpacing = column1Spacing;
        columnWidth = column1Width;
      } else if (column === 2) {
        columnSpacing = column2Spacing;
        columnWidth = column2Width;
      } else if (column === 3) {
        columnSpacing = column3Spacing;
        columnWidth = column3Width;
      } else if (column === 4) {
        columnSpacing = column4Spacing;
        columnWidth = column4Width;
      } else if (column === 5) {
        columnSpacing = column5Spacing;
        columnWidth = column5Width;
      } else if (column === 6) {
        columnSpacing = column6Spacing;
        columnWidth = column6Width;
      } else if (column === 7) {
        columnSpacing = column7Spacing;
        columnWidth = column7Width;
      } else if (column === 8) {
        columnSpacing = column7Spacing;
        columnWidth = column8Width;
      }

      const x = cellPadding + columnSpacing;

      let y = 0;

      if (customLineHeight !== undefined) {
        y =
          height -
          (tableSectionHeight + row * tableRowSpacing) -
          customLineHeight * 13 +
          (customLine ? 17 : 0);
      } else {
        y = height - (tableSectionHeight + row * tableRowSpacing);
      }

      return {
        x: x,
        y: y,
        size: customLine ? fontSize.xs : size ? size : fontSize.base,
        color: color ? color : rgb(0, 0, 0),
        width: columnWidth,
      };
    };

    page.drawRectangle({
      x: cellPadding,
      y: height - (tableSectionHeight + (tableRowSpacing + 20)),
      width: tableWidth,
      height: 50,
      color: rgb(35 / 255, 38 / 255, 62 / 255),
    });

    const tableHeader = [
      "Item Code",
      "Quantity",
      "Description",
      "Vintage",
      "Format",
      "Unit Price",
      "Total",
    ];

    tableHeader.forEach((header, index) => {
      const row = 1;
      const column = index + 1;

      page.drawText(
        `${header}`,
        tableRow({ row: row, column: column, size: fontSize.md, color: rgb(1, 1, 1) })
      );
    });

    orderFromQuery?.lines?.forEach(async (line: any, index: number) => {
      const row = index + 2;
      const itemCode = line.variant?.sku ? line?.variant?.sku : "-";
      const quantity = line?.quantity;
      // const description = line?.productName; //line?.productName;
      const description =
        "Domaine Bruno Desaunay Bissey, Vosne Romanee Les Rouges Vieilles Vignes 1° Cru ";
      // const description = `<p>skdjf;klsjd;flkjs;lkfjssldkjf;lskjf;lksjflksjdflkdsjfl;<br />ksjf;lsjf;lsjflkjsflkjslfjslkfjlskfjlksjfl;ksjdflksjfl;dksj<p>skdjf;klsjd;flkjs;lkfjssldkjf;lskjf;lksjflksjdflkdsjfl;<br />ksjf;lsjf;lsjflkjsflkjslfjslkfjlskfjlksjfl;ksjdflksjfl;dksj`; //line?.productName;
      const descriptionArray = await stringToArray(description, 70);
      const vintage = getAttributeValue(line?.variant?.product?.attributes, "Vintage");
      const format = getAttributeValue(line?.variant?.product?.attributes, "Size");
      const subtotal = `${line?.totalPrice?.gross?.amount}`;
      const unitPrice = line.variant ? `${line?.variant?.pricing?.price?.gross?.amount}` : "-";
      const tableRowArray = [
        itemCode,
        quantity,
        descriptionArray,
        vintage,
        format,
        unitPrice,
        subtotal,
      ];

      tableRowArray.forEach((each, i) => {
        const column = i + 1;

        if (Array.isArray(each)) {
          each.forEach((eachLine, index) => {
            page.drawText(
              `${eachLine}`,
              tableRow({
                row: row,
                column: column,
                size: fontSize.base,
                customLineHeight: index,
                customLine: each?.length > 1,
              })
            );
          });
          page.drawRectangle({
            x: cellPadding,
            y: height - (tableSectionHeight + (row * tableRowSpacing + 20)),
            width: tableWidth,
            height: 1,
            color: rgb(35 / 255, 38 / 255, 62 / 255),
          });
          return;
        }

        page.drawText(`${each}`, tableRow({ row: row, column: column, size: fontSize.base }));
        page.drawRectangle({
          x: cellPadding,
          y: height - (tableSectionHeight + (row * tableRowSpacing + 20)),
          width: tableWidth,
          height: 1,
          color: rgb(35 / 255, 38 / 255, 62 / 255),
        });
      });
    });

    let currentRowToContinue: number = 2 + (orderFromQuery?.lines?.length || 0);

    if (orderFromQuery?.shippingMethodName && orderFromQuery.shippingPrice?.gross?.amount) {
      const tableRowArray = [
        orderFromQuery.shippingMethodName,
        "-",
        "-",
        "-",
        "-",
        "-",
        `${orderFromQuery.shippingPrice.gross.amount}`,
      ];

      tableRowArray.forEach((each, i) => {
        const column = i + 1;

        page.drawText(
          `${each}`,
          tableRow({ row: currentRowToContinue, column: column, size: fontSize.base })
        );
      });

      currentRowToContinue = currentRowToContinue + 1;
    }

    /*
     * if (orderFromQuery.total?.net) {
     *   page.drawText(`TOTAL NET`, tableRow({ row: currentRowToContinue, column: 4 }));
     *   page.drawText(
     *     `${orderFromQuery.total.net.amount} ${orderFromQuery.total.net.currency}`,
     *     tableRow({ row: currentRowToContinue, column: 5 })
     *   );
     *   currentRowToContinue = currentRowToContinue + 1;
     * }
     */

    /*
     * if (orderFromQuery.total?.tax) {
     *   page.drawText(`TOTAL TAX`, tableRow({ row: currentRowToContinue, column: 4 }));
     *   page.drawText(
     *     `${orderFromQuery.total.tax.amount} ${orderFromQuery.total.tax.currency}`,
     *     tableRow({ row: currentRowToContinue, column: 5 })
     *   );
     *   currentRowToContinue = currentRowToContinue + 1;
     * }
     */

    page.drawRectangle({
      x: cellPadding,
      y: height - (tableSectionHeight + (currentRowToContinue * tableRowSpacing + 20)),
      width: 900,
      height: 50,
      color: rgb(35 / 255, 38 / 255, 62 / 255),
    });

    if (orderFromQuery.total?.gross) {
      page.drawText(
        `GRAND TOTAL`,
        tableRow({ row: currentRowToContinue, column: 1, color: rgb(1, 1, 1) })
      );
      page.drawText(
        ` ${orderFromQuery.total.gross.currency} ${orderFromQuery.total.gross.amount}`,
        tableRow({ row: currentRowToContinue, column: 8, color: rgb(1, 1, 1) })
      );
      currentRowToContinue = currentRowToContinue + 1;
    }

    //payment deatails section
    const paymentSectionHeight = tableSectionHeight + currentRowToContinue * tableRowSpacing + 50;
    let paymentSectionHeightForFooter = 0;
    const paymentSectionDetail: { name: string; value: string }[] = [
      {
        name: "Bank name:",
        value: `The Hong Kong And Shanghai Banking Corporation Limited`,
      },
      { name: "Bank address:", value: `1 Queen's Road Central, Hong Kong` },
      { name: "SWIFT code:", value: `HSBCHKHHHKH` },
      { name: "Account name:", value: `Green Grand Limited` },
      {
        name: "Account number:",
        value: `741 385124 001`,
      },
      { name: "FPS ID:", value: `169 418 381` },
    ];

    page.drawText(
      "PAYMENT",
      secondSectionFirstColumn({ y: height - paymentSectionHeight, size: fontSize.lg })
    );
    paymentSectionHeightForFooter = 50 + paymentSectionDetail.length * 20;

    paymentSectionDetail.forEach((each, index) => {
      const currentSectionHeight = paymentSectionHeight + 20 + index * 20;

      page.drawText(each.name, secondSectionFirstColumn({ y: height - currentSectionHeight }));
      page.drawText(each.value, secondSectionSecondColumn({ y: height - currentSectionHeight }));
    });

    //footer section

    let footerSectionHeight = paymentSectionHeight + paymentSectionHeightForFooter;

    if (height - footerSectionHeight <= 300) {
      const page2 = pdfDoc.addPage([1000, 1500]);
      const { height } = page2.getSize();

      footerSectionHeight = 100;
      //create new pdf page
      page2.drawText(
        `TERMS AND CONDITION`,
        secondSectionFirstColumn({ y: height - footerSectionHeight, size: fontSize.md })
      );
      page2.drawText(
        "Opened original cases are non-refundable. Opened or damaged bottles are non refundable.",
        secondSectionFirstColumn({ y: height - (footerSectionHeight + 20) })
      );
      page2.drawText(
        "All returns or refunds must be previously approved in writing by the Company. Customers are requested to examine the goods at the time of delivery.",
        secondSectionFirstColumn({ y: height - (footerSectionHeight + 40) })
      );
      page2.drawText(
        "If any deficiency and/or breakage is noticed please let our authorized delivery person know at once.",
        secondSectionFirstColumn({ y: height - (footerSectionHeight + 60) })
      );
      page2.drawText(
        "No claims can be made once our authorized delivery person is no more in contact with the delivery. ",
        secondSectionFirstColumn({ y: height - (footerSectionHeight + 80) })
      );
      page2.drawText(
        " All prices are in Hong Kong Dollars or otherwise indicated.",
        secondSectionFirstColumn({ y: height - (footerSectionHeight + 100) })
      );

      const footerSectionHeightForBottom = footerSectionHeight + 200;

      page2.drawText(
        " A brand of Green Grand Ltd page2Height",
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom - 45, x: cellPadding }) //y 60
      );
      page2.drawText(
        `#2505B- The Centrium,`,
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom + 15, x: 440 }) //y 105
      );
      page2.drawText(
        `60 Wyndham Street- Central`,
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom - 15, x: 430 }) //y 105
      );
      page2.drawText(
        `HK SAR China`,
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom - 45, x: 460 }) //y 105
      );
      page2.drawText(
        `Tel: +852 6466 9196`,
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom - 45, x: 840 })
      ); //y 60
      page2.drawText(
        `Email: contact@liquidcollectionhk.com`,
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom - 15, x: 760 }) //y 90
      );
    } else {
      page.drawText(
        `TERMS AND CONDITION`,
        secondSectionFirstColumn({ y: height - footerSectionHeight, size: fontSize.md })
      );
      page.drawText(
        "Opened original cases are non-refundable. Opened or damaged bottles are non refundable.",
        secondSectionFirstColumn({ y: height - (footerSectionHeight + 20) })
      );
      page.drawText(
        "All returns or refunds must be previously approved in writing by the Company. Customers are requested to examine the goods at the time of delivery.",
        secondSectionFirstColumn({ y: height - (footerSectionHeight + 40) })
      );
      page.drawText(
        "If any deficiency and/or breakage is noticed please let our authorized delivery person know at once.",
        secondSectionFirstColumn({ y: height - (footerSectionHeight + 60) })
      );
      page.drawText(
        "No claims can be made once our authorized delivery person is no more in contact with the delivery. ",
        secondSectionFirstColumn({ y: height - (footerSectionHeight + 80) })
      );
      page.drawText(
        " All prices are in Hong Kong Dollars or otherwise indicated.",
        secondSectionFirstColumn({ y: height - (footerSectionHeight + 100) })
      );

      const footerSectionHeightForBottom = footerSectionHeight + 200;

      page.drawText(
        " A brand of Green Grand Ltd page2Height",
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom - 45, x: cellPadding }) //y 60
      );

      page.drawText(
        `#2505B- The Centrium,`,
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom + 15, x: 440 }) //y 105
      );
      page.drawText(
        `60 Wyndham Street- Central`,
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom - 15, x: 430 }) //y 105
      );
      page.drawText(
        `HK SAR China`,
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom - 45, x: 460 }) //y 105
      );

      page.drawText(
        `Tel: +852 6466 9196`,
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom - 45, x: 840 })
      ); //y 60
      page.drawText(
        `Email: contact@liquidcollectionhk.com`,
        secondSectionFirstColumn({ y: height - footerSectionHeightForBottom - 15, x: 760 }) //y 90
      );
    }

    const pdfDataUri = await pdfDoc.saveAsBase64({ dataUri: true });

    const pdfBytes = await pdfDoc.save();

    // return pdf file here.
    console.log("pdfDataUri", pdfDataUri);
    console.log("pdfBytes", pdfBytes);
    return { pdfDataUri, pdfBytes };
  }
}
