import {
  CreateProductVariantDocument,
  UpdateProductVariantDocument,
  ProductCreateInput,
  ProductInput,
  AttributeInputTypeEnum,
  ProductDetailsFragmentFragment,
  ProductVariantDetailsFragmentFragment,
  CreateProductDocument,
  ProductByExternalReferenceDocument,
  UpdateProductDocument,
  ProductVariantInput,
  ProductDetailsForVariantFragmentFragment,
  ProductBasicFragmentFragment,
  ProductVariantCreateInput,
  ProductChannelListingUpdateDocument,
  ProductVariantChannelListingUpdateDocument,
} from "./../../generated/graphql";
import { Client } from "urql";

type ProductResponse =
  | ProductDetailsFragmentFragment
  | ProductDetailsForVariantFragmentFragment
  | ProductBasicFragmentFragment
  | null;
type ProductVariantResponse = ProductVariantDetailsFragmentFragment | null;

/**
 * Retrieves a product by its external reference.
 *
 * @param externalReference - The external reference of the product to retrieve.
 * @param client - The Saleor client used to make the query.
 * @returns A Promise that resolves to the retrieved product or null if the product was not found.
 */
async function getProductByExternalReference(
  externalReference: string,
  client: Client
): Promise<ProductResponse | null> {
  let result = await client
    .query(ProductByExternalReferenceDocument, { externalReference: externalReference })
    .toPromise();
  const product = result?.data?.product;

  if (product?.id) {
    return product;
  } else {
    return null;
  }
}

/**
 * Creates a new product.
 *
 * @param input - The input data for the new product.
 * @param client - The Saleor client used to make the mutation.
 * @returns A Promise that resolves to the created product or throws an error if an error occurred.
 */
async function createProduct(
  input: ProductCreateInput,
  client: Client
): Promise<ProductResponse | null> {
  console.log("Product does not yet exist, creating...");
  const result = await client.mutation(CreateProductDocument, { input: input }).toPromise();
  const product = result?.data?.productCreate?.product;

  if (product?.id) {
    return product;
  } else if (result?.error) {
    throw new Error(result?.error.message);
  } else if (result?.data?.productCreate?.errors[0]) {
    throw new Error(String(result?.data?.productCreate?.errors[0]?.message));
  } else {
    throw new Error("Error creating product");
  }
}

/**
 * Updates an existing product.
 *
 * @param id - The ID of the product to update.
 * @param input - The input data for the updated product.
 * @param client - The Saleor client used to make the mutation.
 * @returns A Promise that resolves to the updated product or throws an error if an error occurred.
 */
async function updateProduct(
  id: string,
  input: ProductInput,
  client: Client
): Promise<ProductResponse | null> {
  console.log("Product exists, updating...");
  const result = await client
    .mutation(UpdateProductDocument, { id: id, productInput: input })
    .toPromise();
  const product = result?.data?.productUpdate?.product;

  if (product?.id) {
    return product;
  } else if (result?.error) {
    throw new Error(result?.error.message);
  } else if (result?.data?.productUpdate?.errors[0]) {
    throw new Error(String(result?.data?.productUpdate?.errors[0]?.message));
  } else {
    throw new Error("Error updating product");
  }
}

/**
 * Creates a new product variant.
 *
 * @param input - The input data for the new product variant.
 * @param client - The Saleor client used to make the mutation.
 * @returns A Promise that resolves to the created product variant or throws an error if an error occurred.
 */
async function createProductVariant(
  input: ProductVariantCreateInput,
  client: Client
): Promise<ProductVariantResponse | null> {
  const result = await client.mutation(CreateProductVariantDocument, { input: input }).toPromise();
  const productVariant = result?.data?.productVariantCreate?.productVariant;

  if (productVariant?.id) {
    return productVariant;
  } else if (result?.error) {
    throw new Error(result?.error.message);
  } else if (result?.data?.productVariantCreate?.errors[0]) {
    throw new Error(String(result?.data?.productVariantCreate?.errors[0]?.message));
  } else {
    throw new Error("Error creating product variant");
  }
}

