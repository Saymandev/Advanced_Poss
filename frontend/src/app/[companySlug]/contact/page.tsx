'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useGetCompanyBySlugQuery } from '@/lib/api/endpoints/publicApi';
import { EnvelopeIcon, MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;
  const { data: company, isLoading } = useGetCompanyBySlugQuery(companySlug);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement contact form submission
    toast.success('Thank you for your message! We\'ll get back to you soon.');
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Contact Us</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={5}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">Send Message</Button>
              </form>
            </div>
          </Card>

          {/* Contact Info */}
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in touch</h2>
                <div className="space-y-6">
                  {company?.address && (
                    <div className="flex items-start gap-4">
                      <MapPinIcon className="w-6 h-6 text-gray-400 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Address</h3>
                        <p className="text-gray-600">
                          {company.address.street}<br />
                          {company.address.city}, {company.address.state} {company.address.zipCode}
                        </p>
                      </div>
                    </div>
                  )}
                  {company?.phone && (
                    <div className="flex items-start gap-4">
                      <PhoneIcon className="w-6 h-6 text-gray-400 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                        <a href={`tel:${company.phone}`} className="text-gray-600 hover:text-blue-600">
                          {company.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {company?.email && (
                    <div className="flex items-start gap-4">
                      <EnvelopeIcon className="w-6 h-6 text-gray-400 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                        <a href={`mailto:${company.email}`} className="text-gray-600 hover:text-blue-600">
                          {company.email}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href={`/${companySlug}`}>
            <button className="text-blue-600 hover:underline">← Back to Home</button>
          </Link>
        </div>
      </main>
    </div>
  );
}

