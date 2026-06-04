with open('frontend/src/app/dashboard/pos/page.tsx', 'r') as f:
    content = f.read()

target = """                    {item.category?.name && (
                      <div className="flex">
                         <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter">
                          {item.category.name}
                        </span>
                      </div>
                    )}"""

replacement = """                    {item.category?.name && (
                      <div className="flex items-center flex-wrap gap-1">
                         <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter">
                          {item.category.name}
                        </span>
                        {item.trackInventory && item.stock != null && (
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter border",
                            item.stockStatus === 'out' ? 'bg-red-50 text-red-500 border-red-200 dark:bg-red-900/20 dark:border-red-800/50' :
                            item.stockStatus === 'low' ? 'bg-amber-50 text-amber-500 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50' :
                            'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:border-green-800/50'
                          )}>
                            Stock: {item.stock}
                          </span>
                        )}
                      </div>
                    )}"""

if target in content:
    content = content.replace(target, replacement)
    with open('frontend/src/app/dashboard/pos/page.tsx', 'w') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
