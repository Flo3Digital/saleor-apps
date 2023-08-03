import { Box, TableCell, TableRow } from "@material-ui/core";
import { Done, Error, HourglassEmpty } from "@material-ui/icons";
import React, { useCallback, useEffect } from "react";
import { useProductCreateMutation } from "../../../../generated/graphql";
import { ProductColumnSchema } from "../products-importer-nuvo/products-columns-model";
import { actions, useAppBridge } from "@saleor/app-sdk/app-bridge";
import { Button } from "@saleor/macaw-ui";
import * as Sentry from "@sentry/nextjs";

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
    // Switch this to GraphQL Type for Attributes
    const attributes: (
      | { id: string; plainText: string }
      | { id: string; dropdown: { value: string } }
    )[] = [];

    if (props.importedModel.productCreate.attributes) {
      if (props.importedModel.productCreate.attributes.vintage) {
        attributes.push({
          id: "QXR0cmlidXRlOjU=",
          plainText: props.importedModel.productCreate.attributes.vintage,
        });
      }
      if (props.importedModel.productCreate.attributes.brand) {
        attributes.push({
          id: "QXR0cmlidXRlOjY=",
          plainText: props.importedModel.productCreate.attributes.brand,
        });
      }
      if (props.importedModel.productCreate.attributes.size) {
        attributes.push({
          id: "QXR0cmlidXRlOjQ=",
          dropdown: { value: props.importedModel.productCreate.attributes.size },
        });
      }
      if (props.importedModel.productCreate.attributes.country) {
        attributes.push({
          id: "QXR0cmlidXRlOjI=",
          dropdown: { value: props.importedModel.productCreate.attributes.country },
        });
      }
      if (props.importedModel.productCreate.attributes.type) {
        attributes.push({
          id: "QXR0cmlidXRlOjE=",
          dropdown: { value: props.importedModel.productCreate.attributes.type },
        });
      }
      if (props.importedModel.productCreate.attributes.region) {
        attributes.push({
          id: "QXR0cmlidXRlOjg=",
          dropdown: { value: props.importedModel.productCreate.attributes.region },
        });
      }
    }

    Sentry.captureMessage("Attributes");
    const productCreateMutation = {
      input: {
        ...props.importedModel.productCreate.general,
        attributes: [...attributes],
        productType: props.importedModel.productCreate.general.productType,
      },
    };

    console.log("productCreateMutation", productCreateMutation);
    mutate(productCreateMutation);

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
      <TableCell>{props.importedModel.productCreate.general.name}</TableCell>
      <TableCell>{renderStatus()}</TableCell>
    </TableRow>
  );
};
