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
            id: z.string("QXR0cmlidXRlOjU="),
            plainText: z.string().nullish(),
          })
          .nullish(),

        brand: z
          .object({
            id: z.string("QXR0cmlidXRlOjY="),
            plainText: z.string().nullish(),
          })
          .nullish(),

        size: z
          .object({
            id: z.string("QXR0cmlidXRlOjQ="),
            dropdown: z.object({
              value: z.string().nullish().optional(),
            }),
          })
          .nullish()
          .optional(),

        country: z
          .object({
            id: z.string("QXR0cmlidXRlOjI="),
            dropdown: z.object({
              value: z.string().nullish().optional(),
            }),
          })
          .nullish()
          .optional(),

        type: z
          .object({
            id: z.string("QXR0cmlidXRlOjE="),
            dropdown: z.object({
              value: z.string().nullish(),
            }),
          })
          .nullish(),

        region: z
          .object({
            id: z.string("QXR0cmlidXRlOjg="),
            dropdown: z.object({
              value: z.string().nullish(),
            }),
          })
          .nullish(),
      }),
    }),
  });

export type ProductColumnSchema = z.infer<ReturnType<typeof getResultModelSchema>>;
