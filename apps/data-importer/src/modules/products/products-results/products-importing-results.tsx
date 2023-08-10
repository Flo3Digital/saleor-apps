import { Button } from "@saleor/macaw-ui";
import { Table, TableBody, Typography } from "@material-ui/core";
import { ProductImportingRow } from "./products-importing-row";
import React, { useState } from "react";
import { ProductColumnSchema } from "../products-importer-nuvo/products-columns-model";
import { triggerBulkImport } from "./products-importing-bulk";
import { GraphQLClient } from "../../../lib/graphql-client";

export const ProductsImportingResults = ({
  importedLines,
}: {
  importedLines: ProductColumnSchema[];
}) => {
  const [importingStarted, setImportingStarted] = useState(false);
  const [existingProducts, setExistingProducts] = useState<string[]>([]);
  const [startImporting, setStartImporting] = useState<null | string>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const client = GraphQLClient();

  const handleBulkImport = async () => {
    if (startImporting) return;
    setExistingProducts(() => []);
    setStartImporting(() => "Importing...");
    setSuccess(() => false);
    const result = await triggerBulkImport(importedLines, client, setExistingProducts);

    setSuccess(() => true);
    setStartImporting(() => null);
    console.log("result", result);
  };

  return (
    <div style={{ marginTop: 20 }}>
      <Typography paragraph variant="h3">
        Products rows from the imported file
      </Typography>

      <Typography paragraph>
        Lines will be imported one by one. Failed imports can be retried, but performed operations
        must be reverted manually. Users will be set to inactive.
      </Typography>
      <Typography paragraph>
        Products will <strong>not</strong> be informed or notified by this operation.
      </Typography>

      {/* {!importingStarted && (
        <Button
          style={{ margin: "20px 0" }}
          variant="primary"
          onClick={() => setImportingStarted(true)}
        >
          Start importing
        </Button>
      )} */}

      <Button style={{ margin: "20px 0" }} variant="primary" onClick={() => handleBulkImport()}>
        {startImporting ? startImporting : "Bulk Import"}
      </Button>
      {success && (
        <Typography style={{ color: "#53B749" }}>
          Congratulation. You successfully imported products.
        </Typography>
      )}
      {existingProducts.map((each, index) => (
        <Typography key={index} style={{ color: "#F5212D" }}>
          {index + 1}. {each} is already exists. We won&lsquo;t add existing products.
        </Typography>
      ))}
      {/* <Table style={{ marginTop: 50 }}>
        <TableBody>
          {importedLines.map((row) => (
            <ProductImportingRow
              doImport={importingStarted}
              key={row.productCreate.general.name}
              importedModel={row}
            />
          ))}
        </TableBody>
      </Table> */}
    </div>
  );
};
