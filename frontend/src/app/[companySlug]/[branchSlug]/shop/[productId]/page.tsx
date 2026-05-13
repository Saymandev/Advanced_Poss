'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useGetProductQuery } from '@/lib/api/endpoints/publicApi';
import { formatCurrency } from '@/lib/utils';
import { Label } from '@/components/ui/Label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Checkbox } from '@/components/ui/Checkbox';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeftIcon, ClockIcon, ExclamationTriangleIcon, MinusIcon, PlusIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companySlug = params.companySlug as string;
  const branchSlug = params.branchSlug as string;
  const productId = params.productId as string;

  const { 
    data: product, 
    isLoading,
    isError,
    error 
  } = useGetProductQuery(
    { companySlug, branchSlug, productId },
    { skip: !companySlug || !branchSlug || !productId }
  );
  
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [selectedSelections, setSelectedSelections] = useState<Record<string, string | string[]>>({});
  const [totalPrice, setTotalPrice] = useState(0);

  // Initialize selected options when product loads
  useEffect(() => {
    if (product) {
      // Default variants
      const initialVariants: Record<string, string> = {};
      product.variants?.forEach(v => {
        if (v.options.length > 0) {
          initialVariants[v.name] = v.options[0].name;
        }
      });
      setSelectedVariants(initialVariants);

      // Default selections (only for 'single' type)
      const initialSelections: Record<string, string | string[]> = {};
      product.selections?.forEach(s => {
        if (s.type === 'single' && s.options.length > 0) {
          initialSelections[s.name] = s.options[0].name;
        } else if (s.type === 'multi') {
          initialSelections[s.name] = [];
        }
      });
      setSelectedSelections(initialSelections);
    }
  }, [product]);

  // Update total price when selections change
  useEffect(() => {
    if (!product) return;

    let basePrice = product.price;

    // Add variant modifiers
    Object.entries(selectedVariants).forEach(([variantName, optionName]) => {
      const variant = product.variants?.find(v => v.name === variantName);
      const option = variant?.options.find(o => o.name === optionName);
      if (option?.priceModifier) {
        basePrice += option.priceModifier;
      }
    });

    // Add selection prices
    Object.entries(selectedSelections).forEach(([selectionName, value]) => {
      const selection = product.selections?.find(s => s.name === selectionName);
      if (Array.isArray(value)) {
        value.forEach(optionName => {
          const option = selection?.options.find(o => o.name === optionName);
          if (option?.price) basePrice += option.price;
        });
      } else {
        const option = selection?.options.find(o => o.name === value);
        if (option?.price) basePrice += option.price;
      }
    });

    setTotalPrice(basePrice * quantity);
  }, [product, selectedVariants, selectedSelections, quantity]);

  useEffect(() => {
    if (isError) {
      const errorMessage = (error as any)?.data?.message || 'Failed to load product';
      toast.error(errorMessage);
    }
  }, [isError, error]);

  const addToCart = () => {
    if (!product) {
      toast.error('Product not available');
      return;
    }

    if (!product.isAvailable) {
      toast.error('This product is currently unavailable');
      return;
    }

    try {
      const cartKey = `cart_${companySlug}_${branchSlug}`;
      const existingCart = localStorage.getItem(cartKey);
      const cart = existingCart ? JSON.parse(existingCart) : [];

      const uniqueId = `${product.id}-${JSON.stringify(selectedVariants)}-${JSON.stringify(selectedSelections)}`;

      const existingItem = cart.find((item: any) => 
        item.id === product.id && 
        JSON.stringify(item.selectedVariants) === JSON.stringify(selectedVariants) &&
        JSON.stringify(item.selectedSelections) === JSON.stringify(selectedSelections)
      );
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.push({
          id: product.id,
          uniqueId, // Important for differentiating same item with different options
          name: product.name,
          price: totalPrice / quantity, // Base price per item with modifiers
          quantity,
          image: product.images?.[0],
          selectedVariants,
          selectedSelections,
          variantDisplay: Object.entries(selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', '),
          selectionDisplay: Object.entries(selectedSelections)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(', '),
        });
      }

      localStorage.setItem(cartKey, JSON.stringify(cart));
      toast.success(`${quantity} ${product.name} added to cart!`);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add item to cart. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading product...</p>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Product Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This product doesn't exist or is no longer available.
            </p>
            <Link href={`/${companySlug}/${branchSlug}/shop`}>
              <Button>Back to Shop</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <Link href={`/${companySlug}/${branchSlug}/shop`}>
          <Button variant="ghost" className="mb-4 md:mb-6">
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back to Shop
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
          {/* Product Images */}
          <div>
            <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
              {images.length > 0 ? (
                <img
                  src={images[selectedImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="text-6xl text-gray-400 dark:text-gray-500">🍽️</div>';
                    }
                  }}
                />
              ) : (
                <div className="text-6xl text-gray-400 dark:text-gray-500">🍽️</div>
              )}
              {!product.isAvailable && (
                <div className="absolute inset-0 bg-black bg-opacity-60 dark:bg-opacity-70 flex items-center justify-center rounded-lg">
                  <span className="text-white font-semibold text-lg">Unavailable</span>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImageIndex === idx 
                        ? 'border-gray-900 dark:border-gray-300 ring-2 ring-primary-500' 
                        : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <img 
                      src={img} 
                      alt={`${product.name} ${idx + 1}`} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400 text-xl">📷</div>';
                        }
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div>
            <div className="mb-6">
              {product.category && (
                <span className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                  {product.category.name || product.category}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {product.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <span className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(product.price)}
                </span>
                {!product.isAvailable && (
                  <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-medium">
                    Unavailable
                  </span>
                )}
              </div>
              {product.description && (
                <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Prep Time and Allergens */}
              <div className="flex flex-wrap gap-3 mb-6">
                {product.preparationTime > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1.5 py-1.5 px-3">
                    <ClockIcon className="w-3.5 h-3.5" />
                    {product.preparationTime} mins
                  </Badge>
                )}
                {product.allergens?.map((allergen: string) => (
                  <Badge key={allergen} variant="danger" className="flex items-center gap-1.5 py-1.5 px-3 bg-red-50 text-red-700 border-red-100">
                    <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                    {allergen}
                  </Badge>
                )}
              </div>
            </div>

            {/* Nutritional Info */}
            {product.nutritionalInfo && (product.nutritionalInfo.calories > 0 || product.nutritionalInfo.protein > 0) && (
              <div className="mb-8 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Nutritional Info</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {product.nutritionalInfo.calories > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Calories</p>
                      <p className="font-bold text-gray-900 dark:text-white">{product.nutritionalInfo.calories} kcal</p>
                    </div>
                  )}
                  {product.nutritionalInfo.protein > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Protein</p>
                      <p className="font-bold text-gray-900 dark:text-white">{product.nutritionalInfo.protein}g</p>
                    </div>
                  )}
                  {product.nutritionalInfo.carbs > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Carbs</p>
                      <p className="font-bold text-gray-900 dark:text-white">{product.nutritionalInfo.carbs}g</p>
                    </div>
                  )}
                  {product.nutritionalInfo.fat > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Fat</p>
                      <p className="font-bold text-gray-900 dark:text-white">{product.nutritionalInfo.fat}g</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ingredients */}
            {product.ingredients && product.ingredients.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Main Ingredients</h3>
                <div className="flex flex-wrap gap-2">
                  {product.ingredients.map((ing: any, idx: number) => {
                    const name = typeof ing === 'string' ? ing : (ing.ingredientId?.name || ing.name);
                    if (!name) return null;
                    return (
                      <span key={idx} className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                        {name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-6 mb-8">
                {product.variants.map((variant) => (
                  <div key={variant.name}>
                    <Label className="text-base font-bold mb-3 block">{variant.name}</Label>
                    <RadioGroup
                      value={selectedVariants[variant.name]}
                      onValueChange={(val: string) => setSelectedVariants(prev => ({ ...prev, [variant.name]: val }))}
                      className="flex flex-wrap gap-3"
                    >
                      {variant.options.map((option) => (
                        <div key={option.name} className="flex items-center">
                          <RadioGroupItem
                            value={option.name}
                            id={`variant-${variant.name}-${option.name}`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`variant-${variant.name}-${option.name}`}
                            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 peer-data-[state=checked]:bg-primary-600 peer-data-[state=checked]:text-white peer-data-[state=checked]:border-primary-600 transition-all text-sm font-medium"
                          >
                            {option.name}
                            {option.priceModifier !== 0 && (
                              <span className="ml-1 text-xs opacity-80">
                                ({option.priceModifier > 0 ? '+' : ''}{formatCurrency(option.priceModifier)})
                              </span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
              </div>
            )}

            {/* Selections */}
            {product.selections && product.selections.length > 0 && (
              <div className="space-y-8 mb-8">
                {product.selections.map((selection) => (
                  <div key={selection.name}>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-bold">{selection.name}</Label>
                      {selection.type === 'multi' && (
                        <Badge variant="secondary" className="text-[10px] uppercase">Multi-select</Badge>
                      )}
                    </div>
                    
                    {selection.type === 'single' ? (
                      <RadioGroup
                        value={selectedSelections[selection.name] as string}
                        onValueChange={(val: string) => setSelectedSelections(prev => ({ ...prev, [selection.name]: val }))}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                      >
                        {selection.options.map((option) => (
                          <div key={option.name} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <div className="flex items-center gap-3">
                              <RadioGroupItem value={option.name} id={`selection-${selection.name}-${option.name}`} />
                              <Label htmlFor={`selection-${selection.name}-${option.name}`} className="cursor-pointer">{option.name}</Label>
                            </div>
                            {option.price > 0 && <span className="text-sm font-medium">+{formatCurrency(option.price)}</span>}
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selection.options.map((option) => (
                          <div key={option.name} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id={`selection-${selection.name}-${option.name}`}
                                checked={(selectedSelections[selection.name] as string[])?.includes(option.name)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setSelectedSelections(prev => {
                                    const current = (prev[selection.name] as string[]) || [];
                                    if (checked) {
                                      return { ...prev, [selection.name]: [...current, option.name] };
                                    } else {
                                      return { ...prev, [selection.name]: current.filter(o => o !== option.name) };
                                    }
                                  });
                                }}
                              />
                              <Label htmlFor={`selection-${selection.name}-${option.name}`} className="cursor-pointer">{option.name}</Label>
                            </div>
                            {option.price > 0 && <span className="text-sm font-medium">+{formatCurrency(option.price)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Quantity Selector */}
            <div className="mb-6 md:mb-8">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <MinusIcon className="w-5 h-5" />
                  </button>
                  <span className="px-4 py-2 font-semibold text-gray-900 dark:text-white min-w-[3rem] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Increase quantity"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </div>
                <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Total: <span className="font-bold text-gray-900 dark:text-white">
                    {formatCurrency(totalPrice)}
                  </span>
                </span>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button
              className="w-full mb-4"
              size="lg"
              onClick={addToCart}
              disabled={!product.isAvailable}
            >
              <ShoppingCartIcon className="w-5 h-5 mr-2" />
              {product.isAvailable ? 'Add to Cart' : 'Currently Unavailable'}
            </Button>

            {/* Additional Info */}
            <Card className="mt-6">
              <CardContent className="p-4 md:p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Product Information</h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`font-medium ${
                      product.isAvailable 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {product.isAvailable ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                  {product.category && (
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <span className="font-medium">
                        {product.category.name || product.category}
                      </span>
                    </div>
                  )}
                  {product.preparationTime && (
                    <div className="flex justify-between">
                      <span>Prep Time:</span>
                      <span className="font-medium">{product.preparationTime} minutes</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

