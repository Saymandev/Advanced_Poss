const fs = require('fs');
const file = 'frontend/src/app/dashboard/expenses/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Imports
content = content.replace(
  "import { Select } from '@/components/ui/Select';",
  "import { Select } from '@/components/ui/Select';\nimport { Combobox } from '@/components/ui/Combobox';"
);
content = content.replace(
  "import { CreateExpenseRequest, Expense, useApproveExpenseMutation, useCreateExpenseMutation, useDeleteExpenseMutation, useGetExpensesQuery, useRejectExpenseMutation, useUpdateExpenseMutation } from '@/lib/api/endpoints/expensesApi';",
  "import { CreateExpenseRequest, Expense, useApproveExpenseMutation, useCreateExpenseMutation, useDeleteExpenseMutation, useGetExpensesQuery, useRejectExpenseMutation, useUpdateExpenseMutation } from '@/lib/api/endpoints/expensesApi';\nimport { useGetCategoriesQuery, useCreateCategoryMutation } from '@/lib/api/endpoints/categoriesApi';"
);

// 2. Remove EXPENSE_CATEGORIES
content = content.replace(/const EXPENSE_CATEGORIES = \[\s*\{ value: 'ingredient', label: 'Ingredients' \},[\s\S]*?\{ value: 'other', label: 'Other' \},\s*\];/, "");

// 3. Add Hooks
const hooksAdd = `
  const { data: categoriesData } = useGetCategoriesQuery({
    companyId: companyId || undefined,
    branchId: branchId || undefined,
    type: 'expense'
  }, { skip: !companyId });

  const [createCategory] = useCreateCategoryMutation();

  const dynamicCategories = useMemo(() => {
    if (!categoriesData) return [];
    return categoriesData
      .filter((cat: any) => cat.type === 'expense' && cat.isActive !== false)
      .map((cat: any) => ({
        value: cat.name,
        label: cat.name
      }));
  }, [categoriesData]);
`;
content = content.replace(
  "const [createExpense] = useCreateExpenseMutation();",
  hooksAdd + "\n  const [createExpense] = useCreateExpenseMutation();"
);

// 4. Update handleCreate and handleEdit
const createCategoryLogic = `
      const isNewCategory = !dynamicCategories.some(c => c.value === formData.category);
      if (isNewCategory && formData.category && formData.category !== 'all') {
        try {
          await createCategory({
            name: formData.category,
            type: 'expense',
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
  "await createExpense(payload).unwrap();",
  createCategoryLogic + "\n      await createExpense(payload).unwrap();"
);
content = content.replace(
  "await updateExpense({",
  createCategoryLogic + "\n      await updateExpense({"
);

// 5. Update getCategoryLabel
content = content.replace(
  "const cat = EXPENSE_CATEGORIES.find(c => c.value === category);",
  "const cat = dynamicCategories.find(c => c.value === category);"
);

// 6. Update Stats
content = content.replace(
  "categories: EXPENSE_CATEGORIES.length,",
  "categories: dynamicCategories.length,"
);

// 7. Update Filter options
content = content.replace(
  "...EXPENSE_CATEGORIES,",
  "...dynamicCategories,"
);

// 8. Replace Select with Combobox for Create Modal
content = content.replace(
  /<Select[\s\S]*?label="Category \*"[\s\S]*?options=\{EXPENSE_CATEGORIES\}[\s\S]*?onChange=\{\(value\) => \{[\s\S]*?setFormData\(\{ \.\.\.formData, category: value as any \}\);[\s\S]*?if \(formErrors\.category\) \{[\s\S]*?setFormErrors\(\{ \.\.\.formErrors, category: undefined \}\);[\s\S]*?\}[\s\S]*?\}\}[\s\S]*?placeholder="Select expense category"[\s\S]*?error=\{formErrors\.category\}[\s\S]*?className="text-sm sm:text-base"[\s\S]*?\/>/,
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
                placeholder="Select or type expense category"
                error={formErrors.category}
                className="text-sm sm:text-base"
              />`
);

// 9. Replace Select with Combobox for Edit Modal
content = content.replace(
  /<Select[\s\S]*?label="Category \*"[\s\S]*?options=\{EXPENSE_CATEGORIES\}[\s\S]*?onChange=\{\(value\) => \{[\s\S]*?setFormData\(\{ \.\.\.formData, category: value as any \}\);[\s\S]*?if \(formErrors\.category\) \{[\s\S]*?setFormErrors\(\{ \.\.\.formErrors, category: undefined \}\);[\s\S]*?\}[\s\S]*?\}\}[\s\S]*?error=\{formErrors\.category\}[\s\S]*?className="text-sm sm:text-base"[\s\S]*?\/>/,
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
                placeholder="Select or type expense category"
                error={formErrors.category}
                className="text-sm sm:text-base"
              />`
);

fs.writeFileSync(file, content);
console.log('Patched expenses page successfully.');
