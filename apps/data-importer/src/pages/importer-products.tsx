import { NextPage } from "next";
import React, { ComponentProps } from "react";
import { Container, Divider } from "@material-ui/core";
import { Button, makeStyles, PageTab, PageTabs, SaleorTheme } from "@saleor/macaw-ui";
import { ProductsImporterView } from "../modules/products/products-importer-nuvo/products-importer-view";
import { GraphQLProvider } from "../providers/GraphQLProvider";
import { actions, useAppBridge } from "@saleor/app-sdk/app-bridge";

type Tab = "products";

const useStyles = makeStyles((theme: SaleorTheme) => ({
  wrapper: {
    minHeight: `100%`,
  },
}));

const ImporterPage: NextPage = () => {
  const [activeTab, setActiveTab] = React.useState<Tab>("products");
  const styles = useStyles();

  const { appBridge } = useAppBridge();

  const openInNewTab = (url: string) => {
    appBridge?.dispatch(
      actions.Redirect({
        to: url,
        newContext: true,
      })
    );
  };

  return (
    <div className={styles.wrapper}>
      <Container style={{ maxWidth: "unset" }}>
        <PageTabs
          style={{ marginBottom: 20, marginTop: 20 }}
          value={activeTab}
          onChange={(e) => setActiveTab(e as Tab)}
        >
          <PageTab value="customers" label="Customers" />
          <PageTab disabled value="orders" label="Orders (coming soon)" />
          <PageTab value="products" label="Products" />
        </PageTabs>
        <Divider />
        {activeTab === "products" && <ProductsImporterView />}
      </Container>
    </div>
  );
};

const WrappedPage = (props: ComponentProps<NextPage>) => (
  <GraphQLProvider>
    <ImporterPage {...props} />
  </GraphQLProvider>
);

export default WrappedPage;
