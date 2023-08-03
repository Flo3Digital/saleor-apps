import { Button } from "@saleor/macaw-ui";
import { Table, TableBody, Typography } from "@material-ui/core";
import { ProductImportingRow } from "./products-importing-row";
import React, { useState } from "react";
import { ProductColumnSchema } from "../products-importer-nuvo/products-columns-model";

export const ProductsImportingResults = ({
  importedLines,
}: {
  importedLines: ProductColumnSchema[];
}) => {
  const [importingStarted, setImportingStarted] = useState(false);

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

      {!importingStarted && (
        <Button
          style={{ margin: "20px 0" }}
          variant="primary"
          onClick={() => setImportingStarted(true)}
        >
          Start importing
        </Button>
      )}

      <Table style={{ marginTop: 50 }}>
        <TableBody>
          {importedLines.map((row) => (
            <ProductImportingRow
              doImport={importingStarted}
              key={row.productCreate.general.name}
              importedModel={row}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
