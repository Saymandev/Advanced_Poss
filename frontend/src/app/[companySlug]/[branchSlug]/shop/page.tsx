'use client';

import { useGetCompanyBySlugQuery } from '@/lib/api/endpoints/publicApi';
import { useParams } from 'next/navigation';
import DefaultShopTemplate from '@/components/public/templates/default/shop/DefaultShopTemplate';
import EcommerceShopTemplate from '@/components/public/templates/ecommerce/shop/EcommerceShopTemplate';

export default function ShopRouterPage() {
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

  return templateType === 'default' ? <DefaultShopTemplate /> : <EcommerceShopTemplate />;
}
