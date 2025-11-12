import { HelmetProvider, Helmet } from "react-helmet-async";

interface PageMetaProps {
  title: string;
  description?: string;
}

const PageMeta = ({ title, description }: PageMetaProps) => (
  <Helmet>
    <title>{title}</title>
    {description ? <meta name="description" content={description} /> : null}
  </Helmet>
);

export const AppWrapper = ({ children }: { children: React.ReactNode }) => (
  <HelmetProvider>{children}</HelmetProvider>
);

export default PageMeta;
