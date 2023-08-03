import { ColumnAPI } from "nuvo-react";
import { z } from "zod";

const productColumns: ColumnAPI[] = [
  {
    label: "Product Name",
    key: "productCreate.name",
    columnType: "string",
  },
  {
    label: "Product Type",
    key: "productCreate.type",
    columnType: "string",
  },
  {
    label: "Product Description",
    key: "productCreate.description",
    columnType: "string",
  },
  {
    label: "Product External Reference",
    key: "productCreate.externalReference",
    columnType: "string",
  },
  {
    label: "Product External Reference",
    key: "productVariantCreate.stockLevel",
    columnType: "string",
  },
  {
    label: "Product Price",
    key: "productCreate.price",
    columnType: "string",
  },
  {
    label: "Product Type",
    key: "productCreate.type",
    columnType: "string",
  },
  {
    label: "Product Brand",
    key: "productCreate.attribute.brand.plainText",
    columnType: "string",
  },
  {
    label: "Product Vintage",
    key: "productCreate.attribute.vintage.plainText",
    columnType: "string",
  },
  {
    label: "Product Size",
    key: "productCreate.attribute.size.dropdown.value",
    columnType: "string",
  },
  {
    label: "Product Country",
    key: "productCreate.attribute.country.dropdown.value",
    columnType: "string",
  },
  {
    label: "Product Attribute Type",
    key: "productCreate.attribute.type.dropdown.value",
    columnType: "string",
  },
  {
    label: "Product Attribute Region",
    key: "productCreate.attribute.region.dropdown.value",
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
      attribute: z.object({
        vintage: z
          .object({
            id: z.string().nullish(),
            plainText: z.string().nullish(),
          })
          .nullish(),
        brand: z
          .object({
            id: z.string().nullish(),
            plainText: z.string().nullish(),
          })
          .nullish(),
        size: z
          .object({
            id: z.string().nullish(),
            dropdown: z.object({
              value: z.string().nullish(),
            }),
          })
          .nullish(),
        country: z
          .object({
            id: z.string().nullish(),
            dropdown: z.object({
              value: z.string().nullish(),
            }),
          })
          .nullish(),
        type: z
          .object({
            id: z.string().nullish(),
            dropdown: z.object({
              value: z.string().nullish(),
            }),
          })
          .nullish(),
        region: z
          .object({
            id: z.string().nullish(),
            dropdown: z.object({
              value: z.string().nullish(),
            }),
          })
          .nullish(),
      }),
    }),
    productVariantCreate: z.object({
      stockLevel: z.string().nullish(),
    }),
  });

export type ProductColumnSchema = z.infer<ReturnType<typeof getResultModelSchema>>;
