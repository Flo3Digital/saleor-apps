import { NextPage } from "next";
import { useAppBridge } from "@saleor/app-sdk/app-bridge";
import { useEffect } from "react";
import { useIsMounted } from "usehooks-ts";
import { useRouter } from "next/router";
import { isInIframe } from "@saleor/apps-shared";
import { Box, Text } from "@saleor/macaw-ui/next";
import { useState } from "react";
import { PdfLibInvoiceGenerator } from "../modules/invoices/invoice-generator/pdf-lib/pdfLibInvoiceGenerator";

const IndexPage: NextPage = () => {
  const { appBridgeState } = useAppBridge();
  const isMounted = useIsMounted();
  const { replace } = useRouter();
  const [pdfDataUri, setPdfDataUri] = useState<null | string>("");
  const handleGenerate = async () => {
    const pdfInvoiceGenerator = new PdfLibInvoiceGenerator();
    const pdfUri = await pdfInvoiceGenerator.createTestPdf();

    setPdfDataUri(() => pdfUri.pdfDataUri);
  };

  useEffect(() => {
    if (isMounted() && appBridgeState?.ready) {
      replace("/configuration");
    }
  }, [isMounted, appBridgeState?.ready]);

  if (isInIframe()) {
    return null;
  }

  return (
    <Box>
      <Text as={"h1"} variant={"hero"}>
        Saleor Invoices
      </Text>
      <Text as={"p"}>This is Saleor App that allows invoices generation</Text>
      <Text as={"p"}>
        Install app in your Saleor instance and open in with Dashboard{" "}
        <a href={"https://github.com/saleor/apps"}>or check it on Github</a>
      </Text>
      <Box
        display={"flex"}
        flexDirection={"column"}
        alignItems={"center"}
        justifyContent={"center"}
      >
        <button
          onClick={handleGenerate}
          style={{ width: "100px", height: "40px", marginBottom: "20px", marginTop: "20px" }}
        >
          Generate Test PDF Template
        </button>
        <>
          <iframe
            id="pdf"
            src={pdfDataUri ? pdfDataUri : ""}
            style={{ width: "1000px", height: "1000px" }}
          ></iframe>
        </>
      </Box>
    </Box>
  );
};

export default IndexPage;
