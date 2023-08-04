import { Box, TableCell, TableRow } from "@material-ui/core";
import { Done, Error, HourglassEmpty } from "@material-ui/icons";
import React, { useCallback, useEffect } from "react";
import {
  useProductCreateMutation,
  useProductVariantCreateMutation,
  useProductVariantChannelListingUpdateMutation,
  useProductUpdateMutation,
  useProductGetByExternalReferenceQuery,
  useProductChannelListingUpdateMutation,
} from "../../../../generated/graphql";
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
   *
   */
  const [mutationResult, mutate] = useProductCreateMutation();
  const [mutationVariantResult, mutateVariant] = useProductVariantCreateMutation();
  const [ProductUpdateMutationResult, ProductUpdateMutate] = useProductUpdateMutation();
  const [queryProductResult, queryProduct] = useProductGetByExternalReferenceQuery({
    variables: {
      externalReference: props.importedModel.productCreate.general.externalReference,
      channel: "hong-kong",
    },
  });
  const [channelListingMutationResult, channelListingMutation] =
    useProductChannelListingUpdateMutation();
  const [variantChannelListingMutationResult, variantChannelListingMutation] =
    useProductVariantChannelListingUpdateMutation();

  /**
   * Callback function to trigger the mutation and create/update the product
   */
  const triggerMutation = useCallback(async () => {
    // Switch this to GraphQL Type for Attributes
    const attributes: (
      | { id: string; plainText: string }
      | { id: string; dropdown: { value: string } }
    )[] = [];

    /**
     * Set the attributes for the product
     */
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
    if (!props.importedModel.productCreate.general.category) {
      props.importedModel.productCreate.general.category = "Q2F0ZWdvcnk6Mg==";
    }

    /**
     * TODO: PUT THIS BACK LATER:: If the Product ID exists, then we need to update the product instead of creating it
     */
    // if (productId) {

    /*
     *   const productUpdateMutation = {
     *     id: productId,
     *     input: {
     *       ...props.importedModel.productCreate.general,
     *       attributes: [...attributes],
     *       productType: props.importedModel.productCreate.general.productType,
     *     },
     *   };
     */

    /*
     *   console.log("Product already exists - updating", productUpdateMutation);
     *   ProductUpdateMutate(productUpdateMutation);
     */

    // } else {

    // }

    const productInput = {
      ...props.importedModel.productCreate.general,
      attributes: attributes,
      productType: props.importedModel.productCreate.general.productType,
    };

    Sentry.captureMessage("Product ID");
    console.log(queryProductResult.data?.product?.id);

    let productMutation: Promise<any>;

    if (queryProductResult.data?.product?.id) {
      productMutation = ProductUpdateMutate({
        id: queryProductResult.data?.product?.id,
        input: productInput,
      });
    } else {
      productMutation = mutate({ input: productInput });
    }

    /**
     * If the product is created, then we need to create the channel listing and variant
     */
    productMutation.then((result) => {
      Sentry.captureMessage("Product Channel Listing");
      if (result.data?.productCreate?.product?.id) {
        channelListingMutation({
          id: String(result.data?.productCreate?.product?.id),
          input: {
            updateChannels: [
              {
                channelId: "Q2hhbm5lbDoy",
                isAvailableForPurchase: true,
                isPublished: true,
                visibleInListings: true,
              },
            ],
          },
        });
        const productVariantCreateResult = mutateVariant({
          input: {
            attributes: [{}],
            product: result.data?.productCreate?.product?.id,
            sku: props.importedModel.productCreate.general.externalReference,
            trackInventory: true,
            stocks: [
              {
                warehouse: "V2FyZWhvdXNlOjc1Y2MyNjg5LWE3YWItNGEyYS05NGI3LTUyNGUwOTczNWI1YQ==",
                quantity: Number(props.importedModel.productVariantCreate.stockLevel),
              },
            ],
          },
        });

        productVariantCreateResult.then((result) => {
          Sentry.captureMessage("Variant Channel Listing");
          console.log("Creating Variant Channel Listing");
          variantChannelListingMutation({
            id: String(result.data?.productVariantCreate?.productVariant?.id),
            input: [
              {
                price: props.importedModel.productVariantCreate.price,
                channelId: "Q2hhbm5lbDoy",
              },
            ],
          });
        });
      }
    });
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
