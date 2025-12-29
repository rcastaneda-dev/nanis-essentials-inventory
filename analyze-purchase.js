const fs = require('fs');
const path = require('path');

/**
 * Analyzes pricing for a specific purchase ID
 * Shows detailed breakdown of formulas and values for each line item
 */

const BACKUP_FILE = path.join(__dirname, 'Cosmetics Backup 2025-11-14.json');
const TARGET_PURCHASE_ID = 'bcdkzg5';

function analyzePurchase() {
  console.log('='.repeat(80));
  console.log(`ANALYZING PURCHASE #${TARGET_PURCHASE_ID}`);
  console.log('='.repeat(80));
  console.log();

  // Read and parse JSON file
  console.log(`Reading backup file: ${BACKUP_FILE}`);
  const fileContent = fs.readFileSync(BACKUP_FILE, 'utf8');
  const data = JSON.parse(fileContent);

  console.log(`Found ${data.purchases?.length || 0} purchases in backup`);
  console.log(`Found ${data.items?.length || 0} inventory items`);
  console.log();

  // Find the target purchase
  const purchase = data.purchases?.find(p => p.id === TARGET_PURCHASE_ID);

  if (!purchase) {
    console.log(`❌ Purchase #${TARGET_PURCHASE_ID} not found!`);
    console.log();
    console.log('Available purchase IDs:');
    const purchaseIds = data.purchases?.map(p => p.id).slice(0, 20) || [];
    purchaseIds.forEach(id => console.log(`  - ${id}`));
    if (data.purchases?.length > 20) {
      console.log(`  ... and ${data.purchases.length - 20} more`);
    }
    return;
  }

  // Display purchase summary
  console.log('PURCHASE SUMMARY');
  console.log('-'.repeat(80));
  console.log(`ID: ${purchase.id}`);
  console.log(`Created: ${purchase.createdAt}`);
  console.log(`Ordered Date: ${purchase.orderedDate || 'N/A'}`);
  console.log(`Payment Date: ${purchase.paymentDate || 'N/A'}`);
  console.log(`Subtotal: $${purchase.subtotal?.toFixed(2) || '0.00'}`);
  console.log(`Tax: $${purchase.tax?.toFixed(2) || '0.00'}`);
  console.log(`US Shipping: $${purchase.shippingUS?.toFixed(2) || '0.00'}`);
  console.log(`International Shipping: $${purchase.shippingIntl?.toFixed(2) || '0.00'}`);
  console.log(`Total Cost: $${purchase.totalCost?.toFixed(2) || '0.00'}`);
  console.log(`Total Units: ${purchase.totalUnits || 0}`);
  console.log(`Total Weight: ${purchase.weightLbs?.toFixed(2) || '0.00'} lbs`);
  console.log();

  // Calculate tax rate
  const taxRate = purchase.subtotal > 0 ? (purchase.tax / purchase.subtotal) * 100 : 0;
  console.log(`Tax Rate: ${taxRate.toFixed(2)}%`);
  console.log();

  // Get inventory items map for quick lookup
  const inventoryMap = new Map();
  data.items?.forEach(item => {
    inventoryMap.set(item.id, item);
  });

  // Calculate totals for verification
  const units =
    purchase.lines?.reduce((acc, l) => {
      return acc + l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0);
    }, 0) || 0;

  const totalWeight =
    purchase.lines?.reduce((acc, l) => {
      const item = inventoryMap.get(l.itemId);
      const itemWeight = item?.weightLbs ?? 0;
      const lineUnits = l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0);
      return acc + itemWeight * lineUnits;
    }, 0) || 0;

  console.log('VERIFICATION');
  console.log('-'.repeat(80));
  console.log(`Calculated Total Units: ${units} (Purchase shows: ${purchase.totalUnits || 0})`);
  console.log(
    `Calculated Total Weight: ${totalWeight.toFixed(2)} lbs (Purchase shows: ${purchase.weightLbs?.toFixed(2) || '0.00'} lbs)`
  );
  console.log();

  // Analyze each line item
  console.log('LINE ITEM BREAKDOWN');
  console.log('='.repeat(80));
  console.log();

  purchase.lines?.forEach((line, index) => {
    const item = inventoryMap.get(line.itemId);
    const itemName = item?.name || `[Item ID: ${line.itemId}]`;
    const itemWeight = item?.weightLbs ?? 0;
    const lineUnits = line.quantity + (line.hasSubItems ? (line.subItemsQty ?? 0) : 0);
    const lineWeight = itemWeight * lineUnits;

    console.log(`LINE ITEM #${index + 1}`);
    console.log('-'.repeat(80));
    console.log(`Item: ${itemName}`);
    console.log(`Item Weight: ${itemWeight.toFixed(2)} lbs`);
    console.log(`Quantity: ${line.quantity}`);
    console.log(`Has Sub-Items: ${line.hasSubItems ? 'Yes' : 'No'}`);
    if (line.hasSubItems) {
      console.log(`Sub-Items Quantity: ${line.subItemsQty || 0}`);
    }
    console.log(`Total Units (for this line): ${lineUnits}`);
    console.log(`Total Weight (for this line): ${lineWeight.toFixed(2)} lbs`);
    console.log();

    // Base cost
    console.log('BASE COST');
    console.log(`  Unit Cost: $${line.unitCost?.toFixed(4) || '0.0000'}`);
    console.log(
      `  Line Total (${lineUnits} units × $${line.unitCost?.toFixed(4) || '0.0000'}): $${(line.unitCost * lineUnits).toFixed(2)}`
    );
    console.log();

    // Tax calculation
    const taxRateDecimal = taxRate / 100;
    const expectedPerUnitTax = line.unitCost * taxRateDecimal;
    const actualPerUnitTax = line.perUnitTax ?? 0;
    const _expectedLineTax = expectedPerUnitTax * lineUnits;

    console.log('TAX CALCULATION');
    console.log('  Formula: perUnitTax = unitCost × (taxRate / 100)');
    console.log(
      `  Formula: perUnitTax = $${line.unitCost?.toFixed(4) || '0.0000'} × ${taxRateDecimal.toFixed(4)}`
    );
    console.log(`  Expected Per-Unit Tax: $${expectedPerUnitTax.toFixed(4)}`);
    console.log(`  Actual Per-Unit Tax: $${actualPerUnitTax.toFixed(4)}`);
    if (Math.abs(expectedPerUnitTax - actualPerUnitTax) > 0.0001) {
      console.log(
        `  ⚠️  MISMATCH! Difference: $${Math.abs(expectedPerUnitTax - actualPerUnitTax).toFixed(4)}`
      );
    }
    console.log(
      `  Line Tax Total (${lineUnits} units × $${actualPerUnitTax.toFixed(4)}): $${(actualPerUnitTax * lineUnits).toFixed(2)}`
    );
    console.log();

    // US Shipping calculation
    const expectedPerUnitShippingUS =
      purchase.shippingUS > 0 && units > 0 ? purchase.shippingUS / units : 0;
    const actualPerUnitShippingUS = line.perUnitShippingUS ?? 0;
    const _expectedLineShippingUS = expectedPerUnitShippingUS * lineUnits;

    console.log('US SHIPPING CALCULATION');
    console.log('  Formula: perUnitShippingUS = shippingUS / totalUnits');
    console.log(
      `  Formula: perUnitShippingUS = $${purchase.shippingUS?.toFixed(2) || '0.00'} / ${units}`
    );
    console.log(`  Expected Per-Unit US Shipping: $${expectedPerUnitShippingUS.toFixed(4)}`);
    console.log(`  Actual Per-Unit US Shipping: $${actualPerUnitShippingUS.toFixed(4)}`);
    if (Math.abs(expectedPerUnitShippingUS - actualPerUnitShippingUS) > 0.0001) {
      console.log(
        `  ⚠️  MISMATCH! Difference: $${Math.abs(expectedPerUnitShippingUS - actualPerUnitShippingUS).toFixed(4)}`
      );
    }
    console.log(
      `  Line US Shipping Total (${lineUnits} units × $${actualPerUnitShippingUS.toFixed(4)}): $${(actualPerUnitShippingUS * lineUnits).toFixed(2)}`
    );
    console.log();

    // International Shipping calculation
    const weightRatio = totalWeight > 0 ? lineWeight / totalWeight : 0;
    const expectedPerUnitShippingIntl =
      lineUnits > 0 ? (purchase.shippingIntl * weightRatio) / lineUnits : 0;
    const actualPerUnitShippingIntl = line.perUnitShippingIntl ?? 0;
    const _expectedLineShippingIntl = expectedPerUnitShippingIntl * lineUnits;

    console.log('INTERNATIONAL SHIPPING CALCULATION');
    console.log('  Formula: weightRatio = lineWeight / totalWeight');
    console.log(
      `  Formula: weightRatio = ${lineWeight.toFixed(2)} / ${totalWeight.toFixed(2)} = ${weightRatio.toFixed(6)}`
    );
    console.log('  Formula: perUnitShippingIntl = (shippingIntl × weightRatio) / lineUnits');
    console.log(
      `  Formula: perUnitShippingIntl = ($${purchase.shippingIntl?.toFixed(2) || '0.00'} × ${weightRatio.toFixed(6)}) / ${lineUnits}`
    );
    console.log(`  Expected Per-Unit Intl Shipping: $${expectedPerUnitShippingIntl.toFixed(4)}`);
    console.log(`  Actual Per-Unit Intl Shipping: $${actualPerUnitShippingIntl.toFixed(4)}`);
    if (Math.abs(expectedPerUnitShippingIntl - actualPerUnitShippingIntl) > 0.0001) {
      console.log(
        `  ⚠️  MISMATCH! Difference: $${Math.abs(expectedPerUnitShippingIntl - actualPerUnitShippingIntl).toFixed(4)}`
      );
    }
    console.log(
      `  Line Intl Shipping Total (${lineUnits} units × $${actualPerUnitShippingIntl.toFixed(4)}): $${(actualPerUnitShippingIntl * lineUnits).toFixed(2)}`
    );
    console.log();

    // Total cost post-shipping
    const expectedUnitCostPostShipping =
      line.unitCost + expectedPerUnitTax + expectedPerUnitShippingUS + expectedPerUnitShippingIntl;
    const actualUnitCostPostShipping = line.unitCostPostShipping ?? 0;

    console.log('TOTAL COST POST-SHIPPING');
    console.log(
      '  Formula: unitCostPostShipping = unitCost + perUnitTax + perUnitShippingUS + perUnitShippingIntl'
    );
    console.log(
      `  Formula: unitCostPostShipping = $${line.unitCost?.toFixed(4) || '0.0000'} + $${actualPerUnitTax.toFixed(4)} + $${actualPerUnitShippingUS.toFixed(4)} + $${actualPerUnitShippingIntl.toFixed(4)}`
    );
    console.log(`  Expected Per-Unit Total: $${expectedUnitCostPostShipping.toFixed(4)}`);
    console.log(`  Actual Per-Unit Total: $${actualUnitCostPostShipping.toFixed(4)}`);
    if (Math.abs(expectedUnitCostPostShipping - actualUnitCostPostShipping) > 0.0001) {
      console.log(
        `  ⚠️  MISMATCH! Difference: $${Math.abs(expectedUnitCostPostShipping - actualUnitCostPostShipping).toFixed(4)}`
      );
    }
    console.log(
      `  Line Total Cost (${lineUnits} units × $${actualUnitCostPostShipping.toFixed(4)}): $${(actualUnitCostPostShipping * lineUnits).toFixed(2)}`
    );
    console.log();
    console.log();
  });

  // Verify totals
  console.log('TOTAL VERIFICATION');
  console.log('='.repeat(80));

  const calculatedSubtotal =
    purchase.lines?.reduce((acc, l) => {
      const lineUnits = l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0);
      return acc + l.unitCost * lineUnits;
    }, 0) || 0;

  const calculatedTax =
    purchase.lines?.reduce((acc, l) => {
      const lineUnits = l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0);
      return acc + (l.perUnitTax ?? 0) * lineUnits;
    }, 0) || 0;

  const calculatedShippingUS =
    purchase.lines?.reduce((acc, l) => {
      const lineUnits = l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0);
      return acc + (l.perUnitShippingUS ?? 0) * lineUnits;
    }, 0) || 0;

  const calculatedShippingIntl =
    purchase.lines?.reduce((acc, l) => {
      const lineUnits = l.quantity + (l.hasSubItems ? (l.subItemsQty ?? 0) : 0);
      return acc + (l.perUnitShippingIntl ?? 0) * lineUnits;
    }, 0) || 0;

  const calculatedTotalCost =
    calculatedSubtotal + calculatedTax + calculatedShippingUS + calculatedShippingIntl;

  console.log('Subtotal:');
  console.log(`  Expected: $${purchase.subtotal?.toFixed(2) || '0.00'}`);
  console.log(`  Calculated: $${calculatedSubtotal.toFixed(2)}`);
  if (Math.abs((purchase.subtotal || 0) - calculatedSubtotal) > 0.01) {
    console.log(
      `  ⚠️  MISMATCH! Difference: $${Math.abs((purchase.subtotal || 0) - calculatedSubtotal).toFixed(2)}`
    );
  }
  console.log();

  console.log('Tax:');
  console.log(`  Expected: $${purchase.tax?.toFixed(2) || '0.00'}`);
  console.log(`  Calculated: $${calculatedTax.toFixed(2)}`);
  if (Math.abs((purchase.tax || 0) - calculatedTax) > 0.01) {
    console.log(
      `  ⚠️  MISMATCH! Difference: $${Math.abs((purchase.tax || 0) - calculatedTax).toFixed(2)}`
    );
  }
  console.log();

  console.log('US Shipping:');
  console.log(`  Expected: $${purchase.shippingUS?.toFixed(2) || '0.00'}`);
  console.log(`  Calculated: $${calculatedShippingUS.toFixed(2)}`);
  if (Math.abs((purchase.shippingUS || 0) - calculatedShippingUS) > 0.01) {
    console.log(
      `  ⚠️  MISMATCH! Difference: $${Math.abs((purchase.shippingUS || 0) - calculatedShippingUS).toFixed(2)}`
    );
  }
  console.log();

  console.log('International Shipping:');
  console.log(`  Expected: $${purchase.shippingIntl?.toFixed(2) || '0.00'}`);
  console.log(`  Calculated: $${calculatedShippingIntl.toFixed(2)}`);
  if (Math.abs((purchase.shippingIntl || 0) - calculatedShippingIntl) > 0.01) {
    console.log(
      `  ⚠️  MISMATCH! Difference: $${Math.abs((purchase.shippingIntl || 0) - calculatedShippingIntl).toFixed(2)}`
    );
  }
  console.log();

  console.log('Total Cost:');
  console.log(`  Expected: $${purchase.totalCost?.toFixed(2) || '0.00'}`);
  console.log(`  Calculated: $${calculatedTotalCost.toFixed(2)}`);
  if (Math.abs((purchase.totalCost || 0) - calculatedTotalCost) > 0.01) {
    console.log(
      `  ⚠️  MISMATCH! Difference: $${Math.abs((purchase.totalCost || 0) - calculatedTotalCost).toFixed(2)}`
    );
  }
  console.log();

  console.log('='.repeat(80));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(80));
}

try {
  analyzePurchase();
} catch (error) {
  console.error('Error analyzing purchase:', error.message);
  console.error(error.stack);
  process.exit(1);
}
