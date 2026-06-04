import re

with open('backend/src/modules/pos/pos.service.ts', 'r') as f:
    content = f.read()

# Find the block from "// Process loyalty points redemption" to "Don't fail order creation if loyalty processing fails\n      }\n    }"
start_idx = content.find('    // Process loyalty points redemption')
end_str = "    // Use pre-ordered items if order items are empty"
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    target = content[start_idx:end_idx]
    
    replacement = """    // Process loyalty points redemption if customerId is provided
    let loyaltyPointsRedeemed = createOrderDto.loyaltyPointsRedeemed || 0;
    let loyaltyDiscount = createOrderDto.loyaltyDiscount || 0;
    let customer = null;
    let finalOrderTotal = createOrderDto.totalAmount; // Trust the frontend's discounted total

    // Use customerId from reservation if not provided in request
    const effectiveCustomerId = createOrderDto.customerId || (reservationTable?.reservedBy?.customerId?.toString());

    if (effectiveCustomerId && companyId) {
      try {
        customer = await this.customersService.findOne(effectiveCustomerId);
        // If frontend requested to redeem points, validate them
        if (customer && loyaltyPointsRedeemed > 0) {
          const availablePoints = customer.loyaltyPoints || 0;
          if (availablePoints < loyaltyPointsRedeemed) {
            console.warn(`Customer has insufficient points. Requested: ${loyaltyPointsRedeemed}, Available: ${availablePoints}`);
            loyaltyPointsRedeemed = 0;
            loyaltyDiscount = 0;
          } else {
             // Basic validation: 2000 points = 20 TK
             const POINTS_PER_DISCOUNT = 2000;
             const DISCOUNT_AMOUNT = 20;
             const expectedDiscount = Math.floor(loyaltyPointsRedeemed / POINTS_PER_DISCOUNT) * DISCOUNT_AMOUNT;
             if (loyaltyDiscount > expectedDiscount) {
               console.warn(`Requested loyalty discount ${loyaltyDiscount} exceeds expected ${expectedDiscount}. Adjusting.`);
               loyaltyDiscount = expectedDiscount;
             }
          }
        }
      } catch (error) {
        console.error('Error processing loyalty redemption:', error);
      }
    } else {
      loyaltyPointsRedeemed = 0;
      loyaltyDiscount = 0;
    }

"""
    new_content = content[:start_idx] + replacement + content[end_idx:]
    with open('backend/src/modules/pos/pos.service.ts', 'w') as f:
        f.write(new_content)
    print("Replaced successfully")
else:
    print("Not found")

