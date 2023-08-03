import { Box, TableCell, TableRow } from "@material-ui/core";
import { Done, Error, HourglassEmpty } from "@material-ui/icons";
import React, { useCallback, useEffect } from "react";
import { useProductCreateMutation } from "../../../../generated/graphql";
import { ProductColumnSchema } from "../products-importer-nuvo/products-columns-model";
import { actions, useAppBridge } from "@saleor/app-sdk/app-bridge";
import { Button } from "@saleor/macaw-ui";

type Props = {
  importedModel: ProductColumnSchema;
  doImport: boolean;
};

const ImportedStatus = ({ id }: { id: string }) => {
  const { appBridge } = useAppBridge();

  return (
    <Box style={{ gap: 20, display: "flex", alignItems: "center" }}>
      <Done color="primary" width={30} />
      <span
        style={{ cursor: "pointer" }}
        onClick={() => {
          appBridge?.dispatch(
            actions.Redirect({
              // newContext: true, // open in new context but dashboard has a bug here
              to: `/products/${id}`,
            })
          );
        }}
      >
        Imported with ID <code>{id}</code>
      </span>
    </Box>
  );
};

const ErrorStatus = ({ message, onRetry }: { message: string; onRetry(): void }) => {
  return (
    <Box style={{ gap: 20, display: "flex", alignItems: "center" }}>
      <Error width={30} color="error" />
      <span color="error">Error importing: {message}</span>
      <Button onClick={onRetry}>Retry</Button>
    </Box>
  );
};
const PendingStatus = () => (
  <Box style={{ gap: 20, display: "flex", alignItems: "center" }}>
    <HourglassEmpty width={30} />
    <span>Importing...</span>
  </Box>
);

export const ProductImportingRow = (props: Props) => {
  const [mutationResult, mutate] = useProductCreateMutation();
  const triggerMutation = useCallback(() => {
    if (props.importedModel.productCreate.attribute.vintage) {
      props.importedModel.productCreate.attribute.vintage.id = "QXR0cmlidXRlOjU=";
    }
    if (props.importedModel.productCreate.attribute.brand) {
      props.importedModel.productCreate.attribute.brand.id = "QXR0cmlidXRlOjY=";
    }
    if (props.importedModel.productCreate.attribute.size) {
      props.importedModel.productCreate.attribute.size.id = "QXR0cmlidXRlOjQ=";
    }
    if (props.importedModel.productCreate.attribute.country) {
      props.importedModel.productCreate.attribute.country.id = "QXR0cmlidXRlOjI=";
    }
    if (props.importedModel.productCreate.attribute.type) {
      props.importedModel.productCreate.attribute.type.id = "QXR0cmlidXRlOjE=";
    }
    if (props.importedModel.productCreate.attribute.region) {
      props.importedModel.productCreate.attribute.region.id = "QXR0cmlidXRlOjg=";
    }
    mutate({
      input: {
        ...props.importedModel.productCreate,
        productType: props.importedModel.productCreate.type,
      },
    });

    /*
     * Add additional Mutations here for (can find these in documentation that I sent to Karim):
     * - ProductVariantCreateMutation
     * - Product Channel Update Mutation
     * - Product Variant Channel Update Mutation
     */
  }, [props.importedModel, mutate]);

  useEffect(() => {
    if (
      props.doImport &&
      !mutationResult.data &&
      !mutationResult.error &&
      !mutationResult.fetching
    ) {
      triggerMutation();
    }
  }, [props.doImport, mutate, mutationResult, triggerMutation]);

  const renderStatus = () => {
    if (mutationResult.data?.productCreate?.product?.id) {
      return <ImportedStatus id={mutationResult.data?.productCreate?.product?.id} />;
    }

    if (mutationResult.data?.productCreate?.errors) {
      return (
        <ErrorStatus
          onRetry={triggerMutation}
          message={mutationResult.data?.productCreate?.errors[0].message ?? "Error importing"}
        />
      );
    }

    if (mutationResult.fetching) {
      return <PendingStatus />;
    }
  };

  return (
    <TableRow>
      <TableCell>{props.importedModel.productCreate.name}</TableCell>
      <TableCell>{renderStatus()}</TableCell>
    </TableRow>
  );
};
