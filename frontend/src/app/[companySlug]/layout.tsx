import { Metadata } from 'next';

// This is a server component that generates metadata
async function getCompanyData(companySlug: string) {
  try {
    // NEXT_PUBLIC_API_URL might include /api/v1, so handle both cases
    let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    // Remove trailing /api/v1 if present, we'll add it back
    baseUrl = baseUrl.replace(/\/api\/v1$/, '');
    const url = `${baseUrl}/api/v1/public/companies/${companySlug}`;
    
    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Revalidate every hour
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`[Layout] Company fetch failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const result = await response.json();
    const company = result.data || result;
    
    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Layout] Company fetched:`, {
        slug: companySlug,
        hasCompany: !!company,
        companyName: company?.name,
        hasData: !!result.data,
        resultKeys: Object.keys(result || {}),
      });
    }
    
    // Normalize _id to id if needed
    if (company && company._id && !company.id) {
      company.id = company._id.toString();
    }
    
    return company;
  } catch (error) {
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[Layout] Error fetching company data:', error);
    }
    return null;
  }
}

export async function generateMetadata({ params }: { params: { companySlug: string } }): Promise<Metadata> {
  const company = await getCompanyData(params.companySlug);

  // Always provide a valid title - never use "Company Not Found"
  // If company is not found, use a generic but friendly title
  // Extract name from various possible locations in the response
  const companyName = company?.name || 
                     (company as any)?.data?.name || 
                     'Restaurant';
  
  // Debug in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Layout] generateMetadata:`, {
      companySlug: params.companySlug,
      hasCompany: !!company,
      companyName,
      companyKeys: company ? Object.keys(company) : [],
    });
  }
  const description = company?.description || `Welcome to ${companyName}. Discover our locations and place your order online.`;
  const imageUrl = company?.logo || '/default-company-image.jpg';
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
      company?.address?.city || '',
      company?.address?.country || '',
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

