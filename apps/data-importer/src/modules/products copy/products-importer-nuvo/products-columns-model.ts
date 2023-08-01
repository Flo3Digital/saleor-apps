import { ColumnAPI } from "nuvo-react";
import { z } from "zod";

const productColumns: ColumnAPI[] = [
  {
    label: "Product Name",
    key: "productCreate.name",
    columnType: "string",
  },
  {
    label: "Product Description",
    key: "productCreate.description",
    columnType: "string",
  },
  {
    label: "Product Price",
    key: "productCreate.price",
    columnType: "string",
  },
  {
    label: "Product Vintage",
    key: "productCreate.vintage",
    columnType: "string",
  },
  {
    label: "Product Type",
    key: "productCreate.type",
    columnType: "string",
  },
  {
    label: "Product Size",
    key: "productCreate.size",
    columnType: "string",
  },
];

const allColumns: ColumnAPI[] = [...productColumns];

export const getProductsModelColumns = () => allColumns;

export const getResultModelSchema = () =>
  z.object({
    productCreate: z.object({
      name: z.string(),
      description: z.string().nullish(),
      price: z.string(),
      vintage: z.string().nullish(),
      category: z.string().nullish(),
      type: z.string(),
    }),
  });

export type ProductColumnSchema = z.infer<ReturnType<typeof getResultModelSchema>>;
