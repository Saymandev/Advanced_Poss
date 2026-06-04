const fs = require('fs');
const file = 'backend/src/modules/pos/pos.service.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `    // Process loyalty points redemption if customerId is provided
    let loyaltyPointsRedeemed = 0;
    let loyaltyDiscount = 0;
    let customer = null;
    let finalOrderTotal = createOrderDto.totalAmount;

    // Use customerId from reservation if not provided in request
    const effectiveCustomerId = createOrderDto.customerId || (reservationTable?.reservedBy?.customerId?.toString());

    if (effectiveCustomerId && companyId) {
      try {
        customer = await this.customersService.findOne(effectiveCustomerId);
        if (customer) {
          const MIN_ORDER_AMOUNT = 1000; // Minimum order amount in TK
          const POINTS_PER_DISCOUNT = 2000; // 2000 points = 20 TK discount
          const DISCOUNT_AMOUNT = 20; // 20 TK discount per 2000 points
          // Check if order meets minimum amount requirement
          if (createOrderDto.totalAmount >= MIN_ORDER_AMOUNT) {
            const availablePoints = customer.loyaltyPoints || 0;
            // Calculate how many discount blocks can be applied
            const discountBlocks = Math.floor(availablePoints / POINTS_PER_DISCOUNT);
            if (discountBlocks > 0) {
              // Apply maximum discount blocks (can be limited by order total)
              const maxDiscount = discountBlocks * DISCOUNT_AMOUNT;
              const orderSubtotal = createOrderDto.totalAmount;
              // Discount cannot exceed order total
              loyaltyDiscount = Math.min(maxDiscount, orderSubtotal);
              // Calculate points to redeem (in full blocks of 2000)
              const blocksToRedeem = Math.floor(loyaltyDiscount / DISCOUNT_AMOUNT);
              loyaltyPointsRedeemed = blocksToRedeem * POINTS_PER_DISCOUNT;
              // Update order total with discount
              finalOrderTotal = orderSubtotal - loyaltyDiscount;
            }
          }
        }
      } catch (error) {
        console.error('Error processing loyalty redemption:', error);
        // Don't fail order creation if loyalty processing fails
      }
    }`;

const replacement = `    // Process loyalty points redemption if customerId is provided
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
            console.warn(\`Customer has insufficient points. Requested: \${loyaltyPointsRedeemed}, Available: \${availablePoints}\`);
            loyaltyPointsRedeemed = 0;
            loyaltyDiscount = 0;
          } else {
             // Basic validation: 2000 points = 20 TK
             const POINTS_PER_DISCOUNT = 2000;
             const DISCOUNT_AMOUNT = 20;
             const expectedDiscount = Math.floor(loyaltyPointsRedeemed / POINTS_PER_DISCOUNT) * DISCOUNT_AMOUNT;
             if (loyaltyDiscount > expectedDiscount) {
               console.warn(\`Requested loyalty discount \${loyaltyDiscount} exceeds expected \${expectedDiscount}. Adjusting.\`);
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
    }`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log('Successfully replaced');
} else {
    console.log('Target not found');
}
