import { Metadata } from 'next';

// This is a server component that generates metadata
async function getCompanyData(companySlug: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const response = await fetch(`${baseUrl}/api/v1/public/companies/${companySlug}`, {
      next: { revalidate: 3600 }, // Revalidate every hour
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error('Error fetching company data for metadata:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: { companySlug: string } }): Promise<Metadata> {
  const company = await getCompanyData(params.companySlug);

  if (!company) {
    return {
      title: 'Company Not Found',
      description: 'The company you are looking for does not exist.',
    };
  }

  const companyName = company.name || 'Restaurant';
  const description = company.description || `Welcome to ${companyName}. Discover our locations and place your order online.`;
  const imageUrl = company.logo || '/default-company-image.jpg';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const pageUrl = `${siteUrl}/${params.companySlug}`;

  return {
    title: `${companyName} - Order Online`,
    description: description.substring(0, 160),
    keywords: [
      companyName,
      'restaurant',
      'order online',
      'food delivery',
      'takeout',
      company.address?.city || '',
      company.address?.country || '',
    ].filter(Boolean).join(', '),
    authors: [{ name: companyName }],
    creator: companyName,
    publisher: companyName,
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: pageUrl,
      siteName: companyName,
      title: `${companyName} - Order Online`,
      description: description.substring(0, 160),
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${companyName} Logo`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${companyName} - Order Online`,
      description: description.substring(0, 160),
      images: [imageUrl],
    },
    alternates: {
      canonical: pageUrl,
    },
    other: {
      'og:type': 'website',
      'og:url': pageUrl,
      'og:site_name': companyName,
    },
  };
}

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

