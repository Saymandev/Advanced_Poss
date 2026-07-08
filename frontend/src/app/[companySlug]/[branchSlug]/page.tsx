'use client';

import { useGetCompanyBySlugQuery } from '@/lib/api/endpoints/publicApi';
import { useParams } from 'next/navigation';
import DefaultBranchLandingTemplate from '@/components/public/templates/default/landing/DefaultBranchLandingTemplate';
import EcommerceLandingTemplate from '@/components/public/templates/ecommerce/landing/EcommerceLandingTemplate';

export default function BranchLandingRouterPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;

  const { 
    data: company, 
    isLoading: companyLoading
  } = useGetCompanyBySlugQuery(companySlug, {
    skip: !companySlug,
  });

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Determine which template to render based on company settings
  const templateType = company?.settings?.template || 'ecommerce';

  // For now, Ecommerce doesn't have a separate branch landing page, so we use EcommerceLandingTemplate
  return templateType === 'default' ? <DefaultBranchLandingTemplate /> : <EcommerceLandingTemplate />;
}
