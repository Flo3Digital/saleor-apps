import { ProductColumnSchema } from "../products-importer-nuvo/products-columns-model";
import { GraphQLClient } from "../../../lib/graphql-client";
import { createBulkProduct, getProductByExternalReference } from "../../../models/Product";
import { AttributeValueInput, ProductBulkCreateInput } from "../../../../generated/graphql";
import { useEffect } from "react";
/**
 *
 * This is the main function that is called when importing all products at once
 *
 * @param props
 * @returns
 */
export const triggerBulkImport = async (productData: ProductColumnSchema[]) => {
  const client = GraphQLClient();
  const filterProductData = productData.map((product) => {
    const attributes: AttributeValueInput[] = [];
    const attributesFromProduct = product.productCreate.attributes;
    const catetoryFromProduct = product.productCreate?.general.category || "Q2F0ZWdvcnk6Mg==";
    const productFromProduct = product.productCreate.general;

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
    }

    const productCreateInput = {
      name: productFromProduct.name,
      description: productFromProduct.description,
      category: catetoryFromProduct,
      productType: productFromProduct.productType,
      externalReference: productFromProduct.externalReference,
      attributes: attributes,
    };

    return { ...productCreateInput };
  });
  const products: ProductBulkCreateInput[] = [...filterProductData];
  const addedProducts = await createBulkProduct(products, client);

  if (addedProducts.length > 0) {
    //success
    return { message: "success", products: addedProducts };
  } else {
    return { message: "error" };
  }
};
