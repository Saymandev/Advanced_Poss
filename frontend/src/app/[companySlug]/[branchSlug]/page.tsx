'use client';

import { useGetBranchBySlugQuery, useGetCompanyBranchesQuery, useGetCompanyBySlugQuery } from '@/lib/api/endpoints/publicApi';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export default function BranchLandingPage() {
  const params = useParams();
  const router = useRouter();
  const companySlug = params.companySlug as string;
  const branchSlug = params.branchSlug as string;

  const { 
    data: company, 
    isLoading: companyLoading, 
    isError: companyError 
  } = useGetCompanyBySlugQuery(companySlug, {
    skip: !companySlug,
  });
  
  const { 
    data: branch, 
    isLoading: branchLoading,
    isError: branchError 
  } = useGetBranchBySlugQuery(
    { companySlug, branchSlug },
    { skip: !companySlug || !branchSlug }
  );

  // Get branches list for error display (only if company exists but branch doesn't)
  const { data: branchesData } = useGetCompanyBranchesQuery(companySlug, {
    skip: !companySlug || companyError || !company,
  });

  // Redirect to shop page (main branch page)
  useEffect(() => {
    if (company && branch && !companyLoading && !branchLoading) {
      router.replace(`/${companySlug}/${branchSlug}/shop`);
    }
  }, [company, branch, companyLoading, branchLoading, companySlug, branchSlug, router]);

  // Show error toast if API errors occur
  useEffect(() => {
    if (companyError) {
      const errorMessage = (companyError as any)?.data?.message || 'Failed to load company information';
      toast.error(`Company Error: ${errorMessage}`);
      console.error('Company error:', companyError);
      console.error('Attempted company slug:', companySlug);
    }
    if (branchError) {
      const errorMessage = (branchError as any)?.data?.message || 'Failed to load branch information';
      toast.error(`Branch Error: ${errorMessage}`);
      console.error('Branch error:', branchError);
      console.error('Attempted to load:', { companySlug, branchSlug });
      
      // If company exists but branch doesn't, try to get list of branches
      if (company && !companyError) {
        console.log('Company found, but branch not found. Available branches:', company);
      }
    }
  }, [companyError, branchError, companySlug, branchSlug, company]);

  // Loading state
  if (companyLoading || branchLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading branch information...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (companyError || branchError || !company || !branch) {
    const errorMessage = companyError 
      ? (companyError as any)?.data?.message || 'Company not found'
      : branchError
      ? (branchError as any)?.data?.message || 'Branch not found'
      : !company
      ? `Company "${companySlug}" not found`
      : `Branch "${branchSlug}" not found for company "${companySlug}"`;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Branch Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {errorMessage}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            URL: /{companySlug}/{branchSlug}
          </p>
          {branchesData && branchesData.length > 0 && (
            <div className="mb-4 text-left bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-300 mb-2">Available branches:</p>
              <ul className="text-sm text-gray-400 space-y-1">
                {branchesData.map((b: any) => (
                  <li key={b.id}>
                    <button
                      onClick={() => router.push(`/${companySlug}/${b.slug || b.id}/shop`)}
                      className="text-primary-400 hover:text-primary-300 underline"
                    >
                      {b.name} ({b.slug || 'no-slug'})
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push(`/${companySlug}`)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              View All Branches
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // This should not render as we redirect, but just in case
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}

