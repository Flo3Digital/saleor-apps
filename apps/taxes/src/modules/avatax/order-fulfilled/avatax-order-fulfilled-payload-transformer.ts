import { DocumentType } from "avatax/lib/enums/DocumentType";
import { OrderFulfilledSubscriptionFragment } from "../../../../generated/graphql";
import { AvataxConfig } from "../avatax-connection-schema";
import {
  AvataxOrderFulfilledPayload,
  AvataxOrderFulfilledTarget,
} from "./avatax-order-fulfilled-adapter";

// * This is the key that we use to store the provider order id in the Saleor order metadata.

export const PROVIDER_ORDER_ID_KEY = "externalId";

export function getTransactionCodeFromMetadata(
  metadata: OrderFulfilledSubscriptionFragment["privateMetadata"]
) {
  const transactionCode = metadata.find((item) => item.key === PROVIDER_ORDER_ID_KEY);

  if (!transactionCode) {
    throw new Error("Transaction code not found");
  }

  return transactionCode.value;
}

export class AvataxOrderFulfilledPayloadTransformer {
  constructor(private readonly config: AvataxConfig) {}
  private matchDocumentType(config: AvataxConfig): DocumentType {
    if (!config.isDocumentRecordingEnabled) {
      return DocumentType.SalesOrder;
    }

    return DocumentType.SalesInvoice;
  }
  transform({ order }: AvataxOrderFulfilledPayload): AvataxOrderFulfilledTarget {
    const transactionCode = getTransactionCodeFromMetadata(order.privateMetadata);

    return {
      transactionCode,
      companyCode: this.config.companyCode ?? "",
      documentType: this.matchDocumentType(this.config),
      model: {
        commit: true,
      },
    };
  }
}
