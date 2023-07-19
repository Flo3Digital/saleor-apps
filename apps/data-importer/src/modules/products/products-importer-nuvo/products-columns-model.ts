import { ColumnAPI } from "nuvo-react";
import { z } from "zod";

const productColumns: ColumnAPI[] = [
  {
    label: "Product Name",
    key: "productCreate.name",
    columnType: "string",
  },
  {
    label: "Product description",
    key: "productCreate.description",
    columnType: "string",
  },
  {
    label: "Product price",
    key: "productCreate.price",
    columnType: "string",
  },
  {
    label: "Product vintage",
    key: "productCreate.vintage",
    columnType: "string",
  },
  {
    label: "Product type",
    key: "productCreate.type",
    columnType: "string",
  },
  {
    label: "Product Category",
    key: "productCreate.category",
    columnType: "string",
  },
];

// TODO - enable address columns when mapped
const allColumns: ColumnAPI[] = [
  ...productColumns,
  /*
   * ...generateAddressColumns("Default Billing Address", "defaultBillingAddress"),
   * ...generateAddressColumns("Default Shipping Address", "defaultShippingAddress"),
   */
];

export const getProductsModelColumns = () => allColumns;

export const getResultModelSchema = () =>
  z.object({
    productCreate: z.object({
      name: z.string().nullish(),
      description: z.string().nullish(),
      price: z.string(),
      vintage: z.string().nullish(),
      category: z.string().nullish(),
    }),
  });

export type ProductColumnSchema = z.infer<ReturnType<typeof getResultModelSchema>>;
