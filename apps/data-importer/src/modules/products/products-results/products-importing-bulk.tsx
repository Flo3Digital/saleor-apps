import { ProductColumnSchema } from "../products-importer-nuvo/products-columns-model";
import { GraphQLClient } from "../../../lib/graphql-client";

/**
 *
 * This is the main function that is called when importing all products at once
 *
 * @param props
 * @returns
 */
export const triggerBulkImport = (productData: ProductColumnSchema[]) => {
  const client = GraphQLClient();

  /**
   * Use Bulk Import Mutation
   */
  return "Bulk Importing";
};
