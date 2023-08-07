import { Box, TableCell, TableRow } from "@material-ui/core";
import { Done, Error, HourglassEmpty } from "@material-ui/icons";
import React, { useCallback, useEffect } from "react";
import { useProductCreateMutation, AttributeValueInput } from "../../../../generated/graphql";
import {
  getProductByExternalReference,
  createProduct,
  updateProduct,
  createProductVariant,
  updateProductVariant,
  setChannelOnProduct,
  setChannelOnProductVariant,
} from "../../../models/Product";
import { ProductColumnSchema } from "../products-importer-nuvo/products-columns-model";
import { actions, useAppBridge } from "@saleor/app-sdk/app-bridge";
import { GraphQLClient } from "../../../lib/graphql-client";
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

/**
 *
 *
 * This is the main function that is called when importing a product.
 *
 * @param props
 * @returns
 */
export const ProductImportingRow = (props: Props) => {
  /**
   *
   * Mutations
   *
   */
  const [mutationResult, mutate] = useProductCreateMutation();
  // const [ProductUpdateMutationResult, ProductUpdateMutate] = useProductUpdateMutation();

  /*
   * const [mutationVariantResult, mutateVariant] = useProductVariantCreateMutation();
   * const [channelListingMutationResult, channelListingMutation] =
   *   useProductChannelListingUpdateMutation();
   * const [variantChannelListingMutationResult, variantChannelListingMutation] =
   *   useProductVariantChannelListingUpdateMutation();
   */
  const client = GraphQLClient();

  /**
   * Callback function to trigger the mutation and create/update the product
   */
  const triggerMutation = useCallback(async () => {
    // Switch this to GraphQL Type for Attributes
    const attributes: AttributeValueInput[] = [];

    /**
     * Set the attributes for the product
     *
     * TODO: MAKE ANOTHER LIBRARY FUNCTION THAT GETS ALL ATTRIBUTES FROM THE GRAPHQL API AND THEN MAPS THESE VALUES TO THE CORRECT ID
     */
    if (props.importedModel.productCreate.attributes) {
      if (props.importedModel.productCreate.attributes.vintage) {
        attributes.push({
          id: "QXR0cmlidXRlOjU=",
          numeric: props.importedModel.productCreate.attributes.vintage,
        });
      }
      if (props.importedModel.productCreate.attributes.brand) {
        attributes.push({
          id: "QXR0cmlidXRlOjY=",
          plainText: props.importedModel.productCreate.attributes.brand,
        });
      }
      /*
       * if (props.importedModel.productCreate.attributes.size) {
       *   attributes.push({
       *     id: "QXR0cmlidXRlOjQ=",
       *     dropdown: { value: props.importedModel.productCreate.attributes.size },
       *   });
       * }
       * if (props.importedModel.productCreate.attributes.country) {
       *   attributes.push({
       *     id: "QXR0cmlidXRlOjI=",
       *     dropdown: { value: props.importedModel.productCreate.attributes.country },
       *   });
       * }
       * if (props.importedModel.productCreate.attributes.type) {
       *   attributes.push({
       *     id: "QXR0cmlidXRlOjE=",
       *     dropdown: { value: props.importedModel.productCreate.attributes.type },
       *   });
       * }
       * if (props.importedModel.productCreate.attributes.region) {
       *   attributes.push({
       *     id: "QXR0cmlidXRlOjg=",
       *     dropdown: { value: props.importedModel.productCreate.attributes.region },
       *   });
       * }
       */
    }
    if (!props.importedModel.productCreate.general.category) {
      props.importedModel.productCreate.general.category = "Q2F0ZWdvcnk6Mg==";
    }

    const productInput = {
      ...props.importedModel.productCreate.general,
      attributes: attributes,
      productType: props.importedModel.productCreate.general.productType,
    };

    let product = await getProductByExternalReference(
      props.importedModel.productCreate.general.externalReference,
      client
    );

    if (!product?.id) {
      // create the product if we didn't find it
      try {
        product = await createProduct(productInput, client);
        setChannelOnProduct("Q2hhbm5lbDoy", product, true, true, true, client);
      } catch (error) {
        Sentry.captureException(error);
      }
    } else {
      // else update it
      try {
        product = await updateProduct(product.id, productInput, client);
        setChannelOnProduct("Q2hhbm5lbDoy", product, true, true, true, client);
      } catch (error) {
        Sentry.captureException(error);
      }
    }

    // If we managed to create or find the product then set the channel on it and create the variant
    if (product?.id) {
      try {
        let productVariant = await createProductVariant(
          {
            attributes: [],
            product: product.id,
            sku: props.importedModel.productCreate.general.externalReference,
            trackInventory: true,
            stocks: [
              {
                warehouse: "V2FyZWhvdXNlOjc1Y2MyNjg5LWE3YWItNGEyYS05NGI3LTUyNGUwOTczNWI1YQ==",
                quantity: Number(props.importedModel.productVariantCreate.stockLevel)
                  ? Number(props.importedModel.productVariantCreate.stockLevel)
                  : 0,
              },
            ],
          },
          client
        );

        if (productVariant) {
          setChannelOnProduct("Q2hhbm5lbDoy", productVariant?.product, true, true, true, client);
          setChannelOnProductVariant(
            "Q2hhbm5lbDoy",
            productVariant,
            Number(
              Number(props.importedModel.productVariantCreate.price)
                ? Number(props.importedModel.productVariantCreate.price)
                : 0
            ),
            client
          );
        }
      } catch (error) {
        Sentry.captureException(error);
      }
    }
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
