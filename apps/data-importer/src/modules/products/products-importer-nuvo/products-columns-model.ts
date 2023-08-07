import { ColumnAPI } from "nuvo-react";
import { z } from "zod";

const productColumns: ColumnAPI[] = [
  {
    label: "Product Name",
    key: "productCreate.general.name",
    columnType: "string",
  },
  {
    label: "Product Description",
    key: "productCreate.general.description",
    columnType: "string",
  },
  {
    label: "Product Type",
    key: "productCreate.general.productType",
    columnType: "string",
  },
  {
    label: "Product External Reference",
    key: "productCreate.general.externalReference",
    columnType: "string",
  },
  {
    label: "Product Brand",
    key: "productCreate.attributes.brand",
    columnType: "string",
  },
  {
    label: "Product Vintage",
    key: "productCreate.attributes.vintage",
    columnType: "string",
  },
  {
    label: "Product Size",
    key: "productCreate.attributes.size",
    columnType: "string",
  },
  {
    label: "Product Country",
    key: "productCreate.attributes.country",
    columnType: "string",
  },
  {
    label: "Product Attribute Type",
    key: "productCreate.attributes.type",
    columnType: "string",
  },
  {
    label: "Product Attribute Region",
    key: "productCreate.attributes.region",
    columnType: "string",
  },
  {
    label: "Product Stock Level",
    key: "productVariantCreate.stockLevel",
    columnType: "string",
  },
  {
    label: "Product Price",
    key: "productVariantCreate.price",
    columnType: "string",
  },
];

const allColumns: ColumnAPI[] = [...productColumns];

export const getProductsModelColumns = () => allColumns;

export const getResultModelSchema = () =>
  z.object({
    productCreate: z.object({
      general: z.object({
        name: z.string(),
        description: z.string().nullish(),
        category: z.string().nullish(),
        productType: z.string(),
        externalReference: z.string(),
      }),
      attributes: z.object({
        vintage: z.string().nullish(),
        brand: z.string().nullish(),
        size: z.string().nullish(),
        country: z.string().nullish(),
        type: z.string().nullish(),
        region: z.string().nullish(),
      }),
    }),
    productVariantCreate: z.object({
      stockLevel: z.string().nullish(),
      price: z.string(),
    }),
  });

export type ProductColumnSchema = z.infer<ReturnType<typeof getResultModelSchema>>;