/**
 * Updates an existing product variant.
 *
 * @param id - The ID of the product variant to update.
 * @param input - The input data for the updated product variant.
 * @param client - The Saleor client used to make the mutation.
 * @returns A Promise that resolves to the updated product variant or throws an error if an error occurred.
 */
async function updateProductVariant(
  id: string,
  input: ProductVariantInput,
  client: Client
): Promise<ProductVariantResponse | null> {
  console.log("updating product variant...");
  const result = await client
    .mutation(UpdateProductVariantDocument, { id: id, input: input })
    .toPromise();
  const productVariant = result?.data?.productVariantUpdate?.productVariant;

  if (productVariant?.id) {
    return productVariant;
  } else if (result?.error) {
    throw new Error(result?.error.message);
  } else if (result?.data?.productVariantUpdate?.errors[0]) {
    throw new Error(String(result?.data?.productVariantUpdate?.errors[0]?.message));
  } else {
    throw new Error("Error updating product variant");
  }
}

/**
 * Sets the channel listing for a product.
 *
 * @param channelId - The ID of the channel to set the listing for.
 * @param product - The product to set the channel listing for.
 * @param publish - Whether the product should be published on the channel.
 * @param isAvailableForPurchase - Whether the product should be available for purchase on the channel.
 * @param visibleInListings - Whether the product should be visible in listings on the channel.
 * @param client - The Saleor client used to make the mutation.
 * @returns A Promise that resolves to the updated channel listing or throws an error if an error occurred.
 */

async function setChannelOnProduct(
  channelId: string,
  product: ProductResponse,
  publish: boolean,
  isAvailableForPurchase: boolean,
  visibleInListings: boolean,
  client: Client
) {
  // Set channel listing
  const result = await client
    .mutation(ProductChannelListingUpdateDocument, {
      productId: String(product?.id),
      productChannelListingUpdateInput: {
        updateChannels: [
          {
            channelId: channelId,
            isPublished: publish,
            isAvailableForPurchase: isAvailableForPurchase,
            visibleInListings: visibleInListings,
          },
        ],
      },
    })
    .toPromise();
  const channelListingUpdate = result?.data?.productChannelListingUpdate;

  if (result?.error) {
    throw new Error(result?.error.message);
  } else if (result?.data?.productChannelListingUpdate?.errors[0]) {
    throw new Error(String(result?.data?.productChannelListingUpdate?.errors[0]?.message));
  } else if (channelListingUpdate) {
    return channelListingUpdate;
  } else {
    throw new Error("Error setting channel listing on Product");
  }
}

/**
 * Sets the channel listing for a product variant.
 *
 * @param channelId - The ID of the channel to set the listing for.
 * @param productVariant - The product variant to set the channel listing for.
 * @param price - The price of the product variant on the channel.
 * @param client - The Saleor client used to make the mutation.
 * @returns A Promise that resolves to the updated channel listing or throws an error if an error occurred.
 */
async function setChannelOnProductVariant(
  channelId: string,
  productVariant: ProductVariantResponse,
  price: number,
  client: Client
) {
  // Set channel listing
  const result = await client
    .mutation(ProductVariantChannelListingUpdateDocument, {
      productVariantId: String(productVariant?.id),
      input: {
        channelId: channelId,
        price: price,
      },
    })
    .toPromise();

  const channelListingUpdate = result?.data?.productVariantChannelListingUpdate;

  if (result?.error) {
    throw new Error(result?.error.message);
  } else if (result?.data?.productVariantChannelListingUpdate?.errors[0]) {
    throw new Error(String(result?.data?.productVariantChannelListingUpdate?.errors[0]?.message));
  } else if (channelListingUpdate) {
    return channelListingUpdate;
  } else {
    throw new Error("Error setting channel listing on Product Variant");
  }
}

export {
  createProduct,
  updateProduct,
  createProductVariant,
  updateProductVariant,
  getProductByExternalReference,
  setChannelOnProduct,
  setChannelOnProductVariant,
};
