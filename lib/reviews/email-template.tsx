import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';
import { render } from '@react-email/render';
import { applyTemplate, type ReviewEmailSettings } from './email-settings';
import { type ReviewEmailBlock } from './email-types';

export type ReviewEmailProduct = {
  title: string;
  imageUrl: string | null;
  url: string | null;
  handle?: string;
};

export type ReviewEmailRenderData = {
  customerName: string;
  orderNumber: string;
  siteUrl: string;
  productTitle: string;
  productUrl: string;
  productImageUrl: string;
  products: ReviewEmailProduct[];
};

export type ReviewEmailRenderMode = 'preview' | 'send';

const baseStyles = {
  body: {
    backgroundColor: '#f5f5f5',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    margin: 0,
    padding: '24px 0',
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #e5e5e5',
  },
  content: {
    padding: '32px 28px',
  },
};

function cleanImageUrl(url: string | null) {
  if (!url) return '';
  return url.split('?')[0].replace(/^\/\//, 'https://');
}

function buildVariables(settings: ReviewEmailSettings, data: ReviewEmailRenderData) {
  return {
    customerName: data.customerName,
    productTitle: data.productTitle,
    productImageUrl: data.productImageUrl,
    productUrl: data.productUrl,
    orderNumber: data.orderNumber,
    siteUrl: data.siteUrl,
    brandPrimary: settings.brandPrimary,
    brandDark: settings.brandDark,
  };
}

function resolveText(
  template: string,
  settings: ReviewEmailSettings,
  data: ReviewEmailRenderData
) {
  return applyTemplate(template, buildVariables(settings, data));
}

function ProductCard({
  product,
  brandPrimary,
  fallbackUrl,
}: {
  product: ReviewEmailProduct;
  brandPrimary: string;
  fallbackUrl: string;
}) {
  const imageUrl = cleanImageUrl(product.imageUrl);
  const productUrl = product.url || fallbackUrl;
  return (
    <Section style={{ margin: '24px 0' }}>
      <Container
        style={{
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          maxWidth: '380px',
        }}
      >
        {imageUrl ? (
          <Img
            src={imageUrl}
            alt={product.title}
            width="200"
            height="200"
            style={{
              width: '200px',
              height: '200px',
              objectFit: 'cover',
              borderRadius: '10px',
              display: 'block',
              margin: '0 auto 16px',
              border: 0,
            }}
          />
        ) : null}
        <Text
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#111827',
            lineHeight: '1.4',
            margin: '0 0 16px',
          }}
        >
          {product.title}
        </Text>
        <Button
          href={productUrl}
          style={{
            backgroundColor: brandPrimary,
            color: '#ffffff',
            padding: '14px 32px',
            borderRadius: '999px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '15px',
          }}
        >
          Leave a review
        </Button>
      </Container>
    </Section>
  );
}

function renderBlock(
  block: ReviewEmailBlock,
  settings: ReviewEmailSettings,
  data: ReviewEmailRenderData
) {
  switch (block.type) {
    case 'heading': {
      const size = block.level === 1 ? 26 : block.level === 3 ? 18 : 22;
      return (
        <Heading
          key={block.id}
          as={block.level === 1 ? 'h1' : block.level === 3 ? 'h3' : 'h2'}
          style={{
            color: '#1a1a1a',
            fontSize: `${size}px`,
            margin: '0 0 16px',
            fontWeight: 600,
            textAlign: block.align || 'left',
          }}
        >
          {resolveText(block.text, settings, data)}
        </Heading>
      );
    }
    case 'text':
      return (
        <Text
          key={block.id}
          style={{
            fontSize: '15px',
            color: '#555555',
            lineHeight: '1.6',
            whiteSpace: 'pre-line',
            margin: '0 0 16px',
            textAlign: block.align || 'left',
          }}
        >
          {resolveText(block.text, settings, data)}
        </Text>
      );
    case 'cta': {
      const label = resolveText(block.label, settings, data);
      const url =
        resolveText(block.url, settings, data) || data.productUrl || data.siteUrl;
      return (
        <Section key={block.id} style={{ textAlign: 'center', margin: '20px 0' }}>
          <Button
            href={url}
            style={{
              backgroundColor: settings.brandPrimary,
              color: '#ffffff',
              padding: '14px 32px',
              borderRadius: '999px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '15px',
            }}
          >
            {label}
          </Button>
        </Section>
      );
    }
    case 'productCards': {
      const products =
        block.mode === 'all' ? data.products : data.products.slice(0, 1);
      return (
        <Section key={block.id}>
          {products.map((product, index) => (
            <ProductCard
              key={`${block.id}-${index}`}
              product={product}
              brandPrimary={settings.brandPrimary}
              fallbackUrl={data.productUrl}
            />
          ))}
        </Section>
      );
    }
    case 'divider':
      return (
        <Hr
          key={block.id}
          style={{
            borderTop: '1px solid #e5e5e5',
            margin: '24px 0',
          }}
        />
      );
    case 'footer': {
      const footerText = resolveText(block.text, settings, data);
      const parts = footerText.split(/(https?:\/\/[^\s]+)/g);
      return (
        <Text
          key={block.id}
          style={{
            fontSize: '12px',
            color: '#999999',
            textAlign: 'center',
            margin: '0',
            whiteSpace: 'pre-line',
          }}
        >
          {parts.map((part, i) =>
            part.match(/^https?:\/\//) ? (
              <a
                key={i}
                href={part}
                style={{
                  color: settings.linkColor,
                  textDecoration: 'none',
                }}
              >
                {part}
              </a>
            ) : (
              part
            )
          )}
        </Text>
      );
    }
    default:
      return null;
  }
}

export function ReviewEmailTemplate({
  settings,
  data,
  mode,
}: {
  settings: ReviewEmailSettings;
  data: ReviewEmailRenderData;
  mode: ReviewEmailRenderMode;
}) {
  const logoUrl = settings.logoUrl && !settings.logoUrl.startsWith('data:')
    ? settings.logoUrl
    : null;
  return (
    <Html>
      <Head />
      <Preview>{`Review request for ${data.productTitle}`}</Preview>
      <Body style={baseStyles.body}>
        <Container style={baseStyles.container}>
          <Section
            style={{
              backgroundColor: settings.headerBackground,
              padding: '32px 20px',
              textAlign: 'center',
            }}
          >
            {logoUrl ? (
              <Img
                src={logoUrl}
                alt={settings.fromName}
                style={{ maxWidth: '180px', height: 'auto', margin: '0 auto' }}
              />
            ) : (
              <Heading
                as="h1"
                style={{
                  color: '#ffffff',
                  margin: 0,
                  fontSize: '26px',
                  fontWeight: 600,
                }}
              >
                {settings.fromName}
              </Heading>
            )}
          </Section>
          <Section style={baseStyles.content}>
            {settings.blocks.map((block) => renderBlock(block, settings, data))}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function renderReviewEmailHtml({
  settings,
  data,
  mode,
}: {
  settings: ReviewEmailSettings;
  data: ReviewEmailRenderData;
  mode: ReviewEmailRenderMode;
}) {
  return render(<ReviewEmailTemplate settings={settings} data={data} mode={mode} />, {
    pretty: false,
  });
}
