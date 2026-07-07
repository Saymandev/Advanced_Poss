const fs = require('fs');
const file = 'frontend/src/app/dashboard/incomes/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Imports
content = content.replace(
  "import { Select } from '@/components/ui/Select';",
  "import { Select } from '@/components/ui/Select';\nimport { Combobox } from '@/components/ui/Combobox';"
);
content = content.replace(
  "import { useGetPaymentMethodsByCompanyQuery } from '@/lib/api/endpoints/paymentMethodsApi';",
  "import { useGetPaymentMethodsByCompanyQuery } from '@/lib/api/endpoints/paymentMethodsApi';\nimport { useGetCategoriesQuery, useCreateCategoryMutation } from '@/lib/api/endpoints/categoriesApi';"
);

// 2. Remove INCOME_CATEGORIES
content = content.replace(/const INCOME_CATEGORIES = \[\s*\{ value: 'catering', label: 'Catering Services' \},[\s\S]*?\{ value: 'other', label: 'Other Income' \},\s*\];/, "");

// 3. Add Hooks
const hooksAdd = `
  const { data: categoriesData } = useGetCategoriesQuery({
    companyId: companyId || undefined,
    branchId: branchId || undefined,
    type: 'income'
  }, { skip: !companyId });

  const [createCategory] = useCreateCategoryMutation();

  const dynamicCategories = useMemo(() => {
    if (!categoriesData) return [];
    return categoriesData
      .filter((cat: any) => cat.type === 'income' && cat.isActive !== false)
      .map((cat: any) => ({
        value: cat.name,
        label: cat.name
      }));
  }, [categoriesData]);
`;
content = content.replace(
  "const [createIncome] = useCreateIncomeMutation();",
  hooksAdd + "\n  const [createIncome] = useCreateIncomeMutation();"
);

// 4. Update handleCreate and handleEdit
const createCategoryLogic = `
      const isNewCategory = !dynamicCategories.some(c => c.value === formData.category);
      if (isNewCategory && formData.category && formData.category !== 'all') {
        try {
          await createCategory({
            name: formData.category,
            type: 'income',
            companyId: user.companyId,
            branchId: user.branchId,
            isActive: true,
            sortOrder: 0
          }).unwrap();
        } catch (e) {
          console.error('Failed to auto-create category', e);
        }
      }
`;
content = content.replace(
  "await createIncome(payload).unwrap();",
  createCategoryLogic + "\n      await createIncome(payload).unwrap();"
);
content = content.replace(
  "await updateIncome({",
  createCategoryLogic + "\n      await updateIncome({"
);

// 5. Update getCategoryLabel
content = content.replace(
  "const cat = INCOME_CATEGORIES.find((c) => c.value === category);",
  "const cat = dynamicCategories.find((c) => c.value === category);"
);

// 6. Update Filter options
content = content.replace(
  "...INCOME_CATEGORIES,",
  "...dynamicCategories,"
);

// 7. Replace Select with Combobox for Create Modal
content = content.replace(
  /<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category\*/g,
  ''
);

content = content.replace(
  /<Select[\s\S]*?options=\{INCOME_CATEGORIES\}[\s\S]*?value=\{formData\.category\}[\s\S]*?onChange=\{\(val\) => setFormData\(\{ \.\.\.formData, category: val as any \}\)\}[\s\S]*?className="mt-1"[\s\S]*?\/>/g,
  `<Combobox
                label="Category *"
                options={dynamicCategories}
                value={formData.category}
                onChange={(value) => {
                  setFormData({ ...formData, category: value as any });
                  if (formErrors.category) {
                    setFormErrors({ ...formErrors, category: undefined });
                  }
                }}
                allowCustom={true}
                placeholder="Select or type income category"
                className="mt-1"
              />`
);


fs.writeFileSync(file, content);
console.log('Patched incomes page successfully.');
