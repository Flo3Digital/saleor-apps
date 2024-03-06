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
import { mockOrder } from "../../../../fixtures/mock-order";

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

    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    const page = pdfDoc.addPage([1000, 1500]);
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

    //header section
    const date = Intl.DateTimeFormat(this.settings.locale, {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(new Date(order.created));

    const headerSectionHeight = 270;
    const headerSectionDetail: { name: string; value: string }[] = [
      { name: "Order:", value: `${order.number}` },
      { name: "Amount:", value: `${order.total.gross.amount}` },
      { name: "Date:", value: `${date}` },
    ];

    page.drawText("INVOICE", secondSectionFirstColumn({ size: fontSize.md }));
    page.drawText(`${invoiceNumber}`, secondSectionSecondColumn({ size: fontSize.md }));
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
        value: `${order.billingAddress?.streetAddress1}, ${order.billingAddress?.streetAddress2}`,
      },
      { name: "Post Code:", value: `${order.billingAddress?.postalCode}` },
      { name: "City:", value: `${order.billingAddress?.city}` },
      { name: "Country:", value: `${order.billingAddress?.country?.country}` },
    ];

    page.drawText("CUSTOMER", secondSectionFirstColumn({ y: height - 380, size: fontSize.lg }));
    customerSectionDetail.forEach((each, index) => {
      const currentSectionHeight = customerSectionHeight + 10 + index * 20;

      page.drawText(each.name, secondSectionFirstColumn({ y: height - currentSectionHeight }));
      page.drawText(each.value, secondSectionSecondColumn({ y: height - currentSectionHeight }));
    });

    //seller section

    const sellerSectionHeight = 400;
    const sellerSectionDetail: { name: string; value: string }[] = [
      { name: "Company Name:", value: `${companyAddressData.companyName}` },
      {
        name: "Company Address:",
        value: `${companyAddressData.streetAddress1},${companyAddressData.streetAddress2}`,
      },
      { name: "Company PostCode:", value: `${companyAddressData.postalCode}` },
      { name: "Company City:", value: `${companyAddressData.city}` },
      { name: "Company Country", value: `${companyAddressData.country}` },
    ];

    page.drawText(
      "SELLER",
      secondSectionFirstColumn({ y: height - 380, x: secondSctionThirdCellLeft, size: fontSize.lg })
    );
    sellerSectionDetail.forEach((each, index) => {
      const currentSectionHeight = sellerSectionHeight + 10 + index * 20;

      page.drawText(
        each.name,
        secondSectionFirstColumn({ y: height - currentSectionHeight, x: secondSctionThirdCellLeft })
      );
      page.drawText(
        each.value,
        secondSectionSecondColumn({
          y: height - currentSectionHeight,
          x: secondSctionThirdCellLeft + 150,
        })
      );
    });

    page.drawText(
      "SHIPPING METHOD",
      secondSectionFirstColumn({ y: height - 250, x: secondSctionThirdCellLeft, size: fontSize.md })
    );
    page.drawText(
      `${orderFromQuery?.shippingMethodName}`,
      secondSectionFirstColumn({ y: height - 270, x: secondSctionThirdCellLeft })
    );

    page.drawText(
      "PAYMENT STATUS",
      secondSectionFirstColumn({ y: height - 320, size: fontSize.md, x: secondSctionThirdCellLeft })
    );
    page.drawText(
      `${orderFromQuery?.paymentStatusDisplay}`,
      secondSectionFirstColumn({ y: height - 340, x: secondSctionThirdCellLeft })
    );

    //table section

    const tableWidth = 900;
    const tableSectionHeight = 600;
    const tableRowSpacing = 50;

    const column1Spacing = 20;
    const column2Spacing = 350;
    const column3Spacing = 500;
    const column4Spacing = 650;
    const column5Spacing = 800;

    const column1Width = column2Spacing - column1Spacing;
    const column2Width = column3Spacing - column2Spacing;
    const column3Width = column4Spacing - column3Spacing;
    const column4Width = column5Spacing - column4Spacing;
    const column5Width = tableWidth - column5Spacing;
    const tableRow = ({
      row,
      column,
      size,
      color,
    }: {
      row: number;
      column: number;
      size?: number | undefined;
      color?: RGB | undefined;
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
      }
      const x = cellPadding + columnSpacing;
      const y = height - (tableSectionHeight + row * tableRowSpacing);

      return {
        x: x,
        y: y,
        size: size ? size : fontSize.base,
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

    const tableHeader = ["Description", "Quantity", "Vintage", "Format", "Total"];

    tableHeader.forEach((header, index) => {
      const row = 1;
      const column = index + 1;

      page.drawText(
        `${header}`,
        tableRow({ row: row, column: column, size: fontSize.md, color: rgb(1, 1, 1) })
      );
    });

    orderFromQuery?.lines?.forEach((line: any, index: number) => {
      const row = index + 2;
      const description = line?.productName;
      const quantity = line?.quantity;
      const vintage = getAttributeValue(line?.variant?.product?.attributes, "Vintage");
      const format = getAttributeValue(line?.variant?.product?.attributes, "Size");
      const subtotal = `${line?.totalPrice?.gross?.amount} ${line?.totalPrice?.gross?.currency}`;
      const tableRowArray = [description, quantity, vintage, format, subtotal];

      tableRowArray.forEach((each, i) => {
        const column = i + 1;

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
    let currentRowToContinue: number = 2 + (orderFromQuery?.lines.length || 0);

    if (orderFromQuery?.shippingMethodName && orderFromQuery.shippingPrice?.gross?.amount) {
      const tableRowArray = [
        orderFromQuery.shippingMethodName,
        "-",
        "-",
        "-",
        `${orderFromQuery.shippingPrice.gross.amount} ${orderFromQuery.shippingPrice.gross.currency}`,
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

    if (orderFromQuery.total?.net) {
      page.drawText(`TOTAL NET`, tableRow({ row: currentRowToContinue, column: 4 }));
      page.drawText(
        `${orderFromQuery.total.net.amount} ${orderFromQuery.total.net.currency}`,
        tableRow({ row: currentRowToContinue, column: 5 })
      );
      currentRowToContinue = currentRowToContinue + 1;
    }

    if (orderFromQuery.total?.tax) {
      page.drawText(`TOTAL TAX`, tableRow({ row: currentRowToContinue, column: 4 }));
      page.drawText(
        `${orderFromQuery.total.tax.amount} ${orderFromQuery.total.tax.currency}`,
        tableRow({ row: currentRowToContinue, column: 5 })
      );
      currentRowToContinue = currentRowToContinue + 1;
    }

    if (orderFromQuery.total?.gross) {
      page.drawText(`GRAND TOTAL`, tableRow({ row: currentRowToContinue, column: 4 }));
      page.drawText(
        `${orderFromQuery.total.gross.amount} ${orderFromQuery.total.gross.currency}`,
        tableRow({ row: currentRowToContinue, column: 5 })
      );
      currentRowToContinue = currentRowToContinue + 1;
    }

    //footer section

    const footerSectionHeight = tableSectionHeight + currentRowToContinue * tableRowSpacing + 50;

    page.drawText("TERMS AND CONDITION", secondSectionFirstColumn({ y: 250, size: fontSize.md }));
    page.drawText(
      "Opened original cases are non-refundable. Opened or damaged bottles are non refundable.",
      secondSectionFirstColumn({ y: 210 })
    );
    page.drawText(
      "All returns or refunds my be previously approved in writing by the Company. Customers are requested to examine the goods at the time of delivery.",
      secondSectionFirstColumn({ y: 180 })
    );
    page.drawText(
      "If any deficiency and/or breakage is noticed please let our authorized delivery person know at once.",
      secondSectionFirstColumn({ y: 150 })
    );
    page.drawText(
      "No claims can be made once our authorized delivery person is no more in contact with the delivery. ",
      secondSectionFirstColumn({ y: 120 })
    );
    page.drawText(
      " All prices are in Hong Kong Dollars or otherwise indicated.",
      secondSectionFirstColumn({ y: 90 })
    );

    const pdfDataUri = await pdfDoc.saveAsBase64({ dataUri: true });

    console.log("pdf dta uri", pdfDataUri);
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

      if (selectAttribute.length > 0) {
        return selectAttribute[0]?.values[0]?.name;
      } else {
        return "";
      }
    };

    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    const page = pdfDoc.addPage([1000, 1500]);
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

    //header section
    const date = Intl.DateTimeFormat(this.settings.locale, {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(new Date(order.created));

    const headerSectionHeight = 270;
    const headerSectionDetail: { name: string; value: string }[] = [
      { name: "Order:", value: `${order.number}` },
      { name: "Amount:", value: `${order.total.gross.amount}` },
      { name: "Date:", value: `${date}` },
    ];

    page.drawText("INVOICE", secondSectionFirstColumn({ size: fontSize.md }));
    page.drawText("102399", secondSectionSecondColumn({ size: fontSize.md }));
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
        value: `${order.billingAddress?.streetAddress1}, ${order.billingAddress?.streetAddress2}`,
      },
      { name: "Post Code:", value: `${order.billingAddress?.postalCode}` },
      { name: "City:", value: `${order.billingAddress?.city}` },
      { name: "Country:", value: `${order.billingAddress?.country?.country}` },
    ];

    page.drawText("CUSTOMER", secondSectionFirstColumn({ y: height - 380, size: fontSize.lg }));
    customerSectionDetail.forEach((each, index) => {
      const currentSectionHeight = customerSectionHeight + 10 + index * 20;

      page.drawText(each.name, secondSectionFirstColumn({ y: height - currentSectionHeight }));
      page.drawText(each.value, secondSectionSecondColumn({ y: height - currentSectionHeight }));
    });

    page.drawText(
      "SHIPPING METHOD",
      secondSectionFirstColumn({ y: height - 250, x: secondSctionThirdCellLeft, size: fontSize.md })
    );
    page.drawText(
      `${orderFromQuery?.shippingMethodName}`,
      secondSectionFirstColumn({ y: height - 270, x: secondSctionThirdCellLeft })
    );

    page.drawText(
      "PAYMENT STATUS",
      secondSectionFirstColumn({ y: height - 320, size: fontSize.md, x: secondSctionThirdCellLeft })
    );
    page.drawText(
      `${orderFromQuery?.paymentStatusDisplay}`,
      secondSectionFirstColumn({ y: height - 340, x: secondSctionThirdCellLeft })
    );

    //seller section

    const sellerSectionHeight = 400;
    const sellerSectionDetail: { name: string; value: string }[] = [
      { name: "Company Name:", value: `Liquid Collection` },
      { name: "Company Address:", value: `12 TST` },
      { name: "Company PostCode:", value: `0000` },
      { name: "Company City:", value: `Hong Kong` },
      { name: "Company Country", value: `Hong Kong Island` },
    ];

    page.drawText(
      "SELLER",
      secondSectionFirstColumn({ y: height - 380, x: secondSctionThirdCellLeft, size: fontSize.lg })
    );
    sellerSectionDetail.forEach((each, index) => {
      const currentSectionHeight = sellerSectionHeight + 10 + index * 20;

      page.drawText(
        each.name,
        secondSectionFirstColumn({ y: height - currentSectionHeight, x: secondSctionThirdCellLeft })
      );
      page.drawText(
        each.value,
        secondSectionSecondColumn({
          y: height - currentSectionHeight,
          x: secondSctionThirdCellLeft + 150,
        })
      );
    });

    //table section

    const tableWidth = 900;
    const tableSectionHeight = 600;
    const tableRowSpacing = 50;

    const column1Spacing = 20;
    const column2Spacing = 350;
    const column3Spacing = 500;
    const column4Spacing = 650;
    const column5Spacing = 800;

    const column1Width = column2Spacing - column1Spacing;
    const column2Width = column3Spacing - column2Spacing;
    const column3Width = column4Spacing - column3Spacing;
    const column4Width = column5Spacing - column4Spacing;
    const column5Width = tableWidth - column5Spacing;
    const tableRow = ({
      row,
      column,
      size,
      color,
    }: {
      row: number;
      column: number;
      size?: number | undefined;
      color?: RGB | undefined;
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
      }
      const x = cellPadding + columnSpacing;
      const y = height - (tableSectionHeight + row * tableRowSpacing);

      return {
        x: x,
        y: y,
        size: size ? size : fontSize.base,
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

    const tableHeader = ["Description", "Quantity", "Vintage", "Format", "Total"];

    tableHeader.forEach((header, index) => {
      const row = 1;
      const column = index + 1;

      page.drawText(
        `${header}`,
        tableRow({ row: row, column: column, size: fontSize.md, color: rgb(1, 1, 1) })
      );
    });

    orderFromQuery?.lines?.forEach((line: any, index: number) => {
      const row = index + 2;
      const description = line?.productName;
      const quantity = line?.quantity;
      const vintage = getAttributeValue(line?.variant?.product?.attributes, "Vintage");
      const format = getAttributeValue(line?.variant?.product?.attributes, "Size");
      const subtotal = `${line?.totalPrice?.gross?.amount} ${line?.totalPrice?.gross?.currency}`;
      const tableRowArray = [description, quantity, vintage, format, subtotal];

      tableRowArray.forEach((each, i) => {
        const column = i + 1;

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
    let currentRowToContinue: number = 2 + (orderFromQuery?.lines.length || 0);

    if (orderFromQuery?.shippingMethodName && orderFromQuery.shippingPrice?.gross?.amount) {
      const tableRowArray = [
        orderFromQuery.shippingMethodName,
        "-",
        "-",
        "-",
        `${orderFromQuery.shippingPrice.gross.amount} ${orderFromQuery.shippingPrice.gross.currency}`,
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

    if (orderFromQuery.total?.net) {
      page.drawText(`TOTAL NET`, tableRow({ row: currentRowToContinue, column: 4 }));
      page.drawText(
        `${orderFromQuery.total.net.amount} ${orderFromQuery.total.net.currency}`,
        tableRow({ row: currentRowToContinue, column: 5 })
      );
      currentRowToContinue = currentRowToContinue + 1;
    }

    if (orderFromQuery.total?.tax) {
      page.drawText(`TOTAL TAX`, tableRow({ row: currentRowToContinue, column: 4 }));
      page.drawText(
        `${orderFromQuery.total.tax.amount} ${orderFromQuery.total.tax.currency}`,
        tableRow({ row: currentRowToContinue, column: 5 })
      );
      currentRowToContinue = currentRowToContinue + 1;
    }

    if (orderFromQuery.total?.gross) {
      page.drawText(`GRAND TOTAL`, tableRow({ row: currentRowToContinue, column: 4 }));
      page.drawText(
        `${orderFromQuery.total.gross.amount} ${orderFromQuery.total.gross.currency}`,
        tableRow({ row: currentRowToContinue, column: 5 })
      );
      currentRowToContinue = currentRowToContinue + 1;
    }

    //footer section

    const footerSectionHeight = tableSectionHeight + currentRowToContinue * tableRowSpacing + 50;

    page.drawText("TERMS AND CONDITION", secondSectionFirstColumn({ y: 250, size: fontSize.md }));
    page.drawText(
      "Opened original cases are non-refundable. Opened or damaged bottles are non refundable.",
      secondSectionFirstColumn({ y: 210 })
    );
    page.drawText(
      "All returns or refunds my be previously approved in writing by the Company. Customers are requested to examine the goods at the time of delivery.",
      secondSectionFirstColumn({ y: 180 })
    );
    page.drawText(
      "If any deficiency and/or breakage is noticed please let our authorized delivery person know at once.",
      secondSectionFirstColumn({ y: 150 })
    );
    page.drawText(
      "No claims can be made once our authorized delivery person is no more in contact with the delivery. ",
      secondSectionFirstColumn({ y: 120 })
    );
    page.drawText(
      " All prices are in Hong Kong Dollars or otherwise indicated.",
      secondSectionFirstColumn({ y: 90 })
    );

    const pdfDataUri = await pdfDoc.saveAsBase64({ dataUri: true });

    console.log("pdf dta uri", pdfDataUri);
    const pdfBytes = await pdfDoc.save();

    // return pdf file here.
    return { pdfDataUri, pdfBytes };
  }
}