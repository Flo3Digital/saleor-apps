import { ProductColumnSchema } from "../products-importer-nuvo/products-columns-model";
import { GraphQLClient } from "../../../lib/graphql-client";
import { createBulkProduct, getProductByExternalReference } from "../../../models/Product";
import {
  AttributeValueInput,
  ProductBulkCreateInput,
  ProductChannelListingCreateInput,
} from "../../../../generated/graphql";
import { useEffect } from "react";
import { Client } from "urql";

/**
 *
 * This is the main function that is called when importing all products at once
 *
 * @param props
 * @returns
 */
export const triggerBulkImport = async (
  productData: ProductColumnSchema[],
  client: Client,
  setExistingProducts: (e: string[]) => void,
) => {
  setExistingProducts([]);
  let existingProductsList: string[] = [];
  const mapProductData = await Promise.all(
    productData.map(async (product) => {
      const productExists = await getProductByExternalReference(
        product.productCreate.general.externalReference,
        client,
      );

      if (productExists) {
        existingProductsList.push(product.productCreate.general.name);
        return null;
      }
      const attributes: AttributeValueInput[] = [];
      const attributesFromProduct = product.productCreate.attributes;
      const catetoryFromProduct = product.productCreate?.general.category || "Q2F0ZWdvcnk6Mg==";
      const productFromProduct = product.productCreate.general;
      const channelsId = ["Q2hhbm5lbDoy"];
      const channelListings = channelsId.map((id) => {
        return {
          channelId: id,
          isAvailableForPurchase: true,
          isPublished: true,
          visibleInListings: true,
        };
      });
      const channelListingsForVariants = channelsId.map((id) => {
        const price = product.productVariantCreate.price;

        return {
          channelId: id,
          price,
        };
      });

      if (attributesFromProduct) {
        if (attributesFromProduct.vintage) {
          attributes.push({
            id: "QXR0cmlidXRlOjU=",
            numeric: attributesFromProduct.vintage,
          });
        }
        if (attributesFromProduct.brand) {
          attributes.push({
            id: "QXR0cmlidXRlOjY=",
            plainText: attributesFromProduct.brand,
          });
        }
        if (attributesFromProduct.size) {
          attributes.push({
            id: "QXR0cmlidXRlOjQ=",
            dropdown: { value: attributesFromProduct.size },
          });
        }
        if (attributesFromProduct.country) {
          attributes.push({
            id: "QXR0cmlidXRlOjI=",
            dropdown: { value: attributesFromProduct.country },
          });
        }
        if (attributesFromProduct.type) {
          attributes.push({
            id: "QXR0cmlidXRlOjE=",
            dropdown: { value: attributesFromProduct.type },
          });
        }
        if (attributesFromProduct.region) {
          attributes.push({
            id: "QXR0cmlidXRlOjg=",
            dropdown: { value: attributesFromProduct.region },
          });
        }
      }

      const productVariants = [
        {
          attributes: [],
          sku: productFromProduct.externalReference,
          trackInventory: true,
          stocks: [
            {
              warehouse: "V2FyZWhvdXNlOjc1Y2MyNjg5LWE3YWItNGEyYS05NGI3LTUyNGUwOTczNWI1YQ==",
              quantity: Number(product.productVariantCreate.stockLevel)
                ? Number(product.productVariantCreate.stockLevel)
                : 0,
            },
          ],
          channelListings: channelListingsForVariants,
        },
      ];

      const productCreateInput = {
        name: productFromProduct.name,
        description: productFromProduct.description,
        category: catetoryFromProduct,
        productType: productFromProduct.productType,
        externalReference: productFromProduct.externalReference,
        attributes: attributes,
        channelListings,
        variants: productVariants,
      };

      return { ...productCreateInput };
    }),
  );

  const filterProductData: any[] = mapProductData.filter((item) => item !== null);
  const products: ProductBulkCreateInput[] = [...filterProductData];

  setExistingProducts(existingProductsList);
  const addedProducts = await createBulkProduct(products, client);

  if (addedProducts.length > 0) {
    //success
    return { message: "success", products: addedProducts };
  } else {
    return { message: "error" };
  }
};
