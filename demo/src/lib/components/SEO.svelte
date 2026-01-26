<script lang="ts">
  import { dev } from "$app/environment";

  const baseUrl = dev ? "http://localhost:5173" : "https://gateproof.dev";
  const defaultOgImage = `${baseUrl}/meta.jpg`;

  // PNG converter URL - Configure this to point to your deployed SVG-to-PNG Cloudflare worker
  // See svg-to-png/+server.ts or og-image-hybrid/+server.ts for worker implementations
  // Leave empty to use the defaultOgImage instead of dynamic OG images
  const pngConverterUrl = "https://example-svg-to-png.workers.dev";

  function generateOGImageUrl(title: string, description: string): string {
    if (!pngConverterUrl || pngConverterUrl.includes("example")) {
      // Return default OG image if converter URL is not configured
      return defaultOgImage;
    }
    const svgUrl = `${baseUrl}/api/og-image?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`;
    return `${pngConverterUrl}/?url=${encodeURIComponent(svgUrl)}`;
  }

  interface Breadcrumb {
    name: string;
    item: string;
  }

  interface ArticleSchema {
    "@context": "https://schema.org";
    "@type": "Article";
    headline: string;
    description: string;
    image: string;
    wordCount: number;
    author: {
      "@type": "Organization";
      name: string;
    };
    publisher: {
      "@type": "Organization";
      name: string;
      logo: {
        "@type": "ImageObject";
        url: string;
      };
    };
    datePublished: string;
    dateModified: string;
    mainEntityOfPage: {
      "@type": "WebPage";
      "@id": string;
    };
  }

  interface BreadcrumbSchema {
    "@context": "https://schema.org";
    "@type": "BreadcrumbList";
    itemListElement: Array<{
      "@type": "ListItem";
      position: number;
      name: string;
      item: string;
    }>;
  }

  interface OrganizationSchema {
    "@context": "https://schema.org";
    "@type": "Organization";
    name: string;
    url: string;
    logo: {
      "@type": "ImageObject";
      url: string;
    };
    sameAs?: string[];
    address?: {
      "@type": "PostalAddress";
      streetAddress?: string;
      addressLocality?: string;
      addressRegion?: string;
      postalCode?: string;
      addressCountry?: string;
    };
    contactPoint?: {
      "@type": "ContactPoint";
      telephone?: string;
      contactType?: string;
      areaServed?: string;
      availableLanguage?: string;
    };
  }

  interface LocalBusinessSchema {
    "@context": "https://schema.org";
    "@type": "LocalBusiness";
    name: string;
    url: string;
    address?: {
      "@type": "PostalAddress";
      streetAddress?: string;
      addressLocality?: string;
      addressRegion?: string;
      postalCode?: string;
      addressCountry?: string;
    };
    telephone?: string;
    geo?: {
      "@type": "GeoCoordinates";
      latitude?: number;
      longitude?: number;
    };
    openingHours?: string[];
  }

  interface Props {
    title: string;
    description: string;
    keywords: string;
    path: string;
    type?: "article" | "website";
    section: string;
    tags: string;
    publishedTime?: string;
    modifiedTime?: string;
    ogImage?: any;
    readingTime?: string;
    wordCount?: number;
    author?: string;
    breadcrumbs?: Breadcrumb[];
    // LocalBusiness schema props (optional)
    localBusiness?: boolean;
    address?: {
      streetAddress?: string;
      addressLocality?: string;
      addressRegion?: string;
      postalCode?: string;
      addressCountry?: string;
    };
    phone?: string;
    geo?: {
      latitude?: number;
      longitude?: number;
    };
    openingHours?: string[];
    // Social media links for Organization schema
    sameAs?: string[];
  }

  let {
    title,
    description,
    keywords,
    path,
    type = "article",
    section,
    tags,
    publishedTime = "2024-03-21",
    modifiedTime = "2024-03-21",
    ogImage,
    readingTime = "",
    wordCount = 0,
    author = "Closer Capital",
    breadcrumbs = [],
    localBusiness = false,
    address,
    phone,
    geo,
    openingHours,
    sameAs = [
      "https://www.facebook.com/people/Closer-Capital/61553018443721/",
      "https://www.instagram.com/closer_capital",
      "https://www.youtube.com/channel/UCPvZ_psXCLKu3j13Ph_GSAQ",
      "https://x.com/acoyfellow",
      "https://www.linkedin.com/company/closer-capital",
    ],
  }: Props = $props();

  function generateBreadcrumbsSchema(): BreadcrumbSchema | null {
    if (!breadcrumbs.length) return null;

    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem" as const,
          position: 1,
          name: "Home",
          item: baseUrl,
        },
        ...breadcrumbs.map((crumb, index) => ({
          "@type": "ListItem" as const,
          position: index + 2,
          name: crumb.name,
          item: `${baseUrl}${crumb.item}`,
        })),
      ],
    };
  }

  function generateOrganizationSchema(): OrganizationSchema {
    const org: OrganizationSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Closer Capital",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon.svg`,
      },
    };

    if (sameAs && sameAs.length > 0) {
      org.sameAs = sameAs;
    }

    if (phone) {
      org.contactPoint = {
        "@type": "ContactPoint",
        telephone: phone,
        contactType: "Customer Service",
        areaServed: "US",
        availableLanguage: "English",
      };
    }

    // Add address to Organization schema if provided
    if (address) {
      org.address = {
        "@type": "PostalAddress",
        ...(address.streetAddress && { streetAddress: address.streetAddress }),
        ...(address.addressLocality && {
          addressLocality: address.addressLocality,
        }),
        ...(address.addressRegion && { addressRegion: address.addressRegion }),
        ...(address.postalCode && { postalCode: address.postalCode }),
        ...(address.addressCountry && {
          addressCountry: address.addressCountry,
        }),
      };
    }

    return org;
  }

  function generateLocalBusinessSchema(): LocalBusinessSchema | null {
    if (!localBusiness) return null;

    const local: LocalBusinessSchema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "Closer Capital",
      url: baseUrl,
    };

    if (address) {
      local.address = {
        "@type": "PostalAddress",
        ...(address.streetAddress && { streetAddress: address.streetAddress }),
        ...(address.addressLocality && {
          addressLocality: address.addressLocality,
        }),
        ...(address.addressRegion && { addressRegion: address.addressRegion }),
        ...(address.postalCode && { postalCode: address.postalCode }),
        ...(address.addressCountry && {
          addressCountry: address.addressCountry,
        }),
      };
    }

    if (phone) {
      local.telephone = phone;
    }

    if (geo) {
      local.geo = {
        "@type": "GeoCoordinates",
        ...(geo.latitude !== undefined && { latitude: geo.latitude }),
        ...(geo.longitude !== undefined && { longitude: geo.longitude }),
      };
    }

    if (openingHours && openingHours.length > 0) {
      local.openingHours = openingHours;
    }

    return local;
  }

  function generateArticleSchema(): ArticleSchema | null {
    if (type !== "article") return null;

    return {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description: description,
      image: ogImageUrl,
      wordCount: wordCount,
      author: {
        "@type": "Organization",
        name: author,
      },
      publisher: {
        "@type": "Organization",
        name: "Closer Capital",
        logo: {
          "@type": "ImageObject",
          url: `${baseUrl}/icon.svg`,
        },
      },
      datePublished: publishedTime,
      dateModified: modifiedTime,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${baseUrl}${path}`,
      },
    };
  }

  function safeStringify(obj: any): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      console.error("Failed to stringify schema:", e);
      return "{}";
    }
  }

  let breadcrumbsSchema = $derived(generateBreadcrumbsSchema());
  let articleSchema = $derived(generateArticleSchema());
  let organizationSchema = $derived(generateOrganizationSchema());
  let localBusinessSchema = $derived(generateLocalBusinessSchema());

  let breadcrumbsJson = $derived(
    breadcrumbsSchema ? safeStringify(breadcrumbsSchema) : ""
  );
  let articleJson = $derived(articleSchema ? safeStringify(articleSchema) : "");
  let organizationJson = $derived(safeStringify(organizationSchema));
  let localBusinessJson = $derived(
    localBusinessSchema ? safeStringify(localBusinessSchema) : ""
  );

  // Generate OG image URL if not explicitly provided
  let ogImageUrl = $derived(
    ogImage ? ogImage : generateOGImageUrl(title, description)
  );
</script>

<svelte:head>
  <!-- Essential Meta Tags -->
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta name="keywords" content={keywords} />
  <link rel="canonical" href={`${baseUrl}${path}`} />
  <meta name="author" content={author} />

  <!-- Enhanced Meta Tags -->
  {#if readingTime}
    <meta name="twitter:label1" content="Reading time" />
    <meta name="twitter:data1" content={readingTime} />
  {/if}

  <!-- Open Graph -->
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content={type} />
  <meta property="og:url" content={`${baseUrl}${path}`} />
  <meta property="og:image" content={ogImageUrl} />
  <meta property="og:site_name" content="Closer Capital" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={ogImageUrl} />
  <meta name="twitter:site" content="@acoyfellow" />

  {#if type === "article"}
    <!-- Article Specific -->
    <meta property="article:published_time" content={publishedTime} />
    <meta property="article:modified_time" content={modifiedTime} />
    {#if section}
      <meta property="article:section" content={section} />
    {/if}
    {#if tags}
      <meta property="article:tag" content={tags} />
    {/if}
  {/if}

  <!-- Schema.org Markup with safe stringification -->
  <!-- Organization schema - always present -->
  {@html `<script type="application/ld+json" nonce="%sveltekit.nonce%">${organizationJson}</script>`}

  <!-- LocalBusiness schema - optional -->
  {#if localBusinessJson}
    {@html `<script type="application/ld+json" nonce="%sveltekit.nonce%">${localBusinessJson}</script>`}
  {/if}

  <!-- Article schema - for article pages -->
  {#if articleJson}
    {@html `<script type="application/ld+json" nonce="%sveltekit.nonce%">${articleJson}</script>`}
  {/if}

  <!-- Breadcrumb schema - when breadcrumbs provided -->
  {#if breadcrumbsJson}
    {@html `<script type="application/ld+json" nonce="%sveltekit.nonce%">${breadcrumbsJson}</script>`}
  {/if}
</svelte:head>